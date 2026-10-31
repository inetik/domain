import { AlarmClock, CalendarDays, Check, Flame, ListChecks, ShoppingCart, Users } from 'lucide-react'
import { motion, useMotionValue, useTransform, type PanInfo } from 'motion/react'
import { forwardRef, useEffect, useRef, useState } from 'react'
import { useUI } from '../../app/ui'
import { Burst } from '../../components/Burst'
import type { Task } from '../../db/types'
import { spring } from '../../design/motion'
import { CATEGORIES, formatMinutes, ROOMS } from '../../lib/catalog'
import { cn } from '../../lib/cn'
import { haptic } from '../../lib/haptics'
import { dueLabel, isoDate } from '../../lib/dates'
import { useTaskActions } from './useTaskActions'

interface TaskCardProps {
  task: Task
  showRoom?: boolean
}

const THRESHOLD = 96

export const TaskCard = forwardRef<HTMLDivElement, TaskCardProps>(function TaskCard({ task, showRoom = true }, ref) {
  const { openTask } = useUI()
  const actions = useTaskActions()
  const [celebrating, setCelebrating] = useState(false)
  useEffect(() => setCelebrating(false), [task.status])
  const [armed, setArmed] = useState<'done' | 'snooze' | null>(null)
  const x = useMotionValue(0)
  const doneOpacity = useTransform(x, [0, THRESHOLD * 0.6, THRESHOLD], [0, 0.7, 1])
  const snoozeOpacity = useTransform(x, [-THRESHOLD, -THRESHOLD * 0.6, 0], [1, 0.7, 0])
  const iconScale = useTransform(x, [-THRESHOLD, -THRESHOLD * 0.4, 0, THRESHOLD * 0.4, THRESHOLD], [1, 0.75, 0.6, 0.75, 1])

  const room = ROOMS[task.room]
  const category = CATEGORIES[task.category]
  const CatIcon = category.icon
  const RoomIcon = room.icon
  const done = task.status === 'hecha'
  const subDone = task.subtasks.filter((s) => s.done).length
  const missing = task.materials.filter((m) => !m.bought).length
  const overdue = task.due && !done && task.due < isoDate(Date.now())

  const celebrate = () => {
    if (celebrating) return
    if (done) {
      actions.reopen(task)
      return
    }
    setCelebrating(true)
    setTimeout(() => actions.complete(task), 420)
  }

  // Al cruzar el umbral: vibración y el ícono "salta" para avisar que al soltar se aplica
  const draggedAt = useRef(0)
  const onDrag = (_: unknown, info: PanInfo) => {
    draggedAt.current = Date.now()
    const next = info.offset.x > THRESHOLD ? 'done' : info.offset.x < -THRESHOLD && !done ? 'snooze' : null
    if (next !== armed) {
      if (next) haptic()
      setArmed(next)
    }
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    setArmed(null)
    if (info.offset.x > THRESHOLD) celebrate()
    else if (info.offset.x < -THRESHOLD && !done) actions.snooze(task)
  }

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.3, ease: [0.2, 0.8, 0.2, 1] } }}
      transition={spring.gentle}
      className="relative mb-2.5"
      data-testid="task-card"
    >
      <div className="relative overflow-hidden rounded-[22px]">
        {/* Acciones que aparecen al deslizar */}
        <motion.div className="absolute inset-0 flex items-center justify-start rounded-[22px] bg-success pl-6" style={{ opacity: doneOpacity }} aria-hidden>
          <motion.span style={{ scale: iconScale }} animate={armed === 'done' ? { rotate: [0, -8, 8, 0] } : {}} className={cn('flex items-center gap-2 font-semibold text-[#06281b]', armed === 'done' && 'scale-125')}>
            <Check className="size-6" strokeWidth={3} /> {done ? 'Reabrir' : 'Hecha'}
          </motion.span>
        </motion.div>
        <motion.div className="absolute inset-0 flex items-center justify-end rounded-[22px] bg-warn pr-6" style={{ opacity: snoozeOpacity }} aria-hidden>
          <motion.span style={{ scale: iconScale }} animate={armed === 'snooze' ? { rotate: [0, 8, -8, 0] } : {}} className="flex items-center gap-2 font-semibold text-[#2b1d00]">
            Mañana <AlarmClock className="size-6" strokeWidth={2.5} />
          </motion.span>
        </motion.div>

        <motion.div
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1}
          dragSnapToOrigin
          onDrag={onDrag}
          onDragEnd={onDragEnd}
          style={{ x }}
          className={cn('relative flex items-start gap-3 rounded-[22px] border border-line bg-surface-1 p-3.5 pr-4', done && 'opacity-70')}
        >
          <button
            type="button"
            onClick={celebrate}
            aria-label={done ? `Reabrir: ${task.title}` : `Marcar hecha: ${task.title}`}
            className="relative -m-1.5 flex size-11 shrink-0 items-center justify-center"
          >
            <motion.span
              className="flex size-7 items-center justify-center rounded-full border-2"
              style={{ borderColor: done || celebrating ? room.color : room.ink, background: done || celebrating ? room.color : 'transparent' }}
              animate={celebrating ? { scale: [1, 1.35, 1] } : { scale: 1 }}
              transition={spring.bouncy}
            >
              {(done || celebrating) && (
                <motion.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={spring.bouncy}>
                  <Check className="size-4 text-[#0b0b10]" strokeWidth={3.5} />
                </motion.span>
              )}
            </motion.span>
            {celebrating && <Burst />}
          </button>

          <button
            type="button"
            onClick={() => Date.now() - draggedAt.current > 300 && openTask(task.id)}
            className="min-w-0 flex-1 text-left"
            aria-label={`Abrir ${task.title}`}
          >
            <div className="flex items-start gap-2">
              <span className={cn('min-w-0 flex-1 text-[16px] leading-snug font-medium text-ink', done && 'line-through decoration-ink-3')}>{task.title}</span>
              {task.priority > 0 && !done && (
                <Flame className={cn('mt-0.5 size-4 shrink-0', task.priority === 2 ? 'text-danger-ink' : 'text-warn-ink')} fill="currentColor" aria-label={task.priority === 2 ? 'Urgente' : 'Importante'} />
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-3">
              {showRoom && (
                <span className="inline-flex items-center gap-1 font-medium" style={{ color: room.ink }}>
                  <RoomIcon className="size-3.5" /> {room.short}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <CatIcon className="size-3.5" /> {formatMinutes(task.minutes)}
              </span>
              {task.subtasks.length > 0 && (
                <span className="inline-flex items-center gap-1 tabular">
                  <ListChecks className="size-3.5" /> {subDone}/{task.subtasks.length}
                </span>
              )}
              {missing > 0 && !done && (
                <span className="inline-flex items-center gap-1">
                  <ShoppingCart className="size-3.5" /> {missing}
                </span>
              )}
              {task.people.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" /> {task.people.join(', ')}
                </span>
              )}
              {task.due && !done && (
                <span className={cn('inline-flex items-center gap-1', overdue && 'font-semibold text-danger-ink')}>
                  <CalendarDays className="size-3.5" /> {dueLabel(task.due)}
                </span>
              )}
              {task.status === 'en_curso' && <span className="rounded-full bg-accent/15 px-2 py-0.5 font-semibold text-accent-text">En curso</span>}
            </div>
          </button>
        </motion.div>
      </div>
    </motion.div>
  )
})
