import { serve } from '@hono/node-server'
import { app, init } from './app.ts'
import { config } from './config.ts'
import { enabledProviders } from './oauth.ts'
import { sweep } from './domain.ts'
import { runAutoPayouts } from './payments.ts'

init()
sweep()
// Every minute: release cleared earnings, run review reminders and auto-approval, then pay creators automatically.
setInterval(() => {
  try { sweep() } catch (e) { console.error('[sweep]', e) }
  void runAutoPayouts().catch(e => console.error('[auto-payout]', e))
}, 60_000)

serve({ fetch: app.fetch, port: config.port }, info => {
  console.log(`Glink API on http://localhost:${info.port}  (AI checks: ${config.anthropicEnabled ? 'on' : 'off'}, social sign-in: ${enabledProviders().join(', ') || 'none'})`)
})
