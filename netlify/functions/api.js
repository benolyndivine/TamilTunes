import axios from 'axios';
import { resolveFull320Audio, decryptJioMediaUrl } from '../../server/utils/resolve320Audio.js';
import { getFallbackLyrics } from '../../server/data/fallbackLyrics.js';

// Realistic browser headers for JioSaavn requests to avoid Cloudflare/WAF 403 blocks on serverless
const JIO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.jiosaavn.com/',
  'Origin': 'https://www.jiosaavn.com',
  'Cookie': 'L=tamil;'
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range, X-Requested-With',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
};

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

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

function normalizeSaavnFullItem(item) {
  const durationSec = parseInt(item.duration || item.more_info?.duration, 10) || 240;
  const rawImage = item.image || item.more_info?.image || '';
  const highResImage = rawImage
    .replace('50x50.jpg', '500x500.jpg')
    .replace('150x150.jpg', '500x500.jpg');

  const encUrl = item.encrypted_media_url || item.more_info?.encrypted_media_url;
  const fullAudioUrl = encUrl ? decryptJioMediaUrl(encUrl) : null;
  const rawSingers = item.singers || item.primary_artists || item.more_info?.singers || item.more_info?.artistMap?.primary_artists?.map(a => a.name).join(', ') || '';
  const singersList = rawSingers.split(',').map(s => s.trim()).filter(Boolean);

  const cleanTitle = (item.song || item.title || item.more_info?.song || 'Unknown Title')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&');

  const cleanAlbum = (item.album || item.more_info?.album || '')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&');

  const detectedMd = detectMusicDirector(`${item.music || item.more_info?.music || ''} ${singersList.join(' ')} ${cleanTitle}`);

  return {
    id: `saavn-${item.id}`,
    sourceId: String(item.id),
    title: cleanTitle,
    artist: item.primary_artists || item.singers || singersList[0] || 'Tamil Artist',
    singers: singersList.length > 0 ? singersList : ['Tamil Artist'],
    musicDirector: detectedMd || item.music || '',
    album: cleanAlbum,
    year: item.year || item.more_info?.year || '',
    duration: durationSec,
    durationFormatted: formatDuration(durationSec),
    artworkUrl: highResImage || rawImage || '',
    thumbnailUrl: rawImage || '',
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
    audioType: 'Audio Track',
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

// In-memory cache for Netlify warm invocations
const functionCache = new Map();
const CACHE_TTL = 15 * 60 * 1000;

export const handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  // Normalize path across Netlify rewrite patterns
  let path = (event.path || '')
    .replace(/^\/\.netlify\/functions\/api/, '')
    .replace(/^\/api/, '');
  if (!path.startsWith('/')) path = '/' + path;

  const query = event.queryStringParameters || {};

  try {
    // 1. Trending Songs
    if (path === '/songs/trending') {
      const cacheKey = 'trending:tamil';
      const cached = functionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ results: cached.data })
        };
      }

      let results = [];
      try {
        const saavnRes = await axios.get('https://www.jiosaavn.com/api.php', {
          params: {
            __call: 'search.getResults',
            _format: 'json',
            _marker: '0',
            ctx: 'web6dot0',
            p: 1,
            n: 20,
            q: 'Latest Tamil Hits 2024'
          },
          headers: JIO_HEADERS,
          timeout: 9000
        });

        if (saavnRes.data?.results?.length > 0) {
          results = saavnRes.data.results.map(normalizeSaavnFullItem);
        }
      } catch (e) {
        console.warn('JioSaavn trending failed, using iTunes fallback:', e.message);
      }

      if (!results.length) {
        try {
          const itunesRes = await axios.get('https://itunes.apple.com/search', {
            params: {
              term: 'tamil hits 2025',
              country: 'IN',
              media: 'music',
              entity: 'song',
              limit: 20
            },
            timeout: 8000
          });
          if (itunesRes.data?.results) {
            results = itunesRes.data.results.map(normalizeItunesItem);
          }
        } catch (itunesErr) {}
      }

      // Auto-resolve any tracks that do not have 320kbps full audio
      const needResolve = results.filter(r => !r.isFullAudio).slice(0, 10);
      if (needResolve.length > 0) {
        await Promise.allSettled(
          needResolve.map(async (norm) => {
            try {
              const res = await resolveFull320Audio(norm.title, norm.artist, norm.album);
              if (res && res.url) {
                norm.audioUrl = res.url;
                norm.downloadUrl = res.url;
                norm.isFullAudio = true;
                norm.duration = res.duration || norm.duration;
                norm.durationFormatted = formatDuration(norm.duration);
                norm.audioQuality = '320 Kbps HQ Studio Audio';
                norm.audioType = '320 Kbps Full HQ Audio';
              }
            } catch (err) {}
          })
        );
      }

      functionCache.set(cacheKey, { data: results, timestamp: Date.now() });
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ results })
      };
    }

    // 2. Song Search
    if (path === '/songs/search') {
      const q = (query.q || '').trim();
      const limit = Math.min(parseInt(query.limit, 10) || 20, 50);

      if (!q) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Search query is required' })
        };
      }

      const combinedResults = [];
      const seenIds = new Set();

      const saavnPromise = axios.get('https://www.jiosaavn.com/api.php', {
        params: {
          __call: 'search.getResults',
          _format: 'json',
          _marker: '0',
          ctx: 'web6dot0',
          p: 1,
          n: Math.max(limit, 30),
          q
        },
        headers: JIO_HEADERS,
        timeout: 9000
      }).catch(err => ({ data: { results: [] } }));

      const itunesPromise = axios.get('https://itunes.apple.com/search', {
        params: {
          term: q,
          country: 'IN',
          media: 'music',
          entity: 'song',
          limit: Math.max(limit, 20)
        },
        timeout: 8000
      }).catch(err => ({ data: { results: [] } }));

      const [saavnRes, itunesRes] = await Promise.all([saavnPromise, itunesPromise]);

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

      if (itunesRes?.data?.results) {
        for (const item of itunesRes.data.results) {
          const norm = normalizeItunesItem(item);
          const titleKey = norm.title.toLowerCase().replace(/\s*\(From\s+[^)]+\)/i, '').trim();
          const matchingSaavn = combinedResults.find(s =>
            s.isFullAudio && (s.title.toLowerCase().includes(titleKey) || titleKey.includes(s.title.toLowerCase()))
          );

          if (matchingSaavn) {
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

      // Auto-resolve any tracks that do not have full 320 audio
      const unmatchedItems = combinedResults.filter(s => !s.isFullAudio).slice(0, 10);
      if (unmatchedItems.length > 0) {
        await Promise.allSettled(
          unmatchedItems.map(async (norm) => {
            try {
              const res = await resolveFull320Audio(norm.title, norm.artist, norm.album);
              if (res && res.url) {
                norm.audioUrl = res.url;
                norm.downloadUrl = res.url;
                norm.isFullAudio = true;
                norm.duration = res.duration || norm.duration;
                norm.durationFormatted = formatDuration(norm.duration);
                norm.audioQuality = '320 Kbps HQ Studio Audio';
                norm.audioType = '320 Kbps Full HQ Audio';
              }
            } catch (e) {}
          })
        );
      }

      const finalResults = combinedResults.slice(0, limit);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          query: q,
          count: finalResults.length,
          results: finalResults
        })
      };
    }

    // 3. Resolve Full 320kbps Audio
    if (path === '/songs/resolve') {
      const title = (query.title || '').trim();
      const artist = (query.artist || '').trim();
      const album = (query.album || '').trim();

      if (!title) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'title parameter is required' })
        };
      }

      const result = await resolveFull320Audio(title, artist, album);
      if (result && result.url) {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            url: result.url,
            quality: result.quality || '320 Kbps HQ Studio Audio',
            duration: result.duration,
            title: result.title || title,
            artist: result.artist || artist,
            album: result.album || album,
            streamUrl: result.url,
            proxyStreamUrl: `/api/stream?url=${encodeURIComponent(result.url)}`
          })
        };
      }

      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Could not resolve full audio for this track' })
      };
    }

    // 4. Albums Search
    if (path === '/songs/albums') {
      const q = (query.q || '').trim();
      const limit = Math.min(parseInt(query.limit, 10) || 15, 30);

      if (!q) {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ results: [] })
        };
      }

      const albumList = [];
      try {
        const saavnRes = await axios.get('https://www.jiosaavn.com/api.php', {
          params: {
            __call: 'search.getAlbumResults',
            _format: 'json',
            _marker: '0',
            ctx: 'web6dot0',
            p: 1,
            n: limit,
            q
          },
          headers: JIO_HEADERS,
          timeout: 8000
        });

        if (saavnRes.data?.results) {
          for (const item of saavnRes.data.results) {
            const highRes = (item.image || '').replace('150x150.jpg', '500x500.jpg');
            albumList.push({
              id: `saavn-album-${item.albumid || item.id}`,
              collectionId: item.albumid || item.id,
              title: item.title || item.name || '',
              artist: item.artist?.music?.[0]?.name || item.primary_artists || 'Tamil Music',
              year: item.year || '',
              artworkUrl: highRes || item.image || '',
              trackCount: 0,
              genre: 'Tamil Soundtrack',
              source: 'JioSaavn'
            });
          }
        }
      } catch (err) {}

      if (albumList.length < limit) {
        try {
          const itunesRes = await axios.get('https://itunes.apple.com/search', {
            params: {
              term: `${q} tamil`,
              country: 'IN',
              media: 'music',
              entity: 'album',
              limit: limit - albumList.length
            },
            timeout: 8000
          });
          if (itunesRes.data?.results) {
            for (const item of itunesRes.data.results) {
              albumList.push(normalizeItunesAlbum(item));
            }
          }
        } catch (e) {}
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ results: albumList })
      };
    }

    // 5. Album Details
    if (path === '/songs/album-details') {
      const collectionId = query.collectionId || query.id;
      const albumTitle = query.title || '';
      const albumArtist = query.artist || '';

      let tracks = [];
      let albumMeta = null;

      const saavnSearchTerm = (albumTitle || collectionId || '')
        .replace(/^(itunes-album-|itunes-|saavn-album-|saavn-)/, '')
        .trim();

      if (saavnSearchTerm) {
        try {
          const sRes = await axios.get('https://www.jiosaavn.com/api.php', {
            params: {
              __call: 'search.getAlbumResults',
              _format: 'json',
              _marker: '0',
              ctx: 'web6dot0',
              p: 1,
              n: 5,
              q: saavnSearchTerm
            },
            headers: JIO_HEADERS,
            timeout: 8000
          });

          const albumItem = sRes.data?.results?.[0];
          const albumId = albumItem?.albumid || albumItem?.id;
          if (albumId) {
            const dRes = await axios.get('https://www.jiosaavn.com/api.php', {
              params: {
                __call: 'content.getAlbumDetails',
                _format: 'json',
                _marker: '0',
                ctx: 'web6dot0',
                albumid: albumId
              },
              headers: JIO_HEADERS,
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
        } catch (e) {}
      }

      // iTunes fallback if JioSaavn returned no tracks
      if (!tracks.length) {
        const cleanId = String(collectionId || '').replace(/^itunes-album-|^itunes-/, '');
        if (cleanId && !isNaN(cleanId)) {
          try {
            const itunesRes = await axios.get('https://itunes.apple.com/lookup', {
              params: { id: cleanId, entity: 'song', country: 'IN' },
              timeout: 8000
            });
            const results = itunesRes.data?.results || [];
            const itunesAlbumItem = results.find(x => x.wrapperType === 'collection');
            const songItems = results.filter(x => x.wrapperType === 'track');
            if (itunesAlbumItem) {
              albumMeta = normalizeItunesAlbum(itunesAlbumItem);
            }
            tracks = songItems.map(normalizeItunesItem);
          } catch (e) {}
        }
      }

      // Auto-resolve any tracks that do not have full 320 audio
      const needResolve = tracks.filter(t => !t.isFullAudio).slice(0, 15);
      if (needResolve.length > 0) {
        await Promise.allSettled(
          needResolve.map(async (t) => {
            try {
              const res = await resolveFull320Audio(t.title, t.artist, albumTitle || albumMeta?.title);
              if (res && res.url) {
                t.audioUrl = res.url;
                t.downloadUrl = res.url;
                t.isFullAudio = true;
                t.duration = res.duration || t.duration;
                t.durationFormatted = formatDuration(t.duration);
                t.audioQuality = '320 Kbps HQ Studio Audio';
                t.audioType = '320 Kbps Full HQ Audio';
              }
            } catch (e) {}
          })
        );
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ album: albumMeta, songs: tracks })
      };
    }

    // 6. Synchronized Lyrics
    if (path === '/lyrics') {
      const trackName = (query.track_name || '').trim();
      const artistName = (query.artist_name || '').trim();
      const albumName = (query.album_name || '').trim();
      const duration = parseFloat(query.duration) || 0;

      if (!trackName) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'track_name parameter is required' })
        };
      }

      let lyrics = null;
      try {
        const cleanTitle = trackName.replace(/\s*\(From\s+[^)]+\)/gi, '').trim();
        const lrcRes = await axios.get('https://lrclib.net/api/get', {
          params: {
            track_name: cleanTitle,
            artist_name: artistName ? artistName.split('&')[0].trim() : undefined,
            duration: duration > 0 ? duration : undefined
          },
          headers: { 'User-Agent': 'TamilTunes/1.0' },
          timeout: 7000
        });
        if (lrcRes.data && (lrcRes.data.syncedLyrics || lrcRes.data.plainLyrics)) {
          lyrics = {
            id: lrcRes.data.id,
            trackName: lrcRes.data.trackName,
            artistName: lrcRes.data.artistName,
            albumName: lrcRes.data.albumName,
            duration: lrcRes.data.duration,
            syncedLyrics: lrcRes.data.syncedLyrics,
            plainLyrics: lrcRes.data.plainLyrics,
            source: 'LRCLIB (Official API)'
          };
        }
      } catch (e) {}

      // Verified fallback archive
      if (!lyrics) {
        lyrics = getFallbackLyrics(trackName, artistName);
      }

      if (lyrics) {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify(lyrics)
        };
      }

      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'No lyrics found for this song' })
      };
    }

    // 7. Sources
    if (path === '/sources') {
      const title = (query.title || query.track_name || '').trim();
      const artist = (query.artist || query.artist_name || '').trim();
      const album = (query.album || query.album_name || '').trim();
      const audioUrl = (query.audioUrl || query.audio_url || '').trim();
      const q = `${title} ${artist}`.trim();

      const backendDownloadUrl = audioUrl
        ? `/api/download/song?audioUrl=${encodeURIComponent(audioUrl)}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`
        : null;

      const communitySources = [
        {
          id: 'masstamilan',
          providerName: 'Masstamilan',
          sourceType: 'community',
          matchingTitle: title,
          movieOrAlbum: album,
          audioQuality: '128 & 320 Kbps',
          sourceUrl: `https://www.masstamilan.dev/search?keyword=${encodeURIComponent(title)}`,
          directDownloadUrl: backendDownloadUrl,
          hasDirectDownload: true,
          isAuthorized: false,
          badge: 'Tamil Movie MP3s',
          statusNote: '320kbps Available',
          description: 'Popular community repository for Tamil movie audio albums and zip files.'
        },
        {
          id: 'mp3chetta',
          providerName: 'Mp3chetta',
          sourceType: 'community',
          matchingTitle: title,
          movieOrAlbum: album,
          audioQuality: '320 Kbps High Quality',
          sourceUrl: `https://mp3chetta.com/?s=${encodeURIComponent(title)}`,
          directDownloadUrl: backendDownloadUrl,
          hasDirectDownload: true,
          isAuthorized: false,
          badge: 'HQ Tracks',
          statusNote: 'Full Track Available',
          description: 'Direct MP3 downloads for Tamil soundtracks and private singles.'
        },
        {
          id: 'koshalworld',
          providerName: 'Koshalworld',
          sourceType: 'community',
          matchingTitle: title,
          movieOrAlbum: album,
          audioQuality: '320 Kbps Studio Master',
          sourceUrl: `https://koshalworld.com/search?q=${encodeURIComponent(title)}`,
          directDownloadUrl: backendDownloadUrl,
          hasDirectDownload: true,
          isAuthorized: false,
          badge: 'Studio Audio',
          statusNote: 'High Bitrate',
          description: 'South Indian film music releases with multi-bitrate audio.'
        },
        {
          id: 'pagalnew',
          providerName: 'Pagalnew',
          sourceType: 'community',
          matchingTitle: title,
          movieOrAlbum: album,
          audioQuality: '320 Kbps / 128 Kbps',
          sourceUrl: `https://pagalnew.com/search.php?find=${encodeURIComponent(title)}`,
          directDownloadUrl: backendDownloadUrl,
          hasDirectDownload: true,
          isAuthorized: false,
          badge: 'Fast Mirror',
          statusNote: '320kbps Available',
          description: 'Broad Indian film and indie song repository.'
        }
      ];

      const officialSources = [
        {
          id: 'spotify',
          providerName: 'Spotify',
          sourceType: 'official',
          matchingTitle: title,
          movieOrAlbum: album,
          audioQuality: '320 Kbps Ogg Vorbis',
          sourceUrl: `https://open.spotify.com/search/${encodeURIComponent(q)}`,
          directDownloadUrl: backendDownloadUrl,
          hasDirectDownload: true,
          isAuthorized: true,
          badge: 'Official HQ Stream',
          statusNote: 'Full Track Available',
          description: 'Listen on Spotify with lossless/high-bitrate playback and offline syncing.'
        },
        {
          id: 'apple_music',
          providerName: 'Apple Music',
          sourceType: 'official',
          matchingTitle: title,
          movieOrAlbum: album,
          audioQuality: 'Lossless / ALAC 24-bit',
          sourceUrl: `https://music.apple.com/in/search?term=${encodeURIComponent(q)}`,
          directDownloadUrl: backendDownloadUrl,
          hasDirectDownload: true,
          isAuthorized: true,
          badge: 'Lossless Audio',
          statusNote: 'Full Track Available',
          description: 'Apple Music lossless & Spatial Audio with Dolby Atmos support.'
        },
        {
          id: 'jiosaavn',
          providerName: 'JioSaavn',
          sourceType: 'official',
          matchingTitle: title,
          movieOrAlbum: album,
          audioQuality: '320 Kbps AAC',
          sourceUrl: `https://www.jiosaavn.com/search/${encodeURIComponent(q)}`,
          directDownloadUrl: backendDownloadUrl,
          hasDirectDownload: true,
          isAuthorized: true,
          badge: 'Direct 320kbps Stream',
          statusNote: 'Full Track Available',
          description: 'Original studio audio master from JioSaavn catalogue.'
        },
        {
          id: 'youtube_music',
          providerName: 'YouTube Music',
          sourceType: 'official',
          matchingTitle: title,
          movieOrAlbum: album,
          audioQuality: '256 Kbps AAC / 1080p Video',
          sourceUrl: `https://music.youtube.com/search?q=${encodeURIComponent(q)}`,
          directDownloadUrl: backendDownloadUrl,
          hasDirectDownload: true,
          isAuthorized: true,
          badge: 'Official Audio',
          statusNote: 'Music Video & Offline Audio',
          description: 'Stream official Tamil music videos, lyrical videos, and audio tracks.'
        }
      ];

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          query: { title, artist, album },
          timestamp: new Date().toISOString(),
          communitySources,
          officialSources,
          backendDownloadUrl
        })
      };
    }

    // 7. Download Song
    if (path === '/download/song') {
      const rawTitle = query.title || 'Tamil Song';
      const rawArtist = query.artist || '';
      const rawAlbum = query.album || '';
      let audioUrl = query.audioUrl || query.url;

      let isFull320 = false;
      if (audioUrl && (audioUrl.includes('aac.saavncdn.com') || audioUrl.includes('_320.mp4'))) {
        isFull320 = true;
      }

      if (!isFull320 && rawTitle) {
        try {
          const resolved = await resolveFull320Audio(rawTitle, rawArtist, rawAlbum);
          if (resolved && resolved.url) {
            audioUrl = resolved.url;
            isFull320 = true;
          }
        } catch (e) {}
      }

      const cleanTitle = rawTitle.replace(/[<>:"/\\|?*]/g, '').trim();
      const cleanArtist = rawArtist.replace(/[<>:"/\\|?*]/g, '').trim();
      const filename = cleanArtist ? `${cleanTitle} - ${cleanArtist} (320kbps).mp3` : `${cleanTitle} (320kbps).mp3`;

      // Return JSON metadata format for client-side blob download
      if (query.format === 'json') {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: Boolean(audioUrl),
            downloadUrl: audioUrl,
            filename,
            isFull320
          })
        };
      }

      if (audioUrl) {
        return {
          statusCode: 302,
          headers: {
            ...CORS_HEADERS,
            'Location': audioUrl,
            'Content-Disposition': `attachment; filename="${filename}"`
          },
          body: ''
        };
      }

      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Audio stream unavailable for download' })
      };
    }

    // 8. Download Cover Artwork
    if (path === '/download/artwork') {
      const imageUrl = query.url || query.imageUrl || query.artworkUrl;
      const rawTitle = query.title || query.album || 'Cover';

      if (!imageUrl) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'url parameter is required for artwork download' })
        };
      }

      // Upgrade artwork to high resolution
      const highResUrl = imageUrl
        .replace('150x150.jpg', '500x500.jpg')
        .replace('50x50.jpg', '500x500.jpg')
        .replace('100x100bb.jpg', '600x600bb.jpg')
        .replace('100x100bb.png', '600x600bb.png')
        .replace(/100x100/g, '600x600');

      const cleanTitle = rawTitle.replace(/[<>:"/\\|?*]/g, '').trim();
      const filename = `${cleanTitle || 'Cover'} - Cover.jpg`;
      const safeAsciiArtwork = filename.replace(/[^\x20-\x7E]/g, '').replace(/"/g, '');

      // Return JSON metadata format for client verification if requested
      if (query.format === 'json') {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true,
            downloadUrl: highResUrl,
            filename
          })
        };
      }

      try {
        const imgRes = await axios.get(highResUrl, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
          },
          timeout: 10000
        });

        const contentType = imgRes.headers['content-type'] || 'image/jpeg';
        const imageBuffer = Buffer.from(imgRes.data);

        return {
          statusCode: 200,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${safeAsciiArtwork}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
            'Content-Length': String(imageBuffer.length),
            'Cache-Control': 'public, max-age=86400'
          },
          body: imageBuffer.toString('base64'),
          isBase64Encoded: true
        };
      } catch (err) {
        console.error('Artwork download proxy error in serverless:', err.message);
        // Fallback: 302 redirect directly to high-res image
        return {
          statusCode: 302,
          headers: {
            ...CORS_HEADERS,
            'Location': highResUrl,
            'Content-Disposition': `attachment; filename="${safeAsciiArtwork}"`
          },
          body: ''
        };
      }
    }

    // 9. Resolve Spotify Canvas Video
    if (path === '/download/canvas/resolve' || path === '/spotify/canvas') {
      const urlParam = query.url || query.link || query.spotifyUrl || '';
      const trackIdParam = query.trackId || query.id || '';
      const rawTitle = query.title || '';
      const rawArtist = query.artist || '';

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

      // If trackId not directly passed, attempt search by artist/title
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
              return {
                statusCode: 200,
                headers: CORS_HEADERS,
                body: JSON.stringify({
                  success: true,
                  hasCanvas: true,
                  canvasUrl,
                  title: rawTitle || searchRes.data.artists[0].name,
                  resolution: '1080p (1080x1920 Full HD)',
                  aspectRatio: '9:16 Vertical Portrait',
                  fps: 60,
                  format: 'MP4'
                })
              };
            }
          }
        } catch (e) {}
      }

      if (!trackId) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: false,
            hasCanvas: false,
            error: 'A valid Spotify track URL (e.g. https://open.spotify.com/track/...) or 22-character track ID is required.'
          })
        };
      }

      try {
        const spotifyTrackUrl = `https://open.spotify.com/track/${trackId}`;
        const scraperUrl = `https://canvasdownloader.com/canvas?link=${encodeURIComponent(spotifyTrackUrl)}`;

        const res = await axios.get(scraperUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          timeout: 9000
        });

        const html = String(res.data || '');
        if (html.includes('Canvas not found')) {
          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
              success: false,
              hasCanvas: false,
              trackId,
              error: 'No Spotify Canvas video is available for this track on Spotify.'
            })
          };
        }

        const videoMatch = html.match(/(https:\/\/canvaz\.scdn\.co\/upload\/[^\s"'<>]+)/i) ||
                           html.match(/<source[^>]+src="([^"]+\.cnvs\.mp4[^"]*)"/i);

        if (!videoMatch) {
          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
              success: false,
              hasCanvas: false,
              trackId,
              error: 'Canvas video stream not found in Spotify response.'
            })
          };
        }

        const canvasUrl = videoMatch[1].replace('#t=0.001', '');
        const titleMatch = html.match(/<title>([\s\S]*?)·\s*Canvas Downloader/i);
        const resolvedTitle = titleMatch ? titleMatch[1].replace('Canvas by ', '').trim() : (rawTitle || 'Spotify Track');

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true,
            hasCanvas: true,
            trackId,
            title: resolvedTitle,
            canvasUrl,
            resolution: '1080p (1080x1920 Full HD)',
            aspectRatio: '9:16 Vertical Portrait',
            fps: 60,
            format: 'MP4'
          })
        };
      } catch (err) {
        console.error('Spotify Canvas resolve error:', err.message);
        return {
          statusCode: 500,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: false,
            error: 'Failed to resolve Canvas from Spotify: ' + err.message
          })
        };
      }
    }

    // 10. Download Spotify Canvas Video
    if (path === '/download/canvas') {
      const videoUrl = query.url;
      const rawTitle = query.title || 'Spotify Track';

      if (!videoUrl) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'url parameter is required' })
        };
      }

      const cleanTitle = rawTitle.replace(/[<>:"/\\|?*]/g, '').trim();
      const filename = `${cleanTitle || 'Track'} - Spotify Canvas (1080p 60fps).mp4`;
      const safeAscii = filename.replace(/[^\x20-\x7E]/g, '').replace(/"/g, '');

      return {
        statusCode: 302,
        headers: {
          ...CORS_HEADERS,
          'Location': videoUrl,
          'Content-Disposition': `attachment; filename="${safeAscii}"; filename*=UTF-8''${encodeURIComponent(filename)}`
        },
        body: ''
      };
    }

    // 11. Stream proxy
    if (path === '/stream') {
      const targetUrl = query.url;
      if (!targetUrl) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'url parameter is required' })
        };
      }

      return {
        statusCode: 302,
        headers: {
          ...CORS_HEADERS,
          'Location': targetUrl
        },
        body: ''
      };
    }

    // 9. Health
    if (path === '/health') {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          status: 'ok',
          service: 'TamilTunes Serverless API (Netlify Native)',
          timestamp: new Date().toISOString()
        })
      };
    }

    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: `Endpoint ${path} not found` })
    };

  } catch (error) {
    console.error('Netlify function error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Serverless execution error', details: error.message })
    };
  }
};
