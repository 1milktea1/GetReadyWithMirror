import type { Request, Response } from 'express';
import { publishSwipe, subscribeSwipe } from './gestureHub.ts';
import { parseSwipePayload } from './swipe.ts';

export function handleGesturePost(body: unknown, res: Response): void {
  const gesture = parseSwipePayload(body);
  if (!gesture) {
    res.status(400).json({
      ok: false,
      error: { status: 'input-invalid', message: 'gesture must be left or right.' },
    });
    return;
  }
  publishSwipe(gesture);
  res.status(204).end();
}

export function handleGestureStream(req: Request, res: Response): void {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  res.write(': connected\n\n');

  const stop = subscribeSwipe((gesture) => {
    res.write(`data: ${JSON.stringify({ gesture, timestamp: new Date().toISOString() })}\n\n`);
  });

  req.on('close', () => {
    stop();
    res.end();
  });
}
