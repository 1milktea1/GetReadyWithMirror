import { useEffect, useState } from 'react'
import type { TransportMode } from '@contracts/maps/types'
import { RushReminders } from '../features/assistant/RushReminders'
import { VoiceButton, type VoiceUiEvent } from '../features/assistant/VoiceButton'
import { commandForVoiceEvent } from '../features/assistant/voiceEvents'
import { CalendarModule, createFixtureCalendarSource } from '../features/calendar'
import { MapPanel } from '../features/maps/MapPanel'
import {
  publishMirrorCommand,
  subscribeMirrorCommands,
  type MirrorCommand,
} from '../features/overview/mirrorCommands'
import { PlannerPanel } from '../features/planner/PlannerPanel'
import { UnwindAlarm } from '../features/unwind/UnwindAlarm'
import { UnwindBackdrop } from '../features/unwind/UnwindBackdrop'
import { WeatherPanel } from '../features/weather/WeatherPanel'
import { useNow } from '../shared/time/useNow'
import './App.css'

const calendarSource = createFixtureCalendarSource()

type ExpandedModule = 'weather' | 'calendar' | 'planner' | 'map' | 'unwind' | null

function expandFromLocation(): ExpandedModule {
  const widget = new URLSearchParams(window.location.search).get('expand')
  if (widget === 'map' || widget === 'weather' || widget === 'calendar' || widget === 'unwind') return widget
  return null
}

function screenClass(expanded: ExpandedModule): string {
  if (expanded === 'map') return 'mirror mirror--map'
  if (expanded === 'weather') return 'mirror mirror--weather'
  if (expanded === 'calendar') return 'mirror mirror--calendar'
  if (expanded === 'unwind') return 'mirror mirror--unwind'
  return 'mirror'
}

export function App() {
  const { now } = useNow()
  const [expanded, setExpanded] = useState<ExpandedModule>(expandFromLocation)
  const [mode, setMode] = useState<TransportMode>('transit')
  const mapOpen = expanded === 'map'
  const weatherOpen = expanded === 'weather'
  const calendarOpen = expanded === 'calendar'
  const unwindOpen = expanded === 'unwind'
  const focusOpen = weatherOpen || calendarOpen

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
      if (
        command.widget === 'map' ||
        command.widget === 'weather' ||
        command.widget === 'calendar' ||
        command.widget === 'planner' ||
        command.widget === 'unwind'
      ) {
        setExpanded(command.widget)
      }
    })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function applyVoiceEvents(events: VoiceUiEvent[]) {
    for (const event of events) {
      const command = commandForVoiceEvent(event)
      if (command) publishMirrorCommand(command)
    }
  }

  return (
    <main className={screenClass(expanded)}>
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
      {calendarOpen && (
        <div className="mirror__region mirror__region--calendar">
          <CalendarModule
            now={now}
            source={calendarSource}
            agendaOnly
            maxEvents={12}
            onActivate={() => setExpanded(null)}
          />
        </div>
      )}
      {!focusOpen && !unwindOpen && (
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
      {(unwindOpen || weatherOpen) && <UnwindBackdrop sound={unwindOpen} />}
      {unwindOpen && (
        <div className="mirror__region mirror__region--left">
          <UnwindAlarm />
          <WeatherPanel brief expanded={false} />
        </div>
      )}
      <div className="mirror__region mirror__region--top-right">
        <CalendarModule
          now={now}
          source={calendarSource}
          clockOnly={mapOpen}
          hideAgenda={weatherOpen || calendarOpen || unwindOpen}
          onActivate={calendarOpen ? undefined : () => setExpanded('calendar')}
        />
      </div>
      <RushReminders now={now} source={calendarSource} />
      <div className="mirror__region mirror__region--voice">
        <VoiceButton onEvents={applyVoiceEvents} />
      </div>
    </main>
  )
}
