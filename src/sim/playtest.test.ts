import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { checkParts, fromTemplate, fromText } from "../rulebook/workspace.js";
import { runLoopSim, TEMPLATES, type Ruleset } from "../warp.js";
import { Cancelled, playtest, playtestNow, playtestText } from "./playtest.js";

const ruleset = (id: string): Ruleset => checkParts(fromTemplate(id, { name: "Mira" })!).ruleset!;
const adventure = TEMPLATES.find((t) => ruleset(t.id).style !== "story")!.id;
const story = checkParts(fromText(readFileSync(new URL("../fixtures/thin-story.yaml", import.meta.url), "utf8"))).ruleset!;
const SMALL = { turns: 8, seeds: 3, contestRuns: 40 };

describe("the playtest shows Warp's loop simulator", () => {
  test("the gates are Warp's, unchanged", () => {
    const r = ruleset(adventure);
    const mine = playtestNow(r, SMALL);
    const warp = runLoopSim(r, SMALL);
    expect(mine.gates).toEqual(warp.gates);
    expect(mine.pass).toBe(warp.pass);
    expect(mine.counts).toEqual(warp.counts);
  });

  test("the same seed gives the same report; in chunks it equals one run", async () => {
    const r = ruleset(adventure);
    const a = playtestNow(r, SMALL);
    expect(playtestNow(r, SMALL)).toEqual(a);
    const seen: number[] = [];
    const b = await playtest(r, SMALL, { chunk: 7, progress: (p) => seen.push(p) });
    expect(b).toEqual(a);
    expect(seen.length).toBeGreaterThan(2);
    expect(seen.at(-1)).toBe(1);
    expect([...seen].sort((x, y) => x - y)).toEqual(seen);
  });

  test("the contest table: every kind, add 0–6, four threats, the best start stat marked", () => {
    const r = ruleset(adventure);
    const rep = playtestNow(r, SMALL);
    expect(rep.contests.map((c) => c.kind)).toEqual(Object.keys(r.conflict.kinds));
    for (const c of rep.contests) {
      expect(c.rows.map((x) => x.add)).toEqual([0, 1, 2, 3, 4, 5, 6]);
      for (const row of c.rows) expect(row.cells.map((x) => x.threat)).toEqual(["easy", "fair", "hard", "extreme"]);
      expect(c.best).toBeGreaterThanOrEqual(0);
    }
    const text = playtestText(rep);
    expect(text).toContain("GATES (Warp's quality bar)");
    expect(text).toMatch(/CONTEST: \w+/);
  });

  test("the odds table: each checked tag per difficulty word, harder is never likelier", () => {
    const rep = playtestNow(ruleset(adventure), SMALL);
    for (const o of rep.odds) {
      const pct = o.cells.map((c) => c.pct);
      expect([...pct].sort((x, y) => y - x)).toEqual(pct);
    }
  });

  test("a story has no odds table and no contests", () => {
    const rep = playtestNow(story, SMALL);
    expect(rep.odds).toEqual([]);
    expect(rep.contests).toEqual([]);
    expect(rep.gates.some((g) => g.id === "contest-rounds")).toBe(false);
  });

  test("Cancel stops it between chunks", async () => {
    const ac = new AbortController();
    const run = playtest(ruleset(adventure), { ...SMALL, seeds: 20 }, { chunk: 5, signal: ac.signal, progress: () => ac.abort() });
    await expect(run).rejects.toBeInstanceOf(Cancelled);
  });
});
