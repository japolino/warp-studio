// What Fix, Deepen and Playtest need from a draft: the card as the helper reads
// it, the ids the other sections define, the guard's assessment, and which
// sections to rewrite for which findings. Pure (no host).

import type { FindingView } from "../audit/audit.js";
import { auditRuleset } from "../audit/audit.js";
import { playtestNow } from "../sim/playtest.js";
import { checkParts, legacyKeys, type Part } from "../rulebook/workspace.js";
import type { Card } from "./store.js";
import type { Assessment, Target } from "./revise.js";

/** The size of the short playtest the guard runs before and after a rewrite. */
export const GUARD_PLAYTEST = { turns: 20, seeds: 10, contestRuns: 200 };

const clip = (v: string, n: number) => (v.length > n ? `${v.slice(0, n)}…` : v);

/** The card, clipped the way Warp's builder clips it. */
export function briefOf(c: Card): string {
  return [
    `Name: ${c.name}`,
    c.description && `Description:\n${clip(c.description, 4000)}`,
    c.personality && `Personality:\n${clip(c.personality, 1500)}`,
    c.scenario && `Scenario:\n${clip(c.scenario, 1500)}`,
    c.first_mes && `Greeting:\n${clip(c.first_mes, 2500)}`,
    c.creator_notes && `Creator notes:\n${clip(c.creator_notes, 1000)}`,
  ].filter(Boolean).join("\n\n");
}

/** Ids the other sections define (not `except`), so a rewrite reuses them exactly. */
export function contextOf(parts: Part[], except: string): string {
  const { ruleset: r } = checkParts(parts.filter((p) => p.label !== except && p.yaml.trim()));
  if (!r) return "";
  const list = (label: string, ids: string[]) => (ids.length ? `${label}: ${ids.join(", ")}` : "");
  return [
    `Style: ${r.style}`,
    list("Stats", r.statOrder.map((id) => `${id} (${r.stats[id].kind}${r.stats[id].kind === "meter" ? ` ${r.stats[id].min}–${r.stats[id].max}` : ""})`)),
    list("Relationship stats (bands)", r.relStatOrder.map((id) => `${id} (${r.relStats[id].bands.map((b) => b.text).join(", ")})`)),
    list("People", Object.keys(r.people)),
    list("Items", Object.keys(r.items)),
    list("Conditions", Object.keys(r.conditions)),
    list("Flags", Object.keys(r.flags)),
    list("Live-choice tags", Object.keys(r.liveChoices.tags)),
    r.style !== "story" ? list("Contest kinds", Object.keys(r.conflict.kinds)) : "",
    list("Goals", Object.keys(r.goals.list)),
    list("Secrets", Object.keys(r.secrets)),
  ].filter(Boolean).join("\n");
}

/** Check + a short playtest: what the guard compares before and after a rewrite. */
export function assessDraft(parts: Part[]): Assessment {
  const c = checkParts(parts);
  const partErrors = Object.fromEntries(c.parts.map((p) => [p.label, p.issues.filter((i) => i.level === "error").length]));
  if (!c.ruleset || c.errors) return { errors: Math.max(1, c.errors), partErrors, scores: {}, gates: [] };
  const scores: Record<string, number> = {};
  for (const s of auditRuleset(c.ruleset).systems) if (s.score !== null) scores[s.label] = s.score;
  const gates = playtestNow(c.ruleset, GUARD_PLAYTEST).gates.map((g) => ({ id: g.id, label: g.label, pass: g.pass }));
  return { errors: 0, partErrors, scores, gates };
}

/** Deepen: every open gap and thin spot, grouped by the section it belongs in (Warp's order). */
export function deepenTargets(findings: FindingView[]): Target[] {
  const out: Target[] = [];
  for (const f of findings) {
    if (f.waived || f.severity === "balance") continue;
    const t = out.find((x) => x.label === f.part);
    if (t) t.findings.push(f); else out.push({ label: f.part, findings: [f] });
  }
  return out;
}

/** Fix: the one finding, on its own section. (Relationship stat ids and band names travel in the context.) */
export function fixTargets(f: FindingView): Target[] {
  return [{ label: f.part, findings: [f] }];
}

/** For a rulebook with removed parts: their old text, so Deepen can rebuild them as conflict kinds and goals. */
export function legacyNote(parts: Part[]): string {
  const keys = legacyKeys(parts);
  if (!keys.length) return "";
  const blocks: string[] = [];
  for (const p of parts) {
    const lines = p.yaml.split("\n");
    let keep = false;
    for (const l of lines) {
      const key = /^([A-Za-z_]\w*)\s*:/.exec(l)?.[1];
      if (key) keep = keys.includes(key);
      if (keep) blocks.push(l);
    }
  }
  return `This rulebook has parts Warp no longer runs (${keys.join(", ")}). Their old text is below; where it fits the card, rebuild what they did with the keys in the reference (conflict kinds for fights, goals for jobs and errands). Do not copy the removed keys.\n${clip(blocks.join("\n"), 4000)}`;
}

/** A cheap fingerprint of a draft, to tell whether a playtest is stale. */
export function partsKey(parts: Part[]): string {
  let h = 2166136261;
  for (const ch of JSON.stringify(parts.map((p) => [p.label, p.yaml.trim()]))) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
