import { expect, test, type Page } from '@playwright/test'

async function enter(page: Page) {
  await page.goto('./')
  await page.getByTestId('welcome-start').click()
  // En iPhone (user agent) aparece la guía de instalación
  await page.getByRole('button', { name: 'Entendido' }).click()
  await expect(page.getByTestId('welcome')).toHaveCount(0)
}

test('arranca con los 13 pendientes precargados', async ({ page }) => {
  await enter(page)
  await expect(page.getByTestId('casa-title')).toBeVisible()
  await page.getByTestId('tab-pendientes').click()
  await expect(page.getByTestId('pending-summary')).toContainText('13 abiertas')
  await expect(page.getByTestId('task-card')).toHaveCount(13)
})

test('carga rápida con lenguaje natural y persistencia', async ({ page }) => {
  await enter(page)
  await page.getByTestId('fab-add').click()
  await page.getByTestId('quickadd-input').fill('colgar espejo baño con Nacho 30min !')
  await expect(page.getByTestId('quickadd-title')).toHaveText('Colgar espejo')
  await page.getByTestId('quickadd-submit').click()
  await page.getByTestId('tab-pendientes').click()
  await expect(page.getByTestId('pending-summary')).toContainText('14 abiertas')
  await page.reload()
  await expect(page.getByTestId('pending-summary')).toContainText('14 abiertas')
  await expect(page.getByText('Colgar espejo')).toBeVisible()
})

test('completar desde la tarjeta, deshacer y registrar', async ({ page }) => {
  await enter(page)
  await page.getByTestId('tab-pendientes').click()
  await page.getByRole('button', { name: 'Marcar hecha: Dar vuelta el palo de la cortina' }).click()
  await expect(page.getByTestId('pending-summary')).toContainText('12 abiertas')
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByTestId('pending-summary')).toContainText('13 abiertas')
  await page.getByRole('button', { name: 'Marcar hecha: Dar vuelta el palo de la cortina' }).click()
  await expect(page.getByTestId('pending-summary')).toContainText('12 abiertas')
  await page.getByTestId('tab-registro').click()
  await expect(page.getByTestId('timeline')).toContainText('Dar vuelta el palo de la cortina')
})

test('swipe a la derecha completa la tarea', async ({ page }) => {
  await enter(page)
  await page.getByTestId('tab-pendientes').click()
  const card = page.getByTestId('task-card').filter({ hasText: 'Colgar estantes' })
  const box = (await card.boundingBox())!
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + 60, y)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + 60 + i * 22, y)
  await page.mouse.up()
  await expect(page.getByTestId('pending-summary')).toContainText('12 abiertas')
})

test('¿Qué hago ahora? propone una tarea', async ({ page }) => {
  await enter(page)
  await page.getByTestId('suggest-open').click()
  await page.getByTestId('suggest-roll').click()
  await expect(page.getByTestId('suggest-card')).toBeVisible()
})

test('ferretería junta los materiales', async ({ page }) => {
  await enter(page)
  await page.getByTestId('tab-listas').click()
  await page.getByTestId('ferreteria-card').click()
  await expect(page.getByTestId('shopping-list')).toContainText('Tomacorriente')
  await expect(page.getByTestId('shopping-list')).toContainText('×2')
})

test('copia de seguridad: exportar y restaurar', async ({ page }) => {
  await enter(page)
  await page.goto('./#/ajustes')
  const download = page.waitForEvent('download')
  await page.getByTestId('backup-save').click()
  const file = await download
  const path = await file.path()
  await page.getByTestId('backup-input').setInputFiles(path)
  await page.getByRole('button', { name: 'Reemplazar todo' }).click()
  await expect(page.getByText('Copia restaurada')).toBeVisible()
})

test('funciona sin conexión después de la primera carga', async ({ page, context }) => {
  await enter(page)
  await page.waitForFunction(async () => !!(await navigator.serviceWorker?.getRegistration())?.active)
  await page.reload()
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByTestId('casa-title')).toBeVisible()
  await context.setOffline(false)
})

test('manifest instalable', async ({ request }) => {
  const res = await request.get('manifest.webmanifest')
  expect(res.ok()).toBeTruthy()
  const m = await res.json()
  expect(m.display).toBe('standalone')
  expect(m.icons.length).toBeGreaterThanOrEqual(3)
  const icon = await request.get('icons/apple-touch-icon.png')
  expect(icon.ok()).toBeTruthy()
})
