
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.BASE_API_URL': JSON.stringify(process.env.BASE_API_URL || process.env.API_BASE_URL),
    // Polyfill for some libraries that expect process.env
    'process.env': process.env
  },
  server: {
    port: 3000,
    host: true, // Needed for Docker networking if running frontend in container
  }
});
