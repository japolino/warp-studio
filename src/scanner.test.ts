// The host's install-time scanner refuses `fs`, `child_process`, sockets and
// workers in a backend bundle, and the page must not carry Warp's engine. These
// checks keep the CLI (the only file that touches the disk) out of both.

import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const SRC = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ROOT = join(SRC, "..");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".ts") && !p.endsWith(".test.ts") ? [p] : [];
  });
}

const rel = (p: string) => relative(SRC, p).replace(/\\/g, "/");
const imports = (text: string) => [...text.matchAll(/^\s*import\s+(type\s+)?[^;]*?from\s+"([^"]+)"/gm)].map((m) => ({ type: !!m[1], from: m[2] }));

describe("what each bundle may import", () => {
  const all = files(SRC).filter((p) => !rel(p).startsWith("tools/") && rel(p) !== "backend/fake-host.ts");

  test("nothing outside src/tools touches node: modules or the CLI", () => {
    for (const p of all) {
      const bad = imports(readFileSync(p, "utf8")).filter((i) => i.from.startsWith("node:") || /(^|\/)tools\//.test(i.from));
      expect({ file: rel(p), bad }).toEqual({ file: rel(p), bad: [] });
    }
  });

  test("the page imports only page and shared code (types from elsewhere are fine)", () => {
    for (const p of all.filter((x) => rel(x) === "frontend.ts" || rel(x).startsWith("frontend/") || rel(x).startsWith("shared/"))) {
      const bad = imports(readFileSync(p, "utf8")).filter((i) => !i.type && !(i.from.startsWith(".") && /^(frontend|shared)\//.test(rel(resolve(dirname(p), i.from)))));
      expect({ file: rel(p), bad }).toEqual({ file: rel(p), bad: [] });
    }
  });
});

test.skipIf(!existsSync(join(ROOT, "dist/backend.js")))("the built backend has nothing the host scanner refuses", () => {
  const js = readFileSync(join(ROOT, "dist/backend.js"), "utf8");
  for (const word of ["node:fs", "child_process", "new Function", "node:net", "worker_threads"]) expect({ word, found: js.includes(word) }).toEqual({ word, found: false });
  expect(/\beval\(/.test(js)).toBe(false);
});
