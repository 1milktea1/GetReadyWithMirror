import type { MirrorCommand } from '../overview/mirrorCommands'

export function commandForSwipe(gesture: string): MirrorCommand | null {
  if (gesture === 'left') return { action: 'expandWidget', widget: 'unwind' }
  if (gesture === 'right') return { action: 'showOverview' }
  return null
}

export function commandForSwipeEvent(data: string): MirrorCommand | null {
  try {
    const parsed = JSON.parse(data) as { gesture?: unknown }
    return typeof parsed.gesture === 'string' ? commandForSwipe(parsed.gesture) : null
  } catch {
    return null
  }
}
