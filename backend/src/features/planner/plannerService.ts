// Planner public service. Composes the calendar and maps public results, then runs
// the deterministic schedule. This feature makes no external requests of its own.

import { getNextTravelEvent, travelDestinationLabel } from '../calendar/fixtureCalendar.ts';
import { getCommute } from '../maps/mapsService.ts';
import type { TransportMode } from '../../../../shared/contracts/maps/types.ts';
import type { PlannerResponse, PreparationTask } from '../../../../shared/contracts/planner/types.ts';
import { DEFAULT_ARRIVAL_BUFFER_MINUTES, DEFAULT_TASKS, DEFAULT_TRANSPORT_MODE } from './defaults.ts';
import { buildPlan } from './schedule.ts';

export interface GeneratePlanOptions {
  /** Demo/test-time override. Defaults to the real clock. */
  now?: Date;
  mode?: TransportMode;
  arrivalBufferMinutes?: number;
  /** Replaces the default shower / hair / dressed list when provided. */
  tasks?: readonly PreparationTask[];
  /** Forwarded to maps. Tests set this so a fake router can supply the duration. */
  live?: boolean;
  fetchFn?: typeof fetch;
}

export async function generatePreparationPlan(options: GeneratePlanOptions = {}): Promise<PlannerResponse> {
  const now = options.now ?? new Date();
  const mode = options.mode ?? DEFAULT_TRANSPORT_MODE;
  const buffer = options.arrivalBufferMinutes ?? DEFAULT_ARRIVAL_BUFFER_MINUTES;
  const tasks = (options.tasks ?? DEFAULT_TASKS).map((task) => ({ ...task }));

  const invalid = validate(buffer, tasks);
  if (invalid) return { ok: false, error: { status: 'input-invalid', message: invalid } };

  const calendar = getNextTravelEvent(now);
  if (!calendar.ok) return { ok: false, error: calendar.error };
  if (!calendar.event.venueAddress) {
    return { ok: false, error: { status: 'no-data', message: 'The next event has no address to route to.' } };
  }

  const maps = await getCommute({
    destinationAddress: calendar.event.venueAddress,
    destinationName: travelDestinationLabel(calendar.event),
    now,
    live: options.live,
    fetchFn: options.fetchFn,
  });
  if (!maps.ok) {
    const status = maps.error.status === 'input-invalid' ? 'input-invalid' : 'no-data';
    return { ok: false, error: { status, message: maps.error.message } };
  }

  const route = maps.data.routes.find((item) => item.mode === mode);
  if (!route) {
    return { ok: false, error: { status: 'no-data', message: `No ${mode} duration is available for this trip.` } };
  }

  return {
    ok: true,
    data: buildPlan({
      now,
      timeZone: calendar.timeZone,
      event: {
        id: calendar.event.id,
        title: calendar.event.title,
        start: new Date(calendar.event.start),
        end: new Date(calendar.event.end),
        venueName: calendar.event.venueName,
        venueAddress: calendar.event.venueAddress,
      },
      travelMinutes: route.durationMinutes,
      transportMode: mode,
      arrivalBufferMinutes: buffer,
      tasks,
      alternateRoutes: maps.data.routes,
      calendarProvenance: calendar.provenance,
      mapsProvenance: route.provenance.source,
    }),
  };
}

function validate(buffer: number, tasks: readonly PreparationTask[]): string | undefined {
  if (!Number.isInteger(buffer) || buffer < 0 || buffer > 180) {
    return 'Arrival buffer must be a whole number of minutes from 0 to 180.';
  }
  if (tasks.length === 0) return 'At least one preparation task is required.';
  const seen = new Set<string>();
  for (const task of tasks) {
    if (!task.id || !task.name) return 'Every task needs an id and a name.';
    if (seen.has(task.id)) return `Task ${task.id} is listed twice.`;
    seen.add(task.id);
    if (!Number.isInteger(task.durationMinutes) || task.durationMinutes < 1 || task.durationMinutes > 240) {
      return `Task ${task.id} must be between 1 and 240 minutes.`;
    }
  }
  return undefined;
}
