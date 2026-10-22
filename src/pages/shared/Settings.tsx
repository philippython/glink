import { BadgeCheck, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button, ErrorBanner, Field, Input, Label, Panel, PageHeader, Segmented, Select, Textarea, useToast,
} from '../../components/kit'
import { COUNTRIES, toList, validateBrand, validateCreator, type FieldErrors, type Role } from '../../data/market'
import { useStore } from '../../data/store'
import { errorMessage } from '../../lib/api'
import { compact } from '../../lib/format'
import { useTheme, type ThemePref } from '../../lib/theme'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-line py-8 first:pt-0 md:grid-cols-[220px_1fr]">
      <h2 className="title-serif text-[20px] text-fg">{title}</h2>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  )
}

function Appearance() {
  const { pref, setPref } = useTheme()
  const { updateMe } = useStore()
  // Saved on this device straight away, and to your profile so it follows you.
  const choose = (p: ThemePref) => { setPref(p); void updateMe({ theme: p }).catch(() => {}) }
  return (
    <Section title="Appearance">
      <Segmented<ThemePref> cols={3} value={pref} onChange={choose} options={[
        { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System', hint: 'Match your device' },
      ]} />
    </Section>
  )
}

function PasswordSection() {
  const { session, changePassword } = useStore()
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [busy, setBusy] = useState(false)
  const save = async () => {
    if (next.length < 8) { setErrors({ password: 'Use at least 8 characters.' }); return }
    setBusy(true)
    try {
      const e = await changePassword(current, next)
      if (e) { setErrors(e); return }
      setErrors({}); setCurrent(''); setNext(''); toast('Password updated')
    } catch (err) { setErrors({ current: errorMessage(err) }) } finally { setBusy(false) }
  }
  return (
    <Section title="Password">
      {session.hasPassword && <Field label="Current password" htmlFor="pw-cur" error={errors.current}><Input id="pw-cur" type="password" value={current} onChange={e => setCurrent(e.target.value)} invalid={!!errors.current} autoComplete="current-password" /></Field>}
      <Field label={session.hasPassword ? 'New password' : 'Set a password'} htmlFor="pw-new" error={errors.password}><Input id="pw-new" type="password" value={next} onChange={e => setNext(e.target.value)} invalid={!!errors.password} autoComplete="new-password" /></Field>
      <Button variant="secondary" onClick={() => void save()} loading={busy} disabled={!next}>Update password</Button>
    </Section>
  )
}

export default function Settings({ role }: { role: Role }) {
  const { state, session, me, signOut, updateBrand, updateCreator, updateMe, switchRole, resetDemo, addChannel } = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const [name, setName] = useState(session.name)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [banner, setBanner] = useState('')
  const [busy, setBusy] = useState(false)

  const [b, setB] = useState({ name: state.brand.name, country: state.brand.country, description: state.brand.description, targetCustomers: state.brand.targetCustomers.join(', ') })
  const [c, setC] = useState({ country: me.country, bio: me.bio, displayName: me.displayName, niches: me.niches.join(', '), baseRate: me.baseRate, availability: me.availability })
  const [channel, setChannel] = useState<{ platform: string; handle: string; followers: string } | null>(null)

  const save = async () => {
    setBanner('')
    let e: FieldErrors | null = null
    setBusy(true)
    try {
      if (name.trim() && name.trim() !== session.name) await updateMe({ name: name.trim() })
      if (role === 'brand') {
        const payload = { ...b, targetCustomers: toList(b.targetCustomers) }
        e = validateBrand(payload)
        if (!Object.keys(e).length) e = await updateBrand(payload)
      } else {
        const payload = { ...c, niches: toList(c.niches) }
        e = validateCreator(payload)
        if (!Object.keys(e).length) e = await updateCreator(payload)
      }
      if (e && Object.keys(e).length) setErrors(e)
      else { setErrors({}); toast('Changes saved') }
    } catch (err) { setBanner(errorMessage(err)) } finally { setBusy(false) }
  }

  const reach = me.channels.reduce((a, ch) => a + ch.followers, 0)
  const strength = Math.min(100, 30 + me.channels.length * 25 + me.channels.filter(ch => ch.verified).length * 10)
  const connect = async () => {
    if (!channel) return
    if (channel.handle.trim().length < 2) { setErrors({ ...errors, channel: 'Enter your handle.' }); return }
    try {
      await addChannel({ platform: channel.platform, handle: channel.handle.trim(), followers: Number(channel.followers) || 0 })
      setChannel(null); toast(`${channel.platform} added`)
    } catch (err) { setErrors({ ...errors, channel: errorMessage(err) }) }
  }

  const otherSide = role === 'brand' ? 'creator' : 'brand'
  const switchSides = async () => {
    try {
      const r = await switchRole(otherSide)
      navigate(r.needsOnboarding ? `/onboarding/${otherSide}` : `/${otherSide}`)
    } catch (err) { setBanner(errorMessage(err)) }
  }
  const canEditBrand = state.permissions.canSpend

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your profile and preferences." />
      {banner && <ErrorBanner>{banner}</ErrorBanner>}
      {Object.keys(errors).filter(k => k !== 'channel').length > 0 && <ErrorBanner>Please fix: {Object.entries(errors).filter(([k]) => k !== 'channel').map(([, v]) => v).join(' ')}</ErrorBanner>}

      <Section title="Account">
        <Field label="Name" htmlFor="s-name"><Input id="s-name" value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Email" htmlFor="s-email" hint="Contact support to change your email."><Input id="s-email" value={session.email} readOnly className="bg-subtle text-muted" /></Field>
        {role === 'creator' && (
          <>
            <Field label="Country" htmlFor="s-country" error={errors.country}><Select id="s-country" value={c.country} onChange={e => setC({ ...c, country: e.target.value })}>{COUNTRIES.map(x => <option key={x}>{x}</option>)}</Select></Field>
            <Field label="Bio" htmlFor="s-bio" error={errors.bio}><Textarea id="s-bio" value={c.bio} onChange={e => setC({ ...c, bio: e.target.value })} invalid={!!errors.bio} /></Field>
          </>
        )}
      </Section>

      {role === 'brand' ? (
        <Section title="Brand">
          {!canEditBrand && <p className="text-[13px] text-muted">Only owners and managers can edit brand details.</p>}
          <fieldset disabled={!canEditBrand} className="space-y-4">
            <Field label="Company name" htmlFor="s-b-name" error={errors.name}><Input id="s-b-name" value={b.name} onChange={e => setB({ ...b, name: e.target.value })} invalid={!!errors.name} /></Field>
            <Field label="Country" htmlFor="s-b-country"><Select id="s-b-country" value={b.country} onChange={e => setB({ ...b, country: e.target.value })}>{COUNTRIES.map(x => <option key={x}>{x}</option>)}</Select></Field>
            <Field label="Target customers" htmlFor="s-b-tc" error={errors.targetCustomers} hint="Separate with commas."><Input id="s-b-tc" value={b.targetCustomers} onChange={e => setB({ ...b, targetCustomers: e.target.value })} invalid={!!errors.targetCustomers} /></Field>
            <Field label="Brand description" htmlFor="s-b-desc" error={errors.description}><Textarea id="s-b-desc" value={b.description} onChange={e => setB({ ...b, description: e.target.value })} invalid={!!errors.description} /></Field>
          </fieldset>
        </Section>
      ) : (
        <>
          <Section title="Creator profile">
            <Field label="Display name" htmlFor="s-dn" error={errors.displayName}><Input id="s-dn" value={c.displayName} onChange={e => setC({ ...c, displayName: e.target.value })} invalid={!!errors.displayName} /></Field>
            <Field label="Niches" htmlFor="s-niches" error={errors.niches} hint="Separate with commas. Matching uses these."><Input id="s-niches" value={c.niches} onChange={e => setC({ ...c, niches: e.target.value })} invalid={!!errors.niches} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Base rate per video (USD)" htmlFor="s-rate" hint="Brands with a lower fee see you as over budget."><Input id="s-rate" type="number" min={0} value={c.baseRate} onChange={e => setC({ ...c, baseRate: +e.target.value })} /></Field>
              <Field label="Availability" htmlFor="s-av" hint="“Unavailable” pauses new matches."><Select id="s-av" value={c.availability} onChange={e => setC({ ...c, availability: e.target.value as typeof c.availability })}>{['Available', 'Limited', 'Unavailable'].map(x => <option key={x}>{x}</option>)}</Select></Field>
            </div>
          </Section>
          <Section title="Social presence">
            <div className="rounded-xl bg-subtle p-5">
              <div className="text-[14px] font-medium text-fg">Why connect your channels</div>
              <ul className="mt-2 grid gap-1.5 text-[13px] text-muted sm:grid-cols-2">
                <li>· Smarter matching to campaigns</li><li>· Audience-fit scoring for brands</li>
                <li>· Get discovered by new brands</li><li>· Verified reach on your profile</li>
              </ul>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Panel className="!p-4"><Label>Connection strength</Label><div className="title-serif mt-2 text-[26px] text-fg">{strength}%</div></Panel>
              <Panel className="!p-4"><Label>Reach</Label><div className="title-serif mt-2 text-[26px] text-fg">{compact(reach)}</div></Panel>
              <Panel className="!p-4"><Label>Channels</Label><div className="title-serif mt-2 text-[26px] text-fg">{me.channels.length}</div></Panel>
            </div>
            <div className="space-y-2">
              {me.channels.map(ch => (
                <div key={ch.platform} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-[13.5px]">
                  <span className="text-fg">{ch.platform} <span className="text-muted">{ch.handle}</span></span>
                  <span className="flex items-center gap-1.5 text-muted">{compact(ch.followers)}{ch.verified ? <BadgeCheck size={14} className="text-success" aria-label="Verified" /> : <span className="text-[11.5px] text-faint">self-reported</span>}</span>
                </div>
              ))}
            </div>
            {channel ? (
              <div className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[130px_1fr_130px_auto]">
                <Select aria-label="Platform" value={channel.platform} onChange={e => setChannel({ ...channel, platform: e.target.value })}>
                  {(['TikTok', 'Instagram', 'YouTube'] as const).filter(p => !me.channels.some(x => x.platform === p)).map(p => <option key={p}>{p}</option>)}
                </Select>
                <Input aria-label="Handle" placeholder="@handle" value={channel.handle} onChange={e => setChannel({ ...channel, handle: e.target.value })} />
                <Input aria-label="Followers" type="number" min={0} placeholder="Followers" value={channel.followers} onChange={e => setChannel({ ...channel, followers: e.target.value })} />
                <div className="flex gap-1.5"><Button onClick={() => void connect()}>Add</Button><Button variant="ghost" onClick={() => setChannel(null)}>Cancel</Button></div>
                {errors.channel && <div className="text-[12.5px] text-danger sm:col-span-4">{errors.channel}</div>}
              </div>
            ) : me.channels.length < 3 && (
              <Button variant="secondary" onClick={() => setChannel({ platform: (['TikTok', 'Instagram', 'YouTube'] as const).find(p => !me.channels.some(x => x.platform === p))!, handle: '', followers: '' })}><Plus size={14} /> Add a channel</Button>
            )}
          </Section>
        </>
      )}

      <Appearance />
      {session.email && <PasswordSection />}

      <Section title="Account type">
        <p className="text-[13.5px] text-muted">You’re using Glink as a {role}. You can also work on the {otherSide} side with the same login.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void switchSides()}>Switch to {otherSide}</Button>
          {import.meta.env.DEV && <Button variant="ghost" onClick={() => void resetDemo().then(() => toast('Demo data reset'), e => toast(errorMessage(e)))}>Reset demo data</Button>}
        </div>
      </Section>

      <div className="flex flex-wrap justify-between gap-2 pt-8">
        <Button variant="danger" onClick={() => void signOut().then(() => navigate('/login'))}>Log out</Button>
        <Button onClick={() => void save()} loading={busy}>Save changes</Button>
      </div>
    </>
  )
}
