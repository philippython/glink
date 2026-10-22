import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { OpportunityCard } from '../../components/OpportunityCard'
import { SubmissionTimeline } from '../../components/ui'
import { Button, Empty, KV, Label, LinkButton, PageHeader, Panel, Pill, SectionHead, useToast } from '../../components/kit'
import { deadlineOf } from '../../data/market'
import { useStore } from '../../data/store'
import { errorMessage } from '../../lib/api'
import { fmtDate, money } from '../../lib/format'

export function Opportunities() {
  const { state, respond, enterContest } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<{ id: string; kind: 'accept' | 'decline' }>()
  const mine = state.matches
  const open = mine.filter(m => m.status === 'invited')
  const responded = mine.filter(m => m.status === 'accepted' || m.status === 'declined')
  const contests = state.campaigns.filter(c => c.sourcing === 'contest' && c.status === 'live' && !mine.some(m => m.campaignId === c.id))
  const camp = (id: string) => state.campaigns.find(c => c.id === id)!

  const act = (matchId: string, accept: boolean) => {
    setBusy({ id: matchId, kind: accept ? 'accept' : 'decline' })
    respond(matchId, accept).then(() => toast(accept ? 'Accepted — your brief is ready in My Work' : 'Declined'), e => toast(errorMessage(e))).finally(() => setBusy(undefined))
  }

  return (
    <>
      <PageHeader title="Opportunities" subtitle="Campaigns matched to your strengths. No long applications." />
      {open.length === 0 && contests.length === 0 ? (
        <Panel><Empty text="No open matches right now. Keep your profile and channels up to date to get matched faster." action={<LinkButton variant="secondary" to="/creator/settings">Update profile</LinkButton>} /></Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {open.map(m => (
            <OpportunityCard key={m.id} brand={camp(m.campaignId).brandName} campaign={camp(m.campaignId)} score={m.score}
              busy={busy?.id === m.id ? busy.kind : undefined} onAccept={() => act(m.id, true)} onDecline={() => act(m.id, false)} />
          ))}
          {contests.map(c => (
            <OpportunityCard key={c.id} brand={c.brandName} campaign={c}
              onAccept={() => { enterContest(c.id).then(() => { toast('You’re in — upload your entry from My Work'); navigate('/creator/work') }, e => toast(errorMessage(e))) }} />
          ))}
        </div>
      )}

      {responded.length > 0 && (
        <section className="mt-12">
          <SectionHead title="Responded" />
          <Panel pad={false}>
            {responded.map(m => {
              const c = camp(m.campaignId)
              return (
                <Link key={m.id} to={`/creator/opportunities/${c.id}`} className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-0 hover:bg-subtle">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium text-fg">{c.brandName} · {c.name}</div>
                    <div className="text-[13px] text-muted">{c.sourcing === 'contest' ? 'Contest entry' : `${money(c.baseFee)} + ${money(c.bonusAmount)} bonus`} · due {fmtDate(deadlineOf(c))}</div>
                  </div>
                  {m.status === 'accepted' ? <Pill tone="success">Accepted</Pill> : <Pill>Declined</Pill>}
                </Link>
              )
            })}
          </Panel>
        </section>
      )}
    </>
  )
}

export function OpportunityDetail() {
  const { id } = useParams()
  const { state, respond, enterContest } = useStore()
  const toast = useToast()
  const [busy, setBusy] = useState<'accept' | 'decline'>()
  const c = state.campaigns.find(x => x.id === id)
  if (!c) return <Empty text="This campaign is no longer available." action={<LinkButton to="/creator/opportunities">Back to opportunities</LinkButton>} />
  const m = state.matches.find(x => x.campaignId === c.id)
  const contest = c.sourcing === 'contest'
  const accepted = m?.status === 'accepted'
  const nextSub = state.submissions.find(s => s.matchId === m?.id && !['approved', 'paid'].includes(s.status))
  const d = c.deliverables

  const act = (accept: boolean) => {
    if (!m) return
    setBusy(accept ? 'accept' : 'decline')
    respond(m.id, accept).then(() => toast(accept ? 'Accepted — here’s your full brief' : 'Declined'), e => toast(errorMessage(e))).finally(() => setBusy(undefined))
  }

  return (
    <>
      <PageHeader back={{ to: '/creator/opportunities', label: 'Opportunities' }} title={c.brandName}
        subtitle={`${c.name} · ${contest ? c.bonusRule : `${money(c.baseFee)} + ${money(c.bonusAmount)} bonus`}`}
        actions={m && <span className="title-serif text-[28px] text-fg">{m.score}% <span className="font-sans text-[12px] text-faint">match</span></span>} />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Panel>
          <Label className="mb-2">Campaign</Label>
          <KV label="Goal">{c.goal}</KV>
          <KV label="Market">{c.market}</KV>
          <KV label="Deliverables">{d.count} video{d.count > 1 ? 's' : ''} · {d.aspectRatio} · {d.minSec}–{d.maxSec} seconds{d.rawFootage ? ' · raw footage' : ''}</KV>
          <KV label="Deadline">{fmtDate(deadlineOf(c))}</KV>
          {m && m.reasons.length > 0 && <KV label="Why you’re matched"><ul className="space-y-0.5">{m.reasons.map(r => <li key={r}>{r}</li>)}</ul></KV>}
          {!contest && <KV label="Bonus">{money(c.bonusAmount)} if your video {c.bonusRule.charAt(0).toLowerCase() + c.bonusRule.slice(1)}</KV>}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {contest ? (
              accepted ? <Pill tone="success">✓ Entered</Pill> : <Button onClick={() => { enterContest(c.id).then(() => toast('You’re in — the full brief is below'), e => toast(errorMessage(e))) }}>Enter contest</Button>
            ) : m?.status === 'invited' ? (
              <>
                <Button onClick={() => act(true)} loading={busy === 'accept'} disabled={!!busy}>Accept</Button>
                <Button variant="secondary" onClick={() => act(false)} loading={busy === 'decline'} disabled={!!busy}>Decline</Button>
              </>
            ) : m?.status === 'accepted' ? <Pill tone="success">✓ Accepted</Pill> : m?.status === 'declined' ? <Pill>Declined</Pill> : null}
          </div>
        </Panel>
        <Panel>
          <Label className="mb-5">Submission timeline</Label>
          <SubmissionTimeline milestones={c.timeline} />
        </Panel>
      </div>

      {accepted ? (
        <Panel className="mt-6">
          <Label className="mb-2">Creative brief</Label>
          <KV label="Creative angle">{c.creativeAngle}</KV>
          <KV label="Suggested opening"><span className="title-serif text-[18px]">“{c.suggestedOpening}”</span></KV>
          <KV label="Story flow">{c.storyFlow.map((s, i) => <span key={s} className="mr-4">{i + 1}. {s}</span>)}</KV>
          <KV label="Must include">
            <ul className="space-y-1">{c.mustInclude.map(x => <li key={x} className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-success" />{x}</li>)}</ul>
          </KV>
          <KV label="Avoid">
            <ul className="space-y-1">{c.avoid.map(x => <li key={x} className="flex gap-2"><X size={15} className="mt-0.5 shrink-0 text-danger" />{x}</li>)}</ul>
          </KV>
          <KV label="Deliverables">{d.count} video{d.count > 1 ? 's' : ''} · {d.aspectRatio} · {d.minSec}–{d.maxSec} seconds</KV>
          {nextSub && <LinkButton className="mt-6" to={`/creator/work/${nextSub.id}`}>Start creating</LinkButton>}
        </Panel>
      ) : (
        <p className="mt-6 text-[13.5px] text-muted">{contest ? 'Enter the contest to see the full creative brief.' : 'Accept to unlock the full creative brief: angle, opening line, story flow, and what to include or avoid.'}</p>
      )}
    </>
  )
}
