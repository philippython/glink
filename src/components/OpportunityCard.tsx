import { ArrowRight, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { deadlineOf, type Campaign } from '../data/market'
import { fmtDate, money } from '../lib/format'
import { campaignImage } from '../lib/images'
import { Button, KV } from './kit'

/** The card a creator receives. The brief wizard renders the same card as a live preview. */
export function OpportunityCard({ brand, campaign, score, preview, onAccept, onDecline, busy }: {
  brand: string; campaign: Campaign; score?: number; preview?: boolean
  onAccept?: () => void; onDecline?: () => void; busy?: 'accept' | 'decline'
}) {
  const d = campaign.deliverables
  const contest = campaign.sourcing === 'contest'
  return (
    <div className="card overflow-hidden rounded-xl p-6">
      <div className="relative -mx-6 -mt-6 mb-5 bg-subtle">
        <img src={campaignImage(campaign)} alt="" loading="lazy" className="aspect-[16/6] w-full object-cover" />
        {campaign.product && <span className="absolute bottom-3 left-3 rounded-full bg-pure-black/45 px-2.5 py-1 text-[12px] text-pure-white backdrop-blur-sm">{campaign.product}</span>}
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[13px] text-muted">{brand || 'Your brand'}</div>
          <div className="title-serif mt-0.5 text-[24px] leading-tight text-fg">{campaign.name || 'Campaign name'}</div>
          <div className="mt-1 text-[13px] text-muted">{campaign.goal}</div>
        </div>
        {contest
          ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-subtle px-2.5 py-0.5 text-[12px] font-medium text-fg"><Trophy size={12} /> Open contest</span>
          : score !== undefined && <div className="title-serif shrink-0 text-[28px] leading-none text-fg">{score}%<div className="mt-1 text-right font-sans text-[11px] text-faint">match</div></div>}
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[14px]">
        {contest ? <span className="text-fg">{campaign.bonusRule}</span> : (
          <>
            <span className="font-medium text-fg">{money(campaign.baseFee)} base</span>
            {campaign.bonusAmount > 0 && <span className="text-success">+ {money(campaign.bonusAmount)} performance bonus</span>}
          </>
        )}
      </div>

      <div className="mt-4 border-t border-line">
        <KV label="Goal">{campaign.goal}</KV>
        <KV label="Market">{campaign.market || '—'}</KV>
        <KV label="Deliverables">{d.count} video{d.count > 1 ? 's' : ''} · {d.aspectRatio} · {d.minSec}–{d.maxSec} seconds{d.rawFootage ? ' · raw footage' : ''}</KV>
        <KV label="Deadline">{campaign.timeline.length ? fmtDate(deadlineOf(campaign)) : '—'}</KV>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button disabled={preview} onClick={onAccept} loading={busy === 'accept'}>{contest ? 'Enter contest' : 'Accept'}</Button>
        {!contest && <Button variant="secondary" disabled={preview} onClick={onDecline} loading={busy === 'decline'}>Decline</Button>}
        {!preview && (
          <Link to={`/creator/opportunities/${campaign.id}`} className="ml-auto inline-flex items-center gap-1 self-center text-[13.5px] text-muted hover:text-fg">
            View campaign <ArrowRight size={14} />
          </Link>
        )}
      </div>
    </div>
  )
}
