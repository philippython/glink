import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Globe, RefreshCw, ShieldAlert, Sparkles, Swords, Target, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Avatar, Badge, Button, Card, EvidenceBadge, ProductTile, ScoreBar, SectionTitle, Stagger, StatusBadge,
} from '../components/ui'
import { creators, getProduct, hypotheses } from '../data/seed'
import type { Hypothesis, Product } from '../data/types'
import { money } from '../lib/format'
import { ease, rise } from '../lib/motion'

/** Fallback hypotheses for a freshly analysed product (until the backend generates them). */
function draftHypotheses(p: Product): Hypothesis[] {
  return p.angles.slice(0, 3).map((a, i) => ({
    id: `${p.id}-h${i}`, productId: p.id, title: `${a.name} for ${p.audiences[i % p.audiences.length].name.toLowerCase()}`,
    angle: a.name, format: ['Confession / problem-solution', 'Before / after', 'Expert explainer'][i],
    hook: ['“I wasted months before I found this.”', '“Day 1 vs day 14. No filter.”', '“Here’s what nobody tells you about this.”'][i],
    story: ['Hook', 'Problem', 'Reveal', 'Proof', 'CTA'], rationale: a.why, confidence: a.strength - 12,
    stage: 'draft', creatorIds: [],
  }))
}

export default function ProductDetail() {
  const { id } = useParams()
  const product = getProduct(id!)
  const [regen, setRegen] = useState(0)
  if (!product) return <div className="text-ink-300">Product not found.</div>

  const hyps = (hypotheses.filter(h => h.productId === product.id).length
    ? hypotheses.filter(h => h.productId === product.id)
    : draftHypotheses(product)).slice(0, 3)

  const matches = creators
    .map(c => ({ c, fit: c.categories.find(x => x.category === product.category) }))
    .filter(m => m.fit)
    .sort((a, b) => b.fit!.fit - a.fit!.fit)
    .slice(0, 4)

  return (
    <Stagger>
      <motion.div variants={rise}>
        <Link to="/brand/products" className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-white">
          <ArrowLeft size={14} /> Products
        </Link>
      </motion.div>

      <Card className="p-7" glow={product.hue}>
        <div className="flex flex-wrap items-start gap-5">
          <ProductTile product={product} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-ink-400">{product.brand}</span>
              <Badge>{product.category}</Badge>
              <StatusBadge status={product.status} />
            </div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">{product.name}</h1>
            <div className="mt-1 flex items-center gap-1.5 font-mono text-[12px] text-ink-400"><Globe size={12} /> {product.url} · {money(product.price)}</div>
            <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-ink-200">{product.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {product.usps.map(u => <Badge key={u} tone="azure"><Check size={11} />{u}</Badge>)}
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <SectionTitle right={<Users size={15} className="text-ink-400" />}>Audience segments</SectionTitle>
          <div className="space-y-4">
            {product.audiences.map((a, i) => (
              <div key={a.name}>
                <div className="mb-1.5 flex items-baseline justify-between text-[13.5px]">
                  <span className="font-medium text-white">{a.name}</span>
                  <span className="font-mono text-ink-300">{a.share}%</span>
                </div>
                <ScoreBar value={a.share * 1.5} color="var(--g0)" delay={0.1 * i} height={6} />
                <div className="mt-1.5 text-[12.5px] text-ink-400">{a.insight}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <SectionTitle right={<ShieldAlert size={15} className="text-ink-400" />}>Objections to overcome</SectionTitle>
          <div className="space-y-3">
            {product.objections.map((o, i) => (
              <motion.div key={o.text} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.07 }}
                className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <div className="flex-1 text-[13.5px] text-ink-100">{o.text}</div>
                <div className="w-24"><ScoreBar value={o.severity} color="var(--g7)" height={5} delay={0.2 + i * 0.07} /></div>
                <span className="w-7 text-right font-mono text-[12px] text-ink-300">{o.severity}</span>
              </motion.div>
            ))}
          </div>
          <div className="mt-3 text-[11.5px] text-ink-400">Severity = share of negative reviews + competitor-comment mentions.</div>
        </Card>

        <Card className="p-6">
          <SectionTitle right={<Target size={15} className="text-ink-400" />}>Creative angles</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {product.angles.map((a, i) => (
              <motion.div key={a.name} whileHover={{ y: -2 }} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-medium text-white">{a.name}</span>
                  <span className="font-mono text-[12px] text-gold">{a.strength}</span>
                </div>
                <div className="mt-1 text-[12.5px] text-ink-400">{a.why}</div>
                <div className="mt-3"><ScoreBar value={a.strength} color="var(--g2)" height={4} delay={0.15 * i} /></div>
              </motion.div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <SectionTitle right={<Swords size={15} className="text-ink-400" />}>Competitive landscape</SectionTitle>
          <div className="divide-y divide-white/[0.05]">
            {product.competitors.map(c => (
              <div key={c.name} className="grid grid-cols-[1fr_1fr] gap-4 py-3 text-[13px] first:pt-0">
                <div><div className="font-medium text-white">{c.name}</div><div className="text-ink-400">{c.angle}</div></div>
                <div className="text-ink-300"><span className="text-[11px] uppercase tracking-wider text-danger">Gap · </span>{c.weakness}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Hypotheses */}
      <motion.div variants={rise} className="mb-4 mt-10 flex items-end justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-2">Creative hypotheses</div>
          <h2 className="mt-1 text-xl font-semibold text-white">3 testable creative hypotheses</h2>
        </div>
        <Button variant="soft" onClick={() => setRegen(r => r + 1)}><RefreshCw size={14} /> Regenerate</Button>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {hyps.map((h, i) => (
            <motion.div key={`${h.id}-${regen}`} layout
              initial={{ opacity: 0, y: 20, rotateX: -10 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} exit={{ opacity: 0, scale: 0.96 }}
              transition={{ delay: i * 0.1, duration: 0.6, ease }}
              className="glass relative flex flex-col overflow-hidden rounded-2xl p-6">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fg-2/60 to-transparent" />
              <div className="flex items-center justify-between">
                <Badge tone="violet">H{i + 1} · {h.angle}</Badge>
                <span className="font-mono text-[12px] text-ink-300">{h.confidence}% conf.</span>
              </div>
              <div className="mt-4 text-[16px] font-semibold text-white">{h.title}</div>
              <div className="mt-3 rounded-xl border border-white/[0.06] bg-ink-950/50 p-3 font-serif text-[17px] italic leading-snug text-ink-100">{h.hook}</div>
              <ol className="mt-4 space-y-1.5 text-[13px] text-ink-300">
                {h.story.map((s, j) => (
                  <li key={s} className="flex gap-2.5"><span className="font-mono text-[11px] text-ink-400">{String(j + 1).padStart(2, '0')}</span>{s}</li>
                ))}
              </ol>
              <div className="mt-4 border-t border-white/[0.05] pt-3 text-[12.5px] text-ink-400">
                <span className="text-ink-200">Why: </span>{h.rationale}
              </div>
              <Link to={`/brand/campaigns/new?angle=${encodeURIComponent(h.angle)}&opening=${encodeURIComponent(h.hook.replace(/[“”"]/g, ''))}`} className="mt-auto pt-4">
                <Button variant="soft" className="w-full">Use in a new brief <ArrowRight size={14} /></Button>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Creator match */}
      <motion.div variants={rise} className="mb-4 mt-10">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal">Creator match</div>
        <h2 className="mt-1 text-xl font-semibold text-white">Best-fit creators for {product.category}</h2>
      </motion.div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {matches.map(({ c, fit }, i) => (
          <Card key={c.id} hover>
            <Link to={`/brand/creators/${c.id}`} className="block p-5">
              <div className="flex items-center gap-3">
                <Avatar creator={c} size={40} />
                <div className="min-w-0">
                  <div className="truncate font-medium text-white">{c.name}</div>
                  <div className="truncate text-[12px] text-ink-400">{c.strongestFormat}</div>
                </div>
                {i === 0 && <Sparkles size={15} className="ml-auto shrink-0 text-gold" />}
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div className="text-3xl font-semibold text-white">{fit!.fit}</div>
                <EvidenceBadge evidence={fit!.evidence} />
              </div>
              <div className="mt-2"><ScoreBar value={fit!.fit} color="var(--g5)" height={5} delay={0.1 * i} /></div>
              <div className="mt-3 text-[12px] text-ink-400">{fit!.samples} {product.category.toLowerCase()} creatives · {c.reliability}% reliable</div>
            </Link>
          </Card>
        ))}
      </div>
    </Stagger>
  )
}
