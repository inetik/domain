import { motion } from 'motion/react'
import type { RoomId } from '../../db/types'
import { spring } from '../../design/motion'
import { ROOMS } from '../../lib/catalog'
import { BOUNDS, HOUSE, type RoomCounts } from './layout'

/** Plano 2D animado: se usa si el teléfono no tiene WebGL o si apagaste el 3D. */
export function HouseFallback({ counts, selected, onSelect }: { counts: Record<RoomId, RoomCounts>; selected: RoomId | null; onSelect: (room: RoomId | null) => void }) {
  const W = BOUNDS.maxX - BOUNDS.minX
  const D = BOUNDS.maxZ - BOUNDS.minZ
  return (
    <div className="absolute inset-0 flex items-center justify-center p-5 pt-16" data-testid="house-2d">
      <div className="relative w-full max-w-[420px]" style={{ aspectRatio: `${W} / ${D}`, transform: 'perspective(900px) rotateX(28deg)', transformOrigin: '50% 60%' }}>
        {HOUSE.map((box, i) => {
          const room = ROOMS[box.id]
          const c = counts[box.id]
          const active = selected === box.id
          return (
            <motion.button
              key={box.id}
              type="button"
              onClick={() => onSelect(active ? null : box.id)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: selected && !active ? 0.55 : 1, scale: active ? 1.04 : 1, y: active ? -6 : 0 }}
              transition={{ ...spring.gentle, delay: i * 0.04 }}
              className="absolute flex flex-col justify-between rounded-2xl border p-2 text-left"
              style={{
                left: `${((box.x - box.w / 2 - BOUNDS.minX) / W) * 100}%`,
                top: `${((box.z - box.d / 2 - BOUNDS.minZ) / D) * 100}%`,
                width: `calc(${(box.w / W) * 100}% - 6px)`,
                height: `calc(${(box.d / D) * 100}% - 6px)`,
                background: `color-mix(in oklab, ${room.color} ${active ? 70 : c.open ? 32 : 14}%, var(--surface-1))`,
                borderColor: `color-mix(in oklab, ${room.color} 40%, transparent)`,
                boxShadow: active ? `0 12px 30px color-mix(in oklab, ${room.color} 40%, transparent)` : undefined,
              }}
              aria-label={`${room.label}: ${c.open} pendientes`}
            >
              <span className="text-caption font-semibold text-ink">{room.short}</span>
              <span className="flex flex-wrap gap-1">
                {Array.from({ length: Math.min(c.open, 8) }, (_, j) => (
                  <motion.span
                    key={j}
                    className="size-2 rounded-full"
                    style={{ background: room.color, boxShadow: `0 0 8px ${room.color}` }}
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, delay: j * 0.2 }}
                  />
                ))}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
