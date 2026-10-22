import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Label, Panel, Spinner } from './kit'

interface Factor { key: string; label: string; value: number; weight: number; reason: string }
interface Explain { score: number; factors: Factor[]; eligible: boolean; blocker?: string }

/** "Why this match": every factor the matching engine scored, with its weight. */
export function MatchExplain({ campaignId, creatorId }: { campaignId: string; creatorId: string }) {
  const [data, setData] = useState<Explain | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    setData(null); setError('')
    api<Explain>(`/campaigns/${campaignId}/explain/${creatorId}`).then(d => live && setData(d), e => live && setError(e.message))
    return () => { live = false }
  }, [campaignId, creatorId])

  return (
    <Panel>
      <div className="mb-4 flex items-baseline justify-between">
        <Label>Why this match</Label>
        {data && <span className="title-serif text-[28px] text-fg">{data.score}%</span>}
      </div>
      {error ? <p className="text-[13px] text-danger">{error}</p> : !data ? <div className="py-6"><Spinner /></div> : (
        <>
          <ul className="space-y-3">
            {[...data.factors].sort((a, b) => b.weight - a.weight).map(f => (
              <li key={f.key}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="text-fg">{f.label} <span className="text-faint">· {Math.round(f.weight * 100)}% of score</span></span>
                  <span className="tabular-nums text-muted">{Math.round(f.value * 100)}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-track"><div className="h-full rounded-full bg-primary" style={{ width: `${f.value * 100}%` }} /></div>
                <div className="mt-1 text-[12px] text-muted">{f.reason}</div>
              </li>
            ))}
          </ul>
          {data.blocker && <p className="mt-4 rounded-lg bg-warn-bg px-3 py-2 text-[13px] text-warn">{data.blocker}</p>}
          <p className="mt-4 text-[12px] text-faint">Strengths are learned from this creator’s recorded ad results, starting from their profile.</p>
        </>
      )}
    </Panel>
  )
}
