import { motion } from 'motion/react'

const COLORS = ['var(--accent)', 'var(--room-living)', 'var(--room-cocina)', 'var(--room-bano)', 'var(--room-pieza)', 'var(--room-taller)']

/** Explosión de partículas para celebrar una tarea terminada. */
export function Burst({ count = 14, radius = 46 }: { count?: number; radius?: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 2) * 0.2
        const dist = radius * (0.7 + ((i * 37) % 10) / 20)
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ width: i % 3 ? 6 : 8, height: i % 3 ? 6 : 8, background: COLORS[i % COLORS.length] }}
            initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, scale: [0.4, 1.1, 0], opacity: [1, 1, 0] }}
            transition={{ duration: 0.65, ease: [0.2, 0.8, 0.2, 1] }}
          />
        )
      })}
    </span>
  )
}
