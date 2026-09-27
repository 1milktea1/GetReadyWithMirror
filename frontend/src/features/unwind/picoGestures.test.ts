import { describe, expect, it } from 'vitest'
import { commandForSwipe, commandForSwipeEvent } from './picoGestures'

describe('pico swipe commands', () => {
  it('maps left to unwind and right to the dashboard', () => {
    expect(commandForSwipe('left')).toEqual({ action: 'expandWidget', widget: 'unwind' })
    expect(commandForSwipe('right')).toEqual({ action: 'showOverview' })
    expect(commandForSwipe('up')).toBeNull()
  })

  it('reads the hardware SSE payload', () => {
    expect(commandForSwipeEvent('{"gesture":"left"}')).toEqual({
      action: 'expandWidget',
      widget: 'unwind',
    })
    expect(commandForSwipeEvent('not-json')).toBeNull()
  })
})
