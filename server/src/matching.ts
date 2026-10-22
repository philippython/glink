// Creator ↔ campaign matching.
//
// Pure functions only (no database), so the scoring can be unit-tested and
// explained. The score is a weighted sum of eight factors in [0, 1], scaled
// to 0–99, then multiplied by an availability/capacity factor. Each factor
// produces a human-readable reason; the strongest ones are shown to brands
// ("Why this match") and creators ("Why you were matched").

export type Goal = 'Purchases' | 'Sign-ups' | 'Content testing' | 'Awareness'
export interface Strengths { hook: number; retention: number; conversion: number; reliability: number }

/** One finished creative the creator made, used to learn their real strengths. */
export interface HistoryItem {
  category: string
  brandId: string
  approved: boolean
  onTime: boolean
  /** Ad results, when the brand has recorded them. Percentages, e.g. 2.4 = 2.4%. */
  thumbstop?: number // % of viewers past 3 seconds
  holdRate?: number  // % of viewers to 15 seconds
  ctr?: number
  cvr?: number
}

export interface CreatorInput {
  id: string
  niches: string[]
  styles: string[]
  country: string
  baseRate: number // cents
  availability: 'Available' | 'Limited' | 'Unavailable'
  prior: Strengths // self-reported / onboarding prior, 0–100
  history: HistoryItem[]
  activeJobs: number
}

export interface CampaignInput {
  brandId: string
  category: string
  goal: Goal
  market: string
  creativeAngle: string
  baseFee: number // cents
}

export interface Factor { key: string; label: string; value: number; weight: number; reason: string }
export interface MatchResult { creatorId: string; score: number; factors: Factor[]; reasons: string[]; eligible: boolean; blocker?: string }

// ─── Reference data ─────────────────────────────────────────────────────────

export const CATEGORIES = ['Skincare', 'Beauty', 'Wellness', 'Fitness', 'Food & Bev', 'Technology', 'Finance', 'Pets', 'Fashion', 'Home', 'Parenting', 'Gaming', 'Travel']

/** Neighbouring categories share audiences and on-camera skills. */
const RELATED: Record<string, string[]> = {
  Skincare: ['Beauty', 'Wellness'], Beauty: ['Skincare', 'Fashion'], Wellness: ['Fitness', 'Skincare', 'Food & Bev'],
  Fitness: ['Wellness', 'Food & Bev'], 'Food & Bev': ['Wellness', 'Home'], Technology: ['Gaming', 'Finance'],
  Finance: ['Technology'], Pets: ['Home', 'Parenting'], Fashion: ['Beauty'], Home: ['Parenting', 'Food & Bev', 'Pets'],
  Parenting: ['Home', 'Pets'], Gaming: ['Technology'], Travel: ['Food & Bev', 'Fashion'],
}

/** Which proven styles suit each creative angle. */
const ANGLE_STYLES: Record<string, string[]> = {
  'Problem-solution': ['problem/solution', 'confession', 'testimonial', 'explainer'],
  Testimonial: ['confession', 'testimonial', 'storytelling', 'problem/solution'],
  Demonstration: ['demonstration', 'routine', 'explainer', 'tutorial', 'asmr'],
  Unboxing: ['unboxing', 'haul', 'first impressions', 'demonstration'],
}

/** How much each strength matters for each campaign goal (rows sum to 1). */
export const GOAL_WEIGHTS: Record<Goal, { hook: number; retention: number; conversion: number }> = {
  Purchases: { hook: 0.25, retention: 0.25, conversion: 0.5 },
  'Sign-ups': { hook: 0.25, retention: 0.35, conversion: 0.4 },
  'Content testing': { hook: 0.4, retention: 0.4, conversion: 0.2 },
  Awareness: { hook: 0.55, retention: 0.35, conversion: 0.1 },
}

const REGIONS: Record<string, string> = {
  'United States': 'NA', Canada: 'NA', 'United Kingdom': 'EU', Germany: 'EU', France: 'EU', Spain: 'EU', Portugal: 'EU',
  Nigeria: 'AF', 'South Africa': 'AF', Ghana: 'AF', Kenya: 'AF', Australia: 'OC', India: 'AS',
}
const ENGLISH = new Set(['United States', 'Canada', 'United Kingdom', 'Australia', 'Nigeria', 'South Africa', 'Ghana', 'Kenya', 'India'])

export const WEIGHTS = {
  category: 0.22, strengths: 0.24, style: 0.12, reliability: 0.12, market: 0.1, budget: 0.1, evidence: 0.06, affinity: 0.04,
}

// ─── Learned strengths ──────────────────────────────────────────────────────

/** Benchmarks that map raw ad metrics onto a 0–100 strength scale (≈ 90th percentile UGC). */
const SCALE = { thumbstop: 50, holdRate: 35, ctr: 3, cvr: 6 }
const PRIOR_WEIGHT = 3 // the prior counts as this many observed creatives

const blend = (prior: number, observed: number[], k = PRIOR_WEIGHT) =>
  observed.length === 0 ? prior : (prior * k + observed.reduce((a, b) => a + b, 0)) / (k + observed.length)

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v))

/**
 * Bayesian-style shrinkage: start from the creator's prior and move towards
 * what their real ads show, more confidently as results accumulate.
 */
export function learnStrengths(prior: Strengths, history: HistoryItem[]): Strengths {
  const withData = history.filter(h => h.approved)
  const pct = (v: number | undefined, top: number) => (v === undefined ? undefined : clamp((v / top) * 90))
  const hook = withData.map(h => pct(h.thumbstop, SCALE.thumbstop)).filter((v): v is number => v !== undefined)
  const retention = withData.map(h => pct(h.holdRate, SCALE.holdRate)).filter((v): v is number => v !== undefined)
  const conversion = withData.map(h => {
    const a = pct(h.ctr, SCALE.ctr), b = pct(h.cvr, SCALE.cvr)
    return a === undefined && b === undefined ? undefined : ((a ?? b)! + (b ?? a)!) / 2
  }).filter((v): v is number => v !== undefined)
  const reliability = history.map(h => (h.onTime ? 100 : 40))
  return {
    hook: Math.round(blend(prior.hook, hook)),
    retention: Math.round(blend(prior.retention, retention)),
    conversion: Math.round(blend(prior.conversion, conversion)),
    reliability: Math.round(blend(prior.reliability, reliability, 4)),
  }
}

// ─── Scoring ────────────────────────────────────────────────────────────────

const lower = (s: string) => s.toLowerCase()

export function scoreMatch(c: CreatorInput, camp: CampaignInput): MatchResult {
  const strengths = learnStrengths(c.prior, c.history)
  const factors: Factor[] = []
  const add = (key: keyof typeof WEIGHTS, label: string, value: number, reason: string) =>
    factors.push({ key, label, value: clamp(value, 0, 1), weight: WEIGHTS[key], reason })

  // 1. Category fit
  const niches = c.niches.map(lower)
  const cat = lower(camp.category)
  const related = (RELATED[camp.category] ?? []).map(lower)
  if (niches.includes(cat)) add('category', 'Category fit', 1, `Creates ${camp.category} content`)
  else if (niches.some(n => related.includes(n))) add('category', 'Category fit', 0.6, `Works in a related category (${c.niches.find(n => related.includes(lower(n)))})`)
  else add('category', 'Category fit', 0.15, `No ${camp.category} work yet`)

  // 2. Strengths weighted by the campaign goal
  const w = GOAL_WEIGHTS[camp.goal]
  const goalScore = (strengths.hook * w.hook + strengths.retention * w.retention + strengths.conversion * w.conversion) / 100
  const top = (Object.entries({ hook: strengths.hook, retention: strengths.retention, conversion: strengths.conversion }) as [keyof typeof w, number][])
    .sort((a, b) => b[1] * w[b[0]] - a[1] * w[a[0]])[0]
  add('strengths', 'Strengths for this goal', goalScore, `${top[0][0].toUpperCase() + top[0].slice(1)} strength ${top[1]} suits a ${camp.goal.toLowerCase()} goal`)

  // 3. Style ↔ creative angle
  const wanted = ANGLE_STYLES[camp.creativeAngle] ?? [lower(camp.creativeAngle)]
  const styles = c.styles.map(lower)
  const exact = styles.find(s => wanted.slice(0, 2).some(x => s.includes(x)))
  const near = styles.find(s => wanted.some(x => s.includes(x)))
  if (exact) add('style', 'Style fit', 1, `Proven ${c.styles[styles.indexOf(exact)]} style fits a ${camp.creativeAngle.toLowerCase()} brief`)
  else if (near) add('style', 'Style fit', 0.6, `${c.styles[styles.indexOf(near)]} style is close to this angle`)
  else add('style', 'Style fit', 0.25, `Hasn’t shown a ${camp.creativeAngle.toLowerCase()} style yet`)

  // 4. Reliability (learned on-time rate)
  add('reliability', 'Reliability', strengths.reliability / 100, `${strengths.reliability}% reliability`)

  // 5. Market fit
  const sameCountry = c.country === camp.market
  const sameRegion = REGIONS[c.country] && REGIONS[c.country] === REGIONS[camp.market]
  const sharedLanguage = ENGLISH.has(c.country) && ENGLISH.has(camp.market)
  add('market', 'Market fit', sameCountry ? 1 : sameRegion ? 0.75 : sharedLanguage ? 0.6 : 0.35,
    sameCountry ? `Based in ${camp.market}` : sameRegion || sharedLanguage ? `Close to the ${camp.market} audience` : `Based outside ${camp.market}`)

  // 6. Budget fit
  const over = c.baseRate - camp.baseFee
  add('budget', 'Budget fit', over <= 0 ? 1 : 1 - over / camp.baseFee,
    over <= 0 ? 'Rate is within your budget' : `Rate is $${Math.round(over / 100)} above your fee`)

  // 7. Evidence in this category (performance-weighted)
  const inCat = c.history.filter(h => h.approved && lower(h.category) === cat)
  const evidence = inCat.length === 0 ? 0 : Math.min(1, inCat.length / 4) * (0.6 + 0.4 * (inCat.filter(h => (h.ctr ?? 0) >= 1.8).length / inCat.length))
  add('evidence', 'Proven results', evidence,
    inCat.length ? `${inCat.length} approved ${camp.category} video${inCat.length > 1 ? 's' : ''}` : 'No results in this category yet')

  // 8. Affinity: approved work for this brand before
  const forBrand = c.history.filter(h => h.brandId === camp.brandId && h.approved).length
  add('affinity', 'Worked with you', forBrand ? 1 : 0, forBrand ? 'Has delivered approved work for you before' : 'New to your brand')

  // Availability and capacity scale the whole score.
  let factor = c.availability === 'Available' ? 1 : c.availability === 'Limited' ? 0.85 : 0
  if (c.activeJobs >= 3) factor *= 0.8
  const raw = factors.reduce((a, f) => a + f.value * f.weight, 0)
  const score = Math.round(Math.min(99, raw * 100 * factor))

  const blocker = c.availability === 'Unavailable' ? 'Not taking new work' : over > camp.baseFee ? 'Rate is more than double your fee' : undefined
  const reasons = [...factors].sort((a, b) => b.value * b.weight - a.value * a.weight).filter(f => f.value >= 0.6).slice(0, 3).map(f => f.reason)
  const weakest = [...factors].sort((a, b) => a.value * a.weight - b.value * b.weight)[0]
  if (weakest.value < 0.4) reasons.push(`Watch: ${weakest.reason.charAt(0).toLowerCase() + weakest.reason.slice(1)}`)

  return { creatorId: c.id, score, factors, reasons, eligible: !blocker, blocker }
}

/** Minimum score to be invited automatically. Lower matches are suggested for hand-picking. */
export const AUTO_INVITE_THRESHOLD = 55

export function rankCreators(creators: CreatorInput[], camp: CampaignInput): MatchResult[] {
  return creators.map(c => scoreMatch(c, camp)).sort((a, b) => b.score - a.score)
}

/** Picks who to invite: the top `wanted` eligible creators above the threshold. */
export function selectInvites(ranked: MatchResult[], wanted: number, exclude = new Set<string>()): MatchResult[] {
  return ranked.filter(r => r.eligible && r.score >= AUTO_INVITE_THRESHOLD && !exclude.has(r.creatorId)).slice(0, wanted)
}
