import { useLiveQuery } from 'dexie-react-hooks'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { db } from '../db/schema'
import type { Task, TaskList } from '../db/types'

interface Data {
  /** Tareas no borradas */
  tasks: Task[]
  lists: TaskList[]
  ready: boolean
}

const DataContext = createContext<Data>({ tasks: [], lists: [], ready: false })

export function DataProvider({ children }: { children: ReactNode }) {
  const tasks = useLiveQuery(() => db.tasks.toArray(), [])
  const lists = useLiveQuery(() => db.lists.toArray(), [])
  const value = useMemo<Data>(
    () => ({
      tasks: (tasks ?? []).filter((t) => !t.deletedAt).sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt),
      lists: (lists ?? []).filter((l) => !l.deletedAt).sort((a, b) => a.createdAt - b.createdAt),
      ready: tasks !== undefined && lists !== undefined,
    }),
    [tasks, lists],
  )
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  return useContext(DataContext)
}

export function useTask(id: string | null): Task | undefined {
  const { tasks } = useData()
  return useMemo(() => (id ? tasks.find((t) => t.id === id) : undefined), [tasks, id])
}
