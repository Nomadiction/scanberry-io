/**
 * Share a URL via Web Share API when available; otherwise copy to clipboard.
 */
export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'unavailable';

export async function shareOrCopyLink(options: {
  url: string;
  title?: string;
  text?: string;
}): Promise<ShareOutcome> {
  const { url, title, text } = options;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ url, title, text });
      return 'shared';
    } catch (e) {
      const name = e instanceof Error ? e.name : '';
      if (name === 'AbortError') return 'cancelled';
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return 'copied';
    } catch {
      return 'unavailable';
    }
  }

  return 'unavailable';
}
