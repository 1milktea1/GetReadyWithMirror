import { useCallback, useEffect, useState } from 'react';
import type { WeatherError, WeatherResponse, WeatherResult } from '@contracts/weather/types';

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
      for (let tryIndex = 0; tryIndex < 3; tryIndex++) {
        try {
          const res = await fetch(`/api/weather?${query}`, { signal: controller.signal });
          const body = (await res.json()) as WeatherResponse;
          setState(body.ok ? { status: 'ok', data: body.data } : { status: 'error', error: body.error });
          return;
        } catch {
          if (controller.signal.aborted) return;
          if (tryIndex < 2) {
            await new Promise((resolve) => setTimeout(resolve, 400));
            continue;
          }
          setState({
            status: 'error',
            error: { status: 'external-provider-unavailable', message: 'Could not reach the mirror backend.' },
          });
        }
      }
    };
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
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
