import { expect, test } from "bun:test";
import { diffHunks, diffLines, diffStats } from "./diff.js";

test("kept, added and removed lines, in order", () => {
  const d = diffLines("a\nb\nc\n", "a\nB\nc\nd\n");
  expect(d).toEqual([{ op: " ", text: "a" }, { op: "-", text: "b" }, { op: "+", text: "B" }, { op: " ", text: "c" }, { op: "+", text: "d" }]);
  expect(diffStats(d)).toEqual({ added: 2, removed: 1 });
});

test("empty sides and CRLF", () => {
  expect(diffLines("", "x\n")).toEqual([{ op: "+", text: "x" }]);
  expect(diffLines("x\r\n", "")).toEqual([{ op: "-", text: "x" }]);
  expect(diffLines("x\r\ny", "x\ny\n").every((l) => l.op === " ")).toBe(true);
});

test("hunks keep context and fold the rest", () => {
  const a = Array.from({ length: 20 }, (_, i) => `l${i}`).join("\n");
  const b = a.replace("l3", "L3").replace("l15", "L15");
  const h = diffHunks(diffLines(a, b), 1);
  expect(h.map((l) => `${l.op}${l.text}`)).toEqual([" l2", "-l3", "+L3", " l4", " …", " l14", "-l15", "+L15", " l16"]);
});
