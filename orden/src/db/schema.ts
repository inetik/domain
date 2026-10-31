import Dexie, { type EntityTable } from 'dexie'
import type { LogEntry, MetaEntry, Photo, Task, TaskList } from './types'

export class OrdenDB extends Dexie {
  tasks!: EntityTable<Task, 'id'>
  lists!: EntityTable<TaskList, 'id'>
  logs!: EntityTable<LogEntry, 'id'>
  photos!: EntityTable<Photo, 'id'>
  meta!: EntityTable<MetaEntry, 'key'>

  constructor(name = 'orden') {
    super(name)
    this.version(1).stores({
      tasks: 'id, status, room, category, updatedAt, completedAt',
      lists: 'id, updatedAt',
      logs: 'id, taskId, at, type',
      photos: 'id, taskId, createdAt',
      meta: 'key',
    })
  }
}

export const db = new OrdenDB()

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key)
  return row?.value as T | undefined
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value })
}
