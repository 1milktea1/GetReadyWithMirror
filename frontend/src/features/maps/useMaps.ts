import { useCallback, useEffect, useState } from 'react'
import type { MapsError, MapsResponse, MapsResult } from '@contracts/maps/types'

export type MapsState =
  | { status: 'loading' }
  | { status: 'ok'; data: MapsResult }
  | { status: 'error'; error: MapsError }

export function buildMapsQuery(now?: string): string {
  const params = new URLSearchParams()
  if (now) params.set('now', now)
  return params.toString()
}

/** Loads `/api/maps`. Routing stays on the server; the browser never sees a maps key. */
export function useMaps(query: string): { state: MapsState; retry: () => void } {
  const [state, setState] = useState<MapsState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      try {
        const res = await fetch(`/api/maps?${query}`, { signal: controller.signal })
        const body = (await res.json()) as MapsResponse
        setState(body.ok ? { status: 'ok', data: body.data } : { status: 'error', error: body.error })
      } catch {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          error: { status: 'no-data', message: 'Could not reach the mirror backend.' },
        })
      }
    }
    void load()
    return () => controller.abort()
  }, [query, attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return { state, retry }
}
