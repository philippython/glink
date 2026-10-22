import crypto from 'node:crypto'
import { Hono, type Context, type MiddlewareHandler } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { z } from 'zod'
import { config } from './config.ts'
import { one, run } from './db.ts'
import { sendEmail } from './events.ts'
import { enabledProviders } from './oauth.ts'
import { HttpError, id, now, parse, sha256 } from './util.ts'

export interface User { id: string; email: string; name: string; role: 'brand' | 'creator' | null; onboarded: number; theme: string; password_hash: string | null }
export type Env = { Variables: { user: User } }

const COOKIE = 'glink_session'

// ─── Passwords (scrypt, per-user salt, constant-time compare) ──────────────

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })
  return `scrypt$16384$${salt.toString('base64')}$${hash.toString('base64')}`
}

export function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false
  const [algo, n, salt, hash] = stored.split('$')
  if (algo !== 'scrypt') return false
  const expected = Buffer.from(hash, 'base64')
  const actual = crypto.scryptSync(password, Buffer.from(salt, 'base64'), expected.length, { N: Number(n), r: 8, p: 1 })
  return crypto.timingSafeEqual(expected, actual)
}

// ─── Sessions (random token in an HttpOnly cookie, only its hash stored) ───

export function createSession(c: Context, userId: string) {
  const token = crypto.randomBytes(32).toString('base64url')
  const expires = new Date(Date.now() + config.sessionDays * 86400_000)
  run('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?,?,?,?)', sha256(token), userId, expires.toISOString(), now())
  setCookie(c, COOKIE, token, { httpOnly: true, sameSite: 'Lax', secure: config.appUrl.startsWith('https:'), path: '/', expires })
}

export function currentUser(c: Context): User | null {
  const token = getCookie(c, COOKIE)
  if (!token) return null
  const row = one<User & { expires_at: string }>(
    'SELECT u.*, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?', sha256(token))
  if (!row || row.expires_at < now()) return null
  return row
}

export const requireUser: MiddlewareHandler<Env> = async (c, next) => {
  const user = currentUser(c)
  if (!user) throw new HttpError(401, 'Please log in to continue.')
  c.set('user', user)
  await next()
}

/** Blocks cross-site form posts: mutating requests must come from our own origin. */
export const sameOrigin: MiddlewareHandler = async (c, next) => {
  // Apple's sign-in result is posted to us from appleid.apple.com; the state cookie protects it instead.
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method) && c.req.path !== '/api/auth/oauth/apple/callback') {
    const origin = c.req.header('origin')
    // In development Vite may land on any free port, so any local origin is fine; production only trusts APP_URL.
    const ok = !origin || origin === config.appUrl || (!config.isProd && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
    if (!ok) throw new HttpError(403, 'Cross-site request blocked.')
  }
  await next()
}

// ─── Rate limiting (per IP + email, in memory) ─────────────────────────────

const attempts = new Map<string, { n: number; reset: number }>()
function limit(key: string, max = 10, windowMs = 15 * 60_000) {
  const t = Date.now()
  const a = attempts.get(key)
  if (!a || a.reset < t) { attempts.set(key, { n: 1, reset: t + windowMs }); return }
  if (++a.n > max) throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.')
}
const ip = (c: Context) => c.req.header('x-forwarded-for')?.split(',')[0].trim() ?? 'local'

// ─── Helpers ────────────────────────────────────────────────────────────────

export const publicUser = (u: User) => ({ id: u.id, email: u.email, name: u.name, role: u.role, onboarded: !!u.onboarded, theme: u.theme, hasPassword: !!u.password_hash })

/** If someone was invited to a brand team with this email, join them to it. */
export function acceptPendingInvites(user: User) {
  const invite = one<{ brand_id: string }>('SELECT brand_id FROM brand_members WHERE email = ? AND pending = 1', user.email)
  if (!invite) return
  run('UPDATE brand_members SET user_id = ?, pending = 0 WHERE brand_id = ? AND email = ?', user.id, invite.brand_id, user.email)
  run("UPDATE users SET role = 'brand', onboarded = 1 WHERE id = ?", user.id)
}

const Email = z.string().trim().toLowerCase().email('Enter a valid email address.')
const Password = z.string().min(8, 'Use at least 8 characters.').max(200)

// ─── Routes ─────────────────────────────────────────────────────────────────

export const auth = new Hono<Env>()

auth.get('/config', c => c.json({ providers: enabledProviders() }))

auth.post('/signup', async c => {
  const body = parse(z.object({ name: z.string().trim().min(1, 'Enter your name.').max(80), email: Email, password: Password }), await c.req.json())
  limit(`signup:${ip(c)}`, 20)
  if (one('SELECT 1 FROM users WHERE email = ?', body.email)) throw new HttpError(409, 'An account with this email already exists.', { email: 'An account with this email already exists. Log in instead.' })
  const userId = id('usr')
  run('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?,?,?,?,?)', userId, body.email, body.name, hashPassword(body.password), now())
  const user = one<User>('SELECT * FROM users WHERE id = ?', userId)!
  acceptPendingInvites(user)
  createSession(c, userId)
  return c.json({ user: publicUser(one<User>('SELECT * FROM users WHERE id = ?', userId)!) })
})

auth.post('/login', async c => {
  const body = parse(z.object({ email: Email, password: z.string().min(1, 'Enter your password.') }), await c.req.json())
  limit(`login:${ip(c)}:${body.email}`)
  const user = one<User>('SELECT * FROM users WHERE email = ?', body.email)
  if (!user || !verifyPassword(body.password, user.password_hash)) {
    throw new HttpError(401, 'That email and password don’t match.', { password: 'That email and password don’t match.' })
  }
  acceptPendingInvites(user)
  createSession(c, user.id)
  return c.json({ user: publicUser(one<User>('SELECT * FROM users WHERE id = ?', user.id)!) })
})

auth.post('/logout', c => {
  const token = getCookie(c, COOKIE)
  if (token) run('DELETE FROM sessions WHERE token_hash = ?', sha256(token))
  deleteCookie(c, COOKIE, { path: '/' })
  return c.json({ ok: true })
})

auth.get('/me', c => {
  const user = currentUser(c)
  return c.json({ user: user ? publicUser(user) : null })
})

auth.post('/forgot', async c => {
  const { email } = parse(z.object({ email: Email }), await c.req.json())
  limit(`forgot:${ip(c)}`, 5)
  const user = one<User>('SELECT * FROM users WHERE email = ?', email)
  if (user) {
    const token = crypto.randomBytes(32).toString('base64url')
    run('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?,?,?)', sha256(token), user.id, new Date(Date.now() + 3600_000).toISOString())
    sendEmail(email, 'Reset your Glink password', `Open this link within an hour to choose a new password:\n${config.appUrl}/reset-password?token=${token}`)
  }
  // Same answer either way, so the endpoint can't be used to discover accounts.
  return c.json({ ok: true })
})

auth.post('/reset', async c => {
  const body = parse(z.object({ token: z.string().min(10), password: Password }), await c.req.json())
  const row = one<{ user_id: string; expires_at: string; used_at: string | null }>('SELECT * FROM password_resets WHERE token_hash = ?', sha256(body.token))
  if (!row || row.used_at || row.expires_at < now()) throw new HttpError(400, 'This reset link has expired. Request a new one.')
  run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(body.password), row.user_id)
  run('UPDATE password_resets SET used_at = ? WHERE token_hash = ?', now(), sha256(body.token))
  run('DELETE FROM sessions WHERE user_id = ?', row.user_id) // sign out everywhere
  createSession(c, row.user_id)
  return c.json({ ok: true })
})

auth.post('/password', requireUser, async c => {
  const body = parse(z.object({ current: z.string().optional(), password: Password }), await c.req.json())
  const user = c.get('user')
  if (user.password_hash && !verifyPassword(body.current ?? '', user.password_hash)) throw new HttpError(400, 'Your current password is incorrect.', { current: 'Your current password is incorrect.' })
  run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(body.password), user.id)
  return c.json({ ok: true })
})
