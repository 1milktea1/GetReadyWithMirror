import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { zonedTimeToUtc, type WallClockTime } from '../../shared/utils/zonedTime.ts';
import { DEFAULT_TASKS } from './defaults.ts';
import { handlePlannerRequest } from './plannerHttp.ts';
import { generatePreparationPlan } from './plannerService.ts';
import { buildPlan, type BuildPlanInput } from './schedule.ts';
import { markTaskComplete, updateTaskDuration } from './tasks.ts';

const TZ = 'America/New_York';
const DAY = { year: 2026, month: 9, day: 26 };

function at(time: string): Date {
  const [hour, minute] = time.split(':').map(Number);
  return zonedTimeToUtc({ ...DAY, hour, minute }, TZ);
}

interface ScenarioFile {
  timeZone: string;
  date: string;
  event: {
    id: string;
    title: string;
    startTime: string;
    durationMinutes: number;
    venueName: string;
    venueAddress: string;
  };
  assumptions: {
    transportMode: 'transit';
    travelMinutes: number;
    arrivalBufferMinutes: number;
    leaveByTime: string;
    tasks: { id: string; name: string; durationMinutes: number }[];
  };
  scenarios: {
    id: string;
    nowTime: string;
    taskOverrides?: Record<string, number>;
    pressure: string;
    feasible: boolean;
    shortfallMinutes?: number;
    resolvingAdjustment?: string;
  }[];
}

function loadScenarios(): ScenarioFile {
  const path = fileURLToPath(new URL('../../../../fixtures/planner/demo-scenarios.json', import.meta.url));
  return JSON.parse(readFileSync(path, 'utf8')) as ScenarioFile;
}

function planFromScenario(file: ScenarioFile, scenario: ScenarioFile['scenarios'][number]) {
  const [year, month, day] = file.date.split('-').map(Number);
  const wall = (time: string): WallClockTime => {
    const [hour, minute] = time.split(':').map(Number);
    return { year, month, day, hour, minute };
  };
  const start = zonedTimeToUtc(wall(file.event.startTime), file.timeZone);
  const tasks = file.assumptions.tasks.map((task) => ({
    ...task,
    durationMinutes: scenario.taskOverrides?.[task.id] ?? task.durationMinutes,
  }));
  const input: BuildPlanInput = {
    now: zonedTimeToUtc(wall(scenario.nowTime), file.timeZone),
    timeZone: file.timeZone,
    event: {
      id: file.event.id,
      title: file.event.title,
      start,
      end: new Date(start.getTime() + file.event.durationMinutes * 60_000),
      venueName: file.event.venueName,
      venueAddress: file.event.venueAddress,
    },
    travelMinutes: file.assumptions.travelMinutes,
    transportMode: file.assumptions.transportMode,
    arrivalBufferMinutes: file.assumptions.arrivalBufferMinutes,
    tasks,
    alternateRoutes: [
      { mode: 'transit', durationMinutes: 35 },
      { mode: 'cycling', durationMinutes: 28 },
      { mode: 'driving', durationMinutes: 30 },
      { mode: 'walking', durationMinutes: 105 },
    ],
  };
  return { plan: buildPlan(input), leaveBy: zonedTimeToUtc(wall(file.assumptions.leaveByTime), file.timeZone) };
}

test('demo scenarios: noon, 2 PM, 3:30 PM, 4 PM, and a hair conflict', () => {
  const file = loadScenarios();
  for (const scenario of file.scenarios) {
    const { plan, leaveBy } = planFromScenario(file, scenario);
    assert.equal(plan.pressure, scenario.pressure, scenario.id);
    assert.equal(plan.feasible, scenario.feasible, scenario.id);
    assert.equal(plan.leaveBy.at, leaveBy.toISOString(), scenario.id);
    assert.equal(plan.event.start, '2026-09-26T21:00:00.000Z', scenario.id);
    assert.equal(plan.tasks.length, file.assumptions.tasks.length, scenario.id);
    if (scenario.shortfallMinutes !== undefined) {
      assert.equal(plan.conflict?.shortfallMinutes, scenario.shortfallMinutes, scenario.id);
    } else {
      assert.equal(plan.conflict, null, scenario.id);
    }
    if (scenario.resolvingAdjustment) {
      assert.equal(
        plan.conflict?.adjustments.some((item) => item.id === scenario.resolvingAdjustment && item.resolves),
        true,
        scenario.id,
      );
    }
  }
});

test('a feasible plan is just-in-time and ends at leave-by', () => {
  const file = loadScenarios();
  const noon = file.scenarios.find((scenario) => scenario.id === 'noon');
  assert.ok(noon);
  const { plan } = planFromScenario(file, noon);
  assert.equal(plan.startGettingReadyAt, at('15:30').toISOString());
  assert.deepEqual(
    plan.tasks.map((task) => [task.id, task.start, task.end]),
    [
      ['shower', at('15:30').toISOString(), at('15:45').toISOString()],
      ['hair', at('15:45').toISOString(), at('16:05').toISOString()],
      ['dressed', at('16:05').toISOString(), at('16:15').toISOString()],
    ],
  );
  assert.equal(plan.slackMinutes, 210);
  assert.equal(plan.tasks.some((task) => task.overruns), false);
});

test('a 4 PM conflict keeps every task and does not move dinner', () => {
  const result = generatePreparationPlan({ now: at('16:00') });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.status, 'schedule-conflict');
  assert.equal(result.data.conflict?.shortfallMinutes, 30);
  assert.deepEqual(
    result.data.tasks.map((task) => task.id),
    ['shower', 'hair', 'dressed'],
  );
  assert.equal(result.data.event.start, at('17:00').toISOString());
  assert.equal(result.data.leaveBy.at, at('16:15').toISOString());
  assert.equal(result.data.tasks[0].start, at('16:00').toISOString());
  assert.equal(result.data.tasks[1].overruns, true);
  assert.equal(result.data.conflict?.adjustments.every((item) => !item.resolves), true);
  assert.equal(result.data.provenance.isFixture, true);
});

test('3:30 PM with the default routine is tight but feasible', () => {
  const result = generatePreparationPlan({ now: at('15:30') });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.pressure, 'tight');
  assert.equal(result.data.slackMinutes, 0);
  assert.equal(result.data.feasible, true);
  assert.equal(result.data.tasks[0].start, at('15:30').toISOString());
});

test('twenty more minutes of hair at 3:30 PM conflicts and offers to undo it', () => {
  const tasks = updateTaskDuration(DEFAULT_TASKS, 'hair', 40);
  assert.ok(tasks);
  assert.equal(tasks.length, DEFAULT_TASKS.length);
  assert.deepEqual(
    tasks.map((task) => task.id),
    DEFAULT_TASKS.map((task) => task.id),
  );
  const result = generatePreparationPlan({ now: at('15:30'), tasks });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.feasible, false);
  assert.equal(result.data.conflict?.shortfallMinutes, 20);
  const shorten = result.data.conflict?.adjustments.find((item) => item.id === 'shorten-hair');
  assert.equal(shorten?.resolves, true);
  assert.deepEqual(shorten?.action, { type: 'shorten-task', taskId: 'hair', durationMinutes: 20 });
  assert.equal(result.data.event.id, 'fixture-dinner');
});

test('marking tasks done does not remove them', () => {
  const showerDone = markTaskComplete(DEFAULT_TASKS, 'shower');
  assert.ok(showerDone);
  assert.equal(showerDone.length, 3);
  assert.equal(showerDone[0].completed, true);
  assert.equal(showerDone[0].durationMinutes, 15);
  const result = generatePreparationPlan({ now: at('16:00'), tasks: showerDone });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.tasks[0].completed, true);
  assert.equal(result.data.tasks[0].start, null);
  assert.equal(result.data.conflict?.shortfallMinutes, 15);
});

test('task order is the caller\'s order', () => {
  const reversed = [...DEFAULT_TASKS].reverse();
  const result = generatePreparationPlan({ now: at('12:00'), tasks: reversed });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.data.tasks.map((task) => task.id),
    ['dressed', 'hair', 'shower'],
  );
});

test('unknown task edits are rejected and do not change the list', () => {
  assert.equal(updateTaskDuration(DEFAULT_TASKS, 'nails', 10), null);
  assert.equal(updateTaskDuration(DEFAULT_TASKS, 'hair', 0), null);
  assert.equal(markTaskComplete(DEFAULT_TASKS, 'nails'), null);
});

test('HTTP planner: conflict is 200, bad input is 400, and the clock is honored', () => {
  const conflict = handlePlannerRequest(new URLSearchParams('now=2026-09-26T16:00:00-04:00'));
  assert.equal(conflict.status, 200);
  assert.equal(conflict.body.ok, true);
  if (!conflict.body.ok) return;
  assert.equal(conflict.body.data.status, 'schedule-conflict');
  assert.equal(conflict.body.data.pressure, 'conflict');

  const noon = handlePlannerRequest(new URLSearchParams('now=2026-09-26T12:00:00-04:00'));
  assert.equal(noon.status, 200);
  if (!noon.body.ok) return;
  assert.equal(noon.body.data.pressure, 'relaxed');
  assert.equal(noon.body.data.leaveBy.at, at('16:15').toISOString());

  assert.equal(handlePlannerRequest(new URLSearchParams('now=bogus')).status, 400);
  assert.equal(handlePlannerRequest(new URLSearchParams('buffer=-5')).status, 400);
  assert.equal(handlePlannerRequest(new URLSearchParams('mode=flying')).status, 400);
  assert.equal(handlePlannerRequest(new URLSearchParams('tasks=hair:0')).status, 400);
  assert.equal(handlePlannerRequest(new URLSearchParams('done=nails')).status, 400);

  const hair = handlePlannerRequest(new URLSearchParams('now=2026-09-26T15:30:00-04:00&tasks=shower:15,hair:40,dressed:10'));
  assert.equal(hair.status, 200);
  if (!hair.body.ok) return;
  assert.equal(hair.body.data.conflict?.shortfallMinutes, 20);
});

test('after dinner has ended the planner reports no-data instead of inventing an event', () => {
  const result = generatePreparationPlan({ now: at('19:00') });
  assert.deepEqual(result.ok ? null : result.error, {
    status: 'no-data',
    message: 'No upcoming event with an address to travel to.',
  });
  assert.equal(handlePlannerRequest(new URLSearchParams('now=2026-09-26T19:00:00-04:00')).status, 404);
});
