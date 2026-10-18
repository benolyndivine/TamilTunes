import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import songsRouter from './routes/songs.js';
import lyricsRouter from './routes/lyrics.js';
import sourcesRouter from './routes/sources.js';
import downloadRouter from './routes/download.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/songs', songsRouter);
app.use('/api/lyrics', lyricsRouter);
app.use('/api/sources', sourcesRouter);
app.use('/api/download', downloadRouter);

/**
 * GET /api/stream?url=<encoded-cdn-url>
 * Proxies JioSaavn CDN audio to the browser so HTMLAudioElement can play
 * full 320kbps songs without CORS issues. Supports range requests for seeking.
 */
app.get('/api/stream', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'url parameter is required' });
  }

  const rangeHeader = req.headers.range;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'audio/*, */*',
    'Referer': 'https://www.jiosaavn.com/'
  };
  if (rangeHeader) {
    headers['Range'] = rangeHeader;
  }

  try {
    const upstream = await import('axios').then(m => m.default({
      method: 'GET',
      url: targetUrl,
      responseType: 'stream',
      headers,
      timeout: 60000
    }));

    const statusCode = rangeHeader ? (upstream.status === 206 ? 206 : 200) : 200;
    res.status(statusCode);
    res.setHeader('Content-Type', upstream.headers['content-type'] || 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    if (upstream.headers['content-length']) {
      res.setHeader('Content-Length', upstream.headers['content-length']);
    }
    if (upstream.headers['content-range']) {
      res.setHeader('Content-Range', upstream.headers['content-range']);
    }
    res.setHeader('Cache-Control', 'no-cache');
    upstream.data.pipe(res);
    upstream.data.on('error', (err) => {
      console.error('Stream pipe error:', err.message);
      if (!res.headersSent) res.status(500).end();
    });
  } catch (err) {
    console.error('Stream proxy error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Could not stream audio from source', details: err.message });
    }
  }
});


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Tamil Music Finder & Synced Lyrics Backend Proxy',
    timestamp: new Date().toISOString(),
    supportedProviders: ['iTunes IN', 'JioSaavn', 'LRCLIB', 'Masstamilan', 'Mp3chetta', 'Koshalworld', 'Pagalnew', 'Spotify', 'Apple Music']
  });
});

// Serve frontend in production build if dist directory exists
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback for SPA routing in production
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Tamil Music Finder API Server is running. Launch frontend on Vite dev server (port 5173).');
    }
  });
});

// Only start the HTTP listener when run directly (not serverless)
if (process.env.NETLIFY !== 'true' && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(PORT, () => {
    console.log(`🎵 Tamil Music Finder Backend running on http://localhost:${PORT}`);
    console.log(`📡 API Endpoints available at http://localhost:${PORT}/api/songs, /api/lyrics, /api/sources`);
  });
}

export default app;

