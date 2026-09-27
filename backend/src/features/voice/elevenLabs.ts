// ElevenLabs transport. The only file that knows the provider's request shape.
// Speech-to-text: Scribe. Speech synthesis: Flash, for a short spoken reply.

const STT_URL = 'https://api.elevenlabs.io/v1/speech-to-text';
const TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
export const STT_MODEL = 'scribe_v2';
export const TTS_MODEL = 'eleven_flash_v2_5';
export const RUSH_MODEL = 'eleven_v3';
export const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';

export interface SpeechDelivery {
  modelId: string;
  voiceSettings?: {
    stability: number;
    similarity_boost: number;
    speed: number;
  };
}

export class VoiceProviderError extends Error {}

export async function transcribeAudio(
  audio: Uint8Array,
  mime: string,
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const boundary = `----grwm${crypto.randomUUID().replaceAll('-', '')}`;
  const head =
    `--${boundary}\r\nContent-Disposition: form-data; name="model_id"\r\n\r\n${STT_MODEL}\r\n` +
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="speech.webm"\r\n` +
    `Content-Type: ${mime || 'application/octet-stream'}\r\n\r\n`;
  const tail = `\r\n--${boundary}--\r\n`;
  const body = concat(new TextEncoder().encode(head), audio, new TextEncoder().encode(tail));

  let res: Response;
  try {
    res = await fetchFn(STT_URL, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'content-type': `multipart/form-data; boundary=${boundary}` },
      body,
    });
  } catch (err) {
    throw new VoiceProviderError(`ElevenLabs request failed: ${(err as Error).message}`);
  }
  if (!res.ok) throw new VoiceProviderError(await providerMessage(res));
  const payload = (await res.json()) as { text?: unknown };
  return typeof payload.text === 'string' ? payload.text.trim() : '';
}

export async function synthesizeSpeech(
  text: string,
  apiKey: string,
  voiceId: string,
  fetchFn: typeof fetch = fetch,
  delivery?: SpeechDelivery,
): Promise<Uint8Array> {
  const spoken = delivery ?? { modelId: TTS_MODEL };
  let res: Response;
  try {
    res = await fetchFn(`${TTS_URL}/${encodeURIComponent(voiceId)}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({
        text,
        model_id: spoken.modelId,
        ...(spoken.voiceSettings ? { voice_settings: spoken.voiceSettings } : {}),
      }),
    });
  } catch (err) {
    throw new VoiceProviderError(`ElevenLabs request failed: ${(err as Error).message}`);
  }
  if (!res.ok) throw new VoiceProviderError(await providerMessage(res));
  return new Uint8Array(await res.arrayBuffer());
}

async function providerMessage(res: Response): Promise<string> {
  const fallback = `ElevenLabs returned HTTP ${res.status}`;
  try {
    const payload = (await res.json()) as { detail?: { message?: unknown; code?: unknown } };
    const message = payload.detail?.message;
    if (typeof message === 'string' && message.trim()) return message.trim();
  } catch {
    // Body was not JSON.
  }
  return fallback;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}
