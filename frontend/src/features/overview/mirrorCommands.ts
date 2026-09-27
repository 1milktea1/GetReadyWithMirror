// Typed commands from the voice agent or the physical motion agent.
// React applies them. It does not interpret speech or gestures itself.

import type { TransportMode } from '@contracts/maps/types'

export const MIRROR_COMMAND_EVENT = 'mirror-command'

export type MirrorWidget = 'map' | 'weather' | 'calendar' | 'planner' | 'unwind'

export type MirrorCommand =
  | { action: 'expandWidget'; widget: MirrorWidget; mode?: TransportMode }
  | { action: 'showOverview' }

const WIDGETS: readonly MirrorWidget[] = ['map', 'weather', 'calendar', 'planner', 'unwind']
const MODES: readonly TransportMode[] = ['transit', 'walking', 'driving', 'cycling', 'rideshare']


export function isMirrorCommand(value: unknown): value is MirrorCommand {
  if (!value || typeof value !== 'object') return false
  const action = (value as { action?: unknown }).action
  if (action === 'showOverview') return true
  if (action !== 'expandWidget') return false
  const widget = (value as { widget?: unknown }).widget
  if (typeof widget !== 'string' || !(WIDGETS as readonly string[]).includes(widget)) return false
  const mode = (value as { mode?: unknown }).mode
  return mode === undefined || (typeof mode === 'string' && (MODES as readonly string[]).includes(mode))
}

export function publishMirrorCommand(command: MirrorCommand): void {
  window.dispatchEvent(new CustomEvent(MIRROR_COMMAND_EVENT, { detail: command }))
}

export function subscribeMirrorCommands(onCommand: (command: MirrorCommand) => void): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail
    if (isMirrorCommand(detail)) onCommand(detail)
  }
  window.addEventListener(MIRROR_COMMAND_EVENT, listener)
  return () => window.removeEventListener(MIRROR_COMMAND_EVENT, listener)
}

declare global {
  interface Window {
    /** Voice and motion agents call this with a typed command. */
    mirrorCommand?: (command: MirrorCommand) => void
  }
}
