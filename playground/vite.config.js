import { defineConfig } from 'vite';
// Relative asset paths support GitHub Pages project sites.
export default defineConfig({ base: './', build: { target: 'es2022', outDir: 'dist' } });
