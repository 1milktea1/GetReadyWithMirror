import { describe, expect, it } from 'vitest'
import { generateLocalPlan } from './localPlan'

describe('generateLocalPlan', () => {
  it('builds a fixture leave-by that ends at 6:15 PM for the 4 PM clock', async () => {
    const result = await generateLocalPlan(new URLSearchParams('now=2026-09-26T16:00:00-04:00'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.leaveBy.at).toBe('2026-09-26T22:15:00.000Z')
    expect(result.data.leaveBy.travelMinutes).toBe(35)
    expect(result.data.tasks.at(-1)?.end).toBe(result.data.leaveBy.at)
    expect(result.data.provenance.isFixture).toBe(true)
    expect(result.data.conflict).toBeNull()
  })

  it('rejects a bad clock the same way the HTTP handler does', async () => {
    const result = await generateLocalPlan(new URLSearchParams('now=bogus'))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.status).toBe('input-invalid')
  })
})
