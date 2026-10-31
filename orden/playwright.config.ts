import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    ...devices['iPhone 15 Pro'],
    browserName: 'chromium',
    baseURL: 'http://localhost:4173/domain/',
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173/domain/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
