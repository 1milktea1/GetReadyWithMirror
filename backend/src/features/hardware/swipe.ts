export type SwipeDirection = 'left' | 'right';

const SWIPE_LINE = /^SWIPE:\s*(LEFT|RIGHT)$/i;

export function parseSwipeLine(line: string): SwipeDirection | null {
  const match = SWIPE_LINE.exec(line.trim());
  return match ? (match[1].toLowerCase() as SwipeDirection) : null;
}

export function parseSwipePayload(body: unknown): SwipeDirection | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as { gesture?: unknown; line?: unknown };
  if (typeof record.gesture === 'string') {
    const gesture = record.gesture.trim().toLowerCase();
    if (gesture === 'left' || gesture === 'right') return gesture;
    return parseSwipeLine(record.gesture);
  }
  if (typeof record.line === 'string') return parseSwipeLine(record.line);
  return null;
}
