import type { CalendarEvent } from '@contracts/calendar'
import { describe, expect, it } from 'vitest'
import { selectUpcoming } from './selectUpcoming'

const event = (id: string, start: string, end: string): CalendarEvent => ({
  id,
  title: id,
  start,
  end,
})

const now = new Date('2026-09-26T16:45:00Z')

const events = [
  event('dinner', '2026-09-26T21:00:00Z', '2026-09-26T22:30:00Z'),
  event('standup', '2026-09-26T13:30:00Z', '2026-09-26T14:00:00Z'),
  event('lunch', '2026-09-26T16:30:00Z', '2026-09-26T17:30:00Z'),
  event('office-hours', '2026-09-26T18:00:00Z', '2026-09-26T19:00:00Z'),
  event('gym', '2026-09-27T12:00:00Z', '2026-09-27T13:00:00Z'),
]

describe('selectUpcoming', () => {
  it('drops events that have already ended', () => {
    const ids = selectUpcoming(events, now, 10).map((item) => item.event.id)
    expect(ids).not.toContain('standup')
  })

  it('sorts by start time regardless of input order', () => {
    const ids = selectUpcoming(events, now, 10).map((item) => item.event.id)
    expect(ids).toEqual(['lunch', 'office-hours', 'dinner', 'gym'])
  })

  it('flags only the event currently under way', () => {
    const flags = selectUpcoming(events, now, 10).map((item) => [item.event.id, item.inProgress])
    expect(flags).toEqual([
      ['lunch', true],
      ['office-hours', false],
      ['dinner', false],
      ['gym', false],
    ])
  })

  it('caps the result at the limit', () => {
    expect(selectUpcoming(events, now, 2).map((item) => item.event.id)).toEqual([
      'lunch',
      'office-hours',
    ])
  })

  it('treats an event ending exactly now as over', () => {
    const endsNow = event('ends-now', '2026-09-26T16:00:00Z', '2026-09-26T16:45:00Z')
    expect(selectUpcoming([endsNow], now, 10)).toEqual([])
  })

  it('treats an event starting exactly now as in progress', () => {
    const startsNow = event('starts-now', '2026-09-26T16:45:00Z', '2026-09-26T17:00:00Z')
    expect(selectUpcoming([startsNow], now, 10)[0].inProgress).toBe(true)
  })

  it('skips events with unparseable times instead of crashing', () => {
    const broken = event('broken', 'not-a-date', '2026-09-26T22:00:00Z')
    expect(selectUpcoming([broken, ...events], now, 10).map((item) => item.event.id)).not.toContain(
      'broken',
    )
  })
})
