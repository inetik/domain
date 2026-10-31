import type { CategoryId, Energy, Priority, RoomId } from '../db/types'
import { CATEGORIES } from './catalog'
import { addDays, isoDate, nextWeekday, startOfDay } from './dates'
import { normalize } from './id'
import { suggestMaterials } from './materials'

export interface ParsedTask {
  title: string
  room: RoomId
  roomDetected: boolean
  category: CategoryId
  categoryDetected: boolean
  minutes: number
  minutesDetected: boolean
  priority: Priority
  people: string[]
  due?: string
  energy: Energy
  materials: string[]
}

/** Regex con límites de palabra que entienden tildes y ñ. */
function w(source: string, flags = 'iu'): RegExp {
  return new RegExp(`(?<![\\p{L}\\d])(?:${source})(?![\\p{L}\\d])`, flags)
}

const ROOM_RULES: { room: RoomId; re: RegExp; weight: number }[] = [
  { room: 'bano', re: w('baños?|banos?'), weight: 3 },
  { room: 'bano', re: w('bañera|banera|ducha|inodoro|bidet|lavatorio|bidé'), weight: 1 },
  { room: 'cocina', re: w('cocina'), weight: 3 },
  { room: 'cocina', re: w('mesada|isla|alacena|horno|heladera|anafe|bacha'), weight: 1 },
  { room: 'pieza', re: w('pieza|dormitorio|habitación|habitacion|cuarto'), weight: 3 },
  { room: 'pieza', re: w('cómoda|comoda|mesas? de luz|placard|cama|ropero|velador'), weight: 1 },
  { room: 'living', re: w('living|sala|comedor'), weight: 3 },
  { room: 'living', re: w('sillón|sillon|biblioteca|cuadros?'), weight: 1 },
  { room: 'taller', re: w('taller|depósito|deposito|garage|garaje|baulera'), weight: 3 },
  { room: 'taller', re: w('tornillos|herramientas|maleta|caja de herramientas'), weight: 1 },
  { room: 'general', re: w('toda la casa|patio|balcón|balcon|terraza|jardín|jardin'), weight: 2 },
]

const CATEGORY_RULES: { category: CategoryId; re: RegExp }[] = [
  { category: 'venta', re: w('vender|venta|publicar|marketplace|mercado ?libre') },
  { category: 'compras', re: w('comprar|compra') },
  { category: 'electricidad', re: w('enchufes?|tomas?|cablear|cableado|cables?|cable ?canal|luz|luces|led|lámpara|lampara|térmica|termica|eléctric\\p{L}*|electric\\p{L}*|disyuntor') },
  { category: 'carpinteria', re: w('madera|carpinter\\p{L}*|lijar|barnizar|serrucho|melamina') },
  { category: 'limpieza', re: w('limpiar|lavar|desengrasar|aspirar|limpieza|desinfectar') },
  { category: 'orden', re: w('acomodar|ordenar|organizar|guardar|clasificar|tirar') },
  { category: 'montaje', re: w('colgar|montar|instalar|amurar|fijar|soporte|armar') },
  { category: 'arreglo', re: w('arreglar|reparar|pastina|silicona|tapar|pintar|dar vuelta|cambiar|ajustar|sellar') },
]

const WEEKDAYS: [RegExp, number][] = [
  [w('(?:el )?domingo'), 0],
  [w('(?:el )?lunes'), 1],
  [w('(?:el )?martes'), 2],
  [w('(?:el )?miércoles|(?:el )?miercoles'), 3],
  [w('(?:el )?jueves'), 4],
  [w('(?:el )?viernes'), 5],
  [w('(?:el )?sábado|(?:el )?sabado'), 6],
]

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function parseQuickAdd(input: string, knownPeople: string[] = [], now = Date.now()): ParsedTask {
  let text = ` ${input.trim()} `
  const cut = (re: RegExp) => {
    text = text.replace(re, ' ')
  }

  // Prioridad: "!", "!!", "urgente", "importante"
  let priority: Priority = 0
  const bangs = text.match(/(?:^|\s)(!{1,3})(?=\s|$)/)
  if (bangs) {
    priority = bangs[1].length >= 2 ? 2 : 1
    cut(/(?:^|\s)!{1,3}(?=\s|$)/g)
  }
  if (w('urgente').test(text)) {
    priority = 2
    cut(w('urgente', 'giu'))
  } else if (w('importante').test(text)) {
    priority = Math.max(priority, 1) as Priority
    cut(w('importante', 'giu'))
  }

  // Duración: "30min", "1h", "1 h 30", "1,5 hs", "media hora"
  let minutes = 0
  const hours = text.match(/(?<![\p{L}\d])(\d+(?:[.,]\d+)?)\s*(?:h|hs|hr|hrs|horas?)(?:\s*(\d{1,2})\s*(?:m|min|mins|minutos)?)?(?![\p{L}])/iu)
  const mins = text.match(/(?<![\p{L}\d])(\d+)\s*(?:m|min|mins|minutos|')(?![\p{L}])/iu)
  if (hours) {
    minutes = Math.round(parseFloat(hours[1].replace(',', '.')) * 60) + (hours[2] ? parseInt(hours[2], 10) : 0)
    text = text.replace(hours[0], ' ')
  } else if (mins) {
    minutes = parseInt(mins[1], 10)
    text = text.replace(mins[0], ' ')
  } else if (w('media hora').test(text)) {
    minutes = 30
    cut(w('media hora', 'giu'))
  }

  // Personas: "con Nacho", "con Nacho y Sofi" (mayúscula) o nombres ya conocidos
  const people: string[] = []
  const known = new Map(knownPeople.map((p) => [normalize(p), p]))
  text = text.replace(
    /(?<![\p{L}])con\s+(\p{L}+)(?:\s+y\s+(\p{L}+))?/giu,
    (match, a: string, b: string | undefined) => {
      const names = [a, b].filter(Boolean) as string[]
      const accepted = names.filter((n) => /^\p{Lu}/u.test(n) || known.has(normalize(n)))
      if (accepted.length !== names.length || accepted.length === 0) return match
      for (const n of accepted) {
        const name = known.get(normalize(n)) ?? capitalize(n)
        if (!people.includes(name)) people.push(name)
      }
      return ' '
    },
  )

  // Fecha: hoy, mañana, finde, días de la semana
  let due: string | undefined
  if (w('hoy').test(text)) {
    due = isoDate(now)
    cut(w('(?:para )?hoy', 'giu'))
  } else if (w('mañana|manana').test(text)) {
    due = isoDate(addDays(startOfDay(now), 1))
    cut(w('(?:para )?(?:mañana|manana)', 'giu'))
  } else if (w('finde|fin de semana|este finde').test(text)) {
    const day = new Date(now).getDay()
    due = isoDate(day === 0 || day === 6 ? now : nextWeekday(now, 6))
    cut(w('(?:para )?(?:el |este )?(?:finde|fin de semana)', 'giu'))
  } else {
    for (const [re, weekday] of WEEKDAYS) {
      if (re.test(text)) {
        due = isoDate(nextWeekday(now, weekday))
        cut(new RegExp(re.source, 'giu'))
        break
      }
    }
  }

  // Ambiente
  const scores = new Map<RoomId, number>()
  for (const rule of ROOM_RULES) {
    if (rule.re.test(text)) scores.set(rule.room, (scores.get(rule.room) ?? 0) + rule.weight)
  }
  let room: RoomId = 'general'
  let best = 0
  for (const [r, s] of scores) {
    if (s > best) {
      best = s
      room = r
    }
  }
  // Si el ambiente quedó al final como etiqueta ("colgar cuadros living", "… en el baño"), se saca
  // del título; "de la cocina" se deja porque es parte natural de la frase.
  const trailing = /\s+(?:en\s+(?:el|la|los|las)\s+)?(baños?|cocina|pieza|dormitorio|living|comedor|taller|patio)\s*$/iu
  const end = text.trimEnd()
  const tag = end.match(trailing)
  if (tag) {
    const before = end.slice(0, tag.index).trim()
    const prev = before.split(/\s+/).pop()?.toLowerCase() ?? ''
    const isPhrase = !/^\s+en\s/i.test(tag[0]) && ['de', 'del', 'el', 'la', 'los', 'las', 'al'].includes(prev)
    if (!isPhrase && before.length > 2) text = before
  }

  // Tipo
  let category: CategoryId = 'otro'
  for (const rule of CATEGORY_RULES) {
    if (rule.re.test(text)) {
      category = rule.category
      break
    }
  }

  const title = capitalize(text.replace(/\s+/g, ' ').replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '').trim())
  const meta = CATEGORIES[category]

  return {
    title,
    room,
    roomDetected: best > 0,
    category,
    categoryDetected: category !== 'otro',
    minutes: minutes || meta.defaultMinutes,
    minutesDetected: minutes > 0,
    priority,
    people,
    due,
    energy: meta.energy,
    materials: suggestMaterials(title),
  }
}
