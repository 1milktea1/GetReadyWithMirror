import { describe, expect, it } from 'vitest'
import { commandAfterWake } from './wakePhrase'

describe('commandAfterWake', () => {
  it('ignores speech that is not the wake phrase', () => {
    expect(commandAfterWake('what is the weather')).toBeNull()
  })

  it('treats the phrase alone as a trigger with no command yet', () => {
    expect(commandAfterWake('Hey Mirror')).toBe('')
    expect(commandAfterWake('hey, mirror.')).toBe('')
  })

  it('keeps the request that follows the phrase', () => {
    expect(commandAfterWake('Hey Mirror, should I bring an umbrella?')).toBe('should I bring an umbrella?')
    expect(commandAfterWake('okay hey mirror open the calendar')).toBe('open the calendar')
  })
})
