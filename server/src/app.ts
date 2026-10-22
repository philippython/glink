import fs from 'node:fs'
import path from 'node:path'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { api } from './api.ts'
import { auth, sameOrigin, type Env } from './auth.ts'
import { config } from './config.ts'
import { enabledProviders, oauth } from './oauth.ts'
import { paymentsMode, stripeWebhook } from './payments.ts'
import { all, db, migrate } from './db.ts'
import { seedDemo } from './seed.ts'
import { HttpError } from './util.ts'

export const app = new Hono<Env>()

app.use('*', secureHeaders({ crossOriginResourcePolicy: false }))
app.use('/api/*', sameOrigin)

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message, fields: err.fields }, err.status as 400)
  console.error(err)
  return c.json({ error: 'Something went wrong on our side. Please try again.' }, 500)
})

app.get('/api/health', c => c.json({ ok: true, ai: config.anthropicEnabled, providers: enabledProviders(), demo: config.seedDemo, testFunds: config.allowTestFunds, payments: paymentsMode(), email: !!config.email }))
app.route('/api/auth/oauth', oauth)
// Stripe calls this server-to-server; it is authenticated by its signature, not a session.
app.route('/api/stripe', stripeWebhook)
app.route('/api/auth', auth)

if (!config.isProd) {
  // Development helpers: read sent emails, and reset the demo database.
  app.get('/api/dev/outbox', c => c.json(all('SELECT * FROM outbox ORDER BY created_at DESC LIMIT 20')))
  app.post('/api/dev/reset', c => {
    const tables = all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT IN ('schema_version') AND name NOT LIKE 'sqlite_%'")
    db.exec('PRAGMA foreign_keys = OFF')
    for (const t of tables) db.exec(`DELETE FROM ${t.name}`)
    db.exec('PRAGMA foreign_keys = ON')
    seedDemo()
    return c.json({ ok: true })
  })
}

app.route('/api', api)
app.all('/api/*', c => c.json({ error: 'Not found' }, 404))

// In production the server also hosts the built frontend (npm run build → dist/).
const dist = path.resolve('dist')
if (fs.existsSync(dist)) {
  app.use('/*', serveStatic({ root: './dist' }))
  app.get('*', c => c.html(fs.readFileSync(path.join(dist, 'index.html'), 'utf8')))
}

export function init() {
  migrate()
  if (config.seedDemo) seedDemo()
}
