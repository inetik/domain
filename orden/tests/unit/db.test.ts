import { beforeEach, describe, expect, it } from 'vitest'
import { exportBackup, importBackup } from '../../src/db/backup'
import { newerThanLocal } from '../../src/db/merge'
import { addTask, completeTask, deleteTask, reopenTask, revertTask, setMaterialBought, updateTask, wipeAll } from '../../src/db/repo'
import { db } from '../../src/db/schema'
import { SEED_TASKS, seedIfNeeded } from '../../src/db/seed'

beforeEach(async () => {
  await wipeAll()
})

describe('seed', () => {
  it('carga los 13 pendientes una sola vez, con registro', async () => {
    expect(await seedIfNeeded()).toBe(true)
    expect(await db.tasks.count()).toBe(13)
    expect(SEED_TASKS).toHaveLength(13)
    expect(await db.logs.count()).toBe(13)
    expect(await db.lists.count()).toBe(1)
    expect(await seedIfNeeded()).toBe(false)
    expect(await db.tasks.count()).toBe(13)
    const nacho = await db.tasks.filter((t) => t.people.includes('Nacho')).toArray()
    expect(nacho.map((t) => t.title)).toEqual(['Armar la madera para el estante de la isla'])
  })
})

describe('repo', () => {
  it('registra cada cambio de estado', async () => {
    const t = await addTask({ title: 'Probar', room: 'bano', category: 'arreglo' })
    await completeTask(t.id)
    expect((await db.tasks.get(t.id))?.status).toBe('hecha')
    expect((await db.tasks.get(t.id))?.completedAt).toBeTypeOf('number')
    await reopenTask(t.id)
    const logs = (await db.logs.where('taskId').equals(t.id).toArray()).map((l) => l.type).sort()
    expect(logs).toEqual(['creada', 'hecha', 'reabierta'])
  })

  it('agrupa ediciones seguidas en una sola entrada', async () => {
    const t = await addTask({ title: 'Editar' })
    await updateTask(t.id, { notes: 'a' })
    await updateTask(t.id, { notes: 'ab' })
    const edits = await db.logs.where('taskId').equals(t.id).filter((l) => l.type === 'editada').count()
    expect(edits).toBe(1)
  })

  it('deshacer vuelve al estado anterior y borra la anotación', async () => {
    const t = await addTask({ title: 'Deshacer' })
    const logId = await completeTask(t.id)
    await revertTask(t, logId)
    expect((await db.tasks.get(t.id))?.status).toBe('pendiente')
    expect(await db.logs.where('taskId').equals(t.id).filter((l) => l.type === 'hecha').count()).toBe(0)
  })

  it('borrar es suave (se puede recuperar)', async () => {
    const t = await addTask({ title: 'Borrar' })
    await deleteTask(t.id)
    expect((await db.tasks.get(t.id))?.deletedAt).toBeTypeOf('number')
  })

  it('marca materiales comprados en varias tareas', async () => {
    const a = await addTask({ title: 'A', materials: [{ id: 'm1', name: 'Nivel', bought: false }] })
    const b = await addTask({ title: 'B', materials: [{ id: 'm2', name: 'nivel', bought: false }] })
    await setMaterialBought([{ taskId: a.id, materialId: 'm1' }, { taskId: b.id, materialId: 'm2' }], true)
    expect((await db.tasks.get(a.id))?.materials[0].bought).toBe(true)
    expect((await db.tasks.get(b.id))?.materials[0].bought).toBe(true)
  })
})

describe('backup', () => {
  it('exporta e importa sin perder nada (reemplazo)', async () => {
    await seedIfNeeded()
    const t = await addTask({ title: 'Con foto' })
    await db.photos.add({ id: 'p1', taskId: t.id, kind: 'antes', blob: new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/jpeg' }), createdAt: 1 })
    const dump = JSON.parse(JSON.stringify(await exportBackup()))
    await wipeAll()
    expect(await db.tasks.count()).toBe(0)
    const r = await importBackup(dump, 'replace')
    expect(r.tasks).toBe(14)
    expect(await db.tasks.count()).toBe(14)
    const photo = await db.photos.get('p1')
    expect(new Uint8Array(await photo!.blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 250]))
  })

  it('combinar respeta la versión más nueva', async () => {
    const t = await addTask({ title: 'Original' })
    const dump = await exportBackup()
    await updateTask(t.id, { title: 'Editada después' })
    await importBackup(dump, 'merge')
    expect((await db.tasks.get(t.id))?.title).toBe('Editada después')
  })
})

describe('merge', () => {
  it('última escritura gana', () => {
    const local = [
      { id: 'a', updatedAt: 10 },
      { id: 'b', updatedAt: 50 },
    ]
    const incoming = [
      { id: 'a', updatedAt: 20 },
      { id: 'b', updatedAt: 40 },
      { id: 'c', updatedAt: 1 },
    ]
    expect(newerThanLocal(local, incoming).map((r) => r.id)).toEqual(['a', 'c'])
  })
})
