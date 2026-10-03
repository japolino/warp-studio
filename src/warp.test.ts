import { expect, test } from "bun:test";
import * as warp from "./warp.js";

test("every name Studio takes from Warp is there", () => {
  const names = [
    "loadRuleset", "isRulesetBookName", "isRulesetEntryTitle", "lintRuleset", "REMOVED_KEYS", "REMOVED_EFFECTS",
    "splitRulebook", "joinRulebook", "PART_LABELS", "PART_CONTENTS", "partForIssue", "REFERENCE", "DESIGN_GUIDE",
    "TEMPLATES", "getTemplate", "withCharacter", "looksLikeScenario", "initialState", "buildHud", "buildChoices",
    "stateDigest", "publishRulebook", "isInstalledRulebook",
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
  expect(warp.STAMP.by).toBe(`warp_studio@${warp.STUDIO_VERSION}`);
});

// Until Warp exports RULESET_FORMAT (the new format), the engine is format 1 and this waits.
test.skipIf(!warp.ENGINE_EXPORTS_FORMAT)("Warp's ruleset format is the one this Studio is written for", () => {
  // If this fails: Warp's ruleset format changed. Review the audit, the Deepen texts and the guide, then raise STUDIO_FORMAT.
  expect(warp.ENGINE_FORMAT).toBe(warp.STUDIO_FORMAT);
});
