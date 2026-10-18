import axios from 'axios';

const API_BASE = '/api/songs';

/**
 * Searches songs via the backend proxy
 */
export async function searchSongs(query, signal = null, limit = 20) {
  if (!query || !query.trim()) {
    return { results: [], count: 0 };
  }

  const response = await axios.get(`${API_BASE}/search`, {
    params: { q: query.trim(), limit },
    signal,
    timeout: 10000
  });

  return response.data;
}

/**
 * Fetches popular trending Tamil songs
 */
export async function getTrendingSongs() {
  const response = await axios.get(`${API_BASE}/trending`, {
    timeout: 8000
  });
  return response.data;
}

/**
 * Resolves the full 320kbps JioSaavn stream URL for a specific song.
 * Returns { url, streamUrl, quality, duration } where streamUrl is
 * the backend proxy at /api/stream?url=... to bypass CORS for the player.
 */
export async function resolveSongAudio(title, artist = '', album = '') {
  if (!title) return null;
  try {
    const response = await axios.get(`${API_BASE}/resolve`, {
      params: { title: title.trim(), artist: artist.trim(), album: album.trim() },
      timeout: 12000
    });
    return response.data; // { url, streamUrl, quality, duration, title, artist, album }
  } catch (err) {
    // Not fatal — player falls back to preview or shows error message
    console.warn('resolveSongAudio failed:', err.message);
    return null;
  }
}

/**
 * Searches albums/movies
 */
export async function searchAlbums(query, signal = null, limit = 15) {
  if (!query || !query.trim()) {
    return { results: [] };
  }
  const response = await axios.get(`${API_BASE}/albums`, {
    params: { q: query.trim(), limit },
    signal,
    timeout: 10000
  });
  return response.data;
}

/**
 * Gets album details with full tracklist
 */
export async function getAlbumDetails(collectionId, title = '', artist = '') {
  const response = await axios.get(`${API_BASE}/album-details`, {
    params: { collectionId, title, artist },
    timeout: 10000
  });
  return response.data;
}
