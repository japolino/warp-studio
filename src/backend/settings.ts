// Studio's settings, per user: the helper connection for Fix and Deepen, the
// writing temperature, the in-app playtest size, and whether thin spots show.

import { DEFAULT_SETTINGS, type Settings } from "../shared/protocol.js";
import { host } from "./host.js";

const cache = new Map<string, Settings>();
const writes = new Map<string, Promise<void>>();
const key = (userId?: string) => userId ?? "_";

const int = (v: unknown, min: number, max: number, def: number) => {
  const n = typeof v === "string" && v.trim() ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def;
};
const bool = (v: unknown, def: boolean) => (v === true || v === "true" ? true : v === false || v === "false" ? false : def);

/** Saved settings and settings sent from the page are both untrusted. */
export function normalizeSettings(value: unknown): Settings {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    helperConnectionId: typeof raw.helperConnectionId === "string" ? raw.helperConnectionId.trim().slice(0, 200) : DEFAULT_SETTINGS.helperConnectionId,
    creative: bool(raw.creative, DEFAULT_SETTINGS.creative),
    playtestTurns: int(raw.playtestTurns, 5, 200, DEFAULT_SETTINGS.playtestTurns),
    playtestSeeds: int(raw.playtestSeeds, 1, 200, DEFAULT_SETTINGS.playtestSeeds),
    showThin: bool(raw.showThin, DEFAULT_SETTINGS.showThin),
  };
}

export async function getSettings(userId?: string): Promise<Settings> {
  const hit = cache.get(key(userId));
  if (hit) return hit;
  let stored: unknown = {};
  try { stored = await host().userStorage.getJson("settings.json", { fallback: {}, userId }); } catch { /* first run */ }
  const s = normalizeSettings(stored);
  cache.set(key(userId), s);
  return s;
}

/** Writes one at a time per user, so two quick changes can't undo each other. */
export async function patchSettings(patch: Partial<Settings>, userId?: string): Promise<Settings> {
  let result!: Settings;
  const k = key(userId);
  const op = (writes.get(k) ?? Promise.resolve()).then(async () => {
    const next = normalizeSettings({ ...(await getSettings(userId)), ...(patch && typeof patch === "object" ? patch : {}) });
    await host().userStorage.setJson("settings.json", next, { indent: 2, userId });
    cache.set(k, next);
    result = next;
  });
  const tail = op.catch(() => {});
  writes.set(k, tail);
  void tail.then(() => { if (writes.get(k) === tail) writes.delete(k); });
  await op;
  return result;
}

/** Forget cached settings (tests). */
export function clearSettingsCache() { cache.clear(); }
