import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, Lightbulb, Pause, Play, RefreshCw, RotateCcw, Shield, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { AnimatedNumber, Avatar, Badge, Card, ChartTooltip, ScoreBar, SectionTitle, Stagger, StatusBadge } from '../components/ui'
import { creatives, getCreative, getCreator, getProduct } from '../data/seed'
import type { Creative, GenomeScores } from '../data/types'
import { cx, money, SERIES, mix } from '../lib/format'
import { rise } from '../lib/motion'

const geneLabels: Record<keyof GenomeScores, string> = {
  hook: 'Hook', emotion: 'Emotion', pacing: 'Pacing', productReveal: 'Product reveal', proof: 'Proof', cta: 'CTA',
}
const kindColor = { hook: 'var(--g0)', problem: 'var(--g9)', reveal: 'var(--g5)', proof: 'var(--g3)', cta: 'var(--g8)' }

// Account-median genome, used as the comparison baseline.
const median: GenomeScores = { hook: 74, emotion: 68, pacing: 72, productReveal: 71, proof: 70, cta: 70 }

export default function Genome() {
  const { id } = useParams()
  const navigate = useNavigate()
  const cr = getCreative(id!) ?? creatives[0]
  const creator = getCreator(cr.creatorId)!
  const product = getProduct(cr.productId)!
  const overall = Math.round(Object.values(cr.genome).reduce((a, b) => a + b, 0) / 6)

  const radar = (Object.keys(geneLabels) as (keyof GenomeScores)[]).map(k => ({
    gene: geneLabels[k], [`#${cr.number}`]: cr.genome[k], 'Account median': median[k],
  }))

  return (
    <Stagger key={cr.id}>
      <motion.div variants={rise} className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-mint">Creative Genome</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-[34px]">
            #{cr.number} <span className="text-ink-300">·</span> {cr.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-ink-400">
            <span className="flex items-center gap-2"><Avatar creator={creator} size={20} />{creator.name}</span>
            <span>{product.brand} — {product.name}</span>
            <span>Gen {cr.generation}</span>
            <StatusBadge status={cr.status} />
          </div>
        </div>
        <select value={cr.id} onChange={e => navigate(`/brand/genome/${e.target.value}`)}
          className="h-10 rounded-xl border border-white/10 bg-ink-850 px-3 text-[13px] text-white outline-none">
          {creatives.map(c => <option key={c.id} value={c.id}>#{c.number} {c.title}</option>)}
        </select>
      </motion.div>

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Player cr={cr} />

        <div className="space-y-4">
          <Card className="p-6">
            <div className="grid gap-6 md:grid-cols-[1fr_240px]">
              <div>
                <SectionTitle right={<span className="text-[12px] text-ink-400">0–100 · vs account median</span>}>Gene scores</SectionTitle>
                <div className="space-y-3.5">
                  {(Object.keys(geneLabels) as (keyof GenomeScores)[]).map((k, i) => {
                    const v = cr.genome[k]
                    const d = v - median[k]
                    return (
                      <div key={k} className="grid grid-cols-[110px_1fr_34px_44px] items-center gap-3 text-[13px]">
                        <span className="font-medium text-ink-100">{geneLabels[k]}</span>
                        <div className="relative">
                          <ScoreBar value={v} color={v >= 85 ? 'var(--g1)' : v >= 70 ? 'var(--g0)' : 'var(--g7)'} delay={0.1 + i * 0.07} height={9} />
                          <div className="absolute -top-1 h-[17px] w-px bg-white/40" style={{ left: `${median[k]}%` }} />
                        </div>
                        <span className="text-right font-mono font-medium text-white">{v}</span>
                        <span className={cx('text-right font-mono text-[11px]', d >= 0 ? 'text-mint' : 'text-danger')}>{d >= 0 ? '+' : ''}{d}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-400"><span className="h-3 w-px bg-white/40" /> Account median</div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4">
                <div className="text-[11px] uppercase tracking-wider text-ink-400">Genome score</div>
                <div className="my-1 text-6xl font-semibold tracking-tight text-white"><AnimatedNumber value={overall} /></div>
                <div className="grid w-full grid-cols-3 gap-2 text-center text-[11px] text-ink-400">
                  <div><div className="font-mono text-[13px] text-white">{money(cr.metrics.cpa)}</div>CPA</div>
                  <div><div className="font-mono text-[13px] text-white">{cr.metrics.roas}×</div>ROAS</div>
                  <div><div className="font-mono text-[13px] text-white">{cr.metrics.ctr}%</div>CTR</div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
            <Card className="p-6">
              <SectionTitle>Genome shape</SectionTitle>
              <div className="h-[230px]">
                <ResponsiveContainer>
                  <RadarChart data={radar} outerRadius="72%">
                    <PolarGrid stroke="rgb(var(--fg-rgb)/.08)" />
                    <PolarAngleAxis dataKey="gene" tick={{ fill: 'var(--g6)', fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Radar name="Account median" dataKey="Account median" stroke={SERIES[1]} fill={SERIES[1]} fillOpacity={0.08} strokeWidth={2} strokeDasharray="4 3" />
                    <Radar name={`#${cr.number}`} dataKey={`#${cr.number}`} stroke={SERIES[0]} fill={SERIES[0]} fillOpacity={0.25} strokeWidth={2} animationDuration={1200} />
                    <Legend iconType="plainline" iconSize={14} wrapperStyle={{ fontSize: 12, color: 'var(--g3)' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-6" glow="var(--g1)">
              <SectionTitle right={<Lightbulb size={15} className="text-gold" />}>Why it worked</SectionTitle>
              <ul className="space-y-3">
                {cr.insights.why.map((w, i) => (
                  <motion.li key={w} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex gap-3 text-[13.5px] leading-relaxed text-ink-100">
                    <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold/15 font-mono text-[10px] text-gold">{i + 1}</span>{w}
                  </motion.li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <InsightCol title="Preserve" icon={<Shield size={15} />} color="var(--g1)" items={cr.insights.preserve} />
        <InsightCol title="Change" icon={<RefreshCw size={15} />} color="var(--g7)" items={cr.insights.change.length ? cr.insights.change : ['Not enough data yet']} />
        <InsightCol title="Test next" icon={<Sparkles size={15} />} color="var(--g0)" items={cr.insights.testNext} action />
      </div>
    </Stagger>
  )
}

function InsightCol({ title, icon, color, items, action }: { title: string; icon: React.ReactNode; color: string; items: string[]; action?: boolean }) {
  return (
    <Card className="flex flex-col p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-xl" style={{ background: `${mix(color, 12)}`, color }}>{icon}</div>
        <span className="font-semibold text-white">{title}</span>
      </div>
      <ul className="flex-1 space-y-2.5">
        {items.map((t, i) => (
          <motion.li key={t} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.08 }}
            className="flex gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 text-[13px] text-ink-100">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color }} />{t}
          </motion.li>
        ))}
      </ul>
      {action && (
        <Link to="/brand/next" className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-azure hover:underline">
          Turn into next experiment <ArrowRight size={13} />
        </Link>
      )}
    </Card>
  )
}

// ─── Simulated player ───────────────────────────────────────────────────────

function Player({ cr }: { cr: Creative }) {
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(true)

  useEffect(() => { setT(0); setPlaying(true) }, [cr.id])
  useEffect(() => {
    if (!playing) return
    const iv = setInterval(() => setT(x => (x + 0.1 >= cr.duration ? 0 : x + 0.1)), 100)
    return () => clearInterval(iv)
  }, [playing, cr.duration])

  const seg = cr.timeline.find(s => t >= s.start && t < s.end) ?? cr.timeline.at(-1)!
  const color = kindColor[seg.kind]
  const retentionNow = cr.retention[Math.min(Math.floor(t), cr.retention.length - 1)]

  const retPath = useMemo(() => {
    const n = cr.retention.length - 1
    return cr.retention.map((v, i) => `${i ? 'L' : 'M'}${(i / n) * 100},${40 - (v / 100) * 38}`).join(' ')
  }, [cr.retention])

  return (
    <Card className="p-5">
      <div className="relative mx-auto aspect-[9/16] w-full max-w-[300px] overflow-hidden rounded-[28px] border border-white/10 bg-ink-950">
        {/* scene background shifts with segment */}
        <div className="absolute inset-0 transition-[background] duration-700" style={{ background: `radial-gradient(120% 80% at 50% 20%, ${mix(color, 27)}, transparent 60%), linear-gradient(180deg, var(--s3), var(--s5))` }} />
        {/* stylised creator */}
        <motion.div className="absolute left-1/2 top-[22%] -translate-x-1/2" animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity }}>
          <div className="mx-auto h-24 w-24 rounded-full" style={{ background: 'linear-gradient(160deg,var(--g3),var(--g7))' }} />
          <div className="-mt-3 h-40 w-44 rounded-t-[48px] bg-ink-200/90" />
        </motion.div>
        {seg.kind === 'reveal' && (
          <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} className="absolute bottom-[30%] right-[14%] grid h-20 w-12 place-items-center rounded-xl text-2xl shadow-2xl"
            style={{ background: `linear-gradient(180deg, ${color}, ${mix(color, 53)})` }}>{getProduct(cr.productId)!.emoji}</motion.div>
        )}
        {/* captions */}
        <div className="absolute inset-x-4 bottom-20 text-center">
          <AnimatePresence mode="wait">
            <motion.div key={seg.label} initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}
              className="inline-block rounded-lg bg-black/60 px-3 py-1.5 text-[14px] font-semibold text-white backdrop-blur">
              {seg.kind === 'hook' ? cr.hookLine : seg.label}
            </motion.div>
          </AnimatePresence>
        </div>
        {/* overlay chips */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} /> {seg.kind.toUpperCase()}
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 font-mono text-[11px] text-white backdrop-blur">
          {retentionNow}% watching
        </div>
        {/* progress */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
          <div className="h-full bg-white" style={{ width: `${(t / cr.duration) * 100}%` }} />
        </div>
        <button onClick={() => setPlaying(p => !p)} className="absolute bottom-6 left-1/2 grid h-11 w-11 -translate-x-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25">
          {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>
      </div>

      {/* Timeline */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-[11px] text-ink-400">
          <span>Structure & retention</span>
          <button onClick={() => setT(0)} className="flex items-center gap-1 hover:text-white"><RotateCcw size={11} /> {t.toFixed(1)}s / {cr.duration}s</button>
        </div>
        <div className="relative">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-12 w-full">
            <path d={`${retPath} L100,40 L0,40 Z`} fill="rgb(var(--fg-rgb)/.12)" />
            <path d={retPath} fill="none" stroke="var(--g0)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="mt-1 flex h-7 gap-[2px] overflow-hidden rounded-lg">
            {cr.timeline.map(s => (
              <button key={s.label} onClick={() => setT(s.start)} title={s.label}
                className={cx('relative h-full transition-opacity', seg === s ? 'opacity-100' : 'opacity-50 hover:opacity-80')}
                style={{ width: `${((s.end - s.start) / cr.duration) * 100}%`, background: kindColor[s.kind] }} />
            ))}
          </div>
          <div className="pointer-events-none absolute -top-1 bottom-0 w-px bg-white" style={{ left: `${(t / cr.duration) * 100}%` }}>
            <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-white" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {cr.timeline.map(s => (
            <Badge key={s.label} className={seg === s ? 'border-white/30 text-white' : ''}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: kindColor[s.kind] }} />{s.start}s {s.label}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  )
}
