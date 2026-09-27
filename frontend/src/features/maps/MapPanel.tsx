// Left-side route map. Draws the backend path; it does not estimate travel time.

import { useEffect, useRef } from 'react'
import type { LatLng, RouteAlternative, RouteLeg, TransportMode } from '@contracts/maps/types'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { buildMapsQuery, useMaps } from './useMaps'
import './map.css'

interface MapPanelProps {
  mode: TransportMode
  onModeChange: (mode: TransportMode) => void
  /** Optional clock forwarded to the backend, already floored to the minute. */
  now?: string
}

const CHOICES: readonly { mode: TransportMode; label: string }[] = [
  { mode: 'transit', label: 'Subway' },
  { mode: 'walking', label: 'Walk' },
  { mode: 'driving', label: 'Drive' },
  { mode: 'rideshare', label: 'Rideshare' },
]

/* CARTO's public dark tiles now return a key watermark. OSM raster tiles stay
   keyless; the tile pane is inverted in CSS so the mirror stays dark. */
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

export function MapPanel({ mode, onModeChange, now }: MapPanelProps) {
  const { state, retry } = useMaps(buildMapsQuery(now))
  const canvasRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layersRef = useRef<L.LayerGroup | null>(null)
  const data = state.status === 'ok' ? state.data : undefined
  const route = data?.routes.find((item) => item.mode === mode)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || mapRef.current) return
    const map = L.map(canvas, { zoomControl: false, attributionControl: true })
    L.tileLayer(TILES, {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)
    layersRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    const frame = requestAnimationFrame(() => map.invalidateSize())
    return () => {
      cancelAnimationFrame(frame)
      map.remove()
      mapRef.current = null
      layersRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layers = layersRef.current
    if (!map || !layers || !data) return
    layers.clearLayers()
    const selected = data.routes.find((item) => item.mode === mode)
    const legs = (selected?.legs ?? []).filter((leg) => leg.path.length >= 2)
    if (legs.length > 0) {
      for (const leg of legs) {
        L.polyline(leg.path.map(toPair), {
          color: leg.color,
          weight: leg.kind === 'subway' ? 5 : 2,
          opacity: leg.kind === 'subway' ? 0.95 : 0.55,
        }).addTo(layers)
      }
    } else if (selected && selected.path.length >= 2) {
      L.polyline(selected.path.map(toPair), { color: '#fff', weight: 3, opacity: 0.95 }).addTo(layers)
    }
    const line = selected && selected.path.length >= 2 ? selected.path.map(toPair) : null
    const origin = toPair(data.origin.location)
    const destination = toPair(data.destination.location)
    L.circleMarker(origin, markerStyle(false)).addTo(layers)
    L.circleMarker(destination, markerStyle(true)).addTo(layers)
    map.fitBounds(L.latLngBounds(line ?? [origin, destination]), { padding: [36, 36] })
    const frame = requestAnimationFrame(() => map.invalidateSize())
    return () => cancelAnimationFrame(frame)
  }, [data, mode])

  const badge = provenanceLabel(route)
  const places = data
    ? `${data.origin.name} → ${data.destination.name}`
    : 'Columbia University → next calendar event'
  const subwayLines = uniqueSubwayLines(route?.legs)

  return (
    <section className="map-panel" aria-label="Route map">
      <div ref={canvasRef} className="map-panel__canvas" />
      <div className="map-panel__bar">
        <div className="map-panel__places">{places}</div>
        {subwayLines.length > 0 && (
          <div className="map-panel__lines" aria-label="Subway lines">
            {subwayLines.map((leg) => (
              <span key={leg.line} className="map-panel__line" style={{ borderColor: leg.color, color: leg.color }}>
                {leg.line}
              </span>
            ))}
          </div>
        )}
        <div className="map-panel__modes" role="group" aria-label="Transportation">
          {CHOICES.map((choice) => {
            const minutes = data?.routes.find((item) => item.mode === choice.mode)?.durationMinutes
            const selected = mode === choice.mode
            return (
              <button
                key={choice.mode}
                type="button"
                className="map-panel__mode"
                aria-pressed={selected}
                onClick={() => onModeChange(choice.mode)}
              >
                {choice.label}
                {minutes !== undefined ? ` · ${minutes} min` : ''}
              </button>
            )
          })}
        </div>
        {state.status === 'loading' && <p className="map-panel__status">Loading the route…</p>}
        {state.status === 'error' && (
          <p className="map-panel__status" role="alert">
            {state.error.message}{' '}
            <button type="button" className="map-panel__mode" onClick={retry}>
              Retry
            </button>
          </p>
        )}
        {badge && <div className="map-panel__badge">{badge}</div>}
      </div>
    </section>
  )
}

function toPair(point: LatLng): L.LatLngExpression {
  return [point.latitude, point.longitude]
}

function markerStyle(filled: boolean): L.CircleMarkerOptions {
  return {
    radius: 7,
    color: '#fff',
    weight: 2,
    fillColor: filled ? '#fff' : '#000',
    fillOpacity: 1,
  }
}

function uniqueSubwayLines(legs: RouteLeg[] | undefined): { line: string; color: string }[] {
  const seen = new Set<string>()
  const lines: { line: string; color: string }[] = []
  for (const leg of legs ?? []) {
    if (leg.kind !== 'subway' || !leg.line || seen.has(leg.line)) continue
    seen.add(leg.line)
    lines.push({ line: leg.line, color: leg.color })
  }
  return lines
}

function provenanceLabel(route: RouteAlternative | undefined): string | undefined {
  if (!route) return undefined
  if (route.provenance.isFixture) return 'Sample route — not live'
  if (route.provenance.source === 'google') return 'Live directions'
  if (route.provenance.source === 'valhalla') return 'Live road route'
  if (route.provenance.source === 'transitous') return 'Live subway'
  return undefined
}
