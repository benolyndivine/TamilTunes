import axios from 'axios';

const API_BASE = '/api/lyrics';

/**
 * Parses raw LRC timestamp format into structured array
 * e.g. "[00:12.34] lyric line" -> { time: 12.34, text: "lyric line" }
 */
function parseLrc(lrcText = '') {
  if (!lrcText || typeof lrcText !== 'string') return [];

  const lines = lrcText.split('\n');
  const parsed = [];
  const timeRegex = /\[(\d{2}):(\d{2}(?:\.\d{2,3})?)\]/g;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    timeRegex.lastIndex = 0;
    const matches = [...line.matchAll(timeRegex)];
    if (!matches || matches.length === 0) continue;

    const text = line.replace(timeRegex, '').trim();

    for (const match of matches) {
      const mins = parseInt(match[1], 10);
      const secs = parseFloat(match[2]);
      const timeInSecs = mins * 60 + secs;

      parsed.push({
        time: parseFloat(timeInSecs.toFixed(2)),
        text: text || '♪'
      });
    }
  }

  return parsed.sort((a, b) => a.time - b.time);
}

function cleanTitle(title = '') {
  return title
    .replace(/\s*\(From\s+["'][^"']+["']\)/i, '')
    .replace(/\s*\(From\s+[^)]+\)/i, '')
    .replace(/\s*\[From\s+[^\]]+\]/i, '')
    .replace(/\s*-\s*Single$/i, '')
    .replace(/\s*-\s*Original Motion Picture Soundtrack$/i, '')
    .replace(/\s*-\s*Tamil$/i, '')
    .replace(/\s*\(Tamil\)$/i, '')
    .trim();
}

/**
 * Retrieves synchronized or plain lyrics from LRCLIB via backend proxy with direct client fallback
 */
export async function getLyrics({ trackName, artistName, albumName, duration, force = false }) {
  if (!trackName) {
    throw new Error('Track name is required to fetch lyrics');
  }

  // 1. Try backend API proxy
  try {
    const response = await axios.get(API_BASE, {
      params: {
        track_name: trackName,
        artist_name: artistName || '',
        album_name: albumName || '',
        duration: duration || 0,
        force: force ? 'true' : 'false'
      },
      timeout: 8000
    });
    if (response.data && (response.data.syncedLyrics || response.data.plainLyrics || response.data.synced || response.data.plain)) {
      const d = response.data;
      const rawSynced = d.syncedLyrics || d.syncedRaw || (typeof d.synced === 'string' ? d.synced : null);
      const rawPlain = d.plainLyrics || d.plain || null;
      return {
        ...d,
        syncedLyrics: rawSynced,
        plainLyrics: rawPlain,
        synced: rawSynced ? parseLrc(rawSynced) : (Array.isArray(d.synced) ? d.synced : null),
        plain: rawPlain
      };
    }
  } catch (err) {
    console.warn('Backend lyrics fetch failed, falling back to direct LRCLIB API:', err.message);
  }

  // 2. Direct browser fallback using LRCLIB public API (CORS friendly)
  const cleaned = cleanTitle(trackName);
  const primaryArtist = (artistName || '').split('&')[0].split(',')[0].trim();

  try {
    // Attempt exact get first
    const directRes = await axios.get('https://lrclib.net/api/get', {
      params: {
        track_name: cleaned,
        artist_name: primaryArtist,
        album_name: albumName || '',
        duration: duration ? Math.round(duration) : undefined
      },
      headers: {
        'Accept': 'application/json'
      },
      timeout: 7000
    });

    const data = directRes.data;
    if (data && (data.syncedLyrics || data.plainLyrics)) {
      const parsed = data.syncedLyrics ? parseLrc(data.syncedLyrics) : [];
      return {
        id: `lrclib-${data.id}`,
        trackName: data.trackName || trackName,
        artistName: data.artistName || artistName,
        albumName: data.albumName || albumName,
        duration: data.duration || duration,
        syncedLyrics: data.syncedLyrics || null,
        plainLyrics: data.plainLyrics || null,
        synced: parsed.length > 0 ? parsed : null,
        syncedRaw: data.syncedLyrics || null,
        plain: data.plainLyrics || null,
        instrumental: data.instrumental || false,
        source: 'LRCLIB (Direct Fallback)'
      };
    }
  } catch (exactErr) {
    // Attempt LRCLIB search fallback
    try {
      const searchRes = await axios.get('https://lrclib.net/api/search', {
        params: { q: `${cleaned} ${primaryArtist}`.trim() },
        headers: { 'Accept': 'application/json' },
        timeout: 7000
      });

      const list = searchRes.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const best = list.find(item => item.syncedLyrics) || list[0];
        const parsed = best.syncedLyrics ? parseLrc(best.syncedLyrics) : [];
        return {
          id: `lrclib-${best.id}`,
          trackName: best.trackName || trackName,
          artistName: best.artistName || artistName,
          albumName: best.albumName || albumName,
          duration: best.duration || duration,
          syncedLyrics: best.syncedLyrics || null,
          plainLyrics: best.plainLyrics || null,
          synced: parsed.length > 0 ? parsed : null,
          syncedRaw: best.syncedLyrics || null,
          plain: best.plainLyrics || null,
          instrumental: best.instrumental || false,
          source: 'LRCLIB Search (Direct Fallback)'
        };
      }
    } catch (searchErr) {
      console.warn('Direct LRCLIB search also failed:', searchErr.message);
    }
  }

  return {
    trackName,
    artistName,
    syncedLyrics: null,
    plainLyrics: null,
    synced: null,
    syncedRaw: null,
    plain: null,
    source: 'None available'
  };
}
