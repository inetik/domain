import { isoDate } from '../lib/dates'
import { newerThanLocal } from './merge'
import { normalizeAll, normalizeList, normalizeLog, normalizeTask } from './normalize'
import { db, setMeta } from './schema'
import type { LogEntry, Photo, Task, TaskList } from './types'

interface PhotoDump extends Omit<Photo, 'blob'> {
  type: string
  data: string
}

export interface BackupFile {
  app: 'orden'
  version: 1
  exportedAt: number
  tasks: Task[]
  lists: TaskList[]
  logs: LogEntry[]
  photos: PhotoDump[]
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(binary)
}

function base64ToBlob(data: string, type: string): Blob {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}

export async function exportBackup(): Promise<BackupFile> {
  const [tasks, lists, logs, photos] = await Promise.all([db.tasks.toArray(), db.lists.toArray(), db.logs.toArray(), db.photos.toArray()])
  const dumped: PhotoDump[] = []
  for (const { blob, ...rest } of photos) dumped.push({ ...rest, type: blob.type || 'image/jpeg', data: await blobToBase64(blob) })
  return { app: 'orden', version: 1, exportedAt: Date.now(), tasks, lists, logs, photos: dumped }
}

export function isBackupFile(value: unknown): value is BackupFile {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return v.app === 'orden' && Array.isArray(v.tasks) && Array.isArray(v.lists) && Array.isArray(v.logs) && Array.isArray(v.photos)
}

export interface ImportResult {
  tasks: number
  lists: number
  logs: number
  photos: number
}

export async function importBackup(raw: BackupFile, mode: 'merge' | 'replace'): Promise<ImportResult> {
  // Completar/descartar registros incompletos para que ninguna pantalla se rompa
  const file = {
    ...raw,
    tasks: normalizeAll(raw.tasks, (t) => normalizeTask(t)),
    lists: normalizeAll(raw.lists, (l) => normalizeList(l)),
    logs: normalizeAll(raw.logs, normalizeLog),
  }
  const photos: Photo[] = raw.photos
    .filter((p) => p && typeof p.data === 'string' && typeof p.id === 'string' && typeof p.taskId === 'string')
    .map(({ data, type, ...rest }) => ({ ...rest, kind: rest.kind === 'despues' ? 'despues' : 'antes', blob: base64ToBlob(data, type || 'image/jpeg') }))
  return db.transaction('rw', [db.tasks, db.lists, db.logs, db.photos, db.meta], async () => {
    if (mode === 'replace') {
      await Promise.all([db.tasks.clear(), db.lists.clear(), db.logs.clear(), db.photos.clear()])
      await db.tasks.bulkPut(file.tasks)
      await db.lists.bulkPut(file.lists)
      await db.logs.bulkPut(file.logs)
      await db.photos.bulkPut(photos)
      await setMeta('seeded', true)
      return { tasks: file.tasks.length, lists: file.lists.length, logs: file.logs.length, photos: photos.length }
    }
    const tasks = newerThanLocal(await db.tasks.toArray(), file.tasks)
    const lists = newerThanLocal(await db.lists.toArray(), file.lists)
    const logIds = new Set(await db.logs.toCollection().primaryKeys())
    const logs = file.logs.filter((l) => !logIds.has(l.id))
    const photoIds = new Set(await db.photos.toCollection().primaryKeys())
    const newPhotos = photos.filter((p) => !photoIds.has(p.id))
    await db.tasks.bulkPut(tasks)
    await db.lists.bulkPut(lists)
    await db.logs.bulkPut(logs)
    await db.photos.bulkPut(newPhotos)
    await setMeta('seeded', true)
    return { tasks: tasks.length, lists: lists.length, logs: logs.length, photos: newPhotos.length }
  })
}

export function backupFileName(now = Date.now()): string {
  return `orden-copia-${isoDate(now)}.json`
}

/**
 * Guarda la copia: en iPhone abre la hoja de compartir (→ "Guardar en Archivos" / iCloud);
 * en otros navegadores, descarga el archivo.
 */
export async function saveBackup(): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const data = await exportBackup()
  const json = JSON.stringify(data)
  const name = backupFileName()
  const file = new File([json], name, { type: 'application/json' })
  let result: 'shared' | 'downloaded' | 'cancelled' = 'downloaded'
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Copia de Orden' })
      result = 'shared'
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return 'cancelled'
      download(file, name)
    }
  } else {
    download(file, name)
  }
  await setMeta('lastBackupAt', Date.now())
  return result
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function readBackupFile(file: File): Promise<BackupFile> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('El archivo no es una copia válida de Orden.')
  }
  if (!isBackupFile(parsed)) throw new Error('El archivo no es una copia válida de Orden.')
  return parsed
}
