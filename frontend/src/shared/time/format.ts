import { calendarDaysBetween } from './zonedTime'

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(key: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  let cached = formatters.get(key)
  if (!cached) {
    cached = new Intl.DateTimeFormat('en-US', options)
    formatters.set(key, cached)
  }
  return cached
}

export interface ClockReading {
  /** e.g. `11:21` */
  time: string
  /** `AM` or `PM` */
  period: string
}

/** 12-hour clock split into time and period, built from parts to avoid locale spacing quirks. */
export function formatClock(date: Date, timeZone: string): ClockReading {
  const parts = formatter(`clock:${timeZone}`, {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return { time: `${get('hour')}:${get('minute')}`, period: get('dayPeriod').toUpperCase() }
}

/** e.g. `12:30 PM` */
export function formatTimeOfDay(date: Date, timeZone: string): string {
  const { time, period } = formatClock(date, timeZone)
  return `${time} ${period}`
}

/** e.g. `Saturday, September 26` */
export function formatLongDate(date: Date, timeZone: string): string {
  return formatter(`long-date:${timeZone}`, {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

/** `Today`, `Tomorrow`, or a weekday name for anything further out. */
export function formatDayLabel(date: Date, now: Date, timeZone: string): string {
  const days = calendarDaysBetween(now, date, timeZone)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return formatter(`weekday:${timeZone}`, { timeZone, weekday: 'long' }).format(date)
}

/** Compact countdown such as `in 45 min` or `in 2 hr 5 min`. */
export function formatCountdown(target: Date, now: Date): string {
  const totalMinutes = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 60_000))
  if (totalMinutes < 1) return 'starting now'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `in ${minutes} min`
  if (minutes === 0) return `in ${hours} hr`
  return `in ${hours} hr ${minutes} min`
}
