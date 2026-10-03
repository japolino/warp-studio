import { expect, test } from "bun:test";
import * as warp from "./warp.js";

test("every name Studio takes from Warp is there", () => {
  const names = [
    "loadRuleset", "isRulesetBookName", "isRulesetEntryTitle", "lintRuleset", "REMOVED_KEYS", "REMOVED_EFFECT_NAMES", "REMOVED_FORMULA_NAMES",
    "RULESET_FORMAT", "TOP_LEVEL_KEYS", "splitRulebook", "joinRulebook", "PART_LABELS", "PART_CONTENTS", "PART_OF_KEY", "partForIssue",
    "REFERENCE", "DESIGN_GUIDE", "TEMPLATES", "getTemplate", "withCharacter", "looksLikeScenario", "compile", "identifiers", "evalBool",
    "initialState", "makeEnv", "d20Odds", "actionOdds", "buildHud", "buildChoices", "stateDigest", "runLoopSim", "createLoopSim",
    "simulateContest", "statAdd", "publishRulebook", "isInstalledRulebook",
  ] as const;
  for (const n of names) expect({ n, defined: (warp as Record<string, unknown>)[n] !== undefined }).toEqual({ n, defined: true });
});

test("every template Warp ships loads with no errors", () => {
  expect(warp.TEMPLATES.length).toBeGreaterThanOrEqual(2);
  for (const t of warp.TEMPLATES) {
    const { ruleset, issues } = warp.loadRuleset(t.parts.map((p, i) => ({ label: `warp-ruleset · ${p.label}`, content: p.yaml, order: i })));
    expect({ id: t.id, loads: !!ruleset, errors: issues.filter((i) => i.level === "error") }).toEqual({ id: t.id, loads: true, errors: [] });
  }
});

test("the pin is a full GitHub commit, never a local path", () => {
  expect(warp.WARP_PIN).toMatch(/^github:japolino\/warp#[0-9a-f]{40}$/);
  expect(warp.WARP_PIN_SHORT).toMatch(/^warp#[0-9a-f]{7}$/);
  expect(warp.STAMP).toEqual({ format: warp.RULESET_FORMAT, by: `warp_studio@${warp.STUDIO_VERSION}` });
});

test("Warp's ruleset format is the one this Studio is written for", () => {
  // If this fails: Warp's ruleset format changed. Review the audit, the Deepen texts and the guide, then raise STUDIO_FORMAT.
  expect(warp.RULESET_FORMAT).toBe(warp.STUDIO_FORMAT);
});
