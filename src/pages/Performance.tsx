import { AnimatePresence, motion } from 'framer-motion'
import { Crown, Dna, FlaskConical } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  AnimatedNumber, Avatar, Badge, Card, ChartTooltip, PageHeader, ProductTile, Ring, SectionTitle, Stagger, StatusBadge,
} from '../components/ui'
import { experiments, getCreative, getCreator, getProduct } from '../data/seed'
import type { Creative, Metrics } from '../data/types'
import { compact, cx, DASH, money, SERIES } from '../lib/format'

const metricRows: { key: keyof Metrics; label: string; fmt: (n: number) => string; lowerBetter?: boolean }[] = [
  { key: 'spend', label: 'Spend', fmt: n => money(n) },
  { key: 'impressions', label: 'Impressions', fmt: n => compact(n) },
  { key: 'thumbstop', label: 'Thumbstop (3s)', fmt: n => `${n}%` },
  { key: 'holdRate', label: 'Hold rate (15s)', fmt: n => `${n}%` },
  { key: 'ctr', label: 'CTR', fmt: n => `${n}%` },
  { key: 'cvr', label: 'CVR', fmt: n => `${n}%` },
  { key: 'cpa', label: 'CPA', fmt: n => money(n), lowerBetter: true },
  { key: 'roas', label: 'ROAS', fmt: n => `${n}×` },
  { key: 'revenue', label: 'Revenue', fmt: n => money(n) },
]

export default function Performance() {
  const [selId, setSelId] = useState(experiments[0].id)
  const exp = experiments.find(e => e.id === selId)!
  const variants = exp.creativeIds.map(id => getCreative(id)!) as Creative[]
  const maxLen = Math.max(...variants.map(v => v.retention.length))
  const retention = Array.from({ length: maxLen }, (_, s) => {
    const row: Record<string, number | string> = { s: `${s}s` }
    variants.forEach(v => { if (v.retention[s] !== undefined) row[`#${v.number}`] = v.retention[s] })
    return row
  })

  return (
    <Stagger>
      <PageHeader eyebrow="Performance engine" title="Experiments & measurement"
        subtitle="Each experiment isolates one variable, so every result teaches the system something specific." />

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-2.5">
          {experiments.map((e, i) => {
            const p = getProduct(e.productId)!
            const active = e.id === selId
            return (
              <motion.button key={e.id} onClick={() => setSelId(e.id)}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className={cx('relative w-full overflow-hidden rounded-2xl border p-4 text-left transition',
                  active ? 'border-azure/40 bg-azure/[0.07]' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15')}>
                {active && <motion.div layoutId="exp-bar" className="absolute inset-y-3 left-0 w-[3px] rounded-r bg-azure" />}
                <div className="flex items-center gap-2.5">
                  <ProductTile product={p} size={28} />
                  <span className="font-mono text-[11px] text-ink-400">{e.id.toUpperCase()} · Gen {e.generation}</span>
                  <span className="ml-auto"><StatusBadge status={e.status} /></span>
                </div>
                <div className="mt-2.5 text-[14px] font-medium text-white">{e.name}</div>
                <div className="mt-0.5 text-[12px] text-ink-400">Variable: {e.variable}</div>
                {e.lift !== undefined && <div className="mt-2 text-[12px] font-medium text-mint">CPA −{e.lift}% vs control</div>}
              </motion.button>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={exp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }} className="space-y-4">
            <Card className="p-6">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-[12px] text-ink-400"><FlaskConical size={13} /> {getProduct(exp.productId)!.brand} · started {exp.started}</div>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">{exp.name}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone="azure">Variable · {exp.variable}</Badge>
                    <Badge>Budget {money(exp.budget)}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <Ring value={exp.confidence} size={78} color={exp.confidence >= 95 ? 'var(--g1)' : 'var(--g2)'}>
                      <span className="font-mono text-[15px] text-white"><AnimatedNumber value={exp.confidence} format={n => `${Math.round(n)}%`} /></span>
                    </Ring>
                    <div className="mt-1.5 text-[11px] text-ink-400">Confidence</div>
                  </div>
                  {exp.lift !== undefined && (
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-ink-400">Lift</div>
                      <div className="text-4xl font-semibold text-mint"><AnimatedNumber value={exp.lift} format={n => `${n.toFixed(1)}%`} /></div>
                      <div className="text-[11px] text-ink-400">CPA reduction</div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {exp.status === 'queued' ? (
              <Card className="grid place-items-center p-14 text-center">
                <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.05]"><FlaskConical className="text-ink-300" size={20} /></div>
                <div className="text-white">Queued for {exp.started}</div>
                <div className="mt-1 max-w-sm text-[13px] text-ink-400">Holds #247’s hook constant and swaps the creator. Waiting for Sofia Álvarez’s submission.</div>
              </Card>
            ) : (
              <>
                <Card className="p-6">
                  <SectionTitle right={<span className="text-[12px] text-ink-400">% of viewers still watching</span>}>Retention curve</SectionTitle>
                  <div className="h-[260px]">
                    <ResponsiveContainer>
                      <LineChart data={retention} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                        <CartesianGrid stroke="rgb(var(--fg-rgb)/.05)" vertical={false} />
                        <XAxis dataKey="s" tick={{ fill: 'var(--g8)', fontSize: 11 }} axisLine={false} tickLine={false} interval={4} />
                        <YAxis tick={{ fill: 'var(--g8)', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                        <Tooltip content={<ChartTooltip fmt={v => `${v}%`} />} cursor={{ stroke: 'rgb(var(--fg-rgb)/.15)' }} />
                        <Legend iconType="plainline" iconSize={14} wrapperStyle={{ fontSize: 12, color: 'var(--g3)', paddingTop: 8 }} />
                        {variants.map((v, i) => (
                          <Line key={v.id} type="monotone" dataKey={`#${v.number}`} stroke={SERIES[i]} strokeDasharray={DASH[i]} strokeWidth={2} dot={false} activeDot={{ r: 5 }} animationDuration={1300} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-[13px]">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="px-6 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-ink-400">Metric</th>
                          {variants.map((v, i) => {
                            const cr = getCreator(v.creatorId)!
                            const win = exp.winnerId === v.id
                            return (
                              <th key={v.id} className="px-6 py-4 text-right">
                                <Link to={`/brand/genome/${v.id}`} className="inline-flex items-center gap-2">
                                  <span className={cx('w-3 border-t-2', i > 0 && 'border-dashed')} style={{ borderColor: SERIES[i] }} />
                                  <Avatar creator={cr} size={22} />
                                  <span className="font-medium text-white hover:text-azure">#{v.number}</span>
                                  {win && <Crown size={14} className="text-gold" />}
                                </Link>
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {metricRows.map((m, ri) => {
                          const vals = variants.map(v => v.metrics[m.key])
                          const best = m.key === 'spend' || m.key === 'impressions' ? null : (m.lowerBetter ? Math.min(...vals) : Math.max(...vals))
                          return (
                            <motion.tr key={m.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 + ri * 0.03 }}
                              className="border-b border-white/[0.04] last:border-0">
                              <td className="px-6 py-3 text-ink-300">{m.label}</td>
                              {variants.map(v => {
                                const val = v.metrics[m.key]
                                return (
                                  <td key={v.id} className={cx('px-6 py-3 text-right font-mono', val === best && variants.length > 1 ? 'font-medium text-mint' : 'text-ink-100')}>
                                    {m.fmt(val)}
                                  </td>
                                )
                              })}
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/[0.06] px-6 py-4">
                    <span className="text-[12px] text-ink-400">Best value per metric highlighted.</span>
                    {exp.winnerId && (
                      <Link to={`/brand/genome/${exp.winnerId}`} className="inline-flex items-center gap-1.5 text-[13px] text-azure hover:underline">
                        <Dna size={14} /> Open winner’s genome
                      </Link>
                    )}
                  </div>
                </Card>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Stagger>
  )
}
