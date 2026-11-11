import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// ADR-018 light --color-bg.
const BG = '#F5F5F2';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // A separate script file, never inline: CSP is script-src 'self'.
      injectRegister: 'script',
      strategies: 'generateSW',
      manifest: {
        name: 'Arohexis',
        short_name: 'Arohexis',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: BG,
        theme_color: BG,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // Fonts must render offline, but only the latin and latin-ext subsets
        // are needed; the other subsets load on demand and are not precached.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}', 'assets/*-latin-*.woff2'],
        cleanupOutdatedCaches: true,
        // Takes control of the first visit, so offline works without a second load.
        // skipWaiting stays off: an update waits for the person to press Reload.
        clientsClaim: true,
      },
    }),
  ],
});
