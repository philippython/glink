// Demo data, created once on an empty database (disable with SEED_DEMO=false).
// Every demo account uses the password "demo1234".

import { hashPassword } from './auth.ts'
import { config } from './config.ts'
import { all, one, run, tx } from './db.ts'
import { budgetOf, ledgerEntry, matchCampaign, type CampaignRow } from './domain.ts'
import { notify } from './events.ts'
import { briefMatch, formatChecks, scriptChecks } from './preflight.ts'
import { addDays, id, now, today } from './util.ts'

const DEMO_PASSWORD = 'demo1234'
const day = (offset: number) => addDays(today(), offset).slice(0, 10)
const at = (offset: number, time = '10:00:00') => `${day(offset)}T${time}.000Z`

function user(email: string, name: string, role: 'brand' | 'creator') {
  const uid = id('usr')
  run('INSERT INTO users (id, email, name, password_hash, role, onboarded, created_at) VALUES (?,?,?,?,?,1,?)', uid, email, name, hashPassword(DEMO_PASSWORD), role, now())
  return uid
}

function creator(email: string, p: { name: string; handle: string; country: string; niches: string[]; bio: string; rate: number; availability?: string; styles: string[]; prior: Record<string, number>; channels: [string, string, number, boolean][] }) {
  const uid = user(email, p.name, 'creator')
  const cid = id('crt')
  run(`INSERT INTO creator_profiles (id, user_id, display_name, handle, country, niches, bio, base_rate, availability, styles, prior_strengths, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    cid, uid, p.name, p.handle, p.country, JSON.stringify(p.niches), p.bio, p.rate * 100, p.availability ?? 'Available', JSON.stringify(p.styles), JSON.stringify(p.prior), now())
  for (const [platform, handle, followers, verified] of p.channels) run('INSERT INTO social_channels (id, creator_id, platform, handle, followers, verified) VALUES (?,?,?,?,?,?)', id('chn'), cid, platform, handle, followers, verified ? 1 : 0)
  return cid
}

interface CampaignSeed {
  name: string; product: string; category: string; goal: string; market: string; tc: string[]; angle: string; opening: string; flow: string[]
  must: string[]; avoid: string[]; d: { count: number; aspectRatio: string; minSec: number; maxSec: number; rawFootage: boolean }
  fee: number; bonus: number; wanted: number; sourcing: 'auto' | 'handpick' | 'contest'; prizes?: number[]
  timeline: { label: string; date: string; deadline?: boolean }[]; status: 'live' | 'completed'; createdAt: string
}

function campaign(brandId: string, by: string, s: CampaignSeed) {
  const cid = id('cmp')
  run(`INSERT INTO campaigns (id, brand_id, name, product, category, goal, market, target_customers, creative_angle, suggested_opening, story_flow, must_include, avoid,
    deliverables, base_fee, bonus_amount, bonus_rule, benchmark_ctr, creators_wanted, sourcing, prizes, timeline, status, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  cid, brandId, s.name, s.product, s.category, s.goal, s.market, JSON.stringify(s.tc), s.angle, s.opening, JSON.stringify(s.flow), JSON.stringify(s.must), JSON.stringify(s.avoid),
  JSON.stringify(s.d), s.fee * 100, s.bonus * 100, 'Beats your click-through benchmark within 14 days', 1.8, s.wanted, s.sourcing, JSON.stringify((s.prizes ?? []).map(p => p * 100)),
  JSON.stringify(s.timeline), s.status, by, s.createdAt)
  const row = one<CampaignRow>('SELECT * FROM campaigns WHERE id = ?', cid)!
  ledgerEntry(brandId, 'hold', -budgetOf(row), `Escrow for ${s.name}`, cid)
  return cid
}

function setMatch(campaignId: string, creatorId: string, status: string, respondedOffset?: number) {
  run('UPDATE matches SET status = ?, invited_at = ?, responded_at = ? WHERE campaign_id = ? AND creator_id = ?', status, at(-7), respondedOffset === undefined ? null : at(respondedOffset), campaignId, creatorId)
  return one<{ id: string }>('SELECT id FROM matches WHERE campaign_id = ? AND creator_id = ?', campaignId, creatorId)!.id
}

function submission(campaignId: string, matchId: string, creatorId: string, idx: number, s: { status: string; file?: string; duration?: number; script?: string; submitted?: string; approved?: string; winning?: boolean; metrics?: object }) {
  const camp = one<CampaignRow>('SELECT * FROM campaigns WHERE id = ?', campaignId)!
  const brief = { mustInclude: JSON.parse(camp.must_include), avoid: JSON.parse(camp.avoid), deliverables: JSON.parse(camp.deliverables) }
  const items = s.duration ? [...formatChecks(brief, { duration: s.duration, width: 1080, height: 1920, mime: 'video/mp4' }), ...scriptChecks(brief, s.script, s.duration)] : []
  const bm = items.length ? briefMatch(items) : null
  const sid = id('sub')
  run(`INSERT INTO submissions (id, match_id, campaign_id, creator_id, idx, file_name, mime, duration, width, height, script, preflight, brief_match, ai_feedback, status, submitted_at, approved_at, attempts, winning, metrics)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  sid, matchId, campaignId, creatorId, idx, s.file ?? null, s.file ? 'video/mp4' : null, s.duration ?? null, s.duration ? 1080 : null, s.duration ? 1920 : null,
  s.script ?? null, JSON.stringify(items), bm?.score ?? null, bm?.feedback ?? null, s.status, s.submitted ?? null, s.approved ?? null, s.duration ? 1 : 0, s.winning ? 1 : 0,
  s.metrics ? JSON.stringify({ ...s.metrics, recordedAt: now() }) : null)
  return sid
}

function payment(creatorId: string, brandId: string, campaignId: string, subId: string, kind: 'base' | 'bonus', amount: number, status: string, createdOffset: number) {
  run('INSERT INTO payments (id, creator_id, brand_id, campaign_id, submission_id, kind, amount, status, available_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    id('pay'), creatorId, brandId, campaignId, subId, kind, amount * 100, status, at(createdOffset + 3), at(createdOffset))
}

export function seedDemo() {
  if (one('SELECT 1 FROM users LIMIT 1')) return
  tx(() => {
    // Brand + team
    const alex = user('alex@lumenskin.com', 'Alex Rivera', 'brand')
    const sam = user('sam@lumenskin.com', 'Sam Lee', 'brand')
    const brand = id('brd')
    run('INSERT INTO brands (id, name, country, description, target_customers, created_at) VALUES (?,?,?,?,?,?)', brand, 'Lumen Skin', 'United States', 'Fragrance-free skincare for sensitised skin.', JSON.stringify(['Over-exfoliators', 'Sensitive skin']), now())
    run("INSERT INTO brand_members (brand_id, user_id, email, role, pending, created_at) VALUES (?,?,?,'Owner',0,?)", brand, alex, 'alex@lumenskin.com', now())
    run("INSERT INTO brand_members (brand_id, user_id, email, role, pending, created_at) VALUES (?,?,?,'Reviewer',0,?)", brand, sam, 'sam@lumenskin.com', now())
    run("INSERT INTO brand_members (brand_id, user_id, email, role, pending, created_at) VALUES (?,NULL,?,'Manager',1,?)", brand, 'jordan@lumenskin.com', now())
    ledgerEntry(brand, 'topup', 1_500_000, 'Wallet top-up (test funds)')

    // Creators
    const maya = creator('maya@example.com', { name: 'Maya Chen', handle: '@mayamakesitsimple', country: 'Canada', niches: ['Skincare', 'Wellness'], bio: 'Honest skincare with a “here’s what I got wrong” lens.', rate: 380, styles: ['Confession Hooks', 'Problem/Solution', 'Natural Demonstrations'], prior: { hook: 85, retention: 78, conversion: 80, reliability: 95 }, channels: [['TikTok', '@mayamakesitsimple', 48200, true], ['Instagram', '@maya.chen', 12900, false]] })
    const sofia = creator('sofia@example.com', { name: 'Sofia Álvarez', handle: '@sofi.skin', country: 'Spain', niches: ['Skincare'], bio: 'Licensed esthetician. Ingredients explained with a whiteboard.', rate: 420, styles: ['Explainer', 'Testimonial'], prior: { hook: 74, retention: 86, conversion: 82, reliability: 95 }, channels: [['Instagram', '@sofi.skin', 31500, true]] })
    const priya = creator('priya@example.com', { name: 'Priya Raman', handle: '@priyaathome', country: 'United Kingdom', niches: ['Wellness', 'Skincare'], bio: 'Slow-living home rituals in warm light.', rate: 350, availability: 'Limited', styles: ['Routine', 'ASMR'], prior: { hook: 70, retention: 88, conversion: 68, reliability: 98 }, channels: [['YouTube', '@priyaathome', 22000, false]] })
    const leo = creator('leo@example.com', { name: 'Leo Martins', handle: '@leoanddoug', country: 'Portugal', niches: ['Pets', 'Wellness'], bio: 'Doug is a 12-year-old golden retriever. Leo films their walks.', rate: 300, styles: ['Storytelling', 'Voiceover'], prior: { hook: 80, retention: 76, conversion: 64, reliability: 90 }, channels: [['TikTok', '@leoanddoug', 88100, true]] })

    const d2 = { count: 2, aspectRatio: '9:16', minSec: 15, maxSec: 30, rawFootage: false }
    const d1 = { ...d2, count: 1 }

    // A finished campaign gives Maya a real track record (and a winning video).
    const confession = campaign(brand, alex, {
      name: 'Confession hooks, round 1', product: 'Barrier Repair Serum', category: 'Skincare', goal: 'Purchases', market: 'United States', tc: ['Over-exfoliators'],
      angle: 'Testimonial', opening: 'Nobody told me acids could do this.', flow: ['Setup', 'Process', 'Result'], must: ['Show the product by 8s'], avoid: ['Competitor brand names'],
      d: d1, fee: 450, bonus: 200, wanted: 1, sourcing: 'handpick', status: 'completed', createdAt: at(-60),
      timeline: [{ label: 'Brief sent', date: day(-60) }, { label: 'Final due', date: day(-50), deadline: true }, { label: 'Go live', date: day(-49) }],
    })
    matchCampaign(confession)
    const mConf = setMatch(confession, maya, 'accepted', -59)
    const s1 = submission(confession, mConf, maya, 1, { status: 'paid', file: 'confession_v3.mp4', duration: 22, submitted: at(-52), approved: at(-51), winning: true,
      script: 'Nobody told me acids could do this. I destroyed my skin barrier. This serum calmed it in two weeks.',
      metrics: { impressions: 1_284_000, clicks: 30_950, conversions: 635, spend: 1_842_000, thumbstop: 46.2, holdRate: 31.8 } })
    payment(maya, brand, confession, s1, 'base', 450, 'paid_out', -51)
    payment(maya, brand, confession, s1, 'bonus', 200, 'paid_out', -45)

    // Live, auto-matched campaign with work in every state.
    const serum = campaign(brand, alex, {
      name: '14-day barrier reset', product: 'Barrier Repair Serum', category: 'Skincare', goal: 'Purchases', market: 'United States', tc: ['Over-exfoliators', 'Sensitive skin'],
      angle: 'Problem-solution', opening: 'I destroyed my skin barrier with a $12 acid.', flow: ['Setup', 'Process', 'Result'],
      must: ['Show the serum’s texture on skin', 'Say it’s fragrance-free', 'Day-14 close-up'], avoid: ['Background music over your voice', '“Miracle” or “cure” claims', 'Competitor brand names'],
      d: d2, fee: 380, bonus: 150, wanted: 4, sourcing: 'handpick', status: 'live', createdAt: at(-7),
      timeline: [{ label: 'Brief sent', date: day(-7) }, { label: 'Draft due', date: day(3) }, { label: 'Final due', date: day(7), deadline: true }, { label: 'Go live', date: day(10) }],
    })
    matchCampaign(serum)
    run("UPDATE campaigns SET sourcing = 'auto' WHERE id = ?", serum)
    const mMaya = setMatch(serum, maya, 'accepted', -6)
    const mSofia = setMatch(serum, sofia, 'accepted', -6)
    setMatch(serum, priya, 'invited')
    setMatch(serum, leo, 'declined', -5)
    const s2 = submission(serum, mMaya, maya, 1, { status: 'approved', file: 'barrier_reset_1.mp4', duration: 24, submitted: at(-3), approved: at(-2),
      script: 'I destroyed my skin barrier with a $12 acid. It is fragrance-free and the texture melts in. Day 14, look.',
      metrics: { impressions: 182_000, clicks: 3_494, conversions: 71, spend: 241_400, thumbstop: 41.0, holdRate: 27.5 } })
    payment(maya, brand, serum, s2, 'base', 380, 'available', -2)
    submission(serum, mMaya, maya, 2, { status: 'not_started' })
    submission(serum, mSofia, sofia, 1, { status: 'submitted', file: 'sofia_whiteboard.mp4', duration: 27, submitted: new Date(Date.now() - 2 * 3600_000).toISOString(),
      script: 'Your moisturiser can’t fix this. Ceramides rebuild the barrier. It’s fragrance-free, so it won’t sting.' })
    submission(serum, mSofia, sofia, 2, { status: 'submitted', file: 'sofia_dayfourteen.mp4', duration: 25, submitted: new Date(Date.now() - 3600_000).toISOString(),
      script: 'Day fourteen. This is a miracle for my skin, honestly. Fragrance-free and gentle.' })

    // A new match waiting for Maya, and an open contest.
    const night = campaign(brand, alex, {
      name: 'Night routine, live demo', product: 'Overnight Recovery Mask', category: 'Skincare', goal: 'Content testing', market: 'United Kingdom', tc: ['Busy professionals', 'Sensitive skin'],
      angle: 'Demonstration', opening: 'This is the only step I never skip.', flow: ['Setup', 'Process', 'Result'], must: ['Apply on camera, no cuts', 'Show the morning result'], avoid: ['Filters or beauty mode', 'Medical claims'],
      d: { ...d1, rawFootage: true }, fee: 400, bonus: 200, wanted: 3, sourcing: 'handpick', status: 'live', createdAt: at(-1),
      timeline: [{ label: 'Accept by', date: day(7) }, { label: 'Draft due', date: day(31) }, { label: 'Final due', date: day(38), deadline: true }, { label: 'Go live', date: day(42) }],
    })
    matchCampaign(night)
    setMatch(night, maya, 'invited'); setMatch(night, sofia, 'invited')

    campaign(brand, alex, {
      name: 'Show us your barrier reset', product: 'Barrier Repair Serum', category: 'Skincare', goal: 'Awareness', market: 'United States', tc: ['Sensitive skin'],
      angle: 'Testimonial', opening: 'Two weeks ago my skin looked like this.', flow: ['Before', 'Routine', 'After'], must: ['Real before/after, same lighting'], avoid: ['Filters or beauty mode'],
      d: { ...d1, minSec: 20, maxSec: 35 }, fee: 0, bonus: 0, wanted: 3, sourcing: 'contest', prizes: [1500, 750, 400], status: 'live', createdAt: at(-5),
      timeline: [{ label: 'Contest opens', date: day(-5) }, { label: 'Submissions close', date: day(7), deadline: true }, { label: 'Winners announced', date: day(11) }, { label: 'Go live', date: day(14) }],
    })

    const [alexId, mayaUser] = [alex, one<{ user_id: string }>('SELECT user_id FROM creator_profiles WHERE id = ?', maya)!.user_id]
    notify([alexId, sam], { title: 'Sofia Álvarez submitted 2 videos', body: '14-day barrier reset · 1 has a pre-flight issue', link: '/brand/reviews' })
    notify([mayaUser], { title: 'New campaign match: Lumen Skin', body: 'Night routine, live demo · $400 + $200 bonus', link: '/creator/opportunities' })
  })
  console.log('Seeded demo data. Log in as alex@lumenskin.com (brand) or maya@example.com (creator), password "demo1234".')
}

/** New brands get test funds and one sample campaign so the dashboard isn't empty. */
export function seedForNewBrand(brandId: string, userId: string) {
  // Without test funds there is nothing to hold a sample campaign’s budget against.
  if (!config.allowTestFunds || one('SELECT 1 FROM campaigns WHERE brand_id = ?', brandId)) return
  ledgerEntry(brandId, 'topup', 500_000, 'Welcome credit (test funds)')
  const b = one<{ country: string; target_customers: string }>('SELECT country, target_customers FROM brands WHERE id = ?', brandId)!
  const cid = campaign(brandId, userId, {
    name: 'Sample: your first campaign', product: 'Your hero product', category: 'Skincare', goal: 'Purchases', market: b.country, tc: JSON.parse(b.target_customers),
    angle: 'Problem-solution', opening: 'I tried everything before this.', flow: ['Setup', 'Process', 'Result'], must: ['Show the product by 8s'], avoid: ['Competitor brand names'],
    d: { count: 1, aspectRatio: '9:16', minSec: 15, maxSec: 30, rawFootage: false }, fee: 300, bonus: 100, wanted: 2, sourcing: 'handpick', status: 'live', createdAt: now(),
    timeline: [{ label: 'Brief sent', date: day(0) }, { label: 'Draft due', date: day(10) }, { label: 'Final due', date: day(14), deadline: true }, { label: 'Go live', date: day(17) }],
  })
  matchCampaign(cid)
}

/** New creators get matched to live campaigns right away; the best fit sends an invite. */
export function seedForNewCreator(creatorId: string) {
  const live = all<{ id: string }>("SELECT id FROM campaigns WHERE status = 'live' AND sourcing != 'contest'")
  for (const c of live) matchCampaign(c.id)
  const best = one<{ campaign_id: string }>("SELECT campaign_id FROM matches WHERE creator_id = ? AND status = 'suggested' ORDER BY score DESC LIMIT 1", creatorId)
  if (best) {
    run("UPDATE matches SET status = 'invited', invited_at = ? WHERE campaign_id = ? AND creator_id = ?", now(), best.campaign_id, creatorId)
    const camp = one<{ name: string; brand_id: string }>('SELECT name, brand_id FROM campaigns WHERE id = ?', best.campaign_id)!
    const brand = one<{ name: string }>('SELECT name FROM brands WHERE id = ?', camp.brand_id)!
    const u = one<{ user_id: string }>('SELECT user_id FROM creator_profiles WHERE id = ?', creatorId)!
    notify([u.user_id], { title: `New campaign match: ${brand.name}`, body: camp.name, link: `/creator/opportunities/${best.campaign_id}` })
  }
}
