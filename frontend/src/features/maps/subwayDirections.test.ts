import { describe, expect, it } from 'vitest'
import { formatSubwayDirections } from './subwayDirections'

describe('formatSubwayDirections', () => {
  it('lists lines and the transfer station', () => {
    expect(
      formatSubwayDirections([
        {
          kind: 'subway',
          line: '1',
          color: '#EE352E',
          toStop: '14 St',
          path: [],
        },
        {
          kind: 'subway',
          line: 'L',
          color: '#A7A9AC',
          fromStop: '14 St',
          path: [],
        },
      ]),
    ).toBe('1, L. transfer at station 14 St.')
  })

  it('omits transfer when there is only one line', () => {
    expect(
      formatSubwayDirections([{ kind: 'subway', line: '1', color: '#fff', path: [] }]),
    ).toBe('1')
  })
})
