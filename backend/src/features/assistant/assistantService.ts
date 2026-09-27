// Assistant public service. Grok requests tools; this file validates and executes them.
// Other features are reached only through handlers or their public services — never their adapters.

import type { AssistantResponse, ToolOutcome, UiEvent, ValidatedToolCall } from '../../../../shared/contracts/assistant/types.ts';
import { getNextTravelEvent, travelDestinationLabel } from '../calendar/fixtureCalendar.ts';
import { getUpcomingEvents } from '../calendar/fixtureEvents.ts';
import { getCommute } from '../maps/mapsService.ts';
import type { MapsResponse } from '../../../../shared/contracts/maps/types.ts';
import { getWeather } from '../weather/weatherService.ts';
import { loadAssistantEnv } from './envFile.ts';
import { createResponse, ProviderError } from './grokAdapter.ts';
import type { AssistantHandlers } from './handlers.ts';
import {
  handleGeneratePreparationPlan,
  handleMarkTaskComplete,
  handleUpdateTaskDuration,
} from './plannerHandlers.ts';
import { assistantInstructions } from './prompt.ts';
import { GROK_TOOLS, validateToolCall } from './tools.ts';

const DEFAULT_MODEL = 'grok-4.7';
const MAX_MODEL_CALLS = 3;
const MAX_UTTERANCE = 2_000;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface RunAssistantTurnOptions {
  utterance: string;
  // Demo/test-time override. Defaults to the system clock when omitted.
  now?: Date;
  history?: ChatMessage[];
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  // Passed only to the default weather handler, not to Grok.
  weatherFetch?: typeof fetch;
  handlers?: AssistantHandlers;
  clock?: () => Date;
  requestId?: string;
  /** Fired as soon as Grok's expand/collapse is executed, before the spoken follow-up. */
  onUiEvents?: (events: UiEvent[]) => void;
}

function sanitizeHistory(history: ChatMessage[] | undefined): ChatMessage[] {
  if (!history) return [];
  const clean: ChatMessage[] = [];
  for (const item of history.slice(-12)) {
    if (!item || (item.role !== 'user' && item.role !== 'assistant')) continue;
    if (typeof item.content !== 'string') continue;
    const content = item.content.trim().slice(0, MAX_UTTERANCE);
    if (!content) continue;
    clean.push({ role: item.role, content });
  }
  return clean;
}

function modelOutputFor(outcome: ToolOutcome): unknown {
  if (outcome.status === 'rejected') return { ok: false, error: outcome.error };
  return outcome.result;
}

async function executeCall(
  call: ValidatedToolCall,
  handlers: AssistantHandlers,
  now: Date,
  requestId: string,
  timestamp: string,
  callId: string,
): Promise<{ trace: ToolOutcome; event?: UiEvent }> {
  if (call.name === 'expandWidget' || call.name === 'collapseWidget' || call.name === 'showOverview') {
    const event: UiEvent = {
      action: call.name,
      requestId,
      timestamp,
      ...(call.name === 'showOverview' ? {} : { target: call.widget }),
    };
    return {
      event,
      trace: {
        callId,
        name: call.name,
        status: 'executed',
        arguments: call.name === 'showOverview' ? {} : { widget: call.widget },
        result: { ok: true, data: { action: event.action, target: event.target } },
      },
    };
  }

  const missing = (feature: string): ToolOutcome => ({
    callId,
    name: call.name,
    status: 'executed',
    arguments: call,
    result: { ok: false, error: { status: 'not-configured', message: `The ${feature} feature is not connected to the assistant yet.` } },
  });

  try {
    if (call.name === 'getWeather') {
      if (!handlers.getWeather) return { trace: missing('weather') };
      const result = await handlers.getWeather({ units: call.units }, { now });
      return { trace: { callId, name: call.name, status: 'executed', arguments: { units: call.units }, result } };
    }
    if (call.name === 'getUpcomingEvent') {
      if (!handlers.getUpcomingEvent) return { trace: missing('calendar') };
      const result = await handlers.getUpcomingEvent({ now });
      return { trace: { callId, name: call.name, status: 'executed', arguments: {}, result } };
    }
    if (call.name === 'getCommute') {
      if (!handlers.getCommute) return { trace: missing('maps') };
      const result = await handlers.getCommute({ now });
      return { trace: { callId, name: call.name, status: 'executed', arguments: {}, result } };
    }
    if (call.name === 'generatePreparationPlan') {
      if (!handlers.generatePreparationPlan) return { trace: missing('planner') };
      const args = { tasks: call.tasks, arrivalBufferMinutes: call.arrivalBufferMinutes };
      const result = await handlers.generatePreparationPlan(args, { now });
      return { trace: { callId, name: call.name, status: 'executed', arguments: args, result } };
    }
    if (call.name === 'updateTaskDuration') {
      if (!handlers.updateTaskDuration) return { trace: missing('planner') };
      const args = { taskName: call.taskName, durationMinutes: call.durationMinutes };
      const result = await handlers.updateTaskDuration(args, { now });
      return { trace: { callId, name: call.name, status: 'executed', arguments: args, result } };
    }
    if (!handlers.markTaskComplete) return { trace: missing('planner') };
    const args = { taskName: call.taskName };
    const result = await handlers.markTaskComplete(args, { now });
    return { trace: { callId, name: call.name, status: 'executed', arguments: args, result } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'The tool failed.';
    return {
      trace: {
        callId,
        name: call.name,
        status: 'executed',
        arguments: call,
        result: { ok: false, error: { status: 'external-provider-unavailable', message } },
        error: { status: 'external-provider-unavailable', message },
      },
    };
  }
}

export async function runAssistantTurn(options: RunAssistantTurnOptions): Promise<AssistantResponse> {
  const utterance = options.utterance.trim();
  if (!utterance || utterance.length > MAX_UTTERANCE) {
    return { ok: false, error: { status: 'input-invalid', message: 'Utterance must be 1 to 2000 characters.' } };
  }

  if (options.apiKey === undefined || options.model === undefined) loadAssistantEnv();
  const apiKey = (options.apiKey !== undefined ? options.apiKey : (process.env.XAI_API_KEY ?? '')).trim();
  if (!apiKey) {
    return { ok: false, error: { status: 'not-configured', message: 'XAI_API_KEY is not set. Add it to backend/.env.' } };
  }
  const model = (options.model !== undefined ? options.model : (process.env.XAI_MODEL ?? DEFAULT_MODEL)).trim() || DEFAULT_MODEL;
  const now = options.now ?? new Date();
  const requestId = options.requestId ?? crypto.randomUUID();
  const timestamp = (options.clock ?? (() => new Date()))().toISOString();
  const handlers: AssistantHandlers = { ...defaultHandlers(options.weatherFetch), ...options.handlers };

  let input: unknown[] = [...sanitizeHistory(options.history), { role: 'user', content: utterance }];
  const uiEvents: UiEvent[] = [];
  const tools: ToolOutcome[] = [];

  try {
    for (let callIndex = 1; callIndex <= MAX_MODEL_CALLS; callIndex++) {
      const round = await createResponse({
        apiKey,
        model,
        instructions: assistantInstructions(now),
        input,
        tools: GROK_TOOLS,
        baseUrl: options.baseUrl,
        fetchFn: options.fetchFn,
      });

      if (round.toolCalls.length === 0) {
        if (!round.text) {
          return { ok: false, error: { status: 'external-provider-unavailable', message: 'Grok returned no spoken response.' } };
        }
        return { ok: true, data: { requestId, spokenText: round.text, uiEvents, tools } };
      }

      // A follow-up call has to carry these results before any spoken recommendation.
      if (callIndex === MAX_MODEL_CALLS) {
        return {
          ok: false,
          error: { status: 'external-provider-unavailable', message: 'Grok kept requesting tools past the turn limit.' },
        };
      }

      const outputs = [];
      const replays = [];
      for (const toolCall of uiToolsFirst(round.toolCalls)) {
        if (toolCall.parseError) {
          const error = { status: 'input-invalid' as const, message: toolCall.parseError };
          const trace: ToolOutcome = {
            callId: toolCall.callId,
            name: toolCall.name,
            status: 'rejected',
            arguments: toolCall.rawArguments,
            error,
          };
          tools.push(trace);
          replays.push(toolCall.replayItem);
          outputs.push({ type: 'function_call_output', call_id: toolCall.callId, output: JSON.stringify(modelOutputFor(trace)) });
          continue;
        }

        const validated = validateToolCall(toolCall.name, toolCall.argumentsJson);
        if (!validated.ok) {
          const error = { status: 'input-invalid' as const, message: validated.message };
          const trace: ToolOutcome = {
            callId: toolCall.callId,
            name: toolCall.name,
            status: 'rejected',
            arguments: toolCall.argumentsJson,
            error,
          };
          tools.push(trace);
          replays.push(toolCall.replayItem);
          outputs.push({ type: 'function_call_output', call_id: toolCall.callId, output: JSON.stringify(modelOutputFor(trace)) });
          continue;
        }

        const executed = await executeCall(validated.call, handlers, now, requestId, timestamp, toolCall.callId);
        tools.push(executed.trace);
        if (executed.event) {
          uiEvents.push(executed.event);
          options.onUiEvents?.([executed.event]);
        }
        replays.push(toolCall.replayItem);
        outputs.push({
          type: 'function_call_output',
          call_id: toolCall.callId,
          output: JSON.stringify(modelOutputFor(executed.trace)),
        });
      }
      input = [...input, ...replays, ...outputs];
    }
  } catch (err) {
    if (err instanceof ProviderError) {
      return { ok: false, error: { status: 'external-provider-unavailable', message: err.message } };
    }
    throw err;
  }

  return { ok: false, error: { status: 'external-provider-unavailable', message: 'Grok did not finish the turn.' } };
}

function isUiTool(name: string): boolean {
  return name === 'expandWidget' || name === 'collapseWidget' || name === 'showOverview';
}

function uiToolsFirst<T extends { name: string }>(calls: T[]): T[] {
  return [...calls].sort((left, right) => Number(isUiTool(right.name)) - Number(isUiTool(left.name)));
}

function eventsForSpeech(result: ReturnType<typeof getUpcomingEvents>) {
  const { events, timeZone } = result.data;
  return {
    ok: true as const,
    data: {
      timeZone,
      events: events.map(({ title, start, end, venueName, venueAddress }) => ({ title, start, end, venueName, venueAddress })),
    },
  };
}

function commuteForSpeech(result: MapsResponse) {
  if (!result.ok) return result;
  const recommended =
    result.data.routes.find((route) => route.mode === result.data.recommendedMode) ?? result.data.routes[0];
  return {
    ok: true as const,
    data: {
      origin: result.data.origin,
      destination: result.data.destination,
      recommendedMode: result.data.recommendedMode,
      durationMinutes: recommended?.durationMinutes,
      routes: result.data.routes.map(({ mode, durationMinutes: minutes }) => ({ mode, durationMinutes: minutes })),
    },
  };
}

function defaultHandlers(weatherFetch?: typeof fetch): AssistantHandlers {
  return {
    getWeather: (args, ctx) => getWeather({ units: args.units, now: ctx.now, fetchFn: weatherFetch }),
    getUpcomingEvent: (ctx) => Promise.resolve(eventsForSpeech(getUpcomingEvents(ctx.now))),
    getCommute: async (ctx) => {
      const clock = ctx.now ?? new Date();
      const next = getNextTravelEvent(clock);
      return commuteForSpeech(
        await getCommute({
          destinationAddress: next.ok ? next.event.venueAddress : undefined,
          destinationName: next.ok ? travelDestinationLabel(next.event) : undefined,
          now: clock,
        }),
      );
    },
    generatePreparationPlan: handleGeneratePreparationPlan,
    updateTaskDuration: handleUpdateTaskDuration,
    markTaskComplete: handleMarkTaskComplete,
  };
}
