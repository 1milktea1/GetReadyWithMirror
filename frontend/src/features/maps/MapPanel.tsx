// Left-side route map. Draws the backend path; it does not estimate travel time.

import { useEffect, useRef } from 'react'
import type { LatLng, MapsResult, RouteAlternative, TransportMode } from '@contracts/maps/types'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { buildMapsQuery, useMaps } from './useMaps'
import './map.css'

interface MapPanelProps {
  mode: TransportMode
  onModeChange: (mode: TransportMode) => void
  /** Demo clock forwarded to the backend, already floored to the minute. */
  now?: string
}

const CHOICES: readonly { mode: TransportMode; label: string }[] = [
  { mode: 'transit', label: 'Subway' },
  { mode: 'walking', label: 'Walk' },
  { mode: 'driving', label: 'Drive' },
  { mode: 'rideshare', label: 'Rideshare' },
]

const TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

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
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
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
    const line = pathFor(data, selected)
    const dashed = !selected || selected.path.length < 2
    L.polyline(line, {
      color: '#fff',
      weight: 3,
      opacity: 0.95,
      dashArray: dashed ? '7 9' : undefined,
    }).addTo(layers)
    L.circleMarker(line[0]!, markerStyle(false)).addTo(layers)
    L.circleMarker(line[line.length - 1]!, markerStyle(true)).addTo(layers)
    map.fitBounds(L.latLngBounds(line), { padding: [36, 36] })
    const frame = requestAnimationFrame(() => map.invalidateSize())
    return () => cancelAnimationFrame(frame)
  }, [data, mode])

  const badge = provenanceLabel(route)
  const places = data ? `${data.origin.name} → ${data.destination.name}` : 'Columbia University → Soothr'

  return (
    <section className="map-panel" aria-label="Route map">
      <div ref={canvasRef} className="map-panel__canvas" />
      <div className="map-panel__bar">
        <div className="map-panel__places">{places}</div>
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
        {route && route.path.length < 2 && state.status === 'ok' && (
          <p className="map-panel__note">Straight line between the pins — not a road path.</p>
        )}
      </div>
    </section>
  )
}

function pathFor(data: MapsResult, route: RouteAlternative | undefined): L.LatLngExpression[] {
  if (route && route.path.length >= 2) return route.path.map(toPair)
  return [toPair(data.origin.location), toPair(data.destination.location)]
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

function provenanceLabel(route: RouteAlternative | undefined): string | undefined {
  if (!route) return undefined
  if (route.provenance.isFixture) return 'Sample route — not live'
  if (route.provenance.source === 'google') return 'Live directions'
  if (route.provenance.source === 'valhalla') return 'Live road route'
  return undefined
}
