// Warp's public state event (warp-state-v1), read for one thing: which ruleset
// format the running Warp reads (`rulesetFormat`, optional). Asking with
// warp-state-request-v1 makes Warp send it again. Without Warp nothing arrives.

import type { WarpSeen } from "./protocol.js";

export const WARP_STATE = "warp-state-v1";
export const WARP_STATE_REQUEST = "warp-state-request-v1";

/** What Studio needs from a warp-state-v1 detail; null when it isn't one. */
export function readWarpState(detail: unknown): WarpSeen | null {
  if (!detail || typeof detail !== "object") return null;
  const d = detail as Record<string, unknown>;
  if (d.version !== 1 || d.provider !== "warp") return null;
  const f = d.rulesetFormat;
  return { present: true, format: typeof f === "number" && Number.isInteger(f) && f > 0 ? f : null };
}

export interface WarpStatus {
  kind: "waiting" | "absent" | "old" | "newer" | "ok";
  text: string;
  /** Install is refused. */
  blocks: boolean;
}

/** The one status line about Warp, and whether it blocks Install. `seen` null = still waiting for an answer. */
export function warpStatus(seen: WarpSeen | null, studioFormat: number): WarpStatus {
  if (!seen) return { kind: "waiting", text: "Looking for Warp…", blocks: false };
  if (!seen.present) return { kind: "absent", text: "Warp is not running here. Studio still saves rules; Warp reads them when it is installed.", blocks: false };
  if (seen.format === null || seen.format < studioFormat) return { kind: "old", text: "This Warp is older than the ruleset format Studio writes. Update Warp before installing.", blocks: true };
  if (seen.format > studioFormat) return { kind: "newer", text: "Warp is newer than this Studio. Update Studio: its checks may miss new keys.", blocks: false };
  return { kind: "ok", text: `Warp ✓ (ruleset format ${seen.format})`, blocks: false };
}
