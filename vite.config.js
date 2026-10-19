import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'express-api-middleware',
      async configureServer(server) {
        const { default: app } = await import('./server/server.js');
        server.middlewares.use((req, res, next) => {
          const url = req.url || '';
          if (
            url.startsWith('/api') ||
            url.startsWith('/songs') ||
            url.startsWith('/lyrics') ||
            url.startsWith('/download') ||
            url.startsWith('/stream')
          ) {
            return app(req, res, next);
          }
          next();
        });
      }
    }
  ],
  server: {
    port: 5173
  }
})
