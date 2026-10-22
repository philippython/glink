import { BadgeCheck, Play } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Avatar, Button, Chip, Empty, KV, Label, PageHeader, Panel, Pill, Select, StrengthBar, useToast } from '../../components/kit'
import { MatchExplain } from '../../components/MatchExplain'
import { useStore } from '../../data/store'
import { errorMessage } from '../../lib/api'
import { compact, money } from '../../lib/format'
import { creatorCover } from '../../lib/images'

export default function CreatorDetail() {
  const { id } = useParams()
  const { state, invite } = useStore()
  const toast = useToast()
  const c = state.creators.find(x => x.id === id)
  const live = state.campaigns.filter(x => x.status === 'live' && x.sourcing !== 'contest')
  const [campaignId, setCampaignId] = useState(live[0]?.id ?? '')
  if (!c) return <Empty text="This creator could not be found." />

  const match = state.matches.find(m => m.campaignId === campaignId && m.creatorId === c.id)
  const samples = state.submissions.filter(s => s.creatorId === c.id && s.hasVideo)
  const reach = c.channels.reduce((a, ch) => a + ch.followers, 0)

  return (
    <>
      <PageHeader back={{ to: '/brand/creators', label: 'Creators' }}
        title={<span className="flex items-center gap-4"><Avatar name={c.displayName} size={52} />{c.displayName}</span>}
        subtitle={<>{c.handle} · {c.country} · <Pill tone={c.availability === 'Available' ? 'success' : c.availability === 'Limited' ? 'warn' : 'neutral'}>{c.availability}</Pill></>}
        actions={live.length > 0 && (
          <div className="flex items-center gap-2">
            <Select aria-label="Campaign to invite to" value={campaignId} onChange={e => setCampaignId(e.target.value)} className="w-56">
              {live.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
            </Select>
            {match && match.status !== 'suggested'
              ? <Pill tone={match.status === 'accepted' ? 'success' : match.status === 'declined' ? 'danger' : 'neutral'} className="capitalize">{match.status}</Pill>
              : <Button disabled={!state.permissions.canSpend} onClick={() => void invite(campaignId, c.id).then(() => toast(`${c.displayName} invited`), e => toast(errorMessage(e)))}>Invite to campaign</Button>}
          </div>
        )} />

      <div className="mb-6 overflow-hidden rounded-xl bg-subtle">
        <img src={creatorCover(c)} alt="" className="aspect-[16/5] w-full object-cover md:aspect-[16/4]" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Panel>
          <Label className="mb-5">Strengths</Label>
          <div className="space-y-3.5">
            <StrengthBar label="Hook strength" value={c.strengths.hook} />
            <StrengthBar label="Retention strength" value={c.strengths.retention} />
            <StrengthBar label="Conversion strength" value={c.strengths.conversion} />
            <StrengthBar label="Reliability" value={c.strengths.reliability} />
          </div>
          <Label className="mb-3 mt-7">Proven styles</Label>
          <div className="flex flex-wrap gap-1.5">{c.styles.map(s => <Chip key={s}>{s}</Chip>)}</div>
          <p className="mt-6 text-[14px] text-muted">{c.bio}</p>
        </Panel>
        <Panel>
          <KV label="Rate per video">{money(c.baseRate)}</KV>
          <KV label="On-time rate">{c.onTimeRate}%</KV>
          <KV label="Repeat brands">{c.repeatBrandRate}%</KV>
          <KV label="Niches">{c.niches.join(', ')}</KV>
          <KV label="Past brands">{c.pastBrands.join(', ') || 'New to Glink'}</KV>
          <Label className="mb-3 mt-6">Connected channels · {compact(reach)} reach</Label>
          <div className="space-y-2">
            {c.channels.map(ch => (
              <div key={ch.platform} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-[13.5px]">
                <span className="text-fg">{ch.platform} <span className="text-muted">{ch.handle}</span></span>
                <span className="flex items-center gap-1.5 text-muted">{compact(ch.followers)}{ch.verified && <BadgeCheck size={14} className="text-success" aria-label="Verified" />}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {campaignId && <div className="mt-6"><MatchExplain campaignId={campaignId} creatorId={c.id} /></div>}

      <Panel className="mt-6">
        <Label className="mb-4">Sample videos</Label>
        {samples.length === 0 ? <div className="text-[13.5px] text-muted">No videos on Glink yet.</div> : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {samples.map(s => (
              <div key={s.id}>
                <div className="relative grid aspect-[9/16] place-items-center rounded-lg bg-subtle text-faint"><Play size={22} /></div>
                <div className="mt-2 truncate text-[12.5px] text-fg">{state.campaigns.find(x => x.id === s.campaignId)?.name}</div>
                <div className="text-[12px] text-muted">{s.duration}s{s.winning ? ' · Winning' : ''}</div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  )
}
