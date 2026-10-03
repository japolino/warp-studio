// Studio must never suggest a system Warp no longer runs. Every text that
// suggests rules (the workflow, the skill, the README, the Fix/Deepen prompts)
// is checked against Warp's own lists of removed keys and effects:
// (1) every YAML example in them loads with no "removed from Warp" warning;
// (2) prose never names a removed key as a key (in backticks with a colon, or as a YAML line).
// A plain word match would be wrong: `body` is a removed key but also a stat id.
// The legacy banner names removed keys on purpose and is not checked here.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { DEEPEN_TASK, FIX_TASK, STUDIO_RULES } from "./backend/revise.js";
import { INSTRUCTIONS, TOOLS } from "./tools/mcp.js";
import { USAGE } from "./tools/commands.js";
import { workflowText } from "./tools/rulebook-tools.js";
import { checkParts, fromText } from "./rulebook/workspace.js";
import { auditRuleset } from "./audit/audit.js";
import { REMOVED_EFFECT_NAMES, REMOVED_FORMULA_NAMES, REMOVED_KEYS, TEMPLATES } from "./warp.js";
import { fromTemplate } from "./rulebook/workspace.js";

const file = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

/** Every finding's text and fix, from the fixtures and the templates. */
function findingTexts(): string {
  const rulesets = [
    ...["dead-parts.yaml", "thin-story.yaml", "balance.yaml"].map((n) => checkParts(fromText(file(`src/fixtures/${n}`))).ruleset!),
    ...TEMPLATES.map((x) => checkParts(fromTemplate(x.id, { name: "Mira" })!).ruleset!),
  ];
  return [...new Set(rulesets.flatMap((r) => auditRuleset(r).findings.flatMap((f) => [f.text, f.fix])))].join("\n");
}

const TEXTS: Record<string, string> = {
  "Check findings": findingTexts(),
  workflow: workflowText(),
  "skills/warp-rulebook/SKILL.md": file("skills/warp-rulebook/SKILL.md"),
  "README.md": file("README.md"),
  "Studio's rules": STUDIO_RULES,
  "Deepen task": DEEPEN_TASK,
  "Fix task": FIX_TASK,
  "MCP instructions": INSTRUCTIONS,
  "MCP tools": TOOLS.map((t) => t.description).join("\n"),
  "CLI usage": USAGE,
};

const removed = [...new Set([...Object.keys(REMOVED_KEYS), ...REMOVED_EFFECT_NAMES])];
const yamlBlocks = (text: string) => [...text.matchAll(/```ya?ml\n([\s\S]*?)```/g)].map((m) => m[1]);

/** Removed keys the prose names as keys: `quests:` in backticks, or a top-level `quests:` line outside code blocks. */
function namedRemoved(text: string): string[] {
  const prose = text.replace(/```[\s\S]*?```/g, "");
  const keys = removed.filter((k) => text.includes(`\`${k}:`) || new RegExp(`^${k}:`, "m").test(prose));
  const formulas = REMOVED_FORMULA_NAMES.filter((f) => new RegExp(`\\b${f}\\(\\s*'`).test(text)).map((f) => `${f}()`);
  return [...keys, ...formulas];
}

describe("Studio's texts never suggest a removed system", () => {
  for (const [name, text] of Object.entries(TEXTS)) {
    test(name, () => {
      expect({ name, named: namedRemoved(text) }).toEqual({ name, named: [] });
      for (const y of yamlBlocks(text)) {
        const warned = checkParts(fromText(y)).issues.filter((i) => /removed from Warp/.test(i.message));
        expect({ name, warned }).toEqual({ name, warned: [] });
      }
    });
  }

  test("the guard catches a removed key, but not a stat that shares its name", () => {
    expect(namedRemoved("Add `perks:` to reward play.")).toEqual(["perks"]);
    expect(namedRemoved("Then:\nperks:\n  tough: {}\n")).toEqual(["perks"]);
    expect(namedRemoved("stats:\n  body: { kind: attribute }\nPerks are gone; a body stat is fine.")).toEqual([]);
    expect(namedRemoved("Read wearing('coat') in a when.")).toEqual(["wearing()"]);
  });
});
