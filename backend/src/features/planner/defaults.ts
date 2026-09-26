// Demo defaults for the three open questions in docs/demo-scenario.md.
// They are rehearsal choices, not a team decision: transit because the demo user is
// at Columbia without assuming a car, 10 minutes so they walk in a little early,
// and a 45-minute routine so 3:30 PM is tight and 4:00 PM does not fit.

import type { PreparationTask } from '../../../../shared/contracts/planner/types.ts';
import type { TransportMode } from '../../../../shared/contracts/maps/types.ts';

export const DEFAULT_TRANSPORT_MODE = 'transit' satisfies TransportMode;

export const DEFAULT_ARRIVAL_BUFFER_MINUTES = 10;

export const DEFAULT_TASKS: readonly PreparationTask[] = [
  { id: 'shower', name: 'Shower', durationMinutes: 15 },
  { id: 'hair', name: 'Hair', durationMinutes: 20 },
  { id: 'dressed', name: 'Get dressed', durationMinutes: 10 },
];

export const TASK_NAMES: Record<string, string> = {
  shower: 'Shower',
  hair: 'Hair',
  dressed: 'Get dressed',
};

/** Spare minutes at or above this are comfortable; below it the routine is tight. */
export const COMFORTABLE_SLACK_MINUTES = 30;

/** Spare minutes at or above this are a relaxed plan. */
export const RELAXED_SLACK_MINUTES = 120;

/** A suggestion may shrink a task down to this, and no further — that would drop it. */
export const MIN_TASK_MINUTES = 5;

export const MAX_TASK_MINUTES = 240;
