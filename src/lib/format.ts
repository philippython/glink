export const money = (n: number, digits = 0) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export const compact = (n: number) =>
  Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

export const pct = (n: number, digits = 1) => `${n.toFixed(digits)}%`

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

// Chart series (monochrome).
export const SERIES = ['var(--g0)', 'var(--g7)'] as const
// Monochrome theme: series 2+ also get a dash pattern so they never rely on lightness alone.
export const DASH = [undefined, '5 4'] as const

export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to + 'T00:00:00') - Date.parse(from + 'T00:00:00')) / 86_400_000)

export const shortDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

/** Theme-safe translucent colour: works with CSS variables, unlike hex+alpha suffixes. */
export const mix = (color: string, pct: number) => `color-mix(in oklab, ${color} ${pct}%, transparent)`

/** One date format everywhere: "Oct 20, 2026". */
export const fmtDate = (iso: string) =>
  new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`
  return fmtDate(iso)
}

export const greeting = (d = new Date()) => (d.getHours() < 12 ? 'Good morning' : d.getHours() < 18 ? 'Good afternoon' : 'Good evening')

export const pluralize = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
