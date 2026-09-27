import type { MirrorCommand, MirrorWidget } from '../overview/mirrorCommands'
import type { VoiceUiEvent } from './VoiceButton'

/** Grok UI events use the same expand path as `window.mirrorCommand`. */
export function commandForVoiceEvent(event: VoiceUiEvent): MirrorCommand | null {
  if (event.action === 'showOverview' || event.action === 'collapseWidget') {
    return { action: 'showOverview' }
  }
  if (event.action !== 'expandWidget') return null
  const widget = widgetFor(event.target)
  if (!widget) return null
  return event.mode ? { action: 'expandWidget', widget, mode: event.mode } : { action: 'expandWidget', widget }
}

function widgetFor(target: string | undefined): MirrorWidget | null {
  if (target === 'weather' || target === 'calendar' || target === 'planner') return target
  if (target === 'maps' || target === 'map') return 'map'
  return null
}
