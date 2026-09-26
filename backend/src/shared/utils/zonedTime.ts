// Time-zone conversion shared by calendar fixture materialization and the planner.
// Deadlines themselves are computed in the planner; this file only turns a wall clock
// into an instant (and back) without depending on the machine's local zone.

export interface CalendarDate {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
}

export interface WallClockTime extends CalendarDate {
  hour: number;
  minute: number;
}

interface ZonedParts extends WallClockTime {
  second: number;
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    partsFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Wall-clock fields of `date` as observed in `timeZone`. */
export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const fields: Record<string, number> = {};
  for (const part of partsFormatter(timeZone).formatToParts(date)) {
    if (part.type !== 'literal') fields[part.type] = Number(part.value);
  }
  return {
    year: fields.year,
    month: fields.month,
    day: fields.day,
    hour: fields.hour,
    minute: fields.minute,
    second: fields.second,
  };
}

function offsetMs(date: Date, timeZone: string): number {
  const p = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * The instant at which clocks in `timeZone` read `wall`.
 *
 * Correct across daylight-saving transitions. A repeated fall-back wall time
 * resolves to its first occurrence; a wall time skipped by spring-forward
 * resolves to the instant just after the gap.
 */
export function zonedTimeToUtc(wall: WallClockTime, timeZone: string): Date {
  const guess = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
  const firstPass = guess - offsetMs(new Date(guess), timeZone);
  const secondPass = guess - offsetMs(new Date(firstPass), timeZone);
  if (firstPass === secondPass) return new Date(firstPass);

  const readsAsWall = (ms: number) => {
    const p = getZonedParts(new Date(ms), timeZone);
    return p.day === wall.day && p.hour === wall.hour && p.minute === wall.minute;
  };
  if (readsAsWall(secondPass)) return new Date(secondPass);
  if (readsAsWall(firstPass)) return new Date(firstPass);
  return new Date(Math.max(firstPass, secondPass));
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/** Calendar date of `date` in `timeZone`. */
export function zonedDate(date: Date, timeZone: string): CalendarDate {
  const { year, month, day } = getZonedParts(date, timeZone);
  return { year, month, day };
}
