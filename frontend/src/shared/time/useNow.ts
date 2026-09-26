import { useEffect, useState } from 'react'
import { parseNowOverride } from './nowOverride'
import { MIRROR_TIME_ZONE } from './zonedTime'

export interface MirrorClock {
  now: Date
  /** True when `?now=` shifted the clock; the UI should say so. */
  isOverridden: boolean
}

function readOffsetMs(): number {
  if (typeof window === 'undefined') return 0
  const realNow = new Date()
  const override = parseNowOverride(window.location.search, realNow, MIRROR_TIME_ZONE)
  return override ? override.getTime() - realNow.getTime() : 0
}

/**
 * Current time for the whole mirror, ticking every `tickMs`.
 *
 * An override starts the clock at the requested time and lets it keep running,
 * so countdowns and "next event" transitions can be rehearsed at any hour.
 */
export function useNow(tickMs = 1000): MirrorClock {
  const [offsetMs] = useState(readOffsetMs)
  const [now, setNow] = useState(() => new Date(Date.now() + offsetMs))

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date(Date.now() + offsetMs)), tickMs)
    return () => window.clearInterval(id)
  }, [offsetMs, tickMs])

  return { now, isOverridden: offsetMs !== 0 }
}
