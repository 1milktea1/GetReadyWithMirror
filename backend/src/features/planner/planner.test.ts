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

test('demo scenarios: noon, 4 PM, 5:30 PM, 6 PM, and a hair conflict', async () => {
  const file = loadScenarios();
  for (const scenario of file.scenarios) {
    const { plan, leaveBy } = planFromScenario(file, scenario);
    assert.equal(plan.pressure, scenario.pressure, scenario.id);
    assert.equal(plan.feasible, scenario.feasible, scenario.id);
    assert.equal(plan.leaveBy.at, leaveBy.toISOString(), scenario.id);
    assert.equal(plan.event.start, '2026-09-26T23:00:00.000Z', scenario.id);
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

test('a feasible plan is just-in-time and ends at leave-by', async () => {
  const file = loadScenarios();
  const noon = file.scenarios.find((scenario) => scenario.id === 'noon');
  assert.ok(noon);
  const { plan } = planFromScenario(file, noon);
  assert.equal(plan.startGettingReadyAt, at('17:30').toISOString());
  assert.deepEqual(
    plan.tasks.map((task) => [task.id, task.start, task.end]),
    [
      ['shower', at('17:30').toISOString(), at('17:45').toISOString()],
      ['hair', at('17:45').toISOString(), at('18:05').toISOString()],
      ['dressed', at('18:05').toISOString(), at('18:15').toISOString()],
    ],
  );
  assert.equal(plan.slackMinutes, 330);
  assert.equal(plan.tasks.some((task) => task.overruns), false);
});

test('a 6 PM conflict keeps every task and does not move dinner', async () => {
  const result = await generatePreparationPlan({ now: at('18:00') });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.status, 'schedule-conflict');
  assert.equal(result.data.conflict?.shortfallMinutes, 30);
  assert.deepEqual(
    result.data.tasks.map((task) => task.id),
    ['shower', 'hair', 'dressed'],
  );
  assert.equal(result.data.event.start, at('19:00').toISOString());
  assert.equal(result.data.leaveBy.at, at('18:15').toISOString());
  assert.equal(result.data.tasks[0].start, at('18:00').toISOString());
  assert.equal(result.data.tasks[1].overruns, true);
  assert.equal(result.data.conflict?.adjustments.every((item) => !item.resolves), true);
  assert.equal(result.data.provenance.isFixture, true);
  assert.equal(result.data.summary, 'Late');
});

test('5:30 PM with the default routine is tight but feasible', async () => {
  const result = await generatePreparationPlan({ now: at('17:30') });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.pressure, 'tight');
  assert.equal(result.data.slackMinutes, 0);
  assert.equal(result.data.feasible, true);
  assert.equal(result.data.tasks[0].start, at('17:30').toISOString());
  assert.equal(result.data.summary, '45 minutes remaining');
});

test('twenty more minutes of hair at 5:30 PM conflicts and offers to undo it', async () => {
  const tasks = updateTaskDuration(DEFAULT_TASKS, 'hair', 40);
  assert.ok(tasks);
  assert.equal(tasks.length, DEFAULT_TASKS.length);
  assert.deepEqual(
    tasks.map((task) => task.id),
    DEFAULT_TASKS.map((task) => task.id),
  );
  const result = await generatePreparationPlan({ now: at('17:30'), tasks });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.feasible, false);
  assert.equal(result.data.conflict?.shortfallMinutes, 20);
  const shorten = result.data.conflict?.adjustments.find((item) => item.id === 'shorten-hair');
  assert.equal(shorten?.resolves, true);
  assert.deepEqual(shorten?.action, { type: 'shorten-task', taskId: 'hair', durationMinutes: 20 });
  assert.equal(result.data.event.id, 'fixture-dinner');
});

test('marking tasks done does not remove them', async () => {
  const showerDone = markTaskComplete(DEFAULT_TASKS, 'shower');
  assert.ok(showerDone);
  assert.equal(showerDone.length, 3);
  assert.equal(showerDone[0].completed, true);
  assert.equal(showerDone[0].durationMinutes, 15);
  const result = await generatePreparationPlan({ now: at('18:00'), tasks: showerDone });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.tasks[0].completed, true);
  assert.equal(result.data.tasks[0].start, null);
  assert.equal(result.data.conflict?.shortfallMinutes, 15);
});

test('task order is the caller\'s order', async () => {
  const reversed = [...DEFAULT_TASKS].reverse();
  const result = await generatePreparationPlan({ now: at('16:00'), tasks: reversed });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.data.tasks.map((task) => task.id),
    ['dressed', 'hair', 'shower'],
  );
});

test('unknown task edits are rejected and do not change the list', async () => {
  assert.equal(updateTaskDuration(DEFAULT_TASKS, 'nails', 10), null);
  assert.equal(updateTaskDuration(DEFAULT_TASKS, 'hair', 0), null);
  assert.equal(markTaskComplete(DEFAULT_TASKS, 'nails'), null);
});

test('HTTP planner: conflict is 200, bad input is 400, and the clock is honored', async () => {
  const conflict = await handlePlannerRequest(new URLSearchParams('now=2026-09-26T18:00:00-04:00'));
  assert.equal(conflict.status, 200);
  assert.equal(conflict.body.ok, true);
  if (!conflict.body.ok) return;
  assert.equal(conflict.body.data.status, 'schedule-conflict');
  assert.equal(conflict.body.data.pressure, 'conflict');

  const afternoon = await handlePlannerRequest(new URLSearchParams('now=2026-09-26T16:00:00-04:00'));
  assert.equal(afternoon.status, 200);
  if (!afternoon.body.ok) return;
  assert.equal(afternoon.body.data.pressure, 'relaxed');
  assert.equal(afternoon.body.data.leaveBy.at, at('18:15').toISOString());

  assert.equal((await handlePlannerRequest(new URLSearchParams('now=bogus'))).status, 400);
  assert.equal((await handlePlannerRequest(new URLSearchParams('buffer=-5'))).status, 400);
  assert.equal((await handlePlannerRequest(new URLSearchParams('mode=flying'))).status, 400);
  assert.equal((await handlePlannerRequest(new URLSearchParams('tasks=hair:0'))).status, 400);
  assert.equal((await handlePlannerRequest(new URLSearchParams('done=nails'))).status, 400);

  const hair = await handlePlannerRequest(new URLSearchParams('now=2026-09-26T17:30:00-04:00&tasks=shower:15,hair:40,dressed:10'));
  assert.equal(hair.status, 200);
  if (!hair.body.ok) return;
  assert.equal(hair.body.data.conflict?.shortfallMinutes, 20);
});

test('after the 7 PM dinner ends the planner uses the 12 AM Soothr dinner', async () => {
  const result = await generatePreparationPlan({ now: at('21:00') });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.event.title, 'Late dinner');
  assert.equal(result.data.event.start, '2026-09-27T04:00:00.000Z');
  assert.equal(result.data.feasible, true);
  assert.equal((await handlePlannerRequest(new URLSearchParams('now=2026-09-26T21:00:00-04:00'))).status, 200);
});

test('walking uses that mode\'s duration for leave-by', async () => {
  const result = await generatePreparationPlan({ now: at('16:00'), mode: 'walking' });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.leaveBy.transportMode, 'walking');
  assert.equal(result.data.leaveBy.travelMinutes, 105);
  assert.equal(result.data.leaveBy.at, at('17:05').toISOString());
});

test('rideshare leave-by uses the driving duration', async () => {
  const result = await generatePreparationPlan({ now: at('16:00'), mode: 'rideshare' });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.leaveBy.travelMinutes, 30);
  assert.equal(result.data.leaveBy.at, at('18:20').toISOString());
});

test('leave-by uses a live Google duration for the selected mode', async () => {
  const previous = process.env.GOOGLE_MAPS_API_KEY;
  process.env.GOOGLE_MAPS_API_KEY = 'test-key';
  try {
    const result = await generatePreparationPlan({
      now: at('16:00'),
      live: true,
      fetchFn: async (input) => {
        const mode = new URL(String(input)).searchParams.get('mode');
        const minutes = mode === 'transit' ? 22 : 18;
        return Response.json({
          status: 'OK',
          routes: [
            {
              overview_polyline: { points: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' },
              warnings: [],
              legs: [{ duration: { value: minutes * 60 } }],
            },
          ],
        });
      },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.data.leaveBy.transportMode, 'transit');
    assert.equal(result.data.leaveBy.travelMinutes, 22);
    assert.equal(result.data.leaveBy.at, at('18:28').toISOString());
    assert.equal(result.data.provenance.maps, 'google');
    assert.equal(result.data.provenance.isFixture, false);
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_MAPS_API_KEY;
    else process.env.GOOGLE_MAPS_API_KEY = previous;
  }
});

test('leave-by uses a live subway itinerary instead of the 35 minute fixture', async () => {
  const previous = process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.GOOGLE_MAPS_API_KEY;
  try {
    const result = await generatePreparationPlan({
      now: at('16:00'),
      live: true,
      fetchFn: async (input) => {
        const url = String(input);
        if (url.includes('transitous')) {
          return Response.json({
            itineraries: [
              {
                duration: 54 * 60,
                legs: [
                  { mode: 'SUBWAY', routeShortName: '1', legGeometry: { points: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' } },
                ],
              },
            ],
          });
        }
        return Response.json({
          trip: {
            status: 0,
            summary: { time: 19 * 60 },
            legs: [{ shape: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' }],
          },
        });
      },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.data.leaveBy.transportMode, 'transit');
    assert.equal(result.data.leaveBy.travelMinutes, 54);
    assert.equal(result.data.leaveBy.at, at('17:56').toISOString());
    assert.equal(result.data.provenance.maps, 'transitous');
    assert.equal(result.data.provenance.isFixture, false);
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_MAPS_API_KEY;
    else process.env.GOOGLE_MAPS_API_KEY = previous;
  }
});
