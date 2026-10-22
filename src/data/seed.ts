import type {
  Activity, Contest, Creative, Creator, Experiment, Hypothesis, Invitation, NextAction, Product,
} from './types'

// Deliberately small: one product that has been through the full loop (Lumen Skin),
// and one that has just started (Kindred Pet, running a contest). Enough to follow
// the flow end-to-end without drowning in records.

/** Today's date (local), as YYYY-MM-DD — timelines and deadlines are compared against it. */
export const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()

// ─── Products ───────────────────────────────────────────────────────────────

export const products: Product[] = [
  {
    id: 'p-lumen',
    name: 'Barrier Repair Serum',
    brand: 'Lumen Skin',
    category: 'Skincare',
    url: 'lumenskin.com/products/barrier-repair-serum',
    price: 38,
    hue: 'var(--g0)',
    emoji: '🧴',
    status: 'scaling',
    summary:
      'A ceramide + niacinamide serum for sensitised, over-exfoliated skin. Buyers are mostly 24–38 women who have “tried everything” and distrust miracle claims.',
    audiences: [
      { name: 'Over-exfoliators', share: 41, insight: 'Damaged their barrier with acids; want calm, not glow.' },
      { name: 'Rosacea-adjacent', share: 27, insight: 'Redness-prone; respond to dermatologist language.' },
      { name: 'Minimalist routines', share: 19, insight: 'Want one product that replaces three.' },
      { name: 'Gift buyers', share: 13, insight: 'Buy during Q4; price-anchored to $40.' },
    ],
    objections: [
      { text: '“I’ve tried every serum — none of them work.”', severity: 92 },
      { text: '“Will it break me out?”', severity: 78 },
      { text: '“$38 is a lot for a serum this size.”', severity: 61 },
    ],
    competitors: [
      { name: 'CeraVe PM', angle: 'Derm-recommended, cheap', weakness: 'Feels clinical, no ritual' },
      { name: 'Skin Rescue Drops', angle: 'Influencer glow', weakness: 'Over-promises, high returns' },
    ],
    angles: [
      { name: 'Confession', why: 'Disarms skepticism by admitting past mistakes', strength: 94 },
      { name: 'Before / after (day 14)', why: 'Proof addresses “nothing works”', strength: 88 },
      { name: 'Routine replacement', why: 'Justifies price via fewer products', strength: 71 },
      { name: 'Derm explainer', why: 'Authority for redness-prone segment', strength: 66 },
    ],
    usps: ['5 ceramides + 4% niacinamide', 'Fragrance-free', 'Visible calm in 14 days'],
    creatives: 4,
    bestCpa: 29,
  },
  {
    id: 'p-kindred',
    name: 'Joint Support Chews',
    brand: 'Kindred Pet',
    category: 'Wellness',
    url: 'kindredpet.co/joint-chews',
    price: 42,
    hue: 'var(--g5)',
    emoji: '🐕',
    status: 'ready',
    summary:
      'Glucosamine chews for senior dogs. Purchases are emotional and triggered by a visible moment — the dog hesitating at the stairs.',
    audiences: [
      { name: 'Senior-dog owners', share: 64, insight: 'Guilt + love; respond to “first walk again” stories.' },
      { name: 'Large breeds', share: 36, insight: 'Preventive purchase from age 5.' },
    ],
    objections: [
      { text: '“Will my picky dog actually eat it?”', severity: 81 },
      { text: '“Supplements are a scam.”', severity: 59 },
    ],
    competitors: [{ name: 'Vet prescriptions', angle: 'Authority', weakness: 'Expensive, clinical' }],
    angles: [
      { name: 'The stairs moment', why: 'Universal, visual purchase trigger', strength: 91 },
      { name: 'Picky-eater test', why: 'Answers the #1 objection on camera', strength: 77 },
    ],
    usps: ['Vet-formulated', 'Chicken flavour, grain-free', 'Results in 4–6 weeks'],
    creatives: 0,
    bestCpa: 0,
  },
]

// ─── Creators (direct-hire network) ─────────────────────────────────────────

export const creators: Creator[] = [
  {
    id: 'c-maya',
    name: 'Maya Chen',
    handle: '@mayamakesitsimple',
    location: 'Vancouver, CA',
    gradient: ['var(--g0)', 'var(--g6)'],
    bio: 'Honest skincare with a “here’s what I got wrong” lens. Camera-direct, bathroom-mirror setups.',
    categories: [
      { category: 'Skincare', fit: 92, evidence: 'strong', samples: 34 },
      { category: 'Wellness', fit: 84, evidence: 'strong', samples: 12 },
      { category: 'Fashion', fit: 78, evidence: 'moderate', samples: 7 },
      { category: 'Finance', fit: 25, evidence: 'insufficient', samples: 1 },
    ],
    strongestFormat: 'Confession / problem-solution',
    bestLength: '18–25 sec',
    hookStrength: 'Strong',
    reliability: 97,
    projects: 58,
    avgRoas: 3.4,
    medianCpa: 31,
    rate: 650,
    styles: ['Confessional', 'Mirror POV', 'Low-fi'],
    hookTypes: [
      { type: 'Confession', score: 94 },
      { type: 'Question', score: 81 },
      { type: 'Pattern interrupt', score: 72 },
      { type: 'Stat shock', score: 58 },
    ],
    available: true,
  },
  {
    id: 'c-sofia',
    name: 'Sofia Álvarez',
    handle: '@sofi.skin',
    location: 'Madrid, ES',
    gradient: ['var(--g2)', 'var(--g7)'],
    bio: 'Licensed esthetician. Explains ingredients with a whiteboard and zero jargon.',
    categories: [
      { category: 'Skincare', fit: 89, evidence: 'strong', samples: 27 },
      { category: 'Wellness', fit: 68, evidence: 'moderate', samples: 6 },
    ],
    strongestFormat: 'Expert explainer',
    bestLength: '25–40 sec',
    hookStrength: 'Good',
    reliability: 96,
    projects: 39,
    avgRoas: 3.0,
    medianCpa: 34,
    rate: 720,
    styles: ['Whiteboard', 'Authority', 'Bilingual'],
    hookTypes: [
      { type: 'Stat shock', score: 82 },
      { type: 'Question', score: 79 },
      { type: 'Confession', score: 55 },
      { type: 'Pattern interrupt', score: 60 },
    ],
    available: true,
  },
  {
    id: 'c-priya',
    name: 'Priya Raman',
    handle: '@priyaathome',
    location: 'London, UK',
    gradient: ['var(--g3)', 'var(--g8)'],
    bio: 'Slow-living home rituals. Morning routines, kitchen counters, warm light.',
    categories: [
      { category: 'Wellness', fit: 82, evidence: 'strong', samples: 15 },
      { category: 'Skincare', fit: 74, evidence: 'moderate', samples: 8 },
      { category: 'Technology', fit: 41, evidence: 'insufficient', samples: 2 },
    ],
    strongestFormat: 'Ritual / day-in-the-life',
    bestLength: '20–30 sec',
    hookStrength: 'Good',
    reliability: 99,
    projects: 44,
    avgRoas: 3.1,
    medianCpa: 22,
    rate: 550,
    styles: ['ASMR', 'Golden hour', 'No talking'],
    hookTypes: [
      { type: 'Pattern interrupt', score: 86 },
      { type: 'Confession', score: 70 },
      { type: 'Question', score: 66 },
      { type: 'Stat shock', score: 44 },
    ],
    available: true,
  },
  {
    id: 'c-leo',
    name: 'Leo Martins',
    handle: '@leoanddoug',
    location: 'Lisbon, PT',
    gradient: ['var(--g1)', 'var(--g9)'],
    bio: 'Doug is a 12-year-old golden retriever. Leo films their walks.',
    categories: [
      { category: 'Wellness', fit: 88, evidence: 'strong', samples: 18 },
      { category: 'Fashion', fit: 35, evidence: 'insufficient', samples: 1 },
    ],
    strongestFormat: 'Story / emotional arc',
    bestLength: '25–35 sec',
    hookStrength: 'Strong',
    reliability: 91,
    projects: 29,
    avgRoas: 3.8,
    medianCpa: 26,
    rate: 480,
    styles: ['Outdoor', 'Voiceover', 'Pets'],
    hookTypes: [
      { type: 'Pattern interrupt', score: 83 },
      { type: 'Confession', score: 79 },
      { type: 'Question', score: 61 },
      { type: 'Stat shock', score: 40 },
    ],
    available: true,
  },
]

// ─── Hypotheses = UGC adverts. Every launched one has a sourcing mode + timeline. ─

export const hypotheses: Hypothesis[] = [
  {
    id: 'h-1', productId: 'p-lumen', title: 'The over-exfoliation confession',
    angle: 'Confession', format: 'Confession / problem-solution',
    hook: '“I destroyed my skin barrier with a $12 acid and nobody warned me.”',
    story: ['Admit the mistake on camera', 'Show the redness up close', 'Introduce serum as the reset', 'Day-14 mirror check'],
    rationale: 'Top objection is “nothing works”. A confession reframes the problem as a fixable mistake rather than bad skin.',
    confidence: 82, stage: 'learned', creatorIds: ['c-maya'], mode: 'direct',
    timeline: [
      { label: 'Brief sent', date: '2026-08-18' },
      { label: 'Draft due', date: '2026-08-25' },
      { label: 'Final due', date: '2026-08-28', deadline: true },
      { label: 'Go live', date: '2026-08-29' },
    ],
  },
  {
    id: 'h-2', productId: 'p-lumen', title: 'Esthetician whiteboard',
    angle: 'Derm explainer', format: 'Expert explainer',
    hook: '“Your moisturiser can’t fix this. Here’s why.”',
    story: ['Draw the barrier as bricks + mortar', 'Show what acids do', 'Ceramides = mortar', 'Product close-up + texture'],
    rationale: 'Redness-prone segment over-indexes on authority. Visual metaphor travels across languages.',
    confidence: 68, stage: 'testing', creatorIds: ['c-sofia'], mode: 'direct',
    timeline: [
      { label: 'Brief sent', date: '2026-09-22' },
      { label: 'Draft due', date: '2026-09-29' },
      { label: 'Final due', date: '2026-10-02', deadline: true },
      { label: 'Go live', date: '2026-10-05' },
    ],
  },
  {
    id: 'h-3', productId: 'p-lumen', title: 'Three products → one',
    angle: 'Routine replacement', format: 'Shelf clear-out',
    hook: '“I threw out three products this morning.”',
    story: ['Sweep products off the shelf', 'Explain what each did badly', 'One serum replaces them', 'Price comparison overlay'],
    rationale: 'Neutralises the $38 price objection by reframing as a saving.',
    confidence: 61, stage: 'production', creatorIds: ['c-priya'], mode: 'direct',
    timeline: [
      { label: 'Brief sent', date: '2026-10-06' },
      { label: 'Draft due', date: '2026-10-14' },
      { label: 'Final due', date: '2026-10-17', deadline: true },
      { label: 'Go live', date: '2026-10-20' },
    ],
  },
  {
    id: 'h-9', productId: 'p-kindred', title: 'Doug and the stairs',
    angle: 'The stairs moment', format: 'Story / emotional arc',
    hook: 'A senior dog stops at the bottom of the stairs.',
    story: ['Hesitation at the stairs', 'Owner voiceover', 'Six weeks later', 'Dog runs up'],
    rationale: 'The stairs moment is the universal purchase trigger for senior-dog owners — and any dog owner can film it, so it suits an open contest.',
    confidence: 79, stage: 'briefed', creatorIds: [], mode: 'contest', contestId: 'ct-stairs',
    timeline: [
      { label: 'Contest opens', date: '2026-10-08' },
      { label: 'Submissions close', date: '2026-10-20', deadline: true },
      { label: 'Winners announced', date: '2026-10-24' },
      { label: 'Go live', date: '2026-10-27' },
    ],
  },
  {
    id: 'h-10', productId: 'p-kindred', title: 'Picky-eater test',
    angle: 'Picky-eater test', format: 'Reaction',
    hook: '“My dog refuses every treat. Let’s see.”',
    story: ['Dog sniffs and walks away from 3 treats', 'Offer the chew', 'Reaction', 'Pack shot + offer'],
    rationale: 'Answers the #1 objection (“will my dog eat it?”) on camera.',
    confidence: 72, stage: 'draft', creatorIds: [],
  },
]

// ─── Contests ───────────────────────────────────────────────────────────────

export const contests: Contest[] = [
  {
    id: 'ct-stairs',
    productId: 'p-lumen',
    hypothesisId: 'h-1',
    title: 'Show us your barrier reset',
    brief: 'Film your skin before and after two weeks with the serum — same light, same angle, no filters. Real routines, no actors.',
    status: 'open',
    prizes: [
      { place: '1st', amount: 1500 },
      { place: '2nd', amount: 750 },
      { place: '3rd', amount: 400 },
    ],
    rules: ['20–35 seconds, vertical 9:16', 'Real before/after in the same lighting', 'No filters or beauty mode', 'Winners grant usage rights for 12 months'],
    timeline: [
      { label: 'Contest opens', date: '2026-10-08' },
      { label: 'Submissions close', date: '2026-10-20', deadline: true },
      { label: 'Winners announced', date: '2026-10-24' },
      { label: 'Go live', date: '2026-10-27' },
    ],
    entries: [
      {
        id: 'en-1', name: 'Priya Raman', handle: '@priyaathome', gradient: ['var(--g1)', 'var(--g8)'], creatorId: 'c-priya',
        submittedAt: '2026-10-10', duration: 29, hookLine: 'Two weeks ago my cheeks looked like this.', precheck: 91, status: 'shortlisted',
      },
      {
        id: 'en-2', name: 'Hana Sato', handle: '@hana.skin.diary', gradient: ['var(--g2)', 'var(--g7)'],
        submittedAt: '2026-10-09', duration: 24, hookLine: 'Day 1 vs day 14. Same window, same light.', precheck: 84, status: 'submitted',
      },
      {
        id: 'en-3', name: 'Marcus Reid', handle: '@marcusresets', gradient: ['var(--g3)', 'var(--g8)'],
        submittedAt: '2026-10-11', duration: 33, hookLine: 'I thought redness was just my skin type.', precheck: 79, status: 'submitted',
      },
      {
        id: 'en-4', name: 'Elena Petrova', handle: '@elena.glow', gradient: ['var(--g0)', 'var(--g6)'],
        submittedAt: '2026-10-11', duration: 41, hookLine: 'Watch what happens with beauty mode off.', precheck: 58, status: 'declined',
      },
    ],
  },
]

// ─── Creatives (Lumen's four generations) ───────────────────────────────────

/** Smooth, deterministic retention curve: fast early drop, slow tail. */
function curve(hookHold: number, tailDecay: number, seconds = 30): number[] {
  const out: number[] = []
  for (let s = 0; s <= seconds; s++) {
    const early = 100 - (100 - hookHold) * (1 - Math.exp(-s / 1.4))
    out.push(Math.round(early * Math.exp(-tailDecay * s) * 10) / 10)
  }
  return out
}

export const creatives: Creative[] = [
  {
    id: 'cr-247', number: 247, productId: 'p-lumen', creatorId: 'c-maya', hypothesisId: 'h-1',
    title: 'Over-exfoliation confession — v3', hookLine: '“I destroyed my skin barrier with a $12 acid…”',
    format: 'Confession', duration: 22, generation: 4, status: 'winner', launched: '2026-09-14',
    metrics: { spend: 18420, impressions: 1_284_000, thumbstop: 46.2, holdRate: 31.8, ctr: 2.41, cvr: 4.9, cpa: 29, roas: 4.1, revenue: 75_522 },
    retention: curve(62, 0.028),
    genome: { hook: 94, emotion: 89, pacing: 86, productReveal: 92, proof: 88, cta: 81 },
    timeline: [
      { start: 0, end: 3, label: 'Confession hook', kind: 'hook' },
      { start: 3, end: 8, label: 'Redness close-up', kind: 'problem' },
      { start: 8, end: 13, label: 'Serum reveal at 8s', kind: 'reveal' },
      { start: 13, end: 19, label: 'Day-14 mirror check', kind: 'proof' },
      { start: 19, end: 22, label: '“Link’s below”', kind: 'cta' },
    ],
    insights: {
      why: [
        'Confession hook held 62% of viewers past 3s — 1.6× the account median.',
        'Product reveal at 8s landed after the problem was felt, not before.',
        'Day-14 close-up answered the “nothing works” objection with visual proof.',
      ],
      preserve: ['First-person confession in the first 2 seconds', 'Natural bathroom lighting', 'Reveal timing between 7–9s'],
      change: ['CTA is soft — retention drops 9pts in the last 3s', 'Add price anchoring for the 13% gift-buyer segment'],
      testNext: ['Same hook, Sofia Álvarez (expert credibility)', 'Spanish localisation for ES/MX', 'Hard CTA with discount code'],
    },
  },
  {
    id: 'cr-231', number: 231, productId: 'p-lumen', creatorId: 'c-maya', hypothesisId: 'h-1',
    title: 'Over-exfoliation confession — v2', hookLine: '“Nobody told me acids could do this.”',
    format: 'Confession', duration: 27, generation: 3, status: 'live', launched: '2026-08-29',
    metrics: { spend: 12100, impressions: 902_000, thumbstop: 41.0, holdRate: 26.4, ctr: 2.05, cvr: 4.1, cpa: 34, roas: 3.5, revenue: 42_350 },
    retention: curve(57, 0.033),
    genome: { hook: 87, emotion: 84, pacing: 74, productReveal: 80, proof: 85, cta: 76 },
    timeline: [
      { start: 0, end: 3, label: 'Question hook', kind: 'hook' },
      { start: 3, end: 11, label: 'Backstory', kind: 'problem' },
      { start: 11, end: 16, label: 'Reveal at 11s', kind: 'reveal' },
      { start: 16, end: 23, label: 'Day-14 check', kind: 'proof' },
      { start: 23, end: 27, label: 'CTA', kind: 'cta' },
    ],
    insights: {
      why: ['Confession framing outperformed the explainer by 31% on CTR.'],
      preserve: ['Confession framing'],
      change: ['Backstory too long — 3–11s lost 14pts of retention', 'Reveal came 3s too late'],
      testNext: ['Cut backstory to 5s (→ became #247)'],
    },
  },
  {
    id: 'cr-218', number: 218, productId: 'p-lumen', creatorId: 'c-sofia', hypothesisId: 'h-2',
    title: 'Whiteboard barrier explainer', hookLine: '“Your moisturiser can’t fix this.”',
    format: 'Expert explainer', duration: 34, generation: 2, status: 'live', launched: '2026-08-11',
    metrics: { spend: 9400, impressions: 744_000, thumbstop: 36.8, holdRate: 24.1, ctr: 1.72, cvr: 3.6, cpa: 41, roas: 2.9, revenue: 27_260 },
    retention: curve(51, 0.03),
    genome: { hook: 78, emotion: 61, pacing: 70, productReveal: 74, proof: 90, cta: 72 },
    timeline: [
      { start: 0, end: 3, label: 'Contrarian hook', kind: 'hook' },
      { start: 3, end: 18, label: 'Whiteboard', kind: 'problem' },
      { start: 18, end: 24, label: 'Product', kind: 'reveal' },
      { start: 24, end: 30, label: 'Ingredient proof', kind: 'proof' },
      { start: 30, end: 34, label: 'CTA', kind: 'cta' },
    ],
    insights: {
      why: ['Strongest proof score on the account; redness-prone segment converts 1.4× here.'],
      preserve: ['Bricks + mortar metaphor'],
      change: ['Low emotion — add a personal client story', 'Whiteboard section runs long'],
      testNext: ['Hybrid: Maya’s confession hook → Sofia’s explanation'],
    },
  },
  {
    id: 'cr-204', number: 204, productId: 'p-lumen', creatorId: 'c-priya', hypothesisId: 'h-3',
    title: 'Glow routine (gen 1)', hookLine: '“My 5-step glow routine.”',
    format: 'Routine', duration: 31, generation: 1, status: 'fatigued', launched: '2026-07-20',
    metrics: { spend: 6200, impressions: 611_000, thumbstop: 28.4, holdRate: 17.2, ctr: 1.12, cvr: 2.6, cpa: 52, roas: 1.9, revenue: 11_780 },
    retention: curve(41, 0.038),
    genome: { hook: 58, emotion: 55, pacing: 63, productReveal: 66, proof: 52, cta: 70 },
    timeline: [
      { start: 0, end: 3, label: 'Generic hook', kind: 'hook' },
      { start: 3, end: 20, label: 'Five steps', kind: 'problem' },
      { start: 20, end: 25, label: 'Product', kind: 'reveal' },
      { start: 25, end: 31, label: 'CTA', kind: 'cta' },
    ],
    insights: {
      why: ['Baseline. “Glow” language mismatched an audience that wants calm.'],
      preserve: ['Priya’s warm visual style'],
      change: ['Replace glow promise with repair language', 'Single-product focus'],
      testNext: ['Confession angle (→ h-1)'],
    },
  },
]

// ─── Experiments ────────────────────────────────────────────────────────────

export const experiments: Experiment[] = [
  {
    id: 'e-14', productId: 'p-lumen', name: 'Backstory length', variable: 'Pacing — backstory 8s vs 5s',
    generation: 4, status: 'concluded', creativeIds: ['cr-231', 'cr-247'], winnerId: 'cr-247', lift: 14.7,
    confidence: 96, started: '2026-09-14', budget: 30000,
  },
  {
    id: 'e-11', productId: 'p-lumen', name: 'Angle: confession vs explainer', variable: 'Angle',
    generation: 3, status: 'concluded', creativeIds: ['cr-231', 'cr-218'], winnerId: 'cr-231', lift: 17.1,
    confidence: 93, started: '2026-08-29', budget: 21500,
  },
  {
    id: 'e-18', productId: 'p-lumen', name: 'Hook × creator swap', variable: 'Creator (hook held constant)',
    generation: 5, status: 'queued', creativeIds: ['cr-247'], confidence: 0, started: '2026-10-20', budget: 15000,
  },
]

// ─── Next actions ───────────────────────────────────────────────────────────

export const nextActions: NextAction[] = [
  {
    id: 'na-1', kind: 'replicate', productId: 'p-lumen',
    title: 'Replicate #247’s hook with Sofia Álvarez',
    detail: 'Keep the confession hook and 8s reveal; swap creator to test whether expert credibility lifts CVR for the redness-prone segment.',
    basedOn: 'Creative #247 · Experiment E-14', expectedImpact: 'CVR +8–15%', confidence: 78,
  },
  {
    id: 'na-2', kind: 'iterate', productId: 'p-lumen',
    title: 'Harden the CTA on #247',
    detail: 'Retention drops 9pts in the final 3s. Test a direct CTA with a discount code against the current soft close.',
    basedOn: 'Creative Genome · CTA 81', expectedImpact: 'CPA −$2 to −$4', confidence: 72,
  },
  {
    id: 'na-3', kind: 'refresh', productId: 'p-lumen',
    title: 'Retire #204 — fatigue detected',
    detail: 'Frequency 4.8 and CTR down 38% week-over-week. Reallocate $1.2k/week to #247.',
    basedOn: 'Performance Engine', expectedImpact: 'Save $1.2k/wk', confidence: 91,
  },
]

// ─── North star: creative performance lift ─────────────────────────────────

export const liftSeries = [
  { gen: 'Gen 1', cpa: 52 },
  { gen: 'Gen 2', cpa: 41 },
  { gen: 'Gen 3', cpa: 34 },
  { gen: 'Gen 4', cpa: 29 },
]

export const spendSeries = Array.from({ length: 30 }, (_, i) => {
  const d = new Date('2026-09-12')
  d.setDate(d.getDate() + i)
  const base = 900 + i * 28 + Math.sin(i / 2.3) * 110
  const rev = base * (2.3 + i * 0.06 + Math.cos(i / 3) * 0.2)
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    spend: Math.round(base),
    revenue: Math.round(rev),
  }
})

// ─── Activity ───────────────────────────────────────────────────────────────

export const activity: Activity[] = [
  { id: 'a1', at: '2h ago', kind: 'creative', text: 'Marcus Reid entered the “Doug and the stairs” contest.' },
  { id: 'a2', at: '5h ago', kind: 'insight', text: 'Genome updated for #247 — CTA flagged as the weakest gene.' },
  { id: 'a3', at: 'Yesterday', kind: 'alert', text: 'Fatigue detected on #204 — frequency 4.8.' },
  { id: 'a4', at: '2 days ago', kind: 'match', text: 'Priya Raman accepted “Three products → one”. Draft due Oct 14.' },
]

// ─── Creator-side (Maya’s view) ─────────────────────────────────────────────

export const invitations: Invitation[] = [
  {
    id: 'i-1', productId: 'p-lumen', brand: 'Lumen Skin', fee: 650, bonus: '+$400 if CPA < $30',
    matchReason: 'Your confession hooks hold 1.6× longer than average in Skincare.', fit: 92,
    timeline: [
      { label: 'Accept by', date: '2026-10-14' },
      { label: 'Draft due', date: '2026-10-21' },
      { label: 'Final due', date: '2026-10-24', deadline: true },
      { label: 'Go live', date: '2026-10-27' },
    ],
  },
]

// ─── Lookups ────────────────────────────────────────────────────────────────

export const getProduct = (id: string) => products.find(p => p.id === id)
export const getCreator = (id: string) => creators.find(c => c.id === id)
export const getCreative = (id: string) => creatives.find(c => c.id === id)
export const getContest = (id: string) => contests.find(c => c.id === id)

export const workspace = { name: 'Lumen & Co.', plan: 'Performance Lab', user: 'Alex Rivera' }
