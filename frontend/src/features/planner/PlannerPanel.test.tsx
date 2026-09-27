import type { PreparationPlan } from '@contracts/planner/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlannerPanel } from './PlannerPanel';

const leaveBy = '2026-09-26T20:15:00.000Z'; // 4:15 PM New York

function plan(overrides: Partial<PreparationPlan> = {}): PreparationPlan {
  return {
    status: 'ok',
    timeZone: 'America/New_York',
    now: '2026-09-26T16:00:00.000Z',
    event: {
      id: 'fixture-dinner',
      title: 'Dinner reservation',
      start: '2026-09-26T21:00:00.000Z',
      end: '2026-09-26T22:30:00.000Z',
      venueName: 'Soothr',
      venueAddress: '204 E 13th St, New York, NY 10003',
    },
    leaveBy: {
      at: leaveBy,
      travelMinutes: 35,
      transportMode: 'transit',
      arrivalBufferMinutes: 10,
      arriveBy: '2026-09-26T20:50:00.000Z',
    },
    startGettingReadyAt: '2026-09-26T19:30:00.000Z',
    tasks: [
      {
        id: 'shower',
        name: 'Shower',
        durationMinutes: 15,
        completed: false,
        start: '2026-09-26T19:30:00.000Z',
        end: '2026-09-26T19:45:00.000Z',
        overruns: false,
      },
      {
        id: 'hair',
        name: 'Hair',
        durationMinutes: 20,
        completed: false,
        start: '2026-09-26T19:45:00.000Z',
        end: '2026-09-26T20:05:00.000Z',
        overruns: false,
      },
      {
        id: 'dressed',
        name: 'Get dressed',
        durationMinutes: 10,
        completed: false,
        start: '2026-09-26T20:05:00.000Z',
        end: '2026-09-26T20:15:00.000Z',
        overruns: false,
      },
    ],
    slackMinutes: 210,
    feasible: true,
    pressure: 'relaxed',
    summary: 'Plenty of time before you leave for Soothr.',
    conflict: null,
    provenance: { calendar: 'fixture', maps: 'fixture', isFixture: true },
    ...overrides,
  };
}

function mockPlan(body: PreparationPlan) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ json: async () => ({ ok: true, data: body }) })),
  );
}

describe('PlannerPanel', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows leave-by time with remaining minutes and the getting-ready timeline', async () => {
    mockPlan(plan());
    render(<PlannerPanel expanded={false} onToggle={() => {}} now="2026-09-26T16:00:00.000Z" />);
    expect(await screen.findByText('Leave by 4:15 PM')).toBeInTheDocument();
    expect(screen.getByText('4 hours 15 minutes remaining for Dinner reservation · Soothr')).toBeInTheDocument();
    expect(screen.queryByText(/Subway · 35 min/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Leave by reminder')).not.toBeInTheDocument();
    expect(screen.getByText('Shower')).toBeInTheDocument();
    expect(screen.getByText('Hair')).toBeInTheDocument();
    expect(screen.getByText('Get dressed')).toBeInTheDocument();
    expect(screen.queryByText('Plenty of time before you leave for Soothr.')).not.toBeInTheDocument();
    expect(screen.getByText('3:30 PM – 3:45 PM')).toBeInTheDocument();
    expect(screen.getByText('Sample route — not live')).toBeInTheDocument();
  });

  it('shows a conflict without dropping tasks', async () => {
    mockPlan(
      plan({
        status: 'schedule-conflict',
        feasible: false,
        pressure: 'conflict',
        slackMinutes: -30,
        summary: '30 minutes short of finishing before you need to leave for Soothr.',
        conflict: {
          shortfallMinutes: 30,
          unfinishedTaskIds: ['shower', 'hair', 'dressed'],
          adjustments: [
            {
              id: 'shorten-hair',
              label: 'Shorten Hair from 20 to 5 minutes — saves 15, still 15 short.',
              savesMinutes: 15,
              resolves: false,
              action: { type: 'shorten-task', taskId: 'hair', durationMinutes: 5 },
            },
          ],
        },
      }),
    );
    render(<PlannerPanel expanded onToggle={() => {}} />);
    expect(await screen.findByText('Leave by 4:15 PM')).toBeInTheDocument();
    expect(screen.getByText('Late')).toBeInTheDocument();
    expect(screen.queryByText('30 minutes short of finishing before you need to leave for Soothr.')).not.toBeInTheDocument();
    expect(screen.queryByText(/conflict/i)).not.toBeInTheDocument();
    expect(screen.getByText('Shower')).toBeInTheDocument();
    expect(screen.getByText('Shorten Hair from 20 to 5 minutes — saves 15, still 15 short.')).toBeInTheDocument();
    expect(screen.getByText('Sample route — not live')).toBeInTheDocument();
  });

  it('asks the backend for 20 more minutes of hair instead of editing the schedule locally', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => ({
      json: async () => ({ ok: true, data: plan() }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    render(<PlannerPanel expanded onToggle={() => {}} now="2026-09-26T19:30:00.000Z" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Give hair 20 more minutes' }));
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes('tasks=shower%3A15%2Chair%3A40%2Cdressed%3A10') || url.includes('tasks=shower:15,hair:40,dressed:10'))).toBe(true);
  });

  it('says On time when leave-by is now, and counts minutes left before that', async () => {
    mockPlan(plan({ now: leaveBy }));
    const { rerender } = render(<PlannerPanel expanded={false} onToggle={() => {}} now={leaveBy} />);
    expect(await screen.findByText('Leave by 4:15 PM')).toBeInTheDocument();
    expect(screen.getByText('On time')).toBeInTheDocument();
    mockPlan(
      plan({
        now: '2026-09-26T20:05:00.000Z',
        leaveBy: {
          at: leaveBy,
          travelMinutes: 35,
          transportMode: 'transit',
          arrivalBufferMinutes: 10,
          arriveBy: '2026-09-26T20:50:00.000Z',
        },
      }),
    );
    rerender(<PlannerPanel expanded={false} onToggle={() => {}} now="2026-09-26T20:05:00.000Z" />);
    expect(await screen.findByText('10 minutes remaining for Dinner reservation · Soothr')).toBeInTheDocument();
  });

  it('asks the planner for the selected transportation mode', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => ({
      json: async () => ({
        ok: true,
        data: plan({
          leaveBy: {
            at: '2026-09-26T19:05:00.000Z',
            travelMinutes: 105,
            transportMode: 'walking',
            arrivalBufferMinutes: 10,
            arriveBy: '2026-09-26T20:50:00.000Z',
          },
        }),
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    render(<PlannerPanel expanded={false} onToggle={() => {}} now="2026-09-26T16:00:00.000Z" mode="walking" />);
    expect(await screen.findByText('Leave by 3:05 PM')).toBeInTheDocument();
    expect(screen.getByText('3 hours 5 minutes remaining for Dinner reservation · Soothr')).toBeInTheDocument();
    expect(screen.queryByText(/Walk · 105 min/)).not.toBeInTheDocument();
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes('mode=walking'))).toBe(true);
  });
});
