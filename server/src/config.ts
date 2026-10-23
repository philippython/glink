import fs from 'node:fs'
import path from 'node:path'

// Load .env if present (real environment variables take precedence).
if (fs.existsSync('.env')) process.loadEnvFile('.env')

const env = process.env
const isProd = env.NODE_ENV === 'production' || process.argv.includes('--prod')

export const config = {
  port: Number(env.PORT ?? 8787),
  /** Public URL of the web app — used for OAuth redirects and links in emails. */
  appUrl: (env.APP_URL ?? 'http://localhost:5173').trim().replace(/\/+$/, ''),
  dbPath: env.DATABASE_PATH ?? path.resolve('server/data/glink.db'),
  uploadDir: env.UPLOAD_DIR ?? path.resolve('server/data/uploads'),
  maxUploadBytes: Number(env.MAX_UPLOAD_MB ?? 500) * 1024 * 1024,
  isProd,
  sessionDays: 30,
  /** Social sign-in. Each provider switches on when its keys are set. */
  oauth: {
    google: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } : null,
    facebook: env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET ? { clientId: env.FACEBOOK_APP_ID, clientSecret: env.FACEBOOK_APP_SECRET } : null,
    apple: env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY
      ? { clientId: env.APPLE_CLIENT_ID, teamId: env.APPLE_TEAM_ID, keyId: env.APPLE_KEY_ID, privateKey: env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n') } // .env stores the PEM on one line with \n
      : null,
  },
  /** When set, pre-flight and product analysis also ask Claude. Everything works without it. */
  anthropicEnabled: Boolean(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN),
  /** Demo accounts (password demo1234) are created on an empty database — on by default only in development. */
  seedDemo: env.SEED_DEMO ? env.SEED_DEMO === 'true' : !isProd,
  /** “Add test funds” and the welcome credit for new brands. Off in production unless asked for. */
  allowTestFunds: env.ALLOW_TEST_FUNDS ? env.ALLOW_TEST_FUNDS === 'true' : !isProd,
  /** Stripe: Checkout for brand top-ups, Connect transfers for creator payouts. Off until the keys are set. */
  stripe: env.STRIPE_SECRET_KEY
    ? { secretKey: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET ?? '', currency: (env.STRIPE_CURRENCY ?? 'usd').toLowerCase() }
    : null,
  /** Resend for outgoing email. Without it, email goes to the outbox table and the server log. */
  email: env.RESEND_API_KEY && env.EMAIL_FROM ? { apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM } : null,
}
