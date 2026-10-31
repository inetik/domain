export const DAY = 24 * 60 * 60 * 1000

export function isoDate(d: Date | number): string {
  const date = typeof d === 'number' ? new Date(d) : d
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function startOfDay(t: number): number {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function addDays(t: number, days: number): number {
  const d = new Date(t)
  d.setDate(d.getDate() + days)
  return d.getTime()
}

export function parseIsoDate(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

/** Próximo día de la semana (0 = domingo). Si es hoy, devuelve hoy. */
export function nextWeekday(from: number, weekday: number): number {
  const d = new Date(startOfDay(from))
  const diff = (weekday - d.getDay() + 7) % 7
  d.setDate(d.getDate() + diff)
  return d.getTime()
}

const dayFmt = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
const shortFmt = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
const timeFmt = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

export function longDate(t: number): string {
  return dayFmt.format(t)
}

export function time(t: number): string {
  return timeFmt.format(t)
}

export function dayLabel(t: number, now = Date.now()): string {
  const diff = Math.round((startOfDay(now) - startOfDay(t)) / DAY)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  if (diff === -1) return 'Mañana'
  return shortFmt.format(t)
}

export function dueLabel(iso: string, now = Date.now()): string {
  const t = parseIsoDate(iso)
  const diff = Math.round((t - startOfDay(now)) / DAY)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff === -1) return 'Ayer'
  if (diff < 0) return `Hace ${-diff} días`
  if (diff < 7) return new Intl.DateTimeFormat('es-AR', { weekday: 'long' }).format(t)
  return shortFmt.format(t)
}

export function daysAgo(t: number, now = Date.now()): number {
  return Math.floor((startOfDay(now) - startOfDay(t)) / DAY)
}

export function greeting(now = new Date()): string {
  const h = now.getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buen día'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}
