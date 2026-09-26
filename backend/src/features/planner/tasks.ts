// Task list edits. Both return a new list of the same length and order, or null when
// the edit is unusable. Neither removes a task or touches the calendar event.

import type { PreparationTask } from '../../../../shared/contracts/planner/types.ts';
import { MAX_TASK_MINUTES } from './defaults.ts';

export function updateTaskDuration(
  tasks: readonly PreparationTask[],
  taskId: string,
  durationMinutes: number,
): PreparationTask[] | null {
  if (!tasks.some((task) => task.id === taskId)) return null;
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > MAX_TASK_MINUTES) return null;
  return tasks.map((task) => (task.id === taskId ? { ...task, durationMinutes } : { ...task }));
}

export function markTaskComplete(tasks: readonly PreparationTask[], taskId: string): PreparationTask[] | null {
  if (!tasks.some((task) => task.id === taskId)) return null;
  return tasks.map((task) => (task.id === taskId ? { ...task, completed: true } : { ...task }));
}
