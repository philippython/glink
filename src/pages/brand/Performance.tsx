import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button, Empty, ErrorBanner, Field, Input, Label, PageHeader, Panel, Pill, SectionHead, Stat, StatRow, useToast } from '../../components/kit'
import type { CreativeSubmission } from '../../data/market'
import { useStore, type Metrics } from '../../data/store'
import { errorMessage } from '../../lib/api'
import { compact, money } from '../../lib/format'
import { brandInsights } from '../../lib/insights'

export default function BrandPerformance() {
  const { state } = useStore()
  const [recording, setRecording] = useState<CreativeSubmission | null>(null)
  const approved = state.submissions.filter(s => ['approved', 'paid'].includes(s.status))
  const withMetrics = approved.filter(s => s.metrics)
  const views = withMetrics.reduce((a, s) => a + s.metrics!.views, 0)
  const clicks = withMetrics.reduce((a, s) => a + s.metrics!.clicks, 0)
  const conversions = withMetrics.reduce((a, s) => a + s.metrics!.conversions, 0)
  const spend = withMetrics.reduce((a, s) => a + s.metrics!.spend, 0)
  const insights = brandInsights(state)

  return (
    <>
      <PageHeader title="Performance" subtitle="What your creatives earned, and what the system learned from them." />
      <StatRow>
        <Stat label="Impressions" value={compact(views)} />
        <Stat label="Click-through rate" value={views ? `${((clicks / views) * 100).toFixed(2)}%` : '—'} />
        <Stat label="Conversions" value={conversions.toLocaleString()} />
        <Stat label="Cost per result" value={conversions ? money(spend / conversions) : '—'} />
      </StatRow>

      <section className="mt-10">
        <SectionHead title="By creative" />
        <Panel pad={false} className="overflow-x-auto">
          {approved.length === 0 ? <Empty text="Results appear once you approve your first video." /> : (
            <table className="w-full min-w-[760px] text-[13.5px]">
              <thead className="bg-subtle text-left"><tr className="text-[11px] uppercase tracking-[0.08em] text-faint">
                <th className="px-5 py-3 font-medium">Creative</th><th className="px-3 py-3 text-right font-medium">Impressions</th>
                <th className="px-3 py-3 text-right font-medium">CTR</th><th className="px-3 py-3 text-right font-medium">Conversions</th>
                <th className="px-3 py-3 text-right font-medium">Cost / result</th><th className="px-5 py-3 text-right font-medium" />
              </tr></thead>
              <tbody>
                {approved.map(s => {
                  const c = state.campaigns.find(x => x.id === s.campaignId)!
                  const cr = state.creators.find(x => x.id === s.creatorId)
                  const m = s.metrics
                  return (
                    <tr key={s.id} className="border-t border-line">
                      <td className="px-5 py-4"><div className="font-medium text-fg">{c.name}, video {s.index}</div><div className="text-[12.5px] text-muted">{cr?.displayName} · benchmark {c.benchmarkCtr}%</div></td>
                      <td className="px-3 py-4 text-right tabular-nums">{m ? compact(m.views) : '—'}</td>
                      <td className="px-3 py-4 text-right tabular-nums">{m ? `${m.ctr}%` : '—'}</td>
                      <td className="px-3 py-4 text-right tabular-nums">{m ? m.conversions.toLocaleString() : '—'}</td>
                      <td className="px-3 py-4 text-right tabular-nums">{m?.conversions ? money(m.costPerResult) : '—'}</td>
                      <td className="px-5 py-4 text-right">
                        <span className="inline-flex items-center gap-2">
                          {s.winning && <Pill tone="success">Winning</Pill>}
                          {state.permissions.canSpend && <Button size="sm" variant="secondary" onClick={() => setRecording(s)}>{m ? 'Update results' : 'Record results'}</Button>}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Panel>
        <p className="mt-2 text-[12.5px] text-faint">Add results from your ad platform. Connecting Meta / TikTok ad accounts to import them automatically is the next integration.</p>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section className="min-w-0">
          <SectionHead title="AI insights" />
          <Panel pad={false}>
            {insights.map(i => (
              <div key={i.title} className="border-b border-line px-5 py-4 last:border-0">
                <div className="title-serif text-[19px] text-fg">{i.title}</div>
                <p className="mt-1 text-[13.5px] text-muted">{i.text}</p>
              </div>
            ))}
          </Panel>
        </section>
        <section className="min-w-0">
          <SectionHead title="Go deeper" />
          <Panel pad={false}>
            {[
              { to: '/brand/genome/cr-247', title: 'Creative Genome', text: 'Example: why a winning video worked, gene by gene.' },
              { to: '/brand/performance/experiments', title: 'Experiments', text: 'Example head-to-head tests and retention curves.' },
              { to: '/brand/next', title: 'Next experiment', text: 'Example recommendations for what to test next.' },
            ].map(l => (
              <Link key={l.to} to={l.to} className="flex items-center gap-3 border-b border-line px-5 py-4 last:border-0 hover:bg-subtle">
                <div className="flex-1"><div className="text-[14px] font-medium text-fg">{l.title}</div><div className="text-[13px] text-muted">{l.text}</div></div>
                <ArrowRight size={15} className="text-faint" />
              </Link>
            ))}
          </Panel>
          <Label className="mt-4">These three screens still show sample data.</Label>
        </section>
      </div>

      <AnimatePresence>{recording && <RecordResults sub={recording} onClose={() => setRecording(null)} />}</AnimatePresence>
    </>
  )
}

function RecordResults({ sub, onClose }: { sub: CreativeSubmission; onClose: () => void }) {
  const { state, recordMetrics } = useStore()
  const toast = useToast()
  const c = state.campaigns.find(x => x.id === sub.campaignId)!
  const m = sub.metrics
  const [f, setF] = useState({ impressions: String(m?.views ?? ''), clicks: String(m?.clicks ?? ''), conversions: String(m?.conversions ?? ''), spend: String(m?.spend ?? ''), thumbstop: String(m?.thumbstop ?? ''), holdRate: String(m?.holdRate ?? '') })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const n = (v: string) => Number(v) || 0
  const ctr = n(f.impressions) ? (n(f.clicks) / n(f.impressions)) * 100 : 0

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const body: Metrics = { impressions: n(f.impressions), clicks: n(f.clicks), conversions: n(f.conversions), spend: n(f.spend), thumbstop: n(f.thumbstop), holdRate: n(f.holdRate) }
      const r = await recordMetrics(sub.id, body)
      toast(r.bonusPaid ? `Winning! ${money(c.bonusAmount)} bonus paid to the creator` : r.winning ? 'Results saved — this video is winning' : 'Results saved')
      onClose()
    } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  const fields: [keyof typeof f, string, string][] = [
    ['impressions', 'Impressions', ''], ['clicks', 'Clicks', ''], ['conversions', 'Conversions', ''], ['spend', 'Ad spend (USD)', ''],
    ['thumbstop', '3-second view rate (%)', 'Hook'], ['holdRate', '15-second view rate (%)', 'Retention'],
  ]
  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form onSubmit={save} noValidate onClick={e => e.stopPropagation()} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card my-auto w-full max-w-lg rounded-xl p-6">
        <div className="mb-1 flex items-start justify-between">
          <div><h2 className="title-serif text-[24px] text-fg">Record results</h2><p className="text-[13px] text-muted">{c.name}, video {sub.index}</p></div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-subtle" aria-label="Close"><X size={16} /></button>
        </div>
        {error && <div className="mt-4"><ErrorBanner>{error}</ErrorBanner></div>}
        <div className="mt-5 grid grid-cols-2 gap-4">
          {fields.map(([k, label, hint]) => (
            <Field key={k} label={label} htmlFor={`m-${k}`} hint={hint ? `Feeds the creator’s ${hint.toLowerCase()} strength` : undefined}>
              <Input id={`m-${k}`} type="number" min={0} step="any" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} />
            </Field>
          ))}
        </div>
        <div className="mt-5 rounded-lg bg-subtle px-4 py-3 text-[13px]">
          Click-through <span className="font-medium text-fg">{ctr.toFixed(2)}%</span> vs benchmark {c.benchmarkCtr}% —{' '}
          {ctr > c.benchmarkCtr ? <span className="text-success">beats it{c.bonusAmount ? `; the ${money(c.bonusAmount)} bonus will be paid if within 14 days of approval` : ''}</span> : <span className="text-muted">below the benchmark</span>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy}>Save results</Button>
        </div>
      </motion.form>
    </motion.div>
  )
}
