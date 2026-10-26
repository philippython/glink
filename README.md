# Glink — two-sided UGC platform

Brands write a campaign brief once; Glink matches it to creators whose proven strengths fit, checks every upload against the brief, holds the budget in escrow, pays on approval and pays bonuses automatically when an ad beats its benchmark. Creators get matched work, a clear brief, a pre-flight check before submitting, and a performance profile that learns from real results.

See **`docs/Glink-How-It-Works.pdf`** for how it works and **`docs/DEPLOYMENT.md`** (also as a PDF) for putting it online — or **`docs/RENDER.md`** for a step-by-step Render deploy using the included `render.yaml`.

## Run it

```bash
npm install
npm run dev        # API on :8787 + web app on :5173 (the web app proxies /api)
```

Open http://localhost:5173. On first start the database is seeded with demo accounts (password `demo1234`):

| Account | Role |
|---|---|
| alex@lumenskin.com | Brand owner (Lumen Skin) |
| sam@lumenskin.com | Brand reviewer — can approve, can’t spend |
| maya@example.com | Creator |
| sofia@ / priya@ / leo@example.com | Creators |

Or create a fresh account at `/signup`. Open a brand and a creator in two different browsers (or one in a private window) to watch changes arrive live.

```bash
npm test           # typecheck + 32 tests: auth, social sign-in, permissions, matching, pre-flight, payments, the full loop
npm run build      # build the web app into dist/ (npm run typecheck checks types)
npm start          # production: one server on $PORT serving dist/ and the API
```

Configuration lives in `.env` (see `.env.example`). Nothing is required locally.

| Variable | Purpose |
|---|---|
| `APP_URL` | Public URL (OAuth redirect, email links). Cookies are `Secure` when this is https. |
| `DATABASE_PATH`, `UPLOAD_DIR` | SQLite file and video storage (default `server/data/`) |
| `GOOGLE_*`, `FACEBOOK_*`, `APPLE_*` | Turn on “Continue with Google / Facebook / Apple” (callback: `$APP_URL/api/auth/oauth/<provider>/callback`) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CURRENCY` | Card top-ups (Stripe Checkout) and creator bank payouts (Stripe Connect). Webhook: `$APP_URL/api/stripe/webhook` |
| `RESEND_API_KEY`, `EMAIL_FROM` | Sends password-reset and team-invite emails through Resend |
| `ANTHROPIC_API_KEY` | Turns on the AI layer: frame-level pre-flight review and product page analysis |
| `SEED_DEMO`, `ALLOW_TEST_FUNDS` | Demo accounts and test money — on in development, off in production by default |

## Structure

```
server/src/
  index.ts       start server + background sweep (pending → available payouts, bonus-window refunds)
  app.ts         Hono app: security headers, same-origin check, errors, static hosting in production
  auth.ts        signup / login / logout / password reset, scrypt hashing, hashed session tokens
  oauth.ts       social sign-in: Google, Facebook, Apple (sign up and log in, links by verified email)
  api.ts         every endpoint, with role + team-permission checks
  matching.ts    the matching algorithm (pure functions, unit-tested)
  preflight.ts   format + script checks (pure functions, unit-tested)
  ai.ts          optional Claude review of frames + product analysis (structured outputs)
  payments.ts    Stripe: Checkout top-ups, Connect payout accounts + transfers, signed webhook
  domain.ts      campaign matching, escrow ledger, approvals, bonus engine, contests
  snapshot.ts    the role-scoped state each user receives
  events.ts      server-sent events, notifications, email (outbox + Resend)
  db.ts          SQLite (built into Node 24) + migrations
  seed.ts        demo data and starter content for new accounts
server/test/     node:test suites
src/             React app (pages under src/pages/{auth,brand,creator,shared})
src/data/store.tsx   client store: calls the API, refetches on server push
```

## What isn’t connected yet

Card payments (Stripe) and email (Resend) are built in and switch on when their keys are set. Escrow is automated — review reminders, auto-approval of clean videos, clearance and automatic payouts; see `docs/ESCROW.md`. Without them, “Add test funds” and recorded withdrawals keep working for testing, and emails go to the console and the `outbox` table (`GET /api/dev/outbox` in development). Setup steps: `docs/DEPLOYMENT.md`, section 9.

- **Ad-platform results.** Brands enter results on the Performance page; importing from Meta / TikTok ad accounts is the next integration.
- **Social verification.** Channel follower counts are self-reported until platform OAuth is added.
- **Sample screens.** Creative Genome, Experiments and Next Experiment still show sample data.
- **Scale.** SQLite and in-process realtime suit a single server. For several servers: Postgres, object storage for videos, and Redis pub/sub for events.
- **Hosting.** Glink needs a long-running Node server with a persistent disk (Render, Railway, Fly, a VM or Docker). Serverless hosts such as Netlify or Vercel can’t run it as built.
