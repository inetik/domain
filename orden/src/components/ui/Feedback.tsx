import { AnimatePresence, motion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useUI } from '../../app/ui'
import { spring } from '../../design/motion'
import { cn } from '../../lib/cn'

export function Toaster() {
  const { toast, dismissToast } = useUI()
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[78] flex justify-center px-4" style={{ bottom: 'calc(max(var(--sab), 12px) + 92px)' }} aria-live="polite">
      <AnimatePresence mode="popLayout">
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            initial={{ y: 24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.98 }}
            transition={spring.snappy}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => Math.abs(info.offset.x) > 80 && dismissToast()}
            className="glass pointer-events-auto flex min-h-12 w-full max-w-md items-center gap-3 rounded-2xl border border-line py-2 pr-2 pl-4 shadow-2"
          >
            <span
              className={cn('size-2 shrink-0 rounded-full', toast.tone === 'warn' ? 'bg-warn' : toast.tone === 'success' ? 'bg-success' : 'bg-accent')}
              aria-hidden
            />
            <span className="min-w-0 flex-1 text-callout text-ink">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="h-10 shrink-0 rounded-xl px-3 text-callout font-semibold text-accent-text"
                onClick={() => {
                  toast.action!.onClick()
                  dismissToast()
                }}
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  body?: string
  action?: ReactNode
  color?: string
}

export function EmptyState({ icon: Icon, title, body, action, color = 'var(--accent-stroke)' }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.gentle}
      className="flex flex-col items-center px-6 pt-6 pb-4 text-center"
    >
      <motion.div
        className="relative mb-5 flex size-20 items-center justify-center rounded-[28px] border border-line bg-surface-1"
        animate={{ rotate: [0, -4, 4, 0] }}
        transition={{ duration: 3, repeat: 1, ease: 'easeInOut' }}
      >
        <div className="absolute inset-0 rounded-[28px] opacity-30 blur-xl" style={{ background: color }} aria-hidden />
        <Icon className="relative size-8" style={{ color }} strokeWidth={1.75} />
      </motion.div>
      <h3 className="text-headline font-semibold text-ink">{title}</h3>
      {body && <p className="mt-1.5 max-w-xs text-callout text-ink-2">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-surface-1', className)} aria-hidden>
      <motion.div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(90deg, transparent, var(--surface-2), transparent)' }}
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  id,
  className,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  id: string
  className?: string
}) {
  return (
    <div role="radiogroup" className={cn('relative flex rounded-2xl bg-surface-2 p-1', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn('relative h-10 flex-1 rounded-xl px-3 text-footnote font-medium transition-colors', active ? 'text-ink' : 'text-ink-3')}
          >
            {active && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-xl bg-surface-1 shadow-1" transition={spring.snappy} />}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-caption font-semibold tracking-[0.08em] text-ink-3 uppercase">{children}</h2>
      {action}
    </div>
  )
}
