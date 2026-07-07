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
    coverage: {
      provider: 'v8',
      reporter: ['html', 'text', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/utils/**',
        'src/components/TypeBadge.jsx',
        'src/components/ErrorBoundary.jsx',
        'src/components/ConfirmModal.jsx',
        'src/components/Footer.jsx',
        'src/components/TypeCoverageChart.jsx',
        'src/components/PokemonSprite.jsx',
      ],
      thresholds: {
        lines: 80,
        functions: 75,
        branches: 70,
        statements: 80,
      },
    },
  },
})
 