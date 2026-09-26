import { useEffect, useState } from 'react'
import './map.css'

interface Route {
  mode: string
  durationMinutes: number
  summary: string
}

interface Commute {
  label: string
  origin: { name: string }
  destination: { name: string; address: string }
  recommendedMode: string
  durationMinutes: number
  routes: Route[]
}

export function CommutePanel() {
  const [commute, setCommute] = useState<Commute | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    void fetch('/api/maps', { signal: controller.signal })
      .then(async (res) => {
        const body = (await res.json()) as { ok?: boolean; data?: Commute; error?: { message?: string } }
        if (!body.ok || !body.data) throw new Error(body.error?.message || 'The route is unavailable.')
        setCommute(body.data)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'The route is unavailable.')
      })
    return () => controller.abort()
  }, [])

  if (error) {
    return (
      <section className="commute" aria-label="Map">
        <p>{error}</p>
      </section>
    )
  }
  if (!commute) {
    return (
      <section className="commute" aria-label="Map">
        <p>Loading route…</p>
      </section>
    )
  }

  return (
    <section className="commute" aria-label="Map">
      <p className="commute__label">{commute.label}</p>
      <h2 className="commute__title">
        {commute.origin.name} to {commute.destination.name}
      </h2>
      <p className="commute__address">{commute.destination.address}</p>
      <p className="commute__leave">
        {commute.recommendedMode} · {commute.durationMinutes} min
      </p>
      <ul className="commute__routes">
        {commute.routes.map((route) => (
          <li key={route.mode}>
            {route.mode} · {route.durationMinutes} min
          </li>
        ))}
      </ul>
    </section>
  )
}
