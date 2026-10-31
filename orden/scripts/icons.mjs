// Genera los íconos de la app (PNG) a partir del SVG de la marca.
// Uso: npm run icons
import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')

const mark = (stroke = 46) => `
  <path d="M128 270 L256 158 L384 270" fill="none" stroke="#c6f432" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M186 332 L238 382 L332 286" fill="none" stroke="#f5f5f7" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>`

const defs = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#23232e"/><stop offset="1" stop-color="#0b0b10"/></linearGradient></defs>`

// Ícono con esquinas redondeadas (favicon)
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}<rect width="512" height="512" rx="120" fill="url(#g)"/>${mark()}</svg>`
// Ícono a sangre (iOS y Android recortan la forma)
const square = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}<rect width="512" height="512" fill="url(#g)"/>${mark()}</svg>`
// Maskable: la marca dentro de la zona segura (80%)
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}<rect width="512" height="512" fill="url(#g)"/><g transform="translate(51.2 51.2) scale(0.8)">${mark()}</g></svg>`

const targets = [
  ['icons/apple-touch-icon.png', square, 180],
  ['icons/icon-192.png', square, 192],
  ['icons/icon-512.png', square, 512],
  ['icons/icon-maskable-512.png', maskable, 512],
]

await mkdir(join(pub, 'icons'), { recursive: true })
await writeFile(join(pub, 'favicon.svg'), rounded)

const browser = await chromium.launch()
const page = await browser.newPage()
for (const [file, svg, size] of targets) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`)
  await page.screenshot({ path: join(pub, file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } })
  console.log('✓', file)
}
await browser.close()
