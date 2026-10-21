import axios from 'axios';
import CryptoJS from 'crypto-js';

const DES_KEY = CryptoJS.enc.Utf8.parse('38346591');

/**
 * Decrypts JioSaavn encrypted_media_url and upgrades it to 320kbps audio stream
 */
export function decryptJioMediaUrl(encryptedUrl = '') {
  if (!encryptedUrl || typeof encryptedUrl !== 'string') return null;

  try {
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encryptedUrl.trim()) },
      DES_KEY,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );

    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8).trim();
    if (!decryptedStr || !decryptedStr.startsWith('http')) return null;

    // Upgrade quality from _96.mp4 or _160.mp4 to _320.mp4
    return decryptedStr.replace(/_96\.mp4|_160\.mp4/, '_320.mp4');
  } catch (err) {
    console.warn('DES decryption error:', err.message);
    return null;
  }
}

/**
 * Thoroughly cleans titles and artists to maximize search hit rate on music providers
 */
function cleanQueryParts(title = '', artist = '', album = '') {
  const cleanTitle = (title || '')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s*\(From\s+[^)]+\)/gi, '')
    .replace(/\s*\[From\s+[^\]]+\]/gi, '')
    .replace(/\s*\(feat\.[^)]+\)/gi, '')
    .replace(/\s*\(with[^)]+\)/gi, '')
    .replace(/\s*-\s*(Single|Tamil|Original Motion Picture Soundtrack|Reprise|Remastered|From\s+.*)$/gi, '')
    .trim();

  const primaryArtist = (artist || '')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .split('&')[0]
    .split(',')[0]
    .replace(/\s*feat\..*$/i, '')
    .trim();

  const cleanAlbum = (album || '')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s*\(Original Motion Picture Soundtrack\)/gi, '')
    .replace(/\s*-\s*Single$/gi, '')
    .trim();

  return { cleanTitle, primaryArtist, cleanAlbum };
}

// In-memory cache for resolved 320kbps tracks
const resolved320Cache = new Map();

/**
 * Searches and resolves a full-length 320kbps audio stream URL for any Tamil song
 */
export async function resolveFull320Audio(title = '', artist = '', album = '') {
  if (!title) return null;

  const { cleanTitle, primaryArtist, cleanAlbum } = cleanQueryParts(title, artist, album);
  const cacheKey = `${(cleanTitle || title).toLowerCase()}_${(primaryArtist || artist).toLowerCase()}`;
  if (resolved320Cache.has(cacheKey)) {
    return resolved320Cache.get(cacheKey);
  }

  // Construct queries from most specific to broader
  const queriesToTry = [
    cleanTitle && primaryArtist ? `${cleanTitle} ${primaryArtist}` : null,
    cleanTitle && cleanAlbum ? `${cleanTitle} ${cleanAlbum}` : null,
    cleanTitle,
    title.replace(/\s*\(From\s+[^)]+\)/gi, '').trim(),
    title
  ].filter((q, idx, arr) => Boolean(q) && arr.indexOf(q) === idx);

  let songsList = [];

  try {
    // Strategy 1: JioSaavn search.getResults (contains encrypted_media_url directly)
    for (const q of queriesToTry) {
      try {
        const searchRes = await axios.get('https://www.jiosaavn.com/api.php', {
          params: {
            __call: 'search.getResults',
            _format: 'json',
            _marker: '0',
            p: 1,
            n: 10,
            q
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 6000
        });

        const list = searchRes.data?.results || [];
        if (list.length > 0) {
          for (const item of list) {
            if (item.encrypted_media_url) {
              const url320 = decryptJioMediaUrl(item.encrypted_media_url);
              if (url320) {
                const result = {
                  url: url320,
                  quality: '320 Kbps HQ Studio Audio',
                  duration: parseInt(item.duration, 10) || 240,
                  title: (item.song || item.title || title).replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&'),
                  artist: item.singers || item.primary_artists || artist,
                  album: (item.album || album).replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&')
                };
                resolved320Cache.set(cacheKey, result);
                return result;
              }
            }
          }
          songsList = list;
          break;
        }
      } catch (e) {
        // continue to next query
      }
    }

    // Strategy 2: autocomplete.get + song.getDetails
    if (!songsList.length) {
      for (const q of queriesToTry) {
        try {
          const autoRes = await axios.get('https://www.jiosaavn.com/api.php', {
            params: {
              __call: 'autocomplete.get',
              _format: 'json',
              _marker: '0',
              cc: 'in',
              includeMetaTags: '1',
              query: q
            },
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 6000
          });
          const list = autoRes.data?.songs?.data || [];
          if (list.length > 0) {
            songsList = list;
            break;
          }
        } catch (e) {}
      }
    }

    if (songsList.length > 0) {
      for (const songCandidate of songsList.slice(0, 3)) {
        const pid = songCandidate.id;
        if (!pid) continue;

        try {
          const detailsRes = await axios.get('https://www.jiosaavn.com/api.php', {
            params: {
              __call: 'song.getDetails',
              pids: pid,
              _format: 'json',
              _marker: '0',
              ctx: 'web6dot0'
            },
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 6000
          });

          const fullSong = detailsRes.data?.songs?.[0] || detailsRes.data?.[pid];
          if (fullSong?.encrypted_media_url) {
            const url320 = decryptJioMediaUrl(fullSong.encrypted_media_url);
            if (url320) {
              const result = {
                url: url320,
                quality: '320 Kbps HQ Studio Audio',
                duration: parseInt(fullSong.duration, 10) || 240,
                title: (fullSong.song || title).replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&'),
                artist: fullSong.singers || fullSong.primary_artists || artist,
                album: (fullSong.album || album).replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&')
              };
              resolved320Cache.set(cacheKey, result);
              return result;
            }
          }
        } catch (detailErr) {}
      }
    }
  } catch (err) {
    console.warn(`Could not resolve 320kbps audio for "${title}":`, err.message);
  }

  return null;
}
