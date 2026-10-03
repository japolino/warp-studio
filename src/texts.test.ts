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
import { REMOVED_EFFECTS, REMOVED_KEYS } from "./warp.js";

const file = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const TEXTS: Record<string, string> = {
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

const removed = [...new Set([...Object.keys(REMOVED_KEYS), ...Object.keys(REMOVED_EFFECTS)])];
const yamlBlocks = (text: string) => [...text.matchAll(/```ya?ml\n([\s\S]*?)```/g)].map((m) => m[1]);

/** Removed keys the prose names as keys: `quests:` in backticks, or a top-level `quests:` line outside code blocks. */
function namedRemoved(text: string): string[] {
  const prose = text.replace(/```[\s\S]*?```/g, "");
  return removed.filter((k) => text.includes(`\`${k}:`) || new RegExp(`^${k}:`, "m").test(prose));
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
  });
});
