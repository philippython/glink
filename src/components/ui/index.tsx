import { animate, AnimatePresence, motion, useInView, useMotionValue, useTransform } from 'framer-motion'
import { useEffect, useRef, type ReactNode } from 'react'
import { Clock, Flag, Moon, Sun, Trophy, UserCheck } from 'lucide-react'
import { useTheme } from '../../lib/theme'
import { cx, daysBetween, shortDate, mix } from '../../lib/format'
import { TODAY } from '../../data/seed'
import { ease, rise, stagger } from '../../lib/motion'
import type { Creator, Evidence, Milestone, Product, SourcingMode } from '../../data/types'

// ─── Layout primitives ──────────────────────────────────────────────────────

export function Card({ children, className, hover = false, glow }: {
  children: ReactNode; className?: string; hover?: boolean; glow?: string
}) {
  return (
    <motion.div
      variants={rise}
      className={cx('glass relative overflow-hidden rounded-2xl', hover && 'glass-hover', className)}
    >
      {glow && (
        <div
          className="glow-blob pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full blur-3xl"
          style={{ background: glow }}
        />
      )}
      {children}
    </motion.div>
  )
}

export function Stagger({ children, className, step = 0.06, delay = 0 }: {
  children: ReactNode; className?: string; step?: number; delay?: number
}) {
  return (
    <motion.div variants={stagger(step, delay)} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  )
}

export function PageHeader({ eyebrow, title, subtitle, actions }: {
  eyebrow: string; title: ReactNode; subtitle?: string; actions?: ReactNode
}) {
  return (
    <motion.div variants={rise} className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="label-caps mb-2">{eyebrow}</div>
        <h1 className="title-serif text-[34px] leading-tight text-white md:text-[40px]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[15px] text-ink-300">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </motion.div>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-white">{children}</h3>
      {right}
    </div>
  )
}

// ─── Buttons & badges ───────────────────────────────────────────────────────

export function Button({ children, variant = 'primary', className, onClick, type = 'button', disabled }: {
  children: ReactNode; variant?: 'primary' | 'ghost' | 'soft'; className?: string
  onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean
}) {
  const styles = {
    primary: 'bg-white text-ink-950 hover:bg-ink-100 shadow-[0_0_0_1px_rgb(var(--fg-rgb)/.1),0_8px_30px_-8px_rgb(var(--fg-rgb)/.6)]',
    soft: 'bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/10',
    ghost: 'text-ink-300 hover:text-white hover:bg-white/5',
  }[variant]
  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cx(
        'inline-flex h-9 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors disabled:opacity-50',
        styles, className,
      )}
    >
      {children}
    </motion.button>
  )
}

export function Badge({ children, tone = 'neutral', className }: {
  children: ReactNode; tone?: 'neutral' | 'azure' | 'coral' | 'gold' | 'mint' | 'violet' | 'teal'; className?: string
}) {
  // Monochrome: tones differ by fill/outline/dash weight, not hue.
  const tones = {
    neutral: 'bg-white/[0.05] text-ink-300 border-white/10',
    azure: 'bg-white/[0.08] text-white border-white/20',
    coral: 'bg-transparent text-ink-400 border-white/10',
    gold: 'bg-transparent text-ink-100 border-white/30 border-dashed',
    mint: 'bg-white text-ink-950 border-white',
    violet: 'bg-white/[0.08] text-ink-200 border-white/15',
    teal: 'bg-white/[0.04] text-ink-200 border-white/20',
  }[tone]
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium', tones, className)}>
      {children}
    </span>
  )
}

const statusTone = {
  winner: 'mint', live: 'azure', testing: 'gold', fatigued: 'coral', paused: 'neutral',
  running: 'gold', concluded: 'mint', queued: 'neutral',
  draft: 'neutral', briefed: 'violet', production: 'teal', learned: 'mint',
  analyzing: 'gold', ready: 'azure', scaling: 'mint',
  open: 'gold', judging: 'violet', closed: 'neutral',
  submitted: 'neutral', shortlisted: 'azure', declined: 'coral',
} as const

export function StatusBadge({ status }: { status: keyof typeof statusTone }) {
  return (
    <Badge tone={statusTone[status]}>
      <span className="relative flex h-1.5 w-1.5">
        {(status === 'testing' || status === 'running' || status === 'analyzing' || status === 'open') && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
        )}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      <span className="capitalize">{status}</span>
    </Badge>
  )
}

export function EvidenceBadge({ evidence }: { evidence: Evidence }) {
  const map = { strong: ['mint', 'Strong evidence'], moderate: ['gold', 'Moderate'], insufficient: ['neutral', 'Insufficient data'] } as const
  return <Badge tone={map[evidence][0]}>{map[evidence][1]}</Badge>
}

// ─── Animated numbers & bars ────────────────────────────────────────────────

export function AnimatedNumber({ value, format = (n: number) => Math.round(n).toLocaleString(), duration = 1.4 }: {
  value: number; format?: (n: number) => string; duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const mv = useMotionValue(0)
  const text = useTransform(mv, v => format(v))

  useEffect(() => {
    if (!inView) return
    const c = animate(mv, value, { duration, ease })
    return () => c.stop()
  }, [inView, value, duration, mv])

  return <motion.span ref={ref} className="tabular-nums">{text}</motion.span>
}

export function ScoreBar({ value, color = 'var(--g1)', delay = 0, height = 8 }: {
  value: number; color?: string; delay?: number; height?: number
}) {
  return (
    <div className="relative w-full overflow-hidden rounded-full bg-white/[0.06]" style={{ height }}>
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: `linear-gradient(90deg, ${mix(color, 67)}, ${color})` }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1.1, ease, delay }}
      />
    </div>
  )
}

export function Ring({ value, size = 64, stroke = 6, color = 'var(--g0)', children }: {
  value: number; size?: number; stroke?: number; color?: string; children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgb(var(--fg-rgb)/.07)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: 1.4, ease }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

export function Sparkline({ data, color = 'var(--g0)', width = 96, height = 28 }: {
  data: number[]; color?: string; width?: number; height?: number
}) {
  const min = Math.min(...data), max = Math.max(...data)
  const pts = data.map((d, i) => [
    (i / (data.length - 1)) * width,
    height - 2 - ((d - min) / (max - min || 1)) * (height - 4),
  ])
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  return (
    <svg width={width} height={height} className="overflow-visible">
      <motion.path
        d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease }}
      />
      <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r={2.5} fill={color} />
    </svg>
  )
}

// ─── Identity tiles ─────────────────────────────────────────────────────────

export function Avatar({ creator, size = 40, ring = false }: { creator: Creator; size?: number; ring?: boolean }) {
  const initials = creator.name.split(' ').map(n => n[0]).join('')
  return (
    <div
      className={cx('grid shrink-0 place-items-center rounded-full font-semibold text-ink-950', ring && 'ring-2 ring-ink-950 ring-offset-0')}
      style={{
        width: size, height: size, fontSize: size * 0.36,
        background: `linear-gradient(135deg, ${creator.gradient[0]}, ${creator.gradient[1]})`,
      }}
    >
      {initials}
    </div>
  )
}

export function ProductTile({ product, size = 44 }: { product: Product; size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-xl border border-white/10"
      style={{
        width: size, height: size, fontSize: size * 0.45,
        background: `radial-gradient(circle at 30% 20%, ${mix(product.hue, 33)}, ${mix(product.hue, 7)} 70%)`,
      }}
    >
      {product.emoji}
    </div>
  )
}

export function Stat({ label, value, sub, trend, spark, color }: {
  label: string; value: ReactNode; sub?: ReactNode; trend?: { value: string; good: boolean }
  spark?: number[]; color?: string
}) {
  return (
    <Card className="p-5" hover>
      <div className="flex items-start justify-between">
        <div className="text-[12px] font-medium text-ink-300">{label}</div>
        {trend && (
          <span className={cx('text-[11px] font-semibold', trend.good ? 'text-mint' : 'text-danger')}>
            {trend.good ? '▲' : '▼'} {trend.value}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="text-[28px] font-semibold leading-none tracking-tight text-white">{value}</div>
        {spark && <Sparkline data={spark} color={color} />}
      </div>
      {sub && <div className="mt-2 text-[12px] text-ink-400">{sub}</div>}
    </Card>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange, id }: {
  tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void; id: string
}) {
  return (
    <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
      {tabs.map(t => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cx('relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
            value === t.value ? 'text-white' : 'text-ink-400 hover:text-ink-200')}
        >
          {value === t.value && (
            <motion.span layoutId={`tab-${id}`} className="absolute inset-0 rounded-lg bg-white/[0.09]"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }} />
          )}
          <span className="relative">{t.label}</span>
        </button>
      ))}
    </div>
  )
}

/** Recharts tooltip in the app's visual language. */
export function ChartTooltip({ active, payload, label, fmt }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string
  fmt?: (v: number, name: string) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-ink-850/95 px-3 py-2 text-xs shadow-2xl backdrop-blur">
      <div className="mb-1 font-medium text-ink-200">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 text-ink-300">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="ml-auto pl-4 font-mono text-white">{fmt ? fmt(p.value, p.name) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Submission timeline (every advert has one) ────────────────────────────

/** Human countdown to the deadline milestone, relative to the demo's TODAY. */
export function deadlineLabel(milestones: Milestone[]) {
  const dl = milestones.find(m => m.deadline) ?? milestones.at(-1)!
  const d = daysBetween(TODAY, dl.date)
  if (d > 1) return { text: `${dl.label} in ${d} days`, urgent: d <= 3, past: false, date: dl.date }
  if (d === 1) return { text: `${dl.label} tomorrow`, urgent: true, past: false, date: dl.date }
  if (d === 0) return { text: `${dl.label} today`, urgent: true, past: false, date: dl.date }
  return { text: `${dl.label} passed`, urgent: false, past: true, date: dl.date }
}

export function DeadlineChip({ milestones }: { milestones: Milestone[] }) {
  const d = deadlineLabel(milestones)
  const days = daysBetween(TODAY, d.date)
  const text = d.past ? `Closed ${shortDate(d.date)}` : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days}d`
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium',
      d.past ? 'border-white/10 text-ink-400' : d.urgent ? 'border-white bg-white text-ink-950' : 'border-white/20 text-ink-100')}>
      <Clock size={11} />{text}
    </span>
  )
}

export function SubmissionTimeline({ milestones, className }: { milestones: Milestone[]; className?: string }) {
  // Milestones are spaced evenly so labels never collide; "today" is placed
  // proportionally inside whichever segment it falls in.
  const n = milestones.length - 1
  const slot = (i: number) => (i / n) * 100
  const at = (iso: string) => {
    if (iso <= milestones[0].date) return 0
    if (iso >= milestones[n].date) return 100
    const i = milestones.findIndex((m, k) => k < n && iso >= m.date && iso < milestones[k + 1].date)
    const f = daysBetween(milestones[i].date, iso) / Math.max(1, daysBetween(milestones[i].date, milestones[i + 1].date))
    return slot(i) + f * (100 / n)
  }
  const now = at(TODAY)
  const dl = deadlineLabel(milestones)

  return (
    <div className={className}>
      <div className="mb-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px]">
          <Flag size={14} className="text-white" />
          <span className="font-medium text-white">{dl.text}</span>
          <span className="text-ink-400">· {shortDate(dl.date)}</span>
        </div>
        {dl.urgent && !dl.past && <Badge tone="mint">Urgent</Badge>}
      </div>

      <div className="relative mx-2 h-1.5 rounded-full bg-white/[0.08]">
        <motion.div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-white/40 to-white"
          initial={{ width: 0 }} animate={{ width: `${now}%` }} transition={{ duration: 1.1, ease }} />
        {now > 0 && now < 100 && (
          <motion.div className="absolute -top-[26px] -translate-x-1/2" style={{ left: `${now}%` }}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
            <div className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-ink-950">TODAY</div>
            <div className="mx-auto h-2 w-px bg-white" />
          </motion.div>
        )}
        {milestones.map((m, i) => {
          const past = daysBetween(m.date, TODAY) >= 0
          return (
            <motion.div key={m.label} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${slot(i)}%` }}
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 + i * 0.1, type: 'spring', bounce: 0.4 }}>
              <div className={cx('rounded-full border-2',
                m.deadline ? 'h-4 w-4' : 'h-3 w-3',
                past ? 'border-white bg-white' : 'border-white/50 bg-ink-900',
                m.deadline && !past && 'border-white shadow-[0_0_0_4px_rgb(var(--fg-rgb)/.12)]')} />
            </motion.div>
          )
        })}
      </div>

      <div className="relative mx-2 mt-3 h-9">
        {milestones.map((m, i) => {
          const x = slot(i)
          const align = i === 0 ? 'left-0 text-left' : i === milestones.length - 1 ? 'right-0 text-right' : '-translate-x-1/2 text-center'
          return (
            <div key={m.label} className={cx('absolute whitespace-nowrap', align)} style={i === 0 || i === milestones.length - 1 ? undefined : { left: `${x}%` }}>
              <div className={cx('text-[11.5px]', m.deadline ? 'font-semibold text-white' : 'text-ink-200')}>{m.label}</div>
              <div className="font-mono text-[10.5px] text-ink-400">{shortDate(m.date)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ModeBadge({ mode }: { mode: SourcingMode }) {
  return mode === 'contest'
    ? <Badge tone="azure"><Trophy size={11} /> Contest</Badge>
    : <Badge><UserCheck size={11} /> Direct hire</Badge>
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  return (
    <button onClick={toggle} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} title={dark ? 'Light theme' : 'Dark theme'}
      className={cx('relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl text-ink-300 transition hover:bg-white/5 hover:text-white', className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={theme} initial={{ y: 14, rotate: -90, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} exit={{ y: -14, rotate: 90, opacity: 0 }}
          transition={{ duration: 0.3, ease }}>
          {dark ? <Moon size={17} /> : <Sun size={17} />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
