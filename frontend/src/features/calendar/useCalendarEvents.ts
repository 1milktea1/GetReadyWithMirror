import type { CalendarResult } from '@contracts/calendar'
import { useEffect, useState } from 'react'
import type { CalendarSource } from './data/calendarSource'

export const CALENDAR_REFRESH_MS = 5 * 60_000

export type CalendarState =
  | { phase: 'loading' }
  | { phase: 'ready'; result: CalendarResult }
  | { phase: 'failed' }

/**
 * Fetches on mount and at every refresh boundary.
 *
 * Boundaries fall on whole multiples of the interval, which include every
 * New York midnight, so the day rolls over without a separate trigger. The
 * previous result stays on screen while a refresh is in flight.
 */
export function useCalendarEvents(source: CalendarSource, now: Date): CalendarState {
  const [state, setState] = useState<CalendarState>({ phase: 'loading' })
  const refreshSlot = Math.floor(now.getTime() / CALENDAR_REFRESH_MS)

  useEffect(() => {
    let active = true
    source
      .fetchEvents(new Date(refreshSlot * CALENDAR_REFRESH_MS))
      .then((result) => {
        if (active) setState({ phase: 'ready', result })
      })
      .catch(() => {
        if (active) setState({ phase: 'failed' })
      })
    return () => {
      active = false
    }
  }, [source, refreshSlot])

  return state
}
