import type { RoomId, Task } from '../db/types'
import { formatMinutes, ROOMS } from './catalog'
import { daysAgo, isoDate, parseIsoDate, startOfDay } from './dates'
import { materialKey } from './materials'
import { completedSince, isOpen, isSnoozed, startOfWeek, streak } from './stats'

/**
 * El Capataz: el supervisor de la obra. Mira tus pendientes y te tira
 * sugerencias concretas. Son reglas locales: no necesita internet ni IA paga.
 */

export type InsightTone = 'tip' | 'warn' | 'win' | 'plan'

export type InsightAction =
  | { kind: 'room'; room: RoomId; label: string }
  | { kind: 'task'; taskId: string; label: string }
  | { kind: 'route'; to: string; label: string }
  | { kind: 'suggest'; label: string }

export interface Insight {
  id: string
  tone: InsightTone
  title: string
  body: string
  score: number
  action?: InsightAction
}

export function capatazInsights(tasks: Task[], now = Date.now()): Insight[] {
  const open = tasks.filter((t) => isOpen(t) && !isSnoozed(t, now))
  const out: Insight[] = []

  if (!tasks.some(isOpen)) {
    out.push({
      id: 'all-done',
      tone: 'win',
      title: 'Casa en orden',
      body: 'No queda nada pendiente. Cuando se te ocurra algo, cargalo con el botón +.',
      score: 100,
    })
    return out
  }

  // Vencidas o para hoy
  const today = isoDate(now)
  const dueToday = open.filter((t) => t.due && t.due <= today)
  if (dueToday.length) {
    const overdue = dueToday.filter((t) => parseIsoDate(t.due!) < startOfDay(now))
    out.push({
      id: 'due',
      tone: 'warn',
      title: overdue.length ? `${overdue.length} ${overdue.length === 1 ? 'tarea vencida' : 'tareas vencidas'}` : 'Para hoy',
      body: `«${dueToday[0].title}»${dueToday.length > 1 ? ` y ${dueToday.length - 1} más` : ''}. Reprogramala o arrancala.`,
      score: 95,
      action: { kind: 'task', taskId: dueToday[0].id, label: 'Ver tarea' },
    })
  }

  // Urgentes
  const urgent = open.filter((t) => t.priority === 2)
  if (urgent.length) {
    out.push({
      id: 'urgent',
      tone: 'warn',
      title: urgent.length === 1 ? 'Hay una urgente' : `${urgent.length} urgentes`,
      body: `Empezá por «${urgent[0].title}». Lo demás puede esperar.`,
      score: 90,
      action: { kind: 'task', taskId: urgent[0].id, label: 'Abrir' },
    })
  }

  // Agrupar por ambiente
  const byRoom = new Map<RoomId, Task[]>()
  for (const t of open) byRoom.set(t.room, [...(byRoom.get(t.room) ?? []), t])
  const busiest = [...byRoom.entries()].filter(([room]) => room !== 'general').sort((a, b) => b[1].length - a[1].length)[0]
  if (busiest && busiest[1].length >= 2) {
    const [room, list] = busiest
    const minutes = list.reduce((a, t) => a + t.minutes, 0)
    out.push({
      id: `room-${room}`,
      tone: 'plan',
      title: `${ROOMS[room].label}: ${list.length} pendientes`,
      body: `Suman ~${formatMinutes(minutes)}. Si los hacés en una sola sesión, ahorrás en preparar y limpiar.`,
      score: 70 + list.length,
      action: { kind: 'room', room, label: `Ver ${ROOMS[room].label}` },
    })
  }

  // Ferretería
  const needs = new Map<string, number>()
  let blocked = 0
  for (const t of open) {
    const missing = t.materials.filter((m) => !m.bought)
    if (missing.length) blocked++
    for (const m of missing) needs.set(materialKey(m.name), (needs.get(materialKey(m.name)) ?? 0) + 1)
  }
  if (blocked >= 2) {
    out.push({
      id: 'ferreteria',
      tone: 'plan',
      title: 'Una vuelta a la ferretería',
      body: `Con ${needs.size} materiales destrabás ${blocked} tareas. Tengo la lista armada.`,
      score: 75,
      action: { kind: 'route', to: '/ferreteria', label: 'Ver lista' },
    })
  }

  // Rápidas
  const quick = open.filter((t) => t.minutes <= 15).sort((a, b) => a.minutes - b.minutes)
  if (quick.length) {
    out.push({
      id: 'quick',
      tone: 'tip',
      title: quick.length === 1 ? 'Una de 15 minutos' : `${quick.length} tareas de 15 minutos`,
      body: `Arrancá por «${quick[0].title}». Ganar una chiquita da envión.`,
      score: 65,
      action: { kind: 'task', taskId: quick[0].id, label: 'Hacerla' },
    })
  }

  // Electricidad
  const electric = open.filter((t) => t.category === 'electricidad')
  if (electric.length >= 2) {
    out.push({
      id: 'electric',
      tone: 'warn',
      title: `${electric.length} trabajos eléctricos`,
      body: 'Hacelos el mismo día: cortás la térmica una vez y tenés el buscapolo a mano.',
      score: 60,
      action: { kind: 'route', to: '/listas/smart:electricidad', label: 'Ver todos' },
    })
  }

  // Con otras personas
  const people = new Map<string, Task[]>()
  for (const t of open) for (const p of t.people) people.set(p, [...(people.get(p) ?? []), t])
  for (const [person, list] of people) {
    const minutes = list.reduce((a, t) => a + t.minutes, 0)
    out.push({
      id: `people-${person}`,
      tone: 'plan',
      title: `Coordiná con ${person}`,
      body: `${list.length === 1 ? `«${list[0].title}»` : `${list.length} tareas juntos`} · ~${formatMinutes(minutes)}. Mandale un mensaje y pongan fecha.`,
      score: 55,
      action: { kind: 'route', to: `/listas/smart:persona:${encodeURIComponent(person)}`, label: 'Ver' },
    })
  }

  // Estancadas
  const stale = open.filter((t) => daysAgo(t.createdAt, now) >= 14).sort((a, b) => a.createdAt - b.createdAt)
  if (stale.length) {
    const t = stale[0]
    out.push({
      id: 'stale',
      tone: 'tip',
      title: 'Algo quedó trabado',
      body: `«${t.title}» está hace ${daysAgo(t.createdAt, now)} días. ¿La partimos en pasos más chicos?`,
      score: 50,
      action: { kind: 'task', taskId: t.id, label: 'Partirla' },
    })
  }

  // Racha / impulso
  const s = streak(tasks, now)
  const week = completedSince(tasks, startOfWeek(now)).length
  if (s >= 2) {
    out.push({ id: 'streak', tone: 'win', title: `${s} días seguidos`, body: 'Venís con racha. Una más hoy y no se corta.', score: 80, action: { kind: 'suggest', label: '¿Qué hago?' } })
  } else if (week > 0) {
    out.push({ id: 'week', tone: 'win', title: `${week} ${week === 1 ? 'hecha' : 'hechas'} esta semana`, body: 'Buen ritmo. Seguí con una cortita.', score: 45, action: { kind: 'suggest', label: '¿Qué hago?' } })
  } else {
    out.push({ id: 'start', tone: 'tip', title: '¿Arrancamos?', body: 'Decime cuánto tiempo tenés y te elijo una tarea.', score: 40, action: { kind: 'suggest', label: 'Elegime una' } })
  }

  return out.sort((a, b) => b.score - a.score)
}
