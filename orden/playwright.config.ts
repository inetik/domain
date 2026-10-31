import { defineConfig, devices } from '@playwright/test'

// Se puede apuntar a otro servidor con ORDEN_URL (por defecto, `npm run preview`)
const url = process.env.ORDEN_URL ?? 'http://localhost:4173/domain/'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    ...devices['iPhone 15 Pro'],
    browserName: 'chromium',
    baseURL: url,
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
  },
  webServer: {
    command: 'npm run preview',
    url,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
