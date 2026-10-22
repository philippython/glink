import { AnimatePresence, animate, motion, useInView, useReducedMotion } from 'framer-motion'
import { BadgeCheck, Bookmark, Check, Heart, MessageCircle, Music2, Play, Send, ShieldCheck, Sparkles, Trophy, Wallet } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { clips, compactCount, type Clip } from '../lib/images'
import { cx } from '../lib/format'

const ease = [0.22, 1, 0.36, 1] as const
const SLIDE_MS = 3600

/** Runs `fn` every `ms` unless the visitor prefers reduced motion. */
function useTicker(fn: () => void, ms: number) {
  const reduce = useReducedMotion()
  const saved = useRef(fn)
  saved.current = fn
  useEffect(() => {
    if (reduce) return
    const t = setInterval(() => saved.current(), ms)
    return () => clearInterval(t)
  }, [ms, reduce])
}

// ─── Hero phone ─────────────────────────────────────────────────────────────

const heroClips = clips.slice(0, 6)

/** A phone playing a vertical feed: swipes to the next clip, likes tick up, hearts float. */
export function PhoneFeed() {
  const [i, setI] = useState(0)
  const [extra, setExtra] = useState(0)
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([])
  const c = heroClips[i]

  // Decode every clip up front so a swipe never reveals an empty frame.
  useEffect(() => { heroClips.forEach(h => { const im = new Image(); im.src = h.src; void im.decode().catch(() => {}) }) }, [])

  useTicker(() => { setI(x => (x + 1) % heroClips.length); setExtra(0) }, SLIDE_MS)
  useTicker(() => {
    setExtra(n => n + 7 + Math.floor(Math.random() * 30))
    setHearts(h => [...h.slice(-5), { id: Date.now(), x: Math.random() * 24 - 12 }])
  }, 650)

  return (
    <div className="relative mx-auto w-[270px] sm:w-[300px]">
      <div className="rounded-[46px] bg-[#0a0a0a] p-[9px] shadow-[0_40px_90px_-25px_rgb(0_0_0/0.55)] ring-1 ring-pure-white/10">
        <div className="relative aspect-[9/19] overflow-hidden rounded-[38px] bg-pure-black text-pure-white">
          <AnimatePresence initial={false}>
            <motion.div key={c.src} className="absolute inset-0" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }} transition={{ duration: 0.75, ease }}>
              <motion.img src={c.src} alt="" className="h-full w-full object-cover" initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={{ duration: SLIDE_MS / 1000 + 0.8, ease: 'linear' }} />
            </motion.div>
          </AnimatePresence>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.45),transparent_22%,transparent_55%,rgb(0_0_0/0.8))]" />

          {/* Status bar and tabs */}
          <div className="absolute left-1/2 top-2.5 h-[22px] w-[88px] -translate-x-1/2 rounded-full bg-pure-black" />
          <div className="absolute inset-x-0 top-11 flex justify-center gap-5 text-[13px] font-semibold">
            <span className="opacity-60">Following</span>
            <span className="relative">For You<span className="absolute -bottom-1.5 left-1/2 h-[2.5px] w-6 -translate-x-1/2 rounded-full bg-pure-white" /></span>
          </div>

          {/* Action rail */}
          <div className="absolute bottom-24 right-2.5 flex flex-col items-center gap-4 text-[11px] font-semibold">
            <div className="relative">
              <img src={c.src} alt="" className="h-10 w-10 rounded-full border-2 border-pure-white object-cover" />
              <span className="absolute -bottom-2 left-1/2 grid h-[18px] w-[18px] -translate-x-1/2 place-items-center rounded-full bg-[#fe2c55] text-[13px] leading-none">+</span>
            </div>
            <div className="relative flex flex-col items-center gap-0.5">
              <motion.span key={extra} initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 12 }}>
                <Heart size={28} fill="#fe2c55" strokeWidth={0} />
              </motion.span>
              <span className="tabular-nums">{compactCount(c.likes + extra)}</span>
              <AnimatePresence>
                {hearts.map(h => (
                  <motion.span key={h.id} className="pointer-events-none absolute left-1/2 top-0 text-[#fe2c55]"
                    initial={{ opacity: 0.95, y: 0, x: '-50%', scale: 0.6 }} animate={{ opacity: 0, y: -110, x: `calc(-50% + ${h.x}px)`, scale: 1.1 }}
                    exit={{ opacity: 0 }} transition={{ duration: 1.6, ease: 'easeOut' }}>
                    <Heart size={16} fill="currentColor" strokeWidth={0} />
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
            <div className="flex flex-col items-center gap-0.5"><MessageCircle size={26} fill="white" strokeWidth={0} /><span>{compactCount(Math.round(c.likes / 23))}</span></div>
            <div className="flex flex-col items-center gap-0.5"><Bookmark size={25} fill="white" strokeWidth={0} /><span>{compactCount(Math.round(c.likes / 9))}</span></div>
            <div className="flex flex-col items-center gap-0.5"><Send size={24} /><span>Share</span></div>
            <motion.img src={c.src} alt="" animate={{ rotate: 360 }} transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
              className="h-9 w-9 rounded-full border-[6px] border-[#222] object-cover" />
          </div>

          {/* Caption */}
          <div className="absolute inset-x-0 bottom-0 p-3.5 pr-16">
            <AnimatePresence mode="wait">
              <motion.div key={c.src} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-pure-white px-2 py-0.5 text-[10.5px] font-semibold text-pure-black"><Check size={11} strokeWidth={3} /> {c.check}</span>
                <div className="text-[13.5px] font-semibold">{c.handle}</div>
                <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug opacity-95">{c.caption} <span className="font-semibold">#ad #{c.style.replace(/[^a-z]/gi, '').toLowerCase()}</span></p>
              </motion.div>
            </AnimatePresence>
            <div className="mt-2 flex items-center gap-1.5 overflow-hidden text-[11.5px]">
              <Music2 size={12} className="shrink-0" />
              <div className="overflow-hidden"><div className="sound-ticker gap-8"><span>{c.sound}</span><span>{c.sound}</span></div></div>
            </div>
          </div>

          {/* Progress */}
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-pure-white/20">
            <motion.div key={i} className="h-full bg-pure-white" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: SLIDE_MS / 1000, ease: 'linear' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Notifications that pop in around the phone ─────────────────────────────

const pings = [
  { icon: Sparkles, title: 'New match · 92%', sub: '14-day barrier reset', tone: 'bg-violet text-pure-white' },
  { icon: ShieldCheck, title: 'Pre-flight passed', sub: '22s · 9:16 · every line said', tone: 'bg-lime text-pure-black' },
  { icon: Wallet, title: 'Video approved', sub: '$380 released from escrow', tone: 'bg-coral text-pure-white' },
  { icon: BadgeCheck, title: 'Bonus paid · +$150', sub: 'CTR beat the 1.8% benchmark', tone: 'bg-grad text-pure-white' },
  { icon: Trophy, title: 'Winning ad', sub: 'Confession hook · 2.41% CTR', tone: 'bg-rose text-pure-white' },
  { icon: Heart, title: '3 creators accepted', sub: 'Night routine, live demo', tone: 'bg-violet text-pure-white' },
]
const slots = ['left-0 top-[9%] sm:-left-10', 'right-0 top-[24%] sm:-right-12', 'left-0 top-[56%] sm:-left-14']

export function FeedPings() {
  // Slot k always holds one of the last three pings in sequence, so no two slots repeat.
  const [seq, setSeq] = useState(3)
  const shown = [0, 1, 2].map(k => (seq - 3 + ((k - seq % 3 + 3) % 3)) % pings.length)
  useTicker(() => setSeq(s => s + 1), 2400)

  return (
    <>
      {slots.map((pos, k) => {
        const p = pings[shown[k]]
        const Icon = p.icon
        return (
          <div key={k} className={cx('pointer-events-none absolute z-20 w-[200px]', pos)}>
            <AnimatePresence mode="wait">
              <motion.div key={shown[k]} initial={{ opacity: 0, scale: 0.85, y: 10 }} animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
                exit={{ opacity: 0, scale: 0.9, y: -8 }}
                transition={{ opacity: { duration: 0.3 }, scale: { type: 'spring', stiffness: 380, damping: 22 }, y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } }}
                className="card flex items-center gap-2.5 rounded-2xl bg-surface/90 p-2.5 pr-3 shadow-[0_12px_32px_-8px_rgb(0_0_0/0.25)] backdrop-blur-md">
                <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full', p.tone)}><Icon size={15} /></span>
                <div className="min-w-0"><div className="truncate text-[12.5px] font-semibold text-fg">{p.title}</div><div className="truncate text-[11.5px] text-muted">{p.sub}</div></div>
              </motion.div>
            </AnimatePresence>
          </div>
        )
      })}
    </>
  )
}

// ─── Scrolling wall of clips ────────────────────────────────────────────────

function ClipTile({ c }: { c: Clip }) {
  return (
    <figure className="group relative mx-1.5 w-[168px] shrink-0 overflow-hidden rounded-2xl bg-subtle md:w-[200px]">
      <img src={c.src} alt="" loading="lazy" className="aspect-[9/16] w-full object-cover transition duration-700 group-hover:scale-[1.06]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.35),transparent_25%,transparent_55%,rgb(0_0_0/0.78))]" />
      <span className="absolute left-2.5 top-2.5 flex items-center gap-1 text-[11.5px] font-semibold text-pure-white"><Play size={11} fill="currentColor" /> {c.views}</span>
      <span className="absolute right-2.5 top-2.5 flex items-center gap-1 text-[11.5px] font-semibold text-pure-white"><Heart size={11} fill="currentColor" strokeWidth={0} /> {compactCount(c.likes)}</span>
      <figcaption className="absolute inset-x-0 bottom-0 p-3 text-pure-white">
        <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-pure-white/95 px-2 py-0.5 text-[10px] font-semibold text-pure-black"><Check size={10} strokeWidth={3} /> {c.check}</span>
        <div className="text-[12.5px] font-semibold">{c.handle}</div>
        <p className="line-clamp-2 text-[11.5px] leading-snug opacity-90">{c.caption}</p>
      </figcaption>
    </figure>
  )
}

/** Two rows of clips drifting in opposite directions; hovering pauses them. */
export function ClipWall() {
  const rows = [clips.slice(0, 8), clips.slice(8)]
  return (
    <div className="marquee-pause relative space-y-3 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      {rows.map((row, r) => (
        <div key={r} className={cx('marquee', r === 1 && 'marquee-reverse')} style={{ ['--marquee-speed' as string]: r ? '75s' : '60s' }}>
          {[...row, ...row].map((c, k) => <ClipTile key={k} c={c} />)}
        </div>
      ))}
    </div>
  )
}

// ─── Trending styles ticker ─────────────────────────────────────────────────

const tags = ['#ConfessionHook', '#GRWM', '#BeforeAfter', '#POV', '#Unboxing', '#Storytime', '#Routine', '#Tutorial', '#TryOn', '#HonestReview', '#DayInMyLife', '#ASMR']

/** Two tilted bands crossing each other, scrolling in opposite directions. */
export function TrendTicker() {
  const band = (reverse: boolean) => (
    <div className={cx('marquee items-center', reverse && 'marquee-reverse')} style={{ ['--marquee-speed' as string]: reverse ? '55s' : '45s' }}>
      {[...tags, ...tags].map((t, k) => (
        <span key={k} className="title-serif flex items-center gap-8 whitespace-nowrap px-4 text-[24px] md:text-[32px]">
          <span className={k % 3 === 1 ? 'italic' : ''}>{t}</span><span className={cx('text-[14px]', reverse ? 'text-lime' : 'text-pure-white/70')}>✦</span>
        </span>
      ))}
    </div>
  )
  return (
    <div className="relative overflow-hidden py-14" aria-hidden>
      <div className="absolute inset-x-[-5%] top-1/2 -translate-y-1/2 rotate-[2.5deg] bg-fg py-3.5 text-bg">{band(true)}</div>
      <div className="bg-grad relative -rotate-[2deg] scale-x-110 py-4 text-pure-white shadow-[0_20px_40px_-20px_var(--rose)]">{band(false)}</div>
    </div>
  )
}

// ─── Count-up numbers ───────────────────────────────────────────────────────

export function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduce = useReducedMotion()
  const [n, setN] = useState(reduce ? to : 0)
  useEffect(() => {
    if (!inView || reduce) return
    const controls = animate(0, to, { duration: 1.6, ease, onUpdate: v => setN(Math.round(v)) })
    return () => controls.stop()
  }, [inView, reduce, to])
  return <span ref={ref} className="tabular-nums">{n}{suffix}</span>
}
