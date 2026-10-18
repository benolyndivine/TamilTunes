/**
 * Formats time in seconds to mm:ss format (e.g. 125 -> "2:05")
 */
export function formatTime(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) {
    return '0:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Formats seconds into human-readable description
 */
export function formatDurationText(seconds) {
  if (!seconds || isNaN(seconds)) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return `${secs} sec`;
  return `${mins} min${mins > 1 ? 's' : ''} ${secs > 0 ? `${secs}s` : ''}`.trim();
}
