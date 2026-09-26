import { test } from 'node:test';
import assert from 'node:assert/strict';

import { applyEnvFile } from './envFile.ts';

test('applyEnvFile reads the xAI key and does not override or leak other names', () => {
  const env: Record<string, string | undefined> = { XAI_MODEL: 'already-set' };
  applyEnvFile(
    `
      # comment
      XAI_API_KEY="quoted-key"
      XAI_MODEL=grok-other
      ELEVENLABS_API_KEY=do-not-load
      NOT A LINE
    `,
    env,
  );
  assert.equal(env.XAI_API_KEY, 'quoted-key');
  assert.equal(env.XAI_MODEL, 'already-set');
  assert.equal('ELEVENLABS_API_KEY' in env, false);
});
