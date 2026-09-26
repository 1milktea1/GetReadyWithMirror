import { useEffect, useState } from 'react'
import type { TransportMode } from '@contracts/maps/types'
import { CalendarModule, createFixtureCalendarSource } from '../features/calendar'
import { MapPanel } from '../features/maps/MapPanel'
import {
  publishMirrorCommand,
  subscribeMirrorCommands,
  type MirrorCommand,
} from '../features/overview/mirrorCommands'
import { PlannerPanel } from '../features/planner/PlannerPanel'
import { WeatherPanel } from '../features/weather/WeatherPanel'
import { useNow } from '../shared/time/useNow'
import './App.css'

const calendarSource = createFixtureCalendarSource()

// The weather backend refetches whenever its "now" changes, so the override is
// passed in 10-minute steps (matching the panel's refresh) rather than every tick.
const WEATHER_NOW_STEP_MS = 10 * 60 * 1000
const PLANNER_NOW_STEP_MS = 60 * 1000

type ExpandedModule = 'weather' | 'planner' | 'map' | null

function expandFromLocation(): ExpandedModule {
  const widget = new URLSearchParams(window.location.search).get('expand')
  return widget === 'map' ? 'map' : null
}

export function App() {
  const { now, actualNow, isOverridden } = useNow()
  const [expanded, setExpanded] = useState<ExpandedModule>(expandFromLocation)
  const [mode, setMode] = useState<TransportMode>('transit')
  const mapOpen = expanded === 'map'

  useEffect(() => {
    window.mirrorCommand = (command: MirrorCommand) => publishMirrorCommand(command)
    return () => {
      delete window.mirrorCommand
    }
  }, [])

  useEffect(() => {
    return subscribeMirrorCommands((command) => {
      if (command.action === 'showOverview') {
        setExpanded(null)
        return
      }
      if (command.widget === 'map' || command.widget === 'weather' || command.widget === 'planner') {
        setExpanded(command.widget)
      }
    })
  }, [])

  // Until a voice or motion agent is connected, Escape returns to the overview.
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
  // The planner reads this clock, including ?now=, so leave-by stays on the mirror's time.
  const plannerNow = new Date(Math.floor(now.getTime() / PLANNER_NOW_STEP_MS) * PLANNER_NOW_STEP_MS).toISOString()

  return (
    <main className={mapOpen ? 'mirror mirror--map' : 'mirror'}>
      {mapOpen && (
        <div className="mirror__region mirror__region--map">
          <MapPanel mode={mode} onModeChange={setMode} now={plannerNow} />
        </div>
      )}
      <div className="mirror__region mirror__region--left">
        {!mapOpen && (
          <WeatherPanel
            expanded={expanded === 'weather'}
            onToggle={() => setExpanded(expanded === 'weather' ? null : 'weather')}
            now={weatherNow}
          />
        )}
        <PlannerPanel
          expanded={expanded === 'planner'}
          onToggle={() => setExpanded(expanded === 'planner' ? null : 'planner')}
          now={plannerNow}
          mode={mode}
        />
      </div>
      <div className="mirror__region mirror__region--top-right">
        <CalendarModule
          now={now}
          source={calendarSource}
          actualTime={isOverridden ? actualNow : undefined}
          clockOnly={mapOpen}
        />
      </div>
    </main>
  )
}
