// What an outside agent (or a person at a terminal) needs to write a Warp ruleset:
// the guide, the starting templates, and the same checks Warp Studio runs in
// Lumiverse. Shared by the CLI, the MCP server and the tests. No I/O here.

import { checkView, scoreLine, type CheckView } from "../audit/report.js";
import { checkParts, fromTemplate, fromText, legacyBanner, templateInfo, toText, type Part } from "../rulebook/workspace.js";
import { playtestNow, playtestText, type PlaytestReport } from "../sim/playtest.js";
import { countsOf, previewOf, previewText as previewViewText } from "../rulebook/preview.js";
import { DESIGN_GUIDE, ENGINE_FORMAT, PART_CONTENTS, PART_LABELS, REFERENCE, STUDIO_VERSION, WARP_PIN_SHORT, type Issue, type Ruleset } from "../warp.js";

export const VERSION_LINE = `warp-rulebook ${STUDIO_VERSION} (ruleset format ${ENGINE_FORMAT}, engine ${WARP_PIN_SHORT})`;

const templateIds = () => templateInfo().map((t) => `\`${t.id}\` (${t.name})`).join(" or ");

export function workflowText(): string {
  return `HOW TO WRITE A WARP RULESET (with an agent or by hand)

Warp is a game engine under a roleplay chat in Lumiverse. The ruleset is YAML. It keeps the scene (time, place,
who is here, looks and clothes, items, money), the people (relationship stats with bands, secrets), the checks
(d20 + a stat against a difficulty), the live choices, conflict and growth (meters, conditions, skills, goals).
The engine decides outcomes; the narrator model only writes them. A good ruleset is small and fits the card.

1. Read the card (or the brief). Name the loop before you write YAML: what the player does most, what pushes back,
   what they want.
2. Start from a template: ${templateIds()}. Get it with \`warp-rulebook template <id>\` and adapt it:
   rename, retune, trim. Do not add systems the reference does not describe.
3. Write ONE file: plain YAML with top-level keys, or documents headed "--- # <section>" (that is what Warp Studio
   exports). Sections: ${PART_LABELS.join(", ")}.
4. Run \`warp-rulebook check <file>\` after every change. Fix every error first. Then work through the findings,
   system by system. Fix the gaps; fix the thin spots you care about. Do not chase a perfect score by adding parts
   the game does not need.
5. Run \`warp-rulebook simulate <file>\` until every gate passes (Warp's own quality bar for the whole loop).
6. Run \`warp-rulebook preview <file>\`: the status panel, the actions and what the narrator is told at the start.
   Bands should read as words. The odds should make sense.
7. Hand the file over. In Lumiverse: Warp Studio → Import a rulebook → check it → Install. It lands in the
   character's "warp-ruleset" lorebook, one entry per section.

Rules of thumb: few parts that all matter. 2–3 relationship stats with a say and a voice on every band. 3–4 meters
with bands. 4–8 live-choice tags, at least one without a check. Conflict kinds only with \`style: adventure\`. Goals
that come from the story, plus 1–3 authored ones with judge and stakes.
snake_case ids; meters 0–100; quote formulas that contain commas; refer to the player as {{user}}; in-world text in
the card's voice. Never anything sexual involving anyone under 18: Warp refuses a ruleset that declares minors
together with sexual tags.`;
}

export type GuideSection = "all" | "workflow" | "format" | "design";

function sectionsText(): string {
  return `SECTIONS (each becomes one lorebook entry, "warp-ruleset · <section>"):\n${PART_LABELS.map((l) => `- ${l}: ${PART_CONTENTS[l]}`).join("\n")}`;
}

/** Only the parts of the reference and the design guide about one topic ("items", "checks"…). */
export function topicText(topic: string): string {
  const t = topic.trim().toLowerCase().replace(/s$/, "");
  if (!t) return guideText("all");
  const design = DESIGN_GUIDE.split(/\n(?=## )/).filter((b) => b.toLowerCase().includes(t)).join("\n");
  const format = REFERENCE.split(/\n(?=[a-z_]+:\s)/).filter((b) => b.toLowerCase().includes(t)).slice(0, 8).join("\n");
  const found = [design && `DESIGN GUIDANCE\n${design}`, format && `FORMAT\n${format}`].filter(Boolean).join("\n\n");
  if (found) return found.slice(0, 8000);
  const keys = [...new Set([...REFERENCE.matchAll(/^([a-z_]+):/gm)].map((m) => m[1]))];
  return `Nothing about "${topic}". Topics: ${keys.join(", ")}.`;
}

/** The authoring guide: workflow, sections, the format reference and the design guide (all from Warp, except the workflow). */
export function guideText(section: GuideSection = "all", topic?: string): string {
  if (topic && topic.trim()) return topicText(topic);
  if (section === "workflow") return `${workflowText()}\n\n${sectionsText()}`;
  if (section === "format") return REFERENCE;
  if (section === "design") return DESIGN_GUIDE;
  return [workflowText(), sectionsText(), REFERENCE, DESIGN_GUIDE].join("\n\n");
}

/** The guide as Markdown, for docs/RULEBOOK_GUIDE.md (`bun run guide`). */
export function guideMarkdown(): string {
  return [
    "# Writing a Warp ruleset",
    "",
    "<!-- Generated by `bun run guide` from Warp's reference (the pinned engine) and src/tools/rulebook-tools.ts. Do not edit by hand. -->",
    "",
    `This guide is for writing a ruleset **outside Lumiverse**: by hand, or with an agent (Claude Code, Codex, Cursor…) that can run the checker. It matches ${VERSION_LINE.replace("warp-rulebook ", "Warp Studio ")}. In Lumiverse, Warp Studio uses the same format and the same checks.`,
    "",
    "## Tools",
    "",
    "```bash",
    "node dist/warp-rulebook.js guide              # this guide, as plain text",
    "node dist/warp-rulebook.js guide --topic items # only what the guide says about one topic",
    "node dist/warp-rulebook.js templates          # the starting templates",
    `node dist/warp-rulebook.js template ${templateInfo()[0]?.id ?? "<id>"} > rulebook.yaml`,
    "node dist/warp-rulebook.js check rulebook.yaml",
    "node dist/warp-rulebook.js simulate rulebook.yaml",
    "node dist/warp-rulebook.js preview rulebook.yaml",
    "node dist/warp-rulebook.js mcp                # the same, as an MCP server over stdio",
    "```",
    "",
    "Without cloning: `npx -y github:japolino/warp-studio check rulebook.yaml`. As an MCP server (Claude Code: `claude mcp add warp -- npx -y github:japolino/warp-studio mcp`) it offers `warp_guide`, `warp_templates`, `warp_template`, `warp_check`, `warp_simulate` and `warp_preview`.",
    "",
    "## Workflow",
    "",
    "```text",
    workflowText(),
    "```",
    "",
    "## Sections",
    "",
    ...PART_LABELS.map((l) => `- **${l}**: ${PART_CONTENTS[l]}`),
    "",
    "## Format reference",
    "",
    "```yaml",
    REFERENCE.trim(),
    "```",
    "",
    "## Design guide",
    "",
    DESIGN_GUIDE.trim().replace(/^## /gm, "### ").replace(/^WARP DESIGN GUIDE — /, "**Warp design guide:** "),
    "",
  ].join("\n");
}

export function templateList(): string {
  return templateInfo().map((t) => `${t.id} — ${t.name}\n  ${t.blurb}`).join("\n\n");
}

export function templateText(id: string): string | null {
  const parts = fromTemplate(id);
  const t = templateInfo().find((x) => x.id === id);
  return parts && t ? toText(parts, t.name) : null;
}

/** One file's text (or several, merged in order) → sections, the loaded ruleset and every issue. */
export function loadText(texts: string[]): { parts: Part[]; ruleset: Ruleset | null; issues: Issue[]; legacy: string[] } {
  const parts: Part[] = [];
  for (const t of texts) {
    for (const p of fromText(t)) {
      const hit = parts.find((x) => x.label === p.label);
      if (hit) hit.yaml = `${hit.yaml.trimEnd()}\n${p.yaml}`;
      else parts.push({ ...p });
    }
  }
  const c = checkParts(parts);
  return { parts, ruleset: c.ruleset, issues: c.issues, legacy: c.legacy };
}

export interface CheckReport {
  ok: boolean;
  name: string | null;
  sections: string[];
  errors: Issue[];
  warnings: Issue[];
  /** Removed top-level keys (ignored by Warp). */
  legacy: string[];
  contents: Record<string, number>;
  /** Coverage per core system and the findings (null while it has errors). */
  coverage: CheckView | null;
}

export function checkReport(texts: string[]): CheckReport {
  const { parts, ruleset: r, issues, legacy } = loadText(texts);
  const errors = issues.filter((i) => i.level === "error");
  const ok = !!r && !errors.length;
  return {
    ok,
    name: r?.name ?? null,
    sections: parts.map((p) => p.label),
    errors,
    warnings: issues.filter((i) => i.level !== "error"),
    legacy,
    contents: r ? countsOf(r) : {},
    coverage: ok ? checkView(r!) : null,
  };
}

export function checkText(rep: CheckReport): string {
  const out: string[] = [];
  out.push(`WARP RULESET CHECK — ${rep.name ?? "(does not load)"}`);
  out.push(`Sections: ${rep.sections.join(", ") || "none found"}`);
  const has = Object.entries(rep.contents).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(", ");
  if (has) out.push(`Contains: ${has}`);
  out.push("");
  const banner = legacyBanner(rep.legacy);
  if (banner) out.push(`! ${banner}`, "");
  if (rep.errors.length) {
    out.push(`✕ ERRORS (${rep.errors.length}): the game can't run until these are fixed:`);
    for (const i of rep.errors) out.push(`  - ${i.where}: ${i.message}`);
    out.push("");
  }
  if (rep.warnings.length) {
    out.push(`! WARNINGS (${rep.warnings.length}): names that don't resolve, parts Warp ignores:`);
    for (const i of rep.warnings) out.push(`  - ${i.where}: ${i.message}`);
    out.push("");
  }
  const cov = rep.coverage;
  if (cov) {
    out.push(`◆ COVERAGE BY CORE SYSTEM (${cov.style}): ${scoreLine(cov.systems)}`);
    for (const sys of cov.systems) {
      const mine = cov.findings.filter((f) => f.system === sys.id);
      if (!mine.length) continue;
      out.push(`  ${sys.label}:`);
      for (const f of mine) out.push(`  - [${f.severity}] ${f.id} (${f.part}): ${f.text}\n      fix: ${f.fix}`);
    }
    out.push("");
  }
  const gaps = cov?.findings.filter((f) => f.severity === "gap").length ?? 0;
  out.push(!rep.ok
    ? "✕ Doesn't run yet: fix the errors first."
    : rep.warnings.length || gaps
      ? "Runs. Work through the warnings, then the gaps system by system, then the thin spots you care about. Then simulate."
      : "✓ Clean: it runs, lints clean and has no gaps. Simulate it, preview it, then import it in Warp Studio.");
  return out.join("\n");
}

/** What the player sees at the start, and what the narrator is told. */
export function previewText(texts: string[]): string {
  const { ruleset: r, issues } = loadText(texts);
  if (!r) return `The ruleset doesn't load:\n${issues.filter((i) => i.level === "error").map((i) => `  - ${i.where}: ${i.message}`).join("\n")}`;
  return previewViewText(previewOf(r));
}

export interface SimulateOptions { turns?: number; seeds?: number }

/** Warp's whole-loop simulator on the file: its gates, tag share, odds and the contest table. `ok` = every gate passes. */
export function simulate(texts: string[], o: SimulateOptions = {}): { ok: boolean; text: string; report: PlaytestReport | null } {
  const { ruleset: r, issues } = loadText(texts);
  const errors = issues.filter((i) => i.level === "error");
  if (!r || errors.length) return { ok: false, report: null, text: `The ruleset doesn't run yet; fix the errors first (\`check\`):\n${errors.map((i) => `  - ${i.where}: ${i.message}`).join("\n")}` };
  const clamp = (v: number | undefined, def: number) => Math.max(1, Math.min(500, Math.round(Number.isFinite(v) ? v! : def)));
  const report = playtestNow(r, { turns: clamp(o.turns, 50), seeds: clamp(o.seeds, 50) });
  return { ok: report.pass, report, text: playtestText(report) };
}
