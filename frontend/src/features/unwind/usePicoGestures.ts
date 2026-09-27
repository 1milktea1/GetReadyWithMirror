import { useEffect } from 'react'
import { publishMirrorCommand } from '../overview/mirrorCommands'
import { commandForSwipeEvent } from './picoGestures'

/** Pico SWIPE:LEFT / SWIPE:RIGHT arrive as SSE and become typed mirror commands. */
export function usePicoGestures() {
  useEffect(() => {
    if (import.meta.env.MODE === 'test') return
    if (typeof EventSource === 'undefined') return
    let source: EventSource
    try {
      source = new EventSource('/api/hardware/gestures')
    } catch {
      return
    }

    source.onmessage = (event) => {
      const command = commandForSwipeEvent(event.data)
      if (command) publishMirrorCommand(command)
    }

    return () => source.close()
  }, [])
}
