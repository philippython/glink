import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Globe2, Repeat, RotateCw, TrendingUp, Wand2, X } from 'lucide-react'
import { useState } from 'react'
import { mix } from '../lib/format'
import { Badge, Button, Card, PageHeader, ProductTile, Ring, SectionTitle, Stagger, Tabs } from '../components/ui'
import { getProduct, nextActions } from '../data/seed'
import type { NextAction } from '../data/types'
import { ease } from '../lib/motion'

const kindMeta = {
  replicate: { icon: Copy, color: 'var(--g0)', label: 'Replicate' },
  iterate: { icon: Wand2, color: 'var(--g3)', label: 'Iterate' },
  localize: { icon: Globe2, color: 'var(--g5)', label: 'Localise' },
  refresh: { icon: RotateCw, color: 'var(--g7)', label: 'Refresh' },
  scale: { icon: TrendingUp, color: 'var(--g1)', label: 'Scale' },
}

const lineage = [
  { gen: 'Gen 1', id: '#204', label: 'Glow routine', cpa: 52, note: 'Baseline' },
  { gen: 'Gen 2', id: '#218', label: 'Whiteboard explainer', cpa: 41, note: 'Angle → authority' },
  { gen: 'Gen 3', id: '#231', label: 'Confession v2', cpa: 34, note: 'Angle → confession' },
  { gen: 'Gen 4', id: '#247', label: 'Confession v3', cpa: 29, note: 'Backstory 8s → 5s' },
]

export default function NextExperiment() {
  const [filter, setFilter] = useState<'all' | NextAction['kind']>('all')
  const [items, setItems] = useState(nextActions)
  const [approved, setApproved] = useState<string[]>([])
  const [toast, setToast] = useState<string | null>(null)

  const show = items.filter(a => filter === 'all' || a.kind === filter)

  const approve = (a: NextAction) => {
    setApproved(x => [...x, a.id])
    setToast(`Queued: ${a.title}`)
    setTimeout(() => setToast(null), 2600)
  }
  const dismiss = (id: string) => setItems(x => x.filter(a => a.id !== id))

  return (
    <Stagger>
      <PageHeader eyebrow="Next experiment" title="What to change, retest, localise and scale"
        subtitle="Recommendations are generated from genome deltas and experiment outcomes — each one cites what it’s based on." />

      <Card className="p-6" glow="var(--g0)">
        <SectionTitle right={<span className="text-[12px] text-ink-400">Lumen Skin · Barrier Repair Serum</span>}>Creative lineage</SectionTitle>
        <div className="relative grid gap-3 md:grid-cols-5">
          {lineage.map((g, i) => (
            <motion.div key={g.gen} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.12, ease }}
              className="relative rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold uppercase tracking-wider text-ink-400">{g.gen}</span>
                <span className="font-mono text-ink-300">{g.id}</span>
              </div>
              <div className="mt-2 text-[14px] font-medium text-white">{g.label}</div>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-2xl font-semibold text-white">${g.cpa}</span>
                {i > 0 && <span className="text-[11px] font-medium text-mint">−{Math.round((1 - g.cpa / lineage[i - 1].cpa) * 100)}%</span>}
              </div>
              <div className="mt-2 text-[11.5px] text-ink-400">{g.note}</div>
              {i < lineage.length && (
                <motion.div className="absolute -right-3 top-1/2 z-10 hidden h-px w-3 bg-azure md:block"
                  initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.3 + i * 0.12 }} style={{ originX: 0 }} />
              )}
            </motion.div>
          ))}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7 }}
            className="relative grid place-items-center overflow-hidden rounded-2xl border border-dashed border-azure/40 bg-azure/[0.05] p-4 text-center">
            <motion.div className="absolute inset-0 bg-gradient-to-br from-azure/10 to-transparent" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 3, repeat: Infinity }} />
            <div className="relative">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-azure">Gen 5 · proposed</div>
              <div className="mt-2 text-[14px] font-medium text-white">Hook × creator swap</div>
              <div className="mt-1 text-[12px] text-ink-300">Target CPA ≤ $26</div>
            </div>
          </motion.div>
        </div>
      </Card>

      <div className="mb-4 mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="overflow-x-auto">
          <Tabs id="na" value={filter} onChange={setFilter}
            tabs={[{ value: 'all', label: 'All' }, ...Object.entries(kindMeta).map(([k, v]) => ({ value: k as NextAction['kind'], label: v.label }))]} />
        </div>
        <span className="text-[12px] text-ink-400">{approved.length} queued · ranked by confidence</span>
      </div>

      <motion.div layout className="grid gap-3">
        <AnimatePresence mode="popLayout">
          {[...show].sort((a, b) => b.confidence - a.confidence).map((a, i) => {
            const m = kindMeta[a.kind]
            const done = approved.includes(a.id)
            return (
              <motion.div key={a.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }} transition={{ delay: i * 0.04 }}
                className={`glass relative flex flex-wrap items-center gap-5 overflow-hidden rounded-2xl p-5 ${done ? 'border-mint/30' : ''}`}>
                {done && <motion.div className="absolute inset-0 bg-mint/[0.04]" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ originX: 0 }} transition={{ duration: 0.6, ease }} />}
                <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ background: `${mix(m.color, 12)}`, color: m.color }}>
                  <m.icon size={19} />
                </div>
                <div className="relative min-w-[240px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{m.label}</Badge>
                    <span className="flex items-center gap-1.5 text-[12px] text-ink-400"><ProductTile product={getProduct(a.productId)!} size={18} />{getProduct(a.productId)!.brand}</span>
                  </div>
                  <div className="mt-1.5 text-[15.5px] font-medium text-white">{a.title}</div>
                  <div className="mt-1 max-w-3xl text-[13px] leading-relaxed text-ink-300">{a.detail}</div>
                  <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-400"><Repeat size={11} /> Based on {a.basedOn}</div>
                </div>
                <div className="relative flex items-center gap-5">
                  <div className="text-right">
                    <div className="text-[11px] text-ink-400">Expected</div>
                    <div className="text-[14px] font-semibold text-mint">{a.expectedImpact}</div>
                  </div>
                  <Ring value={a.confidence} size={52} stroke={4} color={m.color}><span className="font-mono text-[11px] text-white">{a.confidence}</span></Ring>
                  {done ? (
                    <Badge tone="mint"><Check size={12} /> Queued</Badge>
                  ) : (
                    <div className="flex gap-1.5">
                      <button onClick={() => dismiss(a.id)} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-ink-400 hover:bg-white/5 hover:text-white" aria-label="Dismiss"><X size={15} /></button>
                      <Button onClick={() => approve(a)}><Check size={14} /> Approve</Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-mint/30 bg-ink-850 px-4 py-3 text-[13px] text-white shadow-2xl">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-mint/20 text-mint"><Check size={13} /></span>{toast}
          </motion.div>
        )}
      </AnimatePresence>
    </Stagger>
  )
}
