import { motion } from 'framer-motion'
import { Check, Lock, Search } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { OpportunityCard } from '../../components/OpportunityCard'
import { TagPicker } from '../../components/TagPicker'
import { SubmissionTimeline } from '../../components/ui'
import {
  Button, ErrorBanner, Field, Input, KV, Label, ListEditor, PageHeader, Panel, Segmented, Select, useToast,
} from '../../components/kit'
import {
  audienceSuggestions, BONUS_METRIC_KEYS, BONUS_METRICS, CATEGORIES, CATEGORY_INFO, COUNTRIES, describeBonus, GOAL_NAMES, GOALS, goalsFor,
  type BonusMetric, type Campaign, type FieldErrors, type Goal, type Sourcing,
} from '../../data/market'
import { products as productCatalog, TODAY } from '../../data/seed'
import { type CampaignDraft, useStore } from '../../data/store'
import type { Milestone } from '../../data/types'
import { ApiError, errorMessage } from '../../lib/api'
import { cx, fmtDate, money } from '../../lib/format'

const STEPS = ['Basics', 'Creative brief', 'Budget and creators', 'Review and launch'] as const
const ANGLES = ['Demonstration', 'Problem-solution', 'Testimonial', 'Unboxing']
const WINDOWS = [7, 14, 21, 30, 45, 60, 90]

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Every advert gets a submission timeline built from its deadline. */
function buildTimeline(deadline: string, sourcing: Sourcing): Milestone[] {
  if (!deadline) return []
  return sourcing === 'contest'
    ? [{ label: 'Contest opens', date: TODAY }, { label: 'Submissions close', date: deadline, deadline: true }, { label: 'Winners announced', date: addDays(deadline, 4) }, { label: 'Go live', date: addDays(deadline, 7) }]
    : [{ label: 'Brief sent', date: TODAY }, { label: 'Draft due', date: addDays(deadline, -4) }, { label: 'Final due', date: deadline, deadline: true }, { label: 'Go live', date: addDays(deadline, 3) }]
}

export default function NewCampaign() {
  const { state, launchCampaign } = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [busy, setBusy] = useState(false)
  const [catQuery, setCatQuery] = useState('')
  const [allGoals, setAllGoals] = useState(false)
  const presetAngle = params.get('angle') ?? 'Demonstration'

  const [d, setD] = useState({
    name: '', product: '', category: '', market: state.brand.country, targetCustomers: [...state.brand.targetCustomers], deadline: addDays(TODAY, 14),
    goal: '' as Goal | '', angle: ANGLES.includes(presetAngle) ? presetAngle : 'custom', customAngle: ANGLES.includes(presetAngle) ? '' : presetAngle,
    opening: params.get('opening') ?? '', storyFlow: ['Setup', 'Process', 'Result'], mustInclude: [] as string[], avoid: [] as string[],
    count: 2, aspectRatio: '9:16', minSec: 15, maxSec: 30, rawFootage: false,
    sourcing: 'auto' as Sourcing, baseFee: 380, bonusAmount: 150, bonusMetric: 'ctr' as BonusMetric, bonusThreshold: 1.8, bonusWindowDays: 14, creatorsWanted: 4,
    prizes: [1500, 750, 400],
  })
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD(x => ({ ...x, [k]: v }))

  const contest = d.sourcing === 'contest'
  const recommended = d.category ? goalsFor(d.category) : []
  const goalOptions = allGoals ? GOAL_NAMES : recommended
  const chooseCategory = (c: string) => setD(x => ({ ...x, category: c, goal: x.goal && goalsFor(c).includes(x.goal as Goal) ? x.goal : goalsFor(c)[0] }))
  const chooseMetric = (m: BonusMetric) => setD(x => ({ ...x, bonusMetric: m, bonusThreshold: BONUS_METRICS[m].suggested }))
  const bonusRuleText = describeBonus(d.bonusMetric, d.bonusThreshold, d.bonusWindowDays)
  const suggestedName = d.product.trim() ? `${d.product.trim().split(' (')[0]} · ${d.goal || 'Campaign'}` : ''
  const visibleCategories = CATEGORIES.filter(c => c.toLowerCase().includes(catQuery.trim().toLowerCase()))
  const draft: CampaignDraft = useMemo(() => ({
    name: d.name.trim() || suggestedName, product: d.product.trim(), category: d.category, goal: (d.goal || 'Purchases') as Goal, market: d.market, targetCustomers: d.targetCustomers,
    creativeAngle: d.angle === 'custom' ? d.customAngle.trim() : d.angle, suggestedOpening: d.opening.trim(), storyFlow: d.storyFlow,
    mustInclude: d.mustInclude, avoid: d.avoid,
    deliverables: { count: d.count, aspectRatio: d.aspectRatio, minSec: d.minSec, maxSec: d.maxSec, rawFootage: d.rawFootage },
    baseFee: contest ? 0 : d.baseFee, bonusAmount: contest ? 0 : d.bonusAmount,
    bonusRule: contest ? `Prize pool: ${d.prizes.map(p => money(p)).join(' / ')}` : describeBonus(d.bonusMetric, d.bonusThreshold, d.bonusWindowDays),
    benchmarkCtr: d.bonusMetric === 'ctr' ? d.bonusThreshold : 1.8, bonusMetric: d.bonusMetric, bonusThreshold: d.bonusThreshold, bonusWindowDays: d.bonusWindowDays,
    prizes: contest ? d.prizes : [],
    creatorsWanted: contest ? d.prizes.length : d.creatorsWanted, sourcing: d.sourcing, timeline: buildTimeline(d.deadline, d.sourcing),
  }), [d, contest, suggestedName])

  const budget = contest ? d.prizes.reduce((a, b) => a + b, 0) : d.baseFee * d.count * d.creatorsWanted
  const maxBonus = contest ? 0 : d.bonusAmount * d.count * d.creatorsWanted

  const validate = (s: number): FieldErrors => {
    const e: FieldErrors = {}
    if (s === 0) {
      if (!d.category) e.category = 'Choose what you’re promoting — matching uses it to find creators.'
      else if (!d.goal) e.goal = 'Choose what this campaign should achieve.'
      if (!d.name.trim() && !suggestedName) e.name = 'Give the campaign a name.'
      if (!d.product.trim()) e.product = 'Say which product or service this is for.'
      if (!d.market) e.market = 'Choose a market.'
      if (!d.targetCustomers.length) e.targetCustomers = 'Add at least one target customer.'
      if (!d.deadline || d.deadline <= addDays(TODAY, 4)) e.deadline = `Pick a deadline after ${fmtDate(addDays(TODAY, 4))} so creators have time for a draft.`
    }
    if (s === 1) {
      if (d.angle === 'custom' && !d.customAngle.trim()) e.angle = 'Describe your custom angle.'
      if (!d.opening.trim()) e.opening = 'Write the first line creators say on camera.'
      if (d.storyFlow.length < 2) e.storyFlow = 'Add at least two story steps.'
      if (d.minSec >= d.maxSec) e.length = 'Minimum length must be shorter than maximum.'
    }
    if (s === 2 && contest && budget > state.wallet) e.wallet = `The prize pool needs ${money(budget)} in escrow but your wallet has ${money(state.wallet)}. Add funds in Billing.`
    if (s === 2 && !contest) {
      if (d.baseFee < 50) e.baseFee = 'Base fee must be at least $50.'
      if (d.creatorsWanted < 1) e.creatorsWanted = 'You need at least one creator.'
      if (d.bonusAmount > 0 && !(d.bonusThreshold > 0)) e.bonusThreshold = 'Enter the result that earns the bonus.'
      if (!(d.bonusWindowDays >= 1 && d.bonusWindowDays <= 90)) e.bonusWindowDays = 'Choose a window between 1 and 90 days.'
      if (budget + maxBonus > state.wallet) e.wallet = `This needs ${money(budget + maxBonus)} in escrow (fees plus maximum bonuses) but your wallet has ${money(state.wallet)}. Lower the budget or add funds in Billing.`
    }
    return e
  }

  const next = (e?: FormEvent) => {
    e?.preventDefault()
    const errs = validate(step)
    setErrors(errs)
    if (!Object.keys(errs).length) setStep(s => Math.min(s + 1, 3))
  }

  // Which step owns each server-side field, so errors send you back to the right place.
  const stepOf = (field: string) => (['name', 'product', 'category', 'goal', 'market', 'targetCustomers', 'deadline', 'timeline'].some(f => field.startsWith(f)) ? 0
    : ['creativeAngle', 'suggestedOpening', 'storyFlow', 'mustInclude', 'avoid', 'deliverables'].some(f => field.startsWith(f)) ? 1 : 2)

  const launch = async () => {
    setBusy(true)
    try {
      const c = await launchCampaign(draft)
      toast(`${draft.name} is live`)
      navigate(c.sourcing === 'contest' ? '/brand/contests' : `/brand/creators?campaign=${c.id}`)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) {
        const fields = { ...err.fields }
        if (fields.wallet) fields.wallet = err.message
        setErrors(fields)
        setStep(Math.min(...Object.keys(fields).map(stepOf)))
      } else setErrors({ wallet: errorMessage(err) })
    } finally { setBusy(false) }
  }

  const previewCampaign = { ...draft, id: 'preview', brandId: state.brand.id, brandName: state.brand.name, status: 'draft', createdAt: TODAY, deadline: d.deadline } as Campaign

  return (
    <>
      <PageHeader title="New campaign" subtitle="Write the brief once. We match it to creators whose proven strengths fit." back={{ to: '/brand/campaigns', label: 'Campaigns' }} />

      {/* Step bar */}
      <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" disabled={i > step} onClick={() => setStep(i)} className="w-full text-left disabled:cursor-default">
              <div className={cx('h-1 rounded-full', i <= step ? 'bg-primary' : 'bg-track')} />
              <div className={cx('mt-2 text-[12.5px]', i === step ? 'font-medium text-fg' : i < step ? 'text-muted' : 'text-faint')}>
                <span className="hidden sm:inline">{i + 1}. </span>{s}
              </div>
            </button>
          </li>
        ))}
      </ol>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <form onSubmit={next} noValidate>
          <motion.div key={step} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
            <Panel className="space-y-5">
              {Object.keys(errors).length > 0 && <ErrorBanner>{errors.wallet ?? 'Please fix the highlighted fields before continuing.'}{!errors.wallet && Object.keys(errors).some(k => !['name', 'product', 'category', 'goal', 'market', 'targetCustomers', 'deadline', 'angle', 'opening', 'storyFlow', 'length', 'baseFee', 'creatorsWanted', 'bonusThreshold', 'bonusWindowDays'].includes(k)) && <div className="mt-1">{Object.values(errors).join(' ')}</div>}</ErrorBanner>}
              {!state.permissions.canSpend && <ErrorBanner>Reviewers can’t launch campaigns. Ask your brand owner or a manager.</ErrorBanner>}

              {step === 0 && (
                <>
                  {/* 1 — What are you promoting? */}
                  <div>
                    <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                      <div><div className="text-[14px] font-medium text-fg">What are you promoting?</div><div className="text-[12.5px] text-muted">Matching uses this to find creators with proven work in the area.</div></div>
                      <label className="flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2.5 text-[13px] focus-within:border-violet">
                        <Search size={13} className="text-faint" /><input value={catQuery} onChange={e => setCatQuery(e.target.value)} placeholder="Search categories" aria-label="Search categories" className="w-36 bg-transparent outline-none placeholder:text-faint" />
                      </label>
                    </div>
                    <div id="category" className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Category">
                      {visibleCategories.map(c => (
                        <button key={c} type="button" role="radio" aria-checked={d.category === c} onClick={() => chooseCategory(c)}
                          className={cx('h-8 rounded-full border px-3 text-[13px] transition', d.category === c ? 'border-violet bg-violet font-medium text-pure-white' : 'border-line-strong bg-surface text-fg hover:border-violet')}>
                          {c}
                        </button>
                      ))}
                      {!visibleCategories.length && <span className="text-[13px] text-faint">No category matches “{catQuery}”.</span>}
                    </div>
                    {errors.category && <p className="mt-1.5 text-[12.5px] text-danger">{errors.category}</p>}
                  </div>

                  {/* 2 — What should it achieve? (depends on the category) */}
                  {d.category && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                        <div><div className="text-[14px] font-medium text-fg">What should it achieve?</div><div className="text-[12.5px] text-muted">{allGoals ? 'Every goal' : `Goals that work best for ${d.category}`}. This decides which creator strengths count most.</div></div>
                        <button type="button" onClick={() => setAllGoals(v => !v)} className="text-[12.5px] font-medium text-violet hover:underline">{allGoals ? `Show ${d.category} goals` : 'Show all goals'}</button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Goal">
                        {goalOptions.map(g => (
                          <button key={g} type="button" role="radio" aria-checked={d.goal === g} onClick={() => set('goal', g)}
                            className={cx('relative rounded-xl border p-3 text-left transition', d.goal === g ? 'border-violet bg-tint-violet' : 'border-line-strong bg-surface hover:border-violet')}>
                            {d.goal === g && <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-violet text-pure-white"><Check size={12} strokeWidth={3} /></span>}
                            {!allGoals && recommended[0] === g && <span className="mb-1 inline-block rounded-full bg-lime px-1.5 py-px text-[10px] font-semibold text-pure-black">Top pick</span>}
                            <div className="pr-6 text-[13.5px] font-medium text-fg">{g}</div>
                            <div className="mt-0.5 text-[12px] leading-snug text-muted">{GOALS[g].hint}</div>
                          </button>
                        ))}
                      </div>
                      {errors.goal && <p className="mt-1.5 text-[12.5px] text-danger">{errors.goal}</p>}
                    </motion.div>
                  )}

                  {/* 3 — The details */}
                  {d.goal && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-5 border-t border-line pt-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Product or service" htmlFor="product" error={errors.product} hint="Pick one you’ve analysed, or type a new one.">
                          <Input id="product" list="product-list" value={d.product} onChange={e => set('product', e.target.value)} invalid={!!errors.product} placeholder={`e.g. your ${d.category.toLowerCase()} product`} />
                          <datalist id="product-list">{productCatalog.map(p => <option key={p.id} value={`${p.name} (${p.category.toLowerCase()})`} />)}</datalist>
                        </Field>
                        <Field label="Campaign name" htmlFor="name" error={errors.name} hint={suggestedName ? 'Leave blank to use the suggestion.' : undefined}>
                          <Input id="name" value={d.name} onChange={e => set('name', e.target.value)} invalid={!!errors.name} placeholder={suggestedName || 'e.g. Spring launch'} />
                        </Field>
                      </div>
                      <Field label="Market" htmlFor="market" error={errors.market} hint="Where the ads will run. Type to jump to a country.">
                        <Select id="market" value={d.market} onChange={e => set('market', e.target.value)} invalid={!!errors.market}>
                          <option value="">Choose a country</option>{COUNTRIES.map(c => <option key={c}>{c}</option>)}
                        </Select>
                      </Field>
                      <Field label="Target customers" htmlFor="tc" error={errors.targetCustomers} hint="Search the list or type your own and press Enter.">
                        <TagPicker id="tc" value={d.targetCustomers} onChange={v => set('targetCustomers', v)} suggestions={audienceSuggestions(d.category)}
                          quick={CATEGORY_INFO[d.category]?.customers ?? []} quickLabel={`Popular for ${d.category}`} invalid={!!errors.targetCustomers} />
                      </Field>
                      <Field label="Submission deadline" htmlFor="deadline" error={errors.deadline} hint="Creators submit their final video by this date.">
                        <Input id="deadline" type="date" value={d.deadline} min={addDays(TODAY, 5)} onChange={e => set('deadline', e.target.value)} invalid={!!errors.deadline} className="max-w-[220px]" />
                      </Field>
                      {draft.timeline.length > 0 && (
                        <div className="rounded-xl border border-line px-4 pb-2 pt-5"><SubmissionTimeline key={d.deadline + d.sourcing} milestones={draft.timeline} /></div>
                      )}
                    </motion.div>
                  )}
                </>
              )}

              {step === 1 && (
                <>
                  <div className="flex flex-wrap gap-2 text-[12.5px]"><span className="rounded-full bg-subtle px-2.5 py-1 text-muted">{d.category}</span><span className="rounded-full bg-tint-violet px-2.5 py-1 text-fg">Goal: {d.goal}</span></div>
                  <Field label="Creative angle" error={errors.angle}>
                    <Segmented value={d.angle} onChange={v => set('angle', v)} options={[...ANGLES.map(a => ({ value: a, label: a }))]} />
                    <div className="flex items-center gap-2 pt-1">
                      <button type="button" onClick={() => set('angle', 'custom')} className={cx('text-[13px]', d.angle === 'custom' ? 'font-medium text-fg' : 'text-muted hover:text-fg')}>Custom angle:</button>
                      <Input value={d.customAngle} onFocus={() => set('angle', 'custom')} onChange={e => set('customAngle', e.target.value)} placeholder="e.g. Day-in-the-life" invalid={!!errors.angle} />
                    </div>
                  </Field>
                  <Field label="Suggested opening" htmlFor="opening" error={errors.opening} hint="The first line creators say on camera.">
                    <Input id="opening" value={d.opening} onChange={e => set('opening', e.target.value)} invalid={!!errors.opening} className="font-serif text-[16px]" placeholder="“This is the only step I never skip.”" />
                  </Field>
                  <Field label="Story flow" error={errors.storyFlow}><ListEditor ordered items={d.storyFlow} onChange={v => set('storyFlow', v)} placeholder="Add a step" /></Field>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Must include"><ListEditor tone="success" items={d.mustInclude} onChange={v => set('mustInclude', v)} placeholder="e.g. Show the texture" /></Field>
                    <Field label="Avoid"><ListEditor tone="danger" items={d.avoid} onChange={v => set('avoid', v)} placeholder="e.g. Medical claims" /></Field>
                  </div>
                  <div>
                    <Label className="mb-3">Deliverables</Label>
                    <div className="grid gap-4 sm:grid-cols-4">
                      <Field label="Videos" htmlFor="count"><Input id="count" type="number" min={1} max={10} value={d.count} onChange={e => set('count', Math.max(1, +e.target.value))} /></Field>
                      <Field label="Aspect ratio" htmlFor="ar"><Select id="ar" value={d.aspectRatio} onChange={e => set('aspectRatio', e.target.value)}>{['9:16', '1:1', '4:5', '16:9'].map(a => <option key={a}>{a}</option>)}</Select></Field>
                      <Field label="Min seconds" htmlFor="min" error={errors.length}><Input id="min" type="number" min={5} value={d.minSec} onChange={e => set('minSec', +e.target.value)} invalid={!!errors.length} /></Field>
                      <Field label="Max seconds" htmlFor="max"><Input id="max" type="number" min={6} value={d.maxSec} onChange={e => set('maxSec', +e.target.value)} invalid={!!errors.length} /></Field>
                    </div>
                    <label className="mt-4 flex items-center gap-2.5 text-[13.5px] text-fg">
                      <input type="checkbox" checked={d.rawFootage} onChange={e => set('rawFootage', e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
                      Also ask for raw footage
                    </label>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <Field label="How should we find creators?">
                    <Segmented cols={3} value={d.sourcing} onChange={v => set('sourcing', v)} options={[
                      { value: 'auto', label: 'Auto-match', hint: 'We invite the best fits' },
                      { value: 'handpick', label: 'Hand-pick', hint: 'You choose from matches' },
                      { value: 'contest', label: 'Contest', hint: 'Open call, pay winners' },
                    ]} />
                  </Field>
                  {contest ? (
                    <Field label="Prize pool" hint="Only winners are paid. Winners are picked after submissions close.">
                      <div className="grid grid-cols-3 gap-3">
                        {d.prizes.map((p, i) => (
                          <div key={i}><div className="mb-1 text-[12px] text-faint">{['1st', '2nd', '3rd'][i]}</div>
                            <Input type="number" min={0} value={p} onChange={e => set('prizes', d.prizes.map((x, k) => (k === i ? +e.target.value : x)))} /></div>
                        ))}
                      </div>
                    </Field>
                  ) : (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Base fee per video" htmlFor="fee" error={errors.baseFee}><Input id="fee" type="number" min={0} value={d.baseFee} onChange={e => set('baseFee', +e.target.value)} invalid={!!errors.baseFee} /></Field>
                        <Field label="Performance bonus per video" htmlFor="bonus"><Input id="bonus" type="number" min={0} value={d.bonusAmount} onChange={e => set('bonusAmount', +e.target.value)} /></Field>
                      </div>
                      <div className="rounded-xl border border-line p-4">
                        <div className="text-[14px] font-medium text-fg">When is the bonus paid?</div>
                        <div className="mb-3 text-[12.5px] text-muted">Pick the result that matters, set your own threshold and how long the ad has to hit it.</div>
                        <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr_1fr]">
                          <Field label="Result" htmlFor="metric">
                            <Select id="metric" value={d.bonusMetric} onChange={e => chooseMetric(e.target.value as BonusMetric)}>
                              {BONUS_METRIC_KEYS.map(k => <option key={k} value={k}>{BONUS_METRICS[k].label}</option>)}
                            </Select>
                          </Field>
                          <Field label={BONUS_METRICS[d.bonusMetric].better === 'higher' ? 'Above' : 'Below'} htmlFor="threshold" error={errors.bonusThreshold}>
                            <div className="relative">
                              {BONUS_METRICS[d.bonusMetric].unit === '$' && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-muted">$</span>}
                              <Input id="threshold" type="number" step="0.1" min={0.1} value={d.bonusThreshold} onChange={e => set('bonusThreshold', +e.target.value)} invalid={!!errors.bonusThreshold}
                                className={BONUS_METRICS[d.bonusMetric].unit === '$' ? 'pl-7' : 'pr-8'} />
                              {BONUS_METRICS[d.bonusMetric].unit === '%' && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-muted">%</span>}
                            </div>
                          </Field>
                          <Field label="Within" htmlFor="window" error={errors.bonusWindowDays}>
                            <Select id="window" value={d.bonusWindowDays} onChange={e => set('bonusWindowDays', +e.target.value)}>
                              {WINDOWS.map(w => <option key={w} value={w}>{w} days</option>)}
                            </Select>
                          </Field>
                        </div>
                        <p className="mt-3 rounded-lg bg-tint-violet px-3 py-2 text-[13px] text-fg">Bonus of {money(d.bonusAmount)} when: <b>{bonusRuleText}</b> of approval.</p>
                      </div>
                      <Field label="Creators wanted" htmlFor="wanted" error={errors.creatorsWanted}><Input id="wanted" type="number" min={1} max={20} value={d.creatorsWanted} onChange={e => set('creatorsWanted', +e.target.value)} className="max-w-[140px]" invalid={!!errors.creatorsWanted} /></Field>
                    </>
                  )}
                  <div className="rounded-xl bg-subtle p-4 text-[13.5px]">
                    <div className="flex justify-between"><span className="text-muted">{contest ? 'Prize pool' : `Base: ${money(d.baseFee)} × ${d.count} videos × ${d.creatorsWanted} creators`}</span><span className="font-medium text-fg">{money(budget)}</span></div>
                    {!contest && <div className="mt-1 flex justify-between"><span className="text-muted">Bonuses, only if earned (max)</span><span className="text-fg">{money(maxBonus)}</span></div>}
                    {!contest && <div className="mt-1 flex justify-between border-t border-line pt-1"><span className="text-muted">Held in escrow at launch</span><span className="font-medium text-fg">{money(budget + maxBonus)}</span></div>}
                    <div className="mt-1 flex justify-between"><span className="text-muted">Wallet balance</span><span className={budget + maxBonus > state.wallet ? 'text-danger' : 'text-fg'}>{money(state.wallet)}</span></div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div>
                    <Label className="mb-2">Basics</Label>
                    <KV label="Campaign">{draft.name}</KV><KV label="Product">{draft.product}</KV><KV label="Category">{draft.category}</KV><KV label="Market">{draft.market}</KV>
                    <KV label="Customers">{draft.targetCustomers.join(', ')}</KV><KV label="Deadline">{fmtDate(d.deadline)}</KV>
                  </div>
                  <div>
                    <Label className="mb-2">Creative brief</Label>
                    <KV label="Goal">{draft.goal}</KV><KV label="Angle">{draft.creativeAngle}</KV>
                    <KV label="Opening"><span className="font-serif text-[15.5px]">“{draft.suggestedOpening}”</span></KV>
                    <KV label="Story flow">{draft.storyFlow.map((s, i) => `${i + 1}. ${s}`).join('  ')}</KV>
                    <KV label="Must include">{draft.mustInclude.join(' · ') || '—'}</KV><KV label="Avoid">{draft.avoid.join(' · ') || '—'}</KV>
                  </div>
                  <div>
                    <Label className="mb-2">Budget and creators</Label>
                    <KV label="Sourcing">{d.sourcing === 'auto' ? 'Auto-match' : d.sourcing === 'handpick' ? 'Hand-pick' : 'Contest'}</KV>
                    <KV label="Budget">{money(budget)}{!contest && ` + up to ${money(maxBonus)} in bonuses`}</KV>
                    {!contest && <KV label="Bonus rule">{bonusRuleText} of approval</KV>}
                  </div>
                  <div className="rounded-xl border border-line px-4 pb-2 pt-5"><SubmissionTimeline milestones={draft.timeline} /></div>
                  <p className="flex items-start gap-2 text-[13px] text-muted"><Lock size={14} className="mt-0.5 shrink-0" />
                    {contest ? `The ${money(budget)} prize pool is held in escrow and released to winners.` : `${money(budget + maxBonus)} (fees plus maximum bonuses) is held in escrow when you launch. Fees are released as you approve videos; unearned bonuses return to your wallet.`}
                  </p>
                </>
              )}

              <div className="flex items-center justify-between border-t border-line pt-5">
                <Button type="button" variant="ghost" onClick={() => { setErrors({}); setStep(s => Math.max(0, s - 1)) }} disabled={step === 0}>Back</Button>
                {step < 3 ? <Button type="submit">Continue</Button> : <Button type="button" onClick={() => void launch()} loading={busy} disabled={!state.permissions.canSpend}>Launch campaign</Button>}
              </div>
            </Panel>
          </motion.div>
        </form>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <Label className="mb-3">What creators will see</Label>
          <OpportunityCard preview brand={state.brand.name} campaign={previewCampaign} score={contest ? undefined : 94} />
          <p className="mt-3 text-[12.5px] text-faint">Updates as you type. Match % is an example; each creator sees their own.</p>
        </aside>
      </div>
    </>
  )
}
