// Assistant turn shape, per ./README.md. Status: proposed with the Grok implementation, not yet agreed.
// Type-only: imported by the backend assistant feature. No other feature should import the Grok adapter.

export const WIDGETS = ['weather', 'calendar', 'maps', 'planner'] as const;
export type WidgetName = (typeof WIDGETS)[number];

// getPreferences is intentionally absent until someone owns preferences.
export const TOOL_NAMES = [
  'expandWidget',
  'collapseWidget',
  'showOverview',
  'getWeather',
  'getUpcomingEvent',
  'getCommute',
  'generatePreparationPlan',
  'updateTaskDuration',
  'markTaskComplete',
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

export type AssistantErrorStatus = 'not-configured' | 'external-provider-unavailable' | 'input-invalid';

export interface AssistantError {
  status: AssistantErrorStatus;
  message: string;
}

// What the assistant emits for React. Transport is still undecided; this is the payload only.
export type TransportUiMode = 'transit' | 'walking' | 'driving' | 'rideshare';

export interface UiEvent {
  action: 'expandWidget' | 'collapseWidget' | 'showOverview';
  target?: WidgetName;
  /** When opening maps, the route the user asked to see. */
  mode?: TransportUiMode;
  requestId: string;
  timestamp: string;
}

export interface ToolOutcome {
  callId: string;
  name: string;
  status: 'executed' | 'rejected';
  arguments: unknown;
  result?: unknown;
  error?: { status: 'input-invalid' | 'not-configured' | 'external-provider-unavailable'; message: string };
}

export interface AssistantTurn {
  requestId: string;
  spokenText: string;
  uiEvents: UiEvent[];
  tools: ToolOutcome[];
}

export type AssistantResponse = { ok: true; data: AssistantTurn } | { ok: false; error: AssistantError };

export interface PreparationTaskInput {
  name: string;
  durationMinutes: number;
}

export type ValidatedToolCall =
  | { name: 'expandWidget'; widget: WidgetName; mode?: TransportUiMode }
  | { name: 'collapseWidget'; widget: WidgetName }
  | { name: 'showOverview' }
  | { name: 'getWeather'; units?: 'imperial' | 'metric' }
  | { name: 'getUpcomingEvent' }
  | { name: 'getCommute' }
  | {
      name: 'generatePreparationPlan';
      tasks: PreparationTaskInput[];
      arrivalBufferMinutes?: number;
    }
  | { name: 'updateTaskDuration'; taskName: string; durationMinutes: number }
  | { name: 'markTaskComplete'; taskName: string };
