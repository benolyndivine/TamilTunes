import express from 'express';
import axios from 'axios';
import { resolveFull320Audio } from '../utils/resolve320Audio.js';

const router = express.Router();

const isServerless = process.env.NETLIFY === 'true' ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
  Boolean(process.env.LAMBDA_TASK_ROOT);

function sanitizeFilename(name = '') {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * GET /api/download/song
 * Automatically downloads the full song in high quality 320 kbps from backend.
 * Zero external redirects.
 */
router.get('/song', async (req, res) => {
  const rawTitle = req.query.title || 'Tamil Song';
  const rawArtist = req.query.artist || '';
  const rawAlbum = req.query.album || '';
  let audioUrl = req.query.audioUrl || req.query.url;

  let isFull320 = false;

  // If audioUrl is already a verified full 320kbps stream, use it directly
  if (audioUrl && (audioUrl.includes('aac.saavncdn.com') || audioUrl.includes('_320.mp4'))) {
    isFull320 = true;
  }

  // If not yet 320kbps (or preview URL was passed), always resolve to full 320kbps!
  if (!isFull320 && rawTitle) {
    try {
      const resolved = await resolveFull320Audio(rawTitle, rawArtist, rawAlbum);
      if (resolved && resolved.url) {
        audioUrl = resolved.url;
        isFull320 = true;
      }
    } catch (e) {
      console.warn('320 resolution fallback:', e.message);
    }
  }

  // Never stream a 30-second preview as a download!
  if (!audioUrl || !isFull320) {
    return res.status(404).json({
      error: 'Full length 320kbps audio stream unavailable for direct download'
    });
  }

  const cleanTitle = sanitizeFilename(rawTitle);
  const cleanArtist = sanitizeFilename(rawArtist);
  const filename = cleanArtist
    ? `${cleanTitle} - ${cleanArtist} (320kbps).mp3`
    : `${cleanTitle} (320kbps).mp3`;

  const safeAsciiFilename = filename.replace(/[^\x20-\x7E]/g, '').replace(/"/g, '');

  // In Serverless (Netlify / Lambda), streaming >6MB payloads returns 502 Bad Gateway.
  // Redirecting 302 to the high-speed CDN allows the browser to download the complete 320kbps file natively.
  if (isServerless || req.query.mode === 'redirect') {
    return res.redirect(302, audioUrl);
  }

  try {
    const response = await axios({
      method: 'GET',
      url: audioUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'audio/*, */*'
      },
      timeout: 45000
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('X-Audio-Quality', isFull320 ? '320kbps Full Audio' : 'Preview Audio');

    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }

    response.data.pipe(res);

    response.data.on('error', (err) => {
      console.error('Audio stream pipe error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed during audio streaming' });
      }
    });

  } catch (error) {
    console.error('Download audio error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to download audio file from source',
        details: error.message
      });
    }
  }
});

/**
 * GET /api/download/artwork
 * Downloads the high-resolution cover artwork as an image attachment.
 */
router.get('/artwork', async (req, res) => {
  const imageUrl = req.query.url;
  const rawTitle = req.query.title || 'Song';

  if (!imageUrl) {
    return res.status(400).json({ error: 'url parameter is required for artwork download' });
  }

  const filename = `${sanitizeFilename(rawTitle)} - Cover.jpg`;
  const safeAsciiArtwork = filename.replace(/[^\x20-\x7E]/g, '').replace(/"/g, '');

  try {
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      timeout: 15000
    });

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${safeAsciiArtwork}"; filename*=UTF-8''${encodeURIComponent(filename)}`);

    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }

    response.data.pipe(res);

    response.data.on('error', (err) => {
      console.error('Artwork stream pipe error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed during artwork streaming' });
      }
    });

  } catch (error) {
    console.error('Download artwork error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to download cover artwork',
        details: error.message
      });
    }
  }
});

export default router;
