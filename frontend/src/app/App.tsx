import { CalendarModule, createFixtureCalendarSource } from '../features/calendar'
import { useNow } from '../shared/time/useNow'
import './App.css'

const calendarSource = createFixtureCalendarSource()

export function App() {
  const { now, actualNow, isOverridden } = useNow()

  return (
    <main className="mirror">
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
