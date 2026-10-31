import { CATEGORY_IDS, ROOM_IDS, type LogEntry, type Material, type Subtask, type Task, type TaskList } from './types'

/**
 * Datos que vienen de afuera (copias de seguridad, la nube) pueden estar incompletos o
 * venir de otra versión. Antes de guardarlos, los completamos con valores seguros para
 * que ninguna pantalla se rompa. Lo que no tiene arreglo (sin id o título) se descarta.
 */

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const optNum = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T => (options.includes(v as T) ? (v as T) : fallback)
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})

export function normalizeTask(raw: unknown, now = Date.now()): Task | null {
  const r = obj(raw)
  const id = str(r.id)
  const title = str(r.title).trim()
  if (!id || !title) return null
  const createdAt = num(r.createdAt, now)
  const priority = num(r.priority, 0)
  return {
    id,
    title,
    notes: str(r.notes),
    room: oneOf(r.room, ROOM_IDS, 'general'),
    category: oneOf(r.category, CATEGORY_IDS, 'otro'),
    status: oneOf(r.status, ['pendiente', 'en_curso', 'hecha'] as const, 'pendiente'),
    priority: (priority === 1 || priority === 2 ? priority : 0) as Task['priority'],
    minutes: Math.max(5, num(r.minutes, 30)),
    energy: oneOf(r.energy, ['baja', 'media', 'alta'] as const, 'media'),
    people: arr(r.people).filter((p): p is string => typeof p === 'string' && !!p.trim()),
    subtasks: arr(r.subtasks)
      .map((s): Subtask | null => {
        const o = obj(s)
        return str(o.id) && str(o.title) ? { id: str(o.id), title: str(o.title), done: o.done === true } : null
      })
      .filter((s): s is Subtask => !!s),
    materials: arr(r.materials)
      .map((m): Material | null => {
        const o = obj(m)
        return str(o.id) && str(o.name) ? { id: str(o.id), name: str(o.name), bought: o.bought === true } : null
      })
      .filter((m): m is Material => !!m),
    listIds: arr(r.listIds).filter((l): l is string => typeof l === 'string'),
    due: typeof r.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.due) ? r.due : undefined,
    createdAt,
    updatedAt: num(r.updatedAt, createdAt),
    startedAt: optNum(r.startedAt),
    completedAt: optNum(r.completedAt),
    snoozedUntil: optNum(r.snoozedUntil),
    deletedAt: optNum(r.deletedAt),
  }
}

export function normalizeList(raw: unknown, now = Date.now()): TaskList | null {
  const r = obj(raw)
  const id = str(r.id)
  const name = str(r.name).trim()
  if (!id || !name) return null
  const createdAt = num(r.createdAt, now)
  return { id, name, emoji: str(r.emoji, '📋'), color: str(r.color, '#c6f432'), createdAt, updatedAt: num(r.updatedAt, createdAt), deletedAt: optNum(r.deletedAt) }
}

export function normalizeLog(raw: unknown): LogEntry | null {
  const r = obj(raw)
  const id = str(r.id)
  const taskId = str(r.taskId)
  if (!id || !taskId) return null
  return {
    id,
    taskId,
    taskTitle: str(r.taskTitle, 'Tarea'),
    room: oneOf(r.room, ROOM_IDS, 'general'),
    type: oneOf(r.type, ['creada', 'editada', 'iniciada', 'hecha', 'reabierta', 'pospuesta', 'borrada', 'restaurada', 'foto'] as const, 'editada'),
    at: num(r.at, 0),
    detail: typeof r.detail === 'string' ? r.detail : undefined,
  }
}

export function normalizeAll<T>(items: unknown[], fn: (x: unknown) => T | null): T[] {
  return items.map((x) => fn(x)).filter((x): x is T => x !== null)
}
