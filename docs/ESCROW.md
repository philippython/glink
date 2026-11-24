# Automated escrow

How money moves through Glink without anyone chasing it: what triggers each step, which part of the stack does the work, and how it stays correct when things are retried or fail.

## The flow at a glance

```
Brand card ──Stripe Checkout──▶ Wallet ──launch──▶ Held (per campaign: budget + platform fee)
                                                     │
                                         creator submits a video
                                                     │
                       ┌──── brand approves (any time) ────┐
   day 2: reminder ────┤                                   ├──▶ Pending ──3 days──▶ Available ──≥ $20──▶ Auto payout ──▶ Creator bank
                       └── day 5: auto-approved if every ──┘                                       (Stripe Transfer)   (Connect payout)
                           pre-flight check passed
   failed checks ──▶ never auto-approved; brand asked to decide

   results beat the brand's bonus rule ──▶ bonus paid to Pending
   campaign completes / bonus window closes ──▶ unused budget (and its fee) returns to the Wallet
   Wallet ──owner asks──▶ refunded to the card that paid (Stripe Refund)
```

Every arrow is an entry in the ledger (`ledger` for brand money, `payments` and `payouts` for creator money), so every balance can be explained line by line.

## Steps, triggers and where they run

| Step | Trigger | Code | Stack |
|---|---|---|---|
| Credit the wallet | Stripe `checkout.session.completed` webhook | `server/src/payments.ts` → `creditSession` | Stripe Checkout + signed webhook |
| Hold the budget | Brand launches a campaign | `POST /api/campaigns` → ledger `hold` of `holdOf()` = budget + fee | SQLite/Postgres transaction |
| Platform fee | Each creator payment (base, bonus, prize) | `pay()` → `platform_fees` row | Same transaction as the payment |
| Review reminder | Video waiting `REVIEW_REMINDER_DAYS` (2) | `reviewAutomation()` in `server/src/domain.ts` | Background loop (every minute) |
| Auto-approval | Waiting `AUTO_APPROVE_DAYS` (5) **and** no failed pre-flight checks | `reviewAutomation()` → `approve()` | Background loop |
| Escalation | Waiting 5 days **with** failed checks, or not enough funds | `reviewAutomation()` | Background loop + notifications |
| Clearance | 3 days after approval | `sweep()` → pending → available | Background loop |
| Bonus | Brand records (later: imports) results that beat the campaign's rule | `recordMetrics()` | API request |
| Auto-payout | Available ≥ `AUTO_PAYOUT_MIN` ($20), payout account ready, auto-payout on | `runAutoPayouts()` in `payments.ts` | Background loop + Stripe Transfer |
| Return unused budget | Campaign completes; bonus window closes | `maybeCompleteCampaign()`, `sweep()` | Background loop |
| Refund the wallet | Owner asks on the Billing page | `POST /api/billing/refund` → `refundWallet()` | Stripe Refunds, newest card top-up first |
| Dispute alert | Stripe `charge.dispute.created` webhook | `onDispute()` in `payments.ts` | Notification + audit log |

The background loop is started in `server/src/index.ts` and runs every 60 seconds: `sweep()` (clearance, unused bonuses, review automation), then `runAutoPayouts()`.

## Bonus rules

Each campaign stores its own rule: a **metric**, a **threshold** and a **window** (`bonus_metric`, `bonus_threshold`, `bonus_window_days`).

| Metric | Value | Wins when |
|---|---|---|
| `ctr` | clicks ÷ impressions × 100 | above the threshold |
| `cvr` | conversions ÷ clicks × 100 | above the threshold |
| `hook` | 3-second view rate (%) | above the threshold |
| `hold` | 15-second view rate (%) | above the threshold |
| `cpa` | spend ÷ conversions ($) | **below** the threshold |

A creative can win once. The bonus money stays held until each approved video's window closes, then any unearned share returns to the brand.

## Platform fee

`PLATFORM_FEE_PCT` (default 10) is copied onto each campaign as `fee_pct` when it launches, so changing it never affects live campaigns. The launch hold is the creator budget plus the fee on it. Each time a creator is paid, the fee on that payment is recorded in `platform_fees`, and campaign escrow is `holds − creator payments − fees`. So the brand pays the fee only on money that actually reaches creators; the fee on unspent budget returns with it. Creators receive their full fee.

## Wallet refunds

An Owner can refund unused wallet money (not money held for live campaigns). The wallet is debited first in one transaction (ledger `withdrawal`), so double clicks cannot refund twice. The amount is then refunded through Stripe against the newest card top-ups, never more than each payment's unrefunded amount, with an idempotency key per payment. Anything Stripe cannot refund goes straight back into the wallet. Without Stripe, the same endpoint removes test funds.

## Audit log

Every change to money or permissions is written to `audit_log`: top-ups, refunds, disputes, campaign launches (with the amount held), approvals, every creator payment with its fee, contest winners, team invites and removals, creator payouts and payout settings. Brand Owners see it on the Team page (`GET /api/audit`). Automatic steps are recorded as “Glink (automatic)”.

## Settings

| Variable | Default | Effect |
|---|---|---|
| `REVIEW_REMINDER_DAYS` | `2` | When the brand gets a one-time reminder. `0` turns reminders off |
| `AUTO_APPROVE_DAYS` | `5` | When a clean video is approved automatically. `0` turns auto-approval off |
| `AUTO_PAYOUT_MIN` | `20` | Smallest available balance (USD) paid out automatically |
| `PLATFORM_FEE_PCT` | `10` | Glink's fee on creator payments, charged to the brand. `0` turns it off |

Creators can switch automatic payouts off on their Earnings page (`POST /api/payouts/settings`). Auto-approval never applies to contests, where winners are picked by the brand.

## Correctness under retries and failures

- **Webhooks:** verified by signature; each event ID is stored once (`stripe_events`), and a checkout session can credit a wallet only once (unique `ledger.external_id`).
- **Transfers:** each payout uses its payout ID as the Stripe idempotency key, and only one withdrawal per creator can be in flight.
- **Insufficient Stripe balance:** the transfer fails cleanly, earnings stay *available*, and the next run retries. Creators see “payouts are temporarily delayed”.
- **Not enough funds to auto-approve:** nothing is approved; the brand is told once to top up.
- **Server restarts:** every step is driven by database state, not timers in memory, so after a restart the next run simply continues.

## Tests

`server/test/api.test.ts` covers the fee held at launch and charged on the base fee and bonus, wallet refunds (owners only, never more than the balance), the shared contest shortlist and the audit log. `server/test/automation.test.ts` covers reminders (sent once), auto-approval of a clean video with the creator paid from escrow, escalation for a flagged video, every bonus metric including lower-is-better cost per result, and campaign validation. `server/test/payments.test.ts` covers webhook signatures, crediting exactly once and payout readiness.

## At scale

When Glink runs on several servers, the same jobs move from the in-process loop to a Redis-backed queue (BullMQ). That gives exactly-once scheduling across servers, retries with back-off, and a dashboard for stuck jobs. The functions above stay the same; only the scheduler changes.
