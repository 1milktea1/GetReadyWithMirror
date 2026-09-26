import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fallbackRushLine, writeRushLine } from './rushLine.ts';

test('a rush line falls back to the event and the minutes when Grok is unavailable', async () => {
  const line = await writeRushLine(
    { title: 'Dinner reservation', minutesLeft: 15, startLabel: '5:00 PM' },
    { apiKey: '' },
  );
  assert.equal(line, fallbackRushLine('Dinner reservation', 15));
  assert.match(line, /15 minutes/);
  assert.match(line, /get ready/i);
  assert.doesNotMatch(line, /professor/);
  assert.match(fallbackRushLine('Research group standup', 30, 'Columbia University'), /lab professor/);
  assert.match(fallbackRushLine('Research group standup', 30, 'Columbia University'), /Columbia University/);
  assert.doesNotMatch(line, /fixture|demo|grok/i);
});
