import axios from 'axios';

const API_BASE = '/api/lyrics';

/**
 * Retrieves synchronized or plain lyrics from LRCLIB via backend proxy
 */
export async function getLyrics({ trackName, artistName, albumName, duration, force = false }) {
  if (!trackName) {
    throw new Error('Track name is required to fetch lyrics');
  }

  const response = await axios.get(API_BASE, {
    params: {
      track_name: trackName,
      artist_name: artistName || '',
      album_name: albumName || '',
      duration: duration || 0,
      force: force ? 'true' : 'false'
    },
    timeout: 12000
  });

  return response.data;
}
