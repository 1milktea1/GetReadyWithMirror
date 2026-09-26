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

test('demo scenarios: noon, 4 PM, 5:30 PM, 6 PM, and extra hair still end at leave-by', async () => {
  const file = loadScenarios();
  for (const scenario of file.scenarios) {
    const { plan, leaveBy } = planFromScenario(file, scenario);
    assert.equal(plan.pressure, scenario.pressure, scenario.id);
    assert.equal(plan.feasible, scenario.feasible, scenario.id);
    assert.equal(plan.status, 'ok', scenario.id);
    assert.equal(plan.conflict, null, scenario.id);
    assert.equal(plan.leaveBy.at, leaveBy.toISOString(), scenario.id);
    assert.equal(plan.event.start, '2026-09-26T23:00:00.000Z', scenario.id);
    assert.equal(plan.tasks.length, file.assumptions.tasks.length, scenario.id);
    const last = plan.tasks.at(-1);
    assert.equal(last?.end, leaveBy.toISOString(), scenario.id);
    assert.equal(plan.tasks.some((task) => task.overruns), false, scenario.id);
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

test('a 6 PM plan still ends at leave-by and does not move dinner', async () => {
  const result = await generatePreparationPlan({ now: at('18:00') });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.status, 'ok');
  assert.equal(result.data.feasible, true);
  assert.equal(result.data.conflict, null);
  assert.deepEqual(
    result.data.tasks.map((task) => task.id),
    ['shower', 'hair', 'dressed'],
  );
  assert.equal(result.data.event.start, at('19:00').toISOString());
  assert.equal(result.data.leaveBy.at, at('18:15').toISOString());
  assert.deepEqual(
    result.data.tasks.map((task) => [task.id, task.start, task.end, task.overruns]),
    [
      ['shower', at('17:30').toISOString(), at('17:45').toISOString(), false],
      ['hair', at('17:45').toISOString(), at('18:05').toISOString(), false],
      ['dressed', at('18:05').toISOString(), at('18:15').toISOString(), false],
    ],
  );
  assert.equal(result.data.provenance.isFixture, true);
});

test('5:30 PM with the default routine is tight but feasible', async () => {
  const result = await generatePreparationPlan({ now: at('17:30') });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.pressure, 'tight');
  assert.equal(result.data.slackMinutes, 0);
  assert.equal(result.data.feasible, true);
  assert.equal(result.data.tasks[0].start, at('17:30').toISOString());
});

test('twenty more minutes of hair at 5:30 PM still ends at leave-by', async () => {
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
  assert.equal(result.data.feasible, true);
  assert.equal(result.data.conflict, null);
  assert.equal(result.data.startGettingReadyAt, at('17:10').toISOString());
  assert.equal(result.data.tasks.at(-1)?.end, result.data.leaveBy.at);
  assert.equal(result.data.tasks.some((task) => task.overruns), false);
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
  assert.equal(result.data.conflict, null);
  assert.equal(result.data.tasks.at(-1)?.end, result.data.leaveBy.at);
});

test('task order is the caller\'s order', async () => {
  const reversed = [...DEFAULT_TASKS].reverse();
  const result = await generatePreparationPlan({ now: at('12:00'), tasks: reversed });
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

test('HTTP planner: a late clock is 200 and still ends at leave-by; bad input is 400', async () => {
  const six = await handlePlannerRequest(new URLSearchParams('now=2026-09-26T18:00:00-04:00'));
  assert.equal(six.status, 200);
  assert.equal(six.body.ok, true);
  if (!six.body.ok) return;
  assert.equal(six.body.data.status, 'ok');
  assert.equal(six.body.data.pressure, 'tight');
  assert.equal(six.body.data.conflict, null);
  assert.equal(six.body.data.tasks.at(-1)?.end, six.body.data.leaveBy.at);

  const noon = await handlePlannerRequest(new URLSearchParams('now=2026-09-26T12:00:00-04:00'));
  assert.equal(noon.status, 200);
  if (!noon.body.ok) return;
  assert.equal(noon.body.data.pressure, 'relaxed');
  assert.equal(noon.body.data.leaveBy.at, at('18:15').toISOString());

  assert.equal((await handlePlannerRequest(new URLSearchParams('now=bogus'))).status, 400);
  assert.equal((await handlePlannerRequest(new URLSearchParams('buffer=-5'))).status, 400);
  assert.equal((await handlePlannerRequest(new URLSearchParams('mode=flying'))).status, 400);
  assert.equal((await handlePlannerRequest(new URLSearchParams('tasks=hair:0'))).status, 400);
  assert.equal((await handlePlannerRequest(new URLSearchParams('done=nails'))).status, 400);

  const hair = await handlePlannerRequest(new URLSearchParams('now=2026-09-26T17:30:00-04:00&tasks=shower:15,hair:40,dressed:10'));
  assert.equal(hair.status, 200);
  if (!hair.body.ok) return;
  assert.equal(hair.body.data.conflict, null);
  assert.equal(hair.body.data.tasks.at(-1)?.end, hair.body.data.leaveBy.at);
});

test('after dinner has ended the planner reports no-data instead of inventing an event', async () => {
  const result = await generatePreparationPlan({ now: at('21:00') });
  assert.deepEqual(result.ok ? null : result.error, {
    status: 'no-data',
    message: 'No upcoming event with an address to travel to.',
  });
  assert.equal((await handlePlannerRequest(new URLSearchParams('now=2026-09-26T21:00:00-04:00'))).status, 404);
});

test('walking uses that mode\'s duration for leave-by', async () => {
  const result = await generatePreparationPlan({ now: at('12:00'), mode: 'walking' });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.leaveBy.transportMode, 'walking');
  assert.equal(result.data.leaveBy.travelMinutes, 105);
  assert.equal(result.data.leaveBy.at, at('17:05').toISOString());
});

test('rideshare leave-by uses the driving duration', async () => {
  const result = await generatePreparationPlan({ now: at('12:00'), mode: 'rideshare' });
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
      now: at('12:00'),
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
      now: at('12:00'),
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
