import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Backend runs on the same laptop; the browser never calls providers directly.
    proxy: { '/api': 'http://localhost:3001' },
  },
});
