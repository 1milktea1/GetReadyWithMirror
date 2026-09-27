// Allowlist, argument checks, and the tool declarations sent to Grok.
// A name that is not in this file never runs. Invalid arguments never reach a handler.

import {
  TOOL_NAMES,
  WIDGETS,
  type ToolName,
  type TransportUiMode,
  type ValidatedToolCall,
  type WidgetName,
} from '../../../../shared/contracts/assistant/types.ts';

export interface GrokFunctionTool {
  type: 'function';
  name: ToolName;
  description: string;
  parameters: {
    type: 'object';
    additionalProperties: false;
    properties: Record<string, unknown>;
    required: string[];
  };
}

const widgetParameter = {
  type: 'string',
  enum: [...WIDGETS],
  description: 'Module to focus: weather, calendar, maps, planner, or unwind.',
};

export const GROK_TOOLS: readonly GrokFunctionTool[] = [
  {
    type: 'function',
    name: 'expandWidget',
    description:
      'Open one module. Weather for the forecast, calendar for the afternoon, planner to get ready, maps for the trip. Phrase variants count. Use with an information tool when the user also wants a fact. For walk, drive, subway, or rideshare, pass maps and mode so the drawn route changes.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        widget: widgetParameter,
        mode: {
          type: 'string',
          enum: ['transit', 'walking', 'driving', 'rideshare'],
          description: 'Route to draw on maps: transit is subway. Omit unless the user asked for a mode.',
        },
      },
      required: ['widget'],
    },
  },
  {
    type: 'function',
    name: 'collapseWidget',
    description: 'Leave a focused module without returning all the way to the overview.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: { widget: widgetParameter },
      required: ['widget'],
    },
  },
  {
    type: 'function',
    name: 'showOverview',
    description: 'Return the mirror to the compact overview. Use for "go back" or "show overview".',
    parameters: { type: 'object', additionalProperties: false, properties: {}, required: [] },
  },
  {
    type: 'function',
    name: 'getWeather',
    description:
      'Fetch the forecast and clothing suggestions. imperial is Fahrenheit, metric is Celsius. Do not invent weather. This does not change the location.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        units: { type: 'string', enum: ['imperial', 'metric'], description: 'Defaults to imperial when omitted.' },
      },
      required: [],
    },
  },
  {
    type: 'function',
    name: 'getUpcomingEvent',
    description: 'Read the next calendar event, including its time and venue. Do not invent an event.',
    parameters: { type: 'object', additionalProperties: false, properties: {}, required: [] },
  },
  {
    type: 'function',
    name: 'getCommute',
    description: 'Read travel duration from the user to the event. Do not invent a route or a leave-by time.',
    parameters: { type: 'object', additionalProperties: false, properties: {}, required: [] },
  },
  {
    type: 'function',
    name: 'generatePreparationPlan',
    description: 'Ask the planner to schedule the named tasks against the leave-by deadline. Pass only tasks the user named.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        tasks: {
          type: 'array',
          minItems: 1,
          maxItems: 8,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              durationMinutes: { type: 'integer', minimum: 1, maximum: 180 },
            },
            required: ['name', 'durationMinutes'],
          },
        },
        arrivalBufferMinutes: { type: 'integer', minimum: 0, maximum: 120 },
      },
      required: ['tasks'],
    },
  },
  {
    type: 'function',
    name: 'updateTaskDuration',
    description: 'Change one preparation task duration the user asked to change. Do not drop other tasks.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        taskName: { type: 'string' },
        durationMinutes: { type: 'integer', minimum: 1, maximum: 180 },
      },
      required: ['taskName', 'durationMinutes'],
    },
  },
  {
    type: 'function',
    name: 'markTaskComplete',
    description: 'Mark one named preparation task complete.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: { taskName: { type: 'string' } },
      required: ['taskName'],
    },
  },
];

export function isToolName(name: string): name is ToolName {
  return (TOOL_NAMES as readonly string[]).includes(name);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function unexpectedKey(record: Record<string, unknown>, allowed: readonly string[]): string | null {
  const extra = Object.keys(record).filter((key) => !allowed.includes(key));
  return extra.length > 0 ? `Unexpected argument "${extra[0]}".` : null;
}

function widgetName(value: unknown): WidgetName | null {
  return typeof value === 'string' && (WIDGETS as readonly string[]).includes(value) ? (value as WidgetName) : null;
}

function transportMode(value: unknown): TransportUiMode | null {
  if (value === 'transit' || value === 'walking' || value === 'driving' || value === 'rideshare') return value;
  return null;
}

function taskName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  if (name.length < 1 || name.length > 60) return null;
  if (/[\u0000-\u001f]/.test(name)) return null;
  return name;
}

function minutes(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) return null;
  return value;
}

export function validateToolCall(name: string, args: unknown): { ok: true; call: ValidatedToolCall } | { ok: false; message: string } {
  if (!isToolName(name)) {
    return { ok: false, message: `Unknown tool "${name}" was rejected.` };
  }
  if (!isRecord(args)) {
    return { ok: false, message: `${name} arguments must be an object.` };
  }

  if (name === 'collapseWidget') {
    const extra = unexpectedKey(args, ['widget']);
    if (extra) return { ok: false, message: extra };
    const widget = widgetName(args.widget);
    if (!widget) return { ok: false, message: `${name} requires a widget of weather, calendar, maps, planner, or unwind.` };
    return { ok: true, call: { name, widget } };
  }

  if (name === 'expandWidget') {
    const extra = unexpectedKey(args, ['widget', 'mode']);
    if (extra) return { ok: false, message: extra };
    const widget = widgetName(args.widget);
    if (!widget) return { ok: false, message: `${name} requires a widget of weather, calendar, maps, or planner.` };
    if (args.mode === undefined) return { ok: true, call: { name, widget } };
    const mode = transportMode(args.mode);
    if (!mode) return { ok: false, message: 'expandWidget mode must be transit, walking, driving, or rideshare.' };
    return { ok: true, call: { name, widget, mode } };
  }

  if (name === 'showOverview' || name === 'getUpcomingEvent' || name === 'getCommute') {
    const extra = unexpectedKey(args, []);
    if (extra) return { ok: false, message: extra };
    return { ok: true, call: { name } };
  }

  if (name === 'getWeather') {
    const extra = unexpectedKey(args, ['units']);
    if (extra) return { ok: false, message: extra };
    if (args.units === undefined) return { ok: true, call: { name } };
    if (args.units !== 'imperial' && args.units !== 'metric') {
      return { ok: false, message: 'getWeather units must be imperial or metric.' };
    }
    return { ok: true, call: { name, units: args.units } };
  }

  if (name === 'updateTaskDuration') {
    const extra = unexpectedKey(args, ['taskName', 'durationMinutes']);
    if (extra) return { ok: false, message: extra };
    const task = taskName(args.taskName);
    const duration = minutes(args.durationMinutes, 1, 180);
    if (!task || duration === null) {
      return { ok: false, message: 'updateTaskDuration needs a task name and a duration from 1 to 180 minutes.' };
    }
    return { ok: true, call: { name, taskName: task, durationMinutes: duration } };
  }

  if (name === 'markTaskComplete') {
    const extra = unexpectedKey(args, ['taskName']);
    if (extra) return { ok: false, message: extra };
    const task = taskName(args.taskName);
    if (!task) return { ok: false, message: 'markTaskComplete needs a task name.' };
    return { ok: true, call: { name, taskName: task } };
  }

  if (name !== 'generatePreparationPlan') {
    return { ok: false, message: `Unknown tool "${name}" was rejected.` };
  }
  const extra = unexpectedKey(args, ['tasks', 'arrivalBufferMinutes']);
  if (extra) return { ok: false, message: extra };
  if (!Array.isArray(args.tasks) || args.tasks.length < 1 || args.tasks.length > 8) {
    return { ok: false, message: 'generatePreparationPlan needs 1 to 8 tasks.' };
  }
  const tasks = [];
  for (const item of args.tasks) {
    if (!isRecord(item)) return { ok: false, message: 'Each preparation task must be an object.' };
    const taskExtra = unexpectedKey(item, ['name', 'durationMinutes']);
    if (taskExtra) return { ok: false, message: taskExtra };
    const task = taskName(item.name);
    const duration = minutes(item.durationMinutes, 1, 180);
    if (!task || duration === null) {
      return { ok: false, message: 'Each task needs a name and a duration from 1 to 180 minutes.' };
    }
    tasks.push({ name: task, durationMinutes: duration });
  }
  if (args.arrivalBufferMinutes === undefined) {
    return { ok: true, call: { name: 'generatePreparationPlan', tasks } };
  }
  const buffer = minutes(args.arrivalBufferMinutes, 0, 120);
  if (buffer === null) return { ok: false, message: 'arrivalBufferMinutes must be a whole number from 0 to 120.' };
  return { ok: true, call: { name: 'generatePreparationPlan', tasks, arrivalBufferMinutes: buffer } };
}
