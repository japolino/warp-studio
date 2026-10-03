# Warp Studio

Creator tools for [Warp](https://github.com/japolino/warp) rulesets. A [Lumiverse](https://lumiverse.chat) extension,
plus the `warp-rulebook` command line and MCP server for outside agents (Claude Code, Codex, Cursor…).

Warp runs the game under a roleplay chat. Its rules live in the character's `warp-ruleset` lorebook. Warp itself
builds a small ruleset in one pass and can refine it. Studio is for people who want to go further:

- **Edit** a character's rules as a draft, one card per section, with Warp's own checker on every save.
- **Start** from the installed rules, from one of Warp's templates, from an older book (a backup), or from a file.
- **Check**: a score for each of Warp's 6 core systems (Scene, People, Checks, Choices, Conflict, Growth) and a list
  of findings: *gaps* (declared, but it can never matter), *thin spots* (it works, but feels flat) and *balance*
  (odds, drift, rules that fire on turn one, contests the player can't win). Each finding says how to fix it.
  **Fix** asks the helper model to fix one finding; **Leave as is** keeps it on purpose, with a reason.
- **Playtest**: Warp's whole-loop simulator plays the draft with scripted players and a fake narrator (no model, no
  cost). Studio shows Warp's quality gates exactly as Warp computes them, the greedy player's tag share, the odds of
  each checked tag per difficulty word, and a contest table per kind.
- **Deepen**: the helper rewrites every section with open gaps or thin spots, in parallel, at most 12 calls. A rewrite
  is kept only if it has no errors, no score goes down and no gate that passed now fails. You review a diff per
  section and accept all, some or none.
- **Import and export** a whole rulebook as one YAML file, to share it or to edit it with another tool. A rulebook in
  Warp's old format loads with a banner; Deepen can rebuild its old parts as conflict kinds and goals.
- **Install** publishes the draft as a new `warp-ruleset` book: complete, checked again after saving, attached to the
  character. The old book stays attached as a backup.
- **`warp-rulebook`** CLI and MCP server: the guide, the templates, Check, the loop simulator and the preview, for agents.

Studio works without Warp installed: it writes the book, and Warp reads it once it is installed.

## Install in Lumiverse

1. In Lumiverse, open **Extensions** → **Install from Source**.
2. Paste `https://github.com/japolino/warp-studio` and install. The built files (`dist/`) are in the repo.
3. Enable the permissions it asks for:

| Permission | Why |
|---|---|
| `characters` | Reading the card (name, description, attached books) and attaching the new book on Install |
| `world_books` | Reading the `warp-ruleset` book and publishing a new one |
| `generation` | The helper model for Fix and Deepen, and the list of connections in Settings. Check, Playtest, import, export and Install work without it |
| `ui_panels` | The **Warp Studio** drawer tab and the tab in the character editor |

## Use it

1. Open a chat with one character, then the **Warp Studio** tab in the drawer. Or open a character in the
   character editor and use its **Warp Studio** tab. With no chat open, the drawer lets you pick a character.
2. The top line says whether Warp is running here and which ruleset format it reads.
3. Start a draft: **Edit the installed rules**, **Start from** a template, start from an older book, or
   **Import a rulebook** (paste it or choose a file).
4. Edit the sections. **Save and check** runs Warp's checker; problems show on the section they come from. An
   empty section is removed on save.
5. **Check** lists what is thin, system by system. Use **Fix** on one finding, **Leave as is** for what you want
   that way, or **Deepen** for all of it. A Fix or Deepen result opens in **Review**: nothing changes in the draft
   until you accept it. Cancel stops a running job.
6. **Playtest** runs Warp's loop simulator (size in Settings, 30 turns × 20 seeds by default). Run it again after
   changes; an old result says it is stale.
7. **Install**. It is refused while a section has errors, and when the Warp in this window reads an older ruleset
   format than Studio writes (update Warp first). Open chats with this character ask once whether to keep their
   history, because the rules changed. Warp reads the new book within a few seconds (or use "Warp: Reload ruleset").
8. **Export** the draft or the installed rules as one file (copy it, or save it as `<name>.warp.yaml`).

Drafts are saved per character in Studio's own storage. Nothing reaches the lorebook until Install.

## The `warp-rulebook` CLI and MCP server

For writing a ruleset outside Lumiverse, by hand or with an agent. It needs Node 20 or newer.

```bash
npx -y github:japolino/warp-studio guide              # the authoring guide (workflow, format, design)
npx -y github:japolino/warp-studio templates          # the starting templates
npx -y github:japolino/warp-studio template <id> > rulebook.yaml
npx -y github:japolino/warp-studio check rulebook.yaml    # lint + coverage of the 6 core systems; exit 1 on errors
npx -y github:japolino/warp-studio simulate rulebook.yaml # Warp's loop simulator; exit 1 if a gate fails
npx -y github:japolino/warp-studio preview rulebook.yaml
npx -y github:japolino/warp-studio --version
```

From a clone, use `node dist/warp-rulebook.js <command>` instead.

As an MCP server it offers `warp_guide`, `warp_templates`, `warp_template`, `warp_check`, `warp_simulate` and
`warp_preview` (the same names as the old Warp server, so existing configs keep working):

```bash
claude mcp add warp -- npx -y github:japolino/warp-studio mcp
```

This repo's `.mcp.json` declares the same server for agents started in a clone. The agent skill is
[`skills/warp-rulebook/SKILL.md`](skills/warp-rulebook/SKILL.md); the full guide is
[`docs/RULEBOOK_GUIDE.md`](docs/RULEBOOK_GUIDE.md) (generated). Hand the finished file over in Lumiverse:
**Warp Studio → Import a rulebook**, then **Install**.

## Versions

Studio is built against one Warp commit (the engine is bundled into `dist/`). `warp-rulebook --version` and the
About line in Studio's settings show it.

| Warp Studio | Ruleset format | Warp engine |
|---|---|---|
| 0.1.0 | 2 | `warp#67fc280` |

A test fails when Warp's ruleset format is not the one Studio is written for. At run time, Studio asks the Warp in the
same window which format it reads (`rulesetFormat` in Warp's `warp-state-v1` event) and refuses to install for an
older Warp. Every book Studio installs is stamped with the format and `warp_studio@<version>`.

## Development

```bash
bun install
bun run verify   # tests + typecheck
bun run build    # dist/backend.js, dist/frontend.js, dist/warp-rulebook.js, docs/RULEBOOK_GUIDE.md
```

- Warp's engine is a pinned devDependency: `"warp": "github:japolino/warp#<full sha>"`. A local `file:` path fails on
  Windows; use the GitHub pin, or `bun link` in a Warp checkout (with its `node_modules`) and `"warp": "link:warp"`
  while developing.
- `src/warp.ts` is the only file that imports from Warp. To move to a new Warp commit: `bun add -d
  github:japolino/warp#<sha>`, `bun run verify`, `bun run guide`, then review the findings and the texts.
- The backend must never import `src/tools/` (the host refuses `fs` in a backend bundle); a test checks it.
- Tests use a fake host (`src/backend/fake-host.ts`): no network, no models, no keys.
