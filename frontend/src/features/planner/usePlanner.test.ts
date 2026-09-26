import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePlanner } from './usePlanner'

describe('usePlanner', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps a JSON no-data error from the backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ json: async () => ({ ok: false, error: { status: 'no-data', message: 'No plan' } }) })),
    )
    const { result } = renderHook(() => usePlanner(''))
    await waitFor(() => expect(result.current.state.status).toBe('error'))
    if (result.current.state.status !== 'error') return
    expect(result.current.state.error.message).toBe('No plan')
  })

  it('uses the fixture plan when /api/planner returns HTML', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<!doctype html>', { status: 404, headers: { 'content-type': 'text/html' } })),
    )
    const { result } = renderHook(() => usePlanner('now=2026-09-26T16:00:00-04:00'))
    await waitFor(() => expect(result.current.state.status).toBe('ok'))
    if (result.current.state.status !== 'ok') return
    expect(result.current.state.data.leaveBy.travelMinutes).toBe(35)
    expect(result.current.state.data.leaveBy.at).toBe('2026-09-26T22:15:00.000Z')
    expect(result.current.state.data.provenance.isFixture).toBe(true)
  })
})
