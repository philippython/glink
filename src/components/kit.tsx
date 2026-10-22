// Design-system components for the marketplace screens (see index.css tokens).
// Flat, editorial, monochrome — colour only for status.

import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Check, ChevronRight, Loader2, Moon, Sun, X } from 'lucide-react'
import {
  createContext, useCallback, useContext, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode,
  type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react'
import { Link } from 'react-router-dom'
import { cx } from '../lib/format'
import { useTheme } from '../lib/theme'

// ─── Page structure ─────────────────────────────────────────────────────────

export function PageHeader({ title, subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: { to: string; label: string } }) {
  return (
    <div className="mb-10">
      {back && <Link to={back.to} className="mb-5 inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg">← {back.label}</Link>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="title-serif text-[34px] leading-[1.15] text-fg md:text-[40px]">{title}</h1>
          {subtitle && <div className="mt-2 text-[15px] text-muted">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export const Label = ({ children, className }: { children: ReactNode; className?: string }) =>
  <div className={cx('label-caps', className)}>{children}</div>

export function SectionHead({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h2 className="title-serif text-[24px] text-fg">{title}</h2>
      {action}
    </div>
  )
}

export function Panel({ children, className, pad = true, as = 'div' }: { children: ReactNode; className?: string; pad?: boolean; as?: 'div' | 'section' }) {
  const C = as
  return <C className={cx('card rounded-xl', pad && 'p-6', className)}>{children}</C>
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="card rounded-xl px-5 py-5">
      <Label>{label}</Label>
      <div className="title-serif mt-3 text-[34px] leading-none text-fg md:text-[38px]">{value}</div>
      {sub && <div className="mt-2 text-[12.5px] text-muted">{sub}</div>}
    </div>
  )
}

export const StatRow = ({ children, cols = 4 }: { children: ReactNode; cols?: 3 | 4 | 6 }) => (
  <div className={cx('grid grid-cols-2 gap-3', cols === 3 && 'lg:grid-cols-3', cols === 4 && 'lg:grid-cols-4', cols === 6 && 'md:grid-cols-3 xl:grid-cols-6', 'max-[420px]:grid-cols-1')}>{children}</div>
)

/** A label/value row used in summaries (Goal, Market, Deliverables, Deadline). */
export function KV({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-4 border-b border-line py-3 text-[14px] last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-fg">{children}</span>
    </div>
  )
}

export function ListRow({ children, to, onClick }: { children: ReactNode; to?: string; onClick?: () => void }) {
  const cls = 'flex items-center gap-4 border-b border-line px-5 py-4 last:border-0 transition-colors'
  if (to) return <Link to={to} className={cx(cls, 'hover:bg-subtle')}>{children}<ChevronRight size={16} className="shrink-0 text-faint" /></Link>
  if (onClick) return <button onClick={onClick} className={cx(cls, 'w-full text-left hover:bg-subtle')}>{children}</button>
  return <div className={cls}>{children}</div>
}

// ─── Buttons ────────────────────────────────────────────────────────────────

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'brand'
const btn = (variant: BtnVariant, size: 'md' | 'sm') => cx(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap',
  size === 'md' ? 'h-[38px] px-4 text-[13.5px]' : 'h-8 px-3 text-[13px]',
  variant === 'primary' && 'bg-primary text-on-primary hover:opacity-90',
  variant === 'secondary' && 'border border-line-strong bg-surface text-fg hover:bg-subtle',
  variant === 'danger' && 'border border-line-strong bg-surface text-danger hover:bg-danger-bg',
  variant === 'ghost' && 'text-muted hover:bg-subtle hover:text-fg',
  variant === 'brand' && 'btn-brand',
)

export function Button({ variant = 'primary', size = 'md', loading, className, children, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'md' | 'sm'; loading?: boolean }) {
  return (
    <button {...rest} disabled={rest.disabled || loading} className={cx(btn(variant, size), className)}>
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}

export function LinkButton({ to, variant = 'primary', size = 'md', className, children }: { to: string; variant?: BtnVariant; size?: 'md' | 'sm'; className?: string; children: ReactNode }) {
  return <Link to={to} className={cx(btn(variant, size), className)}>{children}</Link>
}

// ─── Pills, chips, bars ─────────────────────────────────────────────────────

export type Tone = 'success' | 'danger' | 'warn' | 'neutral'
export function Pill({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium',
      tone === 'success' && 'bg-success-bg text-success',
      tone === 'danger' && 'bg-danger-bg text-danger',
      tone === 'warn' && 'bg-warn-bg text-warn',
      tone === 'neutral' && 'bg-subtle text-muted', className)}>
      {children}
    </span>
  )
}

export const Chip = ({ children }: { children: ReactNode }) =>
  <span className="inline-flex items-center rounded-full border border-line px-2.5 py-0.5 text-[12px] text-muted">{children}</span>

export function StrengthBar({ label, value, compact }: { label: string; value: number; compact?: boolean }) {
  return (
    <div className={cx('grid items-center gap-3', compact ? 'grid-cols-[64px_1fr_24px] text-[12px]' : 'grid-cols-[150px_1fr_32px] text-[13.5px]')}>
      <span className="text-muted">{label}</span>
      <div className={cx('overflow-hidden rounded-full bg-track', compact ? 'h-1' : 'h-[5px]')}>
        <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      <span className="text-right tabular-nums text-fg">{value}</span>
    </div>
  )
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-1 overflow-hidden rounded-full bg-track">
      <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${Math.min(100, value)}%` }} transition={{ duration: 0.8 }} />
    </div>
  )
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div className="grid shrink-0 place-items-center rounded-full border border-line bg-subtle font-medium text-fg"
      style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden>
      {name.trim().charAt(0).toUpperCase()}
    </div>
  )
}

// ─── Forms ──────────────────────────────────────────────────────────────────

export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-fg">{label}</label>
      {children}
      {error ? <div className="text-[12.5px] text-danger">{error}</div> : hint ? <div className="text-[12.5px] text-faint">{hint}</div> : null}
    </div>
  )
}

const inputCls = (invalid?: boolean) => cx(
  'w-full rounded-lg border bg-surface px-3 text-[14px] text-fg outline-none transition placeholder:text-faint focus:border-fg',
  invalid ? 'border-danger' : 'border-line-strong',
)

export const Input = ({ invalid, className, ...p }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) =>
  <input {...p} aria-invalid={invalid || undefined} className={cx(inputCls(invalid), 'h-[38px]', className)} />

export const Textarea = ({ invalid, className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) =>
  <textarea {...p} aria-invalid={invalid || undefined} className={cx(inputCls(invalid), 'min-h-[88px] py-2.5', className)} />

export const Select = ({ invalid, className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) =>
  <select {...p} aria-invalid={invalid || undefined} className={cx(inputCls(invalid), 'h-[38px] pr-8', className)}>{children}</select>

/** Single choice shown as tiles; selected = 2px dark outline, not a fill. */
export function Segmented<T extends string>({ options, value, onChange, cols = 4 }: { options: { value: T; label: string; hint?: string }[]; value: T; onChange: (v: T) => void; cols?: 2 | 3 | 4 }) {
  return (
    <div role="radiogroup" className={cx('grid gap-2', cols === 2 && 'grid-cols-2', cols === 3 && 'grid-cols-3', cols === 4 && 'grid-cols-2 sm:grid-cols-4')}>
      {options.map(o => {
        const on = o.value === value
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={cx('rounded-lg bg-surface px-3 py-2.5 text-left text-[13.5px] transition',
              on ? 'text-fg outline-2 outline-fg [outline-style:solid] border border-transparent' : 'border border-line-strong text-muted hover:text-fg')}>
            <div className="font-medium">{o.label}</div>
            {o.hint && <div className="mt-0.5 text-[12px] text-faint">{o.hint}</div>}
          </button>
        )
      })}
    </div>
  )
}

/** Editable list (Must include / Avoid / Story flow). */
export function ListEditor({ items, onChange, placeholder, tone, ordered }: { items: string[]; onChange: (v: string[]) => void; placeholder: string; tone?: 'success' | 'danger'; ordered?: boolean }) {
  const [draft, setDraft] = useState('')
  const add = () => { const v = draft.trim(); if (v) { onChange([...items, v]); setDraft('') } }
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= items.length) return
    const next = [...items]; [next[i], next[j]] = [next[j], next[i]]; onChange(next)
  }
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[13.5px]">
          {ordered ? <span className="w-5 text-faint">{i + 1}.</span>
            : tone === 'success' ? <Check size={14} className="text-success" /> : <X size={14} className="text-danger" />}
          <span className="flex-1 text-fg">{it}</span>
          {ordered && (
            <>
              <button type="button" onClick={() => move(i, -1)} className="px-1 text-faint hover:text-fg" aria-label={`Move ${it} up`}>↑</button>
              <button type="button" onClick={() => move(i, 1)} className="px-1 text-faint hover:text-fg" aria-label={`Move ${it} down`}>↓</button>
            </>
          )}
          <button type="button" onClick={() => onChange(items.filter((_, k) => k !== i))} className="px-1 text-faint hover:text-danger" aria-label={`Remove ${it}`}><X size={13} /></button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder={placeholder}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
        <Button type="button" variant="secondary" onClick={add}>+ Add</Button>
      </div>
    </div>
  )
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="mb-5 flex gap-2.5 rounded-lg bg-danger-bg px-4 py-3 text-[13.5px] text-danger">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

// ─── States ─────────────────────────────────────────────────────────────────

export const Spinner = ({ size = 18 }: { size?: number }) => <Loader2 size={size} className="animate-spin text-muted" />

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div className="grid place-items-center gap-3 py-16 text-[13.5px] text-muted"><Spinner />{label}</div>
}

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-4 px-6 py-12 text-center">
      <div className="text-[14px] text-muted">{text}</div>
      {action}
    </div>
  )
}

// ─── Theme switch (sidebar) ─────────────────────────────────────────────────

export function ThemeSwitch() {
  const { theme, setPref } = useTheme()
  return (
    <div className="grid grid-cols-2 rounded-lg border border-line p-0.5 text-[12.5px]" role="radiogroup" aria-label="Theme">
      {(['light', 'dark'] as const).map(t => (
        <button key={t} role="radio" aria-checked={theme === t} onClick={() => setPref(t)}
          className={cx('flex items-center justify-center gap-1.5 rounded-md py-1.5 capitalize transition-colors',
            theme === t ? 'bg-subtle text-fg' : 'text-faint hover:text-fg')}>
          {t === 'light' ? <Sun size={13} /> : <Moon size={13} />}{t}
        </button>
      ))}
    </div>
  )
}

// ─── Toasts ─────────────────────────────────────────────────────────────────

const ToastCtx = createContext<(msg: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([])
  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random()
    setItems(x => [...x, { id, msg }])
    setTimeout(() => setItems(x => x.filter(i => i.id !== id)), 3200)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-20 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-6" aria-live="polite">
        <AnimatePresence>
          {items.map(t => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[13.5px] text-on-primary shadow-lg">
              <Check size={14} />{t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
