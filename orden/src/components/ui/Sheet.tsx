import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
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

/**
 * En iPhone el teclado tapa la parte de abajo de la pantalla sin achicar el layout:
 * medimos el visualViewport para subir la hoja y que los botones queden a la vista.
 */
function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)))
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
  return inset
}

function SheetPanel({ onClose, label, children, header, footer, tall, className }: SheetProps) {
  const controls = useDragControls()
  const keyboard = useKeyboardInset()
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    // Si adentro algo ya pide el foco (p. ej. el campo de carga rápida), se lo dejamos
    const t = setTimeout(() => {
      if (!panel.current?.contains(document.activeElement)) panel.current?.focus({ preventScroll: true })
    }, 80)
    return () => {
      clearTimeout(t)
      if (previous?.isConnected && previous.id !== 'orden-keyboard-proxy') previous.focus({ preventScroll: true })
    }
  }, [])

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
    <div className="fixed inset-x-0 top-0 z-50 flex items-end justify-center" style={{ bottom: keyboard }} role="presentation">
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
        ref={panel}
        tabIndex={-1}
        onKeyDown={(e) => {
          // Mantener el foco del teclado dentro de la hoja
          if (e.key !== 'Tab' || !panel.current) return
          const items = panel.current.querySelectorAll<HTMLElement>('button:not([disabled]), input, textarea, select, [href], [tabindex]:not([tabindex="-1"])')
          if (!items.length) return
          const first = items[0]
          const last = items[items.length - 1]
          if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
            e.preventDefault()
            last.focus()
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }}
        className={cn(
          'relative flex w-full max-w-xl flex-col overflow-hidden rounded-t-[28px] border-t border-line bg-bg-elevated shadow-2 outline-none',
          tall ? 'h-[92%]' : 'max-h-[92%]',
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
        <div className="shrink-0 touch-none cursor-grab px-5 pt-2.5 active:cursor-grabbing" onPointerDown={(e) => controls.start(e)}>
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line-strong" aria-hidden />
          {header}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer && <div className="shrink-0 border-t border-line bg-bg-elevated px-5 pt-3 pb-safe">{footer}</div>}
        {!footer && <div className="pb-safe shrink-0" />}
      </motion.div>
    </div>
  )
}
