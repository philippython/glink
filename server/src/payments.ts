// Real money in and out, through Stripe.
//   In:  brands top up their wallet on a Stripe Checkout page. The wallet is credited by the
//        signed webhook — never by the browser redirect — and each session credits only once.
//   Out: creators connect a Stripe Express account; withdrawing sends a Connect transfer to it.
// Without STRIPE_SECRET_KEY none of this is used and the app keeps its test-funds behaviour.
import Stripe from 'stripe'
import { Hono } from 'hono'
import { config } from './config.ts'
import { all, one, run, tx } from './db.ts'
import { creditTopUp } from './domain.ts'
import { brandUsers, creatorUser, emit, notify } from './events.ts'
import { COUNTRY_CODE } from './taxonomy.ts'
import { HttpError, id, now, toCents } from './util.ts'

let client: Stripe | null = null
function stripe(): Stripe {
  if (!config.stripe) throw new HttpError(503, 'Card payments aren’t set up yet.')
  return (client ??= new Stripe(config.stripe.secretKey))
}

/** How brands add money: real card payments, pretend test funds, or not at all. */
export const paymentsMode = (): 'stripe' | 'test' | 'none' => config.stripe ? 'stripe' : config.allowTestFunds ? 'test' : 'none'

const dollars = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`

/** Turns Stripe's errors into something a person can act on. */
function friendly(e: unknown): never {
  if (e instanceof Stripe.errors.StripeError) {
    if (e.code === 'balance_insufficient') throw new HttpError(503, 'Payouts are temporarily delayed while Glink’s payout balance settles. Please try again later — your earnings are safe.')
    throw new HttpError(400, e.message)
  }
  throw e
}

// ─── Brand top-ups ──────────────────────────────────────────────────────────

export async function createTopUpCheckout(brandId: string, email: string, amount: number) {
  const metadata = { brandId, purpose: 'wallet_topup' }
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    customer_email: email,
    line_items: [{ quantity: 1, price_data: { currency: config.stripe!.currency, unit_amount: toCents(amount), product_data: { name: 'Glink wallet top-up' } } }],
    metadata,
    payment_intent_data: { metadata },
    success_url: `${config.appUrl}/brand/billing?topup=success`,
    cancel_url: `${config.appUrl}/brand/billing?topup=cancelled`,
  }).catch(friendly)
  if (!session.url) throw new HttpError(502, 'Stripe didn’t return a payment page. Please try again.')
  return session.url
}

function creditSession(s: Stripe.Checkout.Session) {
  const brandId = s.metadata?.brandId
  if (s.metadata?.purpose !== 'wallet_topup' || s.payment_status !== 'paid' || !brandId || !s.amount_total) return
  if (!one('SELECT 1 FROM brands WHERE id = ?', brandId)) return
  if (creditTopUp(brandId, s.amount_total, 'Wallet top-up (card)', s.id)) {
    notify(brandUsers(brandId), { title: 'Funds added', body: `${dollars(s.amount_total)} was added to your wallet.`, link: '/brand/billing' })
    emit(brandUsers(brandId))
  }
}

// ─── Creator payout accounts ────────────────────────────────────────────────

const ISO = COUNTRY_CODE

type PayoutProfile = { id: string; user_id: string; country: string; stripe_account_id: string | null; payouts_enabled: number }
const profile = (creatorId: string) => one<PayoutProfile>('SELECT id, user_id, country, stripe_account_id, payouts_enabled FROM creator_profiles WHERE id = ?', creatorId)!

/** A Stripe-hosted page where the creator adds their bank details. Creates their account the first time. */
export async function payoutOnboardingLink(creatorId: string, email: string) {
  const p = profile(creatorId)
  let account = p.stripe_account_id
  if (!account) {
    const a = await stripe().accounts.create({
      type: 'express', email, country: ISO[p.country], metadata: { creatorId },
      capabilities: { transfers: { requested: true } },
    }).catch(friendly)
    account = a.id
    run('UPDATE creator_profiles SET stripe_account_id = ? WHERE id = ?', account, creatorId)
  }
  const link = await stripe().accountLinks.create({
    account, type: 'account_onboarding',
    refresh_url: `${config.appUrl}/creator/earnings?payouts=refresh`,
    return_url: `${config.appUrl}/creator/earnings?payouts=return`,
  }).catch(friendly)
  return link.url
}

/** Stripe's own dashboard, where a connected creator can change their bank account. */
export async function payoutDashboardLink(creatorId: string) {
  const p = profile(creatorId)
  if (!p.stripe_account_id) throw new HttpError(400, 'Connect your payout account first.')
  return (await stripe().accounts.createLoginLink(p.stripe_account_id).catch(friendly)).url
}

function applyAccount(a: Stripe.Account) {
  const ready = a.capabilities?.transfers === 'active' && a.details_submitted ? 1 : 0
  const p = one<{ id: string; payouts_enabled: number }>('SELECT id, payouts_enabled FROM creator_profiles WHERE stripe_account_id = ?', a.id)
  if (!p || p.payouts_enabled === ready) return
  run('UPDATE creator_profiles SET payouts_enabled = ? WHERE id = ?', ready, p.id)
  const users = creatorUser(p.id)
  if (ready) notify(users, { title: 'Payout account ready', body: 'You can now withdraw your earnings to your bank.', link: '/creator/earnings' })
  emit(users)
}

/** Re-reads the creator's account after they return from Stripe, in case the webhook hasn't arrived yet. */
export async function syncPayoutAccount(creatorId: string) {
  const p = profile(creatorId)
  if (!p.stripe_account_id) return false
  applyAccount(await stripe().accounts.retrieve(p.stripe_account_id).catch(friendly))
  return !!profile(creatorId).payouts_enabled
}

// ─── Withdrawals ────────────────────────────────────────────────────────────

/** Marks the given available payments as paid out and records the payout. */
export function recordPayout(creatorId: string, paymentIds: string[], total: number, transferId: string | null, payoutId = id('out')) {
  tx(() => {
    for (const pid of paymentIds) {
      run("UPDATE payments SET status = 'paid_out' WHERE id = ? AND status = 'available'", pid)
      const sub = one<{ submission_id: string | null }>('SELECT submission_id FROM payments WHERE id = ?', pid)
      if (sub?.submission_id) run("UPDATE submissions SET status = 'paid' WHERE id = ? AND status = 'approved'", sub.submission_id)
    }
    run('INSERT INTO payouts (id, creator_id, amount, created_at, stripe_transfer_id) VALUES (?,?,?,?,?)', payoutId, creatorId, total, now(), transferId)
  })
}

export const availablePayments = (creatorId: string) =>
  all<{ id: string; amount: number }>("SELECT id, amount FROM payments WHERE creator_id = ? AND status = 'available'", creatorId)

const inFlight = new Set<string>()

/** Sends everything available to the creator's bank via a Stripe transfer. */
export async function withdrawToBank(creatorId: string) {
  if (inFlight.has(creatorId)) throw new HttpError(409, 'A withdrawal is already on its way.')
  inFlight.add(creatorId)
  try {
    const p = profile(creatorId)
    if (!p.stripe_account_id || !p.payouts_enabled) throw new HttpError(400, 'Connect your payout account before withdrawing.')
    const avail = availablePayments(creatorId)
    const total = avail.reduce((a, x) => a + x.amount, 0)
    if (total <= 0) throw new HttpError(400, 'Nothing is available to withdraw yet.')
    const payoutId = id('out')
    const transfer = await stripe().transfers.create(
      { amount: total, currency: config.stripe!.currency, destination: p.stripe_account_id, transfer_group: payoutId, metadata: { creatorId, payoutId } },
      { idempotencyKey: payoutId },
    ).catch(friendly)
    recordPayout(creatorId, avail.map(a => a.id), total, transfer.id, payoutId)
    return total
  } finally {
    inFlight.delete(creatorId)
  }
}

/**
 * Automatic payouts: creators with a ready payout account (and auto-payout on) are paid as soon as their
 * available balance reaches AUTO_PAYOUT_MIN. Runs from the background loop; failures are logged and retried next run.
 */
export async function runAutoPayouts() {
  if (!config.stripe) return
  const due = all<{ id: string; total: number }>(
    `SELECT p.id, SUM(pay.amount) total FROM creator_profiles p JOIN payments pay ON pay.creator_id = p.id AND pay.status = 'available'
     WHERE p.payouts_enabled = 1 AND p.auto_payout = 1 GROUP BY p.id HAVING total >= ?`, config.automation.autoPayoutMinCents)
  for (const c of due) {
    if (inFlight.has(c.id)) continue
    try {
      const amount = await withdrawToBank(c.id)
      notify(creatorUser(c.id), { title: 'Payout sent', body: `${dollars(amount)} is on its way to your bank.`, link: '/creator/earnings' })
      emit(creatorUser(c.id))
    } catch (e) {
      console.error(`[auto-payout] ${c.id}: ${(e as Error).message}`)
    }
  }
}

// ─── Webhook ────────────────────────────────────────────────────────────────

export const stripeWebhook = new Hono()

stripeWebhook.post('/webhook', async c => {
  if (!config.stripe?.webhookSecret) return c.json({ error: 'Stripe webhooks aren’t configured.' }, 503)
  const raw = await c.req.text()
  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(raw, c.req.header('stripe-signature') ?? '', config.stripe.webhookSecret)
  } catch {
    return c.json({ error: 'Invalid signature.' }, 400)
  }
  if (one('SELECT 1 FROM stripe_events WHERE id = ?', event.id)) return c.json({ received: true })
  tx(() => {
    run('INSERT INTO stripe_events (id, type, created_at) VALUES (?,?,?)', event.id, event.type, now())
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') creditSession(event.data.object)
    else if (event.type === 'account.updated') applyAccount(event.data.object)
  })
  return c.json({ received: true })
})
