import demoDay from '@fixtures/calendar/demo-day.json'
import { describe, expect, it } from 'vitest'
import { createFixtureCalendarSource, materializeFixture } from './fixtureCalendarSource'

const find = (events: ReturnType<typeof materializeFixture>, id: string) => {
  const match = events.find((event) => event.id === id)
  if (!match) throw new Error(`fixture event ${id} missing`)
  return match
}

describe('demo fixture', () => {
  it('keeps the AGENTS.md demo event: a 7 PM dinner today in New York', () => {
    expect(demoDay.timeZone).toBe('America/New_York')
    expect(demoDay.events).toContainEqual(
      expect.objectContaining({ id: 'fixture-dinner', dayOffset: 0, startTime: '19:00' }),
    )
  })

  it('carries the agreed demo restaurant, which maps needs to route to', () => {
    expect(demoDay.events).toContainEqual(
      expect.objectContaining({
        id: 'fixture-dinner',
        venueName: 'Soothr',
        venueAddress: '204 E 13th St, New York, NY 10003',
      }),
    )
  })
})

describe('materializeFixture', () => {
  it('places events on the current New York day', () => {
    const events = materializeFixture(demoDay, new Date('2026-09-26T15:21:00Z'))
    expect(find(events, 'fixture-dinner')).toMatchObject({
      start: '2026-09-26T23:00:00.000Z',
      end: '2026-09-27T00:30:00.000Z',
    })
    expect(find(events, 'fixture-gym').start).toBe('2026-09-27T12:00:00.000Z')
  })

  it('rolls the demo day forward after tonight’s dinner ends', () => {
    // 9 PM Saturday in New York — the 7 PM reservation already ended.
    const events = materializeFixture(demoDay, new Date('2026-09-27T01:00:00Z'))
    expect(find(events, 'fixture-dinner').start).toBe('2026-09-27T23:00:00.000Z')
  })

  it('uses the New York day late at night, when UTC and Tokyo have already rolled over', () => {
    // 4 PM Saturday in New York; UTC is still Saturday, Tokyo is already Sunday.
    const events = materializeFixture(demoDay, new Date('2026-09-26T20:00:00Z'))
    expect(find(events, 'fixture-dinner').start).toBe('2026-09-26T23:00:00.000Z')
  })

  it('follows standard time in winter', () => {
    const events = materializeFixture(demoDay, new Date('2026-12-15T15:00:00Z'))
    expect(find(events, 'fixture-dinner').start).toBe('2026-12-16T00:00:00.000Z')
  })
})

describe('createFixtureCalendarSource', () => {
  it('labels its result as a fixture', async () => {
    const now = new Date('2026-09-26T15:21:00Z')
    const result = await createFixtureCalendarSource().fetchEvents(now)
    expect(result).toMatchObject({
      status: 'ok',
      provenance: 'fixture',
      timeZone: 'America/New_York',
      retrievedAt: now.toISOString(),
    })
    expect(result.events).toHaveLength(demoDay.events.length)
  })

  it('reports no-data for an empty fixture', async () => {
    const source = createFixtureCalendarSource({ timeZone: 'America/New_York', events: [] })
    const result = await source.fetchEvents(new Date('2026-09-26T15:21:00Z'))
    expect(result.status).toBe('no-data')
    expect(result.events).toEqual([])
  })
})
