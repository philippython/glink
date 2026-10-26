import { Plus, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { cx } from '../lib/format'

/**
 * Chips with a type-to-search suggestion list. Anything typed can be added too (Enter or comma),
 * and `quick` suggestions show as one-tap chips underneath.
 */
export function TagPicker({ id, value, onChange, suggestions, quick = [], quickLabel = 'Suggested', placeholder = 'Type to search or add your own', invalid }: {
  id?: string; value: string[]; onChange: (v: string[]) => void; suggestions: string[]; quick?: string[]; quickLabel?: string; placeholder?: string; invalid?: boolean
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [navigated, setNavigated] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const chosen = useMemo(() => new Set(value.map(v => v.toLowerCase())), [value])
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase()
    return suggestions.filter(s => !chosen.has(s.toLowerCase()) && (!t || s.toLowerCase().includes(t))).slice(0, 8)
  }, [q, suggestions, chosen])

  const add = (v: string) => {
    const t = v.trim().replace(/,$/, '')
    if (t && !chosen.has(t.toLowerCase())) onChange([...value, t])
    setQ(''); setActive(0)
  }

  return (
    <div ref={box} className="relative" onBlur={e => { if (!box.current?.contains(e.relatedTarget as Node)) { setOpen(false); if (q.trim()) add(q) } }}>
      <div className={cx('flex flex-wrap items-center gap-1.5 rounded-lg border bg-surface px-2 py-1.5 transition focus-within:border-violet', invalid ? 'border-danger' : 'border-line-strong')}>
        {value.map(t => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-tint-violet px-2.5 py-0.5 text-[12.5px] text-fg">
            {t}<button type="button" onClick={() => onChange(value.filter(x => x !== t))} aria-label={`Remove ${t}`} className="text-faint hover:text-fg"><X size={12} /></button>
          </span>
        ))}
        <input id={id} value={q} onFocus={() => setOpen(true)} onChange={e => { setQ(e.target.value); setOpen(true); setActive(0); setNavigated(false) }} autoComplete="off"
          role="combobox" aria-expanded={open && matches.length > 0} aria-autocomplete="list"
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setNavigated(true); setActive(a => Math.min(a + 1, matches.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setNavigated(true); setActive(a => Math.max(a - 1, 0)) }
            else if (e.key === 'Enter' || e.key === ',') {
              // A suggestion chosen with the arrow keys wins; otherwise add exactly what was typed.
              e.preventDefault()
              add(navigated && open && matches[active] ? matches[active] : q)
              setNavigated(false)
            }
            else if (e.key === 'Backspace' && !q && value.length) onChange(value.slice(0, -1))
            else if (e.key === 'Escape') setOpen(false)
          }}
          className="h-7 min-w-[160px] flex-1 bg-transparent px-1 text-[14px] text-fg outline-none placeholder:text-faint" placeholder={value.length ? 'Add another' : placeholder} />
      </div>
      {open && matches.length > 0 && (
        <ul role="listbox" className="card absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-xl p-1 shadow-[0_16px_40px_-16px_rgb(0_0_0/0.25)]">
          {matches.map((m, i) => (
            <li key={m} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => add(m)} onMouseEnter={() => setActive(i)}
                className={cx('flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13.5px]', i === active ? 'bg-subtle text-fg' : 'text-muted')}>
                <Plus size={13} className="text-violet" />{m}
              </button>
            </li>
          ))}
          {q.trim() && !suggestions.some(s => s.toLowerCase() === q.trim().toLowerCase()) && (
            <li className="border-t border-line px-3 py-2 text-[12.5px] text-faint">Press Enter to add “{q.trim()}”</li>
          )}
        </ul>
      )}
      {quick.filter(s => !chosen.has(s.toLowerCase())).length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] text-faint">{quickLabel}:</span>
          {quick.filter(s => !chosen.has(s.toLowerCase())).slice(0, 8).map(s => (
            <button key={s} type="button" onClick={() => add(s)} className="inline-flex items-center gap-1 rounded-full border border-line-strong px-2.5 py-0.5 text-[12px] text-muted transition hover:border-violet hover:text-fg">
              <Plus size={11} />{s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
