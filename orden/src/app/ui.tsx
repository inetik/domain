import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ls } from '../lib/device'
import type { RoomId } from '../db/types'

export type ThemePref = 'system' | 'light' | 'dark'

export interface ToastData {
  id: number
  message: string
  tone?: 'default' | 'success' | 'warn'
  action?: { label: string; onClick: () => void }
}

export interface QuickAddPrefill {
  room?: RoomId
  listId?: string
  text?: string
  /** Distinto en cada apertura (reinicia el formulario) */
  nonce?: number
}

export interface Celebration {
  room: RoomId | 'casa'
  at: number
}

interface UI {
  celebration: Celebration | null
  celebrate: (room: RoomId | 'casa') => void
  clearCelebration: () => void
  taskId: string | null
  openTask: (id: string) => void
  closeTask: () => void
  quickAdd: QuickAddPrefill | null
  openQuickAdd: (prefill?: QuickAddPrefill) => void
  closeQuickAdd: () => void
  suggestOpen: boolean
  setSuggestOpen: (open: boolean) => void
  toast: ToastData | null
  showToast: (t: Omit<ToastData, 'id'>) => void
  dismissToast: () => void
  theme: ThemePref
  resolvedTheme: 'light' | 'dark'
  setTheme: (t: ThemePref) => void
  scene3d: boolean
  setScene3d: (on: boolean) => void
  installGuide: boolean
  setInstallGuide: (open: boolean) => void
}

const UIContext = createContext<UI | null>(null)

function systemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/**
 * En iPhone el teclado solo se abre si el foco ocurre dentro del toque del usuario.
 * Enfocamos un input temporal en el mismo toque y después le pasamos el foco al real.
 */
export function primeKeyboard() {
  const proxy = document.createElement('input')
  proxy.setAttribute('aria-hidden', 'true')
  proxy.style.cssText = 'position:fixed;top:0;left:0;opacity:0;height:0;font-size:16px;pointer-events:none'
  proxy.id = 'orden-keyboard-proxy'
  document.body.appendChild(proxy)
  proxy.focus()
  setTimeout(() => proxy.remove(), 1500)
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [taskId, setTaskId] = useState<string | null>(null)
  const [quickAdd, setQuickAdd] = useState<QuickAddPrefill | null>(null)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [installGuide, setInstallGuide] = useState(false)
  const [toast, setToast] = useState<ToastData | null>(null)
  const [celebration, setCelebration] = useState<Celebration | null>(null)
  const celebrate = useCallback((room: RoomId | 'casa') => setCelebration({ room, at: Date.now() }), [])
  const clearCelebration = useCallback(() => setCelebration(null), [])
  const [theme, setThemeState] = useState<ThemePref>(() => (ls.get('orden:theme') as ThemePref) || 'system')
  const [sys, setSys] = useState<'light' | 'dark'>(systemTheme)
  const [scene3d, setScene3dState] = useState(() => ls.get('orden:3d') !== 'off')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => setSys(mq.matches ? 'light' : 'dark')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolvedTheme = theme === 'system' ? sys : theme

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', resolvedTheme === 'light' ? '#f4f2ec' : '#0b0b10')
  }, [resolvedTheme])

  const setTheme = useCallback((t: ThemePref) => {
    ls.set('orden:theme', t)
    setThemeState(t)
  }, [])

  const setScene3d = useCallback((on: boolean) => {
    ls.set('orden:3d', on ? 'on' : 'off')
    setScene3dState(on)
  }, [])

  const showToast = useCallback((t: Omit<ToastData, 'id'>) => {
    clearTimeout(toastTimer.current)
    setToast({ ...t, id: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), t.action ? 5000 : 3000)
  }, [])

  const dismissToast = useCallback(() => {
    clearTimeout(toastTimer.current)
    setToast(null)
  }, [])

  const value = useMemo<UI>(
    () => ({
      celebration,
      celebrate,
      clearCelebration,
      taskId,
      openTask: (id) => setTaskId(id),
      closeTask: () => setTaskId(null),
      quickAdd,
      openQuickAdd: (prefill) => {
        primeKeyboard()
        setQuickAdd({ ...prefill, nonce: Date.now() })
      },
      closeQuickAdd: () => setQuickAdd(null),
      suggestOpen,
      setSuggestOpen,
      toast,
      showToast,
      dismissToast,
      theme,
      resolvedTheme,
      setTheme,
      scene3d,
      setScene3d,
      installGuide,
      setInstallGuide,
    }),
    [celebration, celebrate, clearCelebration, taskId, quickAdd, suggestOpen, toast, showToast, dismissToast, theme, resolvedTheme, setTheme, scene3d, setScene3d, installGuide],
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI(): UI {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI fuera de UIProvider')
  return ctx
}
