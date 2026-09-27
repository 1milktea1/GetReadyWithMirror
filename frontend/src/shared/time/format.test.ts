import { describe, expect, it } from 'vitest'
import {
  formatClock,
  formatCountdown,
  formatDayLabel,
  formatLongDate,
  formatRemainingDuration,
  formatTimeOfDay,
} from './format'
import { MIRROR_TIME_ZONE as NY } from './zonedTime'

const saturdayMorning = new Date('2026-09-26T15:21:00Z')

describe('formatClock', () => {
  it('splits New York time into time and period', () => {
    expect(formatClock(saturdayMorning, NY)).toEqual({ time: '11:21', period: 'AM' })
  })

  it('shows midnight and noon as 12', () => {
    expect(formatClock(new Date('2026-09-27T04:00:00Z'), NY)).toEqual({ time: '12:00', period: 'AM' })
    expect(formatClock(new Date('2026-09-26T16:00:00Z'), NY)).toEqual({ time: '12:00', period: 'PM' })
  })

  it('pads minutes but not hours', () => {
    expect(formatClock(new Date('2026-09-26T13:05:00Z'), NY)).toEqual({ time: '9:05', period: 'AM' })
  })
})

describe('formatTimeOfDay', () => {
  it('uses a plain space before the period', () => {
    expect(formatTimeOfDay(new Date('2026-09-26T16:30:00Z'), NY)).toBe('12:30 PM')
  })
})

describe('formatLongDate', () => {
  it('uses the New York date, not the machine date', () => {
    // It is already Sunday the 27th in Tokyo, where the tests run.
    expect(formatLongDate(saturdayMorning, NY)).toBe('Saturday, September 26')
  })
})

describe('formatDayLabel', () => {
  it('labels a 9 PM New York event as Today even though it is past midnight UTC', () => {
    expect(formatDayLabel(new Date('2026-09-27T01:00:00Z'), saturdayMorning, NY)).toBe('Today')
  })

  it('labels the next New York day as Tomorrow', () => {
    expect(formatDayLabel(new Date('2026-09-27T14:00:00Z'), saturdayMorning, NY)).toBe('Tomorrow')
  })

  it('uses the weekday for anything further out', () => {
    expect(formatDayLabel(new Date('2026-09-28T14:30:00Z'), saturdayMorning, NY)).toBe('Monday')
  })
})

describe('formatRemainingDuration', () => {
  it('keeps minutes under an hour', () => {
    expect(formatRemainingDuration(1)).toBe('1 minute remaining')
    expect(formatRemainingDuration(45)).toBe('45 minutes remaining')
    expect(formatRemainingDuration(59)).toBe('59 minutes remaining')
  })

  it('switches to hours and minutes at 60', () => {
    expect(formatRemainingDuration(60)).toBe('1 hour remaining')
    expect(formatRemainingDuration(61)).toBe('1 hour 1 minute remaining')
    expect(formatRemainingDuration(90)).toBe('1 hour 30 minutes remaining')
    expect(formatRemainingDuration(120)).toBe('2 hours remaining')
    expect(formatRemainingDuration(255)).toBe('4 hours 15 minutes remaining')
  })
})

describe('formatCountdown', () => {
  const at = (minutes: number) => new Date(saturdayMorning.getTime() + minutes * 60_000)

  it('shows minutes under an hour', () => {
    expect(formatCountdown(at(45), saturdayMorning)).toBe('in 45 min')
  })

  it('shows hours and minutes', () => {
    expect(formatCountdown(at(69), saturdayMorning)).toBe('in 1 hr 9 min')
  })

  it('drops zero minutes', () => {
    expect(formatCountdown(at(120), saturdayMorning)).toBe('in 2 hr')
  })

  it('rounds partial minutes up so it never says 0 min early', () => {
    expect(formatCountdown(new Date(saturdayMorning.getTime() + 30_000), saturdayMorning)).toBe(
      'in 1 min',
    )
  })

  it('says starting now at or after the start', () => {
    expect(formatCountdown(saturdayMorning, saturdayMorning)).toBe('starting now')
    expect(formatCountdown(at(-5), saturdayMorning)).toBe('starting now')
  })
})
