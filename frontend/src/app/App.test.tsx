import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { commandForVoiceEvent } from '../features/assistant/voiceEvents'
import { sayHeyMirror, stubWakeRecognition } from '../test/stubWakeRecognition'
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

  it('opens expanded weather in the center with only the time and date', async () => {
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
    expect(await screen.findByText('Upcoming')).toBeInTheDocument()

    window.mirrorCommand?.({ action: 'expandWidget', widget: 'weather' })
    await waitFor(() => expect(screen.queryByText('Upcoming')).not.toBeInTheDocument())
    expect(await screen.findByText('No weather')).toBeInTheDocument()
    expect(screen.queryByText('No plan')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Getting ready')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Time' })).toBeInTheDocument()
    expect(screen.getByText(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/)).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(await screen.findByText('Upcoming')).toBeInTheDocument()
    expect(screen.getByText('No plan')).toBeInTheDocument()
  })

  it('opens expanded calendar in the center with only the time and date', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({ ok: false, error: { status: 'no-data', message: 'No weather' } }),
      })),
    )
    render(<App />)
    expect(await screen.findByText('Upcoming')).toBeInTheDocument()
    expect(screen.getByLabelText('Getting ready')).toBeInTheDocument()

    window.mirrorCommand?.({ action: 'expandWidget', widget: 'calendar' })
    await waitFor(() => expect(screen.queryByLabelText('Getting ready')).not.toBeInTheDocument())
    expect(screen.getByText('Upcoming')).toBeInTheDocument()
    expect(screen.queryByText('Weather unavailable')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Time' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Calendar' })).toBeInTheDocument()
    expect(screen.getByText(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/)).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(await screen.findByLabelText('Getting ready')).toBeInTheDocument()
  })

  it('opens the existing map, weather, and calendar screens from a voice turn', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/api/assistant')) {
          const utterance = String((JSON.parse(String(init?.body ?? '{}')) as { utterance?: string }).utterance ?? '')
          const target = /route|map/i.test(utterance) ? 'maps' : /calendar/i.test(utterance) ? 'calendar' : 'weather'
          return {
            ok: true,
            json: async () => ({
              ok: true,
              data: {
                spokenText: `Opening ${target}.`,
                uiEvents: [{ action: 'expandWidget', target }],
              },
            }),
          }
        }
        if (url.includes('/api/voice/speak')) {
          return { ok: false, json: async () => ({ ok: false, error: { status: 'not-configured' } }) }
        }
        if (url.includes('/api/planner')) {
          return { json: async () => ({ ok: false, error: { status: 'no-data', message: 'No plan' } }) }
        }
        return { json: async () => ({ ok: false, error: { status: 'no-data', message: 'No weather' } }) }
      }),
    )
    stubWakeRecognition()
    render(<App />)
    await waitFor(() => sayHeyMirror('see my route'))
    expect(await screen.findByRole('region', { name: 'Route map' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Route map' })).not.toBeInTheDocument())

    await waitFor(() => sayHeyMirror('expand weather'))
    await waitFor(() => expect(screen.queryByText('Upcoming')).not.toBeInTheDocument())
    expect(screen.getByText('No weather')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(await screen.findByText('Upcoming')).toBeInTheDocument()

    await waitFor(() => sayHeyMirror('show my calendar'))
    await waitFor(() => expect(screen.queryByLabelText('Getting ready')).not.toBeInTheDocument())
    expect(screen.getByRole('region', { name: 'Calendar' })).toBeInTheDocument()
  })

  it('maps Grok expand events onto the existing weather, calendar, and map screens', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({ ok: false, error: { status: 'no-data', message: 'No weather' } }),
      })),
    )
    expect(commandForVoiceEvent({ action: 'expandWidget', target: 'weather' })).toEqual({
      action: 'expandWidget',
      widget: 'weather',
    })
    expect(commandForVoiceEvent({ action: 'expandWidget', target: 'calendar' })).toEqual({
      action: 'expandWidget',
      widget: 'calendar',
    })
    expect(commandForVoiceEvent({ action: 'expandWidget', target: 'maps' })).toEqual({
      action: 'expandWidget',
      widget: 'map',
    })
    expect(commandForVoiceEvent({ action: 'showOverview' })).toEqual({ action: 'showOverview' })

    render(<App />)
    const command = commandForVoiceEvent({ action: 'expandWidget', target: 'maps' })
    expect(command).not.toBeNull()
    if (command) window.mirrorCommand?.(command)
    expect(await screen.findByRole('region', { name: 'Route map' })).toBeInTheDocument()
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
