import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { checkParts, fromTemplate, fromText } from "../rulebook/workspace.js";
import { PART_OF_KEY, TEMPLATES, type Ruleset } from "../warp.js";
import { auditRuleset, scoreOf, SYSTEMS, withWaivers, type Finding } from "./audit.js";

const load = (text: string): Ruleset => {
  const c = checkParts(fromText(text));
  expect(c.errors).toBe(0);
  return c.ruleset!;
};
const fixture = (name: string) => load(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8"));
const ids = (fs: Finding[]) => fs.map((f) => f.id);

describe("each finding fires on its fixture", () => {
  test("dead parts: one gap per declared thing that can never matter", () => {
    const rep = auditRuleset(fixture("dead-parts.yaml"));
    const gaps = ids(rep.findings.filter((f) => f.severity === "gap")).sort();
    expect(gaps).toEqual([
      "action-dead:stare", "cond-never:cursed", "contest-never", "flag-unset:lever", "item-dead:pebble", "item-unobtainable:key",
      "money-no-income", "money-no-spending", "rel-frozen:trust", "rel-no-bands:trust", "secret-stuck:past", "skill-unused:grit",
      "stat-static:idle", "tag-dead:shrug", "tags-few",
    ]);
    expect(ids(rep.findings)).toEqual(expect.arrayContaining(["kind-free:fight", "kind-flat:fight", "flag-unread:door_open", "stat-unread:idle", "goal-no-stakes:escape", "tags-no-risk"]));
  });

  test("a thin story: People, Choices and Growth thin spots, no gaps; checks and conflict not used", () => {
    const rep = auditRuleset(fixture("thin-story.yaml"));
    expect(ids(rep.findings).sort()).toEqual([
      "goals-none", "people-no-secret", "rel-no-cap:affection", "rel-no-say:affection", "rel-no-voice:affection", "scene-clock-fixed", "taper-off",
    ]);
    expect(rep.findings.every((f) => f.severity === "thin")).toBe(true);
    const by = Object.fromEntries(rep.systems.map((s) => [s.id, s.score]));
    expect(by.checks).toBeNull();
    expect(by.conflict).toBeNull();
    expect(by.scene).toBeGreaterThan(0);
  });

  test("balance: odds, drift, a turn-one rule and an unwinnable contest kind", () => {
    const rep = auditRuleset(fixture("balance.yaml"));
    expect(ids(rep.findings.filter((f) => f.severity === "balance")).sort()).toEqual(["contest-odds:duel", "drift:energy", "odds:leap", "trig:tired"]);
    expect(rep.findings.find((f) => f.id === "odds:leap")!.text).toBe('"Leap the chasm" succeeds 5% of the time at the start.');
  });

  test("nothing from the dead-parts list fires on the other fixtures", () => {
    const dead = new Set(ids(auditRuleset(fixture("dead-parts.yaml")).findings.filter((f) => f.severity === "gap")));
    for (const name of ["thin-story.yaml", "balance.yaml"]) {
      const other = ids(auditRuleset(fixture(name)).findings);
      expect({ name, both: other.filter((id) => dead.has(id)) }).toEqual({ name, both: [] });
    }
  });
});

describe("the six systems", () => {
  test("every finding names one of the six systems and a real section", () => {
    const parts = new Set<string>(Object.values(PART_OF_KEY));
    const systems = new Set(SYSTEMS.map((s) => s.id));
    for (const name of ["dead-parts.yaml", "thin-story.yaml", "balance.yaml"]) {
      for (const f of auditRuleset(fixture(name)).findings) {
        expect({ id: f.id, system: systems.has(f.system), part: parts.has(f.part), text: !!f.text, fix: !!f.fix }).toEqual({ id: f.id, system: true, part: true, text: true, fix: true });
      }
    }
  });

  test("a score per system: 100 with nothing found, lower per finding (gap 1, thin and balance 0.4)", () => {
    const f = (severity: Finding["severity"]): Finding => ({ id: "x", system: "scene", severity, part: "core", text: "t", fix: "f" });
    expect(scoreOf([], 5)).toBe(100);
    expect(scoreOf([f("gap")], 5)).toBe(80);
    expect(scoreOf([f("thin"), f("balance")], 5)).toBe(84);
    expect(scoreOf([f("gap"), f("gap"), f("gap")], 2)).toBe(0);
  });

  test("a waiver ('Leave as is') closes a finding but keeps the score", () => {
    const rep = auditRuleset(fixture("thin-story.yaml"));
    const w = withWaivers(rep, { "taper-off": { reason: "repeats are the point here" } });
    expect(w.open).toBe(rep.findings.length - 1);
    expect(w.findings.find((x) => x.id === "taper-off")!.waived).toBe("repeats are the point here");
  });

  test("Warp's templates load with no gap in the systems they use", () => {
    for (const t of TEMPLATES) {
      const c = checkParts(fromTemplate(t.id, { name: "Mira" })!);
      const gaps = auditRuleset(c.ruleset!).findings.filter((f) => f.severity === "gap");
      expect({ t: t.id, gaps: ids(gaps) }).toEqual({ t: t.id, gaps: [] });
    }
  });

  test("a story template shows Checks and Conflict as not used", () => {
    const story = TEMPLATES.map((t) => checkParts(fromTemplate(t.id, { name: "Mira" })!).ruleset!).find((r) => r.style === "story")!;
    expect(story).toBeDefined();
    const by = Object.fromEntries(auditRuleset(story).systems.map((s) => [s.id, s.score]));
    expect([by.checks, by.conflict]).toEqual([null, null]);
  });
});
