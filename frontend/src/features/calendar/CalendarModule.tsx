import type { CalendarStatus } from '@contracts/calendar'
import { Fragment } from 'react'
import {
  formatClock,
  formatCountdown,
  formatDayLabel,
  formatLongDate,
  formatTimeOfDay,
} from '../../shared/time/format'
import { MIRROR_TIME_ZONE } from '../../shared/time/zonedTime'
import type { CalendarSource } from './data/calendarSource'
import { selectUpcoming, type UpcomingEvent } from './selectUpcoming'
import { useCalendarEvents, type CalendarState } from './useCalendarEvents'
import './CalendarModule.css'

export interface CalendarModuleProps {
  now: Date
  source: CalendarSource
  /**
   * The real device time, passed only while the demo-time override is active.
   * The module then labels the clock as simulated and shows this alongside it.
   */
  actualTime?: Date
  timeZone?: string
  maxEvents?: number
  /** clock keeps the time and date. agenda keeps the event list. full is the overview corner. */
  part?: 'full' | 'clock' | 'agenda'
}

const STATUS_MESSAGES: Record<Exclude<CalendarStatus, 'ok'>, string> = {
  'no-data': 'Nothing scheduled',
  'not-authorized': 'Calendar not connected',
  'not-configured': 'Calendar not set up',
  'external-provider-unavailable': 'Calendar unavailable',
}

export function CalendarModule({
  now,
  source,
  actualTime,
  timeZone = MIRROR_TIME_ZONE,
  maxEvents = 4,
  part = 'full',
}: CalendarModuleProps) {
  const state = useCalendarEvents(source, now)
  const clock = formatClock(now, timeZone)

  return (
    <section className={`calendar${part === 'agenda' ? ' calendar--agenda' : ''}`} aria-label={part === 'clock' ? 'Time' : 'Calendar'}>
      {part !== 'agenda' && (
      <header className="calendar__now">
        <time className="calendar__clock" dateTime={now.toISOString()}>
          <span className="calendar__time">{clock.time}</span>
          <span className="calendar__period">{clock.period}</span>
        </time>
        <p className="calendar__date">{formatLongDate(now, timeZone)}</p>
        {actualTime && (
          <p className="calendar__tag">Demo time · actual {formatTimeOfDay(actualTime, timeZone)}</p>
        )}
      </header>
      )}

      {part !== 'clock' && (
      <div className="calendar__agenda">
        <div className="calendar__agenda-header">
          <h2 className="calendar__heading">Upcoming</h2>
        </div>
        <Agenda state={state} now={now} timeZone={timeZone} maxEvents={maxEvents} />
      </div>
      )}
    </section>
  )
}

interface AgendaProps {
  state: CalendarState
  now: Date
  timeZone: string
  maxEvents: number
}

function Agenda({ state, now, timeZone, maxEvents }: AgendaProps) {
  if (state.phase === 'loading') {
    return <p className="calendar__message">Loading calendar…</p>
  }
  if (state.phase === 'failed') {
    return <p className="calendar__message">{STATUS_MESSAGES['external-provider-unavailable']}</p>
  }
  if (state.result.status !== 'ok') {
    return <p className="calendar__message">{STATUS_MESSAGES[state.result.status]}</p>
  }

  const upcoming = selectUpcoming(state.result.events, now, maxEvents)
  if (upcoming.length === 0) {
    return <p className="calendar__message">Nothing else scheduled</p>
  }

  const nextEventId = upcoming.find((item) => !item.inProgress)?.event.id

  return (
    <ol className="calendar__days">
      {groupByDay(upcoming, now, timeZone).map(({ label, items }) => (
        <li key={label} className="calendar__day">
          <h3 className="calendar__day-label">{label}</h3>
          <ol className="calendar__events">
            {items.map((item) => (
              <EventRow
                key={item.event.id}
                item={item}
                now={now}
                timeZone={timeZone}
                showCountdown={item.event.id === nextEventId}
              />
            ))}
          </ol>
        </li>
      ))}
    </ol>
  )
}

interface EventRowProps {
  item: UpcomingEvent
  now: Date
  timeZone: string
  showCountdown: boolean
}

function EventRow({ item, now, timeZone, showCountdown }: EventRowProps) {
  const { event, start, end, inProgress } = item
  const timing = [
    inProgress ? `until ${formatTimeOfDay(end, timeZone)}` : null,
    showCountdown ? formatCountdown(start, now) : null,
  ].filter((detail) => detail !== null)
  const hasMeta = Boolean(event.venueName) || timing.length > 0

  return (
    <li className={inProgress ? 'calendar__event calendar__event--active' : 'calendar__event'}>
      <div className="calendar__event-body">
        <p className="calendar__event-title">{event.title}</p>
        {hasMeta && (
          <p className="calendar__event-meta">
            {event.venueName}
            {timing.map((detail, index) => (
              <Fragment key={detail}>
                {(event.venueName || index > 0) && ' · '}
                <span className="calendar__event-timing">{detail}</span>
              </Fragment>
            ))}
          </p>
        )}
      </div>
      <time className="calendar__event-time" dateTime={event.start}>
        {inProgress ? 'Now' : formatTimeOfDay(start, timeZone)}
      </time>
    </li>
  )
}

function groupByDay(items: UpcomingEvent[], now: Date, timeZone: string) {
  const groups: { label: string; items: UpcomingEvent[] }[] = []
  for (const item of items) {
    const label = formatDayLabel(item.start, now, timeZone)
    const last = groups.at(-1)
    if (last?.label === label) last.items.push(item)
    else groups.push({ label, items: [item] })
  }
  return groups
}
