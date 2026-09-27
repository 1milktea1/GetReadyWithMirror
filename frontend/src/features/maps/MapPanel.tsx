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
    const origin = data.origin.location
    const destination = data.destination.location
    const legs = connectToPlaces(
      origin,
      destination,
      (selected?.legs ?? []).filter((leg) => leg.path.length >= 2),
    )
    if (legs.length > 0) {
      for (const leg of legs) {
        const pairs = leg.path.map(toPair)
        if (leg.kind !== 'subway') {
          L.polyline(pairs, { color: '#000', weight: 7, opacity: 1 }).addTo(layers)
        }
        L.polyline(pairs, {
          color: leg.color,
          weight: leg.kind === 'subway' ? 5 : 4,
          opacity: 1,
        }).addTo(layers)
      }
    } else if (selected && selected.path.length >= 2) {
      const connected = connectPath(origin, destination, selected.path)
      L.polyline(connected.map(toPair), { color: '#fff', weight: 3, opacity: 0.95 }).addTo(layers)
    }
    const originPair = toPair(origin)
    const destinationPair = toPair(destination)
    const bounds = [originPair, destinationPair]
    for (const leg of legs) bounds.push(...leg.path.map(toPair))
    if (legs.length === 0 && selected && selected.path.length >= 2) {
      bounds.push(...connectPath(origin, destination, selected.path).map(toPair))
    }
    L.circleMarker(originPair, markerStyle(false)).addTo(layers)
    L.circleMarker(destinationPair, markerStyle(true)).addTo(layers)
    map.fitBounds(L.latLngBounds(bounds), { padding: [36, 36] })
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

const WALK_STROKE = '#FFFFFF'
const PLACE_REACH_DEG = 0.0007

function toPair(point: LatLng): L.LatLngExpression {
  return [point.latitude, point.longitude]
}

function near(a: LatLng, b: LatLng): boolean {
  return Math.abs(a.latitude - b.latitude) < PLACE_REACH_DEG && Math.abs(a.longitude - b.longitude) < PLACE_REACH_DEG
}

function collapsed(a: LatLng, b: LatLng): boolean {
  return Math.abs(a.latitude - b.latitude) < 1e-4 && Math.abs(a.longitude - b.longitude) < 1e-4
}

function walkLeg(path: LatLng[], color = WALK_STROKE): RouteLeg {
  return { kind: 'walk', color, path }
}

/** Keep the colored subway legs, and walk any gap from the last station to the pin. */
function connectToPlaces(origin: LatLng, destination: LatLng, legs: RouteLeg[]): RouteLeg[] {
  if (legs.length === 0) return []
  const connected: RouteLeg[] = []
  let stroke = WALK_STROKE
  for (const leg of legs) {
    const start = leg.path[0]
    const end = leg.path.at(-1)
    if (!start || !end || collapsed(start, end)) continue
    const previous = connected.at(-1)?.path.at(-1)
    if (previous && !near(previous, start)) connected.push(walkLeg([previous, start], stroke))
    if (leg.kind === 'subway') stroke = leg.color
    connected.push(leg.kind === 'subway' ? leg : { ...leg, color: stroke })
  }
  const first = connected[0]?.path[0]
  if (first && !near(first, origin)) connected.unshift(walkLeg([origin, first], connected[0]?.color ?? WALK_STROKE))
  const last = connected.at(-1)?.path.at(-1)
  if (last && !near(last, destination)) connected.push(walkLeg([last, destination], connected.at(-1)?.color ?? WALK_STROKE))
  return connected
}

function connectPath(origin: LatLng, destination: LatLng, path: LatLng[]): LatLng[] {
  const points = [...path]
  const first = points[0]
  const last = points.at(-1)
  if (first && !near(first, origin)) points.unshift(origin)
  if (last && !near(last, destination)) points.push(destination)
  return points
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
