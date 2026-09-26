import { CalendarModule, createFixtureCalendarSource } from '../features/calendar'
import { useNow } from '../shared/time/useNow'
import './App.css'

const calendarSource = createFixtureCalendarSource()

export function App() {
  const { now, isOverridden } = useNow()

  return (
    <main className="mirror">
      <div className="mirror__region mirror__region--top-right">
        <CalendarModule now={now} source={calendarSource} timeIsSimulated={isOverridden} />
      </div>
    </main>
  )
}
