import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { spring } from '../../design/motion'
import { cn } from '../../lib/cn'

interface SheetProps {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
  /** Encabezado fijo (no scrollea) */
  header?: ReactNode
  /** Pie fijo (botones) */
  footer?: ReactNode
  tall?: boolean
  className?: string
}

let locks = 0
function lockScroll() {
  locks++
  document.documentElement.style.overflow = 'hidden'
  return () => {
    locks--
    if (locks <= 0) {
      locks = 0
      document.documentElement.style.overflow = ''
    }
  }
}

export function Sheet(props: SheetProps) {
  return createPortal(<AnimatePresence>{props.open && <SheetPanel {...props} />}</AnimatePresence>, document.body)
}

function SheetPanel({ onClose, label, children, header, footer, tall, className }: SheetProps) {
  const controls = useDragControls()

  useEffect(() => lockScroll(), [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="presentation">
      <motion.div
        className="absolute inset-0"
        style={{ background: 'var(--scrim)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          'relative flex w-full max-w-xl flex-col overflow-hidden rounded-t-[28px] border-t border-line bg-bg-elevated shadow-2',
          tall ? 'h-[92dvh]' : 'max-h-[92dvh]',
          className,
        )}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={spring.sheet}
        drag="y"
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.02, bottom: 0.9 }}
        onDragEnd={onDragEnd}
      >
        <div
          className="shrink-0 touch-none cursor-grab px-5 pt-2.5 active:cursor-grabbing"
          onPointerDown={(e) => controls.start(e)}
        >
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line-strong" aria-hidden />
          {header}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer && <div className="shrink-0 border-t border-line px-5 pt-3 pb-safe">{footer}</div>}
        {!footer && <div className="pb-safe shrink-0" />}
      </motion.div>
    </div>
  )
}
