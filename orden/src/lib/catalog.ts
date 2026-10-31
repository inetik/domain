import { Bath, BedDouble, CookingPot, Hammer, HandCoins, House, Package, Ruler, ShoppingCart, Shapes, Sofa, Sparkles, Wrench, Zap, Drill, type LucideIcon } from 'lucide-react'
import type { CategoryId, Energy, RoomId } from '../db/types'

export interface RoomMeta {
  id: RoomId
  label: string
  short: string
  icon: LucideIcon
  /** Color de relleno (fondos, puntos, bordes gruesos) */
  color: string
  /** Color para texto e íconos finos: tiene contraste AA en ambos temas */
  ink: string
}

export const ROOMS: Record<RoomId, RoomMeta> = {
  living: { id: 'living', label: 'Living', short: 'Living', icon: Sofa, color: 'var(--room-living)', ink: 'var(--room-living-ink)' },
  cocina: { id: 'cocina', label: 'Cocina', short: 'Cocina', icon: CookingPot, color: 'var(--room-cocina)', ink: 'var(--room-cocina-ink)' },
  pieza: { id: 'pieza', label: 'Pieza', short: 'Pieza', icon: BedDouble, color: 'var(--room-pieza)', ink: 'var(--room-pieza-ink)' },
  bano: { id: 'bano', label: 'Baño', short: 'Baño', icon: Bath, color: 'var(--room-bano)', ink: 'var(--room-bano-ink)' },
  taller: { id: 'taller', label: 'Taller', short: 'Taller', icon: Wrench, color: 'var(--room-taller)', ink: 'var(--room-taller-ink)' },
  general: { id: 'general', label: 'Toda la casa', short: 'Casa', icon: House, color: 'var(--room-general)', ink: 'var(--room-general-ink)' },
}

/** Colores hex para la escena 3D (WebGL no entiende variables CSS). */
export const ROOM_HEX: Record<RoomId, string> = {
  living: '#7c9cff',
  cocina: '#ff9f5a',
  pieza: '#b48cff',
  bano: '#4fd1c5',
  taller: '#f6c945',
  general: '#9aa4b2',
}

export const ROOM_ORDER: RoomId[] = ['living', 'cocina', 'pieza', 'bano', 'taller', 'general']

export interface CategoryMeta {
  id: CategoryId
  label: string
  icon: LucideIcon
  defaultMinutes: number
  energy: Energy
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  electricidad: { id: 'electricidad', label: 'Electricidad', icon: Zap, defaultMinutes: 60, energy: 'alta' },
  montaje: { id: 'montaje', label: 'Colgar y montar', icon: Drill, defaultMinutes: 45, energy: 'alta' },
  arreglo: { id: 'arreglo', label: 'Arreglo', icon: Hammer, defaultMinutes: 45, energy: 'media' },
  limpieza: { id: 'limpieza', label: 'Limpieza', icon: Sparkles, defaultMinutes: 30, energy: 'media' },
  orden: { id: 'orden', label: 'Orden', icon: Package, defaultMinutes: 30, energy: 'baja' },
  venta: { id: 'venta', label: 'Venta', icon: HandCoins, defaultMinutes: 30, energy: 'baja' },
  carpinteria: { id: 'carpinteria', label: 'Carpintería', icon: Ruler, defaultMinutes: 120, energy: 'alta' },
  compras: { id: 'compras', label: 'Compras', icon: ShoppingCart, defaultMinutes: 45, energy: 'baja' },
  otro: { id: 'otro', label: 'Otro', icon: Shapes, defaultMinutes: 30, energy: 'media' },
}

export const ENERGY_LABEL: Record<Energy, string> = {
  baja: 'Tranqui',
  media: 'Moderada',
  alta: 'Con pila',
}

/** El lima de marca es casi invisible como trazo sobre fondo claro: se cambia por su variante. */
export function strokeFor(color: string): string {
  return color.toLowerCase() === '#c6f432' || color === 'var(--accent)' ? 'var(--accent-stroke)' : color
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

export const PRIORITY_LABEL = ['Normal', 'Importante', 'Urgente'] as const

export const LIST_COLORS = ['#c6f432', '#7c9cff', '#ff9f5a', '#b48cff', '#4fd1c5', '#f6c945', '#f87171', '#f472b6']
export const LIST_EMOJIS = ['🏠', '🔧', '⚡', '🪜', '🧽', '📦', '🛒', '🪵', '🖼️', '🛋️', '🛁', '🍳', '🌿', '🎯', '🚀', '🧰']

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m}` : `${h} h`
}
