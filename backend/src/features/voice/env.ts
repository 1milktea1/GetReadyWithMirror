// Loads ElevenLabs settings from backend/.env. A shell export of the same name wins.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ENV_KEYS = ['ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID'] as const;

export function voiceEnvPath(): string {
  return fileURLToPath(new URL('../../../.env', import.meta.url));
}

export function applyVoiceEnv(text: string, env: Record<string, string | undefined>): void {
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!ENV_KEYS.includes(key as (typeof ENV_KEYS)[number])) continue;
    if (env[key]) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    if (value) env[key] = value;
  }
}

export function loadVoiceEnv(env: NodeJS.ProcessEnv = process.env, path = voiceEnvPath()): void {
  try {
    applyVoiceEnv(readFileSync(path, 'utf8'), env);
  } catch {
    // A missing file is the not-configured state, not a crash.
  }
}
