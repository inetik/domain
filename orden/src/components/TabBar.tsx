import { Activity, House, LayoutGrid, ListChecks, Plus } from 'lucide-react'
import { motion } from 'motion/react'
import { navigate } from '../app/router'
import { useUI } from '../app/ui'
import { spring } from '../design/motion'
import { haptic } from '../lib/haptics'
import { cn } from '../lib/cn'

type Tab = 'casa' | 'pendientes' | 'listas' | 'registro'

const TABS: { id: Tab; label: string; icon: typeof House; to: string }[] = [
  { id: 'casa', label: 'Casa', icon: House, to: '/' },
  { id: 'pendientes', label: 'Pendientes', icon: ListChecks, to: '/pendientes' },
  { id: 'listas', label: 'Listas', icon: LayoutGrid, to: '/listas' },
  { id: 'registro', label: 'Registro', icon: Activity, to: '/registro' },
]

export function TabBar({ active, badge }: { active: Tab | null; badge?: number }) {
  const { openQuickAdd } = useUI()
  const left = TABS.slice(0, 2)
  const right = TABS.slice(2)

  const renderTab = (t: (typeof TABS)[number]) => {
    const isActive = active === t.id
    const Icon = t.icon
    return (
      <button
        key={t.id}
        type="button"
        onClick={() => {
          haptic()
          navigate(t.to)
        }}
        aria-current={isActive ? 'page' : undefined}
        data-testid={`tab-${t.id}`}
        className={cn('relative flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-medium', isActive ? 'text-ink' : 'text-ink-3')}
      >
        {isActive && <motion.span layoutId="tab-pill" className="absolute inset-1 rounded-[14px] bg-surface-3/70" transition={spring.snappy} />}
        <span className="relative">
          <Icon className="size-[22px]" strokeWidth={isActive ? 2.2 : 1.8} />
          {t.id === 'pendientes' && !!badge && (
            <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink tabular">
              {badge}
            </span>
          )}
        </span>
        <span className="relative">{t.label}</span>
      </button>
    )
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-safe" aria-label="Secciones">
      <div className="glass mx-auto flex max-w-xl items-center gap-1 rounded-[26px] border border-line p-1.5 shadow-2">
        {left.map(renderTab)}
        <div className="flex flex-1 justify-center">
          <motion.button
            type="button"
            aria-label="Nuevo pendiente"
            data-testid="fab-add"
            onClick={() => {
              haptic()
              openQuickAdd()
            }}
            whileTap={{ scale: 0.88, rotate: 90 }}
            transition={spring.bouncy}
            className="flex size-14 items-center justify-center rounded-[20px] bg-accent text-accent-ink shadow-glow"
          >
            <Plus className="size-7" strokeWidth={2.5} />
          </motion.button>
        </div>
        {right.map(renderTab)}
      </div>
    </nav>
  )
}
