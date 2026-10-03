// A ruleset draft as sections ("parts"), the same shape Warp's builder uses: one
// YAML text per lorebook entry "warp-ruleset · <label>". Pure: no host, no I/O.

import {
  joinRulebook, lintRuleset, loadRuleset, looksLikeScenario, PART_LABELS, partForIssue, REMOVED_KEYS,
  splitRulebook, TEMPLATES, withCharacter, type Issue, type Ruleset, type RulesetPart,
} from "../warp.js";

export interface Part { label: string; yaml: string }

export interface PartIssue { level: "error" | "warning"; where: string; message: string }

export interface CheckedPart extends Part {
  issues: PartIssue[];
  status: "ok" | "warn" | "error";
}

export interface PartsCheck {
  ruleset: Ruleset | null;
  /** Every issue: loader, normalizer and lint (Warp's own words). */
  issues: Issue[];
  parts: CheckedPart[];
  /** Issues that belong to a section the draft doesn't have (shown at the top). */
  unplaced: PartIssue[];
  errors: number;
  warnings: number;
  /** Top-level keys of systems Warp no longer runs. */
  legacy: string[];
}

/** A section label as Studio stores it: lower case, letters, digits, spaces and dashes. */
export function cleanLabel(label: string): string {
  return label.replace(/^\s*(?:\[[^\]]*\]\s*)?warp[-_ ]?ruleset\s*[·:\-–—|]?\s*/i, "").replace(/[^\w -]+/g, "").trim().toLowerCase() || "core";
}

/** Sections in Warp's order (`PART_LABELS`); unknown labels last, in their own order. */
export function orderParts<T extends Part>(parts: T[]): T[] {
  const rank = (l: string) => { const i = (PART_LABELS as readonly string[]).indexOf(l); return i < 0 ? 99 : i; };
  return parts.map((p, i) => ({ p, i })).sort((a, b) => rank(a.p.label) - rank(b.p.label) || a.i - b.i).map((x) => x.p);
}

/** Sections as Warp's loader reads lorebook entries. */
export function asRulesetParts(parts: Part[]): RulesetPart[] {
  return parts.map((p, i) => ({ label: `warp-ruleset · ${p.label}`, content: p.yaml, order: i }));
}

const toIssue = (i: Issue): PartIssue => ({ level: i.level === "error" ? "error" : "warning", where: i.where, message: i.message });

/** Load + lint the draft the way Warp does, and put each issue on its section. */
export function checkParts(parts: Part[]): PartsCheck {
  const { ruleset, issues } = loadRuleset(asRulesetParts(parts));
  const all = ruleset ? [...issues, ...lintRuleset(ruleset)] : issues;
  const labels = new Set(parts.map((p) => p.label));
  const checked: CheckedPart[] = parts.map((p) => {
    const mine = all.filter((i) => partForIssue(i.where) === p.label).map(toIssue);
    return { label: p.label, yaml: p.yaml, issues: mine, status: mine.some((i) => i.level === "error") ? "error" : mine.length ? "warn" : "ok" };
  });
  const unplaced = all.filter((i) => !labels.has(partForIssue(i.where))).map(toIssue);
  return {
    ruleset, issues: all, parts: checked, unplaced,
    errors: all.filter((i) => i.level === "error").length,
    warnings: all.filter((i) => i.level !== "error").length,
    legacy: legacyKeys(parts),
  };
}

/** Errors stop an install; so does a draft with no sections or one that doesn't load. */
export function installBlock(check: PartsCheck, parts: Part[]): string | null {
  if (!parts.some((p) => p.yaml.trim())) return "The draft is empty.";
  if (check.errors === 1) return "Fix the error first (marked in red).";
  if (check.errors) return `Fix the ${check.errors} errors first (marked in red).`;
  if (!check.ruleset) return "The draft doesn't load.";
  return null;
}

const TOP_KEY = /^([A-Za-z_]\w*)\s*:/gm;

/** Top-level keys of systems Warp removed (`REMOVED_KEYS`), in the order they appear. */
export function legacyKeys(parts: Part[]): string[] {
  const out: string[] = [];
  for (const p of parts) for (const m of p.yaml.matchAll(TOP_KEY)) {
    const k = m[1];
    if (Object.prototype.hasOwnProperty.call(REMOVED_KEYS, k) && !out.includes(k)) out.push(k);
  }
  return out;
}

/** The one banner for a rulebook with removed parts (null when it has none). */
export function legacyBanner(keys: string[], opts: { deepen?: boolean } = {}): string | null {
  if (!keys.length) return null;
  const list = keys.length > 3 ? `${keys.slice(0, 3).join(", ")}…` : keys.join(", ");
  return `This rulebook uses ${keys.length} part${keys.length === 1 ? "" : "s"} Warp no longer runs (${list}). ${keys.length === 1 ? "It is" : "They are"} ignored.`
    + (opts.deepen ? " Deepen can rebuild them as conflict kinds and goals." : "");
}

/** Replace a section's text, or add the section; an empty text removes it. */
export function setPart(parts: Part[], label: string, yaml: string): Part[] {
  const l = cleanLabel(label);
  const text = yaml.replace(/\r\n?/g, "\n");
  const has = parts.some((p) => p.label === l);
  if (!text.trim()) return parts.filter((p) => p.label !== l);
  const next = has ? parts.map((p) => (p.label === l ? { label: l, yaml: text } : p)) : [...parts, { label: l, yaml: text }];
  return orderParts(next);
}

/** Same sections with the same text (whitespace at the ends ignored). */
export function sameParts(a: Part[], b: Part[]): boolean {
  if (a.length !== b.length) return false;
  const key = (ps: Part[]) => orderParts(ps).map((p) => `${p.label}\u0000${p.yaml.trim()}`).join("\u0001");
  return key(a) === key(b);
}

export interface CardLike { name: string; description?: string; personality?: string; scenario?: string; tags?: string[] }

/** A template's sections; the card's character joins `relationships.people` unless the card is a scenario. */
export function fromTemplate(id: string, card?: CardLike | null): Part[] | null {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) return null;
  const add = card && card.name && !looksLikeScenario(card);
  return orderParts(t.parts.map((p) => ({ label: cleanLabel(p.label), yaml: add ? withCharacter(p.yaml, card!.name) : p.yaml })));
}

/** One rulebook file (labelled documents or plain YAML) → sections. Throws when there's nothing in it. */
export function fromText(text: string): Part[] {
  const parts = splitRulebook(text).map((p) => ({ label: cleanLabel(p.label), yaml: p.yaml }));
  if (!parts.length) throw new Error("That doesn't look like a rulebook: it should be YAML with top-level keys like `stats:` or `relationships:`.");
  // Two documents with the same label after cleaning: keep both texts, in order.
  const merged: Part[] = [];
  for (const p of parts) {
    const hit = merged.find((x) => x.label === p.label);
    if (hit) hit.yaml = `${hit.yaml.trimEnd()}\n${p.yaml}`;
    else merged.push({ ...p });
  }
  return merged;
}

const IMPORT_LINE = /^# Edit it anywhere.*$/m;

/** Sections → one file to share or edit elsewhere; importing it in Studio puts everything back. */
export function toText(parts: Part[], title: string): string {
  return joinRulebook(parts, title || "Untitled")
    .replace(IMPORT_LINE, "# Edit it anywhere, then import it back: Warp Studio → Import a rulebook, then Install.");
}

/** Template choices for the UI and the CLI. */
export function templateInfo(): { id: string; name: string; blurb: string }[] {
  return TEMPLATES.map((t) => ({ id: t.id, name: t.name, blurb: t.blurb }));
}
