// Planner input/output. Status: proposed for the offline demo, not yet agreed (decisions D2).
// Scheduling arithmetic is deterministic; these types carry the result, they do not compute it.
// `schedule-conflict` is a successful answer (ok: true), not an error envelope.

import type { RouteSource, TransportMode } from '../maps/types.ts';

export interface PreparationTask {
  id: string;
  name: string;
  durationMinutes: number;
  /** Done tasks stay on the plan and consume no time. */
  completed?: boolean;
}

export type PlanPressure = 'relaxed' | 'comfortable' | 'tight' | 'conflict';

export type PlanStatus = 'ok' | 'schedule-conflict';

export interface LeaveBy {
  /** ISO 8601 instant the user must depart. */
  at: string;
  travelMinutes: number;
  transportMode: TransportMode;
  arrivalBufferMinutes: number;
  /** ISO 8601 instant to arrive (event start minus the buffer). */
  arriveBy: string;
}

export interface ScheduledTask {
  id: string;
  name: string;
  durationMinutes: number;
  completed: boolean;
  /** Null when the task is already done. */
  start: string | null;
  end: string | null;
  /** True when the task would finish after leave-by. */
  overruns: boolean;
}

export type PlanAdjustmentAction =
  | { type: 'shorten-task'; taskId: string; durationMinutes: number }
  | { type: 'set-buffer'; arrivalBufferMinutes: number }
  | { type: 'set-mode'; mode: TransportMode };

/** A change the user may accept. The planner never applies these on its own. */
export interface PlanAdjustment {
  id: string;
  label: string;
  savesMinutes: number;
  /** True when this change alone makes the routine fit. */
  resolves: boolean;
  action: PlanAdjustmentAction;
}

export interface ScheduleConflict {
  /** Positive minutes by which unfinished tasks overrun leave-by. */
  shortfallMinutes: number;
  unfinishedTaskIds: string[];
  adjustments: PlanAdjustment[];
}

export interface PlanEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  venueName?: string;
  venueAddress?: string;
}

export interface PreparationPlan {
  status: PlanStatus;
  timeZone: string;
  /** ISO instant the plan was computed for (demo override or real now). */
  now: string;
  event: PlanEvent;
  leaveBy: LeaveBy;
  /** Ideal first-task start so the routine ends at leave-by. May be in the past. */
  startGettingReadyAt: string;
  tasks: ScheduledTask[];
  /** Free minutes before the routine. Negative when the routine does not fit. */
  slackMinutes: number;
  feasible: boolean;
  pressure: PlanPressure;
  /** One sentence the UI can show without re-deriving the schedule. */
  summary: string;
  conflict: ScheduleConflict | null;
  /** `isFixture` is true when the travel duration used for leave-by is a rehearsal number. */
  provenance: { calendar: 'fixture' | 'live'; maps: RouteSource; isFixture: boolean };
}

export type PlannerErrorStatus = 'input-invalid' | 'no-data';

export interface PlannerError {
  status: PlannerErrorStatus;
  message: string;
}

export type PlannerResponse = { ok: true; data: PreparationPlan } | { ok: false; error: PlannerError };
