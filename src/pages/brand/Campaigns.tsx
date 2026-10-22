import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DeadlineChip } from '../../components/ui'
import { Empty, LinkButton, PageHeader, Panel, Pill, Progress } from '../../components/kit'
import { deadlineOf, type Campaign } from '../../data/market'
import { useStore } from '../../data/store'
import { cx, fmtDate, money } from '../../lib/format'
import { campaignImage } from '../../lib/images'

const statusTone = { draft: 'neutral', live: 'success', completed: 'neutral' } as const
const sourcingLabel = { auto: 'Auto-matched', handpick: 'Hand-picked', contest: 'Contest' }

export default function Campaigns() {
  const { state } = useStore()
  const [filter, setFilter] = useState<'all' | Campaign['status']>('all')
  const list = state.campaigns.filter(c => filter === 'all' || c.status === filter)

  const progress = (c: Campaign) => {
    if (c.sourcing === 'contest') {
      const entries = state.submissions.filter(s => s.campaignId === c.id && ['submitted', 'approved', 'paid', 'rejected'].includes(s.status)).length
      return { done: entries, target: c.creatorsWanted, label: `${entries} entries` }
    }
    const target = c.creatorsWanted * c.deliverables.count
    const done = state.submissions.filter(s => s.campaignId === c.id && ['submitted', 'approved', 'paid'].includes(s.status)).length
    return { done, target, label: `${done} of ${target}` }
  }
  const spend = (c: Campaign) => state.payments.filter(p => p.campaignId === c.id).reduce((a, p) => a + p.base + p.bonus, 0)

  return (
    <>
      <PageHeader title="Campaigns" subtitle="Every campaign has a brief, a sourcing method and a submission deadline."
        actions={<>
          <LinkButton variant="secondary" to="/brand/products">Product intelligence</LinkButton>
          <LinkButton to="/brand/campaigns/new"><Plus size={15} /> New campaign</LinkButton>
        </>} />

      <div className="mb-4 flex gap-1 text-[13px]" role="tablist">
        {(['all', 'live', 'draft', 'completed'] as const).map(f => (
          <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
            className={cx('rounded-lg px-3 py-1.5 capitalize', filter === f ? 'bg-subtle font-medium text-fg' : 'text-muted hover:text-fg')}>{f}</button>
        ))}
      </div>

      <Panel pad={false} className="overflow-x-auto">
        {list.length === 0 ? <Empty text="No campaigns here yet." action={<LinkButton to="/brand/campaigns/new">Create a campaign</LinkButton>} /> : (
          <table className="w-full min-w-[760px] text-[13.5px]">
            <thead className="bg-subtle text-left">
              <tr className="text-[11px] uppercase tracking-[0.08em] text-faint">
                <th className="px-5 py-3 font-medium">Campaign</th><th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Sourcing</th><th className="w-44 px-3 py-3 font-medium">Delivered</th>
                <th className="px-3 py-3 text-right font-medium">Spend</th><th className="px-5 py-3 font-medium">Due</th>
              </tr>
            </thead>
            <tbody>
              {list.map(c => {
                const p = progress(c)
                return (
                  <tr key={c.id} className="border-t border-line hover:bg-subtle">
                    <td className="px-5 py-4">
                      <Link to={c.sourcing === 'contest' ? '/brand/contests' : `/brand/creators?campaign=${c.id}`} className="flex items-center gap-3.5">
                        <img src={campaignImage(c)} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-lg bg-subtle object-cover" />
                        <div className="min-w-0">
                          <div className="font-medium text-fg">{c.name}</div>
                          <div className="text-[12.5px] text-muted">{c.product} · {c.market}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-4"><Pill tone={statusTone[c.status]} className="capitalize">{c.status}</Pill></td>
                    <td className="px-3 py-4 text-muted">{sourcingLabel[c.sourcing]}</td>
                    <td className="px-3 py-4"><div className="mb-1.5 text-[12.5px] text-muted">{p.label}</div><Progress value={p.target ? (p.done / p.target) * 100 : 0} /></td>
                    <td className="px-3 py-4 text-right tabular-nums text-fg">{money(spend(c))}</td>
                    <td className="px-5 py-4">{c.status === 'live' ? <DeadlineChip milestones={c.timeline} /> : <span className="text-muted">{fmtDate(deadlineOf(c))}</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  )
}
