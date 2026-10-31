import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { useUI } from '../app/ui'
import { spring } from '../design/motion'
import { ROOMS } from '../lib/catalog'
import { Burst } from './Burst'

/** Momento de festejo cuando un ambiente (o toda la casa) queda sin pendientes. */
export function RoomCelebration() {
  const { celebration, clearCelebration } = useUI()

  useEffect(() => {
    if (!celebration) return
    const t = setTimeout(clearCelebration, 2400)
    return () => clearTimeout(t)
  }, [celebration, clearCelebration])

  const room = celebration && celebration.room !== 'casa' ? ROOMS[celebration.room] : null
  const Icon = room?.icon
  const color = room?.color ?? 'var(--accent)'
  const title = !celebration ? '' : celebration.room === 'casa' ? 'Casa en orden' : celebration.room === 'general' ? 'Pendientes generales al día' : `${room!.label} impecable`

  return (
    <AnimatePresence>
      {celebration && (
        <motion.div
          key={celebration.at}
          className="pointer-events-none fixed inset-0 z-[75] flex items-center justify-center px-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="status"
          aria-live="polite"
          data-testid="celebration"
        >
          <div className="absolute inset-0" style={{ background: `radial-gradient(60% 45% at 50% 50%, color-mix(in oklab, ${color} 35%, transparent), var(--scrim))` }} />
          <motion.div className="relative flex flex-col items-center text-center" initial={{ scale: 0.6, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} transition={spring.bouncy}>
            <span className="relative flex size-24 items-center justify-center rounded-[32px] shadow-2" style={{ background: color }}>
              {Icon ? <Icon className="size-11 text-[#0b0b10]" /> : <span className="text-[44px]">🏡</span>}
              <Burst count={24} radius={110} />
            </span>
            <p className="mt-6 font-serif text-[40px] leading-none text-ink">
              ¡{title}<span className="italic text-accent-text">!</span>
            </p>
            <p className="mt-2 text-callout text-ink-2">{celebration.room === 'casa' ? 'No queda nada pendiente. Disfrutala.' : 'No queda nada pendiente acá.'}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
