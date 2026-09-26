// Deterministic leave-by and getting-ready timeline.
// Tasks keep the caller's order. The last unfinished task always ends at leave-by,
// even when the ideal start is already in the past. The planner does not drop or
// reorder work, and it does not move the reservation.

import type { RouteSource, TransportMode } from '../../../../shared/contracts/maps/types.ts';
import type {
  PlanPressure,
  PreparationPlan,
  PreparationTask,
  ScheduledTask,
} from '../../../../shared/contracts/planner/types.ts';
import { COMFORTABLE_SLACK_MINUTES, RELAXED_SLACK_MINUTES } from './defaults.ts';

const MINUTE_MS = 60_000;

export interface PlanEventInput {
  id: string;
  title: string;
  start: Date;
  end: Date;
  venueName?: string;
  venueAddress?: string;
}

export interface AlternateRoute {
  mode: TransportMode;
  durationMinutes: number;
}

export interface BuildPlanInput {
  now: Date;
  timeZone: string;
  event: PlanEventInput;
  travelMinutes: number;
  transportMode: TransportMode;
  arrivalBufferMinutes: number;
  tasks: readonly PreparationTask[];
  /** Other modes for the same trip. Kept for callers; the schedule does not switch modes. */
  alternateRoutes?: readonly AlternateRoute[];
  calendarProvenance?: 'fixture' | 'live';
  mapsProvenance?: RouteSource;
}

function pressureFor(slackMinutes: number): PlanPressure {
  if (slackMinutes < COMFORTABLE_SLACK_MINUTES) return 'tight';
  if (slackMinutes < RELAXED_SLACK_MINUTES) return 'comfortable';
  return 'relaxed';
}

function where(event: PlanEventInput): string {
  return event.venueName ?? 'your event';
}

function summaryFor(
  event: PlanEventInput,
  pressure: PlanPressure,
  slackMinutes: number,
  availableMinutes: number,
  eventStarted: boolean,
): string {
  if (eventStarted) return `${event.title} has already started.`;
  if (availableMinutes < 0) return `Leave now for ${where(event)}.`;
  if (pressure === 'tight' && slackMinutes <= 0) {
    return `Start getting ready now — the routine ends when you leave for ${where(event)}.`;
  }
  if (pressure === 'tight') {
    const unit = slackMinutes === 1 ? 'minute' : 'minutes';
    return `${slackMinutes} ${unit} to spare before you leave for ${where(event)}.`;
  }
  if (pressure === 'comfortable') return `On track to leave for ${where(event)}.`;
  return `Plenty of time before you leave for ${where(event)}.`;
}

export function buildPlan(input: BuildPlanInput): PreparationPlan {
  const unfinished = input.tasks.filter((task) => !task.completed);
  const neededMinutes = unfinished.reduce((sum, task) => sum + task.durationMinutes, 0);
  const leaveByMs = input.event.start.getTime() - input.arrivalBufferMinutes * MINUTE_MS - input.travelMinutes * MINUTE_MS;
  const arriveByMs = input.event.start.getTime() - input.arrivalBufferMinutes * MINUTE_MS;
  // Floor so a partial minute is not treated as time the user still has.
  const availableMinutes = Math.floor((leaveByMs - input.now.getTime()) / MINUTE_MS);
  const slackMinutes = availableMinutes - neededMinutes;
  const eventStarted = input.event.start.getTime() <= input.now.getTime();
  const idealStartMs = leaveByMs - neededMinutes * MINUTE_MS;
  // Always pack just-in-time so the last unfinished task ends at leave-by.
  const routineStartMs = idealStartMs;

  let cursor = routineStartMs;
  const windows = new Map<string, { start: string; end: string }>();
  for (const task of unfinished) {
    const startMs = cursor;
    const endMs = cursor + task.durationMinutes * MINUTE_MS;
    cursor = endMs;
    windows.set(task.id, {
      start: new Date(startMs).toISOString(),
      end: new Date(endMs).toISOString(),
    });
  }

  const tasks: ScheduledTask[] = input.tasks.map((task) => {
    if (task.completed) {
      return {
        id: task.id,
        name: task.name,
        durationMinutes: task.durationMinutes,
        completed: true,
        start: null,
        end: null,
        overruns: false,
      };
    }
    const window = windows.get(task.id)!;
    return {
      id: task.id,
      name: task.name,
      durationMinutes: task.durationMinutes,
      completed: false,
      start: window.start,
      end: window.end,
      overruns: false,
    };
  });

  const calendar = input.calendarProvenance ?? 'fixture';
  const maps = input.mapsProvenance ?? 'fixture';
  const pressure = pressureFor(Math.max(slackMinutes, 0));

  return {
    status: 'ok',
    timeZone: input.timeZone,
    now: input.now.toISOString(),
    event: {
      id: input.event.id,
      title: input.event.title,
      start: input.event.start.toISOString(),
      end: input.event.end.toISOString(),
      venueName: input.event.venueName,
      venueAddress: input.event.venueAddress,
    },
    leaveBy: {
      at: new Date(leaveByMs).toISOString(),
      travelMinutes: input.travelMinutes,
      transportMode: input.transportMode,
      arrivalBufferMinutes: input.arrivalBufferMinutes,
      arriveBy: new Date(arriveByMs).toISOString(),
    },
    startGettingReadyAt: new Date(idealStartMs).toISOString(),
    tasks,
    slackMinutes,
    feasible: true,
    pressure,
    summary: summaryFor(input.event, pressure, slackMinutes, availableMinutes, eventStarted),
    conflict: null,
    provenance: { calendar, maps, isFixture: maps === 'fixture' },
  };
}
