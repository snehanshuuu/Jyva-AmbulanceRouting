/**
 * Formats duration in seconds to a human-readable string (e.g., "4m 20s" or "32s").
 */
export function formatDurationS(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const mins = Math.floor(s / 60);
  const remainingSecs = s % 60;

  if (mins === 0) {
    return `${remainingSecs}s`;
  }
  return `${mins}m ${remainingSecs.toString().padStart(2, '0')}s`;
}

/**
 * Formats duration in seconds to a digital countdown string (MM:SS).
 */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const mins = Math.floor(s / 60);
  const remainingSecs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
}

/**
 * Formats epoch timestamp to 24h clock string (HH:mm:ss).
 */
export function formatClockTime(timestampMs: number): string {
  const date = new Date(timestampMs);
  return date.toLocaleTimeString('en-IN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Returns a relative time string (e.g., "just now", "2m ago").
 */
export function formatRelativeTime(timestampMs: number, currentMs: number = Date.now()): string {
  const diffS = Math.floor((currentMs - timestampMs) / 1000);
  if (diffS < 5) return 'just now';
  if (diffS < 60) return `${diffS}s ago`;
  const diffM = Math.floor(diffS / 60);
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  return `${diffH}h ago`;
}
