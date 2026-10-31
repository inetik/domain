import type { RoomId } from '../../db/types'

/** Planta de la casa (unidades de la escena; x → derecha, z → hacia la cámara). */
export interface RoomBox {
  id: RoomId
  x: number
  z: number
  w: number
  d: number
}

export const HOUSE: RoomBox[] = [
  { id: 'pieza', x: -2.0, z: -1.75, w: 4.0, d: 2.7 },
  { id: 'bano', x: 1.05, z: -1.75, w: 2.1, d: 2.7 },
  { id: 'taller', x: 3.05, z: -1.75, w: 1.9, d: 2.7 },
  { id: 'living', x: -1.9, z: 1.3, w: 4.2, d: 3.4 },
  { id: 'cocina', x: 2.1, z: 1.3, w: 3.8, d: 3.4 },
  { id: 'general', x: 0, z: 3.65, w: 8.0, d: 1.1 },
]

export const BOUNDS = { minX: -4, maxX: 4, minZ: -3.1, maxZ: 4.2 }

export interface RoomCounts {
  open: number
  done: number
}
