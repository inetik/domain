import { uid } from '../lib/id'
import { buildTask, type NewTask } from './repo'
import { db, getMeta, setMeta } from './schema'
import type { LogEntry, Task, TaskList } from './types'

const m = (...names: string[]) => names.map((name) => ({ id: uid(), name, bought: false }))
const s = (...titles: string[]) => titles.map((title) => ({ id: uid(), title, done: false }))

const SAFETY = 'Antes de tocar cables: cortá la térmica y verificá con el buscapolo.'

/** Los pendientes iniciales de la casa, ya clasificados. */
export const SEED_TASKS: NewTask[] = [
  { title: 'Dar vuelta el palo de la cortina', room: 'bano', category: 'arreglo', minutes: 15, energy: 'baja' },
  {
    title: 'Colgar la tele',
    room: 'pieza',
    category: 'montaje',
    minutes: 60,
    priority: 1,
    materials: m('Soporte para TV', 'Tarugos 8 mm', 'Mecha widia 8 mm', 'Nivel'),
    subtasks: s('Marcar altura y nivel', 'Agujerear y poner tarugos', 'Fijar soporte', 'Colgar la tele'),
  },
  {
    title: 'Armar conexión con cable canal y un toma para la tele',
    room: 'pieza',
    category: 'electricidad',
    minutes: 90,
    priority: 1,
    notes: SAFETY,
    materials: m('Cable canal', 'Tomacorriente', 'Caja exterior', 'Cable 2,5 mm²', 'Buscapolo'),
    subtasks: s('Medir recorrido del cable canal', 'Cortar la térmica', 'Pasar cable y armar el toma', 'Probar con la tele'),
  },
  {
    title: 'Armar cable y cablear luz bajo mesada',
    room: 'cocina',
    category: 'electricidad',
    minutes: 120,
    notes: SAFETY,
    materials: m('Tira LED', 'Fuente 12 V', 'Cable bipolar', 'Interruptor o sensor'),
    subtasks: s('Medir largo de la mesada', 'Armar el cable', 'Pegar la tira LED', 'Conectar y probar'),
  },
  {
    title: 'Colgar estantes',
    room: 'living',
    category: 'montaje',
    minutes: 60,
    materials: m('Tarugos 8 mm', 'Tornillos', 'Nivel'),
  },
  {
    title: 'Colgar los cuadros',
    room: 'living',
    category: 'montaje',
    minutes: 45,
    materials: m('Ganchos para cuadros', 'Clavos o tarugos'),
    subtasks: s('Elegir dónde va cada uno', 'Marcar con lápiz y nivel', 'Colgar'),
  },
  {
    title: 'Vender las mesas de luz',
    room: 'pieza',
    category: 'venta',
    minutes: 30,
    energy: 'baja',
    subtasks: s('Sacar fotos con buena luz', 'Publicar en Marketplace', 'Coordinar retiro'),
  },
  { title: 'Acomodar cajones de la cómoda', room: 'pieza', category: 'orden', minutes: 30, energy: 'baja' },
  {
    title: 'Acomodar tornillos en la maleta',
    room: 'taller',
    category: 'orden',
    minutes: 30,
    energy: 'baja',
    materials: m('Organizador con divisiones'),
  },
  {
    title: 'Arreglar pastina de la bañera',
    room: 'bano',
    category: 'arreglo',
    minutes: 90,
    materials: m('Pastina', 'Espátula de goma', 'Rasqueta', 'Silicona antihongos'),
    subtasks: s('Sacar la pastina vieja', 'Limpiar y secar', 'Aplicar pastina nueva', 'Sellar con silicona'),
  },
  {
    title: 'Limpiar grifería de los baños',
    room: 'bano',
    category: 'limpieza',
    minutes: 30,
    materials: m('Antisarro', 'Paño de microfibra'),
  },
  {
    title: 'Armar la madera para el estante de la isla',
    room: 'cocina',
    category: 'carpinteria',
    minutes: 120,
    people: ['Nacho'],
    materials: m('Madera', 'Lija 120/220', 'Barniz', 'Soportes'),
    subtasks: s('Medir la isla', 'Cortar y lijar', 'Barnizar', 'Instalar'),
  },
  {
    title: 'Arreglar enchufes de la cocina',
    room: 'cocina',
    category: 'electricidad',
    minutes: 60,
    priority: 2,
    notes: SAFETY,
    materials: m('Tomacorriente', 'Buscapolo'),
  },
]

export const SEED_LIST_NAME = 'Para este finde'

/** Carga los pendientes iniciales una sola vez. Devuelve true si sembró. */
export async function seedIfNeeded(now = Date.now()): Promise<boolean> {
  return db.transaction('rw', [db.tasks, db.lists, db.logs, db.meta], async () => {
    if (await getMeta<boolean>('seeded')) return false
    if ((await db.tasks.count()) > 0) {
      await setMeta('seeded', true)
      return false
    }
    const list: TaskList = { id: uid(), name: SEED_LIST_NAME, emoji: '🚀', color: '#c6f432', createdAt: now, updatedAt: now }
    const quickWins = new Set(['Dar vuelta el palo de la cortina', 'Limpiar grifería de los baños', 'Acomodar cajones de la cómoda'])
    const tasks: Task[] = SEED_TASKS.map((input, i) => {
      const t = buildTask(input, now - (SEED_TASKS.length - i))
      if (quickWins.has(t.title)) t.listIds = [list.id]
      return t
    })
    const logs: LogEntry[] = tasks.map((t) => ({ id: uid(), taskId: t.id, taskTitle: t.title, room: t.room, type: 'creada', at: t.createdAt }))
    await db.lists.add(list)
    await db.tasks.bulkAdd(tasks)
    await db.logs.bulkAdd(logs)
    await setMeta('seeded', true)
    await setMeta('installedAt', now)
    return true
  })
}
