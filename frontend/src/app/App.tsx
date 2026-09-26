import { useEffect, useState } from 'react'
import { RushReminders } from '../features/assistant/RushReminders'
import { VoiceButton, type VoiceUiEvent } from '../features/assistant/VoiceButton'
import { CalendarModule, createFixtureCalendarSource } from '../features/calendar'
import { CommutePanel } from '../features/maps/CommutePanel'
import { WeatherPanel } from '../features/weather/WeatherPanel'
import { useNow } from '../shared/time/useNow'
import './App.css'

const calendarSource = createFixtureCalendarSource()

// The weather backend refetches whenever its "now" changes, so the override is
// passed in 10-minute steps (matching the panel's refresh) rather than every tick.
const WEATHER_NOW_STEP_MS = 10 * 60 * 1000

type ExpandedModule = 'weather' | 'calendar' | 'map' | null

function screenFromLocation(): ExpandedModule {
  const widget = new URLSearchParams(window.location.search).get('expand')
  if (widget === 'weather' || widget === 'calendar' || widget === 'map') return widget
  return null
}

export function App() {
  const { now, actualNow, isOverridden } = useNow()
  const [expanded, setExpanded] = useState<ExpandedModule>(screenFromLocation)

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

  function applyVoiceEvents(events: VoiceUiEvent[]) {
    for (const event of events) {
      if (event.action === 'showOverview' || event.action === 'collapseWidget') {
        setExpanded(null)
      } else if (event.action === 'expandWidget' && event.target === 'weather') {
        setExpanded('weather')
      } else if (event.action === 'expandWidget' && event.target === 'calendar') {
        setExpanded('calendar')
      } else if (event.action === 'expandWidget' && event.target === 'maps') {
        setExpanded('map')
      }
    }
  }

  const focused = expanded !== null

  return (
    <main className={expanded ? `mirror mirror--${expanded}` : 'mirror'}>
      {!focused && (
        <div className="mirror__region mirror__region--top-left">
          <WeatherPanel expanded={false} onToggle={() => setExpanded('weather')} now={weatherNow} />
        </div>
      )}
      <div className="mirror__region mirror__region--top-right">
        <CalendarModule
          now={now}
          source={calendarSource}
          actualTime={isOverridden ? actualNow : undefined}
          part={focused ? 'clock' : 'full'}
        />
      </div>
      {expanded === 'weather' && (
        <div className="mirror__region mirror__region--middle">
          <WeatherPanel expanded onToggle={() => setExpanded(null)} now={weatherNow} />
        </div>
      )}
      {expanded === 'calendar' && (
        <div className="mirror__region mirror__region--middle">
          <CalendarModule now={now} source={calendarSource} part="agenda" maxEvents={8} />
        </div>
      )}
      {expanded === 'map' && (
        <div className="mirror__region mirror__region--middle">
          <CommutePanel />
        </div>
      )}
      <RushReminders now={now} source={calendarSource} />
      <div className="mirror__region mirror__region--bottom">
        <VoiceButton onEvents={applyVoiceEvents} />
      </div>
    </main>
  )
}
