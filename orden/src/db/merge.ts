export interface Versioned {
  id: string
  updatedAt: number
}

/**
 * "Última escritura gana": de los registros entrantes, devuelve los que hay que
 * guardar porque no existen localmente o son más nuevos que la copia local.
 */
export function newerThanLocal<T extends Versioned>(local: Iterable<T>, incoming: T[]): T[] {
  const byId = new Map<string, T>()
  for (const r of local) byId.set(r.id, r)
  return incoming.filter((r) => {
    const mine = byId.get(r.id)
    return !mine || r.updatedAt > mine.updatedAt
  })
}
