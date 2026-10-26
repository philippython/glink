import { all, j, one, run, tx } from './db.ts'
import { brandUsers, creatorUser, emit, notify } from './events.ts'
import { rankCreators, selectInvites, type CampaignInput, type CreatorInput, type HistoryItem, type Strengths } from './matching.ts'
import { config } from './config.ts'
import { BONUS_METRICS, describeBonus, type BonusMetric } from './taxonomy.ts'
import { addDays, HttpError, id, now } from './util.ts'

// ─── Row types ──────────────────────────────────────────────────────────────

export interface CampaignRow {
  id: string; brand_id: string; name: string; product: string; category: string; goal: CampaignInput['goal']; market: string
  target_customers: string; creative_angle: string; suggested_opening: string; story_flow: string; must_include: string; avoid: string
  deliverables: string; base_fee: number; bonus_amount: number; bonus_rule: string; benchmark_ctr: number; creators_wanted: number
  bonus_metric: BonusMetric; bonus_threshold: number | null; bonus_window_days: number
  sourcing: 'auto' | 'handpick' | 'contest'; prizes: string; timeline: string; status: 'draft' | 'live' | 'completed'; created_at: string
}
export interface SubmissionRow {
  id: string; match_id: string; campaign_id: string; creator_id: string; idx: number; file_path: string | null; file_name: string | null
  mime: string | null; size_bytes: number | null; duration: number | null; width: number | null; height: number | null; script: string | null
  preflight: string; brief_match: number | null; ai_feedback: string | null; status: string; review_note: string | null
  submitted_at: string | null; approved_at: string | null; attempts: number; winning: number; placement: number | null; metrics: string | null
  reminded_at: string | null; escalated_at: string | null; auto_approved: number
}
export interface Metrics { impressions: number; thumbstop: number; holdRate: number; clicks: number; conversions: number; spend: number; recordedAt: string }

export const deliverablesOf = (c: CampaignRow) => j<{ count: number; aspectRatio: string; minSec: number; maxSec: number; rawFootage: boolean }>(c.deliverables, { count: 1, aspectRatio: '9:16', minSec: 15, maxSec: 30, rawFootage: false })
export const timelineOf = (c: CampaignRow) => j<{ label: string; date: string; deadline?: boolean }[]>(c.timeline, [])
export const deadlineOf = (c: CampaignRow) => (timelineOf(c).find(m => m.deadline) ?? timelineOf(c).at(-1))?.date ?? c.created_at.slice(0, 10)
export const prizesOf = (c: CampaignRow) => j<number[]>(c.prizes, [])

/** Budget reserved from the wallet when a campaign launches (cents). */
export const budgetOf = (c: CampaignRow) => c.sourcing === 'contest'
  ? prizesOf(c).reduce((a, b) => a + b, 0)
  : (c.base_fee + c.bonus_amount) * deliverablesOf(c).count * c.creators_wanted

// ─── Matching inputs from the database ─────────────────────────────────────

export function creatorHistory(creatorId: string): HistoryItem[] {
  const rows = all<SubmissionRow & { category: string; brand_id: string; timeline: string }>(
    `SELECT s.*, c.category, c.brand_id, c.timeline FROM submissions s JOIN campaigns c ON c.id = s.campaign_id
     WHERE s.creator_id = ? AND s.status IN ('approved','paid','winner','submitted','changes_requested','rejected')`, creatorId)
  return rows.map(r => {
    const dl = (j<{ date: string; deadline?: boolean }[]>(r.timeline, []).find(m => m.deadline))?.date
    const m = j<Metrics | null>(r.metrics, null)
    return {
      category: r.category, brandId: r.brand_id, approved: ['approved', 'paid', 'winner'].includes(r.status),
      onTime: !dl || !r.submitted_at || r.submitted_at.slice(0, 10) <= dl,
      thumbstop: m?.thumbstop, holdRate: m?.holdRate,
      ctr: m && m.impressions ? (m.clicks / m.impressions) * 100 : undefined,
      cvr: m && m.clicks ? (m.conversions / m.clicks) * 100 : undefined,
    }
  })
}

interface ProfileRow { id: string; niches: string; styles: string; country: string; base_rate: number; availability: CreatorInput['availability']; prior_strengths: string }

export function creatorInputs(): CreatorInput[] {
  const profiles = all<ProfileRow>('SELECT * FROM creator_profiles')
  return profiles.map(p => ({
    id: p.id, niches: j(p.niches, []), styles: j(p.styles, []), country: p.country, baseRate: p.base_rate, availability: p.availability,
    prior: j<Strengths>(p.prior_strengths, { hook: 60, retention: 60, conversion: 60, reliability: 80 }),
    history: creatorHistory(p.id),
    activeJobs: one<{ n: number }>(`SELECT COUNT(*) n FROM submissions WHERE creator_id = ? AND status IN ('not_started','in_progress','changes_requested')`, p.id)!.n,
  }))
}

export const campaignInput = (c: CampaignRow): CampaignInput => ({ brandId: c.brand_id, category: c.category, goal: c.goal, market: c.market, creativeAngle: c.creative_angle, baseFee: c.base_fee })

/** Scores every creator for a campaign and stores the results. Auto-match campaigns also send invites. */
export function matchCampaign(campaignId: string) {
  const camp = one<CampaignRow>('SELECT * FROM campaigns WHERE id = ?', campaignId)!
  if (camp.sourcing === 'contest') return
  const ranked = rankCreators(creatorInputs(), campaignInput(camp))
  const existing = new Map(all<{ creator_id: string; status: string }>('SELECT creator_id, status FROM matches WHERE campaign_id = ?', campaignId).map(m => [m.creator_id, m.status]))
  tx(() => {
    for (const r of ranked) {
      if (existing.has(r.creatorId)) run('UPDATE matches SET score = ?, reasons = ? WHERE campaign_id = ? AND creator_id = ?', r.score, JSON.stringify(r.reasons), campaignId, r.creatorId)
      else run('INSERT INTO matches (id, campaign_id, creator_id, score, reasons, status) VALUES (?,?,?,?,?,?)', id('mch'), campaignId, r.creatorId, r.score, JSON.stringify(r.reasons), 'suggested')
    }
  })
  if (camp.sourcing === 'auto') refillInvites(campaignId)
}

/** Keeps an auto-match campaign at its target: invites the next best creator when someone declines. */
export function refillInvites(campaignId: string) {
  const camp = one<CampaignRow>('SELECT * FROM campaigns WHERE id = ?', campaignId)!
  if (camp.sourcing !== 'auto' || camp.status !== 'live') return
  const active = one<{ n: number }>(`SELECT COUNT(*) n FROM matches WHERE campaign_id = ? AND status IN ('invited','accepted')`, campaignId)!.n
  const need = camp.creators_wanted - active
  if (need <= 0) return
  const taken = new Set(all<{ creator_id: string }>(`SELECT creator_id FROM matches WHERE campaign_id = ? AND status != 'suggested'`, campaignId).map(r => r.creator_id))
  const ranked = rankCreators(creatorInputs(), campaignInput(camp))
  for (const r of selectInvites(ranked, need, taken)) inviteCreator(campaignId, r.creatorId)
}

export function inviteCreator(campaignId: string, creatorId: string) {
  const camp = one<CampaignRow>('SELECT * FROM campaigns WHERE id = ?', campaignId)!
  const m = one<{ id: string; status: string; score: number }>('SELECT id, status, score FROM matches WHERE campaign_id = ? AND creator_id = ?', campaignId, creatorId)
  if (m && m.status !== 'suggested') return
  if (!m) {
    const r = rankCreators(creatorInputs().filter(c => c.id === creatorId), campaignInput(camp))[0]
    run('INSERT INTO matches (id, campaign_id, creator_id, score, reasons, status, invited_at) VALUES (?,?,?,?,?,?,?)', id('mch'), campaignId, creatorId, r.score, JSON.stringify(r.reasons), 'invited', now())
  } else {
    run("UPDATE matches SET status = 'invited', invited_at = ? WHERE id = ?", now(), m.id)
  }
  const brand = one<{ name: string }>('SELECT name FROM brands WHERE id = ?', camp.brand_id)!
  const score = one<{ score: number }>('SELECT score FROM matches WHERE campaign_id = ? AND creator_id = ?', campaignId, creatorId)!.score
  notify(creatorUser(creatorId), { title: `New campaign match: ${brand.name}`, body: `${camp.name} · ${score}% match · $${camp.base_fee / 100} + $${camp.bonus_amount / 100} bonus`, link: `/creator/opportunities/${campaignId}` })
  emit(brandUsers(camp.brand_id))
}

// ─── Wallet ledger ──────────────────────────────────────────────────────────

export const walletBalance = (brandId: string) => one<{ b: number | null }>('SELECT SUM(amount) b FROM ledger WHERE brand_id = ?', brandId)!.b ?? 0

export function ledgerEntry(brandId: string, kind: 'topup' | 'hold' | 'refund', amount: number, note: string, campaignId?: string) {
  run('INSERT INTO ledger (id, brand_id, campaign_id, kind, amount, note, created_at) VALUES (?,?,?,?,?,?,?)', id('led'), brandId, campaignId ?? null, kind, amount, note, now())
}

/** Credits a top-up paid through a provider. Returns false if that payment was already credited. */
export function creditTopUp(brandId: string, amount: number, note: string, externalId: string) {
  const r = run('INSERT OR IGNORE INTO ledger (id, brand_id, campaign_id, kind, amount, note, created_at, external_id) VALUES (?,?,NULL,?,?,?,?,?)',
    id('led'), brandId, 'topup', amount, note, now(), externalId)
  return Number(r.changes) > 0
}

/** Escrow still held for a campaign = its holds minus what has been paid or refunded. */
export function escrowHeld(campaignId: string) {
  const held = -(one<{ s: number | null }>(`SELECT SUM(amount) s FROM ledger WHERE campaign_id = ? AND kind IN ('hold','refund')`, campaignId)!.s ?? 0)
  const paid = one<{ s: number | null }>('SELECT SUM(amount) s FROM payments WHERE campaign_id = ?', campaignId)!.s ?? 0
  return Math.max(0, held - paid)
}

/** Pays a creator out of a campaign's escrow. Returns false if escrow can't cover it. */
function pay(camp: CampaignRow, creatorId: string, submissionId: string | null, kind: 'base' | 'bonus' | 'prize', amount: number) {
  if (amount <= 0) return true
  if (escrowHeld(camp.id) < amount) {
    // Top up the hold from the wallet if possible (e.g. extra invites beyond the original budget).
    if (walletBalance(camp.brand_id) < amount) return false
    ledgerEntry(camp.brand_id, 'hold', -amount, `Additional escrow for ${camp.name}`, camp.id)
  }
  run('INSERT INTO payments (id, creator_id, brand_id, campaign_id, submission_id, kind, amount, status, available_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    id('pay'), creatorId, camp.brand_id, camp.id, submissionId, kind, amount, 'pending', addDays(now(), 3), now())
  return true
}

// ─── Reviews, bonuses, contests ─────────────────────────────────────────────

export function approve(sub: SubmissionRow, camp: CampaignRow, reviewerId: string | null, note: string) {
  tx(() => {
    if (!pay(camp, sub.creator_id, sub.id, 'base', camp.base_fee)) throw new HttpError(402, 'Not enough funds in escrow or your wallet to pay this creator. Top up in Billing.')
    run("UPDATE submissions SET status = 'approved', approved_at = ?, review_note = ?, reviewed_by = ? WHERE id = ?", now(), note || null, reviewerId, sub.id)
  })
  notify(creatorUser(sub.creator_id), { title: 'Video approved', body: `${camp.name}, video ${sub.idx} · $${camp.base_fee / 100} moves to pending earnings`, link: '/creator/earnings' })
  maybeCompleteCampaign(camp.id)
}

/** The value of a campaign's bonus metric for one set of results. */
export function metricValue(metric: BonusMetric, m: Omit<Metrics, 'recordedAt'>) {
  switch (metric) {
    case 'ctr': return m.impressions ? (m.clicks / m.impressions) * 100 : 0
    case 'cvr': return m.clicks ? (m.conversions / m.clicks) * 100 : 0
    case 'hook': return m.thumbstop
    case 'hold': return m.holdRate
    case 'cpa': return m.conversions ? m.spend / m.conversions : Infinity
  }
}

export const bonusThreshold = (camp: CampaignRow) => camp.bonus_threshold ?? camp.benchmark_ctr
const windowMs = (camp: CampaignRow) => (camp.bonus_window_days || 14) * 86400_000

/** Does a result beat the campaign's bonus rule? (Cost per result wins by coming in under the threshold.) */
export function beatsRule(camp: CampaignRow, value: number) {
  const t = bonusThreshold(camp)
  return BONUS_METRICS[camp.bonus_metric ?? 'ctr'].better === 'lower' ? value > 0 && value < t : value > t
}

const fmtMetric = (metric: BonusMetric, v: number) => BONUS_METRICS[metric].unit === '$' ? `$${v.toFixed(2)}` : `${v.toFixed(2)}%`

/**
 * Records ad results for an approved creative and evaluates the campaign's bonus rule
 * (metric, threshold and window chosen by the brand). A winning creative's bonus is paid automatically.
 */
export function recordMetrics(sub: SubmissionRow, camp: CampaignRow, input: Omit<Metrics, 'recordedAt'>) {
  const metrics: Metrics = { ...input, recordedAt: now() }
  run('UPDATE submissions SET metrics = ? WHERE id = ?', JSON.stringify(metrics), sub.id)
  const metric = camp.bonus_metric ?? 'ctr'
  const ctr = metricValue('ctr', metrics)
  const value = metricValue(metric, metrics)
  const withinWindow = !!sub.approved_at && Date.now() - new Date(sub.approved_at).getTime() <= windowMs(camp)
  const wins = withinWindow && beatsRule(camp, value)
  let bonusPaid = false
  if (!sub.winning && wins) {
    tx(() => {
      run('UPDATE submissions SET winning = 1 WHERE id = ?', sub.id)
      bonusPaid = pay(camp, sub.creator_id, sub.id, 'bonus', camp.bonus_amount)
    })
    const rule = describeBonus(metric, bonusThreshold(camp), camp.bonus_window_days || 14)
    notify(creatorUser(sub.creator_id), { title: camp.bonus_amount ? `Bonus earned: $${camp.bonus_amount / 100}` : 'Your video is winning', body: `${camp.name}: ${fmtMetric(metric, value)} met the rule “${rule}”.`, link: '/creator/earnings' })
    notify(brandUsers(camp.brand_id), { title: 'A creative is winning', body: `${camp.name}, video ${sub.idx}: ${BONUS_METRICS[metric].label} ${fmtMetric(metric, value)} (rule: ${rule}).`, link: '/brand/performance' })
  }
  emit([...brandUsers(camp.brand_id), ...creatorUser(sub.creator_id)])
  return { ctr, value, winning: !!sub.winning || wins, bonusPaid }
}

export function pickWinner(sub: SubmissionRow, camp: CampaignRow, place: number) {
  const prizes = prizesOf(camp)
  if (place < 1 || place > prizes.length) throw new HttpError(400, 'That prize place doesn’t exist.')
  if (one('SELECT 1 FROM submissions WHERE campaign_id = ? AND placement = ?', camp.id, place)) throw new HttpError(409, `You’ve already picked a ${ordinal(place)} place winner.`)
  const deadline = deadlineOf(camp)
  if (new Date().toISOString().slice(0, 10) <= deadline) throw new HttpError(400, `Winners can be picked after submissions close on ${deadline}.`)
  tx(() => {
    if (!pay(camp, sub.creator_id, sub.id, 'prize', prizes[place - 1])) throw new HttpError(402, 'Not enough funds to pay this prize.')
    run("UPDATE submissions SET status = 'approved', placement = ?, approved_at = ? WHERE id = ?", place, now(), sub.id)
  })
  notify(creatorUser(sub.creator_id), { title: `You placed ${ordinal(place)}!`, body: `${camp.name} · $${prizes[place - 1] / 100} prize`, link: '/creator/earnings' })
  maybeCompleteCampaign(camp.id)
}

const ordinal = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`

/** A campaign completes when every accepted deliverable is decided; unused escrow returns to the wallet. */
export function maybeCompleteCampaign(campaignId: string) {
  const camp = one<CampaignRow>('SELECT * FROM campaigns WHERE id = ?', campaignId)!
  if (camp.status !== 'live') return
  const open = one<{ n: number }>(`SELECT COUNT(*) n FROM submissions WHERE campaign_id = ? AND status NOT IN ('approved','paid','rejected')`, campaignId)!.n
  const accepted = one<{ n: number }>(`SELECT COUNT(*) n FROM matches WHERE campaign_id = ? AND status = 'accepted'`, campaignId)!.n
  const contestDone = camp.sourcing === 'contest' && one<{ n: number }>('SELECT COUNT(*) n FROM submissions WHERE campaign_id = ? AND placement IS NOT NULL', campaignId)!.n >= prizesOf(camp).length
  const directDone = camp.sourcing !== 'contest' && accepted >= camp.creators_wanted && open === 0
  if (!contestDone && !directDone) return
  run("UPDATE campaigns SET status = 'completed' WHERE id = ?", campaignId)
  // Keep the bonus share in escrow until the bonus window closes; release the rest now.
  const bonusReserve = camp.sourcing === 'contest' ? 0 : one<{ n: number }>(`SELECT COUNT(*) n FROM submissions WHERE campaign_id = ? AND status IN ('approved','paid') AND winning = 0`, campaignId)!.n * camp.bonus_amount
  const leftover = escrowHeld(campaignId) - bonusReserve
  if (leftover > 0) ledgerEntry(camp.brand_id, 'refund', leftover, `Unused budget from ${camp.name}`, campaignId)
  notify(brandUsers(camp.brand_id), { title: 'Campaign completed', body: `${camp.name}${leftover > 0 ? ` · $${(leftover / 100).toLocaleString()} returned to your wallet` : ''}`, link: '/brand/campaigns' })
}

// ─── Background sweeps (run every minute and on startup) ───────────────────

export function sweep() {
  const ready = all<{ id: string; creator_id: string }>("SELECT id, creator_id FROM payments WHERE status = 'pending' AND available_at <= ?", now())
  if (ready.length) {
    run("UPDATE payments SET status = 'available' WHERE status = 'pending' AND available_at <= ?", now())
    for (const p of ready) emit(creatorUser(p.creator_id))
  }
  // Bonus window closed: release the remaining bonus reserve of completed campaigns.
  for (const c of all<CampaignRow>("SELECT * FROM campaigns WHERE status = 'completed' AND sourcing != 'contest'")) {
    const lastApproval = one<{ a: string | null }>('SELECT MAX(approved_at) a FROM submissions WHERE campaign_id = ?', c.id)!.a
    if (lastApproval && Date.now() - new Date(lastApproval).getTime() > windowMs(c)) {
      const left = escrowHeld(c.id)
      if (left > 0) ledgerEntry(c.brand_id, 'refund', left, `Unclaimed bonuses from ${c.name}`, c.id)
    }
  }
  reviewAutomation()
}

// ─── Escrow automation: reminders and auto-approval ────────────────────────

const hasFailedChecks = (s: SubmissionRow) => j<{ status: string }[]>(s.preflight, []).some(i => i.status === 'fail')
const ageDays = (iso: string) => (Date.now() - new Date(iso).getTime()) / 86400_000

/**
 * Keeps money moving when a brand goes quiet:
 *  - after REVIEW_REMINDER_DAYS, the brand is reminded once;
 *  - after AUTO_APPROVE_DAYS, a video that passed every pre-flight check is approved automatically and the creator paid;
 *    one with failed checks is never auto-approved — the brand is told it needs a decision instead.
 */
export function reviewAutomation() {
  const { reviewReminderDays, autoApproveDays } = config.automation
  for (const s of all<SubmissionRow>("SELECT * FROM submissions WHERE status = 'submitted' AND submitted_at IS NOT NULL")) {
    const camp = one<CampaignRow>('SELECT * FROM campaigns WHERE id = ?', s.campaign_id)
    if (!camp || camp.sourcing === 'contest') continue
    const age = ageDays(s.submitted_at!)
    if (autoApproveDays > 0 && age >= autoApproveDays) {
      if (!hasFailedChecks(s)) {
        try {
          approve(s, camp, null, `Approved automatically after ${autoApproveDays} days without a review.`)
          run('UPDATE submissions SET auto_approved = 1 WHERE id = ?', s.id)
          notify(brandUsers(camp.brand_id), { title: 'Video approved automatically', body: `${camp.name}, video ${s.idx} passed every check and wasn’t reviewed within ${autoApproveDays} days, so the creator was paid.`, link: `/brand/reviews/${s.id}` })
        } catch {
          if (!s.escalated_at) {
            run('UPDATE submissions SET escalated_at = ? WHERE id = ?', now(), s.id)
            notify(brandUsers(camp.brand_id), { title: 'Top up to pay a creator', body: `${camp.name}, video ${s.idx} is ready to be approved but there aren’t enough funds in escrow or your wallet.`, link: '/brand/billing' })
          }
        }
        continue
      }
      if (!s.escalated_at) {
        run('UPDATE submissions SET escalated_at = ? WHERE id = ?', now(), s.id)
        notify(brandUsers(camp.brand_id), { title: 'A video needs your decision', body: `${camp.name}, video ${s.idx} has failed checks, so it can’t be approved automatically. Approve, request changes or reject.`, link: `/brand/reviews/${s.id}` })
      }
      continue
    }
    if (reviewReminderDays > 0 && age >= reviewReminderDays && !s.reminded_at) {
      run('UPDATE submissions SET reminded_at = ? WHERE id = ?', now(), s.id)
      const auto = autoApproveDays > 0 && !hasFailedChecks(s) ? ` It will be approved automatically in ${Math.max(1, Math.ceil(autoApproveDays - age))} day(s) if you don’t review it.` : ''
      notify(brandUsers(camp.brand_id), { title: 'A video is waiting for review', body: `${camp.name}, video ${s.idx}.${auto}`, link: `/brand/reviews/${s.id}` })
    }
  }
}
