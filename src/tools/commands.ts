// The warp-rulebook commands. `run` takes its I/O as arguments, so the tests run
// it in process; cli.ts wires it to Node.

import { checkReport, checkText, guideMarkdown, guideText, previewText, simulateText, templateList, templateText, VERSION_LINE, type GuideSection } from "./rulebook-tools.js";

export interface CommandIO {
  out(text: string): void;
  err(text: string): void;
  readFile(path: string): string;
  writeFile(path: string, text: string): void;
}

export const USAGE = `warp-rulebook — write Warp rulesets with any tool

  guide [--section workflow|format|design] [--topic <word>] [--markdown [--out file]]
                                  The authoring guide (workflow, format reference, design guide)
  templates                       The starting templates
  template <id>                   One template as a ruleset file
  check <file...> [--json]        Load and lint it the way Warp does (exit 1 on errors)
  simulate <file...> [--turns n] [--seeds n] [--policy mixed|greedy|always:<tag>] [--json]
                                  Playtest the whole loop with Warp's loop simulator (exit 1 if a gate fails)
  preview <file...>               The status panel, the actions and the narrator's view at the start
  mcp                             All of this as an MCP server (stdio)
  --version                       Studio version, ruleset format and engine pin

Hand the finished file over in Lumiverse: Warp Studio → Import a rulebook, then Install.`;

const VALUELESS = new Set(["--json", "--markdown"]);

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function files(args: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) { if (!VALUELESS.has(args[i])) i++; continue; }
    out.push(args[i]);
  }
  return out;
}

/** Run one command. Returns the exit code, or -1 for `mcp` (the caller serves stdin). */
export function run(argv: string[], io: CommandIO): number {
  const [cmd, ...args] = argv;
  const read = (paths: string[]) => {
    if (!paths.length) throw new Error("Give the ruleset file (e.g. rulebook.yaml).");
    return paths.map((p) => io.readFile(p));
  };
  try {
    switch (cmd) {
      case "guide": {
        if (args.includes("--markdown")) {
          const out = flag(args, "--out");
          if (out) io.writeFile(out, guideMarkdown());
          else io.out(guideMarkdown());
          return 0;
        }
        io.out(guideText((flag(args, "--section") ?? "all") as GuideSection, flag(args, "--topic")));
        return 0;
      }
      case "templates": io.out(templateList()); return 0;
      case "template": {
        const t = templateText(args[0] ?? "");
        if (!t) { io.err(`No template "${args[0] ?? ""}".\n\n${templateList()}`); return 1; }
        io.out(t);
        return 0;
      }
      case "check": {
        const rep = checkReport(read(files(args)));
        io.out(args.includes("--json") ? JSON.stringify(rep, null, 2) : checkText(rep));
        return rep.ok ? 0 : 1;
      }
      case "simulate": {
        const res = simulateText(read(files(args)));
        io.out(res.text);
        return res.ok ? 0 : 1;
      }
      case "preview": io.out(previewText(read(files(args)))); return 0;
      case "mcp": return -1;
      case "version": case "--version": case "-v": io.out(VERSION_LINE); return 0;
      default:
        io.out(USAGE);
        return cmd && cmd !== "help" && cmd !== "--help" && cmd !== "-h" ? 1 : 0;
    }
  } catch (e) {
    io.err(e instanceof Error ? e.message : String(e));
    return 1;
  }
}
