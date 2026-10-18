import axios from 'axios';

const API_BASE = '/api/sources';

function getFallbackSources(title, artist = '', album = '') {
  const q = `${title} ${artist}`.trim();
  const backendDownloadUrl = `/api/download/song?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(album)}`;

  return {
    query: { title, artist, album },
    timestamp: new Date().toISOString(),
    backendDownloadUrl,
    officialSources: [
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
    ],
    communitySources: [
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
        badge: 'Tamil & South MP3',
        statusNote: 'Direct MP3',
        description: 'Archive of South Indian film soundtracks in high-bitrate MP3.'
      }
    ],
    disclaimer: 'Tamil Music Finder provides direct backend downloads. Audio files are fetched directly via backend proxy without external redirects.'
  };
}

/**
 * Searches download and streaming sources for a selected song with client fallback
 */
export async function getDownloadSources({ title, artist, album, audioUrl }) {
  if (!title) {
    throw new Error('Song title is required to fetch sources');
  }

  try {
    const response = await axios.get(API_BASE, {
      params: {
        title,
        artist: artist || '',
        album: album || '',
        audioUrl: audioUrl || ''
      },
      timeout: 8000
    });
    if (response.data && (response.data.communitySources || response.data.officialSources)) {
      return response.data;
    }
  } catch (err) {
    console.warn('Backend sources fetch failed, falling back to client generated links:', err.message);
  }

  return getFallbackSources(title, artist, album);
}
