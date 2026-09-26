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

type ExpandedModule = 'weather' | 'planner' | 'map' | null

function expandFromLocation(): ExpandedModule {
  const widget = new URLSearchParams(window.location.search).get('expand')
  if (widget === 'map' || widget === 'weather') return widget
  return null
}

export function App() {
  const { now } = useNow()
  const [expanded, setExpanded] = useState<ExpandedModule>(expandFromLocation)
  const [mode, setMode] = useState<TransportMode>('transit')
  const mapOpen = expanded === 'map'
  const weatherOpen = expanded === 'weather'
  const screenClass = mapOpen ? 'mirror mirror--map' : weatherOpen ? 'mirror mirror--weather' : 'mirror'

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

  return (
    <main className={screenClass}>
      {mapOpen && (
        <div className="mirror__region mirror__region--map">
          <MapPanel mode={mode} onModeChange={setMode} />
        </div>
      )}
      {weatherOpen && (
        <div className="mirror__region mirror__region--weather">
          <WeatherPanel expanded onToggle={() => setExpanded(null)} />
        </div>
      )}
      {!weatherOpen && (
        <div className="mirror__region mirror__region--left">
          {!mapOpen && (
            <WeatherPanel expanded={false} onToggle={() => setExpanded('weather')} />
          )}
          <PlannerPanel
            expanded={expanded === 'planner'}
            onToggle={() => setExpanded(expanded === 'planner' ? null : 'planner')}
            mode={mode}
          />
        </div>
      )}
      <div className="mirror__region mirror__region--top-right">
        <CalendarModule now={now} source={calendarSource} clockOnly={mapOpen} hideAgenda={weatherOpen} />
      </div>
    </main>
  )
}
