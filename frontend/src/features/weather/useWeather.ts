import { useCallback, useEffect, useState } from 'react';
import type { WeatherError, WeatherResponse, WeatherResult } from '../../../../shared/contracts/weather/types.ts';

const REFRESH_MS = 10 * 60 * 1000;

export type WeatherState =
  | { status: 'loading' }
  | { status: 'ok'; data: WeatherResult }
  | { status: 'error'; error: WeatherError };

// `query` is the full /api/weather query string (location, units, now override).
export function useWeather(query: string): { state: WeatherState; retry: () => void } {
  const [state, setState] = useState<WeatherState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch(`/api/weather?${query}`, { signal: controller.signal });
        const body = (await res.json()) as WeatherResponse;
        setState(body.ok ? { status: 'ok', data: body.data } : { status: 'error', error: body.error });
      } catch {
        if (controller.signal.aborted) return;
        setState({
          status: 'error',
          error: { status: 'external-provider-unavailable', message: 'Could not reach the mirror backend.' },
        });
      }
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [query, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}
