import {
  AllAppleDeviceNames,
  appleSplashScreenSizes,
  defineConfig,
} from '@vite-pwa/assets-generator/config';

// iOS ignores the manifest's background_color and shows white until the first
// paint unless a startup image matches the device. These are plain ADR-018
// --color-bg frames, so launch looks like the app's own first paint. iOS only
// stores them at Add to Home Screen when index.html has the
// apple-mobile-web-app-capable meta.
// Run: npx pwa-assets-generator --config pwa-splash.config.ts
// It prints the <link> tags for index.html with a "-light" in each href that
// the written file names lack; drop it when pasting.
const none = { sizes: [] };

export default defineConfig({
  preset: {
    transparent: none,
    maskable: none,
    apple: none,
    appleSplashScreens: {
      resizeOptions: { background: '#05060A' },
      sizes: AllAppleDeviceNames.filter((name) => name.startsWith('iPhone')).map(
        (name) => appleSplashScreenSizes[name],
      ),
    },
  },
  images: ['public/apple-splash.svg'],
});
