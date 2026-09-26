import type { IncomingMessage, ServerResponse } from 'node:http';

import { speak, transcribe } from './voiceService.ts';

export async function handleTranscribe(
  audio: Uint8Array,
  mime: string,
): Promise<{ status: number; body: unknown; audio?: undefined }> {
  const result = await transcribe(audio, mime);
  if (!result.ok) return { status: statusFor(result.error.status), body: result };
  return { status: 200, body: result };
}

export async function handleSpeak(
  text: string,
  delivery: 'normal' | 'rush' = 'normal',
  minutesLeft?: number,
): Promise<{ status: number; body?: unknown; audio?: Uint8Array }> {
  const result = await speak(text, { delivery, minutesLeft });
  if (!result.ok) return { status: statusFor(result.error.status), body: result };
  return { status: 200, audio: result.data };
}

export async function readLimitedBody(req: IncomingMessage, limit: number): Promise<Buffer | 'too-large'> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > limit) return 'too-large';
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

function statusFor(status: string): number {
  if (status === 'not-configured') return 503;
  if (status === 'input-invalid') return 400;
  if (status === 'no-data') return 422;
  return 502;
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

export function sendAudio(res: ServerResponse, audio: Uint8Array): void {
  res.writeHead(200, { 'content-type': 'audio/mpeg' });
  res.end(audio);
}
