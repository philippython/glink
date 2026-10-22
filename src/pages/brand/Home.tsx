import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, Empty, Label, LinkButton, Panel, PageHeader, Pill, Progress, SectionHead, Stat, StatRow } from '../../components/kit'
import { deadlineOf, preflightIssues } from '../../data/market'
import { useStore } from '../../data/store'
import { fmtDate, greeting, money, pluralize } from '../../lib/format'
import { brandInsights } from '../../lib/insights'
import { photos } from '../../lib/images'

export default function BrandHome() {
  const { state } = useStore()
  const live = state.campaigns.filter(c => c.status === 'live')
  const waiting = state.submissions.filter(s => s.status === 'submitted')
  const delivered = state.submissions.filter(s => ['submitted', 'approved', 'paid'].includes(s.status))
  const winning = state.submissions.filter(s => s.winning)
  const month = new Date().toISOString().slice(0, 7)
  const spent = state.payments.filter(p => p.date.startsWith(month)).reduce((a, p) => a + p.base + p.bonus, 0)

  const insight = brandInsights(state)[0]
  const camp = (id: string) => state.campaigns.find(c => c.id === id)!
  const creator = (id: string) => state.creators.find(c => c.id === id)!

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${state.brand.name}.`}
        subtitle={waiting.length ? `${pluralize(waiting.length, 'creative')} ${waiting.length === 1 ? 'is' : 'are'} waiting for your review.` : 'Nothing is waiting for review right now.'}
        actions={<LinkButton to="/brand/campaigns/new"><Plus size={15} /> New campaign</LinkButton>}
      />

      <StatRow>
        <Stat label="Active campaigns" value={live.length} />
        <Stat label="Creatives delivered" value={delivered.length} />
        <Stat label="Winning creatives" value={winning.length} />
        <Stat label="Spent this month" value={money(spent)} />
      </StatRow>

      <Panel pad={false} className="mt-6 grid overflow-hidden bg-subtle md:grid-cols-[1fr_300px]">
        <img src={photos.brandHome} alt="" className="order-last hidden h-full w-full object-cover md:block" />
        <div className="p-6">
        <Label>AI insight</Label>
        <div className="title-serif mt-3 text-[26px] leading-snug text-fg">{insight.title}</div>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">{insight.text}</p>
        {insight.angle
          ? <LinkButton variant="secondary" className="mt-5" to={`/brand/campaigns/new?angle=${encodeURIComponent(insight.angle)}&opening=${encodeURIComponent(insight.opening ?? '')}`}>Use this in a new brief</LinkButton>
          : <LinkButton variant="secondary" className="mt-5" to="/brand/performance">Go to Performance</LinkButton>}
        </div>
      </Panel>

      <div className="mt-10 grid gap-8 xl:grid-cols-2">
        <section className="min-w-0">
          <SectionHead title="Waiting for your review" action={<Link to="/brand/reviews" className="text-[13px] text-muted hover:text-fg">View all</Link>} />
          <Panel pad={false}>
            {waiting.length === 0 ? <Empty text="You’re all caught up. New videos will appear here." /> : waiting.map(s => {
              const c = camp(s.campaignId), cr = creator(s.creatorId), issues = preflightIssues(s.preflight)
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-4 last:border-0">
                  <Avatar name={cr.displayName} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium text-fg">{cr.displayName}</div>
                    <div className="truncate text-[13px] text-muted">{c.name} · video {s.index} of {c.deliverables.count}</div>
                  </div>
                  {issues ? <Pill tone="warn">{pluralize(issues, 'issue')} found</Pill> : <Pill tone="success">✓ Pre-flight passed</Pill>}
                  <LinkButton size="sm" to={`/brand/reviews/${s.id}`}>Review</LinkButton>
                </div>
              )
            })}
          </Panel>
        </section>

        <section className="min-w-0">
          <SectionHead title="Active campaigns" action={<Link to="/brand/campaigns" className="text-[13px] text-muted hover:text-fg">View all</Link>} />
          <Panel pad={false}>
            {live.length === 0 ? <Empty text="No live campaigns yet." action={<LinkButton to="/brand/campaigns/new">Create a campaign</LinkButton>} /> : live.map(c => {
              const target = c.sourcing === 'contest' ? c.creatorsWanted : c.creatorsWanted * c.deliverables.count
              const done = c.sourcing === 'contest'
                ? state.submissions.filter(s => s.campaignId === c.id && ['submitted', 'approved', 'paid', 'rejected'].includes(s.status)).length
                : state.submissions.filter(s => s.campaignId === c.id && ['submitted', 'approved', 'paid'].includes(s.status)).length
              return (
                <Link key={c.id} to={c.sourcing === 'contest' ? '/brand/contests' : `/brand/creators?campaign=${c.id}`} className="block border-b border-line px-5 py-4 last:border-0 hover:bg-subtle">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[14px] font-medium text-fg">{c.name}</span>
                    <span className="shrink-0 text-[12.5px] text-faint">Due {fmtDate(deadlineOf(c))}</span>
                  </div>
                  <div className="mb-2 mt-1 text-[13px] text-muted">
                    {c.sourcing === 'contest' ? `Open contest · ${done} entries so far` : `${done} of ${target} creatives delivered`}
                  </div>
                  <Progress value={target ? (done / target) * 100 : 0} />
                </Link>
              )
            })}
          </Panel>
        </section>
      </div>
    </>
  )
}
