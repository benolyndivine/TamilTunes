/**
 * Extracts clean song title and extracted movie/album name from noisy titles
 * e.g. 'Arabic Kuthu (From "Beast")' -> { title: 'Arabic Kuthu', movie: 'Beast' }
 */
export function extractSongDetails(rawTitle = '') {
  let title = rawTitle;
  let movie = '';

  const fromQuotesMatch = title.match(/\(From\s+["']([^"']+)["']\)/i);
  if (fromQuotesMatch) {
    movie = fromQuotesMatch[1];
    title = title.replace(fromQuotesMatch[0], '').trim();
  } else {
    const fromSimpleMatch = title.match(/\(From\s+([^)]+)\)/i);
    if (fromSimpleMatch) {
      movie = fromSimpleMatch[1];
      title = title.replace(fromSimpleMatch[0], '').trim();
    }
  }

  // Clean trailing hyphens or indicators
  title = title.replace(/\s*-\s*(Single|Tamil|Original Motion Picture Soundtrack)$/i, '').trim();

  return { title, movie };
}

/**
 * Calculates a simple relevance score between a user query and a song object
 */
export function calculateMatchScore(song, query) {
  if (!query || !song) return 0;
  const q = query.toLowerCase().trim();
  const title = (song.title || '').toLowerCase();
  const artist = (song.artist || '').toLowerCase();
  const album = (song.album || '').toLowerCase();

  let score = 0;
  if (title === q) score += 100;
  else if (title.startsWith(q)) score += 60;
  else if (title.includes(q)) score += 40;

  if (album.includes(q)) score += 30;
  if (artist.includes(q)) score += 25;

  return score;
}
