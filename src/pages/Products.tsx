import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Globe, Link2, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, Card, PageHeader, ProductTile, Stagger, StatusBadge } from '../components/ui'
import { products } from '../data/seed'
import type { Product } from '../data/types'
import { api, errorMessage } from '../lib/api'
import { money } from '../lib/format'
import { ease } from '../lib/motion'

const steps = [
  'Fetching product page',
  'Reading product facts and price',
  'Mapping audience segments',
  'Finding purchase objections',
  'Generating creative angles',
]

interface Analysis {
  url: string; host: string; name: string; brand: string; price?: number; category: string; source: 'ai' | 'page'
  summary: string; audiences: Product['audiences']; objections: Product['objections']; angles: Product['angles']; usps: string[]
}

/** Turns the API's analysis into a product the intelligence pages can show (kept for this session). */
function toProduct(a: Analysis): Product {
  const p: Product = {
    id: `p-${Date.now()}`, name: a.name || 'Product', brand: a.brand, category: a.category, url: a.url.replace(/^https?:\/\//, ''),
    price: a.price ?? 0, hue: 'var(--g3)', emoji: '✨', status: 'ready', summary: a.summary, audiences: a.audiences,
    objections: a.objections, competitors: [], angles: a.angles, usps: a.usps, creatives: 0, bestCpa: 0,
  }
  products.unshift(p)
  return p
}

export default function Products() {
  const [url, setUrl] = useState('')
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(0)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Step through the progress list while the request runs; the last step waits for the answer.
  useEffect(() => {
    if (!running || done >= steps.length - 1) return
    const t = setTimeout(() => setDone(d => d + 1), 700)
    return () => clearTimeout(t)
  }, [running, done])

  const start = async () => {
    if (running) return
    if (url.trim().length < 4) { setError('Paste a product URL first.'); return }
    setError(''); setRunning(true); setDone(0)
    try {
      const a = await api<Analysis>('/products/analyze', { body: { url: url.trim() } })
      setDone(steps.length)
      const p = toProduct(a)
      setTimeout(() => navigate(`/brand/products/${p.id}`), 400)
    } catch (e) {
      setError(errorMessage(e)); setRunning(false)
    }
  }

  return (
    <Stagger>
      <PageHeader eyebrow="Products" title="Start with a product URL"
        subtitle="Product Intelligence reads your page, reviews and competitors, then proposes testable creative angles." />

      <Card className="p-2" glow="var(--g3)">
        <form onSubmit={e => { e.preventDefault(); void start() }} className="flex flex-col gap-2 md:flex-row">
          <div className="relative flex flex-1 items-center">
            <Link2 size={18} className="absolute left-4 text-ink-400" />
            <input
              value={url} onChange={e => setUrl(e.target.value)} disabled={running}
              placeholder="https://yourbrand.com/products/your-hero-product"
              className="h-14 w-full rounded-xl bg-transparent pl-12 pr-4 text-[15px] text-white outline-none placeholder:text-ink-400"
            />
          </div>
          <motion.button type="submit" whileTap={{ scale: 0.97 }} disabled={running}
            className="relative inline-flex h-14 items-center justify-center gap-2 overflow-hidden rounded-xl bg-white px-6 font-medium text-ink-950 disabled:opacity-90">
            {running ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
            {running ? 'Analysing…' : 'Analyse product'}
            {!running && <span className="shimmer absolute inset-0" />}
          </motion.button>
        </form>
        {error && <p role="alert" className="px-3 pb-2 text-[13px] text-danger">{error}</p>}

        <AnimatePresence>
          {running && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ ease, duration: 0.5 }} className="overflow-hidden">
              <div className="grid gap-6 border-t border-white/[0.06] p-6 md:grid-cols-[1fr_260px]">
                <div className="space-y-3">
                  {steps.map((s, i) => {
                    const state = i < done ? 'done' : i === done ? 'active' : 'pending'
                    return (
                      <motion.div key={s} initial={{ opacity: 0, x: -8 }} animate={{ opacity: state === 'pending' ? 0.35 : 1, x: 0 }}
                        transition={{ delay: i * 0.05 }} className="flex items-center gap-3 text-[14px]">
                        <div className={`grid h-6 w-6 place-items-center rounded-full border ${state === 'done' ? 'border-mint/40 bg-mint/15 text-mint' : 'border-white/10 text-ink-400'}`}>
                          {state === 'done' ? <Check size={13} /> : state === 'active' ? <Loader2 size={13} className="animate-spin text-azure" /> : <span className="h-1 w-1 rounded-full bg-current" />}
                        </div>
                        <span className={state === 'done' ? 'text-ink-200' : state === 'active' ? 'text-white' : 'text-ink-400'}>{s}</span>
                      </motion.div>
                    )
                  })}
                </div>
                <div className="grid place-items-center">
                  <ScanOrb progress={done / steps.length} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {!running && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-ink-400">
          Try:
          {['glowtheory.com/products/vitamin-c-drops', 'trailmix.co/shop/protein-bites', 'quietly.app/sleep'].map(u => (
            <button key={u} onClick={() => setUrl('https://' + u)} className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-ink-300 hover:text-white">
              {u}
            </button>
          ))}
        </motion.div>
      )}

      <div className="mb-4 mt-10 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Your products</h2>
        <span className="text-[12px] text-ink-400">{products.length} products</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {products.map(p => (
          <Card key={p.id} hover className="group">
            <Link to={`/brand/products/${p.id}`} className="block p-6">
              <div className="flex items-start gap-4">
                <ProductTile product={p} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-ink-400">{p.brand}</span>
                    <Badge>{p.category}</Badge>
                  </div>
                  <div className="mt-0.5 text-[17px] font-semibold text-white">{p.name}</div>
                  <div className="mt-1 flex items-center gap-1.5 truncate font-mono text-[11px] text-ink-400"><Globe size={11} />{p.url}</div>
                </div>
                <StatusBadge status={p.status} />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-center">
                <Metric label="Creatives" value={String(p.creatives)} />
                <Metric label="Best CPA" value={p.bestCpa ? money(p.bestCpa) : '—'} />
                <Metric label="Top angle" value={p.angles[0].name} small />
              </div>

              <div className="mt-4 flex items-center justify-between text-[13px]">
                <span className="text-ink-400">{p.audiences.length} audiences · {p.objections.length} objections mapped</span>
                <span className="flex items-center gap-1 text-azure opacity-0 transition group-hover:opacity-100">Open <ArrowRight size={13} /></span>
              </div>
            </Link>
          </Card>
        ))}
      </div>
    </Stagger>
  )
}

function Metric({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-ink-400">{label}</div>
      <div className={`mt-0.5 truncate font-medium text-white ${small ? 'text-[13px]' : 'font-mono text-[15px]'}`}>{value}</div>
    </div>
  )
}

function ScanOrb({ progress }: { progress: number }) {
  return (
    <div className="relative h-48 w-48">
      <motion.div className="absolute inset-0 rounded-full border border-azure/30" animate={{ scale: [1, 1.15], opacity: [0.6, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
      <motion.div className="absolute inset-0 rounded-full border border-fg-2/30" animate={{ scale: [1, 1.15], opacity: [0.6, 0] }} transition={{ duration: 1.6, repeat: Infinity, delay: 0.8 }} />
      <motion.div className="absolute inset-4 rounded-full" style={{ background: 'conic-gradient(from 0deg, transparent, rgb(var(--fg-rgb)/.5), transparent 40%)' }}
        animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} />
      <div className="absolute inset-6 grid place-items-center rounded-full border border-white/10 bg-ink-900">
        <div className="text-center">
          <div className="font-mono text-3xl font-medium text-white">{Math.round(progress * 100)}%</div>
          <div className="text-[11px] text-ink-400">understanding</div>
        </div>
      </div>
    </div>
  )
}
