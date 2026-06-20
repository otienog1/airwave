import { useCallback, useState } from 'react';

interface ShareOptions {
  title: string;
  text: string;
  url: string;
}

export function useShare() {
  const [copied, setCopied] = useState(false);

  const share = useCallback(async (options: ShareOptions) => {
    if (typeof navigator === 'undefined') return;

    if (navigator.share) {
      try {
        await navigator.share(options);
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(options.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard blocked — silently skip
    }
  }, []);

  return { share, copied };
}
