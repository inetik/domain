import { AlarmClock, Camera, CircleCheck, Pencil, Play, Plus, RotateCcw, Trash2, Undo2, type LucideIcon } from 'lucide-react'
import type { LogType } from '../../db/types'

export const LOG_META: Record<LogType, { label: string; icon: LucideIcon; color: string }> = {
  creada: { label: 'Creada', icon: Plus, color: 'var(--room-living)' },
  editada: { label: 'Editada', icon: Pencil, color: 'var(--text-2)' },
  iniciada: { label: 'Empezada', icon: Play, color: 'var(--room-taller)' },
  hecha: { label: 'Hecha', icon: CircleCheck, color: 'var(--success)' },
  reabierta: { label: 'Reabierta', icon: RotateCcw, color: 'var(--room-pieza)' },
  pospuesta: { label: 'Pospuesta', icon: AlarmClock, color: 'var(--warn)' },
  borrada: { label: 'Borrada', icon: Trash2, color: 'var(--danger)' },
  restaurada: { label: 'Restaurada', icon: Undo2, color: 'var(--room-bano)' },
  foto: { label: 'Foto', icon: Camera, color: 'var(--room-cocina)' },
}
