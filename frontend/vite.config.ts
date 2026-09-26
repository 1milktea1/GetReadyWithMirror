import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Tests run in a zone far from New York so any accidental reliance on the
// machine's local time zone fails loudly instead of passing by coincidence.
process.env.TZ = 'Asia/Tokyo'

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@contracts': fromRoot('../shared/contracts'),
      '@fixtures': fromRoot('../fixtures'),
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
    // Backend runs on the same laptop; the browser never calls providers directly.
    proxy: { '/api': 'http://localhost:3001' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
