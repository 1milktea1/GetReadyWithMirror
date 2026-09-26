import { useEffect, useState } from 'react'
import { parseNowOverride } from './nowOverride'
import { MIRROR_TIME_ZONE } from './zonedTime'

export interface MirrorClock {
  /** The time the mirror displays: the device clock, or the `?now=` override. */
  now: Date
  /** The device clock, always. Differs from `now` only while overridden. */
  actualNow: Date
  /** True when `?now=` shifted the clock; the UI must say so. */
  isOverridden: boolean
}

function readOffsetMs(): number {
  if (typeof window === 'undefined') return 0
  const realNow = new Date()
  const override = parseNowOverride(window.location.search, realNow, MIRROR_TIME_ZONE)
  return override ? override.getTime() - realNow.getTime() : 0
}

function read(offsetMs: number): MirrorClock {
  const actualMs = Date.now()
  return {
    now: new Date(actualMs + offsetMs),
    actualNow: new Date(actualMs),
    isOverridden: offsetMs !== 0,
  }
}

/**
 * Current time for the whole mirror, from the device clock, ticking every `tickMs`.
 *
 * An override starts the clock at the requested time and lets it keep running,
 * so countdowns and "next event" transitions can be rehearsed at any hour.
 */
export function useNow(tickMs = 1000): MirrorClock {
  const [offsetMs] = useState(readOffsetMs)
  const [clock, setClock] = useState(() => read(offsetMs))

  useEffect(() => {
    const id = window.setInterval(() => setClock(read(offsetMs)), tickMs)
    return () => window.clearInterval(id)
  }, [offsetMs, tickMs])

  return clock
}
