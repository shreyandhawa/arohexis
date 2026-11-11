import { defineConfig } from '@vite-pwa/assets-generator/config';

// The icon is drawn full-bleed with its glyph inside the maskable safe zone,
// so every size is rendered with no extra padding.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    transparent: { sizes: [192, 512], favicons: [[48, 'favicon.ico']], padding: 0 },
    maskable: { sizes: [512], padding: 0 },
    apple: { sizes: [180], padding: 0 },
  },
  images: ['public/icon.svg'],
});
