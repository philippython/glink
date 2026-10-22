import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Crown, Play, Star, Trophy, UserCheck, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { VideoPlayer } from '../components/VideoPlayer'
import { Avatar, Button, Empty, Label, LinkButton, PageHeader, Panel, Pill, SectionHead, Stat, StatRow, useToast } from '../components/kit'
import { SubmissionTimeline } from '../components/ui'
import { deadlineOf, preflightIssues, type Campaign, type CreativeSubmission } from '../data/market'
import { TODAY } from '../data/seed'
import { useStore } from '../data/store'
import { errorMessage } from '../lib/api'
import { cx, daysBetween, fmtDate, money, timeAgo } from '../lib/format'

export default function Contests() {
  const { state } = useStore()
  const contests = state.campaigns.filter(c => c.sourcing === 'contest')
  return (
    <>
      <PageHeader title="Contests" subtitle="Open the brief to every creator, then pay only the winners." />
      <SourcingCompare />
      {contests.length === 0 ? (
        <Panel className="mt-6"><Empty text="No contests yet. Create a campaign and choose “Contest” as the sourcing method." action={<LinkButton to="/brand/campaigns/new">New campaign</LinkButton>} /></Panel>
      ) : contests.map(c => <ContestView key={c.id} campaign={c} />)}
    </>
  )
}

function SourcingCompare() {
  const rows = [
    { icon: UserCheck, title: 'Direct hire', when: 'You know who fits and need a guaranteed cut by a date.', points: ['Matched or hand-picked creators', 'Fixed fee + performance bonus', 'One brief → set deliverables'], to: '/brand/creators', cta: 'Browse creators' },
    { icon: Trophy, title: 'Contest', when: 'Anyone can film it and you want many takes to choose from.', points: ['Open to every creator', 'Prize pool — pay winners only', 'Discovers new talent'], to: '/brand/campaigns/new', cta: 'Start a contest campaign', active: true },
  ]
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map(r => (
        <Panel key={r.title} className={cx('!p-5', r.active && 'border-line-strong')}>
          <div className="flex items-center gap-2.5">
            <div className={cx('grid h-9 w-9 place-items-center rounded-lg', r.active ? 'bg-primary text-on-primary' : 'bg-subtle text-fg')}><r.icon size={17} /></div>
            <div className="font-medium text-fg">{r.title}</div>
          </div>
          <p className="mt-3 text-[13px] text-muted">{r.when}</p>
          <ul className="mt-3 space-y-1 text-[13px] text-fg-2">{r.points.map(p => <li key={p} className="flex gap-2"><Check size={13} className="mt-0.5 shrink-0 text-faint" />{p}</li>)}</ul>
          <Link to={r.to} className="mt-4 inline-flex items-center gap-1 text-[13px] text-fg underline-offset-4 hover:underline">{r.cta} <ArrowRight size={12} /></Link>
        </Panel>
      ))}
    </div>
  )
}

function ContestView({ campaign: c }: { campaign: Campaign }) {
  const { state, review, pickWinner } = useStore()
  const toast = useToast()
  const [shortlist, setShortlist] = useState<string[]>([])
  const [watching, setWatching] = useState<CreativeSubmission | null>(null)
  const [busy, setBusy] = useState('')

  const deadline = deadlineOf(c)
  const open = TODAY <= deadline
  const daysLeft = daysBetween(TODAY, deadline)
  const entries = state.submissions.filter(s => s.campaignId === c.id && ['submitted', 'approved', 'paid', 'rejected'].includes(s.status))
  const inProgress = state.submissions.filter(s => s.campaignId === c.id && ['not_started', 'in_progress', 'changes_requested'].includes(s.status)).length
  const placed = (place: number) => entries.find(e => e.placement === place)
  const creator = (id: string) => state.creators.find(x => x.id === id)

  const act = async (key: string, fn: () => Promise<void>, ok: string) => {
    setBusy(key)
    try { await fn(); toast(ok) } catch (e) { toast(errorMessage(e)) } finally { setBusy('') }
  }

  return (
    <section className="mt-10">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">{c.product} <Pill tone={c.status === 'completed' ? 'neutral' : open ? 'success' : 'warn'}>{c.status === 'completed' ? 'Completed' : open ? 'Open' : 'Judging'}</Pill></div>
            <h2 className="title-serif mt-1 text-[28px] text-fg">{c.name}</h2>
            <p className="mt-1 max-w-2xl text-[14px] text-muted">Opening line: <span className="font-serif text-fg">“{c.suggestedOpening}”</span></p>
          </div>
        </div>

        <div className="mt-6"><StatRow>
          <Stat label="Entries" value={entries.length} sub={inProgress ? `${inProgress} more in progress` : undefined} />
          <Stat label="Shortlisted" value={shortlist.length} />
          <Stat label={open ? 'Days left' : 'Status'} value={open ? Math.max(0, daysLeft) : 'Judging'} />
          <Stat label="Prize pool" value={money(c.prizes.reduce((a, b) => a + b, 0))} />
        </StatRow></div>

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-xl border border-line px-5 pb-3 pt-6"><SubmissionTimeline milestones={c.timeline} /></div>
          <div className="rounded-xl border border-line p-5">
            <Label className="mb-3">Prizes</Label>
            <div className="grid grid-cols-3 gap-2">
              {c.prizes.map((p, i) => {
                const w = placed(i + 1)
                return (
                  <div key={i} className={cx('rounded-lg border p-2.5 text-center', w ? 'border-primary bg-primary text-on-primary' : 'border-line')}>
                    <div className={cx('text-[11px]', w ? 'opacity-70' : 'text-faint')}>{['1st', '2nd', '3rd', '4th', '5th'][i]}</div>
                    <div className="tabular-nums text-[14px]">{money(p)}</div>
                    {w && <div className="mt-0.5 truncate text-[11px] font-medium">{creator(w.creatorId)?.displayName}</div>}
                  </div>
                )
              })}
            </div>
            <ul className="mt-4 space-y-1.5 text-[12.5px] text-muted">
              {[`${c.deliverables.minSec}–${c.deliverables.maxSec} seconds, ${c.deliverables.aspectRatio}`, ...c.mustInclude, ...c.avoid.map(a => `Avoid: ${a}`)].map(r => <li key={r}>— {r}</li>)}
            </ul>
          </div>
        </div>
      </Panel>

      <div className="mb-4 mt-8"><SectionHead title="Contestants" /></div>
      {open && entries.length > 0 && (
        <div className="mb-4 rounded-lg border border-dashed border-line-strong px-4 py-3 text-[13px] text-muted">
          Submissions are open until <span className="text-fg">{fmtDate(deadline)}</span>. Shortlist as entries arrive; winners can be picked once submissions close.
        </div>
      )}
      {entries.length === 0 ? <Panel><Empty text="No entries yet. Creators can enter from their Opportunities page." /></Panel> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map(e => {
            const cr = creator(e.creatorId)
            const shortlisted = shortlist.includes(e.id)
            const issues = preflightIssues(e.preflight)
            return (
              <div key={e.id} className={cx('card overflow-hidden rounded-xl', e.status === 'rejected' && 'opacity-50', !!e.placement && 'border-primary')}>
                <button onClick={() => setWatching(e)} className="group relative grid aspect-[4/3] w-full place-items-center bg-subtle" aria-label={`Watch ${cr?.displayName}’s entry`}>
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/80 text-on-primary transition group-hover:scale-105"><Play size={18} className="ml-0.5" /></span>
                  <span className="absolute right-2.5 top-2.5 rounded bg-surface px-1.5 py-0.5 text-[11px] tabular-nums text-fg">{Math.round(e.duration ?? 0)}s</span>
                  {e.placement && <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[11px] font-medium text-on-primary"><Crown size={11} /> Placed {e.placement}</span>}
                </button>
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={cr?.displayName ?? '?'} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium text-fg">{cr?.displayName}</div>
                      <div className="truncate text-[12px] text-muted">{e.submittedAt && timeAgo(e.submittedAt)} · brief match {e.briefMatch ?? '—'}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {issues ? <Pill tone="warn">{issues} pre-flight issue{issues > 1 ? 's' : ''}</Pill> : <Pill tone="success">✓ Pre-flight passed</Pill>}
                    {e.status === 'rejected' && <Pill tone="danger">Declined</Pill>}
                  </div>
                  {e.status === 'submitted' && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {open ? (
                        <Button size="sm" variant={shortlisted ? 'primary' : 'secondary'} onClick={() => setShortlist(s => (shortlisted ? s.filter(x => x !== e.id) : [...s, e.id]))}>
                          <Star size={13} /> {shortlisted ? 'Shortlisted' : 'Shortlist'}
                        </Button>
                      ) : c.prizes.map((_, i) => !placed(i + 1) && (
                        <Button key={i} size="sm" loading={busy === `${e.id}-${i}`} disabled={!state.permissions.canSpend}
                          onClick={() => void act(`${e.id}-${i}`, () => pickWinner(e.id, i + 1), `${cr?.displayName} placed ${i + 1} — prize paid from escrow`)}>
                          <Crown size={13} /> {['1st', '2nd', '3rd', '4th', '5th'][i]}
                        </Button>
                      ))}
                      <button aria-label="Decline entry" onClick={() => void act(`${e.id}-x`, () => review(e.id, 'reject', ''), 'Entry declined')}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-line-strong text-faint hover:text-danger"><X size={14} /></button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {watching && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setWatching(null)}>
            <motion.div onClick={ev => ev.stopPropagation()} initial={{ scale: 0.96 }} animate={{ scale: 1 }} className="card w-full max-w-sm rounded-xl p-5">
              <VideoPlayer src={watching.hasVideo ? `/api/media/${watching.id}` : undefined} duration={watching.duration ?? 20} caption={`“${c.suggestedOpening}”`}
                markers={watching.preflight.filter(i => i.status === 'fail' && i.at !== undefined).map(i => ({ at: i.at!, label: i.label }))} />
              <div className="mt-4 flex items-center justify-between">
                <div><div className="font-medium text-fg">{creator(watching.creatorId)?.displayName}</div><div className="text-[12px] text-muted">Brief match {watching.briefMatch ?? '—'} · {Math.round(watching.duration ?? 0)}s</div></div>
                <Button variant="secondary" onClick={() => setWatching(null)}>Close</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
