export function formatRelativeTime(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime();

  if (diff < 60_000) {
    return 'just now';
  }

  if (diff < 3_600_000) {
    return `${Math.round(diff / 60_000)}m ago`;
  }

  if (diff < 86_400_000) {
    return `${Math.round(diff / 3_600_000)}h ago`;
  }

  return `${Math.round(diff / 86_400_000)}d ago`;
}

export function formatCoordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

export function formatSpeed(speed: number | null) {
  if (!speed || Number.isNaN(speed)) {
    return '0 mph';
  }

  return `${Math.max(0, Math.round(speed * 2.23694))} mph`;
}

export function formatFileSize(size: number | null) {
  if (!size) {
    return 'Unknown size';
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatCompactDate(timestamp: string) {
  return new Date(timestamp).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
}
