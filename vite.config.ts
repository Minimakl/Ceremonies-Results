/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The app calls Roster Athletics through /roster-api so the browser never
// depends on Roster's CORS policy. In production, mirror this rewrite in the
// host (e.g. a Vercel rewrite of /roster-api/* to api.meets.rosterathletics.com/*).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/roster-api': {
        target: 'https://api.meets.rosterathletics.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/roster-api/, ''),
        headers: { Accept: 'application/json' },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
