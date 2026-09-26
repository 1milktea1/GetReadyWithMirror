// One short spoken reminder. Grok writes the words. It does not open a screen.

import { loadAssistantEnv } from './envFile.ts';
import { createResponse, ProviderError } from './grokAdapter.ts';

const DEFAULT_MODEL = 'grok-4.7';

export interface RushRequest {
  title: string;
  minutesLeft: number;
  startLabel: string;
  place?: string;
  agenda?: string[];
}

export function parseRushRequest(payload: unknown): RushRequest | null {
  if (!payload || typeof payload !== 'object') return null;
  const { title, start, minutesLeft, venue, agenda } = payload as {
    title?: unknown;
    start?: unknown;
    minutesLeft?: unknown;
    venue?: unknown;
    agenda?: unknown;
  };
  if (typeof title !== 'string' || !title.trim()) return null;
  if (typeof start !== 'string' || Number.isNaN(Date.parse(start))) return null;
  if (minutesLeft !== 30 && minutesLeft !== 15 && minutesLeft !== 5) return null;
  const startLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(start));
  const place = typeof venue === 'string' && venue.trim() ? venue.trim() : undefined;
  const listed = Array.isArray(agenda)
    ? agenda.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 6)
    : undefined;
  return { title: title.trim(), minutesLeft, startLabel, place, agenda: listed };
}

export function fallbackRushLine(title: string, minutesLeft: number, place?: string): string {
  const left = minutesLeft === 1 ? '1 minute' : `${minutesLeft} minutes`;
  const where = place ? ` at ${place}` : '';
  if (/lab|seminar|standup|class|office|research|professor/i.test(title)) {
    return `You should get ready! ${title}${where} is in ${left}, or your lab professor might call you out!`;
  }
  return `You should get ready! ${title}${where} is in ${left}. Don't miss it!`;
}

export async function writeRushLine(
  input: RushRequest,
  options: { apiKey?: string; model?: string; fetchFn?: typeof fetch } = {},
): Promise<string> {
  const fallback = fallbackRushLine(input.title, input.minutesLeft, input.place);
  if (options.apiKey === undefined) loadAssistantEnv();
  const apiKey = (options.apiKey !== undefined ? options.apiKey : (process.env.XAI_API_KEY ?? '')).trim();
  if (!apiKey) return fallback;
  const model = (options.model !== undefined ? options.model : (process.env.XAI_MODEL ?? DEFAULT_MODEL)).trim() || DEFAULT_MODEL;
  try {
    const round = await createResponse({
      apiKey,
      model,
      instructions: [
        'Write one or two short sentences the mirror will speak aloud. Sound urgent and expressive.',
        'Every sentence must be about the event you are given: use its name, its time, and its place when one is provided.',
        'Do not mention any other appointment, person, or place.',
        'A lab, class, seminar, standup, or research meeting may include that their lab professor might call them out. Do not say that for any other event.',
        'Do not mention code, tools, models, or where the information came from.',
        'Do not add a greeting or stage directions.',
      ].join(' '),
      input: [
        {
          role: 'user',
          content: [
            `Event to talk about: ${input.title} at ${input.startLabel}${input.place ? `, ${input.place}` : ''}.`,
            `${input.minutesLeft} minutes remain before it.`,
            input.agenda?.length ? `Other events on the calendar, for context only: ${input.agenda.join('; ')}.` : '',
          ]
            .filter(Boolean)
            .join(' '),
        },
      ],
      tools: [],
      fetchFn: options.fetchFn,
    });
    return round.text || fallback;
  } catch (err) {
    if (err instanceof ProviderError) return fallback;
    throw err;
  }
}
