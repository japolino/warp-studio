// One Check report: Warp's errors and lint (on their sections), Studio's
// coverage audit per core system, balance findings, and waivers. Shared by the
// backend, the CLI and the MCP server.

import type { Ruleset } from "../warp.js";
import { auditRuleset, withWaivers, type FindingView, type SystemScore } from "./audit.js";

export interface CheckView {
  style: "story" | "adventure";
  systems: SystemScore[];
  findings: FindingView[];
  /** Findings not left as they are. */
  open: number;
}

export function checkView(r: Ruleset, waived: Record<string, { reason: string }> = {}): CheckView {
  const rep = auditRuleset(r);
  const w = withWaivers(rep, waived);
  return { style: r.style === "story" ? "story" : "adventure", systems: rep.systems, findings: w.findings, open: w.open };
}

/** "Scene 100 · People 72 · Checks not used · …" */
export function scoreLine(systems: SystemScore[]): string {
  return systems.map((s) => `${s.label} ${s.score ?? "not used"}`).join(" · ");
}
