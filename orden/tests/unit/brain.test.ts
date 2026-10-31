import { describe, expect, it } from 'vitest'
import { buildTask } from '../../src/db/repo'
import { SEED_TASKS } from '../../src/db/seed'
import type { Task } from '../../src/db/types'
import { capatazInsights } from '../../src/lib/capataz'
import { DAY } from '../../src/lib/dates'
import { shoppingList } from '../../src/lib/shopping'
import { orderIndex, streak } from '../../src/lib/stats'
import { rankTasks } from '../../src/lib/suggest'

const NOW = new Date(2026, 9, 30, 12, 0).getTime()
const seed = (): Task[] => SEED_TASKS.map((t) => buildTask(t, NOW - DAY))

describe('Capataz', () => {
  it('propone por dónde arrancar con los pendientes reales', () => {
    const ins = capatazInsights(seed(), NOW)
    const ids = ins.map((i) => i.id)
    expect(ids[0]).toBe('urgent')
    expect(ids).toContain('ferreteria')
    expect(ids).toContain('quick')
    expect(ids).toContain('electric')
    expect(ids).toContain('people-Nacho')
  })

  it('festeja cuando no queda nada', () => {
    const done = seed().map((t) => ({ ...t, status: 'hecha' as const, completedAt: NOW }))
    expect(capatazInsights(done, NOW)[0].id).toBe('all-done')
  })
})

describe('¿Qué hago ahora?', () => {
  it('respeta tiempo y energía', () => {
    const r = rankTasks(seed(), { minutes: 15, energy: 'baja' }, NOW)
    expect(r.map((t) => t.title)).toEqual(['Dar vuelta el palo de la cortina'])
    const all = rankTasks(seed(), { minutes: Infinity, energy: 'alta' }, NOW)
    expect(all).toHaveLength(13)
    expect(all[0].title).toBe('Arreglar enchufes de la cocina')
  })
})

describe('stats', () => {
  it('índice ponderado por tiempo y racha', () => {
    const tasks = seed()
    expect(orderIndex(tasks)).toBe(0)
    tasks[0] = { ...tasks[0], status: 'hecha', completedAt: NOW }
    tasks[1] = { ...tasks[1], status: 'hecha', completedAt: NOW - DAY }
    expect(orderIndex(tasks)).toBeGreaterThan(0)
    expect(streak(tasks, NOW)).toBe(2)
  })

  it('arma la lista de ferretería sin duplicados', () => {
    const items = shoppingList(seed())
    const tomas = items.find((i) => i.name === 'Tomacorriente')
    expect(tomas?.refs).toHaveLength(2)
    expect(new Set(items.map((i) => i.key)).size).toBe(items.length)
  })
})
