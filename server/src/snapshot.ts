// Builds the role-scoped state a signed-in user sees. The shape matches the
// frontend's MarketState so pages render server data unchanged.

import type { User } from './auth.ts'
import { all, j, one } from './db.ts'
import { budgetOf, creatorHistory, deadlineOf, escrowHeld, walletBalance, type CampaignRow, type Metrics, type SubmissionRow } from './domain.ts'
import { learnStrengths, type Strengths } from './matching.ts'
import { toDollars } from './util.ts'

interface ProfileRow {
  id: string; user_id: string; display_name: string; handle: string; country: string; niches: string; bio: string
  base_rate: number; availability: string; styles: string; prior_strengths: string
}

export function membership(userId: string) {
  return one<{ brand_id: string; role: 'Owner' | 'Manager' | 'Reviewer' }>('SELECT brand_id, role FROM brand_members WHERE user_id = ? AND pending = 0', userId)
}

function coachFor(s: Strengths, styles: string[], history: ReturnType<typeof creatorHistory>, onTime: number) {
  const ranked = (Object.entries({ hook: s.hook, retention: s.retention, conversion: s.conversion }) as [keyof Strengths, number][]).sort((a, b) => b[1] - a[1])
  const [best, , worst] = ranked
  const lead = styles[0] ?? 'your natural delivery'
  const label = { hook: 'opening hooks', retention: 'keeping viewers watching', conversion: 'driving clicks and sales', reliability: 'reliability' }
  const withData = history.filter(h => h.ctr !== undefined)
  const recent = withData.slice(-3)
  const improving: string[] = []
  if (recent.length >= 2 && (recent.at(-1)!.ctr ?? 0) > (recent[0].ctr ?? 0)) improving.push(`Click-through rate: up from ${recent[0].ctr!.toFixed(2)}% to ${recent.at(-1)!.ctr!.toFixed(2)}%`)
  if (s[best[0]] >= 80) improving.push(`${label[best[0]].charAt(0).toUpperCase() + label[best[0]].slice(1)} — now one of your strongest skills (${best[1]})`)
  if (!improving.length) improving.push('Complete a campaign with recorded results to see your trend here.')
  return {
    insight: withData.length ? `Your strongest skill is ${label[best[0]]}.` : `Your profile points to ${lead.toLowerCase()} as your edge.`,
    advice: withData.length
      ? `Across ${withData.length} measured video${withData.length > 1 ? 's' : ''}, your ${best[0]} strength is ${best[1]}. Lead with ${lead.toLowerCase()} in your next brief.`
      : 'Once brands record results for your videos, this coach learns which openings and styles work best for you.',
    improving,
    valued: [onTime >= 90 ? `Delivers on time (${onTime}%)` : `On-time rate ${onTime}% — aim for 90%+`, ...styles.slice(0, 2).map(x => `Proven ${x.toLowerCase()} style`)],
    nextSkill: worst[0] === 'conversion'
      ? 'Stronger calls to action: end with a specific offer or code instead of “link below”.'
      : worst[0] === 'retention'
        ? 'Pacing: show the product by 8 seconds and cut any pause longer than a second.'
        : 'Openings: say the most surprising line in the first 2 seconds, before any context.',
  }
}

function creatorView(p: ProfileRow, includePrivate: boolean) {
  const history = creatorHistory(p.id)
  const strengths = learnStrengths(j(p.prior_strengths, { hook: 60, retention: 60, conversion: 60, reliability: 80 }), history)
  const decided = history.filter(h => h.approved)
  const onTimeRate = history.length ? Math.round((history.filter(h => h.onTime).length / history.length) * 100) : strengths.reliability
  const brandCounts = new Map<string, number>()
  decided.forEach(h => brandCounts.set(h.brandId, (brandCounts.get(h.brandId) ?? 0) + 1))
  const repeat = brandCounts.size ? Math.round(([...brandCounts.values()].filter(n => n > 1).length / brandCounts.size) * 100) : 0
  const pastBrands = [...brandCounts.keys()].map(b => one<{ name: string }>('SELECT name FROM brands WHERE id = ?', b)?.name).filter(Boolean) as string[]
  const styles = j<string[]>(p.styles, [])
  const user = one<{ email: string; name: string }>('SELECT email, name FROM users WHERE id = ?', p.user_id)!
  return {
    id: p.id, name: p.display_name, email: includePrivate ? user.email : '', displayName: p.display_name, handle: p.handle, country: p.country,
    niches: j<string[]>(p.niches, []), bio: p.bio, baseRate: toDollars(p.base_rate), availability: p.availability, strengths, styles,
    onTimeRate, repeatBrandRate: repeat, pastBrands,
    channels: all<{ platform: string; handle: string; followers: number; verified: number }>('SELECT platform, handle, followers, verified FROM social_channels WHERE creator_id = ?', p.id)
      .map(c => ({ ...c, verified: !!c.verified })),
    coach: coachFor(strengths, styles, history, onTimeRate),
  }
}

function campaignView(c: CampaignRow) {
  const brand = one<{ name: string }>('SELECT name FROM brands WHERE id = ?', c.brand_id)
  const prizes = j<number[]>(c.prizes, [])
  return {
    id: c.id, brandId: c.brand_id, brandName: brand?.name ?? '', name: c.name, product: c.product, category: c.category, goal: c.goal, market: c.market,
    targetCustomers: j(c.target_customers, []), creativeAngle: c.creative_angle, suggestedOpening: c.suggested_opening,
    storyFlow: j(c.story_flow, []), mustInclude: j(c.must_include, []), avoid: j(c.avoid, []),
    deliverables: j(c.deliverables, {}), baseFee: toDollars(c.base_fee), bonusAmount: toDollars(c.bonus_amount),
    bonusRule: c.sourcing === 'contest' ? `Prize pool: ${prizes.map(p => `$${(p / 100).toLocaleString()}`).join(' / ')}` : c.bonus_rule,
    benchmarkCtr: c.benchmark_ctr, prizes: prizes.map(toDollars), creatorsWanted: c.creators_wanted, sourcing: c.sourcing,
    timeline: j(c.timeline, []), status: c.status, createdAt: c.created_at.slice(0, 10), deadline: deadlineOf(c),
  }
}

function submissionView(s: SubmissionRow) {
  const m = j<Metrics | null>(s.metrics, null)
  return {
    id: s.id, matchId: s.match_id, campaignId: s.campaign_id, creatorId: s.creator_id, index: s.idx,
    fileName: s.file_name ?? undefined, hasVideo: !!s.file_path, duration: s.duration ?? undefined,
    aspectRatio: s.width && s.height ? `${s.width}:${s.height}` : undefined, resolution: s.width && s.height ? `${s.width}×${s.height}` : undefined,
    script: s.script ?? undefined, preflight: j(s.preflight, []), briefMatch: s.brief_match ?? undefined, aiFeedback: s.ai_feedback ?? undefined,
    status: s.status, reviewNote: s.review_note ?? undefined, submittedAt: s.submitted_at ?? undefined, approvedAt: s.approved_at ?? undefined,
    attempts: s.attempts, winning: !!s.winning, placement: s.placement ?? undefined,
    metrics: m ? {
      views: m.impressions, ctr: m.impressions ? +((m.clicks / m.impressions) * 100).toFixed(2) : 0, conversions: m.conversions,
      costPerResult: m.conversions ? Math.round(m.spend / m.conversions) / 100 : 0, thumbstop: m.thumbstop, holdRate: m.holdRate,
      clicks: m.clicks, spend: toDollars(m.spend),
    } : undefined,
  }
}

const paymentView = (p: { id: string; creator_id: string; campaign_id: string; submission_id: string | null; kind: string; amount: number; status: string; created_at: string; available_at: string }) => ({
  id: p.id, creatorId: p.creator_id, campaignId: p.campaign_id, creativeId: p.submission_id ?? undefined, kind: p.kind,
  base: p.kind === 'bonus' ? 0 : toDollars(p.amount), bonus: p.kind === 'bonus' ? toDollars(p.amount) : 0,
  status: p.status, date: p.created_at.slice(0, 10), availableAt: p.available_at,
})

export function snapshot(user: User) {
  const notifications = all<{ id: string; title: string; body: string; link: string; read_at: string | null; created_at: string }>(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', user.id)
    .map(n => ({ id: n.id, to: user.role, title: n.title, body: n.body, link: n.link, at: n.created_at, read: !!n.read_at }))
  const base = { version: 2 as const, notifications, role: user.role }

  if (user.role === 'brand') {
    const m = membership(user.id)
    if (!m) return { ...base, brand: null }
    const b = one<{ id: string; name: string; country: string; description: string; target_customers: string }>('SELECT * FROM brands WHERE id = ?', m.brand_id)!
    const camps = all<CampaignRow>('SELECT * FROM campaigns WHERE brand_id = ? ORDER BY created_at DESC', b.id)
    const ids = camps.map(c => c.id)
    const inIds = ids.length ? `(${ids.map(() => '?').join(',')})` : "('')"
    const matches = all<{ id: string; campaign_id: string; creator_id: string; score: number; reasons: string; status: string; responded_at: string | null }>(`SELECT * FROM matches WHERE campaign_id IN ${inIds}`, ...ids)
    const subs = all<SubmissionRow>(`SELECT * FROM submissions WHERE campaign_id IN ${inIds} ORDER BY submitted_at DESC`, ...ids)
    const payments = all<Parameters<typeof paymentView>[0]>('SELECT * FROM payments WHERE brand_id = ? ORDER BY created_at DESC', b.id)
    const ledger = all<{ id: string; kind: string; amount: number; note: string; created_at: string }>('SELECT * FROM ledger WHERE brand_id = ? ORDER BY created_at DESC LIMIT 50', b.id)
    return {
      ...base,
      brand: { id: b.id, name: b.name, country: b.country, description: b.description, targetCustomers: j(b.target_customers, []) },
      myRole: m.role,
      permissions: { canSpend: m.role !== 'Reviewer', canReview: true, canManageTeam: m.role === 'Owner' },
      creators: all<ProfileRow>('SELECT * FROM creator_profiles').map(p => creatorView(p, false)),
      campaigns: camps.map(campaignView),
      matches: matches.map(x => ({ id: x.id, campaignId: x.campaign_id, creatorId: x.creator_id, score: x.score, reasons: j(x.reasons, []), status: x.status, respondedAt: x.responded_at ?? undefined })),
      submissions: subs.map(submissionView),
      payments: payments.map(paymentView),
      team: all<{ user_id: string | null; email: string; role: string; pending: number }>('SELECT * FROM brand_members WHERE brand_id = ? ORDER BY created_at', b.id)
        .map(t => ({ id: t.email, email: t.email, role: t.role, pending: !!t.pending, name: t.user_id ? one<{ name: string }>('SELECT name FROM users WHERE id = ?', t.user_id)!.name : t.email })),
      wallet: toDollars(walletBalance(b.id)),
      billing: {
        held: toDollars(camps.filter(c => c.status !== 'draft').reduce((a, c) => a + escrowHeld(c.id), 0)),
        ledger: ledger.map(l => ({ id: l.id, kind: l.kind, amount: toDollars(l.amount), note: l.note, date: l.created_at.slice(0, 10) })),
        budgets: Object.fromEntries(camps.map(c => [c.id, toDollars(budgetOf(c))])),
      },
    }
  }

  if (user.role === 'creator') {
    const p = one<ProfileRow>('SELECT * FROM creator_profiles WHERE user_id = ?', user.id)
    if (!p) return { ...base, me: null }
    const matches = all<{ id: string; campaign_id: string; creator_id: string; score: number; reasons: string; status: string; responded_at: string | null }>(
      "SELECT * FROM matches WHERE creator_id = ? AND status != 'suggested'", p.id)
    const campIds = new Set(matches.map(m => m.campaign_id))
    const camps = all<CampaignRow>("SELECT * FROM campaigns WHERE status != 'draft' ORDER BY created_at DESC")
      .filter(c => campIds.has(c.id) || (c.sourcing === 'contest' && c.status === 'live'))
    return {
      ...base,
      me: creatorView(p, true),
      meCreatorId: p.id,
      campaigns: camps.map(campaignView),
      matches: matches.map(x => ({ id: x.id, campaignId: x.campaign_id, creatorId: x.creator_id, score: x.score, reasons: j(x.reasons, []), status: x.status, respondedAt: x.responded_at ?? undefined })),
      submissions: all<SubmissionRow>('SELECT * FROM submissions WHERE creator_id = ?', p.id).map(submissionView),
      payments: all<Parameters<typeof paymentView>[0]>('SELECT * FROM payments WHERE creator_id = ? ORDER BY created_at DESC', p.id).map(paymentView),
      payouts: all<{ id: string; amount: number; created_at: string; stripe_transfer_id: string | null }>('SELECT * FROM payouts WHERE creator_id = ? ORDER BY created_at DESC', p.id).map(x => ({ id: x.id, amount: toDollars(x.amount), date: x.created_at.slice(0, 10), toBank: !!x.stripe_transfer_id })),
      payoutAccount: (a => ({ connected: !!a?.stripe_account_id, ready: !!a?.payouts_enabled }))(one<{ stripe_account_id: string | null; payouts_enabled: number }>('SELECT stripe_account_id, payouts_enabled FROM creator_profiles WHERE id = ?', p.id)),
    }
  }
  return base
}
