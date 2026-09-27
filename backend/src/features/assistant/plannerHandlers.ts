// Planner tools for the voice loop. Grok names tasks; this file maps them onto
// the planner public service and keeps one in-memory routine for follow-ups.

import type { PreparationTaskInput } from '../../../../shared/contracts/assistant/types.ts';
import type { PreparationTask } from '../../../../shared/contracts/planner/types.ts';
import { DEFAULT_TASKS, TASK_NAMES } from '../planner/defaults.ts';
import { generatePreparationPlan } from '../planner/plannerService.ts';
import { markTaskComplete, updateTaskDuration } from '../planner/tasks.ts';
import type { ToolContext } from './handlers.ts';

let sessionTasks: PreparationTask[] = DEFAULT_TASKS.map((task) => ({ ...task }));

export function resetPlannerSession(tasks: readonly PreparationTask[] = DEFAULT_TASKS): void {
  sessionTasks = tasks.map((task) => ({ ...task }));
}

export function currentPlannerTasks(): PreparationTask[] {
  return sessionTasks.map((task) => ({ ...task }));
}

export async function handleGeneratePreparationPlan(
  args: { tasks: PreparationTaskInput[]; arrivalBufferMinutes?: number },
  ctx: ToolContext,
): Promise<unknown> {
  const tasks = args.tasks.map(taskFromSpoken);
  sessionTasks = tasks.map((task) => ({ ...task }));
  return compactPlan(
    await generatePreparationPlan({
      now: ctx.now,
      tasks,
      arrivalBufferMinutes: args.arrivalBufferMinutes,
    }),
  );
}

export async function handleUpdateTaskDuration(
  args: { taskName: string; durationMinutes: number },
  ctx: ToolContext,
): Promise<unknown> {
  const id = resolveTaskId(sessionTasks, args.taskName);
  if (!id) {
    return { ok: false, error: { status: 'input-invalid', message: `There is no "${args.taskName}" task on the current plan.` } };
  }
  const next = updateTaskDuration(sessionTasks, id, args.durationMinutes);
  if (!next) {
    return { ok: false, error: { status: 'input-invalid', message: 'That duration is not usable.' } };
  }
  sessionTasks = next;
  return compactPlan(await generatePreparationPlan({ now: ctx.now, tasks: next }));
}

export async function handleMarkTaskComplete(args: { taskName: string }, ctx: ToolContext): Promise<unknown> {
  const id = resolveTaskId(sessionTasks, args.taskName);
  if (!id) {
    return { ok: false, error: { status: 'input-invalid', message: `There is no "${args.taskName}" task on the current plan.` } };
  }
  const next = markTaskComplete(sessionTasks, id);
  if (!next) {
    return { ok: false, error: { status: 'input-invalid', message: 'That task could not be marked done.' } };
  }
  sessionTasks = next;
  return compactPlan(await generatePreparationPlan({ now: ctx.now, tasks: next }));
}

function taskFromSpoken(input: PreparationTaskInput): PreparationTask {
  const id = idFromName(input.name);
  return {
    id,
    name: TASK_NAMES[id] ?? titleCase(input.name),
    durationMinutes: input.durationMinutes,
  };
}

function resolveTaskId(tasks: readonly PreparationTask[], spoken: string): string | undefined {
  const key = idFromName(spoken);
  const match = tasks.find((task) => task.id === key || task.name.toLowerCase() === spoken.trim().toLowerCase());
  return match?.id;
}

function idFromName(name: string): string {
  const n = name.trim().toLowerCase();
  if (n.includes('shower')) return 'shower';
  if (n.includes('hair')) return 'hair';
  if (n.includes('dress')) return 'dressed';
  return n.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'task';
}

function titleCase(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function compactPlan(result: Awaited<ReturnType<typeof generatePreparationPlan>>): unknown {
  if (!result.ok) return result;
  const plan = result.data;
  return {
    ok: true,
    data: {
      status: plan.status,
      leaveBy: plan.leaveBy.at,
      travelMinutes: plan.leaveBy.travelMinutes,
      transportMode: plan.leaveBy.transportMode,
      startGettingReadyAt: plan.startGettingReadyAt,
      slackMinutes: plan.slackMinutes,
      feasible: plan.feasible,
      pressure: plan.pressure,
      summary: plan.summary,
      conflict: plan.conflict,
      event: {
        title: plan.event.title,
        start: plan.event.start,
        venueName: plan.event.venueName,
      },
      tasks: plan.tasks.map((task) => ({
        id: task.id,
        name: task.name,
        durationMinutes: task.durationMinutes,
        completed: task.completed,
        start: task.start,
        end: task.end,
        overruns: task.overruns,
      })),
    },
  };
}
