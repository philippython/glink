import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell, Briefcase, ClipboardCheck, CreditCard, Home, LineChart, LogOut, Megaphone, Menu, Settings, Sparkles, User, Users, Wallet, X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import type { Role } from '../data/market'
import { useStore } from '../data/store'
import { cx } from '../lib/format'
import { Loading, ThemeSwitch } from './kit'
import { Logo } from './Logo'

interface Item { to: string; label: string; icon: LucideIcon; badge?: number; end?: boolean }

function useNav(role: Role): { main: Item[]; secondary: Item[] } {
  const { state } = useStore()
  const unread = state.notifications.filter(n => n.to === role && !n.read).length
  if (role === 'brand') {
    const toReview = state.submissions.filter(s => s.status === 'submitted').length
    return {
      main: [
        { to: '/brand', label: 'Home', icon: Home, end: true },
        { to: '/brand/campaigns', label: 'Campaigns', icon: Megaphone },
        { to: '/brand/creators', label: 'Creators', icon: Users },
        { to: '/brand/reviews', label: 'Reviews', icon: ClipboardCheck, badge: toReview },
        { to: '/brand/performance', label: 'Performance', icon: LineChart },
        { to: '/brand/billing', label: 'Billing', icon: CreditCard },
      ],
      secondary: [
        { to: '/brand/notifications', label: 'Notifications', icon: Bell, badge: unread },
        { to: '/brand/settings', label: 'Settings', icon: Settings },
        { to: '/brand/team', label: 'Team', icon: Users },
      ],
    }
  }
  const newMatches = state.matches.filter(m => m.status === 'invited').length
  return {
    main: [
      { to: '/creator', label: 'Home', icon: Home, end: true },
      { to: '/creator/opportunities', label: 'Opportunities', icon: Sparkles, badge: newMatches },
      { to: '/creator/work', label: 'My Work', icon: Briefcase },
      { to: '/creator/performance', label: 'Performance', icon: LineChart },
      { to: '/creator/earnings', label: 'Earnings', icon: Wallet },
    ],
    secondary: [
      { to: '/creator/notifications', label: 'Notifications', icon: Bell, badge: unread },
      { to: '/creator/settings', label: 'Settings', icon: Settings },
      { to: '/creator/profile', label: 'Profile', icon: User },
    ],
  }
}

function NavItem({ item, onClick }: { item: Item; onClick?: () => void }) {
  return (
    <NavLink to={item.to} end={item.end} onClick={onClick}
      className={({ isActive }) => cx('flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors',
        isActive ? 'bg-subtle font-medium text-fg' : 'text-muted hover:text-fg')}>
      <item.icon size={16} strokeWidth={1.75} />
      <span className="flex-1">{item.label}</span>
      {!!item.badge && <span className="min-w-5 rounded-full bg-primary px-1.5 text-center text-[11px] font-medium leading-5 text-on-primary">{item.badge}</span>}
    </NavLink>
  )
}

function SidebarBody({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const { main, secondary } = useNav(role)
  const { signOut } = useStore()
  const navigate = useNavigate()
  return (
    <>
      <NavLink to={`/${role}`} onClick={onNavigate} className="mb-8 flex items-center gap-2.5 px-3">
        <Logo size={28} />
        <span className="text-[16px] font-semibold tracking-tight text-fg">Glink</span>
      </NavLink>
      <nav className="flex flex-col gap-0.5" aria-label="Main">{main.map(i => <NavItem key={i.to} item={i} onClick={onNavigate} />)}</nav>
      <div className="my-5 border-t border-line" />
      <nav className="flex flex-col gap-0.5" aria-label="Account">
        {secondary.map(i => <NavItem key={i.to} item={i} onClick={onNavigate} />)}
        <button onClick={() => { void signOut().then(() => navigate('/login')) }}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-[13.5px] text-muted transition-colors hover:text-fg">
          <LogOut size={16} strokeWidth={1.75} /> Log out
        </button>
      </nav>
      <div className="mt-auto px-1 pt-6"><ThemeSwitch /></div>
    </>
  )
}

export function Shell({ role }: { role: Role }) {
  const { session, ready, user, loading, state, me } = useStore()
  const location = useLocation()
  const [drawer, setDrawer] = useState(false)
  const { main } = useNav(role)

  useEffect(() => { window.scrollTo({ top: 0 }); setDrawer(false) }, [location.pathname])

  if (!ready) return <div className="grid min-h-screen place-items-center bg-bg"><Loading /></div>
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  if (!session.role) return <Navigate to="/onboarding" replace />
  if (!session.onboarded) return <Navigate to="/onboarding" replace />
  if (session.role !== role) return <Navigate to={`/${session.role}`} replace />

  return (
    <div className="min-h-screen bg-bg">
      <aside className="fixed inset-y-0 left-0 hidden w-[232px] flex-col border-r border-line bg-bg px-3 py-6 md:flex">
        <SidebarBody role={role} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg px-4 md:hidden">
        <div className="flex items-center gap-2"><Logo size={26} /><span className="font-semibold text-fg">Glink</span></div>
        <button onClick={() => setDrawer(true)} className="grid h-9 w-9 place-items-center rounded-lg text-fg hover:bg-subtle" aria-label="Open menu"><Menu size={18} /></button>
      </header>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/40 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-line bg-bg px-3 py-6 md:hidden"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', bounce: 0, duration: 0.35 }}>
              <button onClick={() => setDrawer(false)} className="absolute right-3 top-5 grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-subtle" aria-label="Close menu"><X size={16} /></button>
              <SidebarBody role={role} onNavigate={() => setDrawer(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="px-5 pb-28 pt-8 md:ml-[232px] md:px-10 md:pb-16 md:pt-[52px] xl:px-[72px]">
        <div className="mx-auto max-w-[1120px]">
          {loading && !(role === 'brand' ? state.brand.id : me.id) ? <Loading /> : (
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              <Outlet />
            </motion.div>
          )}
        </div>
      </main>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-bg md:hidden" style={{ gridTemplateColumns: `repeat(${Math.min(main.length, 5)}, 1fr)` }} aria-label="Tabs">
        {main.slice(0, 5).map(i => (
          <NavLink key={i.to} to={i.to} end={i.end}
            className={({ isActive }) => cx('relative flex flex-col items-center gap-0.5 py-2 text-[10.5px]', isActive ? 'text-fg' : 'text-faint')}>
            <i.icon size={18} strokeWidth={1.75} />
            {i.label}
            {!!i.badge && <span className="absolute right-[calc(50%-18px)] top-1 h-2 w-2 rounded-full bg-primary" />}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
