import type { CalendarEvent, CalendarResult } from '@contracts/calendar'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CalendarModule } from './CalendarModule'
import type { CalendarSource } from './data/calendarSource'
import { createFixtureCalendarSource } from './data/fixtureCalendarSource'

const saturdayMorning = new Date('2026-09-26T15:21:00Z') // 11:21 AM in New York

const lunch: CalendarEvent = {
  id: 'lunch',
  title: 'Lunch with study group',
  start: '2026-09-26T16:30:00Z',
  end: '2026-09-26T17:30:00Z',
  venueName: 'Columbia University',
}
const dinner: CalendarEvent = {
  id: 'dinner',
  title: 'Dinner reservation',
  start: '2026-09-26T21:00:00Z',
  end: '2026-09-26T22:30:00Z',
}
const standup: CalendarEvent = {
  id: 'standup',
  title: 'Research group standup',
  start: '2026-09-26T13:30:00Z',
  end: '2026-09-26T14:00:00Z',
}
const gym: CalendarEvent = {
  id: 'gym',
  title: 'Gym',
  start: '2026-09-27T12:00:00Z',
  end: '2026-09-27T13:00:00Z',
}

function sourceReturning(overrides: Partial<CalendarResult>): CalendarSource {
  return {
    fetchEvents: async () => ({
      status: 'ok',
      provenance: 'live',
      timeZone: 'America/New_York',
      retrievedAt: saturdayMorning.toISOString(),
      events: [dinner, standup, lunch, gym],
      ...overrides,
    }),
  }
}

const eventTitles = (container: HTMLElement) =>
  [...container.querySelectorAll('.calendar__event-title')].map((node) => node.textContent)

const eventMeta = (container: HTMLElement) =>
  [...container.querySelectorAll('.calendar__event-meta')].map((node) => node.textContent)

describe('CalendarModule clock', () => {
  it('shows the current New York time and date', () => {
    render(<CalendarModule now={saturdayMorning} source={sourceReturning({})} />)
    expect(screen.getByText('11:21')).toBeInTheDocument()
    expect(screen.getByText('AM')).toBeInTheDocument()
    expect(screen.getByText('Saturday, September 26')).toBeInTheDocument()
  })

  it('labels a simulated clock and shows the actual time beside it', () => {
    const lateNight = new Date('2026-09-27T03:30:00Z') // 11:30 PM in New York
    const actual = new Date('2026-09-26T15:36:00Z') // 11:36 AM in New York
    render(<CalendarModule now={lateNight} source={sourceReturning({})} actualTime={actual} />)
    expect(screen.getByText('11:30')).toBeInTheDocument()
    expect(screen.getByText('PM')).toBeInTheDocument()
    expect(screen.getByText('Demo time · actual 11:36 AM')).toBeInTheDocument()
  })

  it('does not label the real clock', () => {
    render(<CalendarModule now={saturdayMorning} source={sourceReturning({})} />)
    expect(screen.queryByText(/Demo time/)).not.toBeInTheDocument()
  })
})

describe('CalendarModule agenda', () => {
  it('shows a loading state before events arrive', () => {
    render(<CalendarModule now={saturdayMorning} source={{ fetchEvents: () => new Promise(() => {}) }} />)
    expect(screen.getByText('Loading calendar…')).toBeInTheDocument()
  })

  it('lists upcoming events soonest first and hides finished ones', async () => {
    const { container } = render(<CalendarModule now={saturdayMorning} source={sourceReturning({})} />)
    await screen.findByText('Lunch with study group')
    expect(eventTitles(container)).toEqual(['Lunch with study group', 'Dinner reservation', 'Gym'])
    expect(screen.queryByText('Research group standup')).not.toBeInTheDocument()
  })

  it('groups events under Today and Tomorrow', async () => {
    render(<CalendarModule now={saturdayMorning} source={sourceReturning({})} />)
    expect(await screen.findByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Tomorrow')).toBeInTheDocument()
  })

  it('shows start times and a countdown on the next event only', async () => {
    const { container } = render(<CalendarModule now={saturdayMorning} source={sourceReturning({})} />)
    expect(await screen.findByText('12:30 PM')).toBeInTheDocument()
    expect(screen.getByText('5:00 PM')).toBeInTheDocument()
    expect(eventMeta(container)).toEqual(['Columbia University · in 1 hr 9 min'])
  })

  it('marks an event in progress with Now and its end time', async () => {
    const duringLunch = new Date('2026-09-26T16:45:00Z')
    const { container } = render(<CalendarModule now={duringLunch} source={sourceReturning({})} />)
    expect(await screen.findByText('Now')).toBeInTheDocument()
    expect(eventMeta(container)[0]).toBe('Columbia University · until 1:30 PM')
  })

  it('keeps countdowns unbreakable but leaves venue text free to wrap', async () => {
    const { container } = render(<CalendarModule now={saturdayMorning} source={sourceReturning({})} />)
    await screen.findByText('Lunch with study group')
    const timing = [...container.querySelectorAll('.calendar__event-timing')].map(
      (node) => node.textContent,
    )
    expect(timing).toEqual(['in 1 hr 9 min'])
  })

  it('omits the separator when an event has timing but no venue', async () => {
    const venueless = { ...lunch, venueName: undefined }
    const { container } = render(
      <CalendarModule now={saturdayMorning} source={sourceReturning({ events: [venueless] })} />,
    )
    await screen.findByText('Lunch with study group')
    expect(eventMeta(container)).toEqual(['in 1 hr 9 min'])
  })

  it('respects maxEvents', async () => {
    const { container } = render(
      <CalendarModule now={saturdayMorning} source={sourceReturning({})} maxEvents={1} />,
    )
    await screen.findByText('Lunch with study group')
    expect(eventTitles(container)).toEqual(['Lunch with study group'])
  })

  it('says so when nothing else is scheduled', async () => {
    render(<CalendarModule now={saturdayMorning} source={sourceReturning({ events: [standup] })} />)
    expect(await screen.findByText('Nothing else scheduled')).toBeInTheDocument()
  })
})

describe('CalendarModule data labeling and errors', () => {
  it('renders fixture events without a provenance badge', async () => {
    render(<CalendarModule now={saturdayMorning} source={sourceReturning({ provenance: 'fixture' })} />)
    await screen.findByText('Lunch with study group')
    expect(screen.queryByText('Sample data')).not.toBeInTheDocument()
  })

  it.each([
    ['not-authorized', 'Calendar not connected'],
    ['not-configured', 'Calendar not set up'],
    ['external-provider-unavailable', 'Calendar unavailable'],
    ['no-data', 'Nothing scheduled'],
  ] as const)('shows a fallback for %s', async (status, message) => {
    render(<CalendarModule now={saturdayMorning} source={sourceReturning({ status, events: [] })} />)
    expect(await screen.findByText(message)).toBeInTheDocument()
  })

  it('shows unavailable when the source throws', async () => {
    const failing: CalendarSource = { fetchEvents: () => Promise.reject(new Error('offline')) }
    render(<CalendarModule now={saturdayMorning} source={failing} />)
    expect(await screen.findByText('Calendar unavailable')).toBeInTheDocument()
  })
})

describe('CalendarModule with the demo fixture', () => {
  it('shows the 5 PM dinner as next during the 12-4 PM demo window', async () => {
    const threeTwentyOne = new Date('2026-09-26T19:21:00Z') // 3:21 PM in New York
    const { container } = render(
      <CalendarModule now={threeTwentyOne} source={createFixtureCalendarSource()} />,
    )
    await screen.findByText('Dinner reservation')
    expect(eventTitles(container)).toEqual([
      'Dinner reservation',
      'Gym',
      'Department seminar',
      'Brunch',
    ])
    expect(eventMeta(container)[0]).toBe('Soothr · in 1 hr 39 min')
    expect(screen.getByText('Monday')).toBeInTheDocument()
  })
})
