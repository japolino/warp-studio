// Fix and Deepen: rewrite whole sections with the helper model, repair what the
// checker rejects, and keep a rewrite only if it does not make things worse.
// Nothing here writes to the lorebook; the result is a proposal to review.
//
// The steps (STUDIO-DESIGN §2.5):
// 1. one helper call per target section, all in parallel;
// 2. sections with checker errors get one repair call each, at most 2 rounds;
// 3. the guard: in Warp's section order, a rewrite is kept only if its section has no errors, no system score
//    went down and no gate that passed before now fails (judged with the rewrites kept so far);
// 4. the review: a diff per section, scores and gates before → after, the helper's one-line summary.

import { diffHunks, diffLines, diffStats, type DiffLine } from "../rulebook/diff.js";
import { checkParts, orderParts, setPart, type Part } from "../rulebook/workspace.js";
import { DESIGN_GUIDE, REFERENCE } from "../warp.js";

export interface FindingLike { id: string; system: string; severity: string; part: string; text: string; fix: string }
export interface GateLike { id: string; label: string; pass: boolean; value?: string }

/** What the guard compares: errors per section, a score per core system, Warp's gates. */
export interface Assessment {
  errors: number;
  partErrors: Record<string, number>;
  scores: Record<string, number>;
  gates: GateLike[];
}

export interface ReviseDeps {
  /** Check (+ a short playtest) of a whole draft. */
  assess(parts: Part[]): Promise<Assessment> | Assessment;
  /** One helper call (budgeted, cancellable). */
  ask(system: string, user: string): Promise<string>;
  /** The card, as the helper should read it. */
  brief: string;
  /** Ids the other sections define, so a rewrite lines up with them. */
  context(parts: Part[], except: string): string;
  progress?(label: string): void;
}

export interface SectionChange {
  label: string;
  before: string;
  after: string;
  kept: boolean;
  /** Why it was dropped (null when kept). */
  reason: string | null;
  /** The helper's one line about what it changed. */
  summary: string | null;
  diff: DiffLine[];
  added: number;
  removed: number;
}

export interface Proposal {
  kind: "fix" | "deepen";
  findingIds: string[];
  sections: SectionChange[];
  scores: { before: Record<string, number>; after: Record<string, number> };
  gates: { before: GateLike[]; after: GateLike[] };
  /** Helper calls this run made. */
  calls: number;
  at: number;
}

export interface Target { label: string; findings: FindingLike[] }

export const STUDIO_RULES = `Studio's rules for a rewrite:
- Use only the keys in the format reference. Keep every existing id. Do not add systems.
- Keep it small: at most 3 relationship stats, 4 meters, 8 live-choice tags, 3 conflict kinds.
- Write in-world text in the card's voice. Refer to the player as {{user}}.
- Adults only in anything romantic or sexual.`;

export const SYSTEM_PROMPT = `You improve one section of a Warp ruleset: YAML that a game engine runs under a roleplay chat.
Return the whole section as YAML in one \`\`\`yaml block, and nothing else. Start the YAML with one comment line:
"# Changed: <what you changed, in one short sentence>".

${STUDIO_RULES}

${DESIGN_GUIDE}

${REFERENCE}`;

/** What "richer" means, for Deepen. */
export const DEEPEN_TASK = `Make this section richer where the findings say it is thin, in the new format:
- every band of every relationship stat gets a say, a say_down and a voice;
- each main person gets an appearance, an outfit and one secret ladder with band: stages and a cue;
- live-choice tags themed to the card (5 to 8, at least one with no check, 1 or 2 with checks, social tags per_person);
- conflict kinds that fit the card, with costs and outcomes;
- meters with bands and say lines; conditions with a bonus and lasts;
- 1 to 3 authored goals with judge and stakes; checks.directions in the card's voice.
Change only what the findings ask for and what it needs. Keep everything else as it is.`;

export const FIX_TASK = "Fix the finding below. Change as little as you can; keep everything else as it is.";

/** The model's YAML: the fenced block if there is one, else the text minus chatter before the first key. */
export function extractYaml(text: string): string {
  const fenced = /```(?:ya?ml)?[ \t]*\r?\n([\s\S]*?)```/i.exec(text);
  let y = (fenced ? fenced[1] : text).replace(/\r\n?/g, "\n");
  const lines = y.split("\n");
  const first = lines.findIndex((l) => /^[A-Za-z_][\w-]*:/.test(l) || /^#/.test(l));
  if (first > 0) y = lines.slice(first).join("\n");
  return `${y.trim()}\n`;
}

/** Split off the "# Changed: …" line the helper was asked to start with. */
export function splitSummary(yaml: string): { yaml: string; summary: string | null } {
  const m = /^#\s*Changed:\s*(.+)\n?/i.exec(yaml);
  return m ? { yaml: yaml.slice(m[0].length).replace(/^\n+/, "") || "\n", summary: m[1].trim().slice(0, 300) } : { yaml, summary: null };
}

const findingLines = (fs: FindingLike[]) => fs.map((f) => `- [${f.severity}] ${f.id}: ${f.text} Fix: ${f.fix}`).join("\n");

function rewritePrompt(deps: ReviseDeps, parts: Part[], t: Target, task: string): string {
  const current = parts.find((p) => p.label === t.label)?.yaml ?? "";
  return [
    `THE CARD\n${deps.brief}`,
    `${task}`,
    `The "${t.label}" section now:\n${current.trim() ? current : "(empty: write it from scratch)"}`,
    `Findings to fix in this section:\n${findingLines(t.findings) || "- (none)"}`,
    (() => { const c = deps.context(parts, t.label); return c ? `Ids the other sections define (reuse them exactly; don't define them here):\n${c}` : ""; })(),
  ].filter(Boolean).join("\n\n");
}

function better(before: Assessment, after: Assessment, label: string): string | null {
  const own = after.partErrors[label] ?? 0;
  if (own) return `the rewrite of "${label}" has ${own} error${own === 1 ? "" : "s"}`;
  if (after.errors > before.errors) return `the rewrite of "${label}" causes errors elsewhere`;
  for (const [sys, was] of Object.entries(before.scores)) {
    const now = after.scores[sys];
    if (typeof now === "number" && now < was) return `the rewrite of "${label}" lowers ${sys} ${was} → ${now}`;
  }
  for (const g of before.gates) {
    if (!g.pass) continue;
    const now = after.gates.find((x) => x.id === g.id);
    if (now && !now.pass) return `the rewrite of "${label}" breaks the gate "${g.label}"`;
  }
  return null;
}

/**
 * Rewrite the target sections and keep what helps. `maxCalls` is a hard cap shared by rewrites and repairs
 * (Fix: 3, Deepen: 12). Throws only when cancelled; every other failure drops that section with a reason.
 */
export async function revise(kind: Proposal["kind"], parts: Part[], targets: Target[], deps: ReviseDeps, o: { maxCalls: number; task?: string; signal?: AbortSignal }): Promise<Proposal> {
  let calls = 0;
  const ask = async (system: string, user: string) => {
    if (o.signal?.aborted) throw new Error("Cancelled.");
    if (calls >= o.maxCalls) throw new Error("no helper calls left");
    calls++;
    return deps.ask(system, user);
  };
  const before = await deps.assess(parts);
  const task = o.task ?? (kind === "deepen" ? DEEPEN_TASK : FIX_TASK);
  const chosen = orderParts(targets.map((t) => ({ ...t, yaml: "" }))).slice(0, o.maxCalls);
  const drafts = new Map<string, { yaml: string; summary: string | null; failed: string | null }>();

  // 1. One rewrite per section, in parallel.
  deps.progress?.(`Writing ${chosen.map((t) => t.label).join(", ")}…`);
  await Promise.all(chosen.map(async (t) => {
    try {
      const { yaml, summary } = splitSummary(extractYaml(await ask(SYSTEM_PROMPT, rewritePrompt(deps, parts, t, task))));
      drafts.set(t.label, { yaml, summary, failed: yaml.trim() ? null : "the helper wrote nothing usable" });
    } catch (e) {
      if (o.signal?.aborted) throw e;
      drafts.set(t.label, { yaml: "", summary: null, failed: `the helper did not answer (${e instanceof Error ? e.message : String(e)})` });
    }
  }));
  if (o.signal?.aborted) throw new Error("Cancelled.");

  // 2. Repair what the checker rejects: one call per broken section, at most 2 rounds, within the cap.
  const merged = () => {
    let out = parts;
    for (const [label, d] of drafts) if (!d.failed) out = setPart(out, label, d.yaml);
    return out;
  };
  for (let round = 0; round < 2; round++) {
    const check = checkParts(merged());
    const broken = check.parts.filter((p) => p.status === "error" && drafts.get(p.label) && !drafts.get(p.label)!.failed);
    if (!broken.length || calls >= o.maxCalls) break;
    deps.progress?.(`Repairing ${broken.map((p) => p.label).join(", ")}…`);
    await Promise.all(broken.slice(0, o.maxCalls - calls).map(async (p) => {
      const problems = p.issues.map((i) => `- ${i.where}: ${i.message}`).join("\n");
      const user = `This "${p.label}" section has problems reported by Warp's checker. Return the corrected YAML for the whole section.\n\nProblems:\n${problems}\n\nSection:\n${p.yaml}\n\n${deps.context(merged(), p.label)}`;
      try {
        const d = drafts.get(p.label)!;
        const fixed = splitSummary(extractYaml(await ask(SYSTEM_PROMPT, user)));
        drafts.set(p.label, { ...d, yaml: fixed.yaml });
      } catch (e) {
        if (o.signal?.aborted) throw e;
      }
    }));
  }
  if (o.signal?.aborted) throw new Error("Cancelled.");

  // 3. The guard, section by section in Warp's order, with the rewrites kept so far.
  deps.progress?.("Checking the rewrite…");
  let acc = parts;
  let accAssessment = before;
  const sections: SectionChange[] = [];
  for (const t of chosen) {
    const d = drafts.get(t.label)!;
    const was = parts.find((p) => p.label === t.label)?.yaml ?? "";
    let reason = d.failed;
    if (!reason && d.yaml.trim() === was.trim()) reason = "the helper changed nothing";
    let trial = acc;
    if (!reason) {
      trial = setPart(acc, t.label, d.yaml);
      const a = await deps.assess(trial);
      reason = better(before, a, t.label);
      if (!reason) { acc = trial; accAssessment = a; }
    }
    const diff = diffLines(was, d.yaml);
    sections.push({ label: t.label, before: was, after: d.yaml, kept: !reason, reason, summary: d.summary, diff: diffHunks(diff), ...diffStats(diff) });
  }

  return {
    kind,
    findingIds: targets.flatMap((t) => t.findings.map((f) => f.id)),
    sections,
    scores: { before: before.scores, after: accAssessment.scores },
    gates: { before: before.gates, after: accAssessment.gates },
    calls,
    at: Date.now(),
  };
}

/** The draft with the accepted sections of a proposal applied. */
export function applyProposal(parts: Part[], p: Proposal, accept: "all" | string[]): Part[] {
  let out = parts;
  for (const s of p.sections) if (s.kept && (accept === "all" || accept.includes(s.label))) out = setPart(out, s.label, s.after);
  return out;
}
