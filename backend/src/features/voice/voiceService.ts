// Voice public service. Transcribes with ElevenLabs, then the assistant decides.
// This feature does not choose tools.

import { DEFAULT_VOICE_ID, RUSH_MODEL, transcribeAudio, synthesizeSpeech, VoiceProviderError } from './elevenLabs.ts';
import { loadVoiceEnv } from './env.ts';

const MAX_AUDIO_BYTES = 8_000_000;
const MAX_SPEECH = 2_000;

export type VoiceErrorStatus = 'not-configured' | 'external-provider-unavailable' | 'no-data' | 'input-invalid';

export interface VoiceError {
  status: VoiceErrorStatus;
  message: string;
}

export type TranscribeResponse = { ok: true; data: { text: string } } | { ok: false; error: VoiceError };
export type SpeakResponse = { ok: true; data: Uint8Array } | { ok: false; error: VoiceError };

export interface VoiceOptions {
  apiKey?: string;
  voiceId?: string;
  fetchFn?: typeof fetch;
  /** Rush keeps the same voice and uses the expressive model with a quicker, less even tone. */
  delivery?: 'normal' | 'rush';
  minutesLeft?: number;
}

function rushSpeed(minutesLeft: number | undefined): number {
  if (minutesLeft !== undefined && minutesLeft <= 5) return 1.25;
  if (minutesLeft !== undefined && minutesLeft <= 15) return 1.18;
  return 1.15;
}

function credentials(options: VoiceOptions): { apiKey: string; voiceId: string } | VoiceError {
  if (options.apiKey === undefined) loadVoiceEnv();
  const apiKey = (options.apiKey !== undefined ? options.apiKey : (process.env.ELEVENLABS_API_KEY ?? '')).trim();
  if (!apiKey) {
    return { status: 'not-configured', message: 'ELEVENLABS_API_KEY is not set. Add it to backend/.env.' };
  }
  const voiceId =
    (options.voiceId !== undefined ? options.voiceId : (process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID)).trim() ||
    DEFAULT_VOICE_ID;
  return { apiKey, voiceId };
}

export async function transcribe(audio: Uint8Array, mime: string, options: VoiceOptions = {}): Promise<TranscribeResponse> {
  if (audio.byteLength === 0) {
    return { ok: false, error: { status: 'no-data', message: 'No audio was captured.' } };
  }
  if (audio.byteLength > MAX_AUDIO_BYTES) {
    return { ok: false, error: { status: 'input-invalid', message: 'That recording is too long.' } };
  }
  const creds = credentials(options);
  if ('status' in creds) return { ok: false, error: creds };
  try {
    const text = await transcribeAudio(audio, mime, creds.apiKey, options.fetchFn);
    if (!text) return { ok: false, error: { status: 'no-data', message: 'No words were recognized.' } };
    return { ok: true, data: { text } };
  } catch (err) {
    if (err instanceof VoiceProviderError) {
      return { ok: false, error: { status: 'external-provider-unavailable', message: err.message } };
    }
    throw err;
  }
}

export async function speak(text: string, options: VoiceOptions = {}): Promise<SpeakResponse> {
  const spoken = text.trim();
  if (!spoken || spoken.length > MAX_SPEECH) {
    return { ok: false, error: { status: 'input-invalid', message: 'Speech text must be 1 to 2000 characters.' } };
  }
  const creds = credentials(options);
  if ('status' in creds) return { ok: false, error: creds };
  try {
    const delivery =
      options.delivery === 'rush'
        ? {
            modelId: RUSH_MODEL,
            voiceSettings: {
              stability: 0,
              similarity_boost: 0.65,
              speed: rushSpeed(options.minutesLeft),
            },
          }
        : undefined;
    return { ok: true, data: await synthesizeSpeech(spoken, creds.apiKey, creds.voiceId, options.fetchFn, delivery) };
  } catch (err) {
    if (err instanceof VoiceProviderError) {
      return { ok: false, error: { status: 'external-provider-unavailable', message: err.message } };
    }
    throw err;
  }
}
