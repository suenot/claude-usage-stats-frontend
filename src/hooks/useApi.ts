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
  // Every fetch carries the generation it was started in. Dragging a range on
  // the daily chart fires requests faster than they come back, and responses
  // arrive out of order — without this an older window's answer can land last
  // and overwrite the one the user is actually looking at.
  const genRef = useRef(0);

  const doFetch = useCallback(() => {
    const gen = ++genRef.current;
    const isCurrent = () => gen === genRef.current;

    setLoading(true);
    setError(null);

    const run = () => {
      fetcher()
        .then(d => {
          if (!isCurrent()) return;
          setData(d);
          setLoading(false);
        })
        .catch(e => {
          if (!isCurrent()) return;
          // 503 means the backend is still collecting — wait it out.
          if (e.message?.includes('503')) {
            retryRef.current = setTimeout(() => { if (isCurrent()) run(); }, 2000);
          } else {
            setError(e.message);
            setLoading(false);
          }
        });
    };
    run();
  }, deps);

  useEffect(() => {
    doFetch();
    // Bumping the generation retires any in-flight request and any retry that
    // slips through between the response and this cleanup.
    return () => {
      genRef.current++;
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [doFetch]);

  return { data, loading, error, refetch: doFetch };
}
