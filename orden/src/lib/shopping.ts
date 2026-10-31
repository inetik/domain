import type { RoomId, Task } from '../db/types'
import { materialKey } from './materials'

export interface ShoppingItem {
  key: string
  name: string
  bought: boolean
  refs: { taskId: string; materialId: string; taskTitle: string; room: RoomId; bought: boolean }[]
}

/** Junta los materiales de todas las tareas abiertas en una sola lista de compras. */
export function shoppingList(tasks: Task[]): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>()
  for (const t of tasks) {
    if (t.deletedAt || t.status === 'hecha') continue
    for (const m of t.materials) {
      const key = materialKey(m.name)
      const item = map.get(key) ?? { key, name: m.name, bought: true, refs: [] }
      item.refs.push({ taskId: t.id, materialId: m.id, taskTitle: t.title, room: t.room, bought: m.bought })
      item.bought = item.bought && m.bought
      map.set(key, item)
    }
  }
  return [...map.values()].sort((a, b) => b.refs.length - a.refs.length || a.name.localeCompare(b.name, 'es'))
}

export function shoppingText(items: ShoppingItem[]): string {
  const pending = items.filter((i) => !i.bought)
  return ['🛒 Ferretería — Orden', '', ...pending.map((i) => `• ${i.name}${i.refs.length > 1 ? ` (x${i.refs.length})` : ''}`)].join('\n')
}
