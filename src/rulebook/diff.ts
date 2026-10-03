// A line diff for the Deepen / Fix review: what a rewrite changes in a section.
// Plain LCS over lines (sections are short), grouped into hunks with context.

export interface DiffLine { op: " " | "+" | "-"; text: string }

/** Every line of `a` and `b`, marked kept, added or removed. */
export function diffLines(a: string, b: string): DiffLine[] {
  const x = a.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n");
  const y = b.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n");
  if (a === "") x.length = 0;
  if (b === "") y.length = 0;
  const n = x.length, m = y.length;
  // lcs[i][j] = length of the LCS of x[i..] and y[j..]
  const lcs: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) lcs[i][j] = x[i] === y[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const out: DiffLine[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) { out.push({ op: " ", text: x[i] }); i++; j++; }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) out.push({ op: "-", text: x[i++] });
    else out.push({ op: "+", text: y[j++] });
  }
  while (i < n) out.push({ op: "-", text: x[i++] });
  while (j < m) out.push({ op: "+", text: y[j++] });
  return out;
}

/** Only the changed lines with `context` unchanged lines around them; gaps become one "…" line. */
export function diffHunks(lines: DiffLine[], context = 2): DiffLine[] {
  const keep = new Array(lines.length).fill(false);
  lines.forEach((l, k) => { if (l.op !== " ") for (let d = -context; d <= context; d++) if (k + d >= 0 && k + d < lines.length) keep[k + d] = true; });
  const out: DiffLine[] = [];
  let skipped = false;
  lines.forEach((l, k) => {
    if (keep[k]) { if (skipped && out.length) out.push({ op: " ", text: "…" }); skipped = false; out.push(l); }
    else skipped = true;
  });
  return out;
}

export function diffStats(lines: DiffLine[]): { added: number; removed: number } {
  return { added: lines.filter((l) => l.op === "+").length, removed: lines.filter((l) => l.op === "-").length };
}
