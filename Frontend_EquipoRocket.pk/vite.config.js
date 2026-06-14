import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // Listen on all network interfaces (necessary for Docker)
    host: '0.0.0.0',
    port: 5173,
    // Enable HMR for development
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },
  build: {
    // Use Vite's default minifier (oxc, bundled with rolldown-vite)
    sourcemap: false,
    // Output directory
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
})
 