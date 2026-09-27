import { runAssistantTurn, type ChatMessage } from '../assistant/assistantService.ts';

export async function handleAssistantTurn(payload: unknown): Promise<{ status: number; body: unknown }> {
  const utterance = payload && typeof payload === 'object' ? (payload as { utterance?: unknown }).utterance : undefined;
  if (typeof utterance !== 'string') {
    return {
      status: 400,
      body: { ok: false, error: { status: 'input-invalid', message: 'utterance is required.' } },
    };
  }
  const rawNow = (payload as { now?: unknown }).now;
  const now = typeof rawNow === 'string' ? new Date(rawNow) : undefined;
  if (now && Number.isNaN(now.getTime())) {
    return {
      status: 400,
      body: { ok: false, error: { status: 'input-invalid', message: 'now must be an ISO timestamp.' } },
    };
  }
  const history = readHistory(payload);
  const result = await runAssistantTurn({ utterance, now, history });
  if (!result.ok) {
    const status = result.error.status === 'input-invalid' ? 400 : result.error.status === 'not-configured' ? 503 : 502;
    return { status, body: result };
  }
  return { status: 200, body: result };
}

function readHistory(payload: unknown): ChatMessage[] | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const raw = (payload as { history?: unknown }).history;
  if (!Array.isArray(raw)) return undefined;
  const history: ChatMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') continue;
    const text = content.trim();
    if (!text) continue;
    history.push({ role, content: text });
  }
  return history;
}
