import { CATEGORIES } from '../lib/catalog'
import { addDays, startOfDay } from '../lib/dates'
import { uid } from '../lib/id'
import { db } from './schema'
import type { LogEntry, LogType, Photo, PhotoKind, Task, TaskList } from './types'

type Listener = () => void
const listeners = new Set<Listener>()

/** Avisa a quien le interese (p. ej. la sincronización) que hubo cambios locales. */
export function onLocalChange(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function changed() {
  for (const fn of listeners) fn()
}

async function log(task: Pick<Task, 'id' | 'title' | 'room'>, type: LogType, detail?: string, at = Date.now()): Promise<string> {
  const entry: LogEntry = { id: uid(), taskId: task.id, taskTitle: task.title, room: task.room, type, at, detail }
  await db.logs.add(entry)
  return entry.id
}

export type NewTask = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>> & { title: string }

export function buildTask(input: NewTask, now = Date.now()): Task {
  const category = input.category ?? 'otro'
  return {
    id: uid(),
    title: input.title.trim(),
    notes: input.notes ?? '',
    room: input.room ?? 'general',
    category,
    status: input.status ?? 'pendiente',
    priority: input.priority ?? 0,
    minutes: input.minutes ?? CATEGORIES[category].defaultMinutes,
    energy: input.energy ?? CATEGORIES[category].energy,
    people: input.people ?? [],
    subtasks: input.subtasks ?? [],
    materials: input.materials ?? [],
    listIds: input.listIds ?? [],
    due: input.due,
    createdAt: now,
    updatedAt: now,
    completedAt: input.completedAt,
  }
}

export async function addTask(input: NewTask): Promise<Task> {
  const task = buildTask(input)
  await db.transaction('rw', db.tasks, db.logs, async () => {
    await db.tasks.add(task)
    await log(task, 'creada')
  })
  changed()
  return task
}

/** Aplica cambios a una tarea y los anota en el registro. Devuelve el id de la entrada del registro. */
export async function updateTask(id: string, patch: Partial<Task>, logType: LogType | null = 'editada', detail?: string): Promise<string | undefined> {
  const logId = await db.transaction('rw', db.tasks, db.logs, async () => {
    const task = await db.tasks.get(id)
    if (!task) return undefined
    const next = { ...task, ...patch, updatedAt: Date.now() }
    await db.tasks.put(next)
    if (logType) {
      // Las ediciones seguidas de la misma tarea se agrupan en una sola entrada del registro.
      if (logType === 'editada') {
        const logs = await db.logs.where('taskId').equals(id).toArray()
        const last = logs.reduce<LogEntry | undefined>((a, b) => (!a || b.at > a.at ? b : a), undefined)
        if (last && last.type === 'editada' && Date.now() - last.at < 10 * 60 * 1000) {
          await db.logs.update(last.id, { at: Date.now(), taskTitle: next.title, room: next.room })
          return undefined
        }
      }
      return log(next, logType, detail)
    }
    return undefined
  })
  changed()
  return logId
}

export function completeTask(id: string) {
  return updateTask(id, { status: 'hecha', completedAt: Date.now(), snoozedUntil: undefined }, 'hecha')
}

export function startTask(id: string) {
  return updateTask(id, { status: 'en_curso', startedAt: Date.now() }, 'iniciada')
}

export function reopenTask(id: string) {
  return updateTask(id, { status: 'pendiente', completedAt: undefined }, 'reabierta')
}

export function snoozeTask(id: string, days = 1) {
  const until = startOfDay(addDays(Date.now(), days))
  return updateTask(id, { snoozedUntil: until }, 'pospuesta', days === 1 ? 'hasta mañana' : `por ${days} días`)
}

export function deleteTask(id: string) {
  return updateTask(id, { deletedAt: Date.now() }, 'borrada')
}

export function restoreTask(id: string) {
  return updateTask(id, { deletedAt: undefined }, 'restaurada')
}

/** Vuelve una tarea a un estado anterior exacto (para "Deshacer") y borra la anotación del cambio. */
export async function revertTask(snapshot: Task, logId?: string) {
  await db.transaction('rw', db.tasks, db.logs, async () => {
    await db.tasks.put({ ...snapshot, updatedAt: Date.now() })
    if (logId) await db.logs.delete(logId)
  })
  changed()
}

export async function duplicateTask(id: string) {
  const task = await db.tasks.get(id)
  if (!task) return
  return addTask({
    ...task,
    title: `${task.title} (copia)`,
    status: 'pendiente',
    completedAt: undefined,
    subtasks: task.subtasks.map((s) => ({ ...s, id: uid(), done: false })),
    materials: task.materials.map((m) => ({ ...m, id: uid(), bought: false })),
  })
}

export async function toggleSubtask(taskId: string, subtaskId: string) {
  const task = await db.tasks.get(taskId)
  if (!task) return
  const subtasks = task.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s))
  await updateTask(taskId, { subtasks })
}

export async function toggleMaterial(taskId: string, materialId: string) {
  const task = await db.tasks.get(taskId)
  if (!task) return
  const materials = task.materials.map((m) => (m.id === materialId ? { ...m, bought: !m.bought } : m))
  await updateTask(taskId, { materials })
}

/** Marca un material como comprado en todas las tareas que lo piden. */
export async function setMaterialBought(refs: { taskId: string; materialId: string }[], bought: boolean) {
  await db.transaction('rw', db.tasks, async () => {
    for (const ref of refs) {
      const task = await db.tasks.get(ref.taskId)
      if (!task) continue
      const materials = task.materials.map((m) => (m.id === ref.materialId ? { ...m, bought } : m))
      await db.tasks.put({ ...task, materials, updatedAt: Date.now() })
    }
  })
  changed()
}

// Listas -------------------------------------------------------------------

export async function addList(input: Pick<TaskList, 'name' | 'emoji' | 'color'>): Promise<TaskList> {
  const now = Date.now()
  const list: TaskList = { id: uid(), ...input, createdAt: now, updatedAt: now }
  await db.lists.add(list)
  changed()
  return list
}

export async function updateList(id: string, patch: Partial<TaskList>) {
  await db.lists.update(id, { ...patch, updatedAt: Date.now() })
  changed()
}

export async function deleteList(id: string) {
  await db.transaction('rw', db.lists, db.tasks, async () => {
    await db.lists.update(id, { deletedAt: Date.now(), updatedAt: Date.now() })
    const tasks = await db.tasks.filter((t) => t.listIds.includes(id)).toArray()
    for (const t of tasks) await db.tasks.put({ ...t, listIds: t.listIds.filter((l) => l !== id), updatedAt: Date.now() })
  })
  changed()
}

export async function setTaskInList(taskId: string, listId: string, inList: boolean) {
  const task = await db.tasks.get(taskId)
  if (!task) return
  const has = task.listIds.includes(listId)
  if (has === inList) return
  const listIds = inList ? [...task.listIds, listId] : task.listIds.filter((l) => l !== listId)
  await updateTask(taskId, { listIds }, null)
}

// Fotos --------------------------------------------------------------------

export async function addPhoto(taskId: string, kind: PhotoKind, blob: Blob): Promise<Photo> {
  const photo: Photo = { id: uid(), taskId, kind, blob, createdAt: Date.now() }
  await db.transaction('rw', db.photos, db.logs, db.tasks, async () => {
    await db.photos.add(photo)
    const task = await db.tasks.get(taskId)
    if (task) await log(task, 'foto', kind === 'antes' ? 'Foto del antes' : 'Foto del después')
  })
  return photo
}

export async function deletePhoto(id: string) {
  await db.photos.delete(id)
}

export async function wipeAll() {
  await db.transaction('rw', [db.tasks, db.lists, db.logs, db.photos, db.meta], async () => {
    await Promise.all([db.tasks.clear(), db.lists.clear(), db.logs.clear(), db.photos.clear(), db.meta.clear()])
  })
}
