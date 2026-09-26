import { useCallback, useEffect, useState } from 'react';
import type { PlannerError, PlannerResponse, PreparationPlan } from '@contracts/planner/types';
import { shouldUseLocalApiFallback } from '../../shared/api/readJson';
import { generateLocalPlan } from './localPlan';

export type PlannerState =
  | { status: 'loading' }
  | { status: 'ok'; data: PreparationPlan }
  | { status: 'error'; error: PlannerError };

export function buildPlannerQuery(options: {
  now?: string;
  tasks?: string;
  done?: string[];
  mode?: string;
}): string {
  const params = new URLSearchParams();
  if (options.now) params.set('now', options.now);
  if (options.mode) params.set('mode', options.mode);
  if (options.tasks) params.set('tasks', options.tasks);
  if (options.done && options.done.length > 0) params.set('done', options.done.join(','));
  return params.toString();
}

/** Loads `/api/planner`, or the labeled fixture plan when Vercel has no API. */
export function usePlanner(query: string): { state: PlannerState; retry: () => void } {
  const [state, setState] = useState<PlannerState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch(`/api/planner?${query}`, { signal: controller.signal });
        if (!shouldUseLocalApiFallback(res)) {
          const body = (await res.json()) as PlannerResponse;
          setState(body.ok ? { status: 'ok', data: body.data } : { status: 'error', error: body.error });
          return;
        }
      } catch {
        if (controller.signal.aborted) return;
      }
      if (controller.signal.aborted) return;
      const body = await generateLocalPlan(new URLSearchParams(query));
      setState(body.ok ? { status: 'ok', data: body.data } : { status: 'error', error: body.error });
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
