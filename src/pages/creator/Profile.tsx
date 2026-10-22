import { Avatar, Chip, LinkButton, PageHeader, Panel, Stat, StatRow, StrengthBar } from '../../components/kit'
import { useStore } from '../../data/store'
import { money } from '../../lib/format'
import { useCreatorTotals } from './useCreatorTotals'

export default function CreatorProfilePage() {
  const { me } = useStore()
  const t = useCreatorTotals()
  return (
    <>
      <PageHeader title="Profile" subtitle="How brands see you." actions={<LinkButton variant="secondary" to="/creator/settings">Edit settings</LinkButton>} />
      <Panel className="max-w-2xl">
        <div className="flex items-center gap-5">
          <Avatar name={me.displayName} size={72} />
          <div>
            <div className="title-serif text-[30px] text-fg">{me.displayName}</div>
            <div className="text-[13.5px] text-muted">{me.handle} · {me.country}</div>
          </div>
        </div>
        <p className="mt-5 text-[14px] text-fg">{me.bio}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">{[...new Set([...me.niches, ...me.styles])].map(s => <Chip key={s}>{s}</Chip>)}</div>
        <div className="mt-6 space-y-3">
          <StrengthBar label="Hook strength" value={me.strengths.hook} />
          <StrengthBar label="Retention strength" value={me.strengths.retention} />
          <StrengthBar label="Conversion strength" value={me.strengths.conversion} />
          <StrengthBar label="Reliability" value={me.strengths.reliability} />
        </div>
      </Panel>
      <div className="mt-6 max-w-2xl">
        <StatRow cols={3}>
          <Stat label="Lifetime earnings" value={money(t.lifetime)} />
          <Stat label="Winning creatives" value={t.winning} />
          <Stat label="Rate per video" value={money(me.baseRate)} />
        </StatRow>
      </div>
    </>
  )
}
