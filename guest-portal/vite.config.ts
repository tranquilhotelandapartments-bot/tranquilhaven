import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

// Set base to './' for relative paths (works on Vercel, Netlify, any subfolder).
// For GitHub Pages on a repo sub-path (e.g. username.github.io/repo-name),
// change base to '/repo-name/' before building, or set VITE_BASE_PATH env var.
const base = process.env.VITE_BASE_PATH || './';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base,
});
