import { Check, Lock, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { VideoPlayer } from '../../components/VideoPlayer'
import {
  Avatar, Button, Empty, Field, KV, Label, LinkButton, PageHeader, Panel, Pill, Textarea, useToast,
} from '../../components/kit'
import { preflightIssues, type CreativeStatus } from '../../data/market'
import { useStore } from '../../data/store'
import { errorMessage } from '../../lib/api'
import { cx, money, pluralize, timeAgo } from '../../lib/format'

const tabs: { key: CreativeStatus; label: string }[] = [
  { key: 'submitted', label: 'Waiting' },
  { key: 'changes_requested', label: 'Changes requested' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

export function Reviews() {
  const { state } = useStore()
  const [tab, setTab] = useState<CreativeStatus>('submitted')
  const list = state.submissions.filter(s => (tab === 'approved' ? ['approved', 'paid'].includes(s.status) : s.status === tab))

  return (
    <>
      <PageHeader title="Reviews" subtitle="Videos from your creators, checked against the brief before they reach you." />
      <div className="mb-4 flex flex-wrap gap-1 text-[13px]" role="tablist">
        {tabs.map(t => {
          const n = state.submissions.filter(s => (t.key === 'approved' ? ['approved', 'paid'].includes(s.status) : s.status === t.key)).length
          return (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              className={cx('rounded-lg px-3 py-1.5', tab === t.key ? 'bg-subtle font-medium text-fg' : 'text-muted hover:text-fg')}>
              {t.label} <span className="text-faint">{n}</span>
            </button>
          )
        })}
      </div>
      <Panel pad={false}>
        {list.length === 0 ? <Empty text={tab === 'submitted' ? 'You’re all caught up. New videos will appear here.' : 'Nothing here yet.'} /> : list.map(s => {
          const c = state.campaigns.find(x => x.id === s.campaignId)!
          const cr = state.creators.find(x => x.id === s.creatorId)!
          const issues = preflightIssues(s.preflight)
          return (
            <div key={s.id} className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-4 last:border-0">
              <Avatar name={cr.displayName} />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium text-fg">{cr.displayName}</div>
                <div className="text-[13px] text-muted">{c.name} · video {s.index} of {c.deliverables.count}{s.submittedAt && ` · ${timeAgo(s.submittedAt)}`}</div>
              </div>
              {s.status === 'submitted' && (issues ? <Pill tone="warn">{pluralize(issues, 'issue')} found</Pill> : <Pill tone="success">✓ Pre-flight passed</Pill>)}
              <LinkButton size="sm" variant={s.status === 'submitted' ? 'primary' : 'secondary'} to={`/brand/reviews/${s.id}`}>{s.status === 'submitted' ? 'Review' : 'Open'}</LinkButton>
            </div>
          )
        })}
      </Panel>
    </>
  )
}

export function ReviewCreative() {
  const { id } = useParams()
  const { state, review } = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const [note, setNote] = useState('')
  const [seek, setSeek] = useState<{ t: number }>()
  const [busy, setBusy] = useState<'approve' | 'changes' | 'reject'>()

  const s = state.submissions.find(x => x.id === id)
  if (!s || !s.hasVideo) return <Empty text="This video could not be found." action={<LinkButton to="/brand/reviews">Back to reviews</LinkButton>} />
  const c = state.campaigns.find(x => x.id === s.campaignId)!
  const cr = state.creators.find(x => x.id === s.creatorId)!
  const failed = s.preflight.filter(i => i.status === 'fail' && i.at !== undefined)
  const inRange = (s.duration ?? 0) >= c.deliverables.minSec && (s.duration ?? 0) <= c.deliverables.maxSec
  const decided = s.status !== 'submitted'
  const fmt = (t: number) => `0:${String(Math.floor(t)).padStart(2, '0')}`

  const [error, setError] = useState('')
  const contest = c.sourcing === 'contest'
  const decide = async (d: 'approve' | 'changes' | 'reject') => {
    setBusy(d); setError('')
    try {
      // The server attaches flagged timestamps to change requests.
      await review(s.id, d, note)
      toast(d === 'approve' ? `Approved — ${money(c.baseFee)} released to ${cr.displayName}` : d === 'changes' ? 'Change request sent' : 'Video rejected')
      navigate('/brand/reviews')
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(undefined) }
  }

  return (
    <>
      <PageHeader back={{ to: '/brand/reviews', label: 'Reviews' }} title="Review creative"
        subtitle={<span className="flex flex-wrap items-center gap-2">{cr.displayName}, {c.name}, video {s.index} of {c.deliverables.count}
          {s.submittedAt && <Pill>Submitted {timeAgo(s.submittedAt)}</Pill>}</span>} />

      <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
        <div className="lg:sticky lg:top-8 lg:self-start">
          <VideoPlayer src={s.hasVideo ? `/api/media/${s.id}` : undefined} duration={s.duration ?? 20} seek={seek} caption={`“${c.suggestedOpening}”`}
            markers={failed.map(f => ({ at: f.at!, label: f.label }))} />
          {failed.length > 0 && <p className="mx-auto mt-2 max-w-[320px] text-center text-[12px] text-faint">Red markers show where pre-flight found issues.</p>}
        </div>

        <div className="space-y-5">
          <Panel className="flex items-start gap-5">
            <div className="title-serif text-[48px] leading-none text-fg">{s.briefMatch ?? '—'}</div>
            <div>
              <Label>Brief match</Label>
              <p className="mt-1.5 text-[14px] text-fg">{s.aiFeedback}</p>
            </div>
          </Panel>

          <Panel>
            <Label className="mb-2">Format</Label>
            <KV label="Duration">{s.duration}s <span className="text-muted">(requested {c.deliverables.minSec}–{c.deliverables.maxSec}s)</span></KV>
            <KV label="Aspect ratio">{s.aspectRatio}</KV>
            <KV label="Resolution">{s.resolution}</KV>
            <KV label="Within range">{inRange ? <span className="text-success">✓ Yes</span> : <span className="text-danger">✕ No</span>}</KV>
          </Panel>

          <Panel>
            <Label className="mb-3">Pre-flight check</Label>
            <ul className="divide-y divide-line">
              {s.preflight.filter(i => i.kind !== 'format').map(i => (
                <li key={i.kind + i.label} className="flex items-start gap-3 py-3 text-[14px]">
                  {i.status === 'pass' ? <Check size={16} className="mt-0.5 shrink-0 text-success" aria-label="Passed" />
                    : i.status === 'review' ? <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-warn text-[10px] text-warn" aria-label="Check by eye">?</span>
                    : <X size={16} className="mt-0.5 shrink-0 text-danger" aria-label="Failed" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-fg"><span className="text-faint">{i.kind === 'must' ? 'Must include · ' : i.kind === 'avoid' ? 'Avoid · ' : 'Audio · '}</span>{i.label}</div>
                    {i.note && <div className={cx('mt-0.5 text-[13px]', i.status === 'fail' ? 'text-danger' : 'text-muted')}>{i.note.replace('Re-record this line before submitting.', 'Ask for a re-record of this line.')}</div>}
                    {i.source === 'ai' && <div className="mt-0.5 text-[11.5px] text-faint">Checked by AI from video frames</div>}
                  </div>
                  {i.at !== undefined && (
                    <button onClick={() => setSeek({ t: i.at! })} className={cx('shrink-0 rounded-md border px-2 py-0.5 font-mono text-[12px] transition',
                      i.ok ? 'border-line text-muted hover:text-fg' : 'border-danger/40 text-danger hover:bg-danger-bg')} aria-label={`Jump to ${fmt(i.at)}`}>
                      {fmt(i.at)}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <Label className="mb-3">Your decision</Label>
            {decided ? (
              <div className="text-[14px] text-fg">
                {s.status === 'approved' || s.status === 'paid' ? <Pill tone="success">✓ Approved</Pill> : s.status === 'changes_requested' ? <Pill tone="warn">Changes requested</Pill> : <Pill tone="danger">Rejected</Pill>}
                {s.reviewNote && <p className="mt-3 text-muted">Note: {s.reviewNote}</p>}
              </div>
            ) : (
              <>
                <Field label="Note to the creator (optional)" htmlFor="note">
                  <Textarea id="note" value={note} onChange={e => setNote(e.target.value)} placeholder="What should they keep or change?" />
                </Field>
                {error && <p role="alert" className="mt-3 text-[13px] text-danger">{error}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  {contest
                    ? <LinkButton to="/brand/contests">Pick winners on the Contests page</LinkButton>
                    : <Button onClick={() => void decide('approve')} loading={busy === 'approve'} disabled={!!busy}>Approve and pay</Button>}
                  <Button variant="secondary" onClick={() => void decide('changes')} loading={busy === 'changes'} disabled={!!busy}>Request changes</Button>
                  <Button variant="danger" onClick={() => void decide('reject')} loading={busy === 'reject'} disabled={!!busy}>Reject</Button>
                </div>
                {!contest && <p className="mt-4 flex items-start gap-2 text-[13px] text-muted">
                  <Lock size={14} className="mt-0.5 shrink-0" />
                  Approving releases {money(c.baseFee)} from escrow to {cr.displayName}.{c.bonusAmount > 0 && ` The ${money(c.bonusAmount)} bonus is paid automatically if this ad ${c.bonusRule.charAt(0).toLowerCase() + c.bonusRule.slice(1)} (benchmark ${c.benchmarkCtr}%).`}
                </p>}
              </>
            )}
          </Panel>
        </div>
      </div>
    </>
  )
}
