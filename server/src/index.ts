import { serve } from '@hono/node-server'
import { app, init } from './app.ts'
import { config } from './config.ts'
import { enabledProviders } from './oauth.ts'
import { sweep } from './domain.ts'

init()
sweep()
setInterval(() => { try { sweep() } catch (e) { console.error('[sweep]', e) } }, 60_000)

serve({ fetch: app.fetch, port: config.port }, info => {
  console.log(`Glink API on http://localhost:${info.port}  (AI checks: ${config.anthropicEnabled ? 'on' : 'off'}, social sign-in: ${enabledProviders().join(', ') || 'none'})`)
})
