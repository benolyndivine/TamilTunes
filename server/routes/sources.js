import express from 'express';
import axios from 'axios';

const router = express.Router();

/**
 * Clean search query by removing noise
 */
function cleanSearchQuery(title = '', album = '') {
  let clean = title
    .replace(/\s*\(From\s+["'][^"']+["']\)/i, '')
    .replace(/\s*\(From\s+[^)]+\)/i, '')
    .replace(/\s*-\s*Single$/i, '')
    .replace(/\s*-\s*Tamil$/i, '')
    .trim();

  // If album is specified and different, it helps find the movie soundtrack
  if (album && album !== title && !clean.toLowerCase().includes(album.toLowerCase())) {
    return `${clean} ${album}`;
  }
  return clean;
}

/**
 * Base Search Provider class for modular sources
 */
class BaseSourceProvider {
  constructor({ id, name, baseUrl, type = 'community', badge = 'Web Source', quality = '128 / 320 Kbps' }) {
    this.id = id;
    this.name = name;
    this.baseUrl = baseUrl;
    this.type = type;
    this.badge = badge;
    this.quality = quality;
  }

  async search(songTitle, artist, album) {
    throw new Error('Not implemented');
  }
}

/**
 * Masstamilan Provider
 * Searches https://www.masstamilan.dev
 */
class MasstamilanProvider extends BaseSourceProvider {
  constructor() {
    super({
      id: 'masstamilan',
      name: 'Masstamilan',
      baseUrl: 'https://www.masstamilan.dev',
      type: 'community',
      badge: 'Tamil Movie MP3s',
      quality: '128 Kbps & 320 Kbps'
    });
  }

  async search(songTitle, artist, album) {
    const searchKeyword = cleanSearchQuery(songTitle, album);
    const searchUrl = `${this.baseUrl}/search?keyword=${encodeURIComponent(searchKeyword)}`;

    let liveStatus = 'Search link available';
    try {
      // Safe probe without bypassing bot protection or CAPTCHA
      await axios.head(this.baseUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 3000
      });
      liveStatus = 'Verified search index';
    } catch (e) {
      if (e.response?.status === 403) {
        liveStatus = 'Cloudflare protected (open in browser)';
      } else {
        liveStatus = 'Available via direct web link';
      }
    }

    return {
      id: this.id,
      providerName: this.name,
      sourceType: this.type,
      matchingTitle: songTitle,
      movieOrAlbum: album || 'Tamil Movie Soundtrack',
      audioQuality: this.quality,
      sourceUrl: searchUrl,
      directDownloadUrl: null, // No fabricated or unauthorized direct bypass
      hasDirectDownload: false,
      isAuthorized: false,
      badge: this.badge,
      statusNote: liveStatus,
      description: 'Search results index on Masstamilan for Tamil songs, zip downloads, and individual tracks.'
    };
  }
}

/**
 * Mp3chetta Provider
 * Searches https://www.mp3chetta.com
 */
class Mp3chettaProvider extends BaseSourceProvider {
  constructor() {
    super({
      id: 'mp3chetta',
      name: 'Mp3chetta',
      baseUrl: 'https://mp3chetta.com',
      type: 'community',
      badge: 'MP3 Portal',
      quality: '192 / 320 Kbps'
    });
  }

  async search(songTitle, artist, album) {
    const searchKeyword = cleanSearchQuery(songTitle);
    const searchUrl = `${this.baseUrl}/?s=${encodeURIComponent(searchKeyword)}`;

    return {
      id: this.id,
      providerName: this.name,
      sourceType: this.type,
      matchingTitle: songTitle,
      movieOrAlbum: album || '',
      audioQuality: this.quality,
      sourceUrl: searchUrl,
      directDownloadUrl: null,
      hasDirectDownload: false,
      isAuthorized: false,
      badge: this.badge,
      statusNote: 'Search result page link',
      description: 'Public song search directory on Mp3chetta.'
    };
  }
}

/**
 * Koshalworld Provider
 * Searches https://www.koshalworld.com
 */
class KoshalworldProvider extends BaseSourceProvider {
  constructor() {
    super({
      id: 'koshalworld',
      name: 'Koshalworld',
      baseUrl: 'https://koshalworld.com',
      type: 'community',
      badge: 'Audio Directory',
      quality: 'High Quality MP3'
    });
  }

  async search(songTitle, artist, album) {
    const searchKeyword = cleanSearchQuery(songTitle);
    const searchUrl = `${this.baseUrl}/?s=${encodeURIComponent(searchKeyword)}`;

    return {
      id: this.id,
      providerName: this.name,
      sourceType: this.type,
      matchingTitle: songTitle,
      movieOrAlbum: album || '',
      audioQuality: this.quality,
      sourceUrl: searchUrl,
      directDownloadUrl: null,
      hasDirectDownload: false,
      isAuthorized: false,
      badge: this.badge,
      statusNote: 'Search directory link',
      description: 'Public music catalog and download search on Koshalworld.'
    };
  }
}

/**
 * Pagalnew Provider
 * Searches https://www.pagalnew.com
 */
class PagalnewProvider extends BaseSourceProvider {
  constructor() {
    super({
      id: 'pagalnew',
      name: 'Pagalnew',
      baseUrl: 'https://pagalnew.com',
      type: 'community',
      badge: 'Indian Music Archive',
      quality: '128 Kbps & 320 Kbps'
    });
  }

  async search(songTitle, artist, album) {
    const searchKeyword = cleanSearchQuery(songTitle);
    const searchUrl = `${this.baseUrl}/search.php?find=${encodeURIComponent(searchKeyword)}`;

    return {
      id: this.id,
      providerName: this.name,
      sourceType: this.type,
      matchingTitle: songTitle,
      movieOrAlbum: album || '',
      audioQuality: this.quality,
      sourceUrl: searchUrl,
      directDownloadUrl: null,
      hasDirectDownload: false,
      isAuthorized: false,
      badge: this.badge,
      statusNote: 'Direct search engine link',
      description: 'Indian songs index with 128kbps and 320kbps audio pages.'
    };
  }
}

/**
 * Licensed & Official Music Providers
 */
class LicensedPlatformsProvider {
  getPlatforms(songTitle, artist, album) {
    const q = cleanSearchQuery(songTitle, artist);

    return [
      {
        id: 'spotify',
        providerName: 'Spotify',
        sourceType: 'official',
        matchingTitle: songTitle,
        movieOrAlbum: album || 'Official Release',
        audioQuality: 'Up to 320 Kbps Ogg Vorbis',
        sourceUrl: `https://open.spotify.com/search/${encodeURIComponent(q)}`,
        directDownloadUrl: null,
        hasDirectDownload: false,
        isAuthorized: true,
        badge: 'Official Licensed Stream',
        statusNote: 'Free Streaming & Offline Downloads (Premium)',
        description: 'Listen on Spotify with synchronized lyrics, high fidelity audio, and official artist playlisting.'
      },
      {
        id: 'apple_music',
        providerName: 'Apple Music',
        sourceType: 'official',
        matchingTitle: songTitle,
        movieOrAlbum: album || 'Apple Digital Master',
        audioQuality: 'Lossless ALAC & Dolby Atmos',
        sourceUrl: `https://music.apple.com/in/search?term=${encodeURIComponent(q)}`,
        directDownloadUrl: null,
        hasDirectDownload: false,
        isAuthorized: true,
        badge: 'Apple Lossless',
        statusNote: 'Official Store & Lossless Stream',
        description: 'Stream in Studio Quality Lossless Audio or purchase track from iTunes Store.'
      },
      {
        id: 'jiosaavn',
        providerName: 'JioSaavn',
        sourceType: 'official',
        matchingTitle: songTitle,
        movieOrAlbum: album || 'Tamil Superhits',
        audioQuality: '320 Kbps AAC / MP3',
        sourceUrl: `https://www.jiosaavn.com/search/${encodeURIComponent(cleanSearchQuery(songTitle))}`,
        directDownloadUrl: null,
        hasDirectDownload: false,
        isAuthorized: true,
        badge: 'Official Indian Stream',
        statusNote: 'High Bitrate 320kbps & JioTunes',
        description: 'Stream officially on JioSaavn with unlimited high bitrate streaming.'
      },
      {
        id: 'youtube_music',
        providerName: 'YouTube Music',
        sourceType: 'official',
        matchingTitle: songTitle,
        movieOrAlbum: album || 'Official Audio / Video',
        audioQuality: '256 Kbps AAC',
        sourceUrl: `https://music.youtube.com/search?q=${encodeURIComponent(q)}`,
        directDownloadUrl: null,
        hasDirectDownload: false,
        isAuthorized: true,
        badge: 'Official Audio',
        statusNote: 'Music Video & Offline Audio',
        description: 'Stream official Tamil music videos, lyrical videos, and audio tracks.'
      }
    ];
  }
}

// Registry of modular providers
const communityProviders = [
  new MasstamilanProvider(),
  new Mp3chettaProvider(),
  new KoshalworldProvider(),
  new PagalnewProvider()
];

const licensedProvider = new LicensedPlatformsProvider();

/**
 * GET /api/sources
 * Query params: title, artist, album
 */
router.get('/', async (req, res) => {
  const title = (req.query.title || req.query.track_name || '').trim();
  const artist = (req.query.artist || req.query.artist_name || '').trim();
  const album = (req.query.album || req.query.album_name || '').trim();
  const audioUrl = (req.query.audioUrl || req.query.audio_url || '').trim();

  if (!title) {
    return res.status(400).json({ error: 'Song title parameter is required' });
  }

  const backendDownloadUrl = audioUrl
    ? `/api/download/song?audioUrl=${encodeURIComponent(audioUrl)}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`
    : null;

  try {
    // Run all community providers concurrently with safe individual error handling
    const communityResults = await Promise.all(
      communityProviders.map(async p => {
        try {
          const res = await p.search(title, artist, album);
          return {
            ...res,
            directDownloadUrl: backendDownloadUrl,
            hasDirectDownload: !!backendDownloadUrl
          };
        } catch (err) {
          console.warn(`Provider ${p.name} failed:`, err.message);
          return {
            id: p.id,
            providerName: p.name,
            sourceType: p.type,
            matchingTitle: title,
            movieOrAlbum: album,
            audioQuality: p.quality,
            sourceUrl: `${p.baseUrl}`,
            directDownloadUrl: backendDownloadUrl,
            hasDirectDownload: !!backendDownloadUrl,
            isAuthorized: false,
            badge: p.badge,
            statusNote: 'Provider link currently unavailable',
            description: 'Could not contact search endpoint.'
          };
        }
      })
    );

    const officialResults = licensedProvider.getPlatforms(title, artist, album).map(o => ({
      ...o,
      directDownloadUrl: backendDownloadUrl,
      hasDirectDownload: !!backendDownloadUrl
    }));

    res.json({
      query: { title, artist, album },
      timestamp: new Date().toISOString(),
      communitySources: communityResults,
      officialSources: officialResults,
      backendDownloadUrl,
      disclaimer: 'Tamil Music Finder provides direct backend downloads. Audio files are fetched directly via backend proxy without external redirects.'
    });
  } catch (error) {
    console.error('Sources error:', error.message);
    res.status(500).json({
      error: 'Failed to retrieve download and streaming sources',
      details: error.message
    });
  }
});

export default router;
