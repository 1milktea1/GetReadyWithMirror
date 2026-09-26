// xAI Responses API adapter. The only file that knows Grok's request and response shape.
// Docs: https://docs.x.ai/docs/guides/function-calling — POST /v1/responses
//
// Built-in server tools (web search, X search, code execution) are not declared.
// Facts come from allowlisted functions, which the service executes.
// search_parameters is the retired live-search API and returns HTTP 410.

import type { GrokFunctionTool } from './tools.ts';

const DEFAULT_BASE_URL = 'https://api.x.ai/v1';
const TIMEOUT_MS = 20_000;

export class ProviderError extends Error {}

export interface GrokToolCall {
  callId: string;
  name: string;
  rawArguments: string;
  argumentsJson: unknown;
  parseError: string | null;
  replayItem: { type: 'function_call'; call_id: string; name: string; arguments: string };
}

export interface GrokRound {
  id: string;
  text: string;
  toolCalls: GrokToolCall[];
}

export interface GrokRequest {
  apiKey: string;
  model: string;
  instructions: string;
  input: unknown[];
  tools: readonly GrokFunctionTool[];
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function scrub(message: string, secret: string): string {
  return secret ? message.split(secret).join('[redacted]') : message;
}

function providerDetail(body: unknown, apiKey: string, status: number): string {
  if (isRecord(body)) {
    const error = body.error;
    const message = typeof error === 'string' ? error : isRecord(error) && typeof error.message === 'string' ? error.message : '';
    if (message) return scrub(message, apiKey).slice(0, 200);
  }
  return `Grok returned HTTP ${status}.`;
}

function readText(output: unknown[]): string {
  const parts: string[] = [];
  for (const item of output) {
    if (!isRecord(item) || item.type !== 'message') continue;
    if (typeof item.content === 'string') {
      parts.push(item.content);
      continue;
    }
    if (!Array.isArray(item.content)) continue;
    for (const block of item.content) {
      if (isRecord(block) && block.type === 'output_text' && typeof block.text === 'string') parts.push(block.text);
    }
  }
  return parts.join('').trim();
}

function readToolCalls(output: unknown[]): GrokToolCall[] | ProviderError {
  const calls: GrokToolCall[] = [];
  for (const item of output) {
    if (!isRecord(item) || item.type !== 'function_call') continue;
    if (typeof item.name !== 'string' || typeof item.call_id !== 'string' || !item.call_id) {
      return new ProviderError('Grok returned a tool call without a name or call id.');
    }
    const rawArguments = typeof item.arguments === 'string' ? item.arguments : '';
    let argumentsJson: unknown = undefined;
    let parseError: string | null = null;
    if (typeof item.arguments !== 'string') {
      parseError = 'Tool arguments were not a JSON string.';
    } else {
      try {
        argumentsJson = JSON.parse(rawArguments);
      } catch {
        parseError = 'Tool arguments were not valid JSON.';
      }
    }
    calls.push({
      callId: item.call_id,
      name: item.name,
      rawArguments,
      argumentsJson,
      parseError,
      replayItem: { type: 'function_call', call_id: item.call_id, name: item.name, arguments: rawArguments },
    });
  }
  return calls;
}

export async function createResponse(request: GrokRequest): Promise<GrokRound> {
  const fetchFn = request.fetchFn ?? fetch;
  const baseUrl = (request.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  let response: Response;
  try {
    response = await fetchFn(`${baseUrl}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${request.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        instructions: request.instructions,
        input: request.input,
        tools: request.tools,
        tool_choice: 'auto',
        parallel_tool_calls: true,
        store: false,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'request failed';
    throw new ProviderError(scrub(`Grok request failed: ${message}`, request.apiKey));
  }

  if (!response.ok) {
    let detail = `Grok returned HTTP ${response.status}.`;
    try {
      detail = providerDetail(await response.json(), request.apiKey, response.status);
    } catch {
      // Keep the status line. A non-JSON error body is not a forecast or a schedule.
    }
    throw new ProviderError(detail);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ProviderError('Grok returned a response that was not JSON.');
  }
  if (!isRecord(body)) throw new ProviderError('Grok returned an unexpected response.');
  if (body.error !== undefined && body.error !== null) {
    throw new ProviderError(providerDetail(body, request.apiKey, 200));
  }
  if (body.status === 'in_progress' || body.status === 'failed') {
    throw new ProviderError(`Grok response status was ${String(body.status)}.`);
  }
  if (!Array.isArray(body.output)) throw new ProviderError('Grok returned no output.');

  const toolCalls = readToolCalls(body.output);
  if (toolCalls instanceof ProviderError) throw toolCalls;
  return {
    id: typeof body.id === 'string' ? body.id : '',
    text: readText(body.output),
    toolCalls,
  };
}
