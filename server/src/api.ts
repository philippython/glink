import dns from 'node:dns/promises'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { streamSSE } from 'hono/streaming'
import { z } from 'zod'
import { aiAnalyzeProduct, aiReview, type Frame } from './ai.ts'
import { requireUser, type Env, type User } from './auth.ts'
import { config } from './config.ts'
import { j, one, run, tx } from './db.ts'
import {
  approve, budgetOf, deliverablesOf, inviteCreator, ledgerEntry, matchCampaign, pickWinner, recordMetrics, refillInvites, walletBalance,
  type CampaignRow, type SubmissionRow,
} from './domain.ts'
import { brandUsers, creatorUser, emit, notify, sendEmail, subscribe } from './events.ts'
import { CATEGORIES, rankCreators } from './matching.ts'
import { BONUS_METRIC_KEYS, COUNTRIES, describeBonus, GOAL_NAMES } from './taxonomy.ts'
import { availablePayments, createTopUpCheckout, payoutDashboardLink, payoutOnboardingLink, recordPayout, syncPayoutAccount, withdrawToBank } from './payments.ts'
import { briefMatch, formatChecks, issueCount, scriptChecks } from './preflight.ts'
import { seedForNewBrand, seedForNewCreator } from './seed.ts'
import { membership, snapshot } from './snapshot.ts'
import { forbidden, HttpError, id, notFound, now, parse, toCents } from './util.ts'
import { creatorInputs, campaignInput } from './domain.ts'

export const api = new Hono<Env>()
api.use('*', requireUser)

// ─── Access helpers ─────────────────────────────────────────────────────────

function brandOf(user: User, need: 'any' | 'spend' | 'owner' = 'any') {
  const m = user.role === 'brand' ? membership(user.id) : undefined
  if (!m) throw forbidden('This needs a brand account.')
  if (need === 'spend' && m.role === 'Reviewer') throw forbidden('Reviewers can approve videos but can’t spend money or launch campaigns.')
  if (need === 'owner' && m.role !== 'Owner') throw forbidden('Only the brand owner can do that.')
  return m
}
function creatorOf(user: User) {
  const p = user.role === 'creator' ? one<{ id: string; display_name: string }>('SELECT id, display_name FROM creator_profiles WHERE user_id = ?', user.id) : undefined
  if (!p) throw forbidden('This needs a creator account.')
  return p
}
function campaignForBrand(campaignId: string, brandId: string) {
  const c = one<CampaignRow>('SELECT * FROM campaigns WHERE id = ?', campaignId)
  if (!c || c.brand_id !== brandId) throw notFound('Campaign not found.')
  return c
}
function submissionForBrand(subId: string, brandId: string) {
  const s = one<SubmissionRow>('SELECT * FROM submissions WHERE id = ?', subId)
  if (!s) throw notFound('Video not found.')
  return { sub: s, camp: campaignForBrand(s.campaign_id, brandId) }
}
function submissionForCreator(subId: string, creatorId: string) {
  const s = one<SubmissionRow>('SELECT * FROM submissions WHERE id = ?', subId)
  if (!s || s.creator_id !== creatorId) throw notFound('Mission not found.')
  return { sub: s, camp: one<CampaignRow>('SELECT * FROM campaigns WHERE id = ?', s.campaign_id)! }
}
const touchBrandAndCreator = (brandId: string, creatorId: string) => emit([...brandUsers(brandId), ...creatorUser(creatorId)])
const list = (min: number, msg: string) => z.array(z.string().trim().min(1).max(120)).min(min, msg)
const Country = z.string({ error: 'Choose a country.' }).refine(c => COUNTRIES.includes(c), 'Choose a country from the list.')

// ─── State + realtime ───────────────────────────────────────────────────────

api.get('/state', c => c.json(snapshot(c.get('user'))))

api.get('/events', c => streamSSE(c, async stream => {
  const off = subscribe(c.get('user').id, (event, data) => { void stream.writeSSE({ event, data: JSON.stringify(data) }) })
  stream.onAbort(off)
  await stream.writeSSE({ event: 'ready', data: '{}' })
  while (!stream.aborted) { await stream.sleep(25_000); await stream.writeSSE({ event: 'ping', data: '{}' }) }
  off()
}))

// ─── Onboarding ─────────────────────────────────────────────────────────────

api.post('/onboarding/role', async c => {
  const { role } = parse(z.object({ role: z.enum(['brand', 'creator']) }), await c.req.json())
  run('UPDATE users SET role = ? WHERE id = ?', role, c.get('user').id)
  return c.json({ ok: true })
})

const BrandInput = z.object({
  name: z.string().trim().min(1, 'Enter your company name.').max(80),
  country: Country,
  description: z.string().trim().min(10, 'Describe your brand in a sentence or two (at least 10 characters).').max(600),
  targetCustomers: z.array(z.string().trim().min(1).max(60), { error: 'Target customers must be a list — separate them with commas.' }).min(1, 'Add at least one target customer, e.g. “new parents, runners”.'),
})

api.post('/onboarding/brand', async c => {
  const body = parse(BrandInput, await c.req.json())
  const user = c.get('user')
  const existing = membership(user.id)
  tx(() => {
    if (existing) {
      run('UPDATE brands SET name = ?, country = ?, description = ?, target_customers = ? WHERE id = ?', body.name, body.country, body.description, JSON.stringify(body.targetCustomers), existing.brand_id)
    } else {
      const brandId = id('brd')
      run('INSERT INTO brands (id, name, country, description, target_customers, created_at) VALUES (?,?,?,?,?,?)', brandId, body.name, body.country, body.description, JSON.stringify(body.targetCustomers), now())
      run('INSERT INTO brand_members (brand_id, user_id, email, role, pending, created_at) VALUES (?,?,?,?,0,?)', brandId, user.id, user.email, 'Owner', now())
    }
    run("UPDATE users SET role = 'brand' WHERE id = ?", user.id)
  })
  return c.json({ ok: true })
})

const CreatorInputSchema = z.object({
  displayName: z.string().trim().min(1, 'Enter the name brands will see.').max(60),
  country: Country,
  niches: z.array(z.string().trim().min(1).max(40), { error: 'Niches must be a list — separate them with commas.' }).min(1, 'Add at least one niche, e.g. “skincare, fitness”.'),
  bio: z.string().trim().min(10, 'Write a short bio (at least 10 characters).').max(600),
})

api.post('/onboarding/creator', async c => {
  const body = parse(CreatorInputSchema, await c.req.json())
  const user = c.get('user')
  const existing = one<{ id: string }>('SELECT id FROM creator_profiles WHERE user_id = ?', user.id)
  // Match "Skincare" etc. to our category list so matching recognises them.
  const niches = body.niches.map(n => CATEGORIES.find(cat => cat.toLowerCase() === n.toLowerCase()) ?? n.charAt(0).toUpperCase() + n.slice(1))
  if (existing) {
    run('UPDATE creator_profiles SET display_name = ?, country = ?, niches = ?, bio = ? WHERE id = ?', body.displayName, body.country, JSON.stringify(niches), body.bio, existing.id)
  } else {
    const handle = '@' + body.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '')
    run(`INSERT INTO creator_profiles (id, user_id, display_name, handle, country, niches, bio, styles, prior_strengths, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      id('crt'), user.id, body.displayName, handle, body.country, JSON.stringify(niches), body.bio, '[]',
      JSON.stringify({ hook: 60, retention: 60, conversion: 55, reliability: 80 }), now())
  }
  run("UPDATE users SET role = 'creator' WHERE id = ?", user.id)
  return c.json({ ok: true })
})

api.post('/onboarding/complete', c => {
  const user = c.get('user')
  if (!user.onboarded) {
    if (user.role === 'brand') seedForNewBrand(brandOf(user).brand_id, user.id)
    else if (user.role === 'creator') seedForNewCreator(creatorOf(user).id)
    else throw new HttpError(400, 'Choose brand or creator first.')
  }
  run('UPDATE users SET onboarded = 1 WHERE id = ?', user.id)
  return c.json({ ok: true })
})

// ─── Account ────────────────────────────────────────────────────────────────

api.patch('/me', async c => {
  const body = parse(z.object({ name: z.string().trim().min(1).max(80).optional(), theme: z.enum(['light', 'dark', 'system']).optional() }), await c.req.json())
  const user = c.get('user')
  if (body.name) run('UPDATE users SET name = ? WHERE id = ?', body.name, user.id)
  if (body.theme) run('UPDATE users SET theme = ? WHERE id = ?', body.theme, user.id)
  return c.json({ ok: true })
})

/** Switching sides keeps both profiles; a missing one is created via onboarding. */
api.post('/me/switch-role', async c => {
  const { role } = parse(z.object({ role: z.enum(['brand', 'creator']) }), await c.req.json())
  const user = c.get('user')
  const has = role === 'brand' ? !!membership(user.id) : !!one('SELECT 1 FROM creator_profiles WHERE user_id = ?', user.id)
  run('UPDATE users SET role = ?, onboarded = ? WHERE id = ?', role, has ? 1 : 0, user.id)
  return c.json({ ok: true, needsOnboarding: !has })
})

api.post('/notifications/:id/read', c => {
  run('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL', now(), c.req.param('id'), c.get('user').id)
  return c.json({ ok: true })
})
api.post('/notifications/read-all', c => {
  run('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL', now(), c.get('user').id)
  return c.json({ ok: true })
})

// ─── Brand: campaigns ───────────────────────────────────────────────────────

const Milestone = z.object({ label: z.string().min(1), date: z.iso.date(), deadline: z.boolean().optional() })
const CampaignInputSchema = z.object({
  name: z.string().trim().min(1, 'Give the campaign a name.').max(100),
  product: z.string().trim().min(1, 'Say which product or service this is for.').max(160),
  category: z.enum(CATEGORIES as [string, ...string[]], { error: 'Choose a category.' }),
  goal: z.enum(GOAL_NAMES as [string, ...string[]], { error: 'Choose a goal.' }),
  market: Country,
  targetCustomers: list(1, 'Add at least one target customer.'),
  creativeAngle: z.string().trim().min(2, 'Choose a creative angle.').max(60),
  suggestedOpening: z.string().trim().min(3, 'Write the first line creators say on camera.').max(240),
  storyFlow: list(2, 'Add at least two story steps.'),
  mustInclude: z.array(z.string().trim().min(1).max(160)).max(12),
  avoid: z.array(z.string().trim().min(1).max(160)).max(12),
  deliverables: z.object({ count: z.number().int().min(1).max(10), aspectRatio: z.enum(['9:16', '1:1', '4:5', '16:9']), minSec: z.number().int().min(3).max(600), maxSec: z.number().int().min(4).max(900), rawFootage: z.boolean() })
    .refine(d => d.minSec < d.maxSec, { message: 'Minimum length must be shorter than maximum.', path: ['minSec'] }),
  baseFee: z.number().min(0).max(100_000),
  bonusAmount: z.number().min(0).max(100_000),
  bonusRule: z.string().max(200),
  benchmarkCtr: z.number().min(0.1).max(20).default(1.8),
  bonusMetric: z.enum(BONUS_METRIC_KEYS as [string, ...string[]]).default('ctr'),
  bonusThreshold: z.number({ error: 'Enter a bonus threshold.' }).positive('The bonus threshold must be above zero.').max(100_000).optional(),
  bonusWindowDays: z.number().int().min(1, 'The bonus window is at least 1 day.').max(90, 'The bonus window is at most 90 days.').default(14),
  creatorsWanted: z.number().int().min(1).max(50),
  sourcing: z.enum(['auto', 'handpick', 'contest']),
  prizes: z.array(z.number().min(0)).max(5).default([]),
  timeline: z.array(Milestone).min(2).refine(t => t.filter(m => m.deadline).length === 1, 'The timeline needs exactly one submission deadline.'),
}).refine(c => c.sourcing === 'contest' || c.baseFee >= 50, { message: 'Base fee must be at least $50.', path: ['baseFee'] })
  .refine(c => c.sourcing !== 'contest' || c.prizes.some(p => p > 0), { message: 'Add at least one prize.', path: ['prizes'] })

api.post('/campaigns', async c => {
  const user = c.get('user')
  const m = brandOf(user, 'spend')
  const d = parse(CampaignInputSchema, await c.req.json())
  const deadline = d.timeline.find(t => t.deadline)!.date
  const threshold = d.bonusThreshold ?? (d.bonusMetric === 'ctr' ? d.benchmarkCtr : NaN)
  if (d.sourcing !== 'contest' && !(threshold > 0)) throw new HttpError(422, 'Please fix the highlighted fields.', { bonusThreshold: 'Enter a bonus threshold.' })
  if (deadline <= new Date().toISOString().slice(0, 10)) throw new HttpError(422, 'Please fix the highlighted fields.', { deadline: 'The submission deadline must be in the future.' })
  const campId = id('cmp')
  tx(() => {
    run(`INSERT INTO campaigns (id, brand_id, name, product, category, goal, market, target_customers, creative_angle, suggested_opening, story_flow, must_include, avoid,
      deliverables, base_fee, bonus_amount, bonus_rule, benchmark_ctr, creators_wanted, sourcing, prizes, timeline, status, created_by, created_at,
      bonus_metric, bonus_threshold, bonus_window_days)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    campId, m.brand_id, d.name, d.product, d.category, d.goal, d.market, JSON.stringify(d.targetCustomers), d.creativeAngle, d.suggestedOpening,
    JSON.stringify(d.storyFlow), JSON.stringify(d.mustInclude), JSON.stringify(d.avoid), JSON.stringify(d.deliverables),
    d.sourcing === 'contest' ? 0 : toCents(d.baseFee), d.sourcing === 'contest' ? 0 : toCents(d.bonusAmount),
    d.sourcing === 'contest' ? d.bonusRule : describeBonus(d.bonusMetric as never, threshold, d.bonusWindowDays), d.bonusMetric === 'ctr' ? threshold : d.benchmarkCtr,
    d.sourcing === 'contest' ? Math.max(1, d.prizes.filter(p => p > 0).length) : d.creatorsWanted, d.sourcing,
    JSON.stringify(d.prizes.filter(p => p > 0).map(toCents)), JSON.stringify(d.timeline), 'live', user.id, now(),
    d.bonusMetric, threshold, d.bonusWindowDays)
    const camp = one<CampaignRow>('SELECT * FROM campaigns WHERE id = ?', campId)!
    const budget = budgetOf(camp)
    const balance = walletBalance(m.brand_id)
    if (budget > balance) throw new HttpError(402, `This campaign needs $${(budget / 100).toLocaleString()} in escrow but your wallet has $${(balance / 100).toLocaleString()}. Top up in Billing first.`, { wallet: 'Not enough funds in your wallet.' })
    ledgerEntry(m.brand_id, 'hold', -budget, `Escrow for ${d.name}`, campId)
  })
  matchCampaign(campId)
  notify(brandUsers(m.brand_id), { title: 'Campaign launched', body: `${d.name} is live${d.sourcing === 'auto' ? ' and the best-matched creators have been invited' : ''}.`, link: d.sourcing === 'contest' ? '/brand/contests' : `/brand/creators?campaign=${campId}` })
  return c.json({ id: campId, sourcing: d.sourcing })
})

api.post('/campaigns/:id/invite', async c => {
  const m = brandOf(c.get('user'), 'spend')
  const camp = campaignForBrand(c.req.param('id'), m.brand_id)
  const { creatorId } = parse(z.object({ creatorId: z.string() }), await c.req.json())
  if (!one('SELECT 1 FROM creator_profiles WHERE id = ?', creatorId)) throw notFound('Creator not found.')
  if (camp.sourcing === 'contest') throw new HttpError(400, 'Contests are open to everyone — there’s no one to invite.')
  inviteCreator(camp.id, creatorId)
  return c.json({ ok: true })
})

/** Why a creator matched: every factor with its weight, for the creator profile page. */
api.get('/campaigns/:id/explain/:creatorId', c => {
  const m = brandOf(c.get('user'))
  const camp = campaignForBrand(c.req.param('id'), m.brand_id)
  const input = creatorInputs().find(x => x.id === c.req.param('creatorId'))
  if (!input) throw notFound('Creator not found.')
  return c.json(rankCreators([input], campaignInput(camp))[0])
})

// ─── Brand: reviews, results, contests ─────────────────────────────────────

api.post('/submissions/:id/review', async c => {
  const user = c.get('user')
  const m = brandOf(user)
  const { decision, note } = parse(z.object({ decision: z.enum(['approve', 'changes', 'reject']), note: z.string().max(1000).default('') }), await c.req.json())
  const { sub, camp } = submissionForBrand(c.req.param('id'), m.brand_id)
  if (sub.status !== 'submitted') throw new HttpError(409, 'This video has already been reviewed.')
  if (camp.sourcing === 'contest' && decision === 'approve') throw new HttpError(400, 'For contests, pick winners instead of approving.')
  if (decision === 'approve') approve(sub, camp, user.id, note)
  else {
    // Flagged timestamps travel with a change request so the creator knows what to fix.
    const flagged = j<{ status: string; label: string; at?: number }[]>(sub.preflight, []).filter(i => i.status === 'fail' && i.at !== undefined)
    const fullNote = [note.trim(), flagged.length && decision === 'changes' ? `Flagged: ${flagged.map(f => `0:${String(Math.floor(f.at!)).padStart(2, '0')} ${f.label}`).join('; ')}` : ''].filter(Boolean).join(' — ')
    run('UPDATE submissions SET status = ?, review_note = ?, reviewed_by = ? WHERE id = ?', decision === 'changes' ? 'changes_requested' : 'rejected', fullNote || null, user.id, sub.id)
    notify(creatorUser(sub.creator_id), { title: decision === 'changes' ? 'Changes requested' : 'Video not approved', body: `${camp.name}, video ${sub.idx}${fullNote ? `: “${fullNote}”` : ''}`, link: `/creator/work/${sub.id}` })
  }
  touchBrandAndCreator(camp.brand_id, sub.creator_id)
  return c.json({ ok: true })
})

api.post('/submissions/:id/metrics', async c => {
  const m = brandOf(c.get('user'), 'spend')
  const { sub, camp } = submissionForBrand(c.req.param('id'), m.brand_id)
  if (!['approved', 'paid'].includes(sub.status)) throw new HttpError(400, 'Record results after the video is approved.')
  const body = parse(z.object({
    impressions: z.number().int().min(1, 'Enter impressions.'), clicks: z.number().int().min(0), conversions: z.number().int().min(0),
    spend: z.number().min(0), thumbstop: z.number().min(0).max(100), holdRate: z.number().min(0).max(100),
  }).refine(x => x.clicks <= x.impressions, { message: 'Clicks can’t exceed impressions.', path: ['clicks'] })
    .refine(x => x.conversions <= x.clicks, { message: 'Conversions can’t exceed clicks.', path: ['conversions'] }), await c.req.json())
  return c.json(recordMetrics(sub, camp, { ...body, spend: toCents(body.spend) }))
})

api.post('/submissions/:id/winner', async c => {
  const m = brandOf(c.get('user'), 'spend')
  const { place } = parse(z.object({ place: z.number().int().min(1).max(5) }), await c.req.json())
  const { sub, camp } = submissionForBrand(c.req.param('id'), m.brand_id)
  if (camp.sourcing !== 'contest') throw new HttpError(400, 'Only contest entries can win prizes.')
  pickWinner(sub, camp, place)
  touchBrandAndCreator(camp.brand_id, sub.creator_id)
  return c.json({ ok: true })
})

// ─── Brand: account, billing, team ─────────────────────────────────────────

api.patch('/brand', async c => {
  const m = brandOf(c.get('user'), 'spend')
  const b = parse(BrandInput, await c.req.json())
  run('UPDATE brands SET name = ?, country = ?, description = ?, target_customers = ? WHERE id = ?', b.name, b.country, b.description, JSON.stringify(b.targetCustomers), m.brand_id)
  emit(brandUsers(m.brand_id))
  return c.json({ ok: true })
})

/** Adds pretend money for testing and pilots (ALLOW_TEST_FUNDS). Real top-ups use /billing/checkout. */
api.post('/billing/topup', async c => {
  const m = brandOf(c.get('user'), 'owner')
  if (!config.allowTestFunds) throw new HttpError(403, 'Payments aren’t connected yet, so funds can’t be added here.')
  const { amount } = parse(z.object({ amount: z.number().min(10).max(100_000) }), await c.req.json())
  ledgerEntry(m.brand_id, 'topup', toCents(amount), 'Wallet top-up (test funds)')
  emit(brandUsers(m.brand_id))
  return c.json({ ok: true })
})

/** Starts a Stripe Checkout payment; the wallet is credited when Stripe confirms it. */
api.post('/billing/checkout', async c => {
  const user = c.get('user')
  const m = brandOf(user, 'owner')
  if (!config.stripe) throw new HttpError(503, 'Card payments aren’t set up yet.')
  const { amount } = parse(z.object({ amount: z.number({ error: 'Enter an amount.' }).min(50, 'The smallest top-up is $50.').max(100_000, 'The largest top-up is $100,000.') }), await c.req.json())
  return c.json({ url: await createTopUpCheckout(m.brand_id, user.email, amount) })
})

api.post('/team/invite', async c => {
  const user = c.get('user')
  const m = brandOf(user, 'owner')
  const { email, role } = parse(z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address.'), role: z.enum(['Manager', 'Reviewer']) }), await c.req.json())
  if (one('SELECT 1 FROM brand_members WHERE brand_id = ? AND email = ?', m.brand_id, email)) throw new HttpError(409, 'This person is already on your team.', { email: 'This person is already on your team.' })
  const existing = one<{ id: string }>('SELECT id FROM users WHERE email = ?', email)
  const otherBrand = existing && membership(existing.id)
  if (otherBrand) throw new HttpError(409, 'This person already belongs to another brand.', { email: 'This person already belongs to another brand.' })
  run('INSERT INTO brand_members (brand_id, user_id, email, role, pending, created_at) VALUES (?,?,?,?,1,?)', m.brand_id, null, email, role, now())
  const brand = one<{ name: string }>('SELECT name FROM brands WHERE id = ?', m.brand_id)!
  sendEmail(email, `${user.name} invited you to ${brand.name} on Glink`, `You’ve been invited as a ${role}. Create an account or log in with this email to join:\n${config.appUrl}/signup`)
  emit(brandUsers(m.brand_id))
  return c.json({ ok: true })
})

api.delete('/team/:email', c => {
  const m = brandOf(c.get('user'), 'owner')
  const email = decodeURIComponent(c.req.param('email'))
  if (email === c.get('user').email) throw new HttpError(400, 'You can’t remove yourself.')
  run("DELETE FROM brand_members WHERE brand_id = ? AND email = ? AND role != 'Owner'", m.brand_id, email)
  emit(brandUsers(m.brand_id))
  return c.json({ ok: true })
})

// ─── Product intelligence: fetch + analyse a product page ──────────────────

const PRIVATE = [/^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^0\./, /^::1$/, /^f[cd]/i, /^fe80/i]

async function fetchPage(raw: string) {
  const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  if (!['http:', 'https:'].includes(url.protocol)) throw new HttpError(400, 'Enter a web address starting with http or https.')
  // Refuse internal addresses so this endpoint can't be used to probe our network.
  const { address } = await dns.lookup(url.hostname).catch(() => { throw new HttpError(400, 'That website couldn’t be found.') })
  if (net.isIP(address) && PRIVATE.some(r => r.test(address))) throw new HttpError(400, 'That address isn’t allowed.')
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(10_000), headers: { 'user-agent': 'GlinkBot/1.0 (+product analysis)', accept: 'text/html' } })
    .catch(() => { throw new HttpError(502, 'We couldn’t reach that page. Check the address and try again.') })
  if (!res.ok) throw new HttpError(502, `The page returned an error (${res.status}).`)
  const html = (await res.text()).slice(0, 2_000_000)
  const meta = (name: string) => html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i'))?.[1]
    ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["']`, 'i'))?.[1]
  const title = (meta('og:title') ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? url.hostname).trim()
  const description = (meta('og:description') ?? meta('description') ?? '').trim()
  let price: number | undefined, brand: string | undefined
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1])
      const items = Array.isArray(data) ? data : data['@graph'] ?? [data]
      const product = items.find((x: { '@type'?: string | string[] }) => [].concat((x['@type'] ?? []) as never).includes('Product' as never))
      if (product) {
        const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers
        price = offer?.price ? Number(offer.price) : price
        brand = typeof product.brand === 'string' ? product.brand : product.brand?.name ?? brand
      }
    } catch { /* ignore malformed JSON-LD */ }
  }
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;|&#\d+;/g, ' ').replace(/\s+/g, ' ').trim()
  return { url: url.toString(), host: url.hostname.replace(/^www\./, ''), title, description, text, price, brand }
}

const CATEGORY_WORDS: Record<string, string[]> = {
  Skincare: ['serum', 'skin', 'moisturiser', 'moisturizer', 'spf', 'cleanser', 'acne'], Beauty: ['makeup', 'lipstick', 'mascara', 'hair'],
  Wellness: ['supplement', 'sleep', 'vitamin', 'stress'], Fitness: ['workout', 'protein', 'gym', 'yoga'], 'Food & Bev': ['coffee', 'snack', 'drink', 'tea', 'flavour', 'flavor'],
  Technology: ['app', 'device', 'battery', 'wireless', 'charger'], Finance: ['budget', 'invest', 'bank', 'savings'], Pets: ['dog', 'cat', 'pet'],
  Fashion: ['dress', 'shirt', 'shoes', 'jacket'], Home: ['kitchen', 'cleaning', 'candle', 'furniture'], Parenting: ['baby', 'toddler', 'parent'],
}

api.post('/products/analyze', async c => {
  brandOf(c.get('user'))
  const { url } = parse(z.object({ url: z.string().trim().min(4, 'Paste a product URL.') }), await c.req.json())
  const page = await fetchPage(url)
  const ai = await aiAnalyzeProduct(page)
  const lowerText = `${page.title} ${page.description} ${page.text.slice(0, 5000)}`.toLowerCase()
  const guessed = Object.entries(CATEGORY_WORDS).map(([cat, words]) => [cat, words.filter(w => lowerText.includes(w)).length] as const).sort((a, b) => b[1] - a[1])[0]
  const category = ai?.category ?? (guessed[1] > 0 ? guessed[0] : 'Home')
  return c.json({
    url: page.url, host: page.host, name: page.title.split(/[|–—-]/)[0].trim().slice(0, 80), brand: page.brand ?? page.host.split('.')[0], price: page.price,
    category, source: ai ? 'ai' : 'page',
    summary: ai?.summary ?? (page.description || `Product page at ${page.host}.`),
    audiences: ai?.audiences ?? [{ name: 'Problem-aware buyers', share: 60, insight: 'Already looking for a fix; respond to proof.' }, { name: 'Curious browsers', share: 40, insight: 'Need a reason to care in the first 2 seconds.' }],
    objections: ai?.objections ?? [{ text: '“Does it actually work?”', severity: 80 }, { text: '“Is it worth the price?”', severity: 65 }],
    angles: ai?.angles ?? [
      { name: 'Problem-solution', why: 'Shows the before and the fix in one video', strength: 80 },
      { name: 'Demonstration', why: 'Lets the product prove itself on camera', strength: 75 },
      { name: 'Testimonial', why: 'Personal story disarms scepticism', strength: 70 },
    ],
    usps: ai?.usps ?? (page.description ? page.description.split(/[.;•]/).map(s => s.trim()).filter(s => s.length > 8).slice(0, 3) : []),
  })
})

// ─── Creator: opportunities ─────────────────────────────────────────────────

api.post('/matches/:id/respond', async c => {
  const p = creatorOf(c.get('user'))
  const { accept } = parse(z.object({ accept: z.boolean() }), await c.req.json())
  const m = one<{ id: string; campaign_id: string; creator_id: string; status: string }>('SELECT * FROM matches WHERE id = ?', c.req.param('id'))
  if (!m || m.creator_id !== p.id) throw notFound('Opportunity not found.')
  if (m.status !== 'invited') throw new HttpError(409, 'You’ve already responded to this campaign.')
  const camp = one<CampaignRow>('SELECT * FROM campaigns WHERE id = ?', m.campaign_id)!
  if (camp.status !== 'live') throw new HttpError(409, 'This campaign is no longer live.')
  tx(() => {
    run('UPDATE matches SET status = ?, responded_at = ? WHERE id = ?', accept ? 'accepted' : 'declined', now(), m.id)
    if (accept) for (let i = 1; i <= deliverablesOf(camp).count; i++) {
      run("INSERT OR IGNORE INTO submissions (id, match_id, campaign_id, creator_id, idx, status) VALUES (?,?,?,?,?, 'not_started')", id('sub'), m.id, camp.id, p.id, i)
    }
  })
  notify(brandUsers(camp.brand_id), { title: `${p.display_name} ${accept ? 'accepted' : 'declined'}`, body: camp.name, link: `/brand/creators?campaign=${camp.id}` })
  if (!accept) refillInvites(camp.id)
  touchBrandAndCreator(camp.brand_id, p.id)
  return c.json({ ok: true })
})

api.post('/campaigns/:id/enter', c => {
  const p = creatorOf(c.get('user'))
  const camp = one<CampaignRow>('SELECT * FROM campaigns WHERE id = ?', c.req.param('id'))
  if (!camp || camp.sourcing !== 'contest' || camp.status !== 'live') throw notFound('This contest isn’t open.')
  const deadline = j<{ date: string; deadline?: boolean }[]>(camp.timeline, []).find(t => t.deadline)?.date
  if (deadline && deadline < new Date().toISOString().slice(0, 10)) throw new HttpError(409, 'Submissions for this contest have closed.')
  if (!one('SELECT 1 FROM matches WHERE campaign_id = ? AND creator_id = ?', camp.id, p.id)) {
    const score = rankCreators(creatorInputs().filter(x => x.id === p.id), campaignInput(camp))[0]
    tx(() => {
      const matchId = id('mch')
      run("INSERT INTO matches (id, campaign_id, creator_id, score, reasons, status, responded_at) VALUES (?,?,?,?,?, 'accepted', ?)", matchId, camp.id, p.id, score.score, JSON.stringify(score.reasons), now())
      for (let i = 1; i <= deliverablesOf(camp).count; i++) run("INSERT INTO submissions (id, match_id, campaign_id, creator_id, idx, status) VALUES (?,?,?,?,?, 'not_started')", id('sub'), matchId, camp.id, p.id, i)
    })
    notify(brandUsers(camp.brand_id), { title: `${p.display_name} entered your contest`, body: camp.name, link: '/brand/contests' })
  }
  touchBrandAndCreator(camp.brand_id, p.id)
  return c.json({ ok: true })
})

// ─── Creator: upload, pre-flight, submit ───────────────────────────────────

api.post('/submissions/:id/upload', bodyLimit({ maxSize: config.maxUploadBytes, onError: () => { throw new HttpError(413, `Videos can be up to ${config.maxUploadBytes / 1024 / 1024} MB.`) } }), async c => {
  const p = creatorOf(c.get('user'))
  const { sub, camp } = submissionForCreator(c.req.param('id'), p.id)
  if (!['not_started', 'in_progress', 'changes_requested'].includes(sub.status)) throw new HttpError(409, 'This video has already been submitted.')
  const form = await c.req.parseBody()
  const file = form.file instanceof File ? form.file : null
  const meta = parse(z.object({
    duration: z.coerce.number().min(1, 'Enter the video’s duration in seconds.').max(3600),
    width: z.coerce.number().int().min(0).optional(), height: z.coerce.number().int().min(0).optional(),
    script: z.string().max(10_000).optional(), frames: z.string().optional(),
  }), form)
  if (!file && !sub.file_path) throw new HttpError(422, 'Please fix the highlighted fields.', { file: 'Choose a video to upload.' })

  let filePath = sub.file_path, fileName = sub.file_name, mime = sub.mime, size = sub.size_bytes
  if (file) {
    if (!/^video\//.test(file.type) && !/\.(mp4|mov)$/i.test(file.name)) throw new HttpError(422, 'Please fix the highlighted fields.', { file: 'Upload an MP4 or MOV video.' })
    const dir = path.join(config.uploadDir, sub.id)
    fs.mkdirSync(dir, { recursive: true })
    const ext = path.extname(file.name).toLowerCase() === '.mov' ? '.mov' : '.mp4'
    filePath = path.join(dir, `v${sub.attempts + 1}${ext}`)
    await pipeline(Readable.fromWeb(file.stream() as never), fs.createWriteStream(filePath))
    fileName = file.name.slice(0, 200); mime = file.type || null; size = file.size
  }

  const brief = { mustInclude: j<string[]>(camp.must_include, []), avoid: j<string[]>(camp.avoid, []), deliverables: deliverablesOf(camp) }
  const fileInput = { duration: meta.duration, width: meta.width || undefined, height: meta.height || undefined, mime: mime ?? undefined, sizeBytes: size ?? undefined, fileName: fileName ?? undefined }
  let items = [...formatChecks(brief, fileInput), ...scriptChecks(brief, meta.script, meta.duration)]
  const frames = j<Frame[]>(meta.frames, []).filter(f => typeof f.data === 'string' && f.data.length < 400_000).slice(0, 8)
  items = await aiReview(items, frames, meta.script)
  const bm = briefMatch(items)
  run(`UPDATE submissions SET file_path = ?, file_name = ?, mime = ?, size_bytes = ?, duration = ?, width = ?, height = ?, script = ?, preflight = ?, brief_match = ?, ai_feedback = ?,
       status = 'in_progress', attempts = attempts + 1 WHERE id = ?`,
  filePath, fileName, mime, size, meta.duration, meta.width ?? null, meta.height ?? null, meta.script ?? null, JSON.stringify(items), bm.score, bm.feedback, sub.id)
  emit(creatorUser(p.id))
  return c.json({ preflight: items, briefMatch: bm.score, issues: issueCount(items) })
})

api.post('/submissions/:id/submit', c => {
  const p = creatorOf(c.get('user'))
  const { sub, camp } = submissionForCreator(c.req.param('id'), p.id)
  if (sub.status !== 'in_progress' || !sub.file_path) throw new HttpError(409, 'Upload your video and run the pre-flight check first.')
  run("UPDATE submissions SET status = 'submitted', submitted_at = ? WHERE id = ?", now(), sub.id)
  const issues = issueCount(j(sub.preflight, []))
  notify(brandUsers(camp.brand_id), { title: `${p.display_name} submitted a video`, body: `${camp.name}, video ${sub.idx} of ${deliverablesOf(camp).count}${issues ? ` · ${issues} pre-flight issue${issues > 1 ? 's' : ''}` : ' · pre-flight passed'}`, link: camp.sourcing === 'contest' ? '/brand/contests' : `/brand/reviews/${sub.id}` })
  touchBrandAndCreator(camp.brand_id, p.id)
  return c.json({ ok: true })
})

/** Streams an uploaded video with HTTP range support (needed for seeking). */
api.get('/media/:id', c => {
  const user = c.get('user')
  const sub = one<SubmissionRow>('SELECT * FROM submissions WHERE id = ?', c.req.param('id'))
  if (!sub?.file_path || !fs.existsSync(sub.file_path)) throw notFound('Video not found.')
  const camp = one<CampaignRow>('SELECT * FROM campaigns WHERE id = ?', sub.campaign_id)!
  const isOwner = user.role === 'creator' && one('SELECT 1 FROM creator_profiles WHERE id = ? AND user_id = ?', sub.creator_id, user.id)
  const isBrand = user.role === 'brand' && membership(user.id)?.brand_id === camp.brand_id
  if (!isOwner && !isBrand) throw forbidden()
  const size = fs.statSync(sub.file_path).size
  const type = sub.mime || (sub.file_path.endsWith('.mov') ? 'video/quicktime' : 'video/mp4')
  const range = c.req.header('range')?.match(/bytes=(\d*)-(\d*)/)
  if (range) {
    const start = range[1] ? Number(range[1]) : 0
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : Math.min(start + 4 * 1024 * 1024, size - 1)
    if (start >= size) return c.body(null, 416, { 'content-range': `bytes */${size}` })
    return c.body(Readable.toWeb(fs.createReadStream(sub.file_path, { start, end })) as ReadableStream, 206, {
      'content-type': type, 'content-length': String(end - start + 1), 'content-range': `bytes ${start}-${end}/${size}`, 'accept-ranges': 'bytes', 'cache-control': 'private, max-age=3600',
    })
  }
  return c.body(Readable.toWeb(fs.createReadStream(sub.file_path)) as ReadableStream, 200, { 'content-type': type, 'content-length': String(size), 'accept-ranges': 'bytes' })
})

// ─── Creator: profile, channels, payouts ───────────────────────────────────

api.patch('/creator', async c => {
  const p = creatorOf(c.get('user'))
  const b = parse(CreatorInputSchema.extend({ baseRate: z.number().min(0).max(100_000), availability: z.enum(['Available', 'Limited', 'Unavailable']) }), await c.req.json())
  run('UPDATE creator_profiles SET display_name = ?, country = ?, niches = ?, bio = ?, base_rate = ?, availability = ? WHERE id = ?',
    b.displayName, b.country, JSON.stringify(b.niches), b.bio, toCents(b.baseRate), b.availability, p.id)
  return c.json({ ok: true })
})

api.post('/creator/channels', async c => {
  const p = creatorOf(c.get('user'))
  const b = parse(z.object({ platform: z.enum(['TikTok', 'Instagram', 'YouTube']), handle: z.string().trim().min(2, 'Enter your handle.').max(60), followers: z.number().int().min(0).max(1e9) }), await c.req.json())
  if (one('SELECT 1 FROM social_channels WHERE creator_id = ? AND platform = ?', p.id, b.platform)) throw new HttpError(409, `You’ve already connected ${b.platform}.`)
  // Followers are self-reported until the platform's OAuth verification is connected.
  run('INSERT INTO social_channels (id, creator_id, platform, handle, followers, verified) VALUES (?,?,?,?,?,0)', id('chn'), p.id, b.platform, b.handle.startsWith('@') ? b.handle : `@${b.handle}`, b.followers)
  return c.json({ ok: true })
})

/** Withdraws everything available: a real Stripe transfer when Stripe is set up, otherwise a recorded payout. */
api.post('/payouts', async c => {
  const p = creatorOf(c.get('user'))
  if (config.stripe) return c.json({ amount: (await withdrawToBank(p.id)) / 100 })
  const avail = availablePayments(p.id)
  const total = avail.reduce((a, x) => a + x.amount, 0)
  if (total <= 0) throw new HttpError(400, 'Nothing is available to withdraw yet.')
  recordPayout(p.id, avail.map(a => a.id), total, null)
  return c.json({ amount: total / 100 })
})

api.post('/payouts/connect', async c => {
  const user = c.get('user')
  return c.json({ url: await payoutOnboardingLink(creatorOf(user).id, user.email) })
})
api.post('/payouts/sync', async c => c.json({ ready: await syncPayoutAccount(creatorOf(c.get('user')).id) }))
api.post('/payouts/settings', async c => {
  const { auto } = parse(z.object({ auto: z.boolean() }), await c.req.json())
  run('UPDATE creator_profiles SET auto_payout = ? WHERE id = ?', auto ? 1 : 0, creatorOf(c.get('user')).id)
  return c.json({ ok: true })
})
api.post('/payouts/dashboard', async c => c.json({ url: await payoutDashboardLink(creatorOf(c.get('user')).id) }))
