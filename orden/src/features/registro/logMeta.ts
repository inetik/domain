import { AlarmClock, Camera, CircleCheck, Pencil, Play, Plus, RotateCcw, Trash2, Undo2, type LucideIcon } from 'lucide-react'
import type { LogType } from '../../db/types'

export const LOG_META: Record<LogType, { label: string; icon: LucideIcon; color: string }> = {
  creada: { label: 'Creada', icon: Plus, color: 'var(--room-living-ink)' },
  editada: { label: 'Editada', icon: Pencil, color: 'var(--text-2)' },
  iniciada: { label: 'Empezada', icon: Play, color: 'var(--room-taller-ink)' },
  hecha: { label: 'Hecha', icon: CircleCheck, color: 'var(--success-ink)' },
  reabierta: { label: 'Reabierta', icon: RotateCcw, color: 'var(--room-pieza-ink)' },
  pospuesta: { label: 'Pospuesta', icon: AlarmClock, color: 'var(--warn-ink)' },
  borrada: { label: 'Borrada', icon: Trash2, color: 'var(--danger-ink)' },
  restaurada: { label: 'Restaurada', icon: Undo2, color: 'var(--room-bano-ink)' },
  foto: { label: 'Foto', icon: Camera, color: 'var(--room-cocina-ink)' },
}
