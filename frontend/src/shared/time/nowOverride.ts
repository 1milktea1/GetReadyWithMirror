import { zonedDate, zonedTimeToUtc } from './zonedTime'

const TIME_ONLY = /^(\d{1,2}):(\d{2})$/
const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i

function isValidWallTime(hour: number, minute: number): boolean {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
}

/**
 * Parses the `?now=` demo/test-time override.
 *
 * Accepted forms, with zone-less values read as wall-clock time in `timeZone`:
 * - `15:30` — today at 3:30 PM
 * - `2026-09-26T15:30` — that date and time
 * - `2026-09-26T19:30:00Z` or any ISO 8601 instant with an offset
 *
 * Returns `null` when absent or unparseable so the real clock is used.
 */
export function parseNowOverride(search: string, realNow: Date, timeZone: string): Date | null {
  const raw = new URLSearchParams(search).get('now')?.trim()
  if (!raw) return null

  const timeOnly = TIME_ONLY.exec(raw)
  if (timeOnly) {
    const hour = Number(timeOnly[1])
    const minute = Number(timeOnly[2])
    if (!isValidWallTime(hour, minute)) return null
    return zonedTimeToUtc({ ...zonedDate(realNow, timeZone), hour, minute }, timeZone)
  }

  const local = LOCAL_DATE_TIME.exec(raw)
  if (local) {
    const [year, month, day, hour, minute] = local.slice(1).map(Number)
    if (!isValidWallTime(hour, minute) || month < 1 || month > 12 || day < 1 || day > 31) {
      return null
    }
    return zonedTimeToUtc({ year, month, day, hour, minute }, timeZone)
  }

  if (HAS_ZONE.test(raw)) {
    const instant = new Date(raw)
    return Number.isNaN(instant.getTime()) ? null : instant
  }

  return null
}
