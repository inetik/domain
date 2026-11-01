import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Cloudflare Pages sirve la app en la raíz. Se puede cambiar con ORDEN_BASE.
const base = process.env.ORDEN_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      // El manifest viaja con la cookie de Cloudflare Access; sin esto, el login lo bloquea.
      useCredentials: true,
      manifest: {
        id: base,
        name: 'Orden',
        short_name: 'Orden',
        description: 'Los pendientes de tu casa, en orden.',
        lang: 'es-AR',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0B0B10',
        theme_color: '#0B0B10',
        categories: ['productivity', 'lifestyle'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1400,
  },
  preview: { port: 4173, strictPort: true },
})
