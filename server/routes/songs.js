import express from 'express';
import axios from 'axios';
import { resolveFull320Audio } from '../utils/resolve320Audio.js';

const router = express.Router();

// Simple in-memory cache with TTL (15 minutes)
const searchCache = new Map();
const CACHE_TTL = 15 * 60 * 1000;

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Popular Tamil music directors detector
const MUSIC_DIRECTORS = [
  'A.R. Rahman', 'Anirudh Ravichander', 'Yuvan Shankar Raja', 'Harris Jayaraj',
  'Ilaiyaraaja', 'Santhosh Narayanan', 'G.V. Prakash Kumar', 'D. Imman',
  'Vidyasagar', 'Deva', 'S.P. Balasubrahmanyam', 'M.M. Keeravaani',
  'Hiphop Tamizha', 'Sam C.S.', 'Sean Roldan', 'Ghibran', 'Thaman S'
];

function detectMusicDirector(text = '') {
  const lower = text.toLowerCase();
  for (const md of MUSIC_DIRECTORS) {
    if (lower.includes(md.toLowerCase()) || lower.includes(md.split(' ')[0].toLowerCase())) {
      return md;
    }
  }
  return '';
}

/**
 * Normalizes iTunes track item to standard song format
 */
function normalizeItunesItem(item) {
  const durationSec = Math.round((item.trackTimeMillis || 0) / 1000);
  const highResArtwork = (item.artworkUrl100 || '')
    .replace('100x100bb.jpg', '600x600bb.jpg')
    .replace('100x100bb.png', '600x600bb.png')
    .replace('100x100', '600x600');

  const detectedMd = detectMusicDirector(`${item.artistName} ${item.collectionName} ${item.trackName}`);

  return {
    id: `itunes-${item.trackId}`,
    sourceId: String(item.trackId),
    title: item.trackName || 'Unknown Title',
    artist: item.artistName || 'Unknown Artist',
    singers: (item.artistName || '').split('&').map(s => s.trim()),
    musicDirector: detectedMd,
    album: item.collectionName || item.trackName || '',
    year: item.releaseDate ? new Date(item.releaseDate).getFullYear().toString() : '',
    duration: durationSec,
    durationFormatted: formatDuration(durationSec),
    artworkUrl: highResArtwork || item.artworkUrl100 || '',
    thumbnailUrl: item.artworkUrl100 || '',
    audioUrl: item.previewUrl || '',
    isFullAudio: false,
    audioQuality: '320 Kbps HQ Audio',
    audioType: 'Preview Audio (Full 320kbps Available for Download)',
    has320Download: true,
    source: 'iTunes Music',
    genre: item.primaryGenreName || 'Tamil / Indian',
    externalUrls: {
      appleMusic: item.trackViewUrl || '',
      spotify: `https://open.spotify.com/search/${encodeURIComponent((item.trackName || '') + ' ' + (item.artistName || ''))}`,
      youtube: `https://music.youtube.com/search?q=${encodeURIComponent((item.trackName || '') + ' ' + (item.artistName || ''))}`,
      jiosaavn: `https://www.jiosaavn.com/search/${encodeURIComponent(item.trackName || '')}`
    }
  };
}

/**
 * Normalizes JioSaavn autocomplete song item
 */
function normalizeSaavnItem(item) {
  const highResImage = (item.image || '')
    .replace('50x50.jpg', '500x500.jpg')
    .replace('150x150.jpg', '500x500.jpg');

  const more = item.more_info || {};
  const audioPreview = more.vlink || '';
  const singersList = (more.singers || more.primary_artists || item.description || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const detectedMd = detectMusicDirector(`${item.music || ''} ${more.singers || ''} ${item.description || ''}`);

  return {
    id: `saavn-${item.id}`,
    sourceId: String(item.id),
    title: item.title ? item.title.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&') : 'Unknown Title',
    artist: more.primary_artists || more.singers || item.description || 'Unknown Artist',
    singers: singersList.length > 0 ? singersList : [item.description || 'Tamil Artist'],
    musicDirector: detectedMd || item.music || '',
    album: item.album || '',
    year: item.year || '',
    duration: 240, // typical Saavn preview estimate
    durationFormatted: '4:00',
    artworkUrl: highResImage || item.image || '',
    thumbnailUrl: item.image || '',
    audioUrl: audioPreview,
    isFullAudio: false,
    audioType: audioPreview ? 'JioSaavn Preview Audio (MP3)' : '',
    source: 'JioSaavn',
    genre: more.language ? `${more.language.charAt(0).toUpperCase() + more.language.slice(1)} Music` : 'Tamil Music',
    externalUrls: {
      jiosaavn: item.url || '',
      spotify: `https://open.spotify.com/search/${encodeURIComponent(item.title || '')}`,
      youtube: `https://music.youtube.com/search?q=${encodeURIComponent((item.title || '') + ' ' + (item.album || ''))}`,
      appleMusic: `https://music.apple.com/in/search?term=${encodeURIComponent(item.title || '')}`
    }
  };
}

// Curated top trending Tamil songs for instant exploration
const TRENDING_QUERIES = [
  'Arabic Kuthu Beast',
  'Hukum Jailer',
  'Vaathi Coming Master',
  'Naatu Koothu RRR',
  'Rowdy Baby Maari 2',
  'Why This Kolaveri Di',
  'Badass Leo Anirudh',
  'Chinna Chinna Aasai Roja',
  'Kandha Sashti Kavasam'
];

/**
 * GET /api/songs/search?q=...&limit=20
 */
router.get('/search', async (req, res) => {
  const query = (req.query.q || '').trim();
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const cacheKey = `search:${query.toLowerCase()}:${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({ results: cached.data, fromCache: true });
  }

  const combinedResults = [];
  const seenIds = new Set();

  try {
    // 1. Fetch from iTunes Search API with country=IN (India) for rich Tamil music catalog
    const itunesPromise = axios.get('https://itunes.apple.com/search', {
      params: {
        term: query,
        country: 'IN',
        media: 'music',
        entity: 'song',
        limit: Math.max(limit, 15)
      },
      timeout: 8000
    }).catch(err => {
      console.warn('iTunes search warning:', err.message);
      return { data: { results: [] } };
    });

    // 2. Fetch from JioSaavn autocomplete for additional Indian/Tamil coverage
    const saavnPromise = axios.get('https://www.jiosaavn.com/api.php', {
      params: {
        __call: 'autocomplete.get',
        _format: 'json',
        _marker: '0',
        cc: 'in',
        includeMetaTags: '1',
        query: query
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 6000
    }).catch(err => {
      console.warn('JioSaavn search warning:', err.message);
      return { data: {} };
    });

    const [itunesRes, saavnRes] = await Promise.all([itunesPromise, saavnPromise]);

    // Process iTunes results
    if (itunesRes?.data?.results) {
      for (const item of itunesRes.data.results) {
        const norm = normalizeItunesItem(item);
        const key = `${norm.title.toLowerCase()}_${norm.artist.toLowerCase()}`;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          combinedResults.push(norm);
        }
      }
    }

    // Process JioSaavn results if available
    if (saavnRes?.data?.songs?.data) {
      for (const item of saavnRes.data.songs.data) {
        const norm = normalizeSaavnItem(item);
        const key = `${norm.title.toLowerCase()}_${norm.artist.toLowerCase()}`;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          // If the saavn result lacks audioUrl but an itunes preview exists with similar name, it will already be in list
          combinedResults.push(norm);
        }
      }
    }

    const finalResults = combinedResults.slice(0, limit);

    searchCache.set(cacheKey, {
      data: finalResults,
      timestamp: Date.now()
    });

    res.json({
      query,
      count: finalResults.length,
      results: finalResults,
      fromCache: false
    });
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({
      error: 'Failed to search songs. Please check your network and try again.',
      details: error.message
    });
  }
});

/**
 * GET /api/songs/trending
 * Returns pre-fetched top Tamil songs for immediate home display
 */
router.get('/trending', async (req, res) => {
  const cacheKey = 'trending:tamil';
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({ results: cached.data });
  }

  try {
    const resItunes = await axios.get('https://itunes.apple.com/search', {
      params: {
        term: 'Anirudh Ravichander Tamil Hits',
        country: 'IN',
        media: 'music',
        entity: 'song',
        limit: 12
      },
      timeout: 8000
    });

    const results = (resItunes.data.results || []).map(normalizeItunesItem);
    searchCache.set(cacheKey, {
      data: results,
      timestamp: Date.now()
    });

    res.json({ results });
  } catch (error) {
    console.error('Trending fetch error:', error.message);
    res.json({ results: [] });
  }
});

/**
 * GET /api/songs/albums?q=...&limit=15
 * Searches albums/movies via iTunes and JioSaavn
 */
router.get('/albums', async (req, res) => {
  const query = (req.query.q || '').trim();
  const limit = Math.min(parseInt(req.query.limit, 10) || 12, 30);

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const cacheKey = `albums:${query.toLowerCase()}:${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({ results: cached.data });
  }

  try {
    const itunesPromise = axios.get('https://itunes.apple.com/search', {
      params: {
        term: query,
        country: 'IN',
        entity: 'album',
        limit
      },
      timeout: 8000
    }).catch(err => {
      console.warn('iTunes album search error:', err.message);
      return { data: { results: [] } };
    });

    const saavnPromise = axios.get('https://www.jiosaavn.com/api.php', {
      params: {
        __call: 'autocomplete.get',
        _format: 'json',
        _marker: '0',
        cc: 'in',
        query
      },
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 6000
    }).catch(err => {
      console.warn('JioSaavn album search error:', err.message);
      return { data: {} };
    });

    const [itunesRes, saavnRes] = await Promise.all([itunesPromise, saavnPromise]);

    const albumList = [];
    const seenNames = new Set();

    // Process iTunes albums
    if (itunesRes.data?.results) {
      for (const item of itunesRes.data.results) {
        const highResArtwork = (item.artworkUrl100 || '')
          .replace('100x100bb.jpg', '600x600bb.jpg')
          .replace('100x100bb.png', '600x600bb.png')
          .replace('100x100', '600x600');
        const year = item.releaseDate ? new Date(item.releaseDate).getFullYear().toString() : '';

        const nameKey = (item.collectionName || '').toLowerCase().trim();
        if (!seenNames.has(nameKey)) {
          seenNames.add(nameKey);
          albumList.push({
            id: `itunes-${item.collectionId}`,
            collectionId: item.collectionId,
            title: item.collectionName || 'Unknown Album',
            artist: item.artistName || 'Various Artists',
            year,
            releaseDate: item.releaseDate,
            trackCount: item.trackCount || 0,
            artworkUrl: highResArtwork || item.artworkUrl100,
            primaryGenreName: item.primaryGenreName || 'Tamil / Soundtrack',
            copyright: item.copyright || '',
            source: 'iTunes'
          });
        }
      }
    }

    // Process JioSaavn albums
    if (saavnRes.data?.albums?.data) {
      for (const item of saavnRes.data.albums.data) {
        const nameKey = (item.title || '').toLowerCase().trim();
        if (!seenNames.has(nameKey)) {
          seenNames.add(nameKey);
          const highRes = (item.image || '').replace('50x50.jpg', '500x500.jpg').replace('150x150.jpg', '500x500.jpg');
          albumList.push({
            id: `saavn-${item.id}`,
            saavnId: item.id,
            title: (item.title || '').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&'),
            artist: item.music || item.description || 'Tamil Composer',
            year: item.year || '',
            trackCount: 0,
            artworkUrl: highRes || item.image,
            primaryGenreName: 'Tamil Soundtrack',
            source: 'JioSaavn'
          });
        }
      }
    }

    searchCache.set(cacheKey, { data: albumList, timestamp: Date.now() });
    res.json({ results: albumList });
  } catch (error) {
    console.error('Album search error:', error.message);
    res.status(500).json({ error: 'Failed to search albums' });
  }
});

/**
 * GET /api/songs/album-details?id=...&title=...
 * Retrieves full tracklist for an album
 */
router.get('/album-details', async (req, res) => {
  const collectionId = req.query.collectionId || req.query.id;
  const albumTitle = req.query.title || '';
  const albumArtist = req.query.artist || '';

  if (!collectionId && !albumTitle) {
    return res.status(400).json({ error: 'collectionId or title is required' });
  }

  try {
    let tracks = [];
    let albumMeta = null;

    // If it's an iTunes album ID or starts with itunes-
    const cleanId = String(collectionId || '').replace('itunes-', '');
    if (cleanId && !isNaN(cleanId)) {
      const itunesRes = await axios.get(`https://itunes.apple.com/lookup`, {
        params: {
          id: cleanId,
          entity: 'song',
          country: 'IN'
        },
        timeout: 8000
      });

      const results = itunesRes.data?.results || [];
      const albumItem = results.find(x => x.wrapperType === 'collection');
      const songItems = results.filter(x => x.wrapperType === 'track');

      if (albumItem) {
        const highResArtwork = (albumItem.artworkUrl100 || '')
          .replace('100x100bb.jpg', '600x600bb.jpg')
          .replace('100x100', '600x600');
        albumMeta = {
          id: `itunes-${albumItem.collectionId}`,
          title: albumItem.collectionName,
          artist: albumItem.artistName,
          year: albumItem.releaseDate ? new Date(albumItem.releaseDate).getFullYear().toString() : '',
          trackCount: albumItem.trackCount,
          artworkUrl: highResArtwork,
          genre: albumItem.primaryGenreName,
          copyright: albumItem.copyright
        };
      }

      tracks = songItems.map(item => normalizeItunesItem(item));
    }

    // Fallback if iTunes ID didn't return tracks: search songs matching albumTitle
    if (!tracks.length && albumTitle) {
      const searchRes = await axios.get('https://itunes.apple.com/search', {
        params: {
          term: `${albumTitle} ${albumArtist}`.trim(),
          country: 'IN',
          media: 'music',
          entity: 'song',
          limit: 25
        },
        timeout: 8000
      });

      const items = searchRes.data?.results || [];
      tracks = items
        .filter(x => (x.collectionName || '').toLowerCase().includes(albumTitle.toLowerCase()) || items.length <= 8)
        .map(normalizeItunesItem);

      if (!albumMeta && items.length > 0) {
        const first = items[0];
        albumMeta = {
          title: first.collectionName || albumTitle,
          artist: first.artistName || albumArtist,
          year: first.releaseDate ? new Date(first.releaseDate).getFullYear().toString() : '',
          artworkUrl: (first.artworkUrl100 || '').replace('100x100bb.jpg', '600x600bb.jpg'),
          trackCount: tracks.length
        };
      }
    }

    res.json({
      album: albumMeta,
      songs: tracks
    });
  } catch (err) {
    console.error('Album details error:', err.message);
    res.status(500).json({ error: 'Failed to fetch album details' });
  }
});



/**
 * GET /api/songs/resolve?title=&artist=&album=
 * Resolves a full-length 320kbps audio stream URL for a specific song via JioSaavn.
 * Called on-demand when the user selects a song, so search stays fast.
 */
router.get('/resolve', async (req, res) => {
  const title = (req.query.title || '').trim();
  const artist = (req.query.artist || '').trim();
  const album = (req.query.album || '').trim();

  if (!title) {
    return res.status(400).json({ error: 'title parameter is required' });
  }

  try {
    const result = await resolveFull320Audio(title, artist, album);
    if (result && result.url) {
      return res.json({
        url: result.url,
        quality: result.quality || '320 Kbps HQ Studio Audio',
        duration: result.duration,
        title: result.title || title,
        artist: result.artist || artist,
        album: result.album || album,
        streamUrl: `/api/stream?url=${encodeURIComponent(result.url)}`
      });
    }
    res.status(404).json({ error: 'Could not resolve full audio for this track' });
  } catch (err) {
    console.error('Resolve error:', err.message);
    res.status(500).json({ error: 'Resolution failed', details: err.message });
  }
});

export default router;
