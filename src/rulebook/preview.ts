// "At the start": what the player sees when the rules are new, and what the
// narrator is told. An adapter over Warp's view functions (buildHud,
// buildChoices, stateDigest), so a change in Warp's panel shape touches only
// this file. Pure.

import { buildChoices, buildHud, initialState, stateDigest, type Ruleset } from "../warp.js";

export interface PreviewView {
  name: string;
  description: string | null;
  /** The status panel at the start, one line each. */
  panel: string[];
  /** The authored actions offered at the start, with odds. */
  choices: string[];
  /** What the narrator is told on a turn that names nothing in particular. */
  narrator: string[];
}

export function previewOf(r: Ruleset): PreviewView {
  const s = initialState(r);
  const hud = buildHud(r, s);
  const panel: string[] = [];
  if (hud.clock) panel.push(`${hud.date ?? hud.clock.day}, ${hud.clock.time}`);
  if (hud.location) panel.push(`Place: ${hud.location.name}${hud.money ? ` · ${hud.money}` : ""}`);
  else if (hud.money) panel.push(`Money: ${hud.money}`);
  for (const b of hud.bars) panel.push(`${b.label}: ${b.text ? `${b.text} (${b.display})` : b.display}`);
  if (hud.skills.length) panel.push(`Skills: ${hud.skills.map((x) => `${x.label} ${x.grade ?? x.text ?? x.display}`).join(", ")}`);
  for (const p of hud.people) {
    const bands = p.stats.map((x) => `${x.label} ${x.text ?? x.display}`).join(", ");
    panel.push(`${p.name}${p.present ? " (here)" : ""}${bands ? `: ${bands}` : ""}`);
  }
  if (hud.items.length) panel.push(`Carrying: ${hud.items.map((i) => `${i.name}${i.count > 1 ? ` ×${i.count}` : ""}${i.use ? ` [${i.use.label}]` : ""}${i.bonus ? ` (${i.bonus})` : ""}`).join(", ")}`);
  if (hud.conditions.length) panel.push(`Conditions: ${hud.conditions.map((c) => c.label).join(", ")}`);
  const choices = buildChoices(r, s, { lines: [], veils: [] }).map((c) =>
    `${c.label}${c.odds !== null ? ` — ${Math.round(c.odds * 100)}%${c.checkLabel ? ` ${c.checkLabel}` : ""}` : ""}${c.locked ? ` — locked: ${c.locked}` : ""}`);
  const narrator = stateDigest(r, s, { text: "" }).split("\n").filter((l) => l.trim());
  return { name: r.name, description: r.description ?? null, panel, choices, narrator };
}

/** How much of each kind the ruleset declares ("3 stats, 2 people…"), for the check report. */
export function countsOf(r: Ruleset): Record<string, number> {
  return {
    stats: r.statOrder.length,
    "relationship stats": r.relStatOrder.length,
    people: Object.keys(r.people).length,
    items: Object.keys(r.items).length,
    conditions: Object.keys(r.conditions).length,
    actions: Object.keys(r.actions).length,
    triggers: r.triggers.length,
  };
}

export function previewText(p: PreviewView): string {
  return [
    `${p.name}${p.description ? ` — ${p.description}` : ""}`,
    "",
    "STATUS PANEL AT THE START",
    ...(p.panel.length ? p.panel : ["(nothing to show)"]).map((l) => `  ${l}`),
    "",
    "ACTIONS AT THE START",
    ...(p.choices.length ? p.choices : ["(none: the live choices are written with each reply)"]).map((l) => `  ${l}`),
    "",
    "WHAT THE NARRATOR IS TOLD (a turn that names nothing in particular)",
    ...p.narrator.map((l) => `  ${l}`),
  ].join("\n");
}
