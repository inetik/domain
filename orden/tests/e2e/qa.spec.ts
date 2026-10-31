import { devices, expect, test as base, type Locator, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

/**
 * Regresiones de QA sobre el build de producción (viewport iPhone).
 *
 * - Cada test arranca con un contexto limpio (IndexedDB vacía → 13 pendientes sembrados).
 * - Salvo que el test diga lo contrario, se apaga la casa 3D para que sea rápido y determinista;
 *   la escena 3D se cubre en su propio test.
 * - Falla cualquier test que dispare `pageerror` o `console.error` de la propia app.
 * - El bloque final reproduce los bugs que encontró QA y que ya están arreglados:
 *   si alguno vuelve a aparecer, ese test falla.
 */

const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
      page.on('console', (m) => {
        if (m.type() !== 'error') return
        // Pedidos a hosts externos (p. ej. Supabase) fallan a propósito en el entorno de test.
        if (/Failed to load resource/.test(m.text()) && !/^https?:\/\/localhost/.test(m.location().url)) return
        errors.push(`console.error: ${m.text()}`)
      })
      await use(errors)
      expect(errors, 'errores de JS en la página').toEqual([])
    },
    { auto: true },
  ],
})

async function enter(page: Page, { scene3d = false } = {}) {
  if (!scene3d) await page.addInitScript(() => localStorage.setItem('orden:3d', 'off'))
  await page.goto('./')
  await page.getByTestId('welcome-start').click()
  // En iPhone (user agent) aparece la guía de instalación
  await page.getByRole('button', { name: 'Entendido' }).click()
  await expect(page.getByTestId('welcome')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

async function goPendientes(page: Page) {
  await page.getByTestId('tab-pendientes').click()
  await expect(page.getByTestId('pending-summary')).toBeVisible()
}

const summary = (page: Page) => page.getByTestId('pending-summary')
const card = (page: Page, title: string) => page.getByTestId('task-card').filter({ has: page.getByRole('button', { name: `Abrir ${title}`, exact: true }) })
const detail = (page: Page) => page.getByRole('dialog', { name: /^Tarea:/ })
/** El toast nuevo (durante la salida del anterior puede haber dos en el DOM). */
const toast = (page: Page, text: string | RegExp) => page.getByRole('status').filter({ hasText: text }).last()

async function openTask(page: Page, title: string) {
  await page.getByRole('button', { name: `Abrir ${title}`, exact: true }).click()
  await expect(detail(page)).toHaveAttribute('aria-label', `Tarea: ${title}`)
}

async function closeSheets(page: Page) {
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

/** Espera a que el elemento deje de moverse (animaciones de entrada / layout). */
async function stableBox(locator: Locator) {
  let prev = ''
  await expect
    .poll(async () => {
      const b = await locator.boundingBox()
      const now = b ? `${Math.round(b.x)},${Math.round(b.y)},${Math.round(b.width)},${Math.round(b.height)}` : ''
      const same = now !== '' && now === prev
      prev = now
      return same
    })
    .toBe(true)
  return (await locator.boundingBox())!
}

/** Deslizamiento con toques reales (como en el iPhone), no con mouse. */
async function touchSwipe(page: Page, target: Locator, dx: number) {
  await target.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  const box = await stableBox(target)
  const y = box.y + box.height / 2
  const x0 = dx > 0 ? box.x + 80 : box.x + box.width - 60
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] })
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (dx * i) / 12, y }] })
    await page.waitForTimeout(16)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

interface DbTask {
  title: string
  room: string
  priority: number
  notes: string
  due?: string
  people: string[]
  status: string
  deletedAt?: number
}
interface DbLog {
  taskTitle: string
  type: string
}

function readStore<T>(page: Page, store: 'tasks' | 'logs'): Promise<T[]> {
  return page.evaluate(
    (store) =>
      new Promise<T[]>((resolve, reject) => {
        const req = indexedDB.open('orden')
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const q = req.result.transaction(store).objectStore(store).getAll()
          q.onsuccess = () => {
            resolve(q.result as T[])
            req.result.close()
          }
        }
      }),
    store,
  )
}

const liveTasks = async (page: Page) => (await readStore<DbTask>(page, 'tasks')).filter((t) => !t.deletedAt)

// ---------------------------------------------------------------------------
// Casa
// ---------------------------------------------------------------------------

test('casa 3D: se dibuja y se puede apagar desde Ajustes (queda el plano 2D)', async ({ page }) => {
  await enter(page, { scene3d: true })
  await expect(page.getByTestId('house-3d').locator('canvas')).toBeVisible()
  await page.getByRole('button', { name: 'Ajustes' }).click()
  const toggle = page.getByRole('switch', { name: 'Casa en 3D' })
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await page.getByTestId('tab-casa').click()
  await expect(page.getByTestId('house-2d')).toBeVisible()
  await expect(page.getByTestId('house-3d')).toHaveCount(0)
  await page.reload()
  await expect(page.getByTestId('house-2d')).toBeVisible()
})

test('casa: tocar un ambiente → "Agregar" precarga el ambiente y "Ver tareas" filtra', async ({ page }) => {
  await enter(page)
  await page.getByTestId('house-2d').getByRole('button', { name: /^Cocina:/ }).click()
  await expect(page.getByText('3 pendientes · ~5 h')).toBeVisible()
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Nuevo pendiente' })
  await expect(sheet.getByRole('button', { name: 'Cocina', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('quickadd-input').fill('pasar trapo al piso')
  await expect(page.getByTestId('quickadd-title')).toHaveText('Pasar trapo al piso')
  await page.getByTestId('quickadd-submit').click()
  await expect(toast(page, 'Agregada a Cocina')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Ver tareas' }).click()
  await expect(page).toHaveURL(/#\/pendientes\?ambiente=cocina$/)
  await expect(summary(page)).toContainText('4 abiertas')
  await expect(page.getByRole('group', { name: 'Filtrar por ambiente' }).getByRole('button', { pressed: true })).toContainText('Cocina')
  await expect(card(page, 'Pasar trapo al piso')).toBeVisible()
})

test('capataz: cada tarjeta lleva a su acción', async ({ page }) => {
  await enter(page)
  const capataz = page.getByTestId('capataz')
  // La sugerencia principal del Capataz va en la franja "Ahora"
  await expect(page.getByTestId('ahora')).toContainText('Arreglar enchufes')
  await page.getByTestId('ahora').click()
  await expect(detail(page)).toHaveAttribute('aria-label', 'Tarea: Arreglar enchufes de la cocina')
  await closeSheets(page)

  await capataz.getByRole('button', { name: /Coordiná con Nacho/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Con Nacho')
  await expect(card(page, 'Armar la madera para el estante de la isla')).toBeVisible()

  await page.getByTestId('tab-casa').click()
  await capataz.getByRole('button', { name: /trabajos eléctricos/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Electricidad')
  await expect(page.getByTestId('task-card')).toHaveCount(3)

  await page.getByTestId('tab-casa').click()
  await capataz.getByRole('button', { name: /vuelta a la ferretería/ }).click()
  await expect(page.getByTestId('shopping-list')).toBeVisible()
})

// ---------------------------------------------------------------------------
// ¿Qué hago ahora?
// ---------------------------------------------------------------------------

test('¿Qué hago ahora?: filtra por tiempo/energía, "Otra" rota y "¡Dale!" la pone en curso', async ({ page }) => {
  await enter(page)
  await page.getByTestId('suggest-open').click()
  const sheet = page.getByRole('dialog', { name: '¿Qué hago ahora?' })
  await sheet.getByRole('button', { name: '30 min' }).click()
  await sheet.getByRole('button', { name: /Tranqui/ }).click()
  await expect(page.getByTestId('suggest-roll')).toHaveText('Elegime una (4 posibles)')
  await page.getByTestId('suggest-roll').click()
  const first = (await page.getByTestId('suggest-card').locator('p').first().textContent())!
  await sheet.getByRole('button', { name: 'Otra' }).click()
  await expect(page.getByTestId('suggest-card').locator('p').first()).not.toHaveText(first)

  // 15 min + Tranqui → una sola opción posible
  await sheet.getByRole('button', { name: 'Cambiar tiempo o energía' }).click()
  await sheet.getByRole('button', { name: '15 min' }).click()
  await expect(page.getByTestId('suggest-roll')).toHaveText('Elegime una (1 posibles)')
  await page.getByTestId('suggest-roll').click()
  await expect(page.getByTestId('suggest-card')).toContainText('Dar vuelta el palo de la cortina')
  await expect(sheet.getByRole('button', { name: 'Otra' })).toBeDisabled()
  await sheet.getByRole('button', { name: '¡Dale, la hago!' }).click()
  await expect(toast(page, 'Está en curso')).toBeVisible()
  await expect(detail(page)).toHaveAttribute('aria-label', 'Tarea: Dar vuelta el palo de la cortina')
  await closeSheets(page)
  await page.goto('./#/listas/smart%3Aen-curso')
  await expect(page.getByTestId('task-card')).toHaveCount(1)
  await expect(card(page, 'Dar vuelta el palo de la cortina')).toContainText('En curso')
})

// ---------------------------------------------------------------------------
// Pendientes
// ---------------------------------------------------------------------------

test('pendientes: deslizar ← pospone (con Deshacer), aparece en Pospuestas y persiste', async ({ page }) => {
  await enter(page)
  await goPendientes(page)
  await expect(summary(page)).toContainText('13 abiertas')
  await touchSwipe(page, card(page, 'Colgar estantes'), -220)
  await expect(summary(page)).toContainText('12 abiertas')
  await expect(toast(page, 'Pospuesta hasta mañana')).toBeVisible()
  await expect(detail(page)).toHaveCount(0) // deslizar no abre el detalle
  await page.getByRole('status').getByRole('button', { name: 'Deshacer' }).last().click()
  await expect(summary(page)).toContainText('13 abiertas')
  await expect(page.getByRole('button', { name: /^Pospuestas/ })).toHaveCount(0)

  await touchSwipe(page, card(page, 'Colgar estantes'), -220)
  await expect(summary(page)).toContainText('12 abiertas')
  await page.reload()
  await expect(summary(page)).toContainText('12 abiertas')
  const pospuestas = page.getByRole('button', { name: 'Pospuestas (1)' })
  await pospuestas.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await pospuestas.click()
  await expect(pospuestas).toHaveAttribute('aria-expanded', 'true')
  await expect(card(page, 'Colgar estantes')).toBeVisible()
})

test('pendientes: deslizar → completa; Hechas permite reabrir y Deshacer vuelve atrás', async ({ page }) => {
  await enter(page)
  await goPendientes(page)
  await touchSwipe(page, card(page, 'Colgar los cuadros'), 220)
  await expect(summary(page)).toContainText('12 abiertas')
  await expect(detail(page)).toHaveCount(0)
  const hechas = page.getByRole('button', { name: 'Hechas (1)' })
  await hechas.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await hechas.click()
  await page.getByRole('button', { name: 'Reabrir: Colgar los cuadros' }).click()
  await expect(summary(page)).toContainText('13 abiertas')
  await expect(toast(page, 'Volvió a pendientes')).toBeVisible()
  await page.getByRole('status').getByRole('button', { name: 'Deshacer' }).last().click()
  await expect(summary(page)).toContainText('12 abiertas')
  await page.reload()
  await expect(summary(page)).toContainText('12 abiertas')
})

test('pendientes: búsqueda, filtros por ambiente/tipo, estado vacío y agrupar (persistente)', async ({ page }) => {
  await enter(page)
  await goPendientes(page)
  const search = page.getByLabel('Buscar')
  await search.fill('tarugos') // materiales
  await expect(summary(page)).toContainText('3 abiertas')
  await search.fill('NACHO') // personas, sin importar mayúsculas
  await expect(page.getByTestId('task-card')).toHaveCount(1)
  await search.fill('termica') // notas, sin tildes
  await expect(summary(page)).toContainText('3 abiertas')
  await page.getByRole('button', { name: 'Borrar búsqueda' }).click()
  await expect(summary(page)).toContainText('13 abiertas')

  await page.getByRole('group', { name: 'Filtrar por ambiente' }).getByRole('button', { name: /^Taller/ }).click()
  await page.getByRole('group', { name: 'Filtrar por tipo' }).getByRole('button', { name: 'Electricidad' }).click()
  await expect(page.getByText('Nada con ese filtro')).toBeVisible()
  await page.getByRole('button', { name: 'Agregar acá' }).click()
  await expect(page.getByRole('dialog', { name: 'Nuevo pendiente' }).getByRole('button', { name: 'Taller', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await closeSheets(page)
  await page.getByRole('button', { name: 'Ver todo' }).click()
  await expect(summary(page)).toContainText('13 abiertas')

  await page.getByRole('radio', { name: 'Prioridad' }).click()
  const groups = page.getByTestId('pending-list').locator('section h2')
  await expect(groups).toHaveText(['Urgente', 'Importante', 'Normal'])
  await page.reload()
  await expect(page.getByRole('radio', { name: 'Prioridad' })).toHaveAttribute('aria-checked', 'true')
  await expect(groups).toHaveText(['Urgente', 'Importante', 'Normal'])
})

// ---------------------------------------------------------------------------
// Detalle de tarea
// ---------------------------------------------------------------------------

test('detalle: título, pasos, materiales, notas y ajustes se guardan y sobreviven a recargar', async ({ page }) => {
  await enter(page)
  await goPendientes(page)
  await openTask(page, 'Colgar estantes')
  const d = detail(page)

  // Título: se guarda aunque se cierre antes del debounce
  await d.getByLabel('Título').fill('Colgar estantes del living')
  await closeSheets(page)
  await openTask(page, 'Colgar estantes del living')

  // Se espera cada alta antes de la siguiente: dos altas seguidas pueden pisarse (ver reporte de QA).
  await d.getByLabel('Agregar un paso').fill('Medir la pared')
  await d.getByLabel('Agregar un paso').press('Enter')
  await expect(d.getByRole('button', { name: 'Quitar Medir la pared' })).toBeVisible()
  await d.getByLabel('Agregar un paso').fill('Marcar')
  await d.getByLabel('Agregar un paso').press('Enter')
  await expect(d.getByRole('button', { name: 'Quitar Marcar' })).toBeVisible()
  await expect(d.getByText('0/2', { exact: true })).toBeVisible()
  await d.getByRole('button', { name: 'Medir la pared', exact: true }).click()
  await expect(d.getByRole('button', { name: 'Medir la pared', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await d.getByRole('button', { name: 'Quitar Marcar' }).click()
  await expect(d.getByRole('button', { name: 'Marcar', exact: true })).toHaveCount(0)

  await expect(d.getByText('0/3 comprados')).toBeVisible()
  await d.getByRole('button', { name: 'Soportes', exact: true }).click() // material sugerido
  await expect(d.getByRole('button', { name: 'Quitar Soportes' })).toBeVisible()
  await d.getByLabel('Agregar material').fill('Mecha widia 6 mm')
  await d.getByLabel('Agregar material').press('Enter')
  await expect(d.getByRole('button', { name: 'Quitar Mecha widia 6 mm' })).toBeVisible()
  await d.getByRole('button', { name: 'Tornillos', exact: true }).click() // marcar comprado
  await expect(d.getByText('1/5 comprados')).toBeVisible()

  await d.getByLabel('Notas').fill('Medidas: 80 cm')
  await expect.poll(async () => (await liveTasks(page)).find((t) => t.title === 'Colgar estantes del living')?.notes).toBe('Medidas: 80 cm')

  await d.getByRole('button', { name: 'Taller', exact: true }).click()
  await d.getByRole('button', { name: 'Arreglo', exact: true }).click()
  await d.getByRole('button', { name: '1 h 30', exact: true }).click()
  await d.getByRole('radio', { name: 'Tranqui' }).click()
  await d.getByRole('radio', { name: 'Urgente' }).click()
  await d.getByLabel('Fecha objetivo').fill('2030-01-15')
  await d.getByLabel('Sumar persona (ej: Nacho)').fill('sofi')
  await d.getByLabel('Sumar persona (ej: Nacho)').press('Enter')
  await expect(d.getByRole('button', { name: 'Quitar a Sofi' })).toBeVisible()
  await d.getByRole('button', { name: /Para este finde/ }).click()
  await expect(d.getByRole('button', { name: /Para este finde/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(d.locator('ol li').first()).toContainText('Editada')
  await closeSheets(page)

  await page.reload()
  await goPendientes(page)
  await expect(page.getByTestId('pending-list').locator('section', { hasText: 'Taller' })).toContainText('Colgar estantes del living')
  await openTask(page, 'Colgar estantes del living')
  await expect(d.getByLabel('Notas')).toHaveValue('Medidas: 80 cm')
  await expect(d.getByLabel('Fecha objetivo')).toHaveValue('2030-01-15')
  await expect(d.getByRole('radio', { name: 'Urgente' })).toHaveAttribute('aria-checked', 'true')
  await expect(d.getByRole('radio', { name: 'Tranqui' })).toHaveAttribute('aria-checked', 'true')
  await expect(d.getByRole('button', { name: '1 h 30', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(d.getByRole('button', { name: 'Medir la pared', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(d.getByText('1/5 comprados')).toBeVisible()
  await expect(d.getByRole('button', { name: 'Quitar a Sofi' })).toBeVisible()
  await expect(d.getByRole('button', { name: /Para este finde/ })).toHaveAttribute('aria-pressed', 'true')
})

test('detalle: duplicar (pasos y materiales sin marcar), borrar con Deshacer, completar y reabrir', async ({ page }) => {
  await enter(page)
  await goPendientes(page)
  await openTask(page, 'Colgar la tele')
  const d = detail(page)
  await d.getByRole('button', { name: 'Marcar altura y nivel', exact: true }).click()
  await expect(d.getByRole('button', { name: 'Marcar altura y nivel', exact: true })).toHaveAttribute('aria-pressed', 'true')

  await d.getByRole('button', { name: 'Duplicar' }).click()
  await expect(d).toHaveAttribute('aria-label', 'Tarea: Colgar la tele (copia)')
  await expect(d.getByRole('button', { name: 'Marcar altura y nivel', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(d.getByText('0/4 comprados')).toBeVisible()
  await expect(summary(page)).toContainText('14 abiertas')

  await d.getByRole('button', { name: 'Borrar' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(summary(page)).toContainText('13 abiertas')
  await expect(toast(page, 'Tarea borrada')).toBeVisible()
  await page.getByRole('status').getByRole('button', { name: 'Deshacer' }).last().click()
  await expect(summary(page)).toContainText('14 abiertas')

  await openTask(page, 'Colgar la tele (copia)')
  await page.getByTestId('detail-complete').click()
  await expect(d.getByText('¡Hecha!')).toBeVisible()
  await expect(summary(page)).toContainText('13 abiertas')
  await d.getByRole('button', { name: 'Reabrir' }).click()
  await expect(page.getByTestId('detail-complete')).toBeVisible()
  await expect(summary(page)).toContainText('14 abiertas')

  await d.getByRole('button', { name: 'Posponer a mañana' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(summary(page)).toContainText('13 abiertas')
  await page.reload()
  await expect(summary(page)).toContainText('13 abiertas')
  await expect(page.getByRole('button', { name: 'Pospuestas (1)' })).toBeVisible()
})

// ---------------------------------------------------------------------------
// Carga rápida
// ---------------------------------------------------------------------------

test('carga rápida: los chips pisan lo detectado, "+ Otra" sigue abierta y Enter agrega', async ({ page }) => {
  await enter(page)
  await page.getByTestId('fab-add').click()
  const sheet = page.getByRole('dialog', { name: 'Nuevo pendiente' })
  const input = page.getByTestId('quickadd-input')
  await expect(input).toBeFocused()
  await input.fill('colgar espejo baño con Nacho mañana 30min !')
  await expect(page.getByTestId('quickadd-title')).toHaveText('Colgar espejo')
  await expect(sheet.getByRole('button', { name: 'Baño', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(sheet.getByRole('radio', { name: 'Importante' })).toHaveAttribute('aria-checked', 'true')
  await expect(sheet.getByRole('button', { name: 'Quitar a Nacho' })).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Quitar fecha' })).toBeVisible()

  await sheet.getByRole('button', { name: 'Taller', exact: true }).click()
  await sheet.getByRole('radio', { name: 'Urgente' }).click()
  await sheet.getByRole('button', { name: 'Quitar a Nacho' }).click()
  await sheet.getByRole('button', { name: 'Quitar fecha' }).click()
  await sheet.getByRole('button', { name: '+ Otra' }).click()
  await expect(toast(page, 'Agregada a Taller')).toBeVisible()
  await expect(input).toHaveValue('')
  await expect(sheet.getByText('+1', { exact: true })).toBeVisible()
  await expect(sheet.getByRole('radio', { name: 'Normal' })).toHaveAttribute('aria-checked', 'true')

  await input.fill('limpiar vidrios living 20min')
  await input.press('Enter')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await goPendientes(page)
  await expect(summary(page)).toContainText('15 abiertas')
  const espejo = (await liveTasks(page)).find((t) => t.title === 'Colgar espejo')!
  expect(espejo).toMatchObject({ room: 'taller', priority: 2, people: [] })
  expect(espejo.due).toBeUndefined()
  const vidrios = (await liveTasks(page)).find((t) => t.title === 'Limpiar vidrios')!
  expect(vidrios).toMatchObject({ room: 'living' })
})

// ---------------------------------------------------------------------------
// Listas
// ---------------------------------------------------------------------------

test('listas propias: crear con emoji y color, sumar existentes, nueva tarea, editar y borrar', async ({ page }) => {
  await enter(page)
  await page.getByTestId('tab-listas').click()
  await page.getByTestId('new-list').click()
  const editor = page.getByRole('dialog', { name: 'Nueva lista' })
  await expect(editor.getByRole('button', { name: 'Crear lista' })).toBeDisabled()
  await editor.getByLabel('Nombre de la lista').fill('Finde eléctrico')
  await editor.getByRole('button', { name: '⚡' }).click()
  await editor.getByRole('button', { name: 'Color #f87171' }).click()
  await editor.getByRole('button', { name: 'Crear lista' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Finde eléctrico')
  await expect(page.getByText('Lista vacía')).toBeVisible()

  await page.getByRole('button', { name: 'Sumar existentes' }).click()
  const picker = page.getByRole('dialog', { name: 'Sumar tareas a la lista' })
  await picker.getByRole('button', { name: /Arreglar enchufes de la cocina/ }).click()
  await picker.getByRole('button', { name: /Armar cable y cablear/ }).click()
  await picker.getByRole('button', { name: /Armar cable y cablear/ }).click() // vuelve a sacarla
  await picker.getByRole('button', { name: /Armar conexión/ }).click()
  await picker.getByRole('button', { name: 'Listo' }).click()
  await expect(page.getByTestId('task-card')).toHaveCount(2)

  await page.getByRole('button', { name: 'Nueva tarea' }).click()
  await expect(page.getByRole('dialog', { name: 'Nuevo pendiente' })).toContainText('Se suma a la lista ⚡ Finde eléctrico')
  await page.getByTestId('quickadd-input').fill('revisar disyuntor taller')
  await page.getByTestId('quickadd-submit').click()
  await expect(page.getByTestId('task-card')).toHaveCount(3)

  await page.getByRole('button', { name: 'Editar lista' }).click()
  const edit = page.getByRole('dialog', { name: 'Editar lista' })
  await expect(edit.getByLabel('Nombre de la lista')).toHaveValue('Finde eléctrico')
  await edit.getByLabel('Nombre de la lista').fill('Eléctrico')
  await edit.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Eléctrico')
  const listUrl = page.url()

  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Eléctrico')
  await expect(page.getByTestId('task-card')).toHaveCount(3)

  await page.getByRole('button', { name: 'Borrar lista' }).click()
  // Pide confirmación en el aviso antes de borrar
  await expect(toast(page, 'Las tareas siguen')).toBeVisible()
  await page.getByRole('status').getByRole('button', { name: 'Borrar' }).click()
  await expect(page).toHaveURL(/#\/listas$/)
  await expect(page.getByRole('button', { name: /Eléctrico/ })).toHaveCount(0)
  await page.goto(listUrl)
  await expect(page.getByText('Esta lista ya no existe')).toBeVisible()
  await goPendientes(page)
  await expect(summary(page)).toContainText('14 abiertas')
})

test('listas inteligentes: cuentan bien y abren sus tareas', async ({ page }) => {
  await enter(page)
  await page.getByTestId('tab-listas').click()
  const row = (name: string) => page.getByRole('button', { name: new RegExp(`^${name}`) })
  await expect(row('Rápidas')).toContainText('5')
  await expect(row('Prioritarias')).toContainText('3')
  await expect(row('Electricidad')).toContainText('3')
  await expect(row('Con Nacho')).toContainText('1')
  await row('Prioritarias').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Prioritarias')
  await expect(page.getByTestId('task-card')).toHaveCount(3)
})

test('ferretería: junta materiales (×N), tachar mueve a "Ya comprado" y Deshacer lo devuelve', async ({ page }) => {
  await enter(page)
  await page.getByTestId('tab-listas').click()
  await page.getByTestId('ferreteria-card').click()
  const list = page.getByTestId('shopping-list')
  await expect(list.getByRole('button', { name: /^Marcar comprado/ })).toHaveCount(27)
  await expect(list.locator('p', { hasText: 'Tomacorriente' })).toContainText('×2')

  await list.getByRole('button', { name: 'Marcar comprado: Antisarro' }).click()
  await expect(toast(page, 'Antisarro: comprado')).toBeVisible()
  await expect(list.getByRole('button', { name: /^Marcar comprado/ })).toHaveCount(26)
  await expect(page.getByText('Ya comprado (1)')).toBeVisible()
  await page.getByRole('status').getByRole('button', { name: 'Deshacer' }).last().click()
  await expect(list.getByRole('button', { name: 'Marcar comprado: Antisarro' })).toBeVisible()
  await expect(page.getByText(/Ya comprado/)).toHaveCount(0)

  // Tachar un material compartido lo marca en todas las tareas
  await list.getByRole('button', { name: 'Marcar comprado: Tarugos 8 mm' }).click()
  await expect(page.getByText('Ya comprado (1)')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Ya comprado (1)')).toBeVisible()
  await goPendientes(page)
  await openTask(page, 'Colgar estantes')
  await expect(detail(page).getByRole('button', { name: 'Tarugos 8 mm', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

// ---------------------------------------------------------------------------
// Registro
// ---------------------------------------------------------------------------

test('registro: estadísticas, línea de tiempo y progreso por ambiente', async ({ page }) => {
  await enter(page)
  await goPendientes(page)
  await page.getByRole('button', { name: 'Marcar hecha: Dar vuelta el palo de la cortina' }).click()
  await expect(summary(page)).toContainText('12 abiertas')
  await page.getByRole('button', { name: 'Marcar hecha: Limpiar grifería de los baños' }).click()
  await expect(summary(page)).toContainText('11 abiertas')
  await page.getByTestId('tab-registro').click()

  const stat = (label: string) => page.getByText(label, { exact: true }).locator('xpath=..')
  await expect(stat('Hechas')).toContainText('2')
  await expect(stat('Esta semana')).toContainText('2')
  await expect(stat('Día de racha')).toContainText('1')
  await expect(stat('Horas invertidas')).toContainText('0,8')
  await expect(page.getByRole('img', { name: 'Mapa de actividad' }).locator('> div')).toHaveCount(16 * 7)
  await expect(page.locator('section', { hasText: 'Por ambiente' })).toContainText('Baño2/3')
  const timeline = page.getByTestId('timeline')
  await expect(timeline.getByRole('button', { name: /Limpiar grifería de los baños.*Hecha/ })).toBeVisible()
  await timeline.getByRole('button', { name: /Dar vuelta el palo de la cortina.*Hecha/ }).click()
  await expect(detail(page)).toHaveAttribute('aria-label', 'Tarea: Dar vuelta el palo de la cortina')
})

// ---------------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------------

test('ajustes: el tema claro/oscuro/automático se aplica y persiste', async ({ page }) => {
  await enter(page)
  await page.goto('./#/ajustes')
  const html = page.locator('html')
  await page.getByRole('radio', { name: 'Oscuro' }).click()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('radio', { name: 'Oscuro' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('radio', { name: 'Claro' }).click()
  await expect(html).toHaveAttribute('data-theme', 'light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.getByRole('radio', { name: 'Automático' }).click()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(html).toHaveAttribute('data-theme', 'light')
})

test('ajustes: la nube valida URL y clave sin romper nada', async ({ page }) => {
  await enter(page)
  await page.goto('./#/ajustes')
  const url = page.getByLabel('URL del proyecto')
  const key = page.getByLabel('Clave anon')
  const connect = page.getByRole('button', { name: 'Conectar' })
  await expect(connect).toBeDisabled()
  const error = page.locator('p.text-danger, p.text-danger-ink')
  await url.fill('http://abc.supabase.co')
  await key.fill('x'.repeat(40))
  await connect.click()
  await expect(error).toHaveText('La URL tiene que ser del estilo https://xxxx.supabase.co')
  await url.fill('https://abc.supabase.co/rest/v1')
  await connect.click()
  await expect(error).toHaveText('La URL tiene que ser del estilo https://xxxx.supabase.co')
  await url.fill('https://abc.supabase.co/')
  await key.fill('corta')
  await connect.click()
  await expect(error).toHaveText('La clave parece incompleta.')
  await expect(page.getByText('Algo se trabó')).toHaveCount(0)
})

test('copia de seguridad: combinar respeta lo más nuevo, reemplazar vuelve a la copia, archivo inválido avisa', async ({ page }) => {
  await enter(page)
  await page.goto('./#/ajustes')
  const download = page.waitForEvent('download')
  await page.getByTestId('backup-save').click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/^orden-copia-\d{4}-\d{2}-\d{2}\.json$/)
  const path = (await file.path())!
  const backup = JSON.parse(readFileSync(path, 'utf8'))
  expect(backup).toMatchObject({ app: 'orden', version: 1 })
  expect(backup.tasks).toHaveLength(13)
  await expect(page.getByText(/Última copia: hoy/)).toBeVisible()

  // Cambios posteriores a la copia
  await page.getByTestId('fab-add').click()
  await page.getByTestId('quickadd-input').fill('tarea posterior a la copia')
  await page.getByTestId('quickadd-submit').click()
  await goPendientes(page)
  await page.getByRole('button', { name: 'Marcar hecha: Colgar estantes' }).click()
  await expect(summary(page)).toContainText('13 abiertas')

  await page.goto('./#/ajustes')
  await page.getByTestId('backup-input').setInputFiles(path)
  const restore = page.getByRole('dialog', { name: 'Restaurar copia' })
  await expect(restore).toContainText('13 tareas')
  await restore.getByRole('button', { name: 'Combinar con lo que tengo' }).click()
  await expect(toast(page, 'ya tenías todo al día')).toBeVisible()
  await goPendientes(page)
  await expect(summary(page)).toContainText('13 abiertas') // "última escritura gana": no pisa lo local
  await expect(card(page, 'Tarea posterior a la copia')).toBeVisible()

  await page.goto('./#/ajustes')
  await page.getByTestId('backup-input').setInputFiles(path)
  await restore.getByRole('button', { name: 'Reemplazar todo' }).click()
  await expect(toast(page, 'Copia restaurada')).toBeVisible()
  await goPendientes(page)
  await expect(summary(page)).toContainText('13 abiertas')
  await expect(card(page, 'Tarea posterior a la copia')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Hechas/ })).toHaveCount(0)

  await page.goto('./#/ajustes')
  await page.getByTestId('backup-input').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('esto no es json') })
  await expect(toast(page, 'El archivo no es una copia válida de Orden.')).toBeVisible()
  await page.getByTestId('backup-input').setInputFiles({ name: 'y.json', mimeType: 'application/json', buffer: Buffer.from('{"app":"otra"}') })
  await expect(toast(page, 'El archivo no es una copia válida de Orden.')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('ajustes: "Borrar todo" pide confirmación y vuelve a los 13 pendientes', async ({ page }) => {
  await enter(page)
  await page.getByTestId('tab-listas').click()
  await page.getByTestId('new-list').click()
  await page.getByLabel('Nombre de la lista').fill('Temporal')
  await page.getByRole('button', { name: 'Crear lista' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Temporal')
  await goPendientes(page)
  await page.getByRole('button', { name: 'Marcar hecha: Colgar estantes' }).click()
  await expect(summary(page)).toContainText('12 abiertas')

  await page.goto('./#/ajustes')
  await page.getByRole('button', { name: 'Borrar todo y empezar de cero' }).click()
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByRole('button', { name: 'Borrar todo y empezar de cero' })).toBeVisible()
  await page.getByRole('button', { name: 'Borrar todo y empezar de cero' }).click()
  await page.getByRole('button', { name: 'Borrar todo', exact: true }).click()
  await expect(toast(page, 'Empezaste de cero')).toBeVisible()
  await goPendientes(page)
  await expect(summary(page)).toContainText('13 abiertas')
  await expect(page.getByRole('button', { name: /^Hechas/ })).toHaveCount(0)
  await page.getByTestId('tab-listas').click()
  await expect(page.getByRole('button', { name: /Temporal/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Para este finde/ })).toBeVisible()
})

// ---------------------------------------------------------------------------
// Pantalla chica (iPhone SE, 320 px)
// ---------------------------------------------------------------------------

test.describe('iPhone SE', () => {
  const { defaultBrowserType: _ignored, ...se } = devices['iPhone SE']
  test.use(se)

  test('sin scroll horizontal y el contenido final no queda tapado por la barra', async ({ page }) => {
    await enter(page)
    for (const route of ['#/', '#/pendientes', '#/listas', '#/ferreteria', '#/registro', '#/ajustes']) {
      await page.goto(`./${route}`)
      await expect(page.getByTestId('tab-casa')).toBeVisible()
      await page.waitForLoadState('networkidle')
      const r = await page.evaluate(async () => {
        const overflow = document.documentElement.scrollWidth - innerWidth
        for (let i = 0; i < 10; i++) {
          scrollTo(0, document.documentElement.scrollHeight)
          await new Promise((res) => setTimeout(res, 100))
        }
        const navTop = document.querySelector('nav[aria-label=Secciones]')!.getBoundingClientRect().top
        const last = [...document.querySelectorAll('main button, main p, main h2')].filter((e) => e.getBoundingClientRect().height).pop()!
        return { overflow, lastBottom: last.getBoundingClientRect().bottom, navTop }
      })
      expect(r.overflow, `scroll horizontal en ${route}`).toBeLessThanOrEqual(0)
      expect(r.lastBottom, `contenido tapado por la barra en ${route}`).toBeLessThanOrEqual(r.navTop)
    }
  })
})

// ---------------------------------------------------------------------------
// Regresiones: bugs que encontró QA (ya arreglados)
// ---------------------------------------------------------------------------

test.describe('regresiones', () => {
  test('en el detalle, "Borrar" queda fuera de la pantalla', async ({ page }) => {
    await enter(page)
    await goPendientes(page)
    await openTask(page, 'Colgar estantes')
    const borrar = detail(page).getByRole('button', { name: 'Borrar' })
    await borrar.evaluate((el) => el.closest('.overflow-y-auto')!.scrollTo(0, 1e6))
    const box = (await borrar.boundingBox())!
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  })

  test('doble toque en "Agregar" crea la tarea dos veces', async ({ page }) => {
    await enter(page)
    await page.getByTestId('fab-add').click()
    await page.getByTestId('quickadd-input').fill('barrer la vereda 15min')
    await page.getByTestId('quickadd-submit').dblclick()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await goPendientes(page)
    await expect(page.getByTestId('task-card').filter({ hasText: 'Barrer la vereda' })).toHaveCount(1)
  })

  test('doble toque en el círculo de completar deja un "Hecha" huérfano después de Deshacer', async ({ page }) => {
    await enter(page)
    await goPendientes(page)
    await page.getByRole('button', { name: 'Marcar hecha: Colgar estantes' }).dblclick()
    await expect(summary(page)).toContainText('12 abiertas')
    await page.getByRole('status').getByRole('button', { name: 'Deshacer' }).last().click()
    await expect(summary(page)).toContainText('13 abiertas')
    const logs = (await readStore<DbLog>(page, 'logs')).filter((l) => l.taskTitle === 'Colgar estantes').map((l) => l.type)
    expect(logs).toEqual(['creada'])
  })

  test('se puede sumar dos veces la misma persona a una tarea', async ({ page }) => {
    await enter(page)
    await goPendientes(page)
    await openTask(page, 'Armar la madera para el estante de la isla')
    const input = detail(page).getByLabel('Sumar persona (ej: Nacho)')
    await input.fill('nacho')
    await input.press('Enter')
    await expect(card(page, 'Armar la madera para el estante de la isla')).not.toContainText('Nacho, Nacho')
    const t = (await liveTasks(page)).find((x) => x.title === 'Armar la madera para el estante de la isla')!
    expect(t.people).toEqual(['Nacho'])
  })

  test('Enter en el título del detalle mete un salto de línea en el título', async ({ page }) => {
    await enter(page)
    await goPendientes(page)
    await openTask(page, 'Colgar estantes')
    const title = detail(page).getByLabel('Título')
    await title.click()
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await page.keyboard.type('x')
    await closeSheets(page)
    await expect.poll(async () => (await liveTasks(page)).some((t) => t.title.includes('\n'))).toBe(false)
  })

  test('carga rápida toma "5 m" (metros) como 5 minutos y lo saca del título', async ({ page }) => {
    await enter(page)
    await page.getByTestId('fab-add').click()
    await page.getByTestId('quickadd-input').fill('comprar 5 m de cable canal')
    await expect(page.getByTestId('quickadd-title')).toHaveText('Comprar 5 m de cable canal')
  })

  test('carga rápida toma "a la mañana" como fecha y deja "a la" en el título', async ({ page }) => {
    await enter(page)
    await page.getByTestId('fab-add').click()
    await page.getByTestId('quickadd-input').fill('limpiar heladera a la mañana')
    await expect(page.getByTestId('quickadd-title')).not.toHaveText('Limpiar heladera a la')
  })

  test('carga rápida borra "patio" del título ("limpiar patio" → "Limpiar")', async ({ page }) => {
    await enter(page)
    await page.getByTestId('fab-add').click()
    await page.getByTestId('quickadd-input').fill('limpiar patio')
    await expect(page.getByTestId('quickadd-title')).toHaveText('Limpiar patio')
  })

  test('una copia con una tarea sin listIds se importa y rompe la pantalla Listas', async ({ page }) => {
    await enter(page)
    await page.goto('./#/ajustes')
    const old = { id: 'vieja-1', title: 'Tarea de una versión vieja', notes: '', room: 'living', category: 'otro', status: 'pendiente', priority: 0, minutes: 30, energy: 'media', people: [], subtasks: [], materials: [], createdAt: 1, updatedAt: Date.now() }
    const file = { app: 'orden', version: 1, exportedAt: Date.now(), tasks: [old], lists: [], logs: [], photos: [] }
    await page.getByTestId('backup-input').setInputFiles({ name: 'vieja.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) })
    await page.getByRole('dialog', { name: 'Restaurar copia' }).getByRole('button', { name: 'Combinar con lo que tengo' }).click()
    await page.getByTestId('tab-listas').click()
    await expect(page.getByTestId('ferreteria-card')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Algo se trabó')).toHaveCount(0)
  })
})
