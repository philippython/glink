import { Link } from 'react-router-dom'
import { Empty, Label, LinkButton, PageHeader, Panel, SectionHead, Stat, StatRow } from '../../components/kit'
import { deadlineOf } from '../../data/market'
import { useStore } from '../../data/store'
import { fmtDate, greeting, money } from '../../lib/format'
import { campaignImage, photos } from '../../lib/images'
import { useCreatorTotals } from './useCreatorTotals'

export default function CreatorHome() {
  const { state, me } = useStore()
  const t = useCreatorTotals()
  const open = state.matches.filter(m => m.status === 'invited')
  const camp = (id: string) => state.campaigns.find(c => c.id === id)!

  return (
    <>
      <PageHeader title={`${greeting()}, ${me.displayName.split(' ')[0]}.`}
        subtitle={open.length ? `You have ${open.length} new campaign ${open.length === 1 ? 'match' : 'matches'}.` : 'No new matches right now. We’ll notify you when one fits.'} />

      <StatRow>
        <Stat label="Campaigns completed" value={t.completed} />
        <Stat label="Approved creatives" value={t.approved} />
        <Stat label="Winning creatives" value={t.winning} />
        <Stat label="Lifetime earnings" value={money(t.lifetime)} />
      </StatRow>

      <Panel pad={false} className="mt-6 grid overflow-hidden bg-subtle md:grid-cols-[1fr_300px]">
        <img src={photos.creatorHome} alt="" className="order-last hidden h-full w-full object-cover md:block" />
        <div className="p-6">
          <Label>AI coach</Label>
          <div className="title-serif mt-3 text-[26px] leading-snug text-fg">{me.coach.insight}</div>
          <p className="mt-2 max-w-2xl text-[14px] text-muted">{me.coach.advice}</p>
          <LinkButton variant="secondary" className="mt-5" to="/creator/performance">View your performance</LinkButton>
        </div>
      </Panel>

      <section className="mt-10">
        <SectionHead title="Opportunities" action={<Link to="/creator/opportunities" className="text-[13px] text-muted hover:text-fg">View all</Link>} />
        <Panel pad={false}>
          {open.length === 0 ? <Empty text="New matches will show up here." /> : open.map(m => {
            const c = camp(m.campaignId)
            return (
              <Link key={m.id} to={`/creator/opportunities/${c.id}`} className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-0 hover:bg-subtle">
                <img src={campaignImage(c)} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-lg bg-subtle object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium text-fg">{c.brandName} · {c.name}</div>
                  <div className="text-[13px] text-muted">{m.score}% match · {money(c.baseFee)} + bonus · due {fmtDate(deadlineOf(c))}</div>
                </div>
                <span className="text-faint" aria-hidden>→</span>
              </Link>
            )
          })}
        </Panel>
      </section>
    </>
  )
}
