import { useCallback, useEffect, useRef, useState } from 'react';

// Loads data with `loader` whenever a value in `deps` changes. Ignores responses that
// arrive after a newer request was started, so fast filter changes cannot show stale data.
export function useApiData(loader, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const requestId = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async () => {
    const id = ++requestId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loaderRef.current();
      if (id === requestId.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (id === requestId.current) setState((s) => ({ ...s, loading: false, error }));
    }
  }, []);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload: run };
}
