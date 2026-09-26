// Feature services the assistant may call after a tool call has been validated.
// Calendar and maps use labeled demo fixtures. Planner stays unwired.

import type { PreparationTaskInput } from '../../../../shared/contracts/assistant/types.ts';

export interface ToolContext {
  now: Date;
}

export interface AssistantHandlers {
  getWeather?: (args: { units?: 'imperial' | 'metric' }, ctx: ToolContext) => Promise<unknown>;
  getUpcomingEvent?: (ctx: ToolContext) => Promise<unknown>;
  getCommute?: (ctx: ToolContext) => Promise<unknown>;
  generatePreparationPlan?: (
    args: { tasks: PreparationTaskInput[]; arrivalBufferMinutes?: number },
    ctx: ToolContext,
  ) => Promise<unknown>;
  updateTaskDuration?: (args: { taskName: string; durationMinutes: number }, ctx: ToolContext) => Promise<unknown>;
  markTaskComplete?: (args: { taskName: string }, ctx: ToolContext) => Promise<unknown>;
}
