import { motion } from 'framer-motion'
import { ArrowRight, Megaphone, Video } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, ErrorBanner, Field, Input, Loading, Select, Spinner, Textarea, ThemeSwitch } from '../../components/kit'
import { Logo } from '../../components/Logo'
import { SocialButtons } from '../../components/SocialButtons'
import { COUNTRIES, toList, validateBrand, validateCreator, type FieldErrors, type Role } from '../../data/market'
import { useStore } from '../../data/store'
import { ApiError, errorMessage } from '../../lib/api'
import { photos } from '../../lib/images'

function AuthFrame({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-screen bg-bg">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2"><Logo size={26} /><span className="font-semibold text-fg">Glink</span></Link>
          <div className="w-40"><ThemeSwitch /></div>
        </div>
        <div className="flex flex-1 items-start justify-center px-5 pb-16 pt-8 md:pt-16">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={wide ? 'w-full max-w-[720px]' : 'w-full max-w-[400px]'}>
            {children}
          </motion.div>
        </div>
      </div>
      {/* Short forms get a photo beside them on wide screens; the wider onboarding steps use the full width. */}
      {!wide && (
        <aside className="hidden w-[44%] max-w-[680px] p-3 lg:block">
          <div className="sticky top-3 h-[calc(100vh-1.5rem)] overflow-hidden rounded-2xl bg-subtle">
            <motion.img src={photos.auth} alt="" initial={{ scale: 1.06 }} animate={{ scale: 1 }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-pure-black/75 via-pure-black/10 to-transparent" />
            <div className="bg-grad absolute inset-0 opacity-25 mix-blend-soft-light" />
            <div className="absolute inset-x-0 bottom-0 p-10 text-pure-white">
              <span className="mb-4 inline-flex rounded-full bg-lime px-2.5 py-0.5 text-[12px] font-semibold text-pure-black">Free for creators</span>
              <div className="title-serif max-w-md text-[34px] leading-[1.1]">Every campaign makes the next video <span className="italic">better.</span></div>
              <p className="mt-3 max-w-md text-[14px] opacity-80">Brief, matched creators, checked videos, and payment released on approval — all in one place.</p>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}

const Heading = ({ title, sub }: { title: string; sub: string }) => (
  <div className="mb-8 text-center">
    <h1 className="title-serif text-[34px] leading-tight text-fg">{title}</h1>
    <p className="mt-2 text-[14.5px] text-muted">{sub}</p>
  </div>
)

const home = (u: { role: Role | null; onboarded: boolean }) => (u.role && u.onboarded ? `/${u.role}` : '/onboarding')

const PROVIDER = (p: string | null) => ({ google: 'Google', apple: 'Apple', facebook: 'Facebook' } as Record<string, string>)[p ?? ''] ?? 'that provider'
const OAUTH_ERRORS: Record<string, (p: string) => string> = {
  oauth: p => `Signing in with ${p} didn’t complete. Please try again.`,
  oauth_state: () => 'That sign-in link expired. Please try again.',
  oauth_cancelled: () => 'Sign-in was cancelled.',
  oauth_unavailable: () => 'That sign-in option isn’t set up yet. Use email and password instead.',
  email_required: p => `${p} didn’t share an email address, which we need for your account. Allow email access or sign up with email.`,
  email_unverified: p => `Your ${p} email isn’t verified, so we can’t use it to sign in.`,
}

// ─── Login / sign up ────────────────────────────────────────────────────────

export function Login({ mode = 'login' }: { mode?: 'login' | 'signup' }) {
  const { login, signup, user, ready, config } = useStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const err = params.get('error')
  const [banner, setBanner] = useState(err ? (OAUTH_ERRORS[err]?.(PROVIDER(params.get('provider'))) ?? 'Sign-in didn’t complete. Please try again.') : '')
  const [busy, setBusy] = useState(false)
  const as = params.get('as') === 'creator' || params.get('as') === 'brand' ? (params.get('as') as Role) : null
  // After a first sign-up, go straight to the chosen side’s setup form.
  const next = params.get('next') ?? (as ? `/onboarding?as=${as}` : null)

  if (ready && user) return <Navigate to={next ?? home(user)} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: FieldErrors = {}
    if (mode === 'signup' && !name.trim()) errs.name = 'Enter your name.'
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email address.'
    if (mode === 'signup' ? password.length < 8 : !password) errs.password = mode === 'signup' ? 'Use at least 8 characters.' : 'Enter your password.'
    setErrors(errs); setBanner('')
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      const u = mode === 'signup' ? await signup(name.trim(), email, password) : await login(email, password)
      navigate(next ?? home(u), { replace: true })
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) setErrors(err.fields)
      else setBanner(errorMessage(err))
    } finally { setBusy(false) }
  }

  const demo = async (who: Role) => {
    setBusy(true); setBanner('')
    try { const u = await login(who === 'brand' ? 'alex@lumenskin.com' : 'maya@example.com', 'demo1234'); navigate(home(u), { replace: true }) }
    catch (err) { setBanner(errorMessage(err)) } finally { setBusy(false) }
  }

  return (
    <AuthFrame>
      <Heading title={mode === 'login' ? 'Welcome back' : as === 'creator' ? 'Join as a creator' : as === 'brand' ? 'Start as a brand' : 'Create your account'}
        sub={mode === 'login' ? 'Log in to your account' : as === 'creator' ? 'Get matched to campaigns that fit your strengths.' : as === 'brand' ? 'Write one brief and get matched creators.' : 'Free to start. No card needed.'} />
      <div className="card rounded-xl p-6">
        {banner && <ErrorBanner>{banner}</ErrorBanner>}
        <SocialButtons next={next ?? undefined} />
        <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.08em] text-faint"><div className="h-px flex-1 bg-line" />or with email<div className="h-px flex-1 bg-line" /></div>
        <form onSubmit={submit} noValidate className="space-y-4">
          {mode === 'signup' && <Field label="Name" htmlFor="name" error={errors.name}><Input id="name" value={name} onChange={e => setName(e.target.value)} invalid={!!errors.name} autoComplete="name" /></Field>}
          <Field label="Email" htmlFor="email" error={errors.email}><Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} invalid={!!errors.email} autoComplete="email" /></Field>
          <Field label="Password" htmlFor="password" error={errors.password} hint={mode === 'signup' ? 'At least 8 characters.' : undefined}>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} invalid={!!errors.password} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </Field>
          {mode === 'login' && <Link to="/forgot-password" className="inline-block text-[13px] text-muted underline-offset-4 hover:text-fg hover:underline">Forgot password?</Link>}
          <Button type="submit" variant="brand" className="w-full" loading={busy}>{mode === 'login' ? 'Log in' : 'Create account'}</Button>
        </form>
      </div>
      <p className="mt-5 text-center text-[13.5px] text-muted">
        {mode === 'login' ? <>Don’t have an account? <Link to={`/signup${as ? `?as=${as}` : ''}`} className="font-medium text-fg hover:underline">Create one</Link></>
          : <>Already have an account? <Link to="/login" className="font-medium text-fg hover:underline">Log in</Link></>}
      </p>
      {config.demo && (
        <div className="mt-8 border-t border-line pt-5 text-center text-[12.5px] text-faint">
          Exploring? Log in to a demo account as a{' '}
          <button onClick={() => void demo('brand')} className="font-medium text-fg hover:underline">brand</button> or a{' '}
          <button onClick={() => void demo('creator')} className="font-medium text-fg hover:underline">creator</button>.
      </div>
      )}
    </AuthFrame>
  )
}

export function ForgotPassword() {
  const { forgotPassword } = useStore()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Enter a valid email address.'); return }
    setBusy(true); setError('')
    try { await forgotPassword(email); setSent(true) } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  return (
    <AuthFrame>
      <Heading title="Reset your password" sub="We’ll email you a link to choose a new one." />
      <div className="card rounded-xl p-6">
        {sent ? (
          <p className="text-[14px] text-fg">If an account exists for <strong className="font-medium">{email}</strong>, a reset link is on its way. It works for one hour.</p>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            <Field label="Email" htmlFor="f-email" error={error}><Input id="f-email" type="email" value={email} onChange={e => setEmail(e.target.value)} invalid={!!error} autoComplete="email" /></Field>
            <Button type="submit" className="w-full" loading={busy}>Send reset link</Button>
          </form>
        )}
      </div>
      <p className="mt-5 text-center text-[13.5px] text-muted"><Link to="/login" className="font-medium text-fg hover:underline">Back to log in</Link></p>
    </AuthFrame>
  )
}

export function ResetPassword() {
  const { resetPassword } = useStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [banner, setBanner] = useState('')
  const [busy, setBusy] = useState(false)
  const token = params.get('token') ?? ''
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs: FieldErrors = {}
    if (password.length < 8) errs.password = 'Use at least 8 characters.'
    if (confirm !== password) errs.confirm = 'The passwords don’t match.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true); setBanner('')
    try { await resetPassword(token, password); navigate('/login', { replace: true }) } catch (err) { setBanner(errorMessage(err)) } finally { setBusy(false) }
  }
  return (
    <AuthFrame>
      <Heading title="Choose a new password" sub="You’ll be signed out everywhere else." />
      <form onSubmit={submit} noValidate className="card space-y-4 rounded-xl p-6">
        {!token && <ErrorBanner>This link is missing its reset code. Request a new one.</ErrorBanner>}
        {banner && <ErrorBanner>{banner} <Link to="/forgot-password" className="underline">Request a new link</Link></ErrorBanner>}
        <Field label="New password" htmlFor="r-pw" error={errors.password}><Input id="r-pw" type="password" value={password} onChange={e => setPassword(e.target.value)} invalid={!!errors.password} autoComplete="new-password" /></Field>
        <Field label="Confirm password" htmlFor="r-pw2" error={errors.confirm}><Input id="r-pw2" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} invalid={!!errors.confirm} autoComplete="new-password" /></Field>
        <Button type="submit" className="w-full" loading={busy} disabled={!token}>Save new password</Button>
      </form>
    </AuthFrame>
  )
}

// ─── Choose a path ──────────────────────────────────────────────────────────

function useSignedIn() {
  const { user, ready } = useStore()
  return { user, ready, redirect: ready && !user ? <Navigate to="/login" replace /> : !ready ? <div className="grid min-h-screen place-items-center bg-bg"><Loading /></div> : null }
}

export function ChoosePath() {
  const { chooseRole } = useStore()
  const navigate = useNavigate()
  const { user, redirect } = useSignedIn()
  const [busy, setBusy] = useState<Role>()
  const [params] = useSearchParams()
  const as = params.get('as')
  const auto = useRef(false)
  // Arriving from "Join as a creator" / "Start as a brand": skip the choice.
  useEffect(() => {
    if (!user || user.onboarded || auto.current || (as !== 'brand' && as !== 'creator')) return
    auto.current = true
    void chooseRole(as).then(() => navigate(`/onboarding/${as}`, { replace: true }))
  }, [user, as, chooseRole, navigate])
  if (redirect) return redirect
  if (user!.role && user!.onboarded) return <Navigate to={`/${user!.role}`} replace />
  const pick = async (r: Role) => { setBusy(r); try { await chooseRole(r); navigate(`/onboarding/${r}`) } finally { setBusy(undefined) } }
  const paths = [
    { role: 'brand' as const, icon: Megaphone, title: 'I’m a Brand', text: 'Find creators and build content that performs.' },
    { role: 'creator' as const, icon: Video, title: 'I’m a Creator', text: 'Create better content, prove your performance and earn more.' },
  ]
  return (
    <AuthFrame wide>
      <Heading title="How will you use Glink?" sub="You can change this later in Settings." />
      <div className="grid gap-4 sm:grid-cols-2">
        {paths.map(p => (
          <button key={p.role} onClick={() => void pick(p.role)} className="card group rounded-xl p-6 text-left transition-colors hover:border-line-strong">
            <div className="mb-10 grid h-10 w-10 place-items-center rounded-lg bg-subtle text-fg"><p.icon size={18} strokeWidth={1.75} /></div>
            <div className="title-serif text-[24px] text-fg">{p.title}</div>
            <p className="mt-2 text-[14px] text-muted">{p.text}</p>
            <div className="mt-6 inline-flex items-center gap-1 text-[13.5px] font-medium text-fg">
              {busy === p.role ? <Spinner size={14} /> : null}Get started <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
            </div>
          </button>
        ))}
      </div>
    </AuthFrame>
  )
}

// ─── Brand / creator setup ──────────────────────────────────────────────────

const LABELS: Record<string, string> = {
  name: 'Company name', country: 'Country', targetCustomers: 'Target customers', description: 'Brand description',
  displayName: 'Display name', niches: 'Niches', bio: 'Bio',
}

function FormErrors({ errors }: { errors: FieldErrors }) {
  const keys = Object.keys(errors)
  if (!keys.length) return null
  return (
    <ErrorBanner>
      {keys.length === 1 ? 'Please fix one field before continuing:' : `Please fix ${keys.length} fields before continuing:`}
      <ul className="mt-1 list-disc pl-4">{keys.map(k => <li key={k}><strong className="font-medium">{LABELS[k] ?? k}</strong> — {errors[k]}</li>)}</ul>
    </ErrorBanner>
  )
}

function useSetupForm<T>(save: (payload: T) => Promise<FieldErrors | null>, validate: (payload: T) => FieldErrors) {
  const navigate = useNavigate()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [banner, setBanner] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (payload: T) => {
    const clientErrors = validate(payload)
    setErrors(clientErrors); setBanner('')
    if (Object.keys(clientErrors).length) return
    setBusy(true)
    try {
      const serverErrors = await save(payload)
      if (serverErrors) setErrors(serverErrors)
      else navigate('/onboarding/setup')
    } catch (err) { setBanner(errorMessage(err)) } finally { setBusy(false) }
  }
  return { errors, banner, busy, run }
}

export function BrandSetup() {
  const { setupBrand } = useStore()
  const { redirect } = useSignedIn()
  const [f, setF] = useState({ name: '', country: '', targetCustomers: '', description: '' })
  // List fields are always sent as arrays.
  const form = useSetupForm(setupBrand, validateBrand)
  if (redirect) return redirect
  const submit = (e: FormEvent) => { e.preventDefault(); void form.run({ ...f, targetCustomers: toList(f.targetCustomers) }) }

  return (
    <AuthFrame>
      <Heading title="Set up your brand" sub="This helps us match you with the right creators." />
      <form onSubmit={submit} noValidate className="card space-y-4 rounded-xl p-6">
        {form.banner && <ErrorBanner>{form.banner}</ErrorBanner>}
        <FormErrors errors={form.errors} />
        <Field label="Company name" htmlFor="b-name" error={form.errors.name}><Input id="b-name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} invalid={!!form.errors.name} /></Field>
        <Field label="Country" htmlFor="b-country" error={form.errors.country}>
          <Select id="b-country" value={f.country} onChange={e => setF({ ...f, country: e.target.value })} invalid={!!form.errors.country}>
            <option value="">Choose a country</option>{COUNTRIES.map(c => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Target customers" htmlFor="b-tc" error={form.errors.targetCustomers} hint="Separate with commas, e.g. new parents, runners">
          <Input id="b-tc" value={f.targetCustomers} onChange={e => setF({ ...f, targetCustomers: e.target.value })} invalid={!!form.errors.targetCustomers} />
        </Field>
        <Field label="Brand description" htmlFor="b-desc" error={form.errors.description}>
          <Textarea id="b-desc" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} invalid={!!form.errors.description} placeholder="What you sell and who it’s for" />
        </Field>
        <Button type="submit" variant="brand" className="w-full" loading={form.busy}>Create my brand</Button>
        <Link to="/onboarding" className="block text-center text-[13px] text-muted hover:text-fg">← Choose a different path</Link>
      </form>
    </AuthFrame>
  )
}

export function CreatorSetup() {
  const { setupCreator, user } = useStore()
  const { redirect } = useSignedIn()
  const [f, setF] = useState({ displayName: user?.name ?? '', country: '', niches: '', bio: '' })
  const form = useSetupForm(setupCreator, validateCreator)
  if (redirect) return redirect
  const submit = (e: FormEvent) => { e.preventDefault(); void form.run({ ...f, niches: toList(f.niches) }) }

  return (
    <AuthFrame>
      <Heading title="Set up your profile" sub="Brands will see this when you’re matched." />
      <form onSubmit={submit} noValidate className="card space-y-4 rounded-xl p-6">
        {form.banner && <ErrorBanner>{form.banner}</ErrorBanner>}
        <FormErrors errors={form.errors} />
        <Field label="Display name" htmlFor="c-name" error={form.errors.displayName}><Input id="c-name" value={f.displayName} onChange={e => setF({ ...f, displayName: e.target.value })} invalid={!!form.errors.displayName} /></Field>
        <Field label="Country" htmlFor="c-country" error={form.errors.country}>
          <Select id="c-country" value={f.country} onChange={e => setF({ ...f, country: e.target.value })} invalid={!!form.errors.country}>
            <option value="">Choose a country</option>{COUNTRIES.map(c => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Niches" htmlFor="c-niches" error={form.errors.niches} hint="Separate with commas, e.g. skincare, fitness">
          <Input id="c-niches" value={f.niches} onChange={e => setF({ ...f, niches: e.target.value })} invalid={!!form.errors.niches} />
        </Field>
        <Field label="Bio" htmlFor="c-bio" error={form.errors.bio}><Textarea id="c-bio" value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} invalid={!!form.errors.bio} /></Field>
        <Button type="submit" variant="brand" className="w-full" loading={form.busy}>Create my profile</Button>
        <Link to="/onboarding" className="block text-center text-[13px] text-muted hover:text-fg">← Choose a different path</Link>
      </form>
    </AuthFrame>
  )
}

export function Preparing() {
  const { user, finishOnboarding } = useStore()
  const navigate = useNavigate()
  const { redirect } = useSignedIn()
  const [error, setError] = useState('')
  const started = useRef(false)
  useEffect(() => {
    if (!user?.role || started.current) return
    started.current = true
    const role = user.role
    Promise.all([finishOnboarding(), new Promise(r => setTimeout(r, 1200))])
      .then(() => navigate(`/${role}`, { replace: true }))
      .catch(err => setError(errorMessage(err)))
  }, [user?.role, finishOnboarding, navigate])
  if (redirect) return redirect
  if (!user!.role) return <Navigate to="/onboarding" replace />
  return (
    <AuthFrame>
      <div className="grid place-items-center gap-4 pt-16 text-center">
        {error ? <ErrorBanner>{error}</ErrorBanner> : <Spinner size={24} />}
        <h1 className="title-serif text-[28px] text-fg">Setting up your workspace</h1>
        <p className="text-[14px] text-muted">Preparing your demo campaigns, matches and intelligence.</p>
      </div>
    </AuthFrame>
  )
}
