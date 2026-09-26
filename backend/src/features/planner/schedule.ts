// Deterministic leave-by and getting-ready timeline.
// Tasks keep the caller's order. A routine that does not fit is returned as a conflict;
// nothing here shortens, drops, or reorders work to force a feasible plan.

import type { TransportMode } from '../../../../shared/contracts/maps/types.ts';
import type {
  PlanAdjustment,
  PlanPressure,
  PreparationPlan,
  PreparationTask,
  ScheduledTask,
} from '../../../../shared/contracts/planner/types.ts';
import { COMFORTABLE_SLACK_MINUTES, MIN_TASK_MINUTES, RELAXED_SLACK_MINUTES } from './defaults.ts';

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
  /** Other modes for the same trip, used only to phrase a switch the user could accept. */
  alternateRoutes?: readonly AlternateRoute[];
  calendarProvenance?: 'fixture' | 'live';
  mapsProvenance?: 'fixture' | 'live';
}

const MODE_LABEL: Record<TransportMode, string> = {
  transit: 'Transit',
  driving: 'Driving',
  walking: 'Walking',
  cycling: 'Cycling',
};

function pressureFor(slackMinutes: number): PlanPressure {
  if (slackMinutes < 0) return 'conflict';
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
  eventStarted: boolean,
): string {
  if (eventStarted) return `${event.title} has already started.`;
  if (pressure === 'conflict') {
    const shortfall = -slackMinutes;
    const unit = shortfall === 1 ? 'minute' : 'minutes';
    return `${shortfall} ${unit} short of finishing before you need to leave for ${where(event)}.`;
  }
  if (pressure === 'tight' && slackMinutes === 0) {
    return `Start getting ready now — no spare time before you leave for ${where(event)}.`;
  }
  if (pressure === 'tight') {
    const unit = slackMinutes === 1 ? 'minute' : 'minutes';
    return `${slackMinutes} ${unit} to spare before you leave for ${where(event)}.`;
  }
  if (pressure === 'comfortable') return `On track to leave for ${where(event)}.`;
  return `Plenty of time before you leave for ${where(event)}.`;
}

function adjustmentsFor(
  tasks: readonly PreparationTask[],
  shortfall: number,
  bufferMinutes: number,
  travelMinutes: number,
  mode: TransportMode,
  alternates: readonly AlternateRoute[],
): PlanAdjustment[] {
  const adjustments: PlanAdjustment[] = [];
  const unfinished = tasks.filter((task) => !task.completed);
  const longest = unfinished.reduce<PreparationTask | undefined>(
    (best, task) => (!best || task.durationMinutes > best.durationMinutes ? task : best),
    undefined,
  );

  if (longest && longest.durationMinutes > MIN_TASK_MINUTES) {
    const save = Math.min(longest.durationMinutes - MIN_TASK_MINUTES, shortfall);
    const nextDuration = longest.durationMinutes - save;
    const resolves = save >= shortfall;
    adjustments.push({
      id: `shorten-${longest.id}`,
      label: resolves
        ? `Shorten ${longest.name} from ${longest.durationMinutes} to ${nextDuration} minutes.`
        : `Shorten ${longest.name} from ${longest.durationMinutes} to ${nextDuration} minutes — saves ${save}, still ${shortfall - save} short.`,
      savesMinutes: save,
      resolves,
      action: { type: 'shorten-task', taskId: longest.id, durationMinutes: nextDuration },
    });
  }

  if (bufferMinutes > 0) {
    const save = Math.min(bufferMinutes, shortfall);
    const resolves = save >= shortfall;
    adjustments.push({
      id: 'reduce-buffer',
      label: resolves
        ? `Arrive at the reservation instead of ${bufferMinutes} minutes early.`
        : `Drop the ${bufferMinutes}-minute early arrival — saves ${save}, still ${shortfall - save} short.`,
      savesMinutes: save,
      resolves,
      action: { type: 'set-buffer', arrivalBufferMinutes: bufferMinutes - save },
    });
  }

  const faster = alternates
    .filter((route) => route.mode !== mode && route.durationMinutes < travelMinutes)
    .sort((a, b) => a.durationMinutes - b.durationMinutes)[0];
  if (faster) {
    const save = travelMinutes - faster.durationMinutes;
    const resolves = save >= shortfall;
    adjustments.push({
      id: `mode-${faster.mode}`,
      label: resolves
        ? `${MODE_LABEL[faster.mode]} instead of ${MODE_LABEL[mode]} — saves ${save} minutes.`
        : `${MODE_LABEL[faster.mode]} instead of ${MODE_LABEL[mode]} — saves ${save} minutes, still ${shortfall - save} short.`,
      savesMinutes: save,
      resolves,
      action: { type: 'set-mode', mode: faster.mode },
    });
  }

  return adjustments.sort((a, b) => Number(b.resolves) - Number(a.resolves) || b.savesMinutes - a.savesMinutes);
}

export function buildPlan(input: BuildPlanInput): PreparationPlan {
  const unfinished = input.tasks.filter((task) => !task.completed);
  const neededMinutes = unfinished.reduce((sum, task) => sum + task.durationMinutes, 0);
  const leaveByMs = input.event.start.getTime() - input.arrivalBufferMinutes * MINUTE_MS - input.travelMinutes * MINUTE_MS;
  const arriveByMs = input.event.start.getTime() - input.arrivalBufferMinutes * MINUTE_MS;
  // Floor so a partial minute is not treated as time the user still has.
  const availableMinutes = Math.floor((leaveByMs - input.now.getTime()) / MINUTE_MS);
  const slackMinutes = availableMinutes - neededMinutes;
  const feasible = slackMinutes >= 0;
  const pressure = pressureFor(slackMinutes);
  const eventStarted = input.event.start.getTime() <= input.now.getTime();
  const idealStartMs = leaveByMs - neededMinutes * MINUTE_MS;
  // Feasible plans wait until the just-in-time start. Conflicts run forward from now
  // so the timeline shows the overrun instead of a schedule that pretends to fit.
  const routineStartMs = feasible ? Math.max(input.now.getTime(), idealStartMs) : input.now.getTime();

  let cursor = routineStartMs;
  const windows = new Map<string, { start: string; end: string; overruns: boolean }>();
  for (const task of unfinished) {
    const startMs = cursor;
    const endMs = cursor + task.durationMinutes * MINUTE_MS;
    cursor = endMs;
    windows.set(task.id, {
      start: new Date(startMs).toISOString(),
      end: new Date(endMs).toISOString(),
      overruns: endMs > leaveByMs,
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
      overruns: window.overruns,
    };
  });

  const shortfall = feasible ? 0 : -slackMinutes;
  const calendar = input.calendarProvenance ?? 'fixture';
  const maps = input.mapsProvenance ?? 'fixture';

  return {
    status: feasible ? 'ok' : 'schedule-conflict',
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
    feasible,
    pressure,
    summary: summaryFor(input.event, pressure, slackMinutes, eventStarted),
    conflict: feasible
      ? null
      : {
          shortfallMinutes: shortfall,
          unfinishedTaskIds: unfinished.map((task) => task.id),
          adjustments: eventStarted
            ? []
            : adjustmentsFor(
                input.tasks,
                shortfall,
                input.arrivalBufferMinutes,
                input.travelMinutes,
                input.transportMode,
                input.alternateRoutes ?? [],
              ),
        },
    provenance: { calendar, maps, isFixture: calendar === 'fixture' || maps === 'fixture' },
  };
}
