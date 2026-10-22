import { Check, FileVideo, Upload, X } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { useParams } from 'react-router-dom'
import { DeadlineChip } from '../../components/ui'
import {
  Button, Empty, ErrorBanner, Field, Input, KV, Label, LinkButton, PageHeader, Panel, Pill, Spinner, Textarea, useToast, type Tone,
} from '../../components/kit'
import { preflightIssues, preflightReviews, type CreativeStatus } from '../../data/market'
import { useStore } from '../../data/store'
import { ApiError, errorMessage } from '../../lib/api'
import { cx, money, pluralize } from '../../lib/format'
import { readVideo, sampleFrames } from '../../lib/video'

const statusMeta: Record<CreativeStatus, [string, Tone]> = {
  not_started: ['Not started', 'neutral'], in_progress: ['In progress', 'warn'], submitted: ['Submitted', 'neutral'],
  changes_requested: ['Changes requested', 'danger'], approved: ['Approved', 'success'], paid: ['Paid', 'success'], rejected: ['Not approved', 'danger'],
}
const flow: CreativeStatus[] = ['not_started', 'in_progress', 'submitted', 'approved', 'paid']

export function MyWork() {
  const { state } = useStore()
  const active = state.submissions.filter(s => !['approved', 'paid', 'rejected'].includes(s.status))
  const done = state.submissions.filter(s => ['approved', 'paid', 'rejected'].includes(s.status))

  const Row = ({ id }: { id: string }) => {
    const s = state.submissions.find(x => x.id === id)!
    const c = state.campaigns.find(x => x.id === s.campaignId)
    if (!c) return null
    return (
      <div className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-4 last:border-0">
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-medium text-fg">{c.brandName} · {c.name}</div>
          <div className="text-[13px] text-muted">{c.sourcing === 'contest' ? 'Contest entry' : `Video ${s.index} of ${c.deliverables.count}`}</div>
        </div>
        {!['approved', 'paid'].includes(s.status) && <DeadlineChip milestones={c.timeline} />}
        <Pill tone={statusMeta[s.status][1]}>{s.placement ? `Placed ${s.placement}` : statusMeta[s.status][0]}</Pill>
        <LinkButton size="sm" variant={['not_started', 'in_progress', 'changes_requested'].includes(s.status) ? 'primary' : 'secondary'} to={`/creator/work/${s.id}`}>
          {s.status === 'not_started' ? 'Start' : s.status === 'changes_requested' ? 'Fix' : 'Open'}
        </LinkButton>
      </div>
    )
  }

  return (
    <>
      <PageHeader title="My Work" subtitle="Your accepted campaigns, each with a clear brief and deadline." />
      <Panel pad={false}>
        {active.length === 0 ? <Empty text="Nothing to make right now. Accept an opportunity to get started." action={<LinkButton to="/creator/opportunities">See opportunities</LinkButton>} />
          : active.map(s => <Row key={s.id} id={s.id} />)}
      </Panel>
      {done.length > 0 && (
        <>
          <Label className="mb-3 mt-10">Finished</Label>
          <Panel pad={false}>{done.map(s => <Row key={s.id} id={s.id} />)}</Panel>
        </>
      )}
    </>
  )
}

export function Mission() {
  const { id } = useParams()
  const { state, upload, submit, config } = useStore()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [info, setInfo] = useState<{ width?: number; height?: number }>({})
  const [duration, setDuration] = useState('')
  const [script, setScript] = useState<string | null>(null)
  const [checking, setChecking] = useState('')
  const [error, setError] = useState('')
  const [drag, setDrag] = useState(false)
  const [sending, setSending] = useState(false)

  const s = state.submissions.find(x => x.id === id)
  const c = s && state.campaigns.find(x => x.id === s.campaignId)
  if (!s || !c) return <Empty text="This mission could not be found." action={<LinkButton to="/creator/work">Back to My Work</LinkButton>} />
  const issues = preflightIssues(s.preflight)
  const reviews = preflightReviews(s.preflight)
  const editable = ['not_started', 'in_progress', 'changes_requested'].includes(s.status)
  const ran = s.status === 'in_progress' && s.preflight.length > 0
  const stepIndex = s.status === 'changes_requested' ? 1 : s.status === 'rejected' ? 2 : flow.indexOf(s.status)
  const scriptValue = script ?? s.script ?? ''
  const durationValue = duration || (s.duration ? String(Math.round(s.duration)) : '')

  const pick = async (f: File | undefined) => {
    if (!f) return
    if (!/\.(mp4|mov)$/i.test(f.name) && !f.type.startsWith('video/')) { setError('Upload an MP4 or MOV video.'); return }
    setError(''); setFile(f)
    try {
      const v = await readVideo(f)
      setInfo({ width: v.width, height: v.height })
      if (isFinite(v.duration) && v.duration > 0) setDuration(String(Math.round(v.duration)))
    } catch (e) { setInfo({}); setError(errorMessage(e)) }
  }
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); void pick(e.dataTransfer.files[0]) }

  const run = async () => {
    const secs = Number(durationValue)
    if (!file && !s.hasVideo) { setError('Choose a video to upload first.'); return }
    if (!secs || secs < 1) { setError('Enter the video’s length in seconds.'); return }
    setError('')
    try {
      setChecking(file ? 'Uploading your video…' : 'Checking…')
      // Frames are only sampled when the AI check is switched on for this workspace.
      const frames = file && config.ai ? await sampleFrames(file).catch(() => []) : []
      setChecking('Checking your video against the brief…')
      await upload(s.id, file, { duration: secs, width: info.width, height: info.height, script: scriptValue, frames })
      setFile(null)
    } catch (e) {
      setError(e instanceof ApiError && Object.keys(e.fields).length ? Object.values(e.fields).join(' ') : errorMessage(e))
    } finally { setChecking('') }
  }

  const send = async () => {
    setSending(true)
    try { await submit(s.id); toast('Submitted to the brand') } catch (e) { toast(errorMessage(e)) } finally { setSending(false) }
  }
  const fmt = (t: number) => `0:${String(Math.floor(t)).padStart(2, '0')}`

  return (
    <>
      <PageHeader back={{ to: '/creator/work', label: 'My Work' }} title="Your Creative Mission"
        subtitle={<span className="flex flex-wrap items-center gap-2">{c.brandName} · {c.name} · video {s.index} of {c.deliverables.count} <DeadlineChip milestones={c.timeline} /></span>} />

      <ol className="mb-8 flex flex-wrap gap-x-6 gap-y-2 text-[12.5px]" aria-label="Status">
        {flow.map((f, i) => (
          <li key={f} className={cx('flex items-center gap-2', i <= stepIndex ? 'text-fg' : 'text-faint')}>
            <span className={cx('grid h-5 w-5 place-items-center rounded-full border text-[10px]', i < stepIndex ? 'border-primary bg-primary text-on-primary' : i === stepIndex ? 'border-fg' : 'border-line-strong')}>
              {i < stepIndex ? <Check size={11} /> : i + 1}
            </span>
            {statusMeta[f][0]}
          </li>
        ))}
      </ol>

      {s.status === 'changes_requested' && (
        <div className="mb-6 rounded-xl bg-warn-bg px-5 py-4 text-[14px] text-warn">
          <div className="font-medium">The brand asked for changes</div>
          {s.reviewNote && <p className="mt-1">{s.reviewNote}</p>}
        </div>
      )}
      {s.status === 'rejected' && <div className="mb-6 rounded-xl bg-danger-bg px-5 py-4 text-[14px] text-danger">This video wasn’t approved.{s.reviewNote && ` ${s.reviewNote}`}</div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Panel>
          <Label className="mb-2">The brief</Label>
          <KV label="Goal">{c.goal}</KV>
          <KV label="Creative angle">{c.creativeAngle}</KV>
          <KV label="Suggested opening"><span className="title-serif text-[17px]">“{c.suggestedOpening}”</span></KV>
          <KV label="Story flow">{c.storyFlow.map((x, i) => <div key={x}>{i + 1}. {x}</div>)}</KV>
          <KV label="Must include">{c.mustInclude.length ? c.mustInclude.map(x => <div key={x} className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-success" />{x}</div>) : '—'}</KV>
          <KV label="Avoid">{c.avoid.length ? c.avoid.map(x => <div key={x} className="flex gap-2"><X size={14} className="mt-0.5 shrink-0 text-danger" />{x}</div>) : '—'}</KV>
          <KV label="Format">{c.deliverables.aspectRatio} · {c.deliverables.minSec}–{c.deliverables.maxSec} seconds</KV>
        </Panel>

        <div className="space-y-6">
          {editable && (
            <Panel>
              <Label className="mb-4">Upload your video</Label>
              {error && <ErrorBanner>{error}</ErrorBanner>}
              <button type="button" onClick={() => input.current?.click()} onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
                className={cx('flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition',
                  drag ? 'border-fg bg-subtle' : 'border-line-strong hover:bg-subtle')}>
                {file || s.hasVideo ? <FileVideo size={22} className="text-fg" /> : <Upload size={22} className="text-muted" />}
                <div className="mt-3 text-[14px] font-medium text-fg">{file?.name ?? (s.hasVideo ? `${s.fileName} — tap to replace` : 'Tap to upload your video')}</div>
                <div className="mt-1 text-[12.5px] text-faint">{info.width && info.height ? `${info.width}×${info.height} · ` : ''}{c.deliverables.aspectRatio} · MP4 / MOV</div>
              </button>
              <input ref={input} type="file" accept="video/mp4,video/quicktime,.mp4,.mov" className="hidden" onChange={e => void pick(e.target.files?.[0])} />
              <div className="mt-4 space-y-4">
                <Field label="Length (seconds)" htmlFor="dur" hint={file ? 'Read from your file — change it if it looks wrong.' : undefined}>
                  <Input id="dur" type="number" min={1} value={durationValue} onChange={e => setDuration(e.target.value)} className="w-32" />
                </Field>
                <Field label="Your script or captions (recommended)" htmlFor="script" hint="Lets the check confirm what you say, such as Must-include lines and Avoid words.">
                  <Textarea id="script" value={scriptValue} onChange={e => setScript(e.target.value)} placeholder="Paste what you say in the video" />
                </Field>
                <Button onClick={() => void run()} loading={!!checking}>{s.preflight.length ? 'Run pre-flight check again' : 'Run pre-flight check'}</Button>
              </div>
            </Panel>
          )}

          {checking && <Panel><div className="flex items-center gap-3 text-[14px] text-muted"><Spinner /> {checking}</div></Panel>}

          {!checking && s.preflight.length > 0 && (
            <Panel>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <Label>Pre-flight check</Label>
                <span className="flex gap-1.5">
                  {issues ? <Pill tone="danger">{pluralize(issues, 'issue')} found</Pill> : <Pill tone="success">✓ Nothing failed</Pill>}
                  {reviews > 0 && <Pill tone="warn">{reviews} to check by eye</Pill>}
                </span>
              </div>
              <ul className="divide-y divide-line">
                {s.preflight.map(i => (
                  <li key={i.kind + i.label} className="flex items-start gap-3 py-3 text-[14px]">
                    {i.status === 'pass' ? <Check size={16} className="mt-0.5 shrink-0 text-success" aria-label="Passed" />
                      : i.status === 'review' ? <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-warn text-[10px] text-warn" aria-label="Check by eye">?</span>
                      : <X size={16} className="mt-0.5 shrink-0 text-danger" aria-label="Failed" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-fg"><span className="text-faint">{{ format: 'Format · ', must: 'Must include · ', avoid: 'Avoid · ', audio: 'Audio · ' }[i.kind]}</span>{i.label}</div>
                      {i.note && <div className={cx('mt-0.5 text-[13px]', i.status === 'fail' ? 'text-danger' : 'text-muted')}>{i.note}</div>}
                      {i.source === 'ai' && <div className="mt-0.5 text-[11.5px] text-faint">Checked by AI from video frames</div>}
                    </div>
                    {i.at !== undefined && <span className={cx('shrink-0 font-mono text-[12px]', i.status === 'fail' ? 'text-danger' : 'text-faint')}>{fmt(i.at)}</span>}
                  </li>
                ))}
              </ul>
              {s.briefMatch !== undefined && <p className="mt-3 text-[13px] text-muted">Brief match {s.briefMatch}/100 · {s.aiFeedback}</p>}
              {ran && (
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
                  {issues === 0 ? <Button onClick={() => void send()} loading={sending}>Submit to brand</Button> : (
                    <>
                      <span className="mr-auto text-[13px] text-muted">Fix the flagged moment and re-upload, or submit and let the brand decide.</span>
                      <Button variant="secondary" onClick={() => void send()} loading={sending}>Submit with {pluralize(issues, 'issue')}</Button>
                    </>
                  )}
                </div>
              )}
              {s.status === 'submitted' && <p className="mt-4 text-[13.5px] text-muted">Submitted. You’ll be notified when the brand reviews it.</p>}
            </Panel>
          )}

          {(s.status === 'approved' || s.status === 'paid') && (
            <Panel>
              <Pill tone="success">✓ {s.placement ? `Placed ${s.placement}` : 'Approved'}</Pill>
              <p className="mt-3 text-[14px] text-muted">Nice work. Your fee is in Earnings{c.bonusAmount ? `, and your ${money(c.bonusAmount)} bonus is paid automatically if the ad beats ${c.benchmarkCtr}% click-through within 14 days` : ''}.</p>
            </Panel>
          )}
        </div>
      </div>
    </>
  )
}
