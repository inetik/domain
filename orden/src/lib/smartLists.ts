import { CalendarDays, Flame, Hammer, PackageCheck, Timer, Users, Zap, type LucideIcon } from 'lucide-react'
import type { Task } from '../db/types'
import { addDays, isoDate, startOfDay } from './dates'
import { isOpen, knownPeople } from './stats'

export interface SmartList {
  id: string
  name: string
  description: string
  icon: LucideIcon
  color: string
  match: (t: Task) => boolean
}

function weekendRange(now: number): [string, string] {
  const day = new Date(now).getDay()
  const toSat = day === 0 ? -1 : 6 - day
  const sat = addDays(startOfDay(now), toSat)
  return [isoDate(sat), isoDate(addDays(sat, 1))]
}

export function smartLists(tasks: Task[], now = Date.now()): SmartList[] {
  const [sat, sun] = weekendRange(now)
  const lists: SmartList[] = [
    { id: 'smart:rapidas', name: 'Rápidas', description: '30 minutos o menos', icon: Timer, color: 'var(--accent)', match: (t) => t.minutes <= 30 },
    { id: 'smart:prioridad', name: 'Prioritarias', description: 'Importantes y urgentes', icon: Flame, color: 'var(--danger)', match: (t) => t.priority > 0 },
    { id: 'smart:electricidad', name: 'Electricidad', description: 'Con la térmica cortada', icon: Zap, color: 'var(--room-taller)', match: (t) => t.category === 'electricidad' },
    { id: 'smart:finde', name: 'Este finde', description: 'Con fecha sábado o domingo', icon: CalendarDays, color: 'var(--room-living)', match: (t) => !!t.due && t.due >= sat && t.due <= sun },
    { id: 'smart:en-curso', name: 'En curso', description: 'Lo que ya arrancaste', icon: Hammer, color: 'var(--room-cocina)', match: (t) => t.status === 'en_curso' },
    {
      id: 'smart:listas',
      name: 'Listas para hacer',
      description: 'No falta comprar nada',
      icon: PackageCheck,
      color: 'var(--success)',
      match: (t) => t.materials.every((m) => m.bought) && t.people.length === 0,
    },
  ]
  for (const person of knownPeople(tasks)) {
    lists.push({
      id: `smart:persona:${person}`,
      name: `Con ${person}`,
      description: 'Para coordinar juntos',
      icon: Users,
      color: 'var(--room-pieza)',
      match: (t) => t.people.includes(person),
    })
  }
  return lists
}

export function smartListTasks(list: SmartList, tasks: Task[]): Task[] {
  return tasks.filter((t) => isOpen(t) && list.match(t))
}
