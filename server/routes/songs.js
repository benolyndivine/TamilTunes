import express from 'express';
import axios from 'axios';
import { resolveFull320Audio, decryptJioMediaUrl } from '../utils/resolve320Audio.js';

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
    downloadUrl: '',
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
 * Normalizes JioSaavn search.getResults song item with decrypted full 320kbps audio
 */
function normalizeSaavnFullItem(item) {
  const durationSec = parseInt(item.duration, 10) || 240;
  const highResImage = (item.image || '')
    .replace('50x50.jpg', '500x500.jpg')
    .replace('150x150.jpg', '500x500.jpg');

  const fullAudioUrl = item.encrypted_media_url ? decryptJioMediaUrl(item.encrypted_media_url) : null;
  const singersList = (item.singers || item.primary_artists || item.more_info?.singers || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const cleanTitle = (item.song || item.title || 'Unknown Title')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&');

  const cleanAlbum = (item.album || item.more_info?.album || '')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&');

  const detectedMd = detectMusicDirector(`${item.music || ''} ${singersList.join(' ')} ${cleanTitle}`);

  return {
    id: `saavn-${item.id}`,
    sourceId: String(item.id),
    title: cleanTitle,
    artist: item.primary_artists || item.singers || 'Tamil Artist',
    singers: singersList.length > 0 ? singersList : ['Tamil Artist'],
    musicDirector: detectedMd || item.music || '',
    album: cleanAlbum,
    year: item.year || '',
    duration: durationSec,
    durationFormatted: formatDuration(durationSec),
    artworkUrl: highResImage || item.image || '',
    thumbnailUrl: item.image || '',
    audioUrl: fullAudioUrl || item.media_preview_url || '',
    downloadUrl: fullAudioUrl || '',
    isFullAudio: Boolean(fullAudioUrl),
    audioQuality: '320 Kbps HQ Studio Audio',
    audioType: fullAudioUrl ? '320 Kbps Full HQ Audio' : 'Audio Track',
    has320Download: true,
    source: 'JioSaavn',
    genre: item.language ? `${item.language.charAt(0).toUpperCase() + item.language.slice(1)} Music` : 'Tamil Music',
    externalUrls: {
      jiosaavn: item.perma_url || item.url || `https://www.jiosaavn.com/search/${encodeURIComponent(cleanTitle)}`,
      spotify: `https://open.spotify.com/search/${encodeURIComponent(cleanTitle + ' ' + (item.primary_artists || ''))}`,
      youtube: `https://music.youtube.com/search?q=${encodeURIComponent(cleanTitle + ' ' + cleanAlbum)}`,
      appleMusic: `https://music.apple.com/in/search?term=${encodeURIComponent(cleanTitle)}`
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
    // 1. Fetch from JioSaavn search.getResults for full 320kbps audio catalog
    const saavnPromise = axios.get('https://www.jiosaavn.com/api.php', {
      params: {
        __call: 'search.getResults',
        _format: 'json',
        _marker: '0',
        p: 1,
        n: Math.max(limit, 30),
        q: query
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 7000
    }).catch(err => {
      console.warn('JioSaavn search warning:', err.message);
      return { data: { results: [] } };
    });

    // 2. Fetch from iTunes Search API with country=IN (India) for rich catalog
    const itunesPromise = axios.get('https://itunes.apple.com/search', {
      params: {
        term: query,
        country: 'IN',
        media: 'music',
        entity: 'song',
        limit: Math.max(limit, 20)
      },
      timeout: 8000
    }).catch(err => {
      console.warn('iTunes search warning:', err.message);
      return { data: { results: [] } };
    });

    const [saavnRes, itunesRes] = await Promise.all([saavnPromise, itunesPromise]);

    // Process JioSaavn results first (these have full 320kbps audio decrypted)
    if (saavnRes?.data?.results) {
      for (const item of saavnRes.data.results) {
        const norm = normalizeSaavnFullItem(item);
        const key = `${norm.title.toLowerCase().trim()}_${norm.artist.toLowerCase().trim()}`;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          combinedResults.push(norm);
        }
      }
    }

    // Process iTunes results
    if (itunesRes?.data?.results) {
      for (const item of itunesRes.data.results) {
        const norm = normalizeItunesItem(item);
        const titleKey = norm.title.toLowerCase().replace(/\s*\(From\s+[^)]+\)/i, '').trim();
        // Check if we already have a JioSaavn full audio match
        const matchingSaavn = combinedResults.find(s =>
          s.isFullAudio && (s.title.toLowerCase().includes(titleKey) || titleKey.includes(s.title.toLowerCase()))
        );

        if (matchingSaavn) {
          // Enrich iTunes item with full 320 audio from matching JioSaavn track
          norm.audioUrl = matchingSaavn.audioUrl;
          norm.downloadUrl = matchingSaavn.downloadUrl;
          norm.isFullAudio = true;
          norm.audioQuality = '320 Kbps HQ Studio Audio';
          norm.audioType = '320 Kbps Full HQ Audio';
        }

        const key = `${norm.title.toLowerCase().trim()}_${norm.artist.toLowerCase().trim()}`;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          combinedResults.push(norm);
        }
      }
    }

    // Auto-resolve full 320kbps audio for any unmatched tracks in top results
    const unmatchedItems = combinedResults.filter(s => !s.isFullAudio).slice(0, 10);
    if (unmatchedItems.length > 0) {
      await Promise.allSettled(
        unmatchedItems.map(async (norm) => {
          try {
            const resolved = await resolveFull320Audio(norm.title, norm.artist, norm.album);
            if (resolved && resolved.url) {
              norm.audioUrl = resolved.url;
              norm.downloadUrl = resolved.url;
              norm.isFullAudio = true;
              norm.duration = resolved.duration || norm.duration;
              norm.durationFormatted = formatDuration(norm.duration);
              norm.audioQuality = '320 Kbps HQ Studio Audio';
              norm.audioType = '320 Kbps Full HQ Audio';
            }
          } catch (e) {}
        })
      );
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
 * Returns pre-fetched top Tamil songs with full 320kbps audio for immediate home display
 */
router.get('/trending', async (req, res) => {
  const cacheKey = 'trending:tamil';
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({ results: cached.data });
  }

  try {
    // 1. Fetch top Tamil hits from JioSaavn with full 320kbps audio
    const resSaavn = await axios.get('https://www.jiosaavn.com/api.php', {
      params: {
        __call: 'search.getResults',
        _format: 'json',
        _marker: '0',
        p: 1,
        n: 14,
        q: 'Latest Tamil Hits 2024'
      },
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 8000
    }).catch(e => {
      console.warn('JioSaavn trending fetch failed:', e.message);
      return { data: { results: [] } };
    });

    let results = [];
    if (resSaavn?.data?.results && resSaavn.data.results.length > 0) {
      results = resSaavn.data.results.map(normalizeSaavnFullItem);
    }

    // Fallback to iTunes if JioSaavn returned nothing
    if (results.length === 0) {
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
      results = (resItunes.data.results || []).map(normalizeItunesItem);
    }

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

    // 1. Try JioSaavn album search / lookup first for full 320kbps tracks
    const saavnSearchTerm = (albumTitle || collectionId || '').replace(/^(itunes-album-|itunes-|saavn-)/, '').trim();
    if (saavnSearchTerm) {
      try {
        const sRes = await axios.get('https://www.jiosaavn.com/api.php', {
          params: {
            __call: 'search.getAlbumResults',
            _format: 'json',
            p: 1,
            n: 3,
            q: saavnSearchTerm
          },
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 7000
        });

        const albumItem = sRes.data?.results?.[0];
        const albumId = albumItem?.albumid || albumItem?.id;
        if (albumId) {
          const dRes = await axios.get('https://www.jiosaavn.com/api.php', {
            params: {
              __call: 'content.getAlbumDetails',
              _format: 'json',
              albumid: albumId
            },
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 8000
          });

          const saavnSongs = dRes.data?.songs || dRes.data?.list || [];
          if (saavnSongs.length > 0) {
            tracks = saavnSongs.map(normalizeSaavnFullItem);
            const highRes = (dRes.data?.image || albumItem?.image || '')
              .replace('150x150.jpg', '500x500.jpg')
              .replace('50x50.jpg', '500x500.jpg');

            albumMeta = {
              id: `saavn-${albumId}`,
              title: (dRes.data?.title || dRes.data?.name || albumTitle || '').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&'),
              artist: dRes.data?.primary_artists || albumArtist || 'Tamil Soundtrack',
              year: dRes.data?.year || albumItem?.year || '',
              trackCount: tracks.length,
              artworkUrl: highRes || albumItem?.image,
              genre: 'Tamil Soundtrack',
              source: 'JioSaavn'
            };
          }
        }
      } catch (saavnErr) {
        console.warn('JioSaavn album lookup failed, trying iTunes:', saavnErr.message);
      }
    }

    // 2. If JioSaavn didn't return tracks, fallback to iTunes lookup
    if (!tracks.length) {
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
        const itunesAlbumItem = results.find(x => x.wrapperType === 'collection');
        const songItems = results.filter(x => x.wrapperType === 'track');

        if (itunesAlbumItem) {
          const highResArtwork = (itunesAlbumItem.artworkUrl100 || '')
            .replace('100x100bb.jpg', '600x600bb.jpg')
            .replace('100x100', '600x600');
          albumMeta = {
            id: `itunes-${itunesAlbumItem.collectionId}`,
            title: itunesAlbumItem.collectionName,
            artist: itunesAlbumItem.artistName,
            year: itunesAlbumItem.releaseDate ? new Date(itunesAlbumItem.releaseDate).getFullYear().toString() : '',
            trackCount: itunesAlbumItem.trackCount,
            artworkUrl: highResArtwork,
            genre: itunesAlbumItem.primaryGenreName,
            copyright: itunesAlbumItem.copyright
          };
        }

        tracks = songItems.map(item => normalizeItunesItem(item));
      }
    }

    // 3. Fallback if still no tracks: search iTunes songs matching albumTitle
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

    // Auto-resolve full 320kbps audio for album tracks that need it
    if (tracks && tracks.length > 0) {
      const needResolve = tracks.filter(t => !t.isFullAudio).slice(0, 15);
      if (needResolve.length > 0) {
        await Promise.allSettled(
          needResolve.map(async (t) => {
            try {
              const resolved = await resolveFull320Audio(t.title, t.artist, albumTitle || albumMeta?.title);
              if (resolved && resolved.url) {
                t.audioUrl = resolved.url;
                t.downloadUrl = resolved.url;
                t.isFullAudio = true;
                t.duration = resolved.duration || t.duration;
                t.durationFormatted = formatDuration(t.duration);
                t.audioQuality = '320 Kbps HQ Studio Audio';
                t.audioType = '320 Kbps Full HQ Audio';
              }
            } catch (e) {}
          })
        );
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
        streamUrl: result.url,
        proxyStreamUrl: `/api/stream?url=${encodeURIComponent(result.url)}`
      });
    }
    res.status(404).json({ error: 'Could not resolve full audio for this track' });
  } catch (err) {
    console.error('Resolve error:', err.message);
    res.status(500).json({ error: 'Resolution failed', details: err.message });
  }
});

export default router;
