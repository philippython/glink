// Realtime: one Server-Sent Events stream per signed-in tab. Any change that
// affects a user sends them a "changed" event; the client refetches its state.

import { config } from './config.ts'
import { all, run } from './db.ts'
import { id, now } from './util.ts'

type Listener = (event: string, data: unknown) => void
const listeners = new Map<string, Set<Listener>>()

export function subscribe(userId: string, fn: Listener) {
  if (!listeners.has(userId)) listeners.set(userId, new Set())
  listeners.get(userId)!.add(fn)
  return () => { listeners.get(userId)?.delete(fn) }
}

export function emit(userIds: Iterable<string>, event = 'changed', data: unknown = {}) {
  for (const u of new Set(userIds)) for (const fn of listeners.get(u) ?? []) fn(event, data)
}

/** Everyone who should see changes to a brand's data (members) plus extra users. */
export const brandUsers = (brandId: string) =>
  all<{ user_id: string }>('SELECT user_id FROM brand_members WHERE brand_id = ? AND user_id IS NOT NULL AND pending = 0', brandId).map(r => r.user_id)

export const creatorUser = (creatorId: string) =>
  all<{ user_id: string }>('SELECT user_id FROM creator_profiles WHERE id = ?', creatorId).map(r => r.user_id)

export function notify(userIds: string[], n: { title: string; body: string; link: string }) {
  for (const u of new Set(userIds)) {
    run('INSERT INTO notifications (id, user_id, title, body, link, created_at) VALUES (?,?,?,?,?,?)', id('ntf'), u, n.title, n.body, n.link, now())
  }
  emit(userIds, 'notification', n)
}

/**
 * Every email is kept in the outbox. With Resend configured it is also sent (in the background,
 * so a slow email service never holds up the request); otherwise it is printed to the server log.
 */
export function sendEmail(to: string, subject: string, body: string) {
  const mailId = id('mail')
  run('INSERT INTO outbox (id, to_email, subject, body, created_at) VALUES (?,?,?,?,?)', mailId, to, subject, body, now())
  if (!config.email) {
    console.log(`\n✉  Email to ${to}\n   ${subject}\n   ${body.replace(/\n/g, '\n   ')}\n`)
    return Promise.resolve()
  }
  return deliver(config.email, to, subject, body)
    .then(() => { run('UPDATE outbox SET sent_at = ? WHERE id = ?', now(), mailId) })
    .catch((e: Error) => {
      run('UPDATE outbox SET error = ? WHERE id = ?', e.message.slice(0, 500), mailId)
      console.error(`Email to ${to} failed: ${e.message}`)
    })
}

async function deliver(email: { apiKey: string; from: string }, to: string, subject: string, text: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${email.apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: email.from, to: [to], subject, text }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`)
}
