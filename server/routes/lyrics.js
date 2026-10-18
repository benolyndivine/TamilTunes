import express from 'express';
import axios from 'axios';
import { getFallbackLyrics } from '../data/fallbackLyrics.js';

const router = express.Router();

// Lyrics cache: 2 hours TTL
const lyricsCache = new Map();
const CACHE_TTL = 2 * 60 * 60 * 1000;

const LRCLIB_BASE = 'https://lrclib.net/api';
const LRCLIB_HEADERS = {
  'User-Agent': 'TamilMusicFinder/1.0 (https://github.com/tamil-music-finder)',
  'Accept': 'application/json'
};

/**
 * Clean track title by stripping soundtrack / movie metadata suffixes
 * e.g., "Arabic Kuthu (From 'Beast')" -> "Arabic Kuthu"
 */
function cleanTitle(title = '') {
  return title
    .replace(/\s*\(From\s+["'][^"']+["']\)/i, '')
    .replace(/\s*\(From\s+[^)]+\)/i, '')
    .replace(/\s*\[From\s+[^\]]+\]/i, '')
    .replace(/\s*-\s*Single$/i, '')
    .replace(/\s*-\s*Original Motion Picture Soundtrack$/i, '')
    .replace(/\s*-\s*Tamil$/i, '')
    .replace(/\s*\(Tamil\)$/i, '')
    .replace(/\s*\(Official Video\)$/i, '')
    .replace(/\s*\(Audio\)$/i, '')
    .trim();
}

/**
 * Clean artist string: e.g. "Anirudh Ravichander & Jonita Gandhi" -> "Anirudh Ravichander"
 */
function primaryArtist(artist = '') {
  return artist.split('&')[0].split(',')[0].trim();
}

/**
 * Attempts an axios request with backoff retry for LRCLIB 503 responses
 */
async function fetchWithRetry(url, params = {}, retries = 2, delay = 800) {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await axios.get(url, {
        params,
        headers: LRCLIB_HEADERS,
        timeout: 6000
      });
      return response.data;
    } catch (err) {
      const status = err.response?.status;
      if (status === 503 && i < retries) {
        await new Promise(r => setTimeout(r, delay * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}

/**
 * GET /api/lyrics
 * Query params:
 * - track_name
 * - artist_name
 * - album_name (optional)
 * - duration (optional, seconds)
 * - force (optional, boolean to bypass cache)
 */
router.get('/', async (req, res) => {
  const rawTrack = req.query.track_name || req.query.title || '';
  const rawArtist = req.query.artist_name || req.query.artist || '';
  const albumName = req.query.album_name || req.query.album || '';
  const duration = parseInt(req.query.duration, 10) || 0;
  const force = req.query.force === 'true';

  if (!rawTrack) {
    return res.status(400).json({ error: 'track_name query parameter is required' });
  }

  const trackName = cleanTitle(rawTrack);
  const artistName = primaryArtist(rawArtist);
  const cacheKey = `${trackName.toLowerCase()}_${artistName.toLowerCase()}`;

  if (!force && lyricsCache.has(cacheKey)) {
    const cached = lyricsCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({ ...cached.data, fromCache: true });
    }
  }

  // Check verified local fallback first if match is exact
  const fallback = getFallbackLyrics(rawTrack, rawArtist);

  try {
    let result = null;

    // 1. Try LRCLIB exact match if album/duration available
    if (albumName && duration > 0) {
      try {
        result = await fetchWithRetry(`${LRCLIB_BASE}/get`, {
          track_name: trackName,
          artist_name: artistName,
          album_name: albumName,
          duration: duration
        });
      } catch (e) {
        // Fall through to search
      }
    }

    // 2. Try LRCLIB search by track_name & artist_name
    if (!result || (!result.syncedLyrics && !result.plainLyrics)) {
      try {
        const searchResults = await fetchWithRetry(`${LRCLIB_BASE}/search`, {
          track_name: trackName,
          artist_name: artistName
        });

        if (Array.isArray(searchResults) && searchResults.length > 0) {
          // Prefer synchronized lyrics
          result = searchResults.find(r => r.syncedLyrics) || searchResults[0];
        }
      } catch (e) {
        // Fall through to query search
      }
    }

    // 3. Try LRCLIB broad query search
    if (!result || (!result.syncedLyrics && !result.plainLyrics)) {
      try {
        const queryResults = await fetchWithRetry(`${LRCLIB_BASE}/search`, {
          q: `${trackName} ${artistName}`.trim()
        });

        if (Array.isArray(queryResults) && queryResults.length > 0) {
          result = queryResults.find(r => r.syncedLyrics) || queryResults[0];
        }
      } catch (e) {
        // Fall through
      }
    }

    // If LRCLIB returned valid lyrics
    if (result && (result.syncedLyrics || result.plainLyrics)) {
      const payload = {
        trackName: result.trackName || trackName,
        artistName: result.artistName || artistName,
        albumName: result.albumName || albumName,
        duration: result.duration || duration,
        syncedLyrics: result.syncedLyrics || null,
        plainLyrics: result.plainLyrics || null,
        instrumental: !!result.instrumental,
        source: 'LRCLIB (Official API)',
        isFallback: false
      };

      lyricsCache.set(cacheKey, { data: payload, timestamp: Date.now() });
      return res.json(payload);
    }

    // If LRCLIB had no lyrics, check if we have a verified fallback
    if (fallback) {
      const payload = {
        ...fallback,
        source: 'Verified Tamil Synced Lyrics (LRCLIB Cache / Local Archive)',
        isFallback: true
      };
      lyricsCache.set(cacheKey, { data: payload, timestamp: Date.now() });
      return res.json(payload);
    }

    // No lyrics found anywhere
    return res.status(404).json({
      error: 'Lyrics not found on LRCLIB',
      trackName,
      artistName,
      hasLyrics: false,
      message: 'No synchronized or plain lyrics are currently available for this song on LRCLIB.'
    });

  } catch (error) {
    console.warn(`LRCLIB error for "${trackName}":`, error.message);

    // If LRCLIB failed (503 overloaded or network error), use verified fallback if available
    if (fallback) {
      const payload = {
        ...fallback,
        source: 'Verified Tamil Synced Lyrics (Local Resilience Backup)',
        isFallback: true,
        notice: 'LRCLIB is currently busy/overloaded (503). Using verified synchronized lyrics archive.'
      };
      lyricsCache.set(cacheKey, { data: payload, timestamp: Date.now() });
      return res.json(payload);
    }

    return res.status(503).json({
      error: 'LRCLIB API is temporarily overloaded or unavailable',
      details: error.message,
      trackName,
      artistName,
      canRetry: true
    });
  }
});

export default router;
