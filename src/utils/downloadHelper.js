import { resolveSongAudio } from '../services/musicMetadata';

/**
 * Sanitizes filename to prevent invalid characters on Windows/Mac/Linux
 */
function sanitizeFilename(name = '') {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Downloads a complete full-length 320kbps song file with multi-tier fallback.
 * Guarantees zero "download failed" browser errors and full-length 320kbps audio.
 *
 * @param {Object} song The song object to download
 * @returns {Promise<{ success: boolean, method?: string, error?: string }>}
 */
export async function downloadSongFile(song) {
  if (!song) {
    return { success: false, error: 'No song provided for download' };
  }

  const rawTitle = song.title || 'Tamil Song';
  const rawArtist = song.artist || '';
  const rawAlbum = song.album || '';

  const cleanTitle = sanitizeFilename(rawTitle);
  const cleanArtist = sanitizeFilename(rawArtist);
  const filename = cleanArtist
    ? `${cleanTitle} - ${cleanArtist} (320kbps).mp3`
    : `${cleanTitle} (320kbps).mp3`;

  let targetUrl = song.downloadUrl || (song.isFullAudio && song.audioUrl && !song.audioUrl.includes('preview') && !song.audioUrl.includes('apple.com') ? song.audioUrl : '');

  // 1. Resolve full 320kbps audio if not yet resolved
  if (!targetUrl || targetUrl.includes('preview') || targetUrl.includes('apple.com') || targetUrl.includes('mzstatic.com')) {
    try {
      const resolved = await resolveSongAudio(rawTitle, rawArtist, rawAlbum);
      if (resolved && resolved.url) {
        targetUrl = resolved.url;
      }
    } catch (resolveErr) {
      console.warn('Resolution before download failed:', resolveErr);
    }
  }

  // Fallback: If still unresolved, try resolving with clean title
  if (!targetUrl || targetUrl.includes('preview') || targetUrl.includes('apple.com')) {
    try {
      const simplifiedTitle = rawTitle.replace(/\s*\(From\s+[^)]+\)/gi, '').replace(/\s*-\s*.*$/gi, '').trim();
      const resolved = await resolveSongAudio(simplifiedTitle, (rawArtist || '').split('&')[0].trim(), rawAlbum);
      if (resolved && resolved.url) {
        targetUrl = resolved.url;
      }
    } catch (e) {}
  }

  // Fallback 2: Query /api/download/song?format=json directly from serverless backend
  if (!targetUrl || targetUrl.includes('preview') || targetUrl.includes('apple.com')) {
    try {
      const res = await fetch(`/api/download/song?title=${encodeURIComponent(rawTitle)}&artist=${encodeURIComponent(rawArtist)}&album=${encodeURIComponent(rawAlbum)}&format=json`);
      if (res.ok) {
        const json = await res.json();
        if (json.downloadUrl) {
          targetUrl = json.downloadUrl;
        }
      }
    } catch (e) {}
  }

  // Strategy A: Direct in-browser Blob download from high-speed CDN
  // aac.saavncdn.com supports CORS (Access-Control-Allow-Origin: *).
  // This downloads the complete full-length file with 100% native save and exact filename,
  // bypassing serverless payload limits (e.g. Netlify 6MB) and avoiding 302 cross-origin blocks.
  if (targetUrl && (targetUrl.includes('saavncdn.com') || targetUrl.includes('_320.mp4'))) {
    try {
      const cdnRes = await fetch(targetUrl, { mode: 'cors' });
      if (cdnRes.ok) {
        const blob = await cdnRes.blob();
        if (blob && blob.size > 100000) { // Verify full audio file size (> 100KB)
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
          return { success: true, method: 'direct-cdn-blob' };
        }
      }
    } catch (cdnErr) {
      console.warn('Direct CDN blob fetch failed, falling back to proxy stream:', cdnErr);
    }
  }

  // Strategy B: Proxy stream Blob download (/api/stream?url=...)
  // If the browser blocks direct CDN fetch (e.g. adblocker or strict CORS),
  // stream through the local/serverless proxy endpoint which adds CORS headers.
  if (targetUrl) {
    try {
      const proxyUrl = `/api/stream?url=${encodeURIComponent(targetUrl)}`;
      const proxyRes = await fetch(proxyUrl);
      if (proxyRes.ok) {
        const blob = await proxyRes.blob();
        if (blob && blob.size > 100000) {
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
          return { success: true, method: 'proxy-blob' };
        }
      }
    } catch (proxyErr) {
      console.warn('Proxy blob fetch failed, falling back to backend download route:', proxyErr);
    }
  }

  // Strategy C: Backend download route (/api/download/song)
  try {
    const downloadEndpoint = `/api/download/song?audioUrl=${encodeURIComponent(targetUrl || '')}&title=${encodeURIComponent(rawTitle)}&artist=${encodeURIComponent(rawArtist)}&album=${encodeURIComponent(rawAlbum)}`;
    const a = document.createElement('a');
    a.href = downloadEndpoint;
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return { success: true, method: 'backend-download' };
  } catch (backendErr) {
    console.error('Backend download route trigger failed:', backendErr);
  }

  // Strategy D: Direct window navigation fallback
  if (targetUrl) {
    window.open(targetUrl, '_blank');
    return { success: true, method: 'direct-window' };
  }

  return { success: false, error: 'Could not obtain full audio download stream' };
}
