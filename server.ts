import path from 'path';
import express from 'express';
import { app, rootDir } from './src/server/app.ts';

const PORT = 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    // Use rootDir calculated in app.ts
    app.use(express.static(path.join(rootDir, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(rootDir, 'dist', 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export { app };
