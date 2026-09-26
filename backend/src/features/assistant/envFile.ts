// Loads backend/.env for the assistant. Only XAI_API_KEY and XAI_MODEL are applied.
// Existing process environment wins, so a shell export is not overwritten by the file.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ENV_KEYS = ['XAI_API_KEY', 'XAI_MODEL'] as const;

export function assistantEnvPath(): string {
  return fileURLToPath(new URL('../../../.env', import.meta.url));
}

export function applyEnvFile(text: string, env: Record<string, string | undefined>): void {
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

export function loadAssistantEnv(env: NodeJS.ProcessEnv = process.env, path = assistantEnvPath()): void {
  try {
    applyEnvFile(readFileSync(path, 'utf8'), env);
  } catch {
    // A missing file is the not-configured state, not a crash.
  }
}
