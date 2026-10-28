import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icono.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Nova · Gastos',
        short_name: 'Nova',
        description: 'Control de gastos personal. Funciona sin internet y sin anuncios.',
        lang: 'es-CO',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#faf6eb',
        theme_color: '#18613b',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2,woff}'], navigateFallbackDenylist: [/^\/api\//] },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts', 'server/**/*.test.ts', 'api/**/*.test.ts'] },
})
