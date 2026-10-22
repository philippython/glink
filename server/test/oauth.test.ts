// Social sign-in, with Google's endpoints replaced by a fake so no real keys are needed.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { before, test } from 'node:test'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'glink-oauth-'))
Object.assign(process.env, { DATABASE_PATH: path.join(dir, 't.db'), UPLOAD_DIR: path.join(dir, 'up'), GOOGLE_CLIENT_ID: 'test-id', GOOGLE_CLIENT_SECRET: 'test-secret', APP_URL: 'http://localhost:5173' })
const { app, init } = await import('../src/app.ts')
before(() => init())

let googleUser = { sub: 'g-1', email: 'new.person@gmail.com', email_verified: true, name: 'New Person' }
const realFetch = globalThis.fetch
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input)
  if (url.startsWith('https://oauth2.googleapis.com/token')) return new Response(JSON.stringify({ access_token: 'tok' }))
  if (url.startsWith('https://openidconnect.googleapis.com/v1/userinfo')) return new Response(JSON.stringify(googleUser))
  return realFetch(input, init)
}) as typeof fetch

async function signInWithGoogle(next?: string) {
  const start = await app.fetch(new Request(`http://localhost/api/auth/oauth/google/start${next ? `?next=${encodeURIComponent(next)}` : ''}`))
  assert.equal(start.status, 302)
  const to = new URL(start.headers.get('location')!)
  assert.equal(to.hostname, 'accounts.google.com')
  const state = to.searchParams.get('state')!
  const stateCookie = start.headers.get('set-cookie')!.split(';')[0]
  const cb = await app.fetch(new Request(`http://localhost/api/auth/oauth/google/callback?code=abc&state=${state}`, { headers: { cookie: stateCookie } }))
  const session = cb.headers.getSetCookie().find(c => c.startsWith('glink_session='))?.split(';')[0]
  return { status: cb.status, location: cb.headers.get('location'), session }
}

test('config lists only providers with keys', async () => {
  const r = await (await app.fetch(new Request('http://localhost/api/auth/config'))).json()
  assert.deepEqual(r.providers, ['google'])
  const fb = await app.fetch(new Request('http://localhost/api/auth/oauth/facebook/start'))
  assert.equal(fb.headers.get('location'), '/login?error=oauth_unavailable')
})

test('new Google user gets an account, a session, and goes to onboarding (or the requested path)', async () => {
  const r = await signInWithGoogle('/onboarding?as=creator')
  assert.equal(r.status, 302)
  assert.equal(r.location, '/onboarding?as=creator')
  assert.ok(r.session)
  const me = await (await app.fetch(new Request('http://localhost/api/auth/me', { headers: { cookie: r.session! } }))).json()
  assert.equal(me.user.email, 'new.person@gmail.com')
  assert.equal(me.user.hasPassword, false)
})

test('a wrong state is rejected', async () => {
  const start = await app.fetch(new Request('http://localhost/api/auth/oauth/google/start'))
  const cookie = start.headers.get('set-cookie')!.split(';')[0]
  const cb = await app.fetch(new Request('http://localhost/api/auth/oauth/google/callback?code=abc&state=forged', { headers: { cookie } }))
  assert.equal(cb.headers.get('location'), '/login?error=oauth_state')
})

test('a verified email links to the existing password account', async () => {
  googleUser = { sub: 'g-2', email: 'MAYA@example.com', email_verified: true, name: 'Maya' }
  const r = await signInWithGoogle()
  assert.equal(r.location, '/creator', 'existing onboarded creator lands on their home')
  const me = await (await app.fetch(new Request('http://localhost/api/auth/me', { headers: { cookie: r.session! } }))).json()
  assert.equal(me.user.email, 'maya@example.com')
  assert.equal(me.user.hasPassword, true)
})

test('an unverified email is refused', async () => {
  googleUser = { sub: 'g-3', email: 'alex@lumenskin.com', email_verified: false, name: 'Impostor' }
  const r = await signInWithGoogle()
  assert.equal(r.location, '/login?error=email_unverified&provider=google')
  assert.equal(r.session, undefined)
})
