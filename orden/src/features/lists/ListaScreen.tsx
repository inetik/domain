import { Check, ListPlus, Pencil, Plus, SearchX, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useData } from '../../app/data'
import { navigate } from '../../app/router'
import { useUI } from '../../app/ui'
import { BackHeader } from '../../components/BackHeader'
import { Button, IconButton } from '../../components/ui/Button'
import { EmptyState, SectionTitle } from '../../components/ui/Feedback'
import { Sheet } from '../../components/ui/Sheet'
import { deleteList, setTaskInList } from '../../db/repo'
import type { TaskList } from '../../db/types'
import { rise, stagger } from '../../design/motion'
import { formatMinutes, plural, ROOMS, strokeFor } from '../../lib/catalog'
import { cn } from '../../lib/cn'
import { isOpen } from '../../lib/stats'
import { smartLists } from '../../lib/smartLists'
import { TaskCard } from '../tasks/TaskCard'
import { ListEditor } from './ListEditor'

export function ListaScreen({ id }: { id: string }) {
  const { tasks, lists, ready } = useData()
  const { openQuickAdd, showToast } = useUI()
  const [editing, setEditing] = useState(false)
  const [picking, setPicking] = useState(false)

  const smart = useMemo(() => smartLists(tasks).find((s) => s.id === id), [tasks, id])
  const custom = lists.find((l) => l.id === id)

  if (!ready) return null
  if (!smart && !custom) {
    return (
      <div>
        <BackHeader to="/listas" label="Listas" />
        <EmptyState icon={SearchX} title="Esta lista ya no existe" action={<Button onClick={() => navigate('/listas')}>Volver a Listas</Button>} />
      </div>
    )
  }

  const inList = smart ? tasks.filter((t) => smart.match(t)) : tasks.filter((t) => t.listIds.includes(custom!.id))
  const open = inList.filter(isOpen)
  const done = inList.filter((t) => t.status === 'hecha')
  const minutes = open.reduce((a, t) => a + t.minutes, 0)
  const color = strokeFor(smart?.color ?? custom!.color)
  const Icon = smart?.icon

  return (
    <motion.div variants={stagger} initial="initial" animate="enter">
      <BackHeader
        to="/listas"
        label="Listas"
        right={
          custom && (
            <div className="flex gap-2">
              <IconButton label="Editar lista" onClick={() => setEditing(true)}>
                <Pencil className="size-4.5" />
              </IconButton>
              <IconButton
                label="Borrar lista"
                onClick={() =>
                  showToast({
                    message: `¿Borrar la lista “${custom.name}”? Las tareas siguen.`,
                    tone: 'warn',
                    action: {
                      label: 'Borrar',
                      onClick: async () => {
                        await deleteList(custom.id)
                        navigate('/listas')
                      },
                    },
                  })
                }
              >
                <Trash2 className="size-4.5 text-danger-ink" />
              </IconButton>
            </div>
          )
        }
      />
      <motion.header variants={rise} className="mt-3 flex items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-[22px] text-[34px]" style={{ background: `color-mix(in oklab, ${color} 22%, transparent)`, color }}>
          {Icon ? <Icon className="size-8" /> : custom!.emoji}
        </span>
        <div className="min-w-0">
          <h1 className="font-serif text-[36px] leading-none tracking-tight text-ink">{smart?.name ?? custom!.name}</h1>
          <p className="mt-1.5 text-callout text-ink-2">
            {plural(open.length, 'pendiente', 'pendientes')} · {formatMinutes(minutes)}
            {smart ? ` · ${smart.description.toLowerCase()}` : ''}
          </p>
        </div>
      </motion.header>

      {custom && (
        <motion.div variants={rise} className="mt-5 flex gap-2">
          <Button className="flex-1" icon={<ListPlus className="size-4" />} onClick={() => setPicking(true)}>
            Sumar existentes
          </Button>
          <Button variant="primary" className="flex-1" icon={<Plus className="size-4" />} onClick={() => openQuickAdd({ listId: custom.id })}>
            Nueva tarea
          </Button>
        </motion.div>
      )}

      <div className="mt-6">
        {open.length === 0 ? (
          <EmptyState
            icon={Check}
            color={color}
            title={inList.length ? '¡Lista terminada!' : 'Lista vacía'}
            body={custom ? 'Sumá tareas que ya tenés o creá una nueva.' : 'Cuando haya tareas que cumplan la condición, aparecen acá.'}
          />
        ) : (
          <AnimatePresence initial={false}>
            {open.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {done.length > 0 && (
        <section className="mt-6">
          <SectionTitle>Hechas</SectionTitle>
          {done.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </section>
      )}

      {custom && (
        <>
          <ListEditor open={editing} onClose={() => setEditing(false)} list={custom} />
          <TaskPicker open={picking} onClose={() => setPicking(false)} list={custom} />
        </>
      )}
    </motion.div>
  )
}

function TaskPicker({ open, onClose, list }: { open: boolean; onClose: () => void; list: TaskList }) {
  const { tasks } = useData()
  const candidates = tasks.filter(isOpen)
  return (
    <Sheet open={open} onClose={onClose} label="Sumar tareas a la lista" footer={<Button variant="primary" size="lg" block onClick={onClose}>Listo</Button>}>
      <h2 className="mt-1 mb-4 font-serif text-[28px] leading-none text-ink">
        Sumar a {list.emoji} {list.name}
      </h2>
      {candidates.map((t) => {
        const inList = t.listIds.includes(list.id)
        const room = ROOMS[t.room]
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTaskInList(t.id, list.id, !inList)}
            aria-pressed={inList}
            className="flex min-h-14 w-full items-center gap-3 border-b border-line py-2 text-left last:border-0"
          >
            <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors', inList ? 'border-transparent' : 'border-line-strong')} style={inList ? { background: list.color } : undefined}>
              {inList && <Check className="size-3.5 text-[#0b0b10]" strokeWidth={3.5} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body text-ink">{t.title}</span>
              <span className="text-caption font-medium" style={{ color: room.ink }}>
                {room.label}
              </span>
            </span>
          </button>
        )
      })}
    </Sheet>
  )
}
