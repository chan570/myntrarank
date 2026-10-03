import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => {
  if (command === 'build' && !process.env.VITE_API_BASE_URL) {
    throw new Error('Set VITE_API_BASE_URL for production builds so the site does not call localhost.');
  }

  return {
    plugins: [react()],
    base: './',
  };
});
