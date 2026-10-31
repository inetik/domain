import { useSyncExternalStore } from 'react'

export type Route =
  | { name: 'casa' }
  | { name: 'pendientes'; room?: string }
  | { name: 'listas' }
  | { name: 'lista'; id: string }
  | { name: 'ferreteria' }
  | { name: 'registro' }
  | { name: 'ajustes' }

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/'
  const [pathname, query = ''] = path.split('?')
  const params = new URLSearchParams(query)
  const parts = pathname.split('/').filter(Boolean)
  switch (parts[0]) {
    case 'pendientes':
      return { name: 'pendientes', room: params.get('ambiente') ?? undefined }
    case 'listas':
      return parts[1] ? { name: 'lista', id: decodeURIComponent(parts.slice(1).join('/')) } : { name: 'listas' }
    case 'ferreteria':
      return { name: 'ferreteria' }
    case 'registro':
      return { name: 'registro' }
    case 'ajustes':
      return { name: 'ajustes' }
    default:
      return { name: 'casa' }
  }
}

function subscribe(fn: () => void) {
  window.addEventListener('hashchange', fn)
  return () => window.removeEventListener('hashchange', fn)
}

export function useHash(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '',
  )
}

export function navigate(to: string) {
  const next = `#${to}`
  if (window.location.hash !== next) window.location.hash = to
  window.scrollTo({ top: 0 })
}

/** Pestaña de la barra inferior a la que pertenece cada ruta. */
export function tabOf(route: Route): 'casa' | 'pendientes' | 'listas' | 'registro' | null {
  switch (route.name) {
    case 'casa':
    case 'ajustes':
      return 'casa'
    case 'pendientes':
      return 'pendientes'
    case 'listas':
    case 'lista':
    case 'ferreteria':
      return 'listas'
    case 'registro':
      return 'registro'
  }
}
