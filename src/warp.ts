// The seam to Warp's engine. This is the only file in Warp Studio that imports
// from `warp/…` (a pinned devDependency, bundled into every output). When Warp
// renames something, only this file changes.
//
// Stage note: the pin is Warp `core` before the new ruleset format lands. Names
// that Warp does not export yet are read defensively here (see `ENGINE_FORMAT`).

import pkg from "../package.json";
import * as rulesetModule from "warp/src/engine/ruleset.js";

export { loadRuleset, isRulesetBookName, isRulesetEntryTitle, type RulesetPart, type LoadResult } from "warp/src/engine/loader.js";
export { lintRuleset } from "warp/src/engine/lint.js";
export type { Issue, Ruleset } from "warp/src/engine/ruleset.js";
export { REMOVED_KEYS, REMOVED_EFFECTS } from "warp/src/engine/ruleset.js";
export { splitRulebook, joinRulebook, type RulebookPart } from "warp/src/engine/rulebook.js";
export { PART_LABELS, PART_CONTENTS, partForIssue, REFERENCE, DESIGN_GUIDE } from "warp/src/engine/reference.js";
export { TEMPLATES, getTemplate, withCharacter, looksLikeScenario, type Template } from "warp/src/engine/templates/index.js";
export { initialState } from "warp/src/engine/state.js";
export { buildHud, buildChoices, stateDigest } from "warp/src/engine/view.js";
// Lorebook I/O (host-only: these call the global `spindle`, which is Studio's own API object in its backend).
export { publishRulebook, isInstalledRulebook } from "warp/src/backend/rulebook-install.js";

/** The ruleset format this Studio release is written for. */
export const STUDIO_FORMAT = 2;

/**
 * The ruleset format of the pinned engine. Warp exports `RULESET_FORMAT` from the new format on;
 * an engine without it is the format before that (1).
 */
export const ENGINE_FORMAT: number = (() => {
  const v = (rulesetModule as Record<string, unknown>).RULESET_FORMAT;
  return typeof v === "number" ? v : 1;
})();

/** True once the pinned engine exports its format number. */
export const ENGINE_EXPORTS_FORMAT = typeof (rulesetModule as Record<string, unknown>).RULESET_FORMAT === "number";

export const STUDIO_VERSION: string = pkg.version;

/** The engine pin, as written in package.json ("github:japolino/warp#<sha>"). */
export const WARP_PIN: string = pkg.devDependencies.warp;

/** "warp#8f61ee9" — the short form shown in `--version` and the About line. */
export const WARP_PIN_SHORT: string = (() => {
  const m = /#([0-9a-f]{7,40})$/i.exec(WARP_PIN);
  return m ? `warp#${m[1].slice(0, 7)}` : WARP_PIN;
})();

/** What Studio writes into an installed book's metadata (`metadata.warp`). */
export const STAMP = { format: ENGINE_FORMAT, by: `warp_studio@${pkg.version}` };
