/**
 * Parse an LRC timestamped lyrics string into a structured array of timestamped lines.
 * 
 * Supports:
 * - Standard: [mm:ss.xx] Lyrics
 * - Extended: [mm:ss.xxx] Lyrics
 * - Multiple tags: [00:12.00][00:24.50] Chorus
 * - Clean metadata lines like [ar:...], [ti:...], [length:...]
 */
export function parseLrc(lrcContent) {
  if (!lrcContent || typeof lrcContent !== 'string') {
    return { lines: [], isSynced: false };
  }

  const rawLines = lrcContent.split(/\r?\n/);
  const parsedLines = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if line contains any time tags
    const timeMatches = [...trimmed.matchAll(timeRegex)];

    if (timeMatches.length > 0) {
      // Strip out all [mm:ss.xx] timestamp tags to get pure lyric text
      const text = trimmed.replace(timeRegex, '').trim();

      // For every matched timestamp tag on this line
      for (const match of timeMatches) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const subSec = match[3] || '0';
        
        // Normalize fraction: if 2 digits -> 100ths, if 3 digits -> 1000ths
        const fraction = subSec.length === 3 ? parseInt(subSec, 10) / 1000 : parseInt(subSec.padEnd(2, '0'), 10) / 100;
        const totalSeconds = minutes * 60 + seconds + fraction;

        parsedLines.push({
          time: Math.round(totalSeconds * 100) / 100,
          text: text || '♪', // Use musical note for instrumental beats
        });
      }
    }
  }

  if (parsedLines.length > 0) {
    // Sort lines in ascending order of timestamp
    parsedLines.sort((a, b) => a.time - b.time);
    return { lines: parsedLines, isSynced: true };
  }

  // If no timestamp tags were matched, parse as plain unsynchronized lyrics
  const plainLines = rawLines
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('[ti:') && !line.startsWith('[ar:') && !line.startsWith('[al:'))
    .map((text, index) => ({
      time: index * 5, // fallback dummy time
      text
    }));

  return { lines: plainLines, isSynced: false };
}
