import { useState, useEffect, useCallback, useRef } from 'react';

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const doFetch = useCallback(() => {
    setLoading(true);
    setError(null);
    fetcher()
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        // If 503 (loading), retry after 2s
        if (e.message?.includes('503')) {
          retryRef.current = setTimeout(doFetch, 2000);
        } else {
          setError(e.message);
          setLoading(false);
        }
      });
  }, deps);

  useEffect(() => {
    doFetch();
    return () => { if (retryRef.current) clearTimeout(retryRef.current); };
  }, [doFetch]);

  return { data, loading, error, refetch: doFetch };
}
