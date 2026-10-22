// Preview loop on / off, shared by every player (YouTube, Instagram, X, Twitch) and the toggle button.
// On: the clip plays from start to end again and again. Off: it plays once and stops at the end; the next play starts from the clip start.
// Read at the moment the clip end is reached, so players don't re-render when it changes. Remembered per browser.
import { useSyncExternalStore } from 'react';

const KEY = 'clipflow_loop_preview';
const listeners = new Set<() => void>();

let loop = (() => {
  try { return localStorage.getItem(KEY) !== '0'; } catch { return true; }   // default: on (previous behaviour)
})();

export const loopPreference = {
  get: () => loop,
  set(value: boolean) {
    loop = value;
    try { localStorage.setItem(KEY, value ? '1' : '0'); } catch {}
    console.log(`[ClipFlow editor] preview loop ${value ? 'on' : 'off'}`);
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },
};

export function useLoopPreference(): [boolean, (v: boolean) => void] {
  const value = useSyncExternalStore(loopPreference.subscribe, loopPreference.get);
  return [value, loopPreference.set];
}
