import { useStore } from '../data/store'
import { cx } from '../lib/format'

export type Provider = 'google' | 'apple' | 'facebook'

const LABEL: Record<Provider, string> = { google: 'Google', apple: 'Apple', facebook: 'Facebook' }

function Icon({ p }: { p: Provider }) {
  if (p === 'google') return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9L6.4 14Z" />
      <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5L6.4 10C7.2 7.8 9.4 6 12 6Z" />
    </svg>
  )
  if (p === 'apple') return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7a4.6 4.6 0 0 0-3.6-1.9c-1.5-.2-3 .9-3.7.9-.8 0-2-.9-3.3-.9a4.9 4.9 0 0 0-4.1 2.5c-1.8 3.1-.5 7.6 1.2 10.1.9 1.2 1.9 2.6 3.2 2.5 1.3 0 1.8-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.3-1.2 3.1-2.5a10 10 0 0 0 1.4-2.9 4.4 4.4 0 0 1-2.9-4.1ZM14 5.4A4.3 4.3 0 0 0 15 2.2a4.5 4.5 0 0 0-2.9 1.5 4.1 4.1 0 0 0-1 3.1A3.7 3.7 0 0 0 14 5.4Z" /></svg>
  )
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4h-3V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12Z" /></svg>
  )
}

/**
 * "Continue with Google / Apple / Facebook". The same buttons sign up and log in.
 * `next` is where to land after a first sign-up (e.g. /onboarding?as=creator).
 */
export function SocialButtons({ next }: { next?: string }) {
  const { config } = useStore()
  const all: Provider[] = ['google', 'apple', 'facebook']
  // In production only configured providers appear; in development the rest show as disabled.
  const shown = all.filter(p => config.providers.includes(p) || import.meta.env.DEV)
  if (shown.length === 0) return null
  const q = next ? `?next=${encodeURIComponent(next)}` : ''
  return (
    <div className="space-y-2">
      {shown.map(p => {
        const on = config.providers.includes(p)
        const cls = cx('inline-flex h-[38px] w-full items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface text-[13.5px] font-medium text-fg transition-colors',
          on ? 'hover:bg-subtle' : 'cursor-not-allowed opacity-45')
        return on
          ? <a key={p} href={`/api/auth/oauth/${p}/start${q}`} className={cls}><Icon p={p} />Continue with {LABEL[p]}</a>
          : <span key={p} className={cls} title={`Add the ${LABEL[p]} keys to .env to turn this on`} aria-disabled><Icon p={p} />Continue with {LABEL[p]}</span>
      })}
      {import.meta.env.DEV && shown.some(p => !config.providers.includes(p)) && (
        <p className="text-center text-[11.5px] text-faint">Greyed-out providers need their keys in <code>.env</code> (see .env.example).</p>
      )}
    </div>
  )
}
