import { describe, expect, it } from 'vitest'
import {
  MIRROR_TIME_ZONE as NY,
  addDays,
  calendarDaysBetween,
  dayKey,
  getZonedParts,
  zonedTimeToUtc,
} from './zonedTime'

describe('test environment', () => {
  it('runs outside New York so zone bugs cannot pass by coincidence', () => {
    // 15:21 UTC is 11:21 in New York but already 00:21 the next day in Tokyo.
    const instant = new Date('2026-09-26T15:21:00Z')
    expect(instant.getHours()).toBe(0)
    expect(instant.getDate()).toBe(27)
  })
})

describe('getZonedParts', () => {
  it('reads New York wall-clock time during daylight time', () => {
    expect(getZonedParts(new Date('2026-09-26T15:21:09Z'), NY)).toEqual({
      year: 2026,
      month: 9,
      day: 26,
      hour: 11,
      minute: 21,
      second: 9,
    })
  })

  it('reads New York wall-clock time during standard time', () => {
    expect(getZonedParts(new Date('2026-12-15T22:00:00Z'), NY)).toMatchObject({
      month: 12,
      day: 15,
      hour: 17,
    })
  })

  it('reports midnight as hour 0, not 24', () => {
    expect(getZonedParts(new Date('2026-09-27T04:00:00Z'), NY)).toMatchObject({ day: 27, hour: 0 })
  })
})

describe('zonedTimeToUtc', () => {
  it('converts a daylight-time wall clock (UTC-4)', () => {
    const utc = zonedTimeToUtc({ year: 2026, month: 9, day: 26, hour: 17, minute: 0 }, NY)
    expect(utc.toISOString()).toBe('2026-09-26T21:00:00.000Z')
  })

  it('converts a standard-time wall clock (UTC-5)', () => {
    const utc = zonedTimeToUtc({ year: 2026, month: 12, day: 15, hour: 17, minute: 0 }, NY)
    expect(utc.toISOString()).toBe('2026-12-15T22:00:00.000Z')
  })

  it('handles the evening of the fall-back day', () => {
    const utc = zonedTimeToUtc({ year: 2026, month: 11, day: 1, hour: 17, minute: 0 }, NY)
    expect(utc.toISOString()).toBe('2026-11-01T22:00:00.000Z')
  })

  it('handles the hour just after the fall-back transition', () => {
    const utc = zonedTimeToUtc({ year: 2026, month: 11, day: 1, hour: 3, minute: 0 }, NY)
    expect(utc.toISOString()).toBe('2026-11-01T08:00:00.000Z')
  })

  it('resolves a repeated fall-back time to its first occurrence', () => {
    const utc = zonedTimeToUtc({ year: 2026, month: 11, day: 1, hour: 1, minute: 30 }, NY)
    expect(utc.toISOString()).toBe('2026-11-01T05:30:00.000Z')
  })

  it('handles the evening of the spring-forward day', () => {
    const utc = zonedTimeToUtc({ year: 2026, month: 3, day: 8, hour: 17, minute: 0 }, NY)
    expect(utc.toISOString()).toBe('2026-03-08T21:00:00.000Z')
  })

  it('resolves a time skipped by spring-forward to just after the gap', () => {
    const utc = zonedTimeToUtc({ year: 2026, month: 3, day: 8, hour: 2, minute: 30 }, NY)
    expect(utc.toISOString()).toBe('2026-03-08T07:30:00.000Z')
    expect(getZonedParts(utc, NY)).toMatchObject({ hour: 3, minute: 30 })
  })

  it('round-trips through getZonedParts', () => {
    const wall = { year: 2026, month: 7, day: 4, hour: 9, minute: 45 }
    expect(getZonedParts(zonedTimeToUtc(wall, NY), NY)).toMatchObject(wall)
  })
})

describe('addDays', () => {
  it('crosses month boundaries', () => {
    expect(addDays({ year: 2026, month: 9, day: 30 }, 1)).toEqual({ year: 2026, month: 10, day: 1 })
  })

  it('crosses year boundaries', () => {
    expect(addDays({ year: 2026, month: 12, day: 31 }, 2)).toEqual({ year: 2027, month: 1, day: 2 })
  })

  it('goes backwards', () => {
    expect(addDays({ year: 2026, month: 3, day: 1 }, -1)).toEqual({ year: 2026, month: 2, day: 28 })
  })
})

describe('calendarDaysBetween', () => {
  const now = new Date('2026-09-26T15:21:00Z')

  it('counts a late-evening New York event as today even when UTC has rolled over', () => {
    expect(calendarDaysBetween(now, new Date('2026-09-27T01:00:00Z'), NY)).toBe(0)
  })

  it('counts tomorrow and beyond', () => {
    expect(calendarDaysBetween(now, new Date('2026-09-27T14:00:00Z'), NY)).toBe(1)
    expect(calendarDaysBetween(now, new Date('2026-09-28T14:00:00Z'), NY)).toBe(2)
  })

  it('stays whole across a daylight-saving change', () => {
    const before = new Date('2026-10-31T16:00:00Z')
    const after = new Date('2026-11-02T17:00:00Z')
    expect(calendarDaysBetween(before, after, NY)).toBe(2)
  })
})

describe('dayKey', () => {
  it('uses the New York calendar day', () => {
    expect(dayKey(new Date('2026-09-27T03:30:00Z'), NY)).toBe('2026-09-26')
  })
})
