import { describe, expect, it } from 'vitest'
import { appendSpokenTurn } from './conversation'

describe('appendSpokenTurn', () => {
  it('keeps user and assistant text and drops empty lines', () => {
    expect(appendSpokenTurn([], '  Plan my time.  ', 'Start the shower at 5:30.')).toEqual([
      { role: 'user', content: 'Plan my time.' },
      { role: 'assistant', content: 'Start the shower at 5:30.' },
    ])
  })

  it('keeps only the last eight messages', () => {
    let history = appendSpokenTurn([], 'one', 'a')
    history = appendSpokenTurn(history, 'two', 'b')
    history = appendSpokenTurn(history, 'three', 'c')
    history = appendSpokenTurn(history, 'four', 'd')
    history = appendSpokenTurn(history, 'five', 'e')
    expect(history).toHaveLength(8)
    expect(history[0]).toEqual({ role: 'user', content: 'two' })
    expect(history.at(-1)).toEqual({ role: 'assistant', content: 'e' })
  })
})
