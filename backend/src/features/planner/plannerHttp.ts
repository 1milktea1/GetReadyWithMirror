// GET /api/planner
//   now     — optional ISO 8601 demo/test-time override
//   mode    — optional transit (default) | walking | driving | cycling | rideshare
//   buffer  — optional arrival buffer in minutes (default 10)
//   tasks   — optional id:minutes list, comma-separated, replacing the default routine
//   done    — optional comma-separated task ids to mark complete
//
// A schedule conflict is HTTP 200 with data.status "schedule-conflict". It is a real
// answer, not a failed request. 400 and 404 are reserved for unusable input and missing
// upstream data.

import { isTransportMode } from '../maps/mapsService.ts';
import type { PlannerError, PlannerErrorStatus, PlannerResponse, PreparationTask } from '../../../../shared/contracts/planner/types.ts';
import { DEFAULT_TASKS, MAX_TASK_MINUTES, TASK_NAMES } from './defaults.ts';
import { generatePreparationPlan } from './plannerService.ts';
import { markTaskComplete } from './tasks.ts';

const HTTP_STATUS: Record<PlannerErrorStatus, number> = {
  'input-invalid': 400,
  'no-data': 404,
};

type HttpResult<T> = { status: number; body: T };

const invalid = (message: string): HttpResult<{ ok: false; error: PlannerError }> => ({
  status: 400,
  body: { ok: false, error: { status: 'input-invalid', message } },
});

export async function handlePlannerRequest(query: URLSearchParams): Promise<HttpResult<PlannerResponse>> {
  const nowParam = query.get('now');
  let now: Date | undefined;
  if (nowParam) {
    now = new Date(nowParam);
    if (Number.isNaN(now.getTime())) return invalid(`Invalid "now" override: ${nowParam}`);
  }

  const modeParam = query.get('mode');
  if (modeParam && !isTransportMode(modeParam)) {
    return invalid('mode must be "transit", "walking", "driving", "cycling", or "rideshare".');
  }

  const bufferParam = query.get('buffer');
  let arrivalBufferMinutes: number | undefined;
  if (bufferParam !== null) {
    if (!/^\d+$/.test(bufferParam)) return invalid('buffer must be a whole number of minutes.');
    arrivalBufferMinutes = Number(bufferParam);
  }

  const tasksParam = query.get('tasks');
  let tasks: PreparationTask[] | undefined;
  if (tasksParam !== null) {
    const parsed = parseTasks(tasksParam);
    if (typeof parsed === 'string') return invalid(parsed);
    tasks = parsed;
  }

  const doneParam = query.get('done');
  if (doneParam !== null) {
    const base = tasks ?? DEFAULT_TASKS.map((task) => ({ ...task }));
    const marked = applyDone(base, doneParam);
    if (typeof marked === 'string') return invalid(marked);
    tasks = marked;
  }

  const result = await generatePreparationPlan({
    now,
    mode: modeParam && isTransportMode(modeParam) ? modeParam : undefined,
    arrivalBufferMinutes,
    tasks,
  });
  return { status: result.ok ? 200 : HTTP_STATUS[result.error.status], body: result };
}

function parseTasks(raw: string): PreparationTask[] | string {
  const parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return 'tasks must list at least one id:minutes pair.';
  const tasks: PreparationTask[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const match = /^([a-z0-9-]+):(\d+)$/i.exec(part);
    if (!match) return `Could not read task "${part}". Use id:minutes, for example hair:40.`;
    const id = match[1].toLowerCase();
    const durationMinutes = Number(match[2]);
    if (durationMinutes < 1 || durationMinutes > MAX_TASK_MINUTES) {
      return `Task ${id} must be between 1 and ${MAX_TASK_MINUTES} minutes.`;
    }
    if (seen.has(id)) return `Task ${id} is listed twice.`;
    seen.add(id);
    tasks.push({ id, name: TASK_NAMES[id] ?? nameFromId(id), durationMinutes });
  }
  return tasks;
}

function applyDone(tasks: PreparationTask[], done: string): PreparationTask[] | string {
  const ids = done.split(',').map((id) => id.trim().toLowerCase()).filter(Boolean);
  let next = tasks;
  for (const id of ids) {
    const marked = markTaskComplete(next, id);
    if (!marked) return `Unknown task "${id}".`;
    next = marked;
  }
  return next;
}

function nameFromId(id: string): string {
  return id.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
