import axios from 'axios';

const API_BASE = '/api/sources';

/**
 * Searches download and streaming sources for a selected song
 */
export async function getDownloadSources({ title, artist, album, audioUrl }) {
  if (!title) {
    throw new Error('Song title is required to fetch sources');
  }

  const response = await axios.get(API_BASE, {
    params: {
      title,
      artist: artist || '',
      album: album || '',
      audioUrl: audioUrl || ''
    },
    timeout: 10000
  });

  return response.data;
}
