import { AnimatePresence, motion, useInView } from 'framer-motion'
import {
  BarChart3, Clapperboard, Dna, FlaskConical, Link2, Rocket, Sparkles, Users,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { mix } from '../lib/format'
import { creators } from '../data/seed'
import { ease } from '../lib/motion'
import { Avatar } from './ui'

const STEP_MS = 4200

const stages = [
  {
    name: 'Product Intelligence', icon: Link2, color: 'var(--coral)',
    line: 'Paste a URL. We read the page, the reviews and the competitors.',
    outputs: ['Audience segments', 'Ranked objections', 'Competitor gaps'],
  },
  {
    name: 'Creative Hypotheses', icon: FlaskConical, color: 'var(--rose)',
    line: 'Every idea starts as a testable bet with a reason behind it.',
    outputs: ['Hooks', 'Story beats', 'Confidence score'],
  },
  {
    name: 'Creator Match', icon: Users, color: 'var(--violet)',
    line: 'Matched on proven category fit, not follower count.',
    outputs: ['Category fit', 'Format strength', 'Reliability'],
  },
  {
    name: 'Create', icon: Clapperboard, color: 'var(--sky)',
    line: 'AI briefs and a creator copilot guide every second of the cut.',
    outputs: ['Beat-by-beat brief', 'Do / avoid', 'Pre-submission check'],
  },
  {
    name: 'Test & Measure', icon: BarChart3, color: 'var(--lime)',
    line: 'One variable at a time, measured on real commercial outcomes.',
    outputs: ['Retention', 'CTR · CVR', 'CPA · ROAS'],
  },
  {
    name: 'Creative Genome', icon: Dna, color: 'var(--coral)',
    line: 'Each result is decoded into why it worked — gene by gene.',
    outputs: ['Gene scores', 'What to preserve', 'What failed'],
  },
  {
    name: 'Next Experiment', icon: Sparkles, color: 'var(--rose)',
    line: 'The system proposes the next bet, ranked by expected lift.',
    outputs: ['Replicate', 'Iterate', 'Localise'],
  },
  {
    name: 'Scale', icon: Rocket, color: 'var(--violet)',
    line: 'Winners roll out across budgets and markets — and feed the loop.',
    outputs: ['Budget scale-up', 'New markets', 'Fatigue refresh'],
  },
]

const flywheel = ['More creatives', 'More data', 'Smarter insights', 'Higher performance']

// Ring geometry, in % of the square container.
const R = 36
const pos = (i: number) => {
  const a = ((-90 + i * 45) * Math.PI) / 180
  return { x: 50 + R * Math.cos(a), y: 50 + R * Math.sin(a), cos: Math.cos(a), sin: Math.sin(a) }
}

export function CoreLoop() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '-120px' })
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [word, setWord] = useState(0)

  useEffect(() => {
    if (!inView || paused) return
    const t = setTimeout(() => setActive(a => (a + 1) % stages.length), STEP_MS)
    return () => clearTimeout(t)
  }, [active, inView, paused])

  useEffect(() => {
    const t = setInterval(() => setWord(w => (w + 1) % flywheel.length), 1800)
    return () => clearInterval(t)
  }, [])

  const s = stages[active]
  const C = 2 * Math.PI * 36 // circumference in viewBox units (r=36 of 100)

  return (
    <div ref={ref} className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* ambient glow follows the active stage colour */}
      <div
        className="glow-blob pointer-events-none absolute left-[25%] top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] transition-colors duration-1000"
        style={{ backgroundColor: s.color }}
      />

      <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-6">
        {/* ── Ring ── */}
        <div className="min-w-0 overflow-hidden md:overflow-visible md:px-20 lg:px-16"><div className="relative mx-auto aspect-square w-full max-w-[480px]">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90 overflow-visible">
            <defs>
              <linearGradient id="loopGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--g0)" />
                <stop offset=".5" stopColor="var(--g3)" />
                <stop offset="1" stopColor="var(--g7)" />
              </linearGradient>
            </defs>
            {/* outer hairline + inner dashed ring for depth */}
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgb(var(--fg-rgb)/.04)" strokeWidth=".25" />
            <circle cx="50" cy="50" r="26" fill="none" stroke="rgb(var(--fg-rgb)/.06)" strokeWidth=".25" strokeDasharray=".6 1.2" />
            {/* track */}
            <circle cx="50" cy="50" r="36" fill="none" stroke="rgb(var(--fg-rgb)/.07)" strokeWidth="1.1" />
            {/* progress */}
            <motion.circle
              cx="50" cy="50" r="36" fill="none" stroke="url(#loopGrad)" strokeWidth="1.1" strokeLinecap="round"
              strokeDasharray={C}
              animate={{ strokeDashoffset: C * (1 - active / stages.length) }}
              transition={{ duration: 0.9, ease }}
            />
            {/* tick marks */}
            {Array.from({ length: 64 }, (_, k) => {
              const a = (k / 64) * Math.PI * 2
              return <line key={k} x1={50 + 41 * Math.cos(a)} y1={50 + 41 * Math.sin(a)} x2={50 + (k % 8 === 0 ? 43 : 42) * Math.cos(a)} y2={50 + (k % 8 === 0 ? 43 : 42) * Math.sin(a)}
                stroke="rgb(var(--fg-rgb)/.12)" strokeWidth=".2" />
            })}
          </svg>

          {/* comet travelling the track */}
          <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}>
            <div className="absolute left-1/2 top-[14%] -translate-x-1/2 -translate-y-1/2">
              <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_14px_4px_rgb(var(--fg-rgb)/.55)]" />
            </div>
          </motion.div>

          {/* centre */}
          <div className="absolute left-1/2 top-1/2 grid aspect-square w-[44%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/[0.08] bg-ink-900/80 backdrop-blur-xl">
            <div className="absolute inset-0 rounded-full transition-shadow duration-1000" style={{ boxShadow: `0 0 80px -10px ${mix(s.color, 30)}, inset 0 0 40px -10px ${mix(s.color, 25)}` }} />
            <div className="relative px-4 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ink-400">The flywheel</div>
              <div className="relative mt-2 h-14 sm:h-16">
                <AnimatePresence mode="wait">
                  <motion.div key={word}
                    initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
                    transition={{ duration: 0.45, ease }}
                    className="font-serif text-[22px] italic leading-tight text-white sm:text-[28px]">
                    {flywheel[word]}
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="mt-1 flex justify-center gap-1">
                {flywheel.map((_, i) => (
                  <span key={i} className="h-1 rounded-full transition-all duration-500" style={{ width: i === word ? 14 : 4, background: i === word ? s.color : 'rgb(var(--fg-rgb)/.2)' }} />
                ))}
              </div>
            </div>
          </div>

          {/* nodes */}
          {stages.map((st, i) => {
            const p = pos(i)
            const isActive = i === active
            const done = i < active
            const side = Math.abs(p.cos) < 0.3 ? (p.sin < 0 ? 'top' : 'bottom') : p.cos > 0 ? 'right' : 'left'
            const labelPos = {
              top: { transform: 'translate(-50%, calc(-100% - 34px))', textAlign: 'center' as const },
              bottom: { transform: 'translate(-50%, 34px)', textAlign: 'center' as const },
              right: { transform: 'translate(36px, -50%)', textAlign: 'left' as const },
              left: { transform: 'translate(calc(-100% - 36px), -50%)', textAlign: 'right' as const },
            }[side]
            return (
              <div key={st.name} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                <motion.button
                  onClick={() => setActive(i)}
                  aria-label={st.name}
                  className="absolute left-0 top-0 grid h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border backdrop-blur-md transition-colors duration-500"
                  style={{
                    backgroundColor: isActive ? st.color : done ? 'rgb(var(--fg-rgb)/.08)' : 'rgb(var(--bg-rgb)/.9)',
                    borderColor: isActive ? 'rgb(var(--fg-rgb)/.5)' : done ? mix(st.color, 40) : 'rgb(var(--fg-rgb)/.1)',
                  }}
                  animate={{ scale: isActive ? 1.18 : 1 }}
                  whileHover={{ scale: isActive ? 1.22 : 1.08 }}
                  transition={{ type: 'spring', bounce: 0.35, duration: 0.5 }}
                >
                  {isActive && (
                    <motion.span className="absolute inset-0 rounded-full" style={{ border: `1.5px solid ${st.color}` }}
                      initial={{ scale: 1, opacity: 0.8 }} animate={{ scale: 1.8, opacity: 0 }} transition={{ duration: 1.6, repeat: Infinity }} />
                  )}
                  <st.icon size={19} strokeWidth={2} className={isActive ? 'text-ink-950' : done ? 'text-white' : 'text-ink-300'} style={!isActive && done ? { color: st.color } : undefined} />
                </motion.button>
                <button onClick={() => setActive(i)}
                  className="absolute left-0 top-0 hidden w-[96px] md:block" style={labelPos}>
                  <div className="font-mono text-[10px] text-ink-400">{String(i + 1).padStart(2, '0')}</div>
                  <div className={`text-[12.5px] font-medium leading-tight transition-colors ${isActive ? 'text-white' : 'text-ink-300 hover:text-ink-100'}`}>{st.name}</div>
                </button>
              </div>
            )
          })}
        </div>

        </div>
        {/* ── Detail panel ── */}
        <div className="relative min-w-0">
          <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-7 backdrop-blur-xl md:p-8">
            <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${s.color}, transparent)` }} />
            <AnimatePresence mode="wait">
              <motion.div key={active}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease }}>
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: `${mix(s.color, 13)}`, color: s.color }}>
                    <s.icon size={20} />
                  </div>
                  <div className="font-mono text-[12px] text-ink-400">STAGE {String(active + 1).padStart(2, '0')} / 08</div>
                </div>
                <h3 className="mt-5 text-[30px] font-semibold leading-tight tracking-tight text-white">{s.name}</h3>
                <p className="mt-2 text-[15.5px] leading-relaxed text-ink-300">{s.line}</p>

                <div className="mt-6 h-[188px] rounded-2xl border border-white/[0.06] bg-ink-950/60 p-4">
                  <Visual i={active} color={s.color} />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {s.outputs.map((o, k) => (
                    <motion.span key={o} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 + k * 0.07 }}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] text-ink-200">
                      {o}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* story-style progress */}
            <div className="mt-7 flex gap-1.5">
              {stages.map((st, i) => (
                <button key={st.name} onClick={() => setActive(i)} className="group relative h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]" aria-label={`Go to ${st.name}`}>
                  {i < active && <div className="absolute inset-0 bg-white/40" />}
                  {i === active && (
                    <motion.div key={`${active}-${paused}`} className="absolute inset-y-0 left-0" style={{ background: s.color }}
                      initial={{ width: paused ? '100%' : '0%' }} animate={{ width: '100%' }}
                      transition={{ duration: paused ? 0 : STEP_MS / 1000, ease: 'linear' }} />
                  )}
                </button>
              ))}
            </div>
            <div className="mt-3 text-[11.5px] text-ink-400">{paused ? 'Paused — click any stage' : 'Hover to pause · click any stage'}</div>
          </div>
        </div>
      </div>

      <div className="relative mt-12 text-center text-[14px] text-ink-300">
        Every result returns to the intelligence layer →{' '}
        <span className="text-white">better matches → better briefs → better creative → better performance.</span>
      </div>
    </div>
  )
}

// ─── Per-stage mini visuals ─────────────────────────────────────────────────

function Visual({ i, color }: { i: number; color: string }) {
  const views: ReactNode[] = [
    <ProductIntel key={0} color={color} />,
    <Hypotheses key={1} color={color} />,
    <Match key={2} color={color} />,
    <CreateBeats key={3} />,
    <Measure key={4} color={color} />,
    <Genes key={5} color={color} />,
    <NextBet key={6} color={color} />,
    <ScaleMarkets key={7} color={color} />,
  ]
  return <>{views[i]}</>
}

const d = (k: number, base = 0.15) => ({ delay: base + k * 0.09, duration: 0.45, ease })

function ProductIntel({ color }: { color: string }) {
  const chips = [['Audience', 'Over-exfoliators · 41%'], ['Objection', '“Nothing works” · 92'], ['Gap', 'Competitors over-promise'], ['Angle', 'Confession · 94']]
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[11.5px] text-ink-300">
        <Link2 size={12} style={{ color }} />
        <motion.span initial={{ width: 0 }} animate={{ width: 'auto' }} transition={{ duration: 0.8 }} className="overflow-hidden whitespace-nowrap">
          lumenskin.com/products/barrier-repair-serum
        </motion.span>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-2">
        {chips.map(([k, v], n) => (
          <motion.div key={k} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={d(n, 0.5)}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
            <div className="text-[10px] uppercase tracking-wider" style={{ color }}>{k}</div>
            <div className="mt-0.5 text-[12px] text-ink-100">{v}</div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function Hypotheses({ color }: { color: string }) {
  const hooks = [['“I destroyed my skin barrier…”', 82], ['“Your moisturiser can’t fix this.”', 68], ['“I threw out three products.”', 61]]
  return (
    <div className="flex h-full flex-col justify-center gap-2">
      {hooks.map(([h, c], n) => (
        <motion.div key={n} initial={{ opacity: 0, x: 20, rotate: 2 }} animate={{ opacity: 1, x: 0, rotate: 0 }} transition={d(n)}
          className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
          <span className="font-mono text-[10px] text-ink-400">H{n + 1}</span>
          <span className="flex-1 truncate font-serif text-[14px] italic text-white">{h}</span>
          <span className="font-mono text-[11px]" style={{ color }}>{c}%</span>
        </motion.div>
      ))}
    </div>
  )
}

function Match({ color }: { color: string }) {
  // Sample creators for the animation; skip any the sample data doesn't have.
  const rows = ([[creators[0], 92], [creators[1], 89], [creators[2], 74]] as const).filter(([c]) => c)
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      {rows.map(([c, v], n) => (
        <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={d(n)} className="flex items-center gap-3">
          <Avatar creator={c} size={30} />
          <div className="w-24 truncate text-[12.5px] text-white">{c.name}</div>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ ...d(n, 0.3), duration: 0.9 }} />
          </div>
          <span className="w-6 text-right font-mono text-[12px] text-white">{v}</span>
        </motion.div>
      ))}
    </div>
  )
}

function CreateBeats() {
  const beats = [['Hook', 3, 'var(--g0)'], ['Problem', 5, 'var(--g9)'], ['Reveal', 5, 'var(--g5)'], ['Proof', 6, 'var(--g3)'], ['CTA', 3, 'var(--g8)']] as const
  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <div className="flex h-10 gap-1">
        {beats.map(([l, w, c], n) => (
          <motion.div key={l} className="grid place-items-center rounded-lg text-[11px] font-medium text-ink-950" style={{ background: c, flex: w }}
            initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }} transition={d(n)}>
            {l}
          </motion.div>
        ))}
      </div>
      <div className="relative h-px bg-white/10">
        <motion.div className="absolute -top-1 h-2 w-2 rounded-full bg-white" initial={{ left: '0%' }} animate={{ left: '100%' }} transition={{ duration: 3.4, ease: 'linear' }} />
      </div>
      <div className="flex justify-between font-mono text-[10.5px] text-ink-400"><span>0s</span><span>Product visible by 8s ✓</span><span>22s</span></div>
    </div>
  )
}

function Measure({ color }: { color: string }) {
  const pts = [62, 54, 49, 46, 44, 42, 41, 40, 39, 38]
  const path = pts.map((v, k) => `${k ? 'L' : 'M'}${(k / (pts.length - 1)) * 100},${100 - v}`).join(' ')
  return (
    <div className="flex h-full gap-4">
      <div className="relative flex-1">
        <svg viewBox="0 0 100 70" preserveAspectRatio="none" className="h-full w-full" style={{ transform: 'translateY(-30%)' }}>
          <motion.path d={path} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease }} />
        </svg>
        <div className="absolute bottom-0 left-0 text-[10.5px] text-ink-400">Retention, 0–22s</div>
      </div>
      <div className="flex w-[118px] flex-col justify-center gap-2">
        {[['CTR', '2.41%'], ['CVR', '4.9%'], ['CPA', '$29']].map(([k, v], n) => (
          <motion.div key={k} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={d(n, 0.4)}
            className="flex items-center justify-between rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-[12px]">
            <span className="text-ink-400">{k}</span><span className="font-mono text-white">{v}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function Genes({ color }: { color: string }) {
  const genes = [['Hook', 94], ['Emotion', 89], ['Reveal', 92], ['Proof', 88], ['CTA', 81]] as const
  return (
    <div className="flex h-full items-end justify-between gap-3 px-1">
      {genes.map(([g, v], n) => (
        <div key={g} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={d(n, 0.6)} className="font-mono text-[11px] text-white">{v}</motion.span>
          <motion.div className="w-full rounded-t-md" style={{ background: g === 'CTA' ? 'rgb(var(--fg-rgb)/.25)' : color }}
            initial={{ height: 0 }} animate={{ height: `${(v - 50) * 2.2}%` }} transition={{ ...d(n), duration: 0.8 }} />
          <span className="text-[10.5px] text-ink-400">{g}</span>
        </div>
      ))}
    </div>
  )
}

function NextBet({ color }: { color: string }) {
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={d(0)}
        className="rounded-xl border p-3.5" style={{ borderColor: `${mix(color, 33)}`, background: `${mix(color, 7)}` }}>
        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>Recommended · 78% confidence</div>
        <div className="mt-1 text-[14px] font-medium text-white">Keep #247’s hook — swap creator to Sofia Á.</div>
        <div className="mt-0.5 text-[12px] text-ink-400">Expected CVR +8–15%</div>
      </motion.div>
      <div className="grid grid-cols-2 gap-2">
        {['Harden the CTA', 'Localise ES / MX'].map((t, n) => (
          <motion.div key={t} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={d(n + 1)}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[12px] text-ink-200">{t}</motion.div>
        ))}
      </div>
    </div>
  )
}

function ScaleMarkets({ color }: { color: string }) {
  const m = [['US', 100], ['UK', 72], ['ES', 54], ['MX', 41], ['DE', 28]] as const
  return (
    <div className="flex h-full flex-col justify-center gap-2">
      {m.map(([k, v], n) => (
        <div key={k} className="flex items-center gap-3">
          <span className="w-6 font-mono text-[11px] text-ink-400">{k}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
            <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${mix(color, 33)}, ${color})` }}
              initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ ...d(n), duration: 0.9 }} />
          </div>
          <span className="w-12 text-right font-mono text-[11px] text-white">${(v * 0.5).toFixed(0)}k</span>
        </div>
      ))}
    </div>
  )
}
