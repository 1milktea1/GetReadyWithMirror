import { useEffect, useState } from 'react'

export interface MirrorClock {
  /** Device clock. The mirror does not shift this with a URL override. */
  now: Date
}

function read(): MirrorClock {
  return { now: new Date() }
}

/**
 * Current time for the whole mirror, from the device clock, ticking every `tickMs`.
 */
export function useNow(tickMs = 1000): MirrorClock {
  const [clock, setClock] = useState(read)

  useEffect(() => {
    const id = window.setInterval(() => setClock(read()), tickMs)
    return () => window.clearInterval(id)
  }, [tickMs])

  return clock
}
