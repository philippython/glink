import { Check } from 'lucide-react'
import { Chip, Label, LinkButton, PageHeader, Panel, SectionHead, Stat, StatRow, StrengthBar } from '../../components/kit'
import { useStore } from '../../data/store'
import { money } from '../../lib/format'
import { useCreatorTotals } from './useCreatorTotals'

export default function CreatorPerformance() {
  const { me } = useStore()
  const t = useCreatorTotals()
  return (
    <>
      <PageHeader title="Your Performance" subtitle="Contextual strengths, not a single score." />
      <StatRow cols={6}>
        <Stat label="Campaigns completed" value={t.completed} />
        <Stat label="Approved creatives" value={t.approved} />
        <Stat label="Winning creatives" value={t.winning} />
        <Stat label="Repeat brands" value={`${me.repeatBrandRate}%`} />
        <Stat label="On-time rate" value={`${me.onTimeRate}%`} />
        <Stat label="Performance earnings" value={money(t.bonuses)} />
      </StatRow>

      <section className="mt-10">
        <SectionHead title="Your strengths" />
        <Panel>
          <div className="max-w-xl space-y-3.5">
            <StrengthBar label="Hook strength" value={me.strengths.hook} />
            <StrengthBar label="Retention strength" value={me.strengths.retention} />
            <StrengthBar label="Conversion strength" value={me.strengths.conversion} />
            <StrengthBar label="Reliability" value={me.strengths.reliability} />
          </div>
          <Label className="mb-3 mt-7">Proven styles</Label>
          <div className="flex flex-wrap gap-1.5">{me.styles.map(s => <Chip key={s}>{s}</Chip>)}</div>
        </Panel>
      </section>

      <Panel className="mt-6 bg-subtle">
        <Label>AI coach</Label>
        <div className="title-serif mt-3 text-[26px] leading-snug text-fg">{me.coach.insight}</div>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">{me.coach.advice}</p>
      </Panel>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Panel>
          <Label className="mb-3">What you’re improving</Label>
          <ul className="space-y-2 text-[14px] text-fg">{me.coach.improving.map(i => <li key={i}>{i}</li>)}</ul>
        </Panel>
        <Panel>
          <Label className="mb-3">What brands value about you</Label>
          <ul className="space-y-2 text-[14px] text-fg">{me.coach.valued.map(i => <li key={i} className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-success" />{i}</li>)}</ul>
        </Panel>
        <Panel>
          <Label className="mb-3">Recommended skill to develop next</Label>
          <p className="text-[14px] text-fg">{me.coach.nextSkill}</p>
          <LinkButton variant="secondary" size="sm" className="mt-4" to="/creator/opportunities">Practise it on a campaign</LinkButton>
        </Panel>
      </div>
    </>
  )
}
