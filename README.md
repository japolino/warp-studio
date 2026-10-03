# Warp Studio

Creator tools for [Warp](https://github.com/japolino/warp) rulesets. A [Lumiverse](https://lumiverse.chat) extension,
plus the `warp-rulebook` command line and MCP server for outside agents (Claude Code, Codex, Cursor…).

Warp runs the game under a roleplay chat. Its rules live in the character's `warp-ruleset` lorebook. Warp itself
builds a small ruleset in one pass and can refine it. Studio is for people who want to go further:

- **Edit** a character's rules as a draft, one card per section, with Warp's own checker on every save.
- **Start** from the installed rules, from one of Warp's templates, from an older book (a backup), or from a file.
- **Import and export** a whole rulebook as one YAML file, to share it or to edit it with another tool.
- **Install** publishes the draft as a new `warp-ruleset` book: complete, checked again after saving, attached to the
  character. The old book stays attached as a backup.
- **Preview** what the player sees at the start and what the narrator is told.
- **`warp-rulebook`** CLI and MCP server: the guide, the templates, the checker and the preview, for agents.

Coming next (they need Warp's new ruleset format): **Check** (coverage of Warp's 6 core systems and balance, with
**Fix** for one finding), **Playtest** (Warp's whole-loop simulator and its quality gates, a contest table) and
**Deepen** (a bounded rewrite with the helper model, at most 12 calls, reviewed before anything is kept).

Studio works without Warp installed: it writes the book, and Warp reads it once it is installed.

## Install in Lumiverse

1. In Lumiverse, open **Extensions** → **Install from Source**.
2. Paste `https://github.com/japolino/warp-studio` and install. The built files (`dist/`) are in the repo.
3. Enable the permissions it asks for:

| Permission | Why |
|---|---|
| `characters` | Reading the card (name, description, attached books) and attaching the new book on Install |
| `world_books` | Reading the `warp-ruleset` book and publishing a new one |
| `generation` | The helper model for Fix and Deepen, and the list of connections in Settings. Everything else works without it |
| `ui_panels` | The **Warp Studio** drawer tab and the tab in the character editor |

## Use it

1. Open a chat with one character, then the **Warp Studio** tab in the drawer. Or open a character in the
   character editor and use its **Warp Studio** tab. With no chat open, the drawer lets you pick a character.
2. The top line says whether Warp is running here and which ruleset format it reads.
3. Start a draft: **Edit the installed rules**, **Start from** a template, start from an older book, or
   **Import a rulebook** (paste it or choose a file).
4. Edit the sections. **Save and check** runs Warp's checker; problems show on the section they come from. An
   empty section is removed on save.
5. **Install**. It is refused while a section has errors, and when the Warp in this window reads an older ruleset
   format than Studio writes (update Warp first). Open chats with this character ask once whether to keep their
   history, because the rules changed. Warp reads the new book within a few seconds (or use "Warp: Reload ruleset").
6. **Export** the draft or the installed rules as one file (copy it, or save it as `<name>.warp.yaml`).

Drafts are saved per character in Studio's own storage. Nothing reaches the lorebook until Install.

## The `warp-rulebook` CLI and MCP server

For writing a ruleset outside Lumiverse, by hand or with an agent. It needs Node 20 or newer.

```bash
npx -y github:japolino/warp-studio guide              # the authoring guide (workflow, format, design)
npx -y github:japolino/warp-studio templates          # the starting templates
npx -y github:japolino/warp-studio template <id> > rulebook.yaml
npx -y github:japolino/warp-studio check rulebook.yaml    # exit 1 on errors
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
| 0.1.0 (in development) | 1 (Warp before the new format) | `warp#8f61ee9` |

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
