#!/usr/bin/env node
// warp-rulebook: write Warp rulesets outside Lumiverse. A command line for people
// and agents with a shell, and an MCP server (`mcp`) for agents that speak it.
// Built to dist/warp-rulebook.js (plain Node, no dependencies). Only this file
// touches the file system; the extension's backend never imports it.

import { readFileSync, writeFileSync } from "node:fs";
import { run } from "./commands.js";
import { lineReader } from "./mcp.js";

const io = {
  out: (t: string) => { process.stdout.write(t.endsWith("\n") ? t : `${t}\n`); },
  err: (t: string) => { process.stderr.write(t.endsWith("\n") ? t : `${t}\n`); },
  readFile: (p: string) => readFileSync(p, "utf8"),
  writeFile: (p: string, t: string) => writeFileSync(p, t),
};

const code = run(process.argv.slice(2), io);
if (code === -1) {
  const feed = lineReader({ readFile: io.readFile }, (line) => process.stdout.write(`${line}\n`));
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk: string) => feed(chunk));
} else {
  process.exitCode = code;
}
