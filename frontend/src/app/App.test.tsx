import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

vi.mock('../features/maps/MapPanel', () => ({
  MapPanel: () => <section aria-label="Route map">Map open</section>,
}))

describe('overview map', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    window.history.replaceState(null, '', '/')
  })

  it('keeps the map off the dashboard until a voice or motion command opens it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/api/planner')) {
          return { json: async () => ({ ok: false, error: { status: 'no-data', message: 'No plan' } }) }
        }
        return { json: async () => ({ ok: false, error: { status: 'no-data', message: 'No weather' } }) }
      }),
    )
    render(<App />)
    expect(screen.queryByRole('region', { name: 'Route map' })).not.toBeInTheDocument()
    expect(await screen.findByText('No weather')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Calendar' })).toBeInTheDocument()
    expect(screen.getByText('Upcoming')).toBeInTheDocument()
    expect(screen.getByText('No plan')).toBeInTheDocument()
    expect(screen.getByLabelText('Getting ready')).toBeInTheDocument()

    window.mirrorCommand?.({ action: 'expandWidget', widget: 'map' })
    expect(await screen.findByRole('region', { name: 'Route map' })).toBeInTheDocument()
    expect(screen.queryByText('No weather')).not.toBeInTheDocument()
    expect(screen.queryByText('Upcoming')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Time' })).toBeInTheDocument()
    expect(screen.getByText('No plan')).toBeInTheDocument()
    expect(screen.getByLabelText('Getting ready')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('region', { name: 'Route map' })).not.toBeInTheDocument()
    expect(await screen.findByText('Upcoming')).toBeInTheDocument()
  })

  it('keeps the real clock when the URL has ?now=', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({ ok: false, error: { status: 'no-data', message: 'No weather' } }),
      })),
    )
    window.history.replaceState(null, '', '/?now=12:00')
    render(<App />)
    expect(screen.queryByText(/Demo time/)).not.toBeInTheDocument()
  })
})
