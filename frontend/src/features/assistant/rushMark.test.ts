import { describe, expect, it } from 'vitest'
import { rushMark } from './rushMark'

describe('rushMark', () => {
  it('picks 30, 15, and 5 only inside that minute', () => {
    expect(rushMark(30)).toBe(30)
    expect(rushMark(29.1)).toBe(30)
    expect(rushMark(28.9)).toBeNull()
    expect(rushMark(15)).toBe(15)
    expect(rushMark(4.2)).toBe(5)
    expect(rushMark(4)).toBeNull()
    expect(rushMark(45)).toBeNull()
  })
})
