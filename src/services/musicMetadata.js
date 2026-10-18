import axios from 'axios';

const API_BASE = '/api/songs';

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

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
 * Normalizes iTunes album item
 */
function normalizeItunesAlbum(item) {
  const highResArtwork = (item.artworkUrl100 || '')
    .replace('100x100bb.jpg', '600x600bb.jpg')
    .replace('100x100bb.png', '600x600bb.png')
    .replace('100x100', '600x600');

  const detectedMd = detectMusicDirector(`${item.artistName} ${item.collectionName}`);

  return {
    id: `itunes-album-${item.collectionId}`,
    collectionId: item.collectionId,
    title: item.collectionName || 'Unknown Album',
    artist: item.artistName || 'Unknown Artist',
    musicDirector: detectedMd,
    year: item.releaseDate ? new Date(item.releaseDate).getFullYear().toString() : '',
    artworkUrl: highResArtwork || item.artworkUrl100 || '',
    trackCount: item.trackCount || 0,
    genre: item.primaryGenreName || 'Tamil Soundtrack',
    externalUrls: {
      appleMusic: item.collectionViewUrl || '',
      spotify: `https://open.spotify.com/search/${encodeURIComponent(item.collectionName || '')}`,
      jiosaavn: `https://www.jiosaavn.com/search/${encodeURIComponent(item.collectionName || '')}`
    }
  };
}

/**
 * Searches songs via the backend proxy with automatic direct iTunes fallback
 */
export async function searchSongs(query, signal = null, limit = 20) {
  if (!query || !query.trim()) {
    return { results: [], count: 0 };
  }

  // 1. Try backend API proxy
  try {
    const response = await axios.get(`${API_BASE}/search`, {
      params: { q: query.trim(), limit },
      signal,
      timeout: 8000
    });
    if (response.data && response.data.results && response.data.results.length > 0) {
      return response.data;
    }
  } catch (err) {
    if (err.name === 'CanceledError' || err.name === 'AbortError') throw err;
    console.warn('Backend song search failed, falling back to direct iTunes API:', err.message);
  }

  // 2. Direct browser fallback using iTunes Search API (CORS friendly)
  try {
    const itunesRes = await axios.get('https://itunes.apple.com/search', {
      params: {
        term: `${query.trim()} tamil`,
        country: 'IN',
        media: 'music',
        entity: 'song',
        limit: Math.min(limit, 40)
      },
      signal,
      timeout: 9000
    });

    const items = itunesRes.data?.results || [];
    const normalized = items.map(normalizeItunesItem);
    return {
      results: normalized,
      count: normalized.length,
      source: 'iTunes Direct (Client Fallback)'
    };
  } catch (directErr) {
    if (directErr.name === 'CanceledError' || directErr.name === 'AbortError') throw directErr;
    console.error('Direct song search failed:', directErr);
    return { results: [], count: 0 };
  }
}

/**
 * Fetches popular trending Tamil songs with direct iTunes fallback
 */
export async function getTrendingSongs() {
  // 1. Try backend API proxy
  try {
    const response = await axios.get(`${API_BASE}/trending`, {
      timeout: 6000
    });
    if (response.data && response.data.results && response.data.results.length > 0) {
      return response.data;
    }
  } catch (err) {
    console.warn('Backend trending fetch failed, falling back to direct iTunes API:', err.message);
  }

  // 2. Direct browser fallback: Query iTunes for latest Tamil hits
  try {
    const itunesRes = await axios.get('https://itunes.apple.com/search', {
      params: {
        term: 'tamil hits 2025',
        country: 'IN',
        media: 'music',
        entity: 'song',
        limit: 30
      },
      timeout: 8000
    });

    const items = itunesRes.data?.results || [];
    const normalized = items.map(normalizeItunesItem);
    return {
      results: normalized,
      count: normalized.length,
      source: 'iTunes Direct (Trending Fallback)'
    };
  } catch (directErr) {
    console.error('Direct trending fetch failed:', directErr);
    return { results: [], count: 0 };
  }
}

/**
 * Resolves the full 320kbps JioSaavn stream URL for a specific song.
 */
export async function resolveSongAudio(title, artist = '', album = '') {
  if (!title) return null;
  try {
    const response = await axios.get(`${API_BASE}/resolve`, {
      params: { title: title.trim(), artist: artist.trim(), album: album.trim() },
      timeout: 10000
    });
    return response.data;
  } catch (err) {
    console.warn('resolveSongAudio backend failed:', err.message);
    return null;
  }
}

/**
 * Searches albums/movies with direct iTunes fallback
 */
export async function searchAlbums(query, signal = null, limit = 15) {
  if (!query || !query.trim()) {
    return { results: [] };
  }

  // 1. Try backend API proxy
  try {
    const response = await axios.get(`${API_BASE}/albums`, {
      params: { q: query.trim(), limit },
      signal,
      timeout: 8000
    });
    if (response.data && response.data.results && response.data.results.length > 0) {
      return response.data;
    }
  } catch (err) {
    if (err.name === 'CanceledError' || err.name === 'AbortError') throw err;
    console.warn('Backend album search failed, falling back to direct iTunes API:', err.message);
  }

  // 2. Direct browser fallback
  try {
    const itunesRes = await axios.get('https://itunes.apple.com/search', {
      params: {
        term: `${query.trim()} tamil`,
        country: 'IN',
        media: 'music',
        entity: 'album',
        limit
      },
      signal,
      timeout: 9000
    });

    const items = itunesRes.data?.results || [];
    const normalized = items.map(normalizeItunesAlbum);
    return {
      results: normalized,
      count: normalized.length,
      source: 'iTunes Direct (Album Fallback)'
    };
  } catch (directErr) {
    if (directErr.name === 'CanceledError' || directErr.name === 'AbortError') throw directErr;
    console.error('Direct album search failed:', directErr);
    return { results: [] };
  }
}

/**
 * Gets album details with full tracklist with direct iTunes fallback
 */
export async function getAlbumDetails(collectionId, title = '', artist = '') {
  // 1. Try backend API proxy
  try {
    const response = await axios.get(`${API_BASE}/album-details`, {
      params: { collectionId, title, artist },
      timeout: 8000
    });
    if (response.data && response.data.songs && response.data.songs.length > 0) {
      return response.data;
    }
  } catch (err) {
    console.warn('Backend album details failed, falling back to direct iTunes lookup:', err.message);
  }

  // 2. Direct browser fallback: iTunes lookup API
  if (collectionId) {
    try {
      const cleanId = String(collectionId).replace(/^itunes-album-/, '');
      const lookupRes = await axios.get('https://itunes.apple.com/lookup', {
        params: { id: cleanId, entity: 'song', country: 'IN' },
        timeout: 9000
      });

      const results = lookupRes.data?.results || [];
      if (results.length > 0) {
        const albumItem = results[0];
        const trackItems = results.slice(1);
        return {
          album: normalizeItunesAlbum(albumItem),
          songs: trackItems.map(normalizeItunesItem),
          trackCount: trackItems.length,
          source: 'iTunes Direct Lookup'
        };
      }
    } catch (lookupErr) {
      console.warn('Direct iTunes lookup failed:', lookupErr);
    }
  }

  return { album: null, songs: [] };
}
