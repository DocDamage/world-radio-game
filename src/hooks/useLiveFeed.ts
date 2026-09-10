import { useCallback, useEffect, useState } from 'react';

export type FeedStatus = 'idle' | 'loading' | 'ok' | 'error';

/**
 * Loads a live feed while a modal is open: fetches on open, exposes
 * loading/ok/error state, and offers a retry that can also be wired to a
 * refresh button. `fetcher` must be a stable reference (module-level
 * function) so the effect only re-runs when the modal opens.
 */
export function useLiveFeed<T>(isOpen: boolean, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<FeedStatus>('idle');
  const [error, setError] = useState<string>('');
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    // Yield one microtask so the loading transition never runs synchronously
    // inside an effect body (avoids cascading renders).
    await Promise.resolve();
    setStatus('loading');
    setError('');
    try {
      const result = await fetcher();
      setData(result);
      setFetchedAt(Date.now());
      setStatus('ok');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setStatus('error');
    }
  }, [fetcher]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, refresh]);

  return { data, status, error, fetchedAt, refresh };
}
