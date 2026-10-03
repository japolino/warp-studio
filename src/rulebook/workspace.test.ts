import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { REMOVED_KEYS, TEMPLATES } from "../warp.js";
import { checkParts, cleanLabel, fromTemplate, fromText, installBlock, legacyBanner, legacyKeys, orderParts, sameParts, setPart, toText } from "./workspace.js";

const fixture = (name: string) => readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8");

describe("one file ↔ sections", () => {
  test("an exported template imports back into the same sections", () => {
    for (const t of TEMPLATES) {
      const parts = fromTemplate(t.id)!;
      const back = fromText(toText(parts, t.name));
      expect(back.map((p) => p.label)).toEqual(parts.map((p) => p.label));
      back.forEach((p, i) => expect(p.yaml.trim()).toBe(parts[i].yaml.trim()));
    }
  });

  test("the export header points at Warp Studio, not Warp's old import box", () => {
    const text = toText(fromTemplate(TEMPLATES[0].id)!, "Mira");
    expect(text).toContain("Warp Studio → Import a rulebook");
    expect(text).not.toContain("Warp → Ruleset → Import");
  });

  test("a plain file is cut at its top-level keys; comments travel with the key below them", () => {
    const parts = fromText(fixture("comments.yaml"));
    expect(parts.map((p) => p.label)).toEqual(["core", "stats", "people"]);
    expect(parts.find((p) => p.label === "people")!.yaml.startsWith("# Who the story is about.\nrelationships:")).toBe(true);
    // And back again: the comment survives a second round trip.
    const again = fromText(toText(parts, "Comment test"));
    expect(again.find((p) => p.label === "people")!.yaml).toContain("# Who the story is about.");
  });

  test("an empty file is refused with a plain message", () => {
    expect(() => fromText("# only a comment\n")).toThrow(/doesn't look like a rulebook/);
  });
});

describe("checking a draft", () => {
  test("every template loads with no errors", () => {
    for (const t of TEMPLATES) {
      const c = checkParts(fromTemplate(t.id, { name: "Mira Vale" })!);
      expect({ id: t.id, errors: c.errors, ruleset: !!c.ruleset, legacy: c.legacy }).toEqual({ id: t.id, errors: 0, ruleset: true, legacy: [] });
    }
  });

  test("an issue goes to the section that holds its key", () => {
    const c = checkParts([{ label: "core", yaml: "name: T\nstyle: adventure\n" }, { label: "stats", yaml: "checks:\n  partial: lots\n" }]);
    const mine = c.parts.find((p) => p.label === "stats")!.issues;
    expect(mine.length + c.unplaced.length).toBe(c.issues.length - c.parts.find((p) => p.label === "core")!.issues.length);
    expect(c.issues.filter((i) => /^Checks/i.test(i.where)).every((i) => mine.some((m) => m.where === i.where))).toBe(true);
  });

  test("starting from a template adds the card's character, but not for a scenario card", () => {
    const withMira = fromTemplate(TEMPLATES[0].id, { name: "Mira Vale" })!;
    expect(withMira.some((p) => p.yaml.includes("mira_vale:"))).toBe(true);
    const scenario = fromTemplate(TEMPLATES[0].id, { name: "The Academy", tags: ["scenario"] })!;
    expect(scenario.some((p) => p.yaml.includes("the_academy:"))).toBe(false);
  });

  test("issues land on the section they come from", () => {
    const c = checkParts([
      { label: "stats", yaml: "stats:\n  hp: { kind: meter, start: oops }\n" },
      { label: "actions", yaml: "actions:\n  hit: { label: Hit, effects: { hpp: -1 } }\n" },
      { label: "world", yaml: "items: [oops\n" },
    ]);
    const by = Object.fromEntries(c.parts.map((p) => [p.label, p.status]));
    expect(by).toEqual({ stats: "warn", actions: "warn", world: "error" });
    expect(c.parts.find((p) => p.label === "world")!.issues[0].message).toContain("YAML couldn't be read");
    expect(c.errors).toBe(1);
    expect(installBlock(c, c.parts)).toBe("Fix the error first (marked in red).");
  });

  test("an issue for a section the draft doesn't have is kept, not dropped", () => {
    const c = checkParts([{ label: "core", yaml: "name: Test\n" }, { label: "notes", yaml: "stats:\n  hp: { kind: meter, start: nope }\n" }]);
    expect(c.unplaced.length + c.parts.reduce((n, p) => n + p.issues.length, 0)).toBe(c.issues.length);
  });

  test("an empty draft cannot be installed", () => {
    expect(installBlock(checkParts([]), [])).toBe("The draft is empty.");
  });
});

describe("old-format rulebooks", () => {
  test("removed top-level keys are found, and only those", () => {
    const parts = fromText(fixture("legacy.yaml"));
    const keys = legacyKeys(parts);
    const top = [...fixture("legacy.yaml").matchAll(/^([a-z_]+):/gm)].map((m) => m[1]);
    expect(keys).toEqual(top.filter((k) => k in REMOVED_KEYS));
    expect(keys).toEqual(expect.arrayContaining(["perks", "weather", "fronts"]));
    expect(checkParts(parts).legacy).toEqual(keys);
  });

  test("one banner names them", () => {
    expect(legacyBanner([])).toBeNull();
    expect(legacyBanner(["perks"])).toBe("This rulebook uses 1 part Warp no longer runs (perks). It is ignored.");
    expect(legacyBanner(["perks", "weather", "fronts", "codex"], { deepen: true }))
      .toBe("This rulebook uses 4 parts Warp no longer runs (perks, weather, fronts…). They are ignored. Deepen can rebuild them as conflict kinds and goals.");
  });
});

describe("editing sections", () => {
  test("labels are cleaned, sections stay in Warp's order, empty text removes a section", () => {
    expect(cleanLabel("warp-ruleset · Stats")).toBe("stats");
    expect(cleanLabel("  ")).toBe("core");
    let parts = setPart([{ label: "stats", yaml: "stats: {}\n" }], "Core", "name: X\n");
    expect(parts.map((p) => p.label)).toEqual(["core", "stats"]);
    parts = setPart(parts, "stats", "  \n");
    expect(parts.map((p) => p.label)).toEqual(["core"]);
    expect(orderParts([{ label: "zzz", yaml: "" }, { label: "core", yaml: "" }]).map((p) => p.label)).toEqual(["core", "zzz"]);
  });

  test("sameParts ignores order and trailing space", () => {
    expect(sameParts([{ label: "a", yaml: "x: 1\n" }, { label: "core", yaml: "name: A" }], [{ label: "core", yaml: "name: A\n" }, { label: "a", yaml: "x: 1" }])).toBe(true);
    expect(sameParts([{ label: "core", yaml: "name: A" }], [{ label: "core", yaml: "name: B" }])).toBe(false);
  });
});
