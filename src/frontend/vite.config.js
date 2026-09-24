import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react()],
  // PostCSS se declara aquí en lugar de en un postcss.config.js suelto: el
  // proyecto no es un paquete ESM, así que Vite no cargaba aquel fichero y
  // Tailwind quedaba fuera del build en silencio — el CSS se generaba igual,
  // sólo que sin ninguna utilidad, y la aplicación se servía rota.
  css: {
    postcss: {
      plugins: [
        tailwindcss({ config: path.resolve(__dirname, 'tailwind.config.js') }),
        autoprefixer(),
      ],
    },
  },
  build: {
    outDir: 'public',
    emptyOutDir: false, // Prevents deleting other legacy assets like logo.png
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5175,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/svc': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      }
    }
  }
});
