export const ROOM_IDS = ['living', 'cocina', 'pieza', 'bano', 'taller', 'general'] as const
export type RoomId = (typeof ROOM_IDS)[number]

export const CATEGORY_IDS = [
  'electricidad',
  'montaje',
  'arreglo',
  'limpieza',
  'orden',
  'venta',
  'carpinteria',
  'compras',
  'otro',
] as const
export type CategoryId = (typeof CATEGORY_IDS)[number]

export type Status = 'pendiente' | 'en_curso' | 'hecha'
/** 0 normal · 1 importante · 2 urgente */
export type Priority = 0 | 1 | 2
export type Energy = 'baja' | 'media' | 'alta'

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Material {
  id: string
  name: string
  bought: boolean
}

export interface Task {
  id: string
  title: string
  notes: string
  room: RoomId
  category: CategoryId
  status: Status
  priority: Priority
  minutes: number
  energy: Energy
  people: string[]
  subtasks: Subtask[]
  materials: Material[]
  listIds: string[]
  /** Fecha objetivo YYYY-MM-DD */
  due?: string
  createdAt: number
  updatedAt: number
  startedAt?: number
  completedAt?: number
  snoozedUntil?: number
  deletedAt?: number
}

export interface TaskList {
  id: string
  name: string
  emoji: string
  color: string
  createdAt: number
  updatedAt: number
  deletedAt?: number
}

export type LogType =
  | 'creada'
  | 'editada'
  | 'iniciada'
  | 'hecha'
  | 'reabierta'
  | 'pospuesta'
  | 'borrada'
  | 'restaurada'
  | 'foto'

export interface LogEntry {
  id: string
  taskId: string
  taskTitle: string
  room: RoomId
  type: LogType
  at: number
  detail?: string
}

export type PhotoKind = 'antes' | 'despues'

export interface Photo {
  id: string
  taskId: string
  kind: PhotoKind
  blob: Blob
  createdAt: number
}

export interface MetaEntry {
  key: string
  value: unknown
}
