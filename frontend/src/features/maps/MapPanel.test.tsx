import type { MapsResult } from '@contracts/maps/types'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MapPanel } from './MapPanel'

const { circleMarker, polyline } = vi.hoisted(() => ({
  circleMarker: vi.fn(),
  polyline: vi.fn(),
}))

vi.mock('leaflet', () => {
  const layer = () => {
    const api = { addTo: vi.fn(), clearLayers: vi.fn(), remove: vi.fn() }
    api.addTo.mockReturnValue(api)
    return api
  }
  circleMarker.mockImplementation(() => layer())
  polyline.mockImplementation(() => layer())
  return {
    default: {
      map: vi.fn(() => ({
        remove: vi.fn(),
        invalidateSize: vi.fn(),
        fitBounds: vi.fn(),
      })),
      tileLayer: vi.fn(() => layer()),
      layerGroup: vi.fn(() => layer()),
      circleMarker,
      polyline,
      latLngBounds: vi.fn((points: unknown) => points),
    },
  }
})

function mapsResult(walkingLive: boolean): MapsResult {
  return {
    origin: {
      name: 'Columbia University',
      address: 'Columbia University, New York, NY 10027',
      location: { latitude: 40.8075, longitude: -73.9626 },
    },
    destination: {
      name: 'Soothr',
      address: '204 E 13th St, New York, NY 10003',
      location: { latitude: 40.732269, longitude: -73.987352 },
    },
    recommendedMode: 'transit',
    retrievedAt: '2026-09-26T16:00:00.000Z',
    provenance: { source: 'fixture', isFixture: true },
    routes: [
      {
        mode: 'transit',
        durationMinutes: 35,
        summary: 'Rehearsal estimate',
        disruptions: [],
        path: [],
        provenance: { source: 'fixture', isFixture: true },
      },
      {
        mode: 'walking',
        durationMinutes: walkingLive ? 40 : 105,
        summary: walkingLive ? 'Live road route' : 'Rehearsal estimate',
        disruptions: [],
        path: walkingLive
          ? [
              { latitude: 40.8, longitude: -73.96 },
              { latitude: 40.75, longitude: -73.97 },
              { latitude: 40.732269, longitude: -73.987352 },
            ]
          : [],
        provenance: walkingLive
          ? { source: 'osrm', isFixture: false }
          : { source: 'fixture', isFixture: true },
      },
      {
        mode: 'driving',
        durationMinutes: 30,
        summary: 'Rehearsal estimate',
        disruptions: [],
        path: [],
        provenance: { source: 'fixture', isFixture: true },
      },
      {
        mode: 'rideshare',
        durationMinutes: 30,
        summary: 'Rehearsal estimate — rideshare uses the driving time',
        disruptions: [],
        path: [],
        provenance: { source: 'fixture', isFixture: true },
      },
    ],
  }
}

function mockMaps(body: MapsResult) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ json: async () => ({ ok: true, data: body }) })),
  )
}

describe('MapPanel', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    circleMarker.mockClear()
    polyline.mockClear()
  })

  it('defaults the visible choice to subway and labels a fixture route', async () => {
    mockMaps(mapsResult(false))
    render(<MapPanel mode="transit" onModeChange={() => {}} now="2026-09-26T16:00:00.000Z" />)
    expect(await screen.findByRole('button', { name: 'Subway · 35 min' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Walk · 105 min' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Sample route — not live')).toBeInTheDocument()
    expect(screen.getByText('Columbia University → Soothr')).toBeInTheDocument()
    expect(screen.getByText('Straight line between the pins — not a road path.')).toBeInTheDocument()
    expect(circleMarker).toHaveBeenCalledWith([40.8075, -73.9626], expect.anything())
    expect(circleMarker).toHaveBeenCalledWith([40.732269, -73.987352], expect.anything())
    expect(polyline).toHaveBeenCalledWith(
      [
        [40.8075, -73.9626],
        [40.732269, -73.987352],
      ],
      expect.objectContaining({ dashArray: '7 9' }),
    )
  })

  it('draws a live walking path and reports that choice', async () => {
    mockMaps(mapsResult(true))
    const onModeChange = vi.fn()
    render(<MapPanel mode="walking" onModeChange={onModeChange} />)
    expect(await screen.findByText('Live road route')).toBeInTheDocument()
    expect(screen.queryByText('Straight line between the pins — not a road path.')).not.toBeInTheDocument()
    expect(polyline).toHaveBeenCalledWith(
      [
        [40.8, -73.96],
        [40.75, -73.97],
        [40.732269, -73.987352],
      ],
      expect.objectContaining({ dashArray: undefined }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Drive · 30 min' }))
    expect(onModeChange).toHaveBeenCalledWith('driving')
  })
})
