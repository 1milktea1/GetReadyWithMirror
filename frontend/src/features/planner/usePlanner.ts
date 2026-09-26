import { useCallback, useEffect, useState } from 'react';
import type { PlannerError, PlannerResponse, PreparationPlan } from '@contracts/planner/types';

export type PlannerState =
  | { status: 'loading' }
  | { status: 'ok'; data: PreparationPlan }
  | { status: 'error'; error: PlannerError };

export function buildPlannerQuery(options: { now?: string; tasks?: string; done?: string[] }): string {
  const params = new URLSearchParams();
  if (options.now) params.set('now', options.now);
  if (options.tasks) params.set('tasks', options.tasks);
  if (options.done && options.done.length > 0) params.set('done', options.done.join(','));
  return params.toString();
}

/** Loads `/api/planner`. The backend owns the schedule; this hook only fetches it. */
export function usePlanner(query: string): { state: PlannerState; retry: () => void } {
  const [state, setState] = useState<PlannerState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch(`/api/planner?${query}`, { signal: controller.signal });
        const body = (await res.json()) as PlannerResponse;
        setState(body.ok ? { status: 'ok', data: body.data } : { status: 'error', error: body.error });
      } catch {
        if (controller.signal.aborted) return;
        setState({
          status: 'error',
          error: { status: 'no-data', message: 'Could not reach the mirror backend.' },
        });
      }
    };
    void load();
    return () => controller.abort();
  }, [query, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}
