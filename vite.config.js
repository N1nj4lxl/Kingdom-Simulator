import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, open: true },
  build: { target: 'es2018', outDir: 'dist', sourcemap: false, assetsInlineLimit: 0 }
});
