import assert from 'node:assert/strict';
import { test } from 'node:test';

import { handleAssistantTurn } from './assistantHttp.ts';

test('assistant HTTP requires an utterance string', async () => {
  const missing = await handleAssistantTurn({});
  assert.equal(missing.status, 400);
  const empty = await handleAssistantTurn({ utterance: 12 });
  assert.equal(empty.status, 400);
});

test('assistant HTTP rejects a bad clock before calling Grok', async () => {
  const result = await handleAssistantTurn({ utterance: 'Hello', now: 'not-a-date' });
  assert.equal(result.status, 400);
});
