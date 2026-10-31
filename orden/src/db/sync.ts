import type { SupabaseClient } from '@supabase/supabase-js'
import { newerThanLocal } from './merge'
import { normalizeAll, normalizeList, normalizeLog, normalizeTask } from './normalize'
import { onLocalChange } from './repo'
import { db, getMeta, setMeta } from './schema'
import type { Task, TaskList } from './types'

/**
 * Sincronización opcional con Supabase.
 * El teléfono es la fuente principal; la nube guarda una copia y la comparte
 * entre dispositivos con "última escritura gana" por registro.
 */

export interface CloudConfig {
  url: string
  key: string
}

export const CLOUD_SQL = `-- Orden · tabla de sincronización (pegalo en Supabase → SQL Editor → Run)
create table if not exists public.orden_records (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null,
  id text not null,
  data jsonb not null,
  updated_at bigint not null,
  synced_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);
create index if not exists orden_records_synced on public.orden_records (user_id, synced_at);
alter table public.orden_records enable row level security;
drop policy if exists "orden_own_rows" on public.orden_records;
create policy "orden_own_rows" on public.orden_records for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update on public.orden_records to authenticated;
create or replace function public.orden_touch() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then return null; end if;
  new.synced_at := clock_timestamp();
  return new;
end $$;
drop trigger if exists orden_touch on public.orden_records;
create trigger orden_touch before insert or update on public.orden_records
  for each row execute function public.orden_touch();`

type Kind = 'task' | 'list' | 'log'
interface Row {
  user_id: string
  kind: Kind
  id: string
  data: unknown
  updated_at: number
  synced_at?: string
}

let client: SupabaseClient | null = null
let clientKey = ''

async function getClient(): Promise<SupabaseClient | null> {
  const cfg = await getMeta<CloudConfig>('cloud')
  if (!cfg) return null
  const key = `${cfg.url}|${cfg.key}`
  if (!client || clientKey !== key) {
    const { createClient } = await import('@supabase/supabase-js')
    client = createClient(cfg.url, cfg.key, { auth: { persistSession: true, storageKey: 'orden-auth', autoRefreshToken: true } })
    clientKey = key
  }
  return client
}

export async function saveCloudConfig(url: string, key: string) {
  const clean = url.trim().replace(/\/+$/, '')
  if (!/^https:\/\/[\w.-]+$/.test(clean)) throw new Error('La URL tiene que ser del estilo https://xxxx.supabase.co')
  if (key.trim().length < 20) throw new Error('La clave parece incompleta.')
  // Probar la conexión antes de guardar: así los errores aparecen acá y no más tarde
  const { createClient } = await import('@supabase/supabase-js')
  const probe = createClient(clean, key.trim(), { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await probe.from('orden_records').select('id', { head: true, count: 'exact' }).limit(1)
  if (error) throw new Error(humanError(error.message || 'No hay conexión con la nube.'))
  await setMeta('cloud', { url: clean, key: key.trim() } satisfies CloudConfig)
  client = null
}

export async function disconnectCloud() {
  try {
    await (await getClient())?.auth.signOut()
  } catch {
    /* sin conexión: igual se desconecta localmente */
  }
  await db.meta.bulkDelete(['cloud', 'cloudCursor', 'cloudPushedAt', 'lastSyncAt'])
  client = null
}

export interface CloudStatus {
  configured: boolean
  email?: string
  lastSyncAt?: number
}

export async function getCloudStatus(): Promise<CloudStatus> {
  const c = await getClient()
  if (!c) return { configured: false }
  const { data } = await c.auth.getSession()
  return { configured: true, email: data.session?.user.email ?? undefined, lastSyncAt: await getMeta<number>('lastSyncAt') }
}

function humanError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Email o contraseña incorrectos.'
  if (/email not confirmed/i.test(message)) return 'Confirmá tu email (revisá tu correo) y volvé a entrar.'
  if (/already registered/i.test(message)) return 'Ese email ya tiene cuenta: tocá "Entrar".'
  if (/relation .* does not exist|orden_records/i.test(message)) return 'Falta crear la tabla: corré el SQL en Supabase.'
  if (/failed to fetch|network|fetch failed|load failed/i.test(message)) return 'No pude conectarme: revisá la URL y tu internet.'
  if (/invalid api key|jwt|apikey/i.test(message)) return 'La clave no es válida: usá la “anon public” de Settings → API.'
  return message
}

export async function signUp(email: string, password: string) {
  const c = await getClient()
  if (!c) throw new Error('Primero conectá la nube.')
  const { data, error } = await c.auth.signUp({ email, password })
  if (error) throw new Error(humanError(error.message))
  return { needsConfirmation: !data.session }
}

export async function signIn(email: string, password: string) {
  const c = await getClient()
  if (!c) throw new Error('Primero conectá la nube.')
  const { error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw new Error(humanError(error.message))
}

export async function signOut() {
  await (await getClient())?.auth.signOut()
  // Si después entra otra cuenta, que sincronice todo desde cero
  await db.meta.bulkDelete(['cloudCursor', 'cloudPushedAt', 'lastSyncAt'])
}

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

let running: Promise<{ pulled: number; pushed: number }> | null = null

export function syncNow() {
  running ??= doSync().finally(() => {
    running = null
  })
  return running
}

async function doSync(): Promise<{ pulled: number; pushed: number }> {
  const c = await getClient()
  if (!c) throw new Error('La nube no está conectada.')
  const { data: auth } = await c.auth.getSession()
  const session = auth.session
  if (!session) throw new Error('Iniciá sesión en la nube.')
  const userId = session.user.id
  let cursor = (await getMeta<string>('cloudCursor')) ?? '1970-01-01T00:00:00Z'
  const pushedAt = (await getMeta<number>('cloudPushedAt')) ?? 0
  const startedAt = Date.now()

  // 1) Bajar lo nuevo de la nube
  let pulled = 0
  let firstPage = true
  for (;;) {
    // En la primera página, un poco de solapamiento por si una fila se confirmó con un sello
    // apenas anterior al cursor (repetirla no hace daño: la combinación ignora lo que no es más
    // nuevo). Las páginas siguientes avanzan estrictamente para no quedar en un bucle.
    const since = firstPage ? new Date(Date.parse(cursor) - 2 * 60 * 1000).toISOString() : cursor
    firstPage = false
    const { data, error } = await c.from('orden_records').select('kind,id,data,updated_at,synced_at').gt('synced_at', since).order('synced_at', { ascending: true }).limit(1000)
    if (error) throw new Error(humanError(error.message))
    const rows = (data ?? []) as Row[]
    if (!rows.length) break
    const tasks = normalizeAll(
      rows.filter((r) => r.kind === 'task').map((r) => r.data),
      (t) => normalizeTask(t),
    )
    const lists = normalizeAll(
      rows.filter((r) => r.kind === 'list').map((r) => r.data),
      (l) => normalizeList(l),
    )
    const logs = normalizeAll(
      rows.filter((r) => r.kind === 'log').map((r) => r.data),
      normalizeLog,
    )
    await db.transaction('rw', db.tasks, db.lists, db.logs, async () => {
      const t = newerThanLocal(await db.tasks.bulkGet(tasks.map((x) => x.id)).then((a) => a.filter(Boolean) as Task[]), tasks)
      const l = newerThanLocal(await db.lists.bulkGet(lists.map((x) => x.id)).then((a) => a.filter(Boolean) as TaskList[]), lists)
      await db.tasks.bulkPut(t)
      await db.lists.bulkPut(l)
      await db.logs.bulkPut(logs)
      pulled += t.length + l.length
    })
    cursor = rows[rows.length - 1].synced_at ?? cursor
    if (rows.length < 1000) break
  }

  // 2) Subir lo que cambió acá
  const tasks = await db.tasks.where('updatedAt').above(pushedAt).toArray()
  const lists = await db.lists.where('updatedAt').above(pushedAt).toArray()
  const logs = await db.logs.where('at').above(pushedAt).toArray()
  const rows: Row[] = [
    ...tasks.map((t) => ({ user_id: userId, kind: 'task' as const, id: t.id, data: t, updated_at: t.updatedAt })),
    ...lists.map((l) => ({ user_id: userId, kind: 'list' as const, id: l.id, data: l, updated_at: l.updatedAt })),
    ...logs.map((l) => ({ user_id: userId, kind: 'log' as const, id: l.id, data: l, updated_at: l.at })),
  ]
  for (const part of chunks(rows, 500)) {
    const { error } = await c.from('orden_records').upsert(part, { onConflict: 'user_id,kind,id' })
    if (error) throw new Error(humanError(error.message))
  }

  await setMeta('cloudCursor', cursor)
  await setMeta('cloudPushedAt', startedAt)
  await setMeta('lastSyncAt', Date.now())
  return { pulled, pushed: tasks.length + lists.length }
}

/** Sincroniza sola: al abrir, al volver a la app y unos segundos después de cada cambio. */
export function startAutoSync(onDone?: (r: { pulled: number; pushed: number } | Error) => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  const run = async () => {
    const status = await getCloudStatus().catch(() => null)
    if (!status?.configured || !status.email || !navigator.onLine) return
    try {
      onDone?.(await syncNow())
    } catch (err) {
      onDone?.(err as Error)
    }
  }
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(run, 4000)
  }
  const onVisible = () => {
    if (document.visibilityState === 'visible') run()
  }
  const off = onLocalChange(schedule)
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('online', run)
  run()
  return () => {
    off()
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('online', run)
  }
}
