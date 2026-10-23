// End-to-end API test against a fresh, throwaway database (in-process, no server).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { before, test } from 'node:test'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'glink-test-'))
process.env.DATABASE_PATH = path.join(dir, 'test.db')
process.env.UPLOAD_DIR = path.join(dir, 'uploads')

const { app, init } = await import('../src/app.ts')

class Client {
  cookie = ''
  async req(method: string, url: string, body?: unknown) {
    const isForm = body instanceof FormData
    const res = await app.fetch(new Request(`http://localhost${url}`, {
      method, body: isForm ? body : body === undefined ? undefined : JSON.stringify(body),
      headers: { ...(isForm || body === undefined ? {} : { 'content-type': 'application/json' }), cookie: this.cookie, origin: 'http://localhost:5173' },
    }))
    const set = res.headers.get('set-cookie')
    if (set?.startsWith('glink_session=')) this.cookie = set.split(';')[0]
    const text = await res.text()
    return { status: res.status, body: text ? JSON.parse(text) : null }
  }
  get = (u: string) => this.req('GET', u)
  post = (u: string, b?: unknown) => this.req('POST', u, b ?? {})
}

before(() => init())

test('auth: signup, wrong password, session cookie, logout', async () => {
  const c = new Client()
  const bad = await c.post('/api/auth/signup', { name: 'X', email: 'not-an-email', password: 'short' })
  assert.equal(bad.status, 422)
  assert.ok(bad.body.fields.email && bad.body.fields.password)
  assert.equal((await c.post('/api/auth/signup', { name: 'Tess', email: 'tess@example.com', password: 'longenough1' })).status, 200)
  assert.equal((await c.get('/api/auth/me')).body.user.email, 'tess@example.com')
  assert.equal((await c.post('/api/auth/signup', { name: 'Tess', email: 'TESS@example.com', password: 'longenough1' })).status, 409, 'emails are case-insensitive')
  await c.post('/api/auth/logout')
  assert.equal((await c.get('/api/state')).status, 401)
  assert.equal((await c.post('/api/auth/login', { email: 'tess@example.com', password: 'nope' })).status, 401)
  assert.equal((await c.post('/api/auth/login', { email: 'tess@example.com', password: 'longenough1' })).status, 200)
})

test('cross-site requests are blocked', async () => {
  const res = await app.fetch(new Request('http://localhost/api/auth/login', { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{}' }))
  assert.equal(res.status, 403)
})

test('requests from the address the app is served on are allowed, even if APP_URL differs', async () => {
  const login = (origin: string, host: string) => app.fetch(new Request(`https://${host}/api/auth/login`, {
    method: 'POST', headers: { origin, 'x-forwarded-host': host, 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'nobody@example.com', password: 'wrongpassword' }),
  }))
  assert.equal((await login('https://glink-ab12.onrender.com', 'glink-ab12.onrender.com')).status, 401, 'reaches the login check')
  assert.equal((await login('https://evil.example', 'glink-ab12.onrender.com')).status, 403, 'other sites stay blocked')
})

test('brand setup rejects a non-list target_customers with a plain-language field error', async () => {
  const c = new Client()
  await c.post('/api/auth/signup', { name: 'Bo', email: 'bo@brand.com', password: 'longenough1' })
  const r = await c.post('/api/onboarding/brand', { name: 'Bo Co', country: 'United States', description: 'We sell nice things.', targetCustomers: 'new parents, runners' })
  assert.equal(r.status, 422)
  assert.match(r.body.fields.targetCustomers, /list/)
  assert.equal((await c.post('/api/onboarding/brand', { name: 'Bo Co', country: 'United States', description: 'We sell nice things.', targetCustomers: ['new parents', 'runners'] })).status, 200)
  assert.equal((await c.post('/api/onboarding/complete')).status, 200)
  const s = (await c.get('/api/state')).body
  assert.equal(s.brand.name, 'Bo Co')
  assert.ok(s.wallet > 0 && s.campaigns.length === 1, 'new brands get test funds and a sample campaign')
})

test('full loop: launch → match → accept → upload → flag → changes → approve → metrics → bonus', async () => {
  const brand = new Client(), creator = new Client(), reviewer = new Client()
  await brand.post('/api/auth/login', { email: 'alex@lumenskin.com', password: 'demo1234' })
  await creator.post('/api/auth/login', { email: 'maya@example.com', password: 'demo1234' })
  await reviewer.post('/api/auth/login', { email: 'sam@lumenskin.com', password: 'demo1234' })
  const walletBefore = (await brand.get('/api/state')).body.wallet

  const campaign = {
    name: 'API test', product: 'Barrier serum', category: 'Skincare', goal: 'Purchases', market: 'United States', targetCustomers: ['Sensitive skin'],
    creativeAngle: 'Problem-solution', suggestedOpening: 'I made a mistake.', storyFlow: ['Setup', 'Result'], mustInclude: ['Say it’s fragrance-free'],
    avoid: ['“Miracle” or “cure” claims'], deliverables: { count: 1, aspectRatio: '9:16', minSec: 15, maxSec: 30, rawFootage: false },
    baseFee: 380, bonusAmount: 150, bonusRule: 'Beats your click-through benchmark within 14 days', benchmarkCtr: 1.8, creatorsWanted: 2, sourcing: 'auto',
    timeline: [{ label: 'Brief sent', date: new Date().toISOString().slice(0, 10) }, { label: 'Final due', date: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10), deadline: true }],
  }
  assert.equal((await reviewer.post('/api/campaigns', campaign)).status, 403, 'reviewers cannot spend')
  const launched = await brand.post('/api/campaigns', campaign)
  assert.equal(launched.status, 200, JSON.stringify(launched.body))
  const s1 = (await brand.get('/api/state')).body
  assert.equal(s1.wallet, walletBefore - (380 + 150) * 2, 'budget held in escrow')
  const invited = s1.matches.filter((m: { campaignId: string; status: string }) => m.campaignId === launched.body.id && m.status === 'invited')
  assert.equal(invited.length, 2, 'auto-match invites the top 2')

  const cs = (await creator.get('/api/state')).body
  const myMatch = cs.matches.find((m: { campaignId: string }) => m.campaignId === launched.body.id)
  assert.ok(myMatch, 'Maya (best fit) was invited')
  assert.equal((await creator.post(`/api/matches/${myMatch.id}/respond`, { accept: true })).status, 200)
  const sub = (await creator.get('/api/state')).body.submissions.find((s: { campaignId: string }) => s.campaignId === launched.body.id)

  const upload = (script: string) => {
    const f = new FormData()
    f.set('file', new File([new Uint8Array(1024)], 'take.mp4', { type: 'video/mp4' }))
    f.set('duration', '22'); f.set('width', '1080'); f.set('height', '1920'); f.set('script', script)
    return creator.req('POST', `/api/submissions/${sub.id}/upload`, f)
  }
  const first = await upload('This is a miracle. It’s fragrance-free.')
  assert.equal(first.status, 200, JSON.stringify(first.body))
  assert.equal(first.body.issues, 1)
  assert.equal((await creator.post(`/api/submissions/${sub.id}/submit`)).status, 200)

  assert.equal((await reviewer.post(`/api/submissions/${sub.id}/review`, { decision: 'changes', note: 'Drop that word.' })).status, 200)
  const back = (await creator.get('/api/state')).body.submissions.find((s: { id: string }) => s.id === sub.id)
  assert.equal(back.status, 'changes_requested')
  assert.match(back.reviewNote, /Drop that word.*Flagged: 0:\d\d/)

  assert.equal((await upload('It’s fragrance-free and gentle on skin.')).body.issues, 0)
  await creator.post(`/api/submissions/${sub.id}/submit`)
  assert.equal((await reviewer.post(`/api/submissions/${sub.id}/review`, { decision: 'approve' })).status, 200, 'reviewers can approve')
  const pay = (await creator.get('/api/state')).body.payments.find((p: { creativeId: string }) => p.creativeId === sub.id)
  assert.equal(pay.base, 380); assert.equal(pay.status, 'pending')

  const media = await app.fetch(new Request(`http://localhost/api/media/${sub.id}`, { headers: { cookie: brand.cookie, range: 'bytes=0-99' } }))
  assert.equal(media.status, 206, 'brand can stream the video with range requests')

  const m = await brand.post(`/api/submissions/${sub.id}/metrics`, { impressions: 10000, clicks: 300, conversions: 12, spend: 400, thumbstop: 45, holdRate: 30 })
  assert.equal(m.body.winning, true)
  const after = (await creator.get('/api/state')).body
  assert.ok(after.payments.some((p: { creativeId: string; bonus: number }) => p.creativeId === sub.id && p.bonus === 150), 'bonus paid automatically')
  assert.ok(after.submissions.find((s: { id: string }) => s.id === sub.id).winning)
})

test('creators only see their own data; brands cannot touch other brands', async () => {
  const other = new Client()
  await other.post('/api/auth/login', { email: 'bo@brand.com', password: 'longenough1' })
  const lumen = new Client()
  await lumen.post('/api/auth/login', { email: 'alex@lumenskin.com', password: 'demo1234' })
  const sub = (await lumen.get('/api/state')).body.submissions.find((s: { status: string }) => s.status === 'submitted')
  assert.equal((await other.post(`/api/submissions/${sub.id}/review`, { decision: 'approve' })).status, 404)
  const leo = new Client()
  await leo.post('/api/auth/login', { email: 'leo@example.com', password: 'demo1234' })
  const s = (await leo.get('/api/state')).body
  assert.ok(s.submissions.every((x: { creatorId: string }) => x.creatorId === s.meCreatorId))
  assert.equal(s.me.email, 'leo@example.com')
})

test('password reset: token works once and signs in', async () => {
  const c = new Client()
  assert.equal((await c.post('/api/auth/forgot', { email: 'tess@example.com' })).status, 200)
  const mail = (await c.get('/api/dev/outbox')).body.find((m: { to_email: string }) => m.to_email === 'tess@example.com')
  const token = mail.body.match(/token=([\w-]+)/)[1]
  assert.equal((await c.post('/api/auth/reset', { token, password: 'brandnewpass' })).status, 200)
  assert.equal((await c.post('/api/auth/reset', { token, password: 'again12345' })).status, 400)
  assert.equal((await new Client().post('/api/auth/login', { email: 'tess@example.com', password: 'brandnewpass' })).status, 200)
})
