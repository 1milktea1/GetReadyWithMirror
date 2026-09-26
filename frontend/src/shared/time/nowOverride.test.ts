import { describe, expect, it } from 'vitest'
import { parseNowOverride } from './nowOverride'
import { MIRROR_TIME_ZONE as NY } from './zonedTime'

const realNow = new Date('2026-09-26T15:21:00Z')

describe('parseNowOverride', () => {
  it('reads HH:MM as today in New York', () => {
    expect(parseNowOverride('?now=15:30', realNow, NY)?.toISOString()).toBe(
      '2026-09-26T19:30:00.000Z',
    )
  })

  it('anchors HH:MM to the New York day, not the UTC or machine day', () => {
    // 02:00 UTC on the 27th is still 10 PM on the 26th in New York.
    const lateNight = new Date('2026-09-27T02:00:00Z')
    expect(parseNowOverride('?now=09:00', lateNight, NY)?.toISOString()).toBe(
      '2026-09-26T13:00:00.000Z',
    )
  })

  it('accepts single-digit hours', () => {
    expect(parseNowOverride('?now=9:05', realNow, NY)?.toISOString()).toBe('2026-09-26T13:05:00.000Z')
  })

  it('reads a zone-less date-time as New York wall-clock time', () => {
    expect(parseNowOverride('?now=2026-12-15T17:00', realNow, NY)?.toISOString()).toBe(
      '2026-12-15T22:00:00.000Z',
    )
  })

  it('accepts an ISO instant with an explicit zone', () => {
    expect(parseNowOverride('?now=2026-09-26T19:30:00Z', realNow, NY)?.toISOString()).toBe(
      '2026-09-26T19:30:00.000Z',
    )
    expect(
      parseNowOverride('?now=2026-09-26T15:30:00-04:00', realNow, NY)?.toISOString(),
    ).toBe('2026-09-26T19:30:00.000Z')
  })

  it.each([
    ['no query string', ''],
    ['an unrelated parameter', '?foo=bar'],
    ['an empty value', '?now='],
    ['an out-of-range hour', '?now=25:00'],
    ['an out-of-range minute', '?now=10:75'],
    ['free text', '?now=banana'],
    ['a date with no time', '?now=2026-09-26'],
    ['an impossible month', '?now=2026-13-01T10:00'],
  ])('ignores %s', (_label, search) => {
    expect(parseNowOverride(search, realNow, NY)).toBeNull()
  })
})
