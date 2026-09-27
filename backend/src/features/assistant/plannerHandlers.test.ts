import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  currentPlannerTasks,
  handleGeneratePreparationPlan,
  handleMarkTaskComplete,
  handleUpdateTaskDuration,
  resetPlannerSession,
} from './plannerHandlers.ts';

const FOUR_PM = new Date('2026-09-26T20:00:00.000Z');

afterEach(() => {
  resetPlannerSession();
});

test('the voice planner builds a leave-by from the named shower / hair / dressed routine', async () => {
  const result = (await handleGeneratePreparationPlan(
    {
      tasks: [
        { name: 'shower', durationMinutes: 15 },
        { name: 'do my hair', durationMinutes: 20 },
        { name: 'get dressed', durationMinutes: 10 },
      ],
    },
    { now: FOUR_PM },
  )) as { ok: boolean; data: { leaveBy: string; tasks: { id: string; end: string }[]; feasible: boolean } };
  assert.equal(result.ok, true);
  assert.equal(result.data.feasible, true);
  assert.equal(result.data.tasks.map((task) => task.id).join(','), 'shower,hair,dressed');
  assert.equal(result.data.tasks.at(-1)?.end, result.data.leaveBy);
  assert.deepEqual(
    currentPlannerTasks().map((task) => task.id),
    ['shower', 'hair', 'dressed'],
  );
});

test('a follow-up duration change keeps the other tasks and rebuilds the plan', async () => {
  await handleGeneratePreparationPlan(
    {
      tasks: [
        { name: 'Shower', durationMinutes: 15 },
        { name: 'Hair', durationMinutes: 20 },
        { name: 'Get dressed', durationMinutes: 10 },
      ],
    },
    { now: FOUR_PM },
  );
  const result = (await handleUpdateTaskDuration({ taskName: 'hair', durationMinutes: 40 }, { now: FOUR_PM })) as {
    ok: boolean;
    data: { tasks: { id: string; durationMinutes: number }[] };
  };
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.data.tasks.map((task) => `${task.id}:${task.durationMinutes}`),
    ['shower:15', 'hair:40', 'dressed:10'],
  );
});

test('an unknown follow-up task is rejected and does not invent a routine', async () => {
  const result = (await handleMarkTaskComplete({ taskName: 'nails' }, { now: FOUR_PM })) as {
    ok: boolean;
    error: { status: string };
  };
  assert.equal(result.ok, false);
  assert.equal(result.error.status, 'input-invalid');
});
