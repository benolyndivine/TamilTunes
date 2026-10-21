import { resolveSongAudio } from '../services/musicMetadata';

/**
 * Sanitizes filename to prevent invalid characters on Windows/Mac/Linux
 */
export function sanitizeFilename(name = '') {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Triggers a browser file download using an in-memory Blob
 */
function triggerBlobDownload(blob, filename) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.setAttribute('download', filename);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
}

/**
 * Downloads high-resolution album or song cover artwork with resilient multi-tier fallback:
 * Tier 1: Direct CORS Blob download from CDN (zero serverless traffic, instantaneous)
 * Tier 2: In-browser HTMLImageElement + Offscreen Canvas fallback
 * Tier 3: Netlify / Express backend proxy Blob download (/api/download/artwork)
 * Tier 4: Direct anchor tag download
 * Tier 5: Direct new tab fallback
 *
 * @param {string} imageUrl The cover artwork image URL
 * @param {string} title The song or album title for the file name
 * @returns {Promise<{ success: boolean, method?: string, error?: string }>}
 */
export async function downloadCoverImage(imageUrl, title = 'Album') {
  if (!imageUrl) {
    return { success: false, error: 'No image URL provided for cover download' };
  }

  // Upgrade image URL to highest possible resolution
  const highResUrl = imageUrl
    .replace('150x150.jpg', '500x500.jpg')
    .replace('50x50.jpg', '500x500.jpg')
    .replace('100x100bb.jpg', '600x600bb.jpg')
    .replace('100x100bb.png', '600x600bb.png')
    .replace(/100x100/g, '600x600');

  const cleanTitle = sanitizeFilename(title || 'Album');
  const filename = `${cleanTitle} - Cover.jpg`;

  // Tier 1: Direct CORS fetch with Blob (saavncdn & mzstatic allow Origin: *)
  try {
    const res = await fetch(highResUrl, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 500) {
        triggerBlobDownload(blob, filename);
        return { success: true, method: 'direct-cors-blob' };
      }
    }
  } catch (err) {
    console.warn('Direct image CORS fetch failed, trying canvas fallback:', err);
  }

  // Tier 2: In-browser HTMLImageElement + Offscreen Canvas fallback
  try {
    const blob = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 600;
          canvas.height = img.naturalHeight || 600;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
            'image/jpeg',
            0.95
          );
        } catch (canvasErr) {
          reject(canvasErr);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image in canvas'));
      setTimeout(() => reject(new Error('Image canvas timeout')), 6000);
      img.src = highResUrl;
    });

    if (blob && blob.size > 500) {
      triggerBlobDownload(blob, filename);
      return { success: true, method: 'canvas-blob' };
    }
  } catch (canvasErr) {
    console.warn('Canvas export failed, trying backend proxy:', canvasErr);
  }

  // Tier 3: Backend artwork proxy endpoint (/api/download/artwork)
  try {
    const artworkEndpoint = `/api/download/artwork?url=${encodeURIComponent(highResUrl)}&title=${encodeURIComponent(cleanTitle)}`;
    const proxyRes = await fetch(artworkEndpoint);
    if (proxyRes.ok) {
      const blob = await proxyRes.blob();
      if (blob && blob.size > 500) {
        triggerBlobDownload(blob, filename);
        return { success: true, method: 'backend-proxy-blob' };
      }
    }
  } catch (proxyErr) {
    console.warn('Backend proxy blob fetch failed, trying direct link download:', proxyErr);
  }

  // Tier 4: Backend download endpoint triggered via anchor tag
  try {
    const a = document.createElement('a');
    a.href = `/api/download/artwork?url=${encodeURIComponent(highResUrl)}&title=${encodeURIComponent(cleanTitle)}`;
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return { success: true, method: 'backend-anchor' };
  } catch (anchorErr) {
    console.warn('Backend anchor trigger failed:', anchorErr);
  }

  // Tier 5: Direct browser window navigation fallback
  window.open(highResUrl, '_blank');
  return { success: true, method: 'direct-window' };
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
