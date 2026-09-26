import { useCallback, useEffect, useState } from 'react'
import type { MapsError, MapsResponse, MapsResult } from '@contracts/maps/types'
import { shouldUseLocalApiFallback } from '../../shared/api/readJson'
import { generateLocalMaps } from './localMaps'

export type MapsState =
  | { status: 'loading' }
  | { status: 'ok'; data: MapsResult }
  | { status: 'error'; error: MapsError }

export function buildMapsQuery(now?: string): string {
  const params = new URLSearchParams()
  if (now) params.set('now', now)
  return params.toString()
}

/** Loads `/api/maps`, or the labeled fixture commute when Vercel has no API. */
export function useMaps(query: string): { state: MapsState; retry: () => void } {
  const [state, setState] = useState<MapsState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      try {
        const res = await fetch(`/api/maps?${query}`, { signal: controller.signal })
        if (!shouldUseLocalApiFallback(res)) {
          const body = (await res.json()) as MapsResponse
          setState(body.ok ? { status: 'ok', data: body.data } : { status: 'error', error: body.error })
          return
        }
      } catch {
        if (controller.signal.aborted) return
      }
      if (controller.signal.aborted) return
      const body = generateLocalMaps()
      setState(body.ok ? { status: 'ok', data: body.data } : { status: 'error', error: body.error })
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
