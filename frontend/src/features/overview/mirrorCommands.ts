// Typed commands from the voice agent or the physical motion agent.
// React applies them. It does not interpret speech or gestures itself.

export const MIRROR_COMMAND_EVENT = 'mirror-command'

export type MirrorWidget = 'map' | 'weather' | 'calendar' | 'planner'

export type MirrorCommand =
  | { action: 'expandWidget'; widget: MirrorWidget }
  | { action: 'showOverview' }

const WIDGETS: readonly MirrorWidget[] = ['map', 'weather', 'calendar', 'planner']

export function isMirrorCommand(value: unknown): value is MirrorCommand {
  if (!value || typeof value !== 'object') return false
  const action = (value as { action?: unknown }).action
  if (action === 'showOverview') return true
  if (action !== 'expandWidget') return false
  const widget = (value as { widget?: unknown }).widget
  return typeof widget === 'string' && (WIDGETS as readonly string[]).includes(widget)
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
