# Automated escrow

How money moves through Glink without anyone chasing it: what triggers each step, which part of the stack does the work, and how it stays correct when things are retried or fail.

## The flow at a glance

```
Brand card ──Stripe Checkout──▶ Wallet ──launch──▶ Held (per campaign)
                                                     │
                                         creator submits a video
                                                     │
                       ┌──── brand approves (any time) ────┐
   day 2: reminder ────┤                                   ├──▶ Pending ──3 days──▶ Available ──≥ $20──▶ Auto payout ──▶ Creator bank
                       └── day 5: auto-approved if every ──┘                                       (Stripe Transfer)   (Connect payout)
                           pre-flight check passed
   failed checks ──▶ never auto-approved; brand asked to decide

   results beat the brand's bonus rule ──▶ bonus paid to Pending
   campaign completes / bonus window closes ──▶ unused budget returns to the Wallet
```

Every arrow is an entry in the ledger (`ledger` for brand money, `payments` and `payouts` for creator money), so every balance can be explained line by line.

## Steps, triggers and where they run

| Step | Trigger | Code | Stack |
|---|---|---|---|
| Credit the wallet | Stripe `checkout.session.completed` webhook | `server/src/payments.ts` → `creditSession` | Stripe Checkout + signed webhook |
| Hold the budget | Brand launches a campaign | `POST /api/campaigns` → ledger `hold` | SQLite/Postgres transaction |
| Review reminder | Video waiting `REVIEW_REMINDER_DAYS` (2) | `reviewAutomation()` in `server/src/domain.ts` | Background loop (every minute) |
| Auto-approval | Waiting `AUTO_APPROVE_DAYS` (5) **and** no failed pre-flight checks | `reviewAutomation()` → `approve()` | Background loop |
| Escalation | Waiting 5 days **with** failed checks, or not enough funds | `reviewAutomation()` | Background loop + notifications |
| Clearance | 3 days after approval | `sweep()` → pending → available | Background loop |
| Bonus | Brand records (later: imports) results that beat the campaign's rule | `recordMetrics()` | API request |
| Auto-payout | Available ≥ `AUTO_PAYOUT_MIN` ($20), payout account ready, auto-payout on | `runAutoPayouts()` in `payments.ts` | Background loop + Stripe Transfer |
| Return unused budget | Campaign completes; bonus window closes | `maybeCompleteCampaign()`, `sweep()` | Background loop |

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

## Settings

| Variable | Default | Effect |
|---|---|---|
| `REVIEW_REMINDER_DAYS` | `2` | When the brand gets a one-time reminder. `0` turns reminders off |
| `AUTO_APPROVE_DAYS` | `5` | When a clean video is approved automatically. `0` turns auto-approval off |
| `AUTO_PAYOUT_MIN` | `20` | Smallest available balance (USD) paid out automatically |

Creators can switch automatic payouts off on their Earnings page (`POST /api/payouts/settings`). Auto-approval never applies to contests, where winners are picked by the brand.

## Correctness under retries and failures

- **Webhooks:** verified by signature; each event ID is stored once (`stripe_events`), and a checkout session can credit a wallet only once (unique `ledger.external_id`).
- **Transfers:** each payout uses its payout ID as the Stripe idempotency key, and only one withdrawal per creator can be in flight.
- **Insufficient Stripe balance:** the transfer fails cleanly, earnings stay *available*, and the next run retries. Creators see “payouts are temporarily delayed”.
- **Not enough funds to auto-approve:** nothing is approved; the brand is told once to top up.
- **Server restarts:** every step is driven by database state, not timers in memory, so after a restart the next run simply continues.

## Tests

`server/test/automation.test.ts` covers reminders (sent once), auto-approval of a clean video with the creator paid from escrow, escalation for a flagged video, every bonus metric including lower-is-better cost per result, and campaign validation. `server/test/payments.test.ts` covers webhook signatures, crediting exactly once and payout readiness.

## At scale

When Glink runs on several servers, the same jobs move from the in-process loop to a Redis-backed queue (BullMQ). That gives exactly-once scheduling across servers, retries with back-off, and a dashboard for stuck jobs. The functions above stay the same; only the scheduler changes.
