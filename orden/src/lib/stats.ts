import type { RoomId, Task } from '../db/types'
import { DAY, startOfDay } from './dates'

export const isAlive = (t: Task) => !t.deletedAt
export const isOpen = (t: Task) => !t.deletedAt && t.status !== 'hecha'
export const isSnoozed = (t: Task, now = Date.now()) => isOpen(t) && !!t.snoozedUntil && t.snoozedUntil > now
/** Abierta y no pospuesta: lo que cuenta como "pendiente" en todas las pantallas. */
export const isActive = (t: Task, now = Date.now()) => isOpen(t) && !isSnoozed(t, now)

/** Índice de Orden: porcentaje resuelto, ponderado por tiempo estimado. */
export function orderIndex(tasks: Task[]): number {
  let done = 0
  let total = 0
  for (const t of tasks) {
    if (t.deletedAt) continue
    total += t.minutes
    if (t.status === 'hecha') done += t.minutes
  }
  return total ? Math.round((done / total) * 100) : 0
}

export function roomSummary(tasks: Task[], room: RoomId) {
  const inRoom = tasks.filter((t) => isAlive(t) && t.room === room)
  const open = inRoom.filter((t) => isActive(t))
  const done = inRoom.filter((t) => t.status === 'hecha').length
  return {
    total: inRoom.length,
    open: open.length,
    done,
    minutes: open.reduce((a, t) => a + t.minutes, 0),
    progress: inRoom.length ? done / inRoom.length : 0,
  }
}

/** Días seguidos (hasta hoy o ayer) con al menos una tarea terminada. */
export function streak(tasks: Task[], now = Date.now()): number {
  const days = new Set(tasks.filter((t) => isAlive(t) && t.completedAt).map((t) => startOfDay(t.completedAt!)))
  let day = startOfDay(now)
  if (!days.has(day)) day -= DAY
  let count = 0
  while (days.has(day)) {
    count++
    day = startOfDay(day - DAY / 2)
  }
  return count
}

export function completedSince(tasks: Task[], since: number): Task[] {
  return tasks.filter((t) => isAlive(t) && t.completedAt && t.completedAt >= since)
}

export function startOfWeek(now = Date.now()): number {
  const d = new Date(startOfDay(now))
  const diff = (d.getDay() + 6) % 7 // lunes = 0
  d.setDate(d.getDate() - diff)
  return d.getTime()
}

export function knownPeople(tasks: Task[]): string[] {
  const set = new Set<string>()
  for (const t of tasks) for (const p of t.people) set.add(p)
  return [...set].sort((a, b) => a.localeCompare(b, 'es'))
}
