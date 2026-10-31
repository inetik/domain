import type { Energy, Task } from '../db/types'
import { daysAgo, isoDate } from './dates'
import { isOpen, isSnoozed } from './stats'

export interface SuggestInput {
  /** Minutos disponibles (Infinity = sin límite) */
  minutes: number
  energy: Energy
  exclude?: string[]
}

const ENERGY_RANK: Record<Energy, number> = { baja: 0, media: 1, alta: 2 }

export function scoreTask(t: Task, input: SuggestInput, now = Date.now()): number {
  if (t.minutes > input.minutes) return -Infinity
  // No proponer algo que pide más energía de la que tenés
  const gap = ENERGY_RANK[t.energy] - ENERGY_RANK[input.energy]
  if (gap > 0) return -Infinity
  let score = 10
  score += t.priority * 12
  score += gap * 2 // energía justa puntúa más que energía de sobra
  score += Math.min(daysAgo(t.createdAt, now), 30) * 0.4
  if (t.due && t.due <= isoDate(now)) score += 20
  if (t.status === 'en_curso') score += 8
  if (t.materials.some((m) => !m.bought)) score -= 8
  if (t.people.length) score -= 6
  // Aprovechar el tiempo: preferir tareas que llenen bien el rato
  if (Number.isFinite(input.minutes)) score += (t.minutes / input.minutes) * 6
  return score
}

export function rankTasks(tasks: Task[], input: SuggestInput, now = Date.now()): Task[] {
  const exclude = new Set(input.exclude ?? [])
  return tasks
    .filter((t) => isOpen(t) && !isSnoozed(t, now) && !exclude.has(t.id))
    .map((t) => ({ t, s: scoreTask(t, input, now) }))
    .filter((x) => Number.isFinite(x.s))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.t)
}
