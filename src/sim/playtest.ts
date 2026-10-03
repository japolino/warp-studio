// Playtest: a front-end for Warp's whole-loop simulator (CORE-DESIGN §2.7). It
// runs Warp's loop-sim on a draft and shows Warp's gates exactly as Warp computes
// them: Studio adds no gate of its own, so Studio and Warp's tests can never
// disagree about the quality bar. Extra tables for creators come from the same
// run: tag share, the odds of each checked tag per difficulty word, and a
// contest table per kind. Pure engine; the in-app run goes in chunks.

import {
  actionOdds, contestAddAtStart, createLoopSim, DIFFICULTIES, initialState, runLoopSim,
  type Difficulty, type LoopGate, type LoopReport, type Ruleset,
} from "../warp.js";

export interface PlaytestOptions {
  turns: number;
  seeds: number;
  /** Runs per contest-table cell (Warp's default 2000; less in the app). */
  contestRuns?: number;
  seed?: string;
}

export interface ContestTable {
  kind: string;
  label: string;
  /** What the player's best stat for this kind adds at the start (the row to highlight). */
  best: number;
  rows: { add: number; cells: { threat: Difficulty; won: number; meanRounds: number }[] }[];
}

export interface PlaytestReport {
  turns: number;
  seeds: number;
  pass: boolean;
  /** Warp's gates, unchanged. */
  gates: LoopGate[];
  /** Share of each tag in a greedy player's picks, largest first. */
  tagShare: { tag: string; share: number }[];
  /** Each tag with a check: the shown odds at the start for each difficulty word. */
  odds: { tag: string; label: string; cells: { word: Difficulty; pct: number }[] }[];
  contests: ContestTable[];
  counts: LoopReport["counts"];
}

/** Studio's view of one loop-sim report. */
export function summarize(r: Ruleset, rep: LoopReport): PlaytestReport {
  const start = initialState(r);
  const odds: PlaytestReport["odds"] = [];
  if (r.style !== "story") {
    for (const [tag, a] of Object.entries(r.liveChoices.tags)) {
      if (!a.check) continue;
      const cells = DIFFICULTIES.map((word) => {
        const o = actionOdds(r, start, a, { difficulty: word });
        return { word, pct: o ? Math.round(o.success * 100) : 0 };
      });
      odds.push({ tag, label: a.check.label ?? tag, cells });
    }
  }
  const contests: ContestTable[] = [];
  for (const kind of [...new Set(rep.contests.map((c) => c.kind))]) {
    const def = r.conflict.kinds[kind];
    const rows: ContestTable["rows"] = [];
    for (const c of rep.contests.filter((x) => x.kind === kind)) {
      let row = rows.find((x) => x.add === c.add);
      if (!row) { row = { add: c.add, cells: [] }; rows.push(row); }
      row.cells.push({ threat: c.threat, won: c.won, meanRounds: c.meanRounds });
    }
    contests.push({ kind, label: def?.label ?? kind, best: def ? contestAddAtStart(r, start, def) : 0, rows });
  }
  return {
    turns: rep.turns, seeds: rep.seeds, pass: rep.pass, gates: rep.gates,
    tagShare: Object.entries(rep.tagShare).map(([tag, share]) => ({ tag, share })).sort((a, b) => b.share - a.share),
    odds, contests, counts: rep.counts,
  };
}

/** One run, all at once (the CLI and the guard of Fix/Deepen). */
export function playtestNow(r: Ruleset, o: PlaytestOptions): PlaytestReport {
  return summarize(r, runLoopSim(r, { turns: o.turns, seeds: o.seeds, contestRuns: o.contestRuns, seed: o.seed }));
}

export class Cancelled extends Error {
  constructor() { super("Cancelled."); this.name = "Cancelled"; }
}

/**
 * The in-app run: a few turns at a time, yielding between chunks so the backend keeps answering other
 * messages; `progress` gets 0–1; an aborted signal stops it between chunks.
 */
export async function playtest(r: Ruleset, o: PlaytestOptions, hooks: { signal?: AbortSignal; progress?(share: number): void; chunk?: number } = {}): Promise<PlaytestReport> {
  const sim = createLoopSim(r, { turns: o.turns, seeds: o.seeds, contestRuns: o.contestRuns, seed: o.seed });
  const chunk = Math.max(1, hooks.chunk ?? 50);
  for (;;) {
    if (hooks.signal?.aborted) throw new Cancelled();
    const done = sim.run(chunk);
    hooks.progress?.(sim.progress);
    if (done) break;
    await new Promise((res) => setTimeout(res, 0));
  }
  if (hooks.signal?.aborted) throw new Cancelled();
  return summarize(r, sim.report());
}

/** A gate's value in words ("0.43", "4.9", "3"). */
export function gateValue(g: LoopGate): string {
  if (!Number.isFinite(g.value)) return String(g.value);
  return Number.isInteger(g.value) ? String(g.value) : g.value.toFixed(2);
}

/** The report as text (the CLI and the MCP tool). */
export function playtestText(rep: PlaytestReport): string {
  const out: string[] = [`WARP PLAYTEST — ${rep.turns} turns × ${rep.seeds} seeds per player policy (Warp's loop simulator)`, ""];
  out.push(rep.pass ? "✓ Every gate passes." : `✕ ${rep.gates.filter((g) => !g.pass).length} gate${rep.gates.filter((g) => !g.pass).length === 1 ? "" : "s"} fail.`, "");
  out.push("GATES (Warp's quality bar)");
  for (const g of rep.gates) out.push(`  ${g.pass ? "✓" : "✕"} ${g.label}: ${gateValue(g)} (bar ${g.bar})`);
  if (rep.tagShare.length) {
    out.push("", "TAG SHARE (a greedy player's picks)");
    for (const t of rep.tagShare) out.push(`  ${t.tag.padEnd(14)} ${"█".repeat(Math.round(t.share * 30)).padEnd(30)} ${Math.round(t.share * 100)}%`);
  }
  if (rep.odds.length) {
    out.push("", `ODDS AT THE START (shown %, ${DIFFICULTIES.join(" / ")})`);
    for (const o of rep.odds) out.push(`  ${o.tag.padEnd(14)} ${o.cells.map((c) => `${String(c.pct).padStart(3)}%`).join("  ")}`);
  }
  for (const c of rep.contests) {
    out.push("", `CONTEST: ${c.label} — win % · mean rounds (the player's best start stat adds +${c.best})`);
    out.push(`  add   ${DIFFICULTIES.map((d) => d.padEnd(12)).join("")}`);
    for (const row of c.rows) out.push(`  ${row.add === c.best ? "▶" : " "}+${row.add}   ${row.cells.map((x) => `${String(Math.round(x.won * 100)).padStart(3)}% · ${x.meanRounds.toFixed(1)}`.padEnd(12)).join("")}`);
  }
  return out.join("\n");
}
