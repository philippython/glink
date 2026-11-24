import { X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Avatar, Button, Empty, Field, Input, PageHeader, Panel, Pill, SectionHead, Select, useToast, type Tone } from '../../components/kit'
import type { TeamMember } from '../../data/market'
import { type AuditEntry, useStore } from '../../data/store'
import { errorMessage } from '../../lib/api'
import { money, timeAgo } from '../../lib/format'

const roles: { role: TeamMember['role']; text: string }[] = [
  { role: 'Owner', text: 'Everything, including billing and team.' },
  { role: 'Manager', text: 'Create campaigns, invite creators, approve and pay.' },
  { role: 'Reviewer', text: 'Review and approve videos. Can’t spend money or launch campaigns.' },
]

export default function Team() {
  const { state, user, inviteTeammate, removeTeammate } = useStore()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'Manager' | 'Reviewer'>('Reviewer')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const owner = state.permissions.canManageTeam

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Enter a valid email address.'); return }
    setBusy(true); setError('')
    try {
      const errs = await inviteTeammate(email, role)
      if (errs) { setError(errs.email ?? Object.values(errs)[0]); return }
      toast(`Invitation sent to ${email}`); setEmail('')
    } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="Team" subtitle={`Invite teammates and choose what each person can do. You’re ${state.myRole === 'Owner' ? 'the owner' : `a ${state.myRole.toLowerCase()}`}.`} />
      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <section className="min-w-0">
          <SectionHead title="Members" />
          <Panel pad={false}>
            {state.team.map(m => (
              <div key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-4 last:border-0">
                <Avatar name={m.name} />
                <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-medium text-fg">{m.name}{m.email === user?.email && <span className="text-muted"> (you)</span>}</div><div className="truncate text-[13px] text-muted">{m.email}</div></div>
                {m.pending && <Pill tone="warn">Invite pending</Pill>}
                <Pill>{m.role}</Pill>
                {owner && m.role !== 'Owner' && (
                  <button onClick={() => void removeTeammate(m.email).then(() => toast(`${m.email} removed`), e => toast(errorMessage(e)))}
                    className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-subtle hover:text-danger" aria-label={`Remove ${m.email}`}><X size={14} /></button>
                )}
              </div>
            ))}
          </Panel>
        </section>
        <section className="min-w-0">
          <SectionHead title="Invite a teammate" />
          <Panel>
            {owner ? (
              <form onSubmit={submit} noValidate className="space-y-4">
                <Field label="Email" htmlFor="t-email" error={error}><Input id="t-email" type="email" value={email} onChange={e => setEmail(e.target.value)} invalid={!!error} /></Field>
                <Field label="Role" htmlFor="t-role"><Select id="t-role" value={role} onChange={e => setRole(e.target.value as 'Manager' | 'Reviewer')}><option>Manager</option><option>Reviewer</option></Select></Field>
                <Button type="submit" className="w-full" loading={busy}>Send invitation</Button>
                <p className="text-[12.5px] text-faint">They’ll join automatically when they sign up or log in with this email.</p>
              </form>
            ) : <p className="text-[13.5px] text-muted">Only the brand owner can invite or remove teammates.</p>}
            <ul className="mt-6 space-y-3 border-t border-line pt-5 text-[13px]">
              {roles.map(r => <li key={r.role}><span className="font-medium text-fg">{r.role}:</span> <span className="text-muted">{r.text}</span></li>)}
            </ul>
          </Panel>
        </section>
      </div>
      {owner && <ActivityLog />}
    </>
  )
}

const ACTIONS: Record<string, [string, Tone]> = {
  'wallet.topup': ['Funds added', 'success'], 'wallet.refund': ['Refunded', 'neutral'], 'wallet.dispute': ['Dispute', 'danger'],
  'campaign.launch': ['Campaign launched', 'warn'], 'review.approve': ['Video approved', 'success'], 'contest.winner': ['Winner picked', 'success'],
  'payment.base': ['Creator paid', 'neutral'], 'payment.bonus': ['Bonus paid', 'neutral'], 'payment.prize': ['Prize paid', 'neutral'],
  'team.invite': ['Teammate invited', 'warn'], 'team.remove': ['Teammate removed', 'danger'],
}

/** Every change to money or permissions: who did it and when. Owners only. */
function ActivityLog() {
  const { state, loadAudit } = useStore()
  const [rows, setRows] = useState<AuditEntry[] | null>(null)
  const [error, setError] = useState('')
  // Reload whenever money or the team changes.
  const key = `${state.billing.ledger.length}-${state.team.length}-${state.payments.length}`
  useEffect(() => {
    let live = true
    loadAudit().then(r => { if (live) setRows(r) }, e => { if (live) setError(errorMessage(e)) })
    return () => { live = false }
  }, [loadAudit, key])
  return (
    <section className="mt-10">
      <SectionHead title="Activity log" />
      <p className="-mt-2 mb-3 text-[13px] text-muted">Every change to money or permissions: who made it and when. Only owners can see this.</p>
      <Panel pad={false}>
        {error ? <Empty text={error} /> : rows === null ? <Empty text="Loading…" /> : rows.length === 0 ? <Empty text="Nothing yet. Top-ups, launches, approvals, payments and team changes appear here." /> : rows.slice(0, 60).map(r => {
          const [label, tone] = ACTIONS[r.action] ?? [r.action, 'neutral' as Tone]
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 last:border-0">
              <Pill tone={tone}>{label}</Pill>
              <div className="min-w-0 flex-1 text-[13.5px]">
                <span className="text-fg">{r.detail}</span>
                {r.creator && <span className="text-muted"> · {r.creator}</span>}
                <div className="text-[12px] text-faint">{r.by} · {timeAgo(r.at)}</div>
              </div>
              {r.amount !== undefined && <span className="tabular-nums text-[14px] text-fg">{money(r.amount)}</span>}
            </div>
          )
        })}
      </Panel>
    </section>
  )
}
