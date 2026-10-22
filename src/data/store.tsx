import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, ApiError } from '../lib/api'
import type {
  AppNotification, Brand, Campaign, CreativeSubmission, CreatorProfile, FieldErrors, Match, MarketState, Payment, PreflightItem, Role, TeamMember,
} from './market'

// Client state for the signed-in user. The server is the source of truth:
// actions call the API, then the state is refetched. The server also pushes
// "changed" events (SSE) so other people's actions show up without a refresh.

export interface Session { role: Role | null; name: string; email: string; onboarded: boolean; theme: string; hasPassword: boolean }
interface User extends Session { id: string }

export interface State {
  brand: Brand
  myRole: TeamMember['role']
  permissions: { canSpend: boolean; canReview: boolean; canManageTeam: boolean }
  creators: CreatorProfile[]
  campaigns: Campaign[]
  matches: Match[]
  submissions: CreativeSubmission[]
  payments: Payment[]
  notifications: AppNotification[]
  team: TeamMember[]
  wallet: number
  billing: NonNullable<MarketState['billing']>
  payouts: NonNullable<MarketState['payouts']>
  payoutAccount: NonNullable<MarketState['payoutAccount']>
}

const emptyMe: CreatorProfile = {
  id: '', name: '', email: '', displayName: '', handle: '', country: '', niches: [], bio: '', baseRate: 0, availability: 'Available',
  strengths: { hook: 0, retention: 0, conversion: 0, reliability: 0 }, styles: [], onTimeRate: 0, repeatBrandRate: 0, pastBrands: [], channels: [],
  coach: { insight: '', advice: '', improving: [], valued: [], nextSkill: '' },
}

function normalize(s: MarketState | null): { state: State; me: CreatorProfile } {
  const me = s?.me ?? emptyMe
  return {
    me,
    state: {
      brand: s?.brand ?? { id: '', name: '', country: '', description: '', targetCustomers: [] },
      myRole: s?.myRole ?? 'Owner',
      permissions: s?.permissions ?? { canSpend: false, canReview: false, canManageTeam: false },
      creators: s?.creators ?? (s?.me ? [s.me] : []),
      campaigns: s?.campaigns ?? [],
      matches: s?.matches ?? [],
      submissions: s?.submissions ?? [],
      payments: s?.payments ?? [],
      notifications: s?.notifications ?? [],
      team: s?.team ?? [],
      wallet: s?.wallet ?? 0,
      billing: s?.billing ?? { held: 0, ledger: [], budgets: {} },
      payouts: s?.payouts ?? [],
      payoutAccount: s?.payoutAccount ?? { connected: false, ready: false },
    },
  }
}

export type CampaignDraft = Omit<Campaign, 'id' | 'brandId' | 'brandName' | 'status' | 'createdAt' | 'deadline'>
export interface UploadMeta { duration: number; width?: number; height?: number; script?: string; frames?: { t: number; data: string }[] }
export interface Metrics { impressions: number; clicks: number; conversions: number; spend: number; thumbstop: number; holdRate: number }

/** Runs a form action: returns field errors on 422 (so the form can show them), rethrows anything else. */
async function withFields(fn: () => Promise<unknown>): Promise<FieldErrors | null> {
  try { await fn(); return null } catch (e) {
    if (e instanceof ApiError && Object.keys(e.fields).length) return e.fields
    throw e
  }
}

interface Store {
  ready: boolean
  loading: boolean
  user: User | null
  session: Session
  state: State
  me: CreatorProfile
  config: AppConfig
  refresh: () => Promise<void>
  // auth
  login: (email: string, password: string) => Promise<User>
  signup: (name: string, email: string, password: string) => Promise<User>
  signOut: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
  changePassword: (current: string, password: string) => Promise<FieldErrors | null>
  // onboarding
  chooseRole: (r: Role) => Promise<void>
  setupBrand: (input: { name: string; country: string; description: string; targetCustomers: string[] }) => Promise<FieldErrors | null>
  setupCreator: (input: { displayName: string; country: string; niches: string[]; bio: string }) => Promise<FieldErrors | null>
  finishOnboarding: () => Promise<void>
  switchRole: (r: Role) => Promise<{ needsOnboarding: boolean }>
  updateMe: (p: { name?: string; theme?: string }) => Promise<void>
  // brand
  launchCampaign: (d: CampaignDraft) => Promise<{ id: string; sourcing: string }>
  invite: (campaignId: string, creatorId: string) => Promise<void>
  review: (submissionId: string, decision: 'approve' | 'changes' | 'reject', note: string) => Promise<void>
  recordMetrics: (submissionId: string, m: Metrics) => Promise<{ ctr: number; winning: boolean; bonusPaid: boolean }>
  pickWinner: (submissionId: string, place: number) => Promise<void>
  updateBrand: (b: Omit<Brand, 'id'>) => Promise<FieldErrors | null>
  inviteTeammate: (email: string, role: 'Manager' | 'Reviewer') => Promise<FieldErrors | null>
  removeTeammate: (email: string) => Promise<void>
  topUp: (amount: number) => Promise<void>
  /** Opens Stripe's payment page; the wallet updates when Stripe confirms. */
  checkout: (amount: number) => Promise<void>
  // creator
  respond: (matchId: string, accept: boolean) => Promise<void>
  enterContest: (campaignId: string) => Promise<void>
  upload: (submissionId: string, file: File | null, meta: UploadMeta) => Promise<{ preflight: PreflightItem[]; issues: number }>
  submit: (submissionId: string) => Promise<void>
  updateCreator: (c: { displayName: string; country: string; niches: string[]; bio: string; baseRate: number; availability: string }) => Promise<FieldErrors | null>
  addChannel: (c: { platform: string; handle: string; followers: number }) => Promise<void>
  withdraw: () => Promise<number>
  connectPayouts: () => Promise<void>
  syncPayouts: () => Promise<boolean>
  openPayoutDashboard: () => Promise<void>
  // shared
  markRead: (id: string) => void
  markAllRead: () => Promise<void>
  resetDemo: () => Promise<void>
}

/** What the server has switched on — read from /api/health. */
export interface AppConfig { providers: string[]; ai: boolean; demo: boolean; testFunds: boolean; payments: 'stripe' | 'test' | 'none'; email: boolean }

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [snap, setSnap] = useState<MarketState | null>(null)
  const [config, setConfig] = useState<AppConfig>({ providers: [], ai: false, demo: false, testFunds: false, payments: 'none', email: false })
  const refreshing = useRef<Promise<void> | null>(null)

  const refresh = useCallback(async () => {
    if (refreshing.current) return refreshing.current
    refreshing.current = (async () => {
      try {
        const [{ user: u }, health] = await Promise.all([api<{ user: User | null }>('/auth/me'), api<AppConfig>('/health')])
        setUser(u)
        setConfig({ providers: health.providers ?? [], ai: health.ai, demo: !!health.demo, testFunds: !!health.testFunds, payments: health.payments ?? 'none', email: !!health.email })
        if (u) { setLoading(true); setSnap(await api<MarketState>('/state')) } else setSnap(null)
      } finally {
        setLoading(false)
        setReady(true)
        refreshing.current = null
      }
    })()
    return refreshing.current
  }, [])

  useEffect(() => { void refresh().catch(() => setReady(true)) }, [refresh])

  // Realtime: refetch when the server says something changed for this user.
  useEffect(() => {
    if (!user) return
    const es = new EventSource('/api/events')
    let timer: ReturnType<typeof setTimeout> | undefined
    const onChange = () => { clearTimeout(timer); timer = setTimeout(() => { void refresh() }, 150) }
    es.addEventListener('changed', onChange)
    es.addEventListener('notification', onChange)
    return () => { clearTimeout(timer); es.close() }
  }, [user?.id, refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  const store = useMemo<Store>(() => {
    const { state, me } = normalize(snap)
    const act = async <T,>(fn: () => Promise<T>): Promise<T> => { const r = await fn(); await refresh(); return r }
    const session: Session = user ?? { role: null, name: '', email: '', onboarded: false, theme: 'system', hasPassword: false }

    return {
      ready, loading, user, session, state, me, config, refresh,

      login: async (email, password) => { const r = await api<{ user: User }>('/auth/login', { body: { email, password } }); await refresh(); return r.user },
      signup: async (name, email, password) => { const r = await api<{ user: User }>('/auth/signup', { body: { name, email, password } }); await refresh(); return r.user },
      signOut: async () => { await api('/auth/logout', { body: {} }); setUser(null); setSnap(null) },
      forgotPassword: async email => { await api('/auth/forgot', { body: { email } }) },
      resetPassword: async (token, password) => { await api('/auth/reset', { body: { token, password } }); await refresh() },
      changePassword: (current, password) => withFields(() => api('/auth/password', { body: { current, password } })),

      chooseRole: role => act(() => api('/onboarding/role', { body: { role } })).then(() => undefined),
      setupBrand: input => withFields(() => act(() => api('/onboarding/brand', { body: input }))),
      setupCreator: input => withFields(() => act(() => api('/onboarding/creator', { body: input }))),
      finishOnboarding: () => act(() => api('/onboarding/complete', { body: {} })).then(() => undefined),
      switchRole: role => act(() => api<{ needsOnboarding: boolean }>('/me/switch-role', { body: { role } })),
      updateMe: p => act(() => api('/me', { method: 'PATCH', body: p })).then(() => undefined),

      launchCampaign: d => act(() => api<{ id: string; sourcing: string }>('/campaigns', { body: d })),
      invite: (campaignId, creatorId) => act(() => api(`/campaigns/${campaignId}/invite`, { body: { creatorId } })).then(() => undefined),
      review: (id, decision, note) => act(() => api(`/submissions/${id}/review`, { body: { decision, note } })).then(() => undefined),
      recordMetrics: (id, m) => act(() => api<{ ctr: number; winning: boolean; bonusPaid: boolean }>(`/submissions/${id}/metrics`, { body: m })),
      pickWinner: (id, place) => act(() => api(`/submissions/${id}/winner`, { body: { place } })).then(() => undefined),
      updateBrand: b => withFields(() => act(() => api('/brand', { method: 'PATCH', body: b }))),
      inviteTeammate: (email, role) => withFields(() => act(() => api('/team/invite', { body: { email, role } }))),
      removeTeammate: email => act(() => api(`/team/${encodeURIComponent(email)}`, { method: 'DELETE' })).then(() => undefined),
      topUp: amount => act(() => api('/billing/topup', { body: { amount } })).then(() => undefined),
      checkout: amount => api<{ url: string }>('/billing/checkout', { body: { amount } }).then(r => { window.location.assign(r.url) }),

      respond: (matchId, accept) => act(() => api(`/matches/${matchId}/respond`, { body: { accept } })).then(() => undefined),
      enterContest: id => act(() => api(`/campaigns/${id}/enter`, { body: {} })).then(() => undefined),
      upload: (id, file, meta) => {
        const f = new FormData()
        if (file) f.set('file', file)
        f.set('duration', String(meta.duration))
        if (meta.width) f.set('width', String(meta.width))
        if (meta.height) f.set('height', String(meta.height))
        if (meta.script) f.set('script', meta.script)
        if (meta.frames?.length) f.set('frames', JSON.stringify(meta.frames))
        return act(() => api<{ preflight: PreflightItem[]; issues: number }>(`/submissions/${id}/upload`, { body: f }))
      },
      submit: id => act(() => api(`/submissions/${id}/submit`, { body: {} })).then(() => undefined),
      updateCreator: c => withFields(() => act(() => api('/creator', { method: 'PATCH', body: c }))),
      addChannel: c => act(() => api('/creator/channels', { body: c })).then(() => undefined),
      withdraw: () => act(() => api<{ amount: number }>('/payouts', { body: {} })).then(r => r.amount),
      connectPayouts: () => api<{ url: string }>('/payouts/connect', { body: {} }).then(r => { window.location.assign(r.url) }),
      syncPayouts: () => act(() => api<{ ready: boolean }>('/payouts/sync', { body: {} })).then(r => r.ready),
      openPayoutDashboard: () => api<{ url: string }>('/payouts/dashboard', { body: {} }).then(r => { window.open(r.url, '_blank', 'noopener') }),

      markRead: id => { void api(`/notifications/${id}/read`, { body: {} }).then(refresh) },
      markAllRead: () => act(() => api('/notifications/read-all', { body: {} })).then(() => undefined),
      resetDemo: () => act(() => api('/dev/reset', { body: {} })).then(() => undefined),
    }
  }, [snap, user, ready, loading, config, refresh])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore must be used inside <StoreProvider>')
  return s
}
