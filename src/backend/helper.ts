// One quiet call on the helper connection (Lumiverse's active connection when
// none is set), for Fix and Deepen. Every call is counted against a budget.

import type { GenerationResponseDTO } from "lumiverse-spindle-types";
import { host } from "./host.js";

/** A hard cap on helper calls for one Fix or Deepen run. */
export class Budget {
  used = 0;
  constructor(readonly max: number) {}
  get left() { return Math.max(0, this.max - this.used); }
  take() {
    if (this.used >= this.max) throw new BudgetSpent(this.max);
    this.used++;
  }
}

export class BudgetSpent extends Error {
  constructor(max: number) { super(`The helper call budget (${max}) is used up.`); this.name = "BudgetSpent"; }
}

export interface HelperOptions {
  connectionId: string;
  creative: boolean;
  signal: AbortSignal;
  budget: Budget;
  userId?: string;
  maxTokens?: number;
  timeoutMs?: number;
}

export async function askHelper(system: string, user: string, o: HelperOptions): Promise<string> {
  if (o.signal.aborted) throw o.signal.reason instanceof Error ? o.signal.reason : new Error("Cancelled.");
  o.budget.take();
  const res = (await host().generate.quiet({
    type: "quiet",
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    connection_id: o.connectionId || undefined,
    parameters: { temperature: o.creative ? 0.8 : 0.4, max_tokens: o.maxTokens ?? 3500 },
    userId: o.userId,
    signal: AbortSignal.any([o.signal, AbortSignal.timeout(o.timeoutMs ?? 180_000)]),
  })) as GenerationResponseDTO | string;
  return typeof res === "string" ? res : res?.content ?? "";
}
