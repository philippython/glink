// Domain types. These mirror the shapes the backend will eventually serve,
// so swapping seed data for API calls should only touch src/data/*.

export type Evidence = 'strong' | 'moderate' | 'insufficient'

export interface Product {
  id: string
  name: string
  brand: string
  category: string
  url: string
  price: number
  hue: string // accent used for the product tile
  emoji: string
  status: 'analyzing' | 'ready' | 'testing' | 'scaling'
  summary: string
  audiences: { name: string; share: number; insight: string }[]
  objections: { text: string; severity: number }[]
  competitors: { name: string; angle: string; weakness: string }[]
  angles: { name: string; why: string; strength: number }[]
  usps: string[]
  creatives: number
  bestCpa: number
}

/** How a brand sources an advert: hire specific creators, or run an open contest. */
export type SourcingMode = 'direct' | 'contest'

/** One step on an advert's submission timeline. Dates are ISO (YYYY-MM-DD). */
export interface Milestone {
  label: string
  date: string
  /** The milestone creators submit against — shown as the deadline. */
  deadline?: boolean
}

export interface Hypothesis {
  id: string
  productId: string
  title: string
  angle: string
  hook: string
  story: string[]
  format: string
  rationale: string
  confidence: number
  stage: 'draft' | 'briefed' | 'production' | 'testing' | 'learned'
  creatorIds: string[]
  /** Set when the advert is launched (draft → briefed). Every launched advert has both. */
  mode?: SourcingMode
  timeline?: Milestone[]
  contestId?: string
}

export interface CreatorCategoryFit {
  category: string
  fit: number
  evidence: Evidence
  samples: number
}

export interface Creator {
  id: string
  name: string
  handle: string
  location: string
  gradient: [string, string]
  bio: string
  categories: CreatorCategoryFit[]
  strongestFormat: string
  bestLength: string
  hookStrength: 'Strong' | 'Good' | 'Developing'
  reliability: number
  projects: number
  avgRoas: number
  medianCpa: number
  rate: number
  styles: string[]
  hookTypes: { type: string; score: number }[]
  available: boolean
}

export interface GenomeScores {
  hook: number
  emotion: number
  pacing: number
  productReveal: number
  proof: number
  cta: number
}

export interface Metrics {
  spend: number
  impressions: number
  thumbstop: number // % of viewers past 3s
  holdRate: number // % watched to 15s
  ctr: number
  cvr: number
  cpa: number
  roas: number
  revenue: number
}

export interface Creative {
  id: string
  number: number
  productId: string
  creatorId: string
  hypothesisId: string
  title: string
  hookLine: string
  format: string
  duration: number
  generation: number
  status: 'winner' | 'live' | 'testing' | 'fatigued' | 'paused'
  launched: string
  metrics: Metrics
  retention: number[] // % of viewers remaining at each second bucket
  genome: GenomeScores
  timeline: { start: number; end: number; label: string; kind: 'hook' | 'problem' | 'proof' | 'reveal' | 'cta' }[]
  insights: { why: string[]; preserve: string[]; change: string[]; testNext: string[] }
}

export interface Experiment {
  id: string
  productId: string
  name: string
  variable: string
  generation: number
  status: 'running' | 'concluded' | 'queued'
  creativeIds: string[]
  winnerId?: string
  lift?: number
  confidence: number
  started: string
  budget: number
}

export interface NextAction {
  id: string
  kind: 'replicate' | 'iterate' | 'localize' | 'refresh' | 'scale'
  title: string
  detail: string
  basedOn: string
  expectedImpact: string
  confidence: number
  productId: string
}

export interface Activity {
  id: string
  at: string
  kind: 'insight' | 'creative' | 'match' | 'experiment' | 'alert'
  text: string
}

export interface Invitation {
  id: string
  productId: string
  brand: string
  fee: number
  bonus: string
  timeline: Milestone[]
  matchReason: string
  fit: number
}

export interface ContestEntry {
  id: string
  name: string
  handle: string
  gradient: [string, string]
  submittedAt: string
  duration: number
  hookLine: string
  precheck: number // predicted genome score from the pre-submission check
  status: 'submitted' | 'shortlisted' | 'winner' | 'declined'
  creatorId?: string // set when the entrant is already in the creator network
}

export interface Contest {
  id: string
  productId: string
  hypothesisId: string
  title: string
  brief: string
  status: 'open' | 'judging' | 'closed'
  prizes: { place: string; amount: number }[]
  rules: string[]
  timeline: Milestone[]
  entries: ContestEntry[]
}
