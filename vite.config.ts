import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  // 自動適配：在 Vercel 部署時使用根路徑 '/'，在 GitHub Pages 部署時使用 '/SmartFridge/'
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
  const base = process.env.VITE_BASE_PATH ?? (isVercel ? '/' : '/SmartFridge/');

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
