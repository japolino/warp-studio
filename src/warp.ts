// The seam to Warp's engine. This is the only file in Warp Studio that imports
// from `warp/…` (a pinned devDependency, bundled into every output). Warp keeps
// the same list in its own src/studio-api.ts, so Warp's type check guards it.
// When Warp renames something, only this file changes.

import pkg from "../package.json";
import { RULESET_FORMAT, statAdd, type GameState, type KindDef, type Ruleset } from "warp/src/studio-api.js";

export {
  loadRuleset, isRulesetBookName, isRulesetEntryTitle, lintRuleset, REMOVED_KEYS, REMOVED_EFFECT_NAMES, REMOVED_FORMULA_NAMES,
  RULESET_FORMAT, TOP_LEVEL_KEYS, DIFFICULTIES, TIERS, splitRulebook, joinRulebook, PART_LABELS, PART_CONTENTS, partForIssue,
  REFERENCE, DESIGN_GUIDE, TEMPLATES, getTemplate, withCharacter, looksLikeScenario, compile, identifiers, evalBool, initialState,
  makeEnv, d20Odds, buildHud, buildChoices, stateDigest, runLoopSim, createLoopSim, simulateContest, statAdd,
  type RulesetPart, type LoadResult, type Issue, type Ruleset, type StatDef, type Band, type Effect, type ActionDef, type KindDef,
  type GoalDef, type Difficulty, type Tier, type GameState, type RulebookPart, type Template, type LoopOptions, type LoopReport,
  type LoopGate, type LoopCheckRow, type LoopContestRow, type ContestSim,
} from "warp/src/studio-api.js";
export { odds as actionOdds } from "warp/src/studio-api.js";
/** Which section each top-level key belongs in. */
export { PART_OF_KEY } from "warp/src/engine/rulebook.js";
// Lorebook I/O (host-only: these call the global `spindle`, which is Studio's own API object in its backend).
export { attachedRulebooks, publishRulebook, isInstalledRulebook } from "warp/src/backend/rulebook-install.js";
export { STUDIO_FORMAT } from "./shared/format.js";

/** The ruleset format of the pinned engine. */
export const ENGINE_FORMAT: number = RULESET_FORMAT;

export const STUDIO_VERSION: string = pkg.version;

/** The engine pin, as written in package.json ("github:japolino/warp#<sha>"). */
export const WARP_PIN: string = pkg.devDependencies.warp;

/** "warp#fd75881" — the short form shown in `--version` and the About line. */
export const WARP_PIN_SHORT: string = (() => {
  const m = /#([0-9a-f]{7,40})$/i.exec(WARP_PIN);
  return m ? `warp#${m[1].slice(0, 7)}` : WARP_PIN;
})();

/** What Studio writes into an installed book's metadata (`metadata.warp`). */
export const STAMP = { format: RULESET_FORMAT, by: `warp_studio@${pkg.version}` };

/** What the player's best stat for a contest kind adds to the d20 in this state. */
export function contestAddAtStart(r: Ruleset, s: GameState, kind: KindDef): number {
  return Math.max(0, ...kind.stats.map((st) => statAdd(r, s, st)));
}
