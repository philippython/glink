// Stripe webhook handling and Resend delivery, against a throwaway database. No network:
// webhooks are signed locally with Stripe's test helper and fetch is stubbed for Resend.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { before, test } from 'node:test'
import Stripe from 'stripe'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'glink-pay-'))
Object.assign(process.env, {
  DATABASE_PATH: path.join(dir, 'test.db'), UPLOAD_DIR: path.join(dir, 'uploads'), SEED_DEMO: 'false',
  STRIPE_SECRET_KEY: 'sk_test_glink', STRIPE_WEBHOOK_SECRET: 'whsec_glink_test',
  RESEND_API_KEY: 're_test_glink', EMAIL_FROM: 'Glink <hello@glink.test>',
})

const { app, init } = await import('../src/app.ts')
const { one, run } = await import('../src/db.ts')
const stripe = new Stripe('sk_test_glink')

const call = (url: string, init: RequestInit = {}) => app.fetch(new Request(`http://localhost${url}`, init))

async function signUp(email: string) {
  const res = await call('/api/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Test', email, password: 'longenough1' }) })
  return res.headers.get('set-cookie')!.split(';')[0]
}
const post = (url: string, cookie: string, body: unknown = {}) =>
  call(url, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(body) })

function webhook(event: object, secret = 'whsec_glink_test') {
  const payload = JSON.stringify(event)
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret })
  return call('/api/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': header }, body: payload })
}
const checkoutEvent = (eventId: string, sessionId: string, brandId: string, cents: number, paid = true) => ({
  id: eventId, object: 'event', type: 'checkout.session.completed',
  data: { object: { id: sessionId, object: 'checkout.session', amount_total: cents, payment_status: paid ? 'paid' : 'unpaid', metadata: { brandId, purpose: 'wallet_topup' } } },
})
const balance = (brandId: string) => one<{ b: number | null }>('SELECT SUM(amount) b FROM ledger WHERE brand_id = ?', brandId)!.b ?? 0

let brandId = ''
let creatorId = ''
let creatorCookie = ''

before(async () => {
  init()
  const owner = await signUp('owner@shop.test')
  await post('/api/onboarding/brand', owner, { name: 'Shop', country: 'United States', description: 'We sell nice things.', targetCustomers: ['runners'] })
  brandId = one<{ brand_id: string }>("SELECT brand_id FROM brand_members WHERE email = 'owner@shop.test'")!.brand_id
  creatorCookie = await signUp('cara@creator.test')
  await post('/api/onboarding/creator', creatorCookie, { displayName: 'Cara', country: 'United States', niches: ['Fitness'], bio: 'Workouts in ten minutes.' })
  creatorId = one<{ id: string }>("SELECT p.id FROM creator_profiles p JOIN users u ON u.id = p.user_id WHERE u.email = 'cara@creator.test'")!.id
})

test('health reports card payments and email as connected', async () => {
  const h = await (await call('/api/health')).json()
  assert.equal(h.payments, 'stripe')
  assert.equal(h.email, true)
})

test('webhooks with a bad signature are refused and change nothing', async () => {
  const before = balance(brandId)
  assert.equal((await webhook(checkoutEvent('evt_bad', 'cs_bad', brandId, 50_000), 'whsec_wrong')).status, 400)
  assert.equal(balance(brandId), before)
})

test('a paid checkout credits the wallet exactly once', async () => {
  const before = balance(brandId)
  assert.equal((await webhook(checkoutEvent('evt_1', 'cs_1', brandId, 125_000))).status, 200)
  assert.equal(balance(brandId), before + 125_000)
  await webhook(checkoutEvent('evt_1', 'cs_1', brandId, 125_000)) // Stripe retries the same event
  await webhook(checkoutEvent('evt_2', 'cs_1', brandId, 125_000)) // or sends a second event for the same session
  assert.equal(balance(brandId), before + 125_000)
  assert.ok(one("SELECT 1 FROM notifications WHERE title = 'Funds added'"))
})

test('an unpaid checkout credits nothing', async () => {
  const before = balance(brandId)
  await webhook(checkoutEvent('evt_3', 'cs_3', brandId, 90_000, false))
  assert.equal(balance(brandId), before)
})

test('account.updated turns payouts on once transfers are active', async () => {
  run('UPDATE creator_profiles SET stripe_account_id = ? WHERE id = ?', 'acct_cara', creatorId)
  const account = (transfers: string) => ({
    id: `evt_acct_${transfers}`, object: 'event', type: 'account.updated',
    data: { object: { id: 'acct_cara', object: 'account', details_submitted: true, capabilities: { transfers } } },
  })
  await webhook(account('pending'))
  assert.equal(one<{ payouts_enabled: number }>('SELECT payouts_enabled FROM creator_profiles WHERE id = ?', creatorId)!.payouts_enabled, 0)
  await webhook(account('active'))
  assert.equal(one<{ payouts_enabled: number }>('SELECT payouts_enabled FROM creator_profiles WHERE id = ?', creatorId)!.payouts_enabled, 1)
  const state = await (await call('/api/state', { headers: { cookie: creatorCookie } })).json()
  assert.deepEqual(state.payoutAccount, { connected: true, ready: true })
})

test('withdrawing needs a connected payout account', async () => {
  run('UPDATE creator_profiles SET payouts_enabled = 0 WHERE id = ?', creatorId)
  const res = await post('/api/payouts', creatorCookie)
  assert.equal(res.status, 400)
  assert.match((await res.json()).error, /payout account/)
})

test('emails are sent through Resend and marked as sent', async () => {
  const sent: { url: string; body: { to: string[]; from: string; subject: string } }[] = []
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    sent.push({ url: String(url), body: JSON.parse(String(init?.body)) })
    return new Response('{"id":"email_1"}', { status: 200 })
  }) as typeof fetch
  try {
    await call('/api/auth/forgot', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'owner@shop.test' }) })
    await new Promise(r => setTimeout(r, 50))
  } finally {
    globalThis.fetch = realFetch
  }
  assert.equal(sent.length, 1)
  assert.equal(sent[0].url, 'https://api.resend.com/emails')
  assert.deepEqual(sent[0].body.to, ['owner@shop.test'])
  assert.equal(sent[0].body.from, 'Glink <hello@glink.test>')
  assert.ok(one("SELECT 1 FROM outbox WHERE to_email = 'owner@shop.test' AND sent_at IS NOT NULL"))
})
