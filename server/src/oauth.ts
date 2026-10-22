// Social sign-in (OAuth 2.0 / OpenID Connect authorization-code flow) for
// Google, Facebook and Apple. Each provider turns on when its keys are set
// (see .env.example). The same flow serves sign up and log in: a new identity
// creates an account, an existing one signs in, and a verified email that
// matches an existing account links to it.

import crypto from 'node:crypto'
import { Hono, type Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { acceptPendingInvites, createSession, type Env, type User } from './auth.ts'
import { config } from './config.ts'
import { one, run, tx } from './db.ts'
import { id, now } from './util.ts'

export type Provider = 'google' | 'facebook' | 'apple'
interface Profile { subject: string; email?: string; emailVerified: boolean; name?: string }

const callbackUrl = (p: Provider) => `${config.appUrl}/api/auth/oauth/${p}/callback`

export const enabledProviders = (): Provider[] =>
  (Object.keys(config.oauth) as Provider[]).filter(p => !!config.oauth[p])

/** Apple's client secret is a short-lived ES256 JWT signed with your private key. */
function appleClientSecret() {
  const a = config.oauth.apple!
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const iat = Math.floor(Date.now() / 1000)
  const unsigned = `${b64({ alg: 'ES256', kid: a.keyId })}.${b64({ iss: a.teamId, iat, exp: iat + 3600, aud: 'https://appleid.apple.com', sub: a.clientId })}`
  const sig = crypto.sign('sha256', Buffer.from(unsigned), { key: a.privateKey, dsaEncoding: 'ieee-p1363' })
  return `${unsigned}.${sig.toString('base64url')}`
}

/** Reads the claims of an ID token we received directly from the provider's token endpoint over TLS. */
const idTokenClaims = (jwt: string) => JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()) as Record<string, unknown>

const providers: Record<Provider, {
  authorizeUrl: (state: string) => string
  profile: (code: string, extra: Record<string, string>) => Promise<Profile>
}> = {
  google: {
    authorizeUrl: state => `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: config.oauth.google!.clientId, redirect_uri: callbackUrl('google'), response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account',
    })}`,
    async profile(code) {
      const g = config.oauth.google!
      const token = await (await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: g.clientId, client_secret: g.clientSecret, redirect_uri: callbackUrl('google'), grant_type: 'authorization_code' }),
      })).json() as { access_token?: string }
      if (!token.access_token) throw new Error('token')
      const info = await (await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${token.access_token}` } })).json() as { sub: string; email?: string; email_verified?: boolean; name?: string }
      return { subject: info.sub, email: info.email, emailVerified: !!info.email_verified, name: info.name }
    },
  },
  facebook: {
    authorizeUrl: state => `https://www.facebook.com/v21.0/dialog/oauth?${new URLSearchParams({
      client_id: config.oauth.facebook!.clientId, redirect_uri: callbackUrl('facebook'), response_type: 'code', scope: 'email,public_profile', state,
    })}`,
    async profile(code) {
      const f = config.oauth.facebook!
      const token = await (await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?${new URLSearchParams({ client_id: f.clientId, client_secret: f.clientSecret, redirect_uri: callbackUrl('facebook'), code })}`)).json() as { access_token?: string }
      if (!token.access_token) throw new Error('token')
      const me = await (await fetch(`https://graph.facebook.com/me?${new URLSearchParams({ fields: 'id,name,email', access_token: token.access_token })}`)).json() as { id: string; name?: string; email?: string }
      // Facebook only returns an email once the person has confirmed it.
      return { subject: me.id, email: me.email, emailVerified: !!me.email, name: me.name }
    },
  },
  apple: {
    authorizeUrl: state => `https://appleid.apple.com/auth/authorize?${new URLSearchParams({
      client_id: config.oauth.apple!.clientId, redirect_uri: callbackUrl('apple'), response_type: 'code', response_mode: 'form_post', scope: 'name email', state,
    })}`,
    async profile(code, extra) {
      const token = await (await fetch('https://appleid.apple.com/auth/token', {
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: config.oauth.apple!.clientId, client_secret: appleClientSecret(), redirect_uri: callbackUrl('apple'), grant_type: 'authorization_code' }),
      })).json() as { id_token?: string }
      if (!token.id_token) throw new Error('token')
      const claims = idTokenClaims(token.id_token)
      // Apple sends the person's name only on the very first sign-in, as a form field.
      let name: string | undefined
      try { const u = JSON.parse(extra.user ?? '{}') as { name?: { firstName?: string; lastName?: string } }; name = [u.name?.firstName, u.name?.lastName].filter(Boolean).join(' ') || undefined } catch { /* no name */ }
      return { subject: String(claims.sub), email: claims.email as string | undefined, emailVerified: claims.email_verified === true || claims.email_verified === 'true', name }
    },
  },
}

/** Only same-site relative paths are allowed as a post-login destination. */
const safeNext = (n: string | undefined) => (n && n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/api') ? n : undefined)

function findOrCreateUser(provider: Provider, p: Profile): User | 'email_required' | 'email_unverified' {
  const linked = one<{ user_id: string }>('SELECT user_id FROM user_identities WHERE provider = ? AND subject = ?', provider, p.subject)
  if (linked) return one<User>('SELECT * FROM users WHERE id = ?', linked.user_id)!
  if (!p.email) return 'email_required'
  if (!p.emailVerified) return 'email_unverified'
  const email = p.email.toLowerCase()
  return tx(() => {
    let user = one<User>('SELECT * FROM users WHERE email = ?', email)
    if (!user) {
      const uid = id('usr')
      run('INSERT INTO users (id, email, name, created_at) VALUES (?,?,?,?)', uid, email, p.name?.trim() || email.split('@')[0], now())
      user = one<User>('SELECT * FROM users WHERE id = ?', uid)!
    }
    run('INSERT INTO user_identities (provider, subject, user_id, email, created_at) VALUES (?,?,?,?,?)', provider, p.subject, user.id, email, now())
    return user
  })
}

export const oauth = new Hono<Env>()

const isProvider = (p: string): p is Provider => (['google', 'facebook', 'apple'] as string[]).includes(p)
const STATE_COOKIE = 'glink_oauth'

oauth.get('/:provider/start', c => {
  const p = c.req.param('provider')
  if (!isProvider(p) || !config.oauth[p]) return c.redirect('/login?error=oauth_unavailable')
  const state = crypto.randomBytes(16).toString('base64url')
  const https = config.appUrl.startsWith('https:')
  // Apple posts the result back cross-site, which needs SameSite=None (and therefore HTTPS).
  setCookie(c, STATE_COOKIE, JSON.stringify({ state, provider: p, next: safeNext(c.req.query('next')) }), {
    httpOnly: true, path: '/api/auth/oauth', maxAge: 600, secure: https, sameSite: p === 'apple' && https ? 'None' : 'Lax',
  })
  return c.redirect(providers[p].authorizeUrl(state))
})

async function finish(c: Context<Env>, p: Provider, params: Record<string, string>) {
  const raw = getCookie(c, STATE_COOKIE)
  deleteCookie(c, STATE_COOKIE, { path: '/api/auth/oauth' })
  let saved: { state?: string; provider?: string; next?: string } = {}
  try { saved = JSON.parse(raw ?? '{}') } catch { /* treated as a mismatch */ }
  if (params.error) return c.redirect(`/login?error=${params.error === 'access_denied' || params.error === 'user_cancelled_authorize' ? 'oauth_cancelled' : 'oauth'}`)
  if (!params.code || !params.state || params.state !== saved.state || saved.provider !== p) return c.redirect('/login?error=oauth_state')
  let profile: Profile
  try { profile = await providers[p].profile(params.code, params) } catch (e) {
    console.warn(`[oauth] ${p} sign-in failed:`, e instanceof Error ? e.message : e)
    return c.redirect('/login?error=oauth')
  }
  const user = findOrCreateUser(p, profile)
  if (typeof user === 'string') return c.redirect(`/login?error=${user}&provider=${p}`)
  acceptPendingInvites(user)
  createSession(c, user.id)
  const fresh = one<User>('SELECT * FROM users WHERE id = ?', user.id)!
  const home = fresh.role && fresh.onboarded ? `/${fresh.role}` : '/onboarding'
  // A "join as creator/brand" destination only applies until onboarding is done.
  const next = saved.next && (!saved.next.startsWith('/onboarding') || !fresh.onboarded) ? saved.next : home
  return c.redirect(next)
}

oauth.get('/:provider/callback', c => {
  const p = c.req.param('provider')
  if (!isProvider(p) || !config.oauth[p]) return c.redirect('/login?error=oauth_unavailable')
  return finish(c, p, c.req.query())
})

// Apple uses response_mode=form_post, so its callback is a POST.
oauth.post('/apple/callback', async c => {
  if (!config.oauth.apple) return c.redirect('/login?error=oauth_unavailable')
  const body = await c.req.parseBody()
  return finish(c, 'apple', Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)])))
})
