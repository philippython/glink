import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import { config } from './config.ts'

// Schema is applied as numbered migrations; each runs once, in order.
const migrations: string[] = [
  `
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    password_hash TEXT,
    google_sub TEXT UNIQUE,
    role TEXT CHECK (role IN ('brand','creator')),
    onboarded INTEGER NOT NULL DEFAULT 0,
    theme TEXT NOT NULL DEFAULT 'system',
    created_at TEXT NOT NULL
  );
  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE password_resets (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    used_at TEXT
  );
  CREATE TABLE brands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    description TEXT NOT NULL,
    target_customers TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );
  CREATE TABLE brand_members (
    brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL COLLATE NOCASE,
    role TEXT NOT NULL CHECK (role IN ('Owner','Manager','Reviewer')),
    pending INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    PRIMARY KEY (brand_id, email)
  );
  CREATE TABLE creator_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    handle TEXT NOT NULL,
    country TEXT NOT NULL,
    niches TEXT NOT NULL DEFAULT '[]',
    bio TEXT NOT NULL DEFAULT '',
    base_rate INTEGER NOT NULL DEFAULT 30000,
    availability TEXT NOT NULL DEFAULT 'Available',
    styles TEXT NOT NULL DEFAULT '[]',
    prior_strengths TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE social_channels (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    handle TEXT NOT NULL,
    followers INTEGER NOT NULL DEFAULT 0,
    verified INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE campaigns (
    id TEXT PRIMARY KEY,
    brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    product TEXT NOT NULL,
    category TEXT NOT NULL,
    goal TEXT NOT NULL,
    market TEXT NOT NULL,
    target_customers TEXT NOT NULL,
    creative_angle TEXT NOT NULL,
    suggested_opening TEXT NOT NULL,
    story_flow TEXT NOT NULL,
    must_include TEXT NOT NULL,
    avoid TEXT NOT NULL,
    deliverables TEXT NOT NULL,
    base_fee INTEGER NOT NULL,
    bonus_amount INTEGER NOT NULL,
    bonus_rule TEXT NOT NULL,
    benchmark_ctr REAL NOT NULL DEFAULT 1.8,
    creators_wanted INTEGER NOT NULL,
    sourcing TEXT NOT NULL CHECK (sourcing IN ('auto','handpick','contest')),
    prizes TEXT NOT NULL DEFAULT '[]',
    timeline TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft','live','completed')),
    created_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL
  );
  CREATE TABLE matches (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    creator_id TEXT NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    reasons TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL CHECK (status IN ('suggested','invited','accepted','declined')),
    invited_at TEXT,
    responded_at TEXT,
    UNIQUE (campaign_id, creator_id)
  );
  CREATE TABLE submissions (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    creator_id TEXT NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    idx INTEGER NOT NULL,
    file_path TEXT,
    file_name TEXT,
    mime TEXT,
    size_bytes INTEGER,
    duration REAL,
    width INTEGER,
    height INTEGER,
    script TEXT,
    preflight TEXT NOT NULL DEFAULT '[]',
    brief_match INTEGER,
    ai_feedback TEXT,
    status TEXT NOT NULL,
    review_note TEXT,
    reviewed_by TEXT REFERENCES users(id),
    submitted_at TEXT,
    approved_at TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    winning INTEGER NOT NULL DEFAULT 0,
    placement INTEGER,
    metrics TEXT,
    UNIQUE (match_id, idx)
  );
  CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    submission_id TEXT REFERENCES submissions(id) ON DELETE SET NULL,
    kind TEXT NOT NULL CHECK (kind IN ('base','bonus','prize')),
    amount INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending','available','paid_out')),
    available_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  -- Brand wallet ledger: balance = SUM(amount). Holds are negative, top-ups and refunds positive.
  CREATE TABLE ledger (
    id TEXT PRIMARY KEY,
    brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
    kind TEXT NOT NULL CHECK (kind IN ('topup','hold','refund')),
    amount INTEGER NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE TABLE payouts (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT NOT NULL,
    read_at TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE outbox (
    id TEXT PRIMARY KEY,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX idx_matches_creator ON matches(creator_id);
  CREATE INDEX idx_submissions_campaign ON submissions(campaign_id);
  CREATE INDEX idx_payments_creator ON payments(creator_id);
  CREATE INDEX idx_notifications_user ON notifications(user_id, created_at);
  `,
  // 2: one table for every social sign-in provider (Google, Facebook, Apple…).
  `
  CREATE TABLE user_identities (
    provider TEXT NOT NULL,
    subject TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email TEXT,
    created_at TEXT NOT NULL,
    PRIMARY KEY (provider, subject)
  );
  CREATE INDEX idx_identities_user ON user_identities(user_id);
  INSERT INTO user_identities (provider, subject, user_id, email, created_at)
    SELECT 'google', google_sub, id, email, created_at FROM users WHERE google_sub IS NOT NULL;
  `,
  // 3 — Stripe payments and email delivery
  `
  ALTER TABLE creator_profiles ADD COLUMN stripe_account_id TEXT;
  ALTER TABLE creator_profiles ADD COLUMN payouts_enabled INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE payouts ADD COLUMN stripe_transfer_id TEXT;
  -- A Stripe Checkout session credits the wallet once, however many times its webhook arrives.
  ALTER TABLE ledger ADD COLUMN external_id TEXT;
  CREATE UNIQUE INDEX idx_ledger_external ON ledger(external_id) WHERE external_id IS NOT NULL;
  CREATE TABLE stripe_events (id TEXT PRIMARY KEY, type TEXT NOT NULL, created_at TEXT NOT NULL);
  ALTER TABLE outbox ADD COLUMN sent_at TEXT;
  ALTER TABLE outbox ADD COLUMN error TEXT;
  `,
]

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true })
export const db = new DatabaseSync(config.dbPath)
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')

export function migrate(database: DatabaseSync = db) {
  database.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)')
  const row = database.prepare('SELECT version FROM schema_version').get() as { version: number } | undefined
  let version = row?.version ?? 0
  if (!row) database.prepare('INSERT INTO schema_version (version) VALUES (0)').run()
  for (; version < migrations.length; version++) {
    database.exec('BEGIN')
    try {
      database.exec(migrations[version])
      database.prepare('UPDATE schema_version SET version = ?').run(version + 1)
      database.exec('COMMIT')
    } catch (e) {
      database.exec('ROLLBACK')
      throw e
    }
  }
}

type Params = SQLInputValue[]
export const one = <T>(sql: string, ...p: Params) => db.prepare(sql).get(...p) as T | undefined
export const all = <T>(sql: string, ...p: Params) => db.prepare(sql).all(...p) as T[]
export const run = (sql: string, ...p: Params) => db.prepare(sql).run(...p)

let depth = 0
/** Runs fn inside a transaction (nested calls join the outer one); rolls back on any thrown error. */
export function tx<T>(fn: () => T): T {
  if (depth > 0) return fn()
  depth++
  db.exec('BEGIN')
  try {
    const r = fn()
    db.exec('COMMIT')
    return r
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  } finally {
    depth--
  }
}

export const j = <T>(s: string | null | undefined, fallback: T): T => {
  if (!s) return fallback
  try { return JSON.parse(s) as T } catch { return fallback }
}
