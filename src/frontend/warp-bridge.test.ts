import { expect, test } from "bun:test";
import type { WarpSeen } from "../shared/protocol.js";
import { STUDIO_FORMAT } from "../shared/format.js";
import { readWarpState, WARP_STATE, WARP_STATE_REQUEST, warpStatus } from "../shared/warp-state.js";
import { connectWarp } from "./warp-bridge.js";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const state = (extra: Record<string, unknown> = {}) => ({ version: 1, provider: "warp", chatId: "x", messageId: null, you: { name: "A" }, people: [], ...extra });

test("asks Warp, reads rulesetFormat from its answer", async () => {
  const target = new EventTarget();
  const seen: WarpSeen[] = [];
  let asked = 0;
  target.addEventListener(WARP_STATE_REQUEST, (e) => {
    asked++;
    expect((e as CustomEvent).detail).toEqual({ version: 1 });
    target.dispatchEvent(new CustomEvent(WARP_STATE, { detail: state({ rulesetFormat: 2 }) }));
  });
  const bridge = connectWarp((s) => seen.push(s), { target, timeoutMs: 10 });
  bridge.request();
  await wait(30);
  expect(asked).toBe(1);
  expect(seen).toEqual([{ present: true, format: 2 }]);
  bridge.stop();
});

test("no answer in time = not running; a later answer still counts", async () => {
  const target = new EventTarget();
  const seen: WarpSeen[] = [];
  const bridge = connectWarp((s) => seen.push(s), { target, timeoutMs: 10 });
  expect(bridge.seen()).toBeNull();
  bridge.request();
  await wait(30);
  expect(seen).toEqual([{ present: false, format: null }]);
  target.dispatchEvent(new CustomEvent(WARP_STATE, { detail: state() }));
  expect(seen.at(-1)).toEqual({ present: true, format: null });
  bridge.stop();
  target.dispatchEvent(new CustomEvent(WARP_STATE, { detail: state({ rulesetFormat: 2 }) }));
  expect(seen).toHaveLength(2);
});

test("events that are not Warp's state are ignored", () => {
  expect(readWarpState(null)).toBeNull();
  expect(readWarpState({ version: 2, provider: "warp" })).toBeNull();
  expect(readWarpState({ version: 1, provider: "other" })).toBeNull();
  expect(readWarpState(state({ rulesetFormat: "2" }))).toEqual({ present: true, format: null });
  expect(readWarpState(state({ rulesetFormat: 2.5 }))).toEqual({ present: true, format: null });
});

test("the five status lines, and which one blocks Install", () => {
  const f = STUDIO_FORMAT;
  const rows = [null, { present: false, format: null }, { present: true, format: null }, { present: true, format: f - 1 }, { present: true, format: f + 1 }, { present: true, format: f }]
    .map((s) => { const w = warpStatus(s, f); return [w.kind, w.blocks, w.text]; });
  expect(rows).toEqual([
    ["waiting", false, "Looking for Warp…"],
    ["absent", false, "Warp is not running here. Studio still saves rules; Warp reads them when it is installed."],
    ["old", true, "This Warp is older than the ruleset format Studio writes. Update Warp before installing."],
    ["old", true, "This Warp is older than the ruleset format Studio writes. Update Warp before installing."],
    ["newer", false, "Warp is newer than this Studio. Update Studio: its checks may miss new keys."],
    ["ok", false, `Warp ✓ (ruleset format ${f})`],
  ]);
});
