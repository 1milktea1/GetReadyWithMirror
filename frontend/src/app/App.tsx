import { useEffect, useState } from 'react'
import { CalendarModule, createFixtureCalendarSource } from '../features/calendar'
import { WeatherPanel } from '../features/weather/WeatherPanel'
import { useNow } from '../shared/time/useNow'
import './App.css'

const calendarSource = createFixtureCalendarSource()

// The weather backend refetches whenever its "now" changes, so the override is
// passed in 10-minute steps (matching the panel's refresh) rather than every tick.
const WEATHER_NOW_STEP_MS = 10 * 60 * 1000

type ExpandedModule = 'weather' | null

export function App() {
  const { now, actualNow, isOverridden } = useNow()
  const [expanded, setExpanded] = useState<ExpandedModule>(null)

  // Until typed UI events exist, clicking a module toggles it and Escape returns to the overview.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const weatherNow = isOverridden
    ? new Date(Math.floor(now.getTime() / WEATHER_NOW_STEP_MS) * WEATHER_NOW_STEP_MS).toISOString()
    : undefined

  return (
    <main className="mirror">
      <div className="mirror__region mirror__region--top-left">
        <WeatherPanel
          expanded={expanded === 'weather'}
          onToggle={() => setExpanded(expanded === 'weather' ? null : 'weather')}
          now={weatherNow}
        />
      </div>
      <div className="mirror__region mirror__region--top-right">
        <CalendarModule
          now={now}
          source={calendarSource}
          actualTime={isOverridden ? actualNow : undefined}
        />
      </div>
    </main>
  )
}
