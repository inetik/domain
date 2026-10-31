import { useLiveQuery } from 'dexie-react-hooks'
import { Activity, Clock, Flame, Trophy } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useData } from '../../app/data'
import { useUI } from '../../app/ui'
import { AnimatedNumber } from '../../components/ui/AnimatedNumber'
import { EmptyState, SectionTitle, Skeleton } from '../../components/ui/Feedback'
import { db } from '../../db/schema'
import type { LogEntry, Photo } from '../../db/types'
import { rise, stagger } from '../../design/motion'
import { ROOM_ORDER, ROOMS } from '../../lib/catalog'
import { DAY, dayLabel, startOfDay, time } from '../../lib/dates'
import { completedSince, roomSummary, startOfWeek, streak } from '../../lib/stats'
import { usePhotoUrl } from '../tasks/Photos'
import { LOG_META } from './logMeta'

const WEEKS = 16

export function RegistroScreen() {
  const { tasks } = useData()
  const [limit, setLimit] = useState(40)
  const logs = useLiveQuery(() => db.logs.orderBy('at').reverse().limit(limit).toArray(), [limit])
  const photos = useLiveQuery(() => db.photos.orderBy('createdAt').reverse().limit(12).toArray(), [])

  const done = tasks.filter((t) => t.status === 'hecha')
  const week = completedSince(tasks, startOfWeek()).length
  const s = streak(tasks)
  const minutes = done.reduce((a, t) => a + t.minutes, 0)

  return (
    <motion.div variants={stagger} initial="initial" animate="enter" className="space-y-8">
      <motion.header variants={rise} className="pt-2">
        <h1 className="font-serif text-[40px] leading-none tracking-tight text-ink">Registro</h1>
        <p className="mt-2 text-callout text-ink-2">Todo lo que pasó en la casa, para no perder la memoria.</p>
      </motion.header>

      <motion.div variants={rise} className="grid grid-cols-2 gap-3">
        <Stat icon={Trophy} label="Hechas" value={done.length} color="var(--success)" />
        <Stat icon={Activity} label="Esta semana" value={week} color="var(--accent)" />
        <Stat icon={Flame} label={s === 1 ? 'Día de racha' : 'Días de racha'} value={s} color="var(--room-cocina)" />
        <Stat icon={Clock} label="Horas invertidas" value={Math.round(minutes / 6) / 10} color="var(--room-living)" decimals />
      </motion.div>

      <motion.section variants={rise}>
        <SectionTitle>Actividad · últimas {WEEKS} semanas</SectionTitle>
        <Heatmap completions={done.map((t) => t.completedAt!).filter(Boolean)} />
      </motion.section>

      <motion.section variants={rise}>
        <SectionTitle>Por ambiente</SectionTitle>
        <div className="space-y-3 rounded-[24px] border border-line bg-surface-1 p-4">
          {ROOM_ORDER.map((id) => {
            const sum = roomSummary(tasks, id)
            if (!sum.total) return null
            return (
              <div key={id}>
                <div className="mb-1.5 flex justify-between text-footnote">
                  <span className="font-medium text-ink">{ROOMS[id].label}</span>
                  <span className="text-ink-3 tabular">
                    {sum.done}/{sum.total}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-3">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: ROOMS[id].color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${sum.progress * 100}%` }}
                    transition={{ type: 'spring', stiffness: 70, damping: 18, delay: 0.1 }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </motion.section>

      {!!photos?.length && (
        <motion.section variants={rise}>
          <SectionTitle>Antes y después</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <PhotoTile key={p.id} photo={p} />
            ))}
          </div>
        </motion.section>
      )}

      <motion.section variants={rise}>
        <SectionTitle>Línea de tiempo</SectionTitle>
        {!logs ? (
          <div className="space-y-2">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState icon={Activity} title="Todavía no pasó nada" body="Cada cosa que hagas queda anotada acá." />
        ) : (
          <Timeline logs={logs} />
        )}
        {logs && logs.length >= limit && (
          <button type="button" onClick={() => setLimit((l) => l + 40)} className="mt-3 h-12 w-full rounded-2xl bg-surface-2 text-footnote font-semibold text-ink-2">
            Ver más
          </button>
        )}
      </motion.section>
    </motion.div>
  )
}

function Stat({ icon: Icon, label, value, color, decimals }: { icon: typeof Trophy; label: string; value: number; color: string; decimals?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-line bg-surface-1 p-4">
      <div className="absolute -top-8 -right-8 size-20 rounded-full opacity-20 blur-2xl" style={{ background: color }} aria-hidden />
      <Icon className="size-5" style={{ color }} />
      <p className="mt-3 font-serif text-[40px] leading-none text-ink tabular">{decimals ? value.toLocaleString('es-AR') : <AnimatedNumber value={value} />}</p>
      <p className="mt-1 text-footnote text-ink-3">{label}</p>
    </div>
  )
}

function Heatmap({ completions }: { completions: number[] }) {
  const { cells, max } = useMemo(() => {
    const counts = new Map<number, number>()
    for (const t of completions) counts.set(startOfDay(t), (counts.get(startOfDay(t)) ?? 0) + 1)
    const end = startOfWeek() + 6 * DAY
    const start = startOfWeek() - (WEEKS - 1) * 7 * DAY
    const out: { day: number; count: number; future: boolean }[] = []
    const today = startOfDay(Date.now())
    for (let d = start; d <= end + DAY / 2; d = startOfDay(d + DAY * 1.5)) out.push({ day: d, count: counts.get(d) ?? 0, future: d > today })
    return { cells: out, max: Math.max(1, ...counts.values()) }
  }, [completions])

  return (
    <div className="rounded-[24px] border border-line bg-surface-1 p-4">
      <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }} role="img" aria-label="Mapa de actividad">
        {cells.map((c, i) => (
          <motion.div
            key={c.day}
            className="aspect-square rounded-[4px]"
            style={{
              background: c.future ? 'transparent' : c.count ? `color-mix(in oklab, var(--accent) ${30 + (c.count / max) * 70}%, var(--surface-2))` : 'var(--surface-3)',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.004, type: 'spring', stiffness: 400, damping: 25 }}
            title={`${dayLabel(c.day)}: ${c.count}`}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-caption text-ink-3">
        Menos
        {[0, 0.35, 0.65, 1].map((v) => (
          <span key={v} className="size-2.5 rounded-[3px]" style={{ background: v ? `color-mix(in oklab, var(--accent) ${30 + v * 70}%, var(--surface-2))` : 'var(--surface-3)' }} />
        ))}
        Más
      </div>
    </div>
  )
}

function Timeline({ logs }: { logs: LogEntry[] }) {
  const { openTask } = useUI()
  const groups = useMemo(() => {
    const map = new Map<number, LogEntry[]>()
    for (const l of logs) {
      const d = startOfDay(l.at)
      map.set(d, [...(map.get(d) ?? []), l])
    }
    return [...map.entries()]
  }, [logs])

  return (
    <div className="space-y-5" data-testid="timeline">
      {groups.map(([day, entries]) => (
        <div key={day}>
          <p className="mb-2 text-footnote font-semibold text-ink-2 first-letter:uppercase">{dayLabel(day)}</p>
          <div className="overflow-hidden rounded-[22px] border border-line bg-surface-1">
            {entries.map((l, i) => {
              const meta = LOG_META[l.type]
              const Icon = meta.icon
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => openTask(l.taskId)}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-surface-2"
                  style={{ borderTop: i ? '1px solid var(--border)' : undefined }}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in oklab, ${meta.color} 16%, transparent)`, color: meta.color }}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-callout text-ink">{l.taskTitle}</span>
                    <span className="text-caption text-ink-3">
                      {meta.label}
                      {l.detail ? ` · ${l.detail}` : ''} · <span style={{ color: ROOMS[l.room].color }}>{ROOMS[l.room].short}</span>
                    </span>
                  </span>
                  <span className="text-caption text-ink-3 tabular">{time(l.at)}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function PhotoTile({ photo }: { photo: Photo }) {
  const url = usePhotoUrl(photo)
  const { openTask } = useUI()
  return (
    <button type="button" onClick={() => openTask(photo.taskId)} className="relative aspect-square overflow-hidden rounded-2xl bg-surface-2">
      {url && <img src={url} alt="" className="size-full object-cover" />}
      <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">{photo.kind === 'antes' ? 'Antes' : 'Después'}</span>
    </button>
  )
}
