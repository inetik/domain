import { ArrowUpRight, Box, Plus, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { useData } from '../../app/data'
import { navigate } from '../../app/router'
import { useUI } from '../../app/ui'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import { AnimatedNumber } from '../../components/ui/AnimatedNumber'
import { Button, IconButton } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Feedback'
import { ProgressRing } from '../../components/ui/ProgressRing'
import { ROOM_IDS, type RoomId } from '../../db/types'
import { spring } from '../../design/motion'
import { formatMinutes, plural, ROOMS } from '../../lib/catalog'
import { hasWebGL } from '../../lib/device'
import { haptic } from '../../lib/haptics'
import { isActive, orderIndex, roomSummary } from '../../lib/stats'
import { HouseFallback } from './HouseFallback'
import type { RoomCounts } from './layout'

const HouseScene = lazy(() => import('./HouseScene'))

const webgl = typeof document !== 'undefined' && hasWebGL()

export function HouseCard() {
  const { tasks } = useData()
  const { resolvedTheme, scene3d, openQuickAdd } = useUI()
  const reduced = useReducedMotion()
  const [selected, setSelected] = useState<RoomId | null>(null)

  const counts = useMemo(() => {
    const out = {} as Record<RoomId, RoomCounts>
    for (const id of ROOM_IDS) {
      const s = roomSummary(tasks, id)
      const urgent = tasks.filter((t) => t.room === id && isActive(t) && t.priority === 2).length
      out[id] = { open: s.open, done: s.done, urgent }
    }
    return out
  }, [tasks])

  const index = orderIndex(tasks)
  const remaining = tasks.filter((t) => isActive(t)).reduce((a, t) => a + t.minutes, 0)
  const summary = selected ? roomSummary(tasks, selected) : null
  const select = (room: RoomId | null) => {
    if (room) haptic()
    setSelected(room)
  }

  const fallback2d = <HouseFallback counts={counts} selected={selected} onSelect={select} />
  const use3d = scene3d && webgl

  return (
    <div
      className="noise relative h-[clamp(300px,48dvh,400px)] overflow-hidden rounded-[32px] border border-line"
      style={{
        background:
          resolvedTheme === 'dark'
            ? 'radial-gradient(120% 90% at 50% 0%, #1f2030 0%, #12121a 55%, #0d0d13 100%)'
            : 'radial-gradient(120% 90% at 50% 0%, #ffffff 0%, #f1ede4 60%, #e9e4d8 100%)',
      }}
    >
      {use3d ? (
        <div className="absolute inset-0">
          <ErrorBoundary fallback={fallback2d}>
            <Suspense fallback={<Skeleton className="absolute inset-4 rounded-[24px]" />}>
              <HouseScene counts={counts} selected={selected} onSelect={select} theme={resolvedTheme} animate={!reduced} />
            </Suspense>
          </ErrorBoundary>
        </div>
      ) : (
        fallback2d
      )}

      {/* Índice de Orden */}
      <motion.div className="pointer-events-none absolute top-4 left-4 flex items-center gap-3" animate={{ opacity: selected ? 0 : 1, y: selected ? -8 : 0 }}>
        <ProgressRing value={index / 100} size={52} stroke={5} label={`Índice de Orden ${index}%`}>
          <AnimatedNumber value={index} className="text-footnote font-semibold text-ink tabular" />
        </ProgressRing>
        <div>
          <p className="text-caption font-semibold tracking-[0.08em] text-ink-3 uppercase">Índice de orden</p>
          <p className="font-serif text-[22px] leading-none text-ink">{remaining ? `${formatMinutes(remaining)} por delante` : 'Impecable'}</p>
        </div>
      </motion.div>
      <AnimatePresence>
        {use3d && !selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-surface-1/70 px-3 py-1.5 text-caption whitespace-nowrap text-ink-2 backdrop-blur"
          >
            <Box className="size-3.5" /> Tocá un ambiente · arrastrá para girar
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambiente seleccionado */}
      <AnimatePresence>
        {selected && summary && (
          <motion.div
            key={selected}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={spring.snappy}
            className="glass absolute inset-x-3 bottom-3 rounded-[24px] border border-line p-3 pl-4 shadow-2"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: ROOMS[selected].color }}>
                {(() => {
                  const Icon = ROOMS[selected].icon
                  return <Icon className="size-5 text-[#0b0b10]" />
                })()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-headline font-semibold text-ink">{ROOMS[selected].label}</p>
                <p className="text-footnote text-ink-2">
                  {summary.open ? `${plural(summary.open, 'pendiente', 'pendientes')} · ~${formatMinutes(summary.minutes)}` : summary.done ? '¡Todo resuelto acá!' : 'Sin pendientes'}
                </p>
              </div>
              <IconButton label="Cerrar" tone="ghost" onClick={() => select(null)}>
                <X className="size-4" />
              </IconButton>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" className="h-11 flex-1" icon={<Plus className="size-4" />} onClick={() => openQuickAdd({ room: selected })}>
                Agregar
              </Button>
              <Button size="sm" variant="primary" className="h-11 flex-1" icon={<ArrowUpRight className="size-4" />} onClick={() => navigate(`/pendientes?ambiente=${selected}`)}>
                Ver tareas
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
