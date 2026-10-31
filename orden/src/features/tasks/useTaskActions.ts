import { useMemo } from 'react'
import { useUI } from '../../app/ui'
import { completeTask, deleteTask, reopenTask, revertTask, snoozeTask, startTask } from '../../db/repo'
import { db } from '../../db/schema'
import type { Task } from '../../db/types'
import { haptic } from '../../lib/haptics'

/** Acciones de tarea con feedback (vibración + toast con "Deshacer"). */
export function useTaskActions() {
  const { showToast, celebrate } = useUI()
  return useMemo(
    () => ({
      async complete(task: Task) {
        haptic('success')
        const logId = await completeTask(task.id)
        if (!logId) return // ya estaba hecha (doble toque)
        showToast({ message: `¡Hecha! ${task.title}`, tone: 'success', action: { label: 'Deshacer', onClick: () => revertTask(task, logId) } })
        // ¿Era la última del ambiente (o de toda la casa)? Festejo.
        const open = await db.tasks.filter((t) => !t.deletedAt && t.status !== 'hecha').toArray()
        if (open.length === 0) celebrate('casa')
        else if (!open.some((t) => t.room === task.room)) celebrate(task.room)
      },
      async reopen(task: Task) {
        haptic()
        const logId = await reopenTask(task.id)
        if (!logId) return
        showToast({ message: 'Volvió a pendientes', action: { label: 'Deshacer', onClick: () => revertTask(task, logId) } })
      },
      async start(task: Task) {
        haptic()
        await startTask(task.id)
        showToast({ message: '¡Manos a la obra!', tone: 'success' })
      },
      async snooze(task: Task, days = 1) {
        haptic('warn')
        const logId = await snoozeTask(task.id, days)
        showToast({
          message: days === 1 ? 'Pospuesta hasta mañana' : `Pospuesta ${days} días`,
          tone: 'warn',
          action: { label: 'Deshacer', onClick: () => revertTask(task, logId) },
        })
      },
      async remove(task: Task) {
        haptic('warn')
        const logId = await deleteTask(task.id)
        showToast({ message: 'Tarea borrada', tone: 'warn', action: { label: 'Deshacer', onClick: () => revertTask(task, logId) } })
      },
    }),
    [showToast, celebrate],
  )
}
