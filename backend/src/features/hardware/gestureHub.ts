import type { SwipeDirection } from './swipe.ts';

type SwipeListener = (gesture: SwipeDirection) => void;

const listeners = new Set<SwipeListener>();

export function publishSwipe(gesture: SwipeDirection): void {
  for (const listener of listeners) listener(gesture);
}

export function subscribeSwipe(listener: SwipeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
