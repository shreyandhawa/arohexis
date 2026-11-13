import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { parseHeaders } from './config/parseHeaders.ts';

// ADR-018 light --color-bg.
const BG = '#F5F5F2';

/**
 * Makes `vite preview` send the `/*` block of public/_headers, which Cloudflare
 * applies in production, so the CSP is exercised by the E2E suite before deploy.
 */
function previewHeaders(): Plugin {
  return {
    name: 'arohexis:preview-headers',
    configurePreviewServer(server) {
      const all = parseHeaders(readFileSync('public/_headers', 'utf8'))['/*'] ?? {};
      server.middlewares.use((_req, res, next) => {
        for (const [name, value] of Object.entries(all)) res.setHeader(name, value);
        next();
      });
    },
  };
}

function buildSha(): string {
  const fromCi = process.env['VITE_BUILD_SHA'];
  if (fromCi) return fromCi.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

export default defineConfig({
  define: {
    __BUILD_SHA__: JSON.stringify(buildSha() || 'dev'),
    __APP_VERSION__: JSON.stringify(version),
  },
  // The manifest lets scripts/check-bundle-size.mjs find the lazy Brain space chunk.
  build: { manifest: true },
  plugins: [
    previewHeaders(),
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
