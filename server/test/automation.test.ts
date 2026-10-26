// Escrow automation and flexible bonus rules, against a throwaway database with the demo data.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { before, test } from 'node:test'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'glink-auto-'))
Object.assign(process.env, { DATABASE_PATH: path.join(dir, 'test.db'), UPLOAD_DIR: path.join(dir, 'uploads'), SEED_DEMO: 'true', AUTO_APPROVE_DAYS: '5', REVIEW_REMINDER_DAYS: '2' })

const { app, init } = await import('../src/app.ts')
const { all, one, run } = await import('../src/db.ts')
const { beatsRule, metricValue, reviewAutomation } = await import('../src/domain.ts')
type Camp = Parameters<typeof beatsRule>[0]

before(() => init())

const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000).toISOString()
const waiting = () => all<{ id: string; preflight: string }>("SELECT id, preflight FROM submissions WHERE status = 'submitted' ORDER BY idx")
const failed = (s: { preflight: string }) => JSON.parse(s.preflight).some((i: { status: string }) => i.status === 'fail')

test('a brand that goes quiet is reminded once, then clean videos are approved and paid automatically', () => {
  const subs = waiting()
  const clean = subs.find(s => !failed(s))!
  const flagged = subs.find(s => failed(s))!
  assert.ok(clean && flagged, 'demo data has one clean and one flagged video waiting')

  // Day 3: one reminder per video, never repeated.
  for (const s of subs) run('UPDATE submissions SET submitted_at = ? WHERE id = ?', daysAgo(3), s.id)
  reviewAutomation(); reviewAutomation()
  assert.equal(one<{ n: number }>("SELECT COUNT(*) n FROM notifications WHERE title = 'A video is waiting for review'")!.n > 0, true)
  const reminders = one<{ n: number }>("SELECT COUNT(*) n FROM notifications WHERE title = 'A video is waiting for review'")!.n
  reviewAutomation()
  assert.equal(one<{ n: number }>("SELECT COUNT(*) n FROM notifications WHERE title = 'A video is waiting for review'")!.n, reminders, 'reminders are sent once')

  // Day 6: the clean video is approved and its creator paid; the flagged one waits for a human decision.
  for (const s of subs) run('UPDATE submissions SET submitted_at = ? WHERE id = ?', daysAgo(6), s.id)
  reviewAutomation()
  const c = one<{ status: string; auto_approved: number }>('SELECT status, auto_approved FROM submissions WHERE id = ?', clean.id)!
  assert.equal(c.status, 'approved'); assert.equal(c.auto_approved, 1)
  assert.ok(one("SELECT 1 FROM payments WHERE submission_id = ? AND kind = 'base'", clean.id), 'creator was paid from escrow')
  const f = one<{ status: string; escalated_at: string | null }>('SELECT status, escalated_at FROM submissions WHERE id = ?', flagged.id)!
  assert.equal(f.status, 'submitted', 'videos with failed checks are never auto-approved')
  assert.ok(f.escalated_at)
  assert.ok(one("SELECT 1 FROM notifications WHERE title = 'A video needs your decision'"))
})

test('bonus rules: any metric, any threshold, lower-is-better for cost per result', () => {
  const m = { impressions: 10_000, clicks: 250, conversions: 20, spend: 300, thumbstop: 34, holdRate: 12 }
  assert.equal(metricValue('ctr', m), 2.5)
  assert.equal(metricValue('cvr', m), 8)
  assert.equal(metricValue('cpa', m), 15)
  const camp = (metric: Camp['bonus_metric'], threshold: number) => ({ bonus_metric: metric, bonus_threshold: threshold, benchmark_ctr: 1.8 }) as Camp
  assert.equal(beatsRule(camp('ctr', 2), metricValue('ctr', m)), true)
  assert.equal(beatsRule(camp('hook', 40), metricValue('hook', m)), false)
  assert.equal(beatsRule(camp('cpa', 20), metricValue('cpa', m)), true, '$15 per result beats a $20 ceiling')
  assert.equal(beatsRule(camp('cpa', 10), metricValue('cpa', m)), false)
})

test('campaigns accept the new goals and reject countries outside the list', async () => {
  const login = await app.fetch(new Request('http://localhost/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' }, body: JSON.stringify({ email: 'alex@lumenskin.com', password: 'demo1234' }) }))
  const cookie = login.headers.get('set-cookie')!.split(';')[0]
  const d = new Date(Date.now() + 20 * 86400_000).toISOString().slice(0, 10)
  const body = (over: object) => JSON.stringify({
    name: 'App launch', product: 'Glow app', category: 'Apps & Software', goal: 'App installs', market: 'Brazil', targetCustomers: ['Students'],
    creativeAngle: 'Demonstration', suggestedOpening: 'I found an app that fixed my mornings.', storyFlow: ['Setup', 'Result'], mustInclude: [], avoid: [],
    deliverables: { count: 1, aspectRatio: '9:16', minSec: 15, maxSec: 30, rawFootage: false }, baseFee: 100, bonusAmount: 50, bonusRule: '',
    bonusMetric: 'cpa', bonusThreshold: 4, bonusWindowDays: 30, creatorsWanted: 1, sourcing: 'auto', prizes: [],
    timeline: [{ label: 'Brief sent', date: new Date().toISOString().slice(0, 10) }, { label: 'Final due', date: d, deadline: true }], ...over,
  })
  const post = (b: string) => app.fetch(new Request('http://localhost/api/campaigns', { method: 'POST', headers: { 'content-type': 'application/json', cookie, origin: 'http://localhost:5173' }, body: b }))
  const bad = await post(body({ market: 'Atlantis' }))
  assert.equal(bad.status, 422)
  const ok = await post(body({}))
  assert.equal(ok.status, 200, await ok.clone().text())
  const row = one<{ goal: string; bonus_metric: string; bonus_threshold: number; bonus_window_days: number; bonus_rule: string }>("SELECT goal, bonus_metric, bonus_threshold, bonus_window_days, bonus_rule FROM campaigns WHERE name = 'App launch'")!
  assert.deepEqual([row.goal, row.bonus_metric, row.bonus_threshold, row.bonus_window_days], ['App installs', 'cpa', 4, 30])
  assert.equal(row.bonus_rule, 'Cost per result below $4 within 30 days')
})
