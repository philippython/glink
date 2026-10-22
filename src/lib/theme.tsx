import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemePref = 'light' | 'dark' | 'system'
export type Theme = 'light' | 'dark'
const KEY = 'glink.theme'

const systemTheme = (): Theme =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch { /* storage unavailable */ }
  return 'system'
}

interface Ctx { pref: ThemePref; theme: Theme; setPref: (p: ThemePref) => void; toggle: () => void }
const ThemeCtx = createContext<Ctx>({ pref: 'system', theme: 'light', setPref: () => {}, toggle: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(readPref)
  const [sys, setSys] = useState<Theme>(systemTheme)
  const theme: Theme = pref === 'system' ? sys : pref

  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const on = (e: MediaQueryListEvent) => setSys(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p)
    try { localStorage.setItem(KEY, p) } catch { /* ignore */ }
  }, [])

  const toggle = useCallback(() => setPref(theme === 'dark' ? 'light' : 'dark'), [theme, setPref])

  return <ThemeCtx.Provider value={{ pref, theme, setPref, toggle }}>{children}</ThemeCtx.Provider>
}

export const useTheme = () => useContext(ThemeCtx)
