import { describe, expect, it, vi } from 'vitest'
import { isMirrorCommand, publishMirrorCommand, subscribeMirrorCommands } from './mirrorCommands'

describe('mirror commands', () => {
  it('accepts expand map and show overview, and rejects anything else', () => {
    expect(isMirrorCommand({ action: 'expandWidget', widget: 'map' })).toBe(true)
    expect(isMirrorCommand({ action: 'expandWidget', widget: 'map', mode: 'walking' })).toBe(true)
    expect(isMirrorCommand({ action: 'expandWidget', widget: 'map', mode: 'hoverboard' })).toBe(false)
    expect(isMirrorCommand({ action: 'showOverview' })).toBe(true)
    expect(isMirrorCommand({ action: 'expandWidget', widget: 'fridge' })).toBe(false)
    expect(isMirrorCommand({ action: 'say', widget: 'map' })).toBe(false)
  })

  it('delivers a published command to subscribers', () => {
    const onCommand = vi.fn()
    const stop = subscribeMirrorCommands(onCommand)
    publishMirrorCommand({ action: 'expandWidget', widget: 'map' })
    publishMirrorCommand({ action: 'showOverview' })
    stop()
    publishMirrorCommand({ action: 'expandWidget', widget: 'weather' })
    expect(onCommand.mock.calls.map((call) => call[0])).toEqual([
      { action: 'expandWidget', widget: 'map' },
      { action: 'showOverview' },
    ])
  })
})
