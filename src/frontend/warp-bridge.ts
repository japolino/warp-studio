// Asking Warp which ruleset format it reads. Warp publishes warp-state-v1 as a
// window event whenever its state changes, and again when asked with
// warp-state-request-v1. No answer within a moment = Warp is not running here
// (a later answer still counts: Warp may load after Studio).

import type { WarpSeen } from "../shared/protocol.js";
import { readWarpState, WARP_STATE, WARP_STATE_REQUEST } from "../shared/warp-state.js";

export interface WarpBridge {
  /** Ask Warp to send its state; after `timeoutMs` without any answer, Warp counts as absent. */
  request(): void;
  /** What was seen: null while still waiting for the first answer or timeout. */
  seen(): WarpSeen | null;
  stop(): void;
}

export function connectWarp(onSeen: (s: WarpSeen) => void, o: { target?: EventTarget; timeoutMs?: number } = {}): WarpBridge {
  const target = o.target ?? window;
  const timeoutMs = o.timeoutMs ?? 1500;
  let seen: WarpSeen | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const set = (s: WarpSeen) => {
    const same = seen && seen.present === s.present && seen.format === s.format;
    seen = s;
    if (!same) onSeen(s);
  };
  const listener = (e: Event) => {
    const s = readWarpState((e as CustomEvent).detail);
    if (!s) return;
    if (timer) { clearTimeout(timer); timer = null; }
    set(s);
  };
  target.addEventListener(WARP_STATE, listener);
  return {
    request() {
      if (!timer && !seen?.present) timer = setTimeout(() => { timer = null; if (!seen?.present) set({ present: false, format: null }); }, timeoutMs);
      try { target.dispatchEvent(new CustomEvent(WARP_STATE_REQUEST, { detail: { version: 1 } })); } catch { /* no window */ }
    },
    seen: () => seen,
    stop() {
      if (timer) clearTimeout(timer);
      target.removeEventListener(WARP_STATE, listener);
    },
  };
}
