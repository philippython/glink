// Shapes of the data the API sends (see server/src/snapshot.ts). Money is in
// whole dollars here; the server stores cents.

import type { Milestone } from './types'

export type Role = 'brand' | 'creator'

export interface Brand { id: string; name: string; country: string; description: string; targetCustomers: string[] }
export interface Channel { platform: 'TikTok' | 'Instagram' | 'YouTube'; handle: string; followers: number; verified: boolean }
export interface Strengths { hook: number; retention: number; conversion: number; reliability: number }

export interface CreatorProfile {
  id: string
  name: string
  email: string
  displayName: string
  handle: string
  country: string
  niches: string[]
  bio: string
  baseRate: number
  availability: 'Available' | 'Limited' | 'Unavailable'
  strengths: Strengths
  styles: string[]
  onTimeRate: number
  repeatBrandRate: number
  pastBrands: string[]
  channels: Channel[]
  coach: { insight: string; advice: string; improving: string[]; valued: string[]; nextSkill: string }
}

export type Goal = 'Purchases' | 'Sign-ups' | 'Content testing' | 'Awareness'
export type Sourcing = 'auto' | 'handpick' | 'contest'
export interface Deliverables { count: number; aspectRatio: string; minSec: number; maxSec: number; rawFootage: boolean }

export interface Campaign {
  id: string
  brandId: string
  brandName: string
  name: string
  product: string
  category: string
  goal: Goal
  market: string
  targetCustomers: string[]
  creativeAngle: string
  suggestedOpening: string
  storyFlow: string[]
  mustInclude: string[]
  avoid: string[]
  deliverables: Deliverables
  baseFee: number
  bonusAmount: number
  bonusRule: string
  benchmarkCtr: number
  prizes: number[]
  creatorsWanted: number
  sourcing: Sourcing
  /** Every advert has a submission timeline; the `deadline` milestone is the submit-by date. */
  timeline: Milestone[]
  status: 'draft' | 'live' | 'completed'
  createdAt: string
  deadline: string
}

export type MatchStatus = 'suggested' | 'invited' | 'accepted' | 'declined'
export interface Match { id: string; campaignId: string; creatorId: string; score: number; reasons: string[]; status: MatchStatus; respondedAt?: string }

export type CheckStatus = 'pass' | 'fail' | 'review'
export interface PreflightItem { kind: 'format' | 'must' | 'avoid' | 'audio'; label: string; ok: boolean; status: CheckStatus; at?: number; note?: string; source?: 'file' | 'script' | 'ai' }

export type CreativeStatus = 'not_started' | 'in_progress' | 'submitted' | 'changes_requested' | 'approved' | 'paid' | 'rejected'

export interface CreativeSubmission {
  id: string
  matchId: string
  campaignId: string
  creatorId: string
  index: number
  fileName?: string
  hasVideo: boolean
  duration?: number
  aspectRatio?: string
  resolution?: string
  script?: string
  preflight: PreflightItem[]
  briefMatch?: number
  aiFeedback?: string
  status: CreativeStatus
  reviewNote?: string
  submittedAt?: string
  approvedAt?: string
  attempts: number
  winning: boolean
  placement?: number
  metrics?: { views: number; ctr: number; conversions: number; costPerResult: number; thumbstop: number; holdRate: number; clicks: number; spend: number }
}

export interface Payment {
  id: string
  creatorId: string
  campaignId: string
  creativeId?: string
  kind: 'base' | 'bonus' | 'prize'
  base: number
  bonus: number
  status: 'pending' | 'available' | 'paid_out'
  date: string
  availableAt: string
}

export interface AppNotification { id: string; to: Role; title: string; body: string; link: string; at: string; read: boolean }
export interface TeamMember { id: string; name: string; email: string; role: 'Owner' | 'Manager' | 'Reviewer'; pending?: boolean }

export interface MarketState {
  version: 2
  role: Role | null
  notifications: AppNotification[]
  // brand
  brand?: Brand | null
  myRole?: TeamMember['role']
  permissions?: { canSpend: boolean; canReview: boolean; canManageTeam: boolean }
  creators?: CreatorProfile[]
  team?: TeamMember[]
  wallet?: number
  billing?: { held: number; ledger: { id: string; kind: 'topup' | 'hold' | 'refund'; amount: number; note: string; date: string }[]; budgets: Record<string, number> }
  // creator
  me?: CreatorProfile | null
  meCreatorId?: string
  payouts?: { id: string; amount: number; date: string; toBank?: boolean }[]
  payoutAccount?: { connected: boolean; ready: boolean }
  // both
  campaigns?: Campaign[]
  matches?: Match[]
  submissions?: CreativeSubmission[]
  payments?: Payment[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export const deadlineOf = (c: Pick<Campaign, 'timeline'>) => (c.timeline.find(m => m.deadline) ?? c.timeline.at(-1))?.date ?? ''

/** Splits a comma-separated input into a clean array — list fields must always be arrays. */
export const toList = (v: string | string[]) =>
  (Array.isArray(v) ? v : v.split(',')).map(s => s.trim()).filter(Boolean)

export const preflightIssues = (items: PreflightItem[]) => items.filter(i => i.status === 'fail').length
export const preflightReviews = (items: PreflightItem[]) => items.filter(i => i.status === 'review').length

export type FieldErrors = Record<string, string>

/** Client-side checks for instant feedback; the server validates the same rules. */
export function validateBrand(input: { name: string; country: string; description: string; targetCustomers: unknown }): FieldErrors {
  const e: FieldErrors = {}
  if (!input.name.trim()) e.name = 'Enter your company name.'
  if (!input.country) e.country = 'Choose the country you sell in.'
  if (!Array.isArray(input.targetCustomers)) e.targetCustomers = 'Target customers must be a list — separate them with commas.'
  else if (input.targetCustomers.length === 0) e.targetCustomers = 'Add at least one target customer, e.g. “new parents, runners”.'
  if (input.description.trim().length < 10) e.description = 'Describe your brand in a sentence or two (at least 10 characters).'
  return e
}

export function validateCreator(input: { displayName: string; country: string; niches: unknown; bio: string }): FieldErrors {
  const e: FieldErrors = {}
  if (!input.displayName.trim()) e.displayName = 'Enter the name brands will see.'
  if (!input.country) e.country = 'Choose your country.'
  if (!Array.isArray(input.niches)) e.niches = 'Niches must be a list — separate them with commas.'
  else if (input.niches.length === 0) e.niches = 'Add at least one niche, e.g. “skincare, fitness”.'
  if (input.bio.trim().length < 10) e.bio = 'Write a short bio (at least 10 characters).'
  return e
}

export const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Germany', 'France', 'Spain', 'Portugal', 'India']
export const CATEGORIES = ['Skincare', 'Beauty', 'Wellness', 'Fitness', 'Food & Bev', 'Technology', 'Finance', 'Pets', 'Fashion', 'Home', 'Parenting', 'Gaming', 'Travel']
