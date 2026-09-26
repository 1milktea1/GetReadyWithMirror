import { runAssistantTurn } from '../assistant/assistantService.ts';

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
  const result = await runAssistantTurn({ utterance, now });
  if (!result.ok) {
    const status = result.error.status === 'input-invalid' ? 400 : result.error.status === 'not-configured' ? 503 : 502;
    return { status, body: result };
  }
  return { status: 200, body: result };
}
