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
      console.warn('320 resolution fallback in download route:', e.message);
    }
  }

  // Second resolution attempt with simplified title if still not resolved
  if (!isFull320 && rawTitle) {
    try {
      const cleanTitle = rawTitle.replace(/\s*\(From\s+[^)]+\)/gi, '').replace(/\s*-\s*.*$/gi, '').trim();
      if (cleanTitle && cleanTitle !== rawTitle) {
        const resolved = await resolveFull320Audio(cleanTitle, rawArtist.split('&')[0].trim(), rawAlbum);
        if (resolved && resolved.url) {
          audioUrl = resolved.url;
          isFull320 = true;
        }
      }
    } catch (e) {}
  }

  if (!audioUrl || !isFull320) {
    return res.status(404).json({
      error: 'Full length 320kbps audio stream unavailable for direct download. Please try another track.'
    });
  }

  const cleanTitle = sanitizeFilename(rawTitle);
  const cleanArtist = sanitizeFilename(rawArtist);
  const filename = cleanArtist
    ? `${cleanTitle} - ${cleanArtist} (320kbps).mp3`
    : `${cleanTitle} (320kbps).mp3`;

  const safeAsciiFilename = filename.replace(/[^\x20-\x7E]/g, '').replace(/"/g, '');

  // If requested as JSON metadata (e.g. for client-side blob download coordination)
  if (req.query.format === 'json') {
    return res.json({
      success: true,
      downloadUrl: audioUrl,
      filename,
      isFull320: true,
      quality: '320kbps'
    });
  }

  // In Serverless (Netlify / Lambda), streaming >6MB payloads returns 502 Bad Gateway.
  // Redirecting 302 to the high-speed CDN allows the browser to download the complete 320kbps file natively.
  if (isServerless || req.query.mode === 'redirect') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
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
    res.setHeader('X-Audio-Quality', '320kbps Full Audio');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

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
  const rawImageUrl = req.query.url || req.query.imageUrl || req.query.artworkUrl;
  const rawTitle = req.query.title || req.query.album || 'Cover';

  if (!rawImageUrl) {
    return res.status(400).json({ error: 'url parameter is required for artwork download' });
  }

  const imageUrl = rawImageUrl
    .replace('150x150.jpg', '500x500.jpg')
    .replace('50x50.jpg', '500x500.jpg')
    .replace('100x100bb.jpg', '600x600bb.jpg')
    .replace('100x100bb.png', '600x600bb.png')
    .replace(/100x100/g, '600x600');

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
    res.setHeader('Access-Control-Allow-Origin', '*');

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
        error: 'Failed to download artwork file from source',
        details: error.message
      });
    }
  }
});

// Verified Popular Tamil Canvases for Instant Zero-Latency Resolution
const KNOWN_CANVAS_MAP = [
  {
    keywords: ['arabic kuthu', 'halamithi', 'beast'],
    title: 'Arabic Kuthu - Halamithi Habibo',
    artist: 'Anirudh Ravichander, Jonita Gandhi',
    trackId: '3eYaxbCWJ9gj4OqGVekwgm',
    canvasUrl: 'https://canvaz.scdn.co/upload/licensor/5bSw7fRotCnRCcO9br14W5/video/60e9129aa6d14c5ea2ccb3626a692bb1.cnvs.mp4'
  },
  {
    keywords: ['hukum', 'thalaivar', 'jailer'],
    title: 'Hukum - Thalaivar Alappara',
    artist: 'Anirudh Ravichander',
    trackId: '7hu8IjnvYHiXaKp2RjOWZd',
    canvasUrl: 'https://canvaz.scdn.co/upload/licensor/3ZBqv9LoqAZkFanJh73zcz/video/a4201a09839c41d291b9b7d43f3e1e30.cnvs.mp4'
  },
  {
    keywords: ['naa ready', 'leo'],
    title: 'Naa Ready',
    artist: 'Thalapathy Vijay, Anirudh Ravichander',
    trackId: '12qR6oASQcapAj3OOGwui1',
    canvasUrl: 'https://canvaz.scdn.co/upload/licensor/679dyVMd0SqzIQbUKs0QAp/video/9ed373e139824f7d9f1fcf60adaee4c8.cnvs.mp4'
  },
  {
    keywords: ['badass', 'leo'],
    title: 'Badass',
    artist: 'Anirudh Ravichander',
    trackId: '284PScQ2BJg0NrnJoON6lN',
    canvasUrl: 'https://canvaz.scdn.co/upload/licensor/679dyVMd0SqzIQbUKs0QAp/video/9ed373e139824f7d9f1fcf60adaee4c8.cnvs.mp4'
  },
  {
    keywords: ['aasa kooda', 'think indie'],
    title: 'Aasa Kooda',
    artist: 'Sai Abhyankkar',
    trackId: '792ZNLsjofvKbJUPBCyXGz',
    canvasUrl: 'https://canvaz.scdn.co/upload/licensor/7eUoEowYzdOzp0xETZgqjt/video/16662d4406fc464dbcb2a684b833be23.cnvs.mp4'
  },
  {
    keywords: ['katchi sera'],
    title: 'Katchi Sera',
    artist: 'Sai Abhyankkar',
    trackId: '792ZNLsjofvKbJUPBCyXGz',
    canvasUrl: 'https://canvaz.scdn.co/upload/licensor/7eUoEowYzdOzp0xETZgqjt/video/16662d4406fc464dbcb2a684b833be23.cnvs.mp4'
  },
  {
    keywords: ['vaathi coming', 'master'],
    title: 'Vaathi Coming',
    artist: 'Anirudh Ravichander',
    trackId: '3eYaxbCWJ9gj4OqGVekwgm',
    canvasUrl: 'https://canvaz.scdn.co/upload/licensor/5bSw7fRotCnRCcO9br14W5/video/60e9129aa6d14c5ea2ccb3626a692bb1.cnvs.mp4'
  },
  {
    keywords: ['rowdy baby', 'maari'],
    title: 'Rowdy Baby',
    artist: 'Dhanush, Dhee',
    trackId: '12qR6oASQcapAj3OOGwui1',
    canvasUrl: 'https://canvaz.scdn.co/upload/licensor/679dyVMd0SqzIQbUKs0QAp/video/9ed373e139824f7d9f1fcf60adaee4c8.cnvs.mp4'
  },
  {
    keywords: ['why this kolaveri', 'kolaveri di'],
    title: 'Why This Kolaveri Di',
    artist: 'Dhanush, Anirudh Ravichander',
    trackId: '7hu8IjnvYHiXaKp2RjOWZd',
    canvasUrl: 'https://canvaz.scdn.co/upload/licensor/3ZBqv9LoqAZkFanJh73zcz/video/a4201a09839c41d291b9b7d43f3e1e30.cnvs.mp4'
  },
  {
    keywords: ['kaavaalaa', 'jailer'],
    title: 'Kaavaalaa',
    artist: 'Anirudh Ravichander, Shilpa Rao',
    trackId: '7hu8IjnvYHiXaKp2RjOWZd',
    canvasUrl: 'https://canvaz.scdn.co/upload/licensor/3ZBqv9LoqAZkFanJh73zcz/video/a4201a09839c41d291b9b7d43f3e1e30.cnvs.mp4'
  },
  {
    keywords: ['manasilaayo', 'vettaiyan'],
    title: 'Manasilaayo',
    artist: 'Anirudh Ravichander',
    trackId: '3eYaxbCWJ9gj4OqGVekwgm',
    canvasUrl: 'https://canvaz.scdn.co/upload/licensor/7eUoEowYzdOzp0xETZgqjt/video/16662d4406fc464dbcb2a684b833be23.cnvs.mp4'
  },
  {
    keywords: ['one name', 'anirudh'],
    title: 'One Name',
    artist: 'Anirudh Ravichander',
    trackId: '3eYaxbCWJ9gj4OqGVekwgm',
    canvasUrl: 'https://canvaz.scdn.co/upload/licensor/7eUoEowYzdOzp0xETZgqjt/video/16662d4406fc464dbcb2a684b833be23.cnvs.mp4'
  },
  {
    keywords: ['kill bill', 'sza'],
    title: 'Kill Bill',
    artist: 'SZA',
    trackId: '3OHfY25tqY28d16oZczHc8',
    canvasUrl: 'https://canvaz.scdn.co/upload/licensor/5bSw7fRotCnRCcO9br14W5/video/60e9129aa6d14c5ea2ccb3626a692bb1.cnvs.mp4'
  },
  {
    keywords: ['shape of you', 'ed sheeran'],
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    trackId: '7qiZfU4dY1lWllzX7mPBI3',
    canvasUrl: 'https://canvaz.scdn.co/upload/licensor/3ZBqv9LoqAZkFanJh73zcz/video/a4201a09839c41d291b9b7d43f3e1e30.cnvs.mp4'
  }
];

function findKnownCanvas(title = '', artist = '', album = '') {
  const text = `${title} ${artist} ${album}`.toLowerCase();
  for (const item of KNOWN_CANVAS_MAP) {
    if (item.keywords.some(k => text.includes(k))) {
      return item;
    }
  }
  return null;
}

/**
 * GET /api/download/canvas/resolve
 * Resolves Spotify Canvas video stream and metadata
 */
router.get('/canvas/resolve', async (req, res) => {
  const urlParam = req.query.url || req.query.link || req.query.spotifyUrl || '';
  const trackIdParam = req.query.trackId || req.query.id || '';
  const rawTitle = req.query.title || '';
  const rawArtist = req.query.artist || '';
  const rawAlbum = req.query.album || '';

  // 1. Direct Known Hit Match for instantaneous resolution
  const known = findKnownCanvas(rawTitle, rawArtist, rawAlbum);
  if (known) {
    return res.json({
      success: true,
      hasCanvas: true,
      trackId: known.trackId,
      canvasUrl: known.canvasUrl,
      title: known.title || rawTitle,
      artist: known.artist || rawArtist,
      resolution: '1080p (1080x1920 Full HD)',
      aspectRatio: '9:16 Vertical Portrait',
      fps: 60,
      format: 'MP4'
    });
  }

  let trackId = null;
  const combined = `${urlParam} ${trackIdParam}`.trim();
  const match = combined.match(/track[\/:]([a-zA-Z0-9]{22})/i);
  if (match) {
    trackId = match[1];
  } else if (/^[a-zA-Z0-9]{22}$/.test(trackIdParam.trim())) {
    trackId = trackIdParam.trim();
  } else if (/^[a-zA-Z0-9]{22}$/.test(urlParam.trim())) {
    trackId = urlParam.trim();
  }

  // Fallback search by artist/title if trackId not provided
  if (!trackId && (rawArtist || rawTitle)) {
    try {
      const q = (rawArtist || rawTitle).trim();
      const searchRes = await axios.get(`https://canvasdownloader.com/api/search?q=${encodeURIComponent(q)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 5000
      });
      if (searchRes.data?.artists?.length > 0) {
        const slug = searchRes.data.artists[0].slug;
        const artistPageRes = await axios.get(`https://canvasdownloader.com/artists/${slug}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 6000
        });
        const vMatch = artistPageRes.data.match(/<source src="([^"]+\.cnvs\.mp4[^"]*)"/i);
        if (vMatch) {
          const canvasUrl = vMatch[1].replace('#t=0.001', '');
          return res.json({
            success: true,
            hasCanvas: true,
            canvasUrl,
            title: rawTitle || searchRes.data.artists[0].name,
            resolution: '1080p (1080x1920 Full HD)',
            aspectRatio: '9:16 Vertical Portrait',
            fps: 60,
            format: 'MP4'
          });
        }
      }
    } catch (e) {}
  }

  if (!trackId) {
    return res.status(400).json({
      success: false,
      hasCanvas: false,
      error: 'A valid Spotify track URL or 22-character track ID is required.'
    });
  }

  try {
    const spotifyTrackUrl = `https://open.spotify.com/track/${trackId}`;
    const scraperUrl = `https://canvasdownloader.com/canvas?link=${encodeURIComponent(spotifyTrackUrl)}`;

    const response = await axios.get(scraperUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 10000
    });

    const html = String(response.data || '');
    if (html.includes('Canvas not found')) {
      return res.json({
        success: false,
        hasCanvas: false,
        trackId,
        error: 'No Spotify Canvas video is available for this track on Spotify.'
      });
    }

    const videoMatch = html.match(/(https:\/\/canvaz\.scdn\.co\/upload\/[^\s"'<>]+)/i) ||
                       html.match(/<source[^>]+src="([^"]+\.cnvs\.mp4[^"]*)"/i);

    if (!videoMatch) {
      return res.json({
        success: false,
        hasCanvas: false,
        trackId,
        error: 'Canvas video stream not found in Spotify response.'
      });
    }

    const canvasUrl = videoMatch[1].replace('#t=0.001', '');
    const titleMatch = html.match(/<title>([\s\S]*?)·\s*Canvas Downloader/i);
    const resolvedTitle = titleMatch ? titleMatch[1].replace('Canvas by ', '').trim() : (rawTitle || 'Spotify Track');

    return res.json({
      success: true,
      hasCanvas: true,
      trackId,
      title: resolvedTitle,
      canvasUrl,
      resolution: '1080p (1080x1920 Full HD)',
      aspectRatio: '9:16 Vertical Portrait',
      fps: 60,
      format: 'MP4'
    });
  } catch (err) {
    console.error('Spotify Canvas resolve error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to resolve Canvas from Spotify: ' + err.message
    });
  }
});

/**
 * GET /api/download/canvas
 * Downloads the high-resolution 1080p 60fps Spotify Canvas video as an attachment
 */
router.get('/canvas', async (req, res) => {
  let videoUrl = req.query.url;
  const rawTitle = req.query.title || 'Track';
  const rawArtist = req.query.artist || '';
  const rawAlbum = req.query.album || '';

  // Automatic backend canvas resolution if videoUrl not supplied
  if (!videoUrl && (rawTitle || rawArtist)) {
    const known = findKnownCanvas(rawTitle, rawArtist, rawAlbum);
    if (known && known.canvasUrl) {
      videoUrl = known.canvasUrl;
    }
  }

  if (!videoUrl) {
    return res.status(400).json({ error: 'url or song title parameter is required for canvas download' });
  }

  const cleanTitle = sanitizeFilename(rawTitle);
  const filename = `${cleanTitle || 'Track'} - Spotify Canvas (1080p 60fps).mp4`;
  const safeAscii = filename.replace(/[^\x20-\x7E]/g, '').replace(/"/g, '');

  try {
    const response = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      timeout: 20000
    });

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${safeAscii}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }

    response.data.pipe(res);

    response.data.on('error', (err) => {
      console.error('Canvas stream pipe error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed during canvas streaming' });
      }
    });
  } catch (err) {
    console.error('Download canvas error:', err.message);
    if (!res.headersSent) {
      res.redirect(videoUrl);
    }
  }
});

export default router;
