# notion-cli

[![npm version](https://img.shields.io/npm/v/@m2015agg/notion-cli)](https://www.npmjs.com/package/@m2015agg/notion-cli)
[![license](https://img.shields.io/npm/l/@m2015agg/notion-cli)](https://github.com/m2015agg/notion-cli/blob/main/LICENSE)

A CLI wrapper for the Notion API, designed for LLM/AI agent consumption.

A shell-native alternative to the Notion MCP server — one exec call with clean exit codes, composable via pipes, structured JSON output, and a local workspace snapshot cache the official Notion MCP server doesn't offer. Setup is skill-first: the full command reference installs as an on-demand [agent skill](#the-docs-are-baked-in-skill-first), so it costs zero context in sessions that never touch Notion.

## Why This Exists

This started with watching Claude get lost in the Notion MCP for the third time in one afternoon — not crashing, just confused: wrong tool, wrong parameters, and auth silently failing in between. The fix wasn't a better prompt. It was a different interface.

GUIs are for humans. APIs are for services. **CLIs are for agents.** An agent that lives in a terminal already knows how to run a command, read JSON from stdout, check `$?`, and pipe the result into the next step. So instead of debugging an integration, this project wraps the entire Notion API surface — pages, databases, blocks, comments, search, file uploads, users — in a CLI built to those instincts (the [CLI army pattern](https://medium.com/@rentierdigital/why-clis-beat-mcp-for-ai-agents-and-how-to-build-your-own-cli-army-6c27b0aec969)).

The payoff is a different workflow. You stop manually pulling information out of Notion and pasting it into context. You just say:

> "Search Notion for the sprint plan, pull the in-progress items, and tell me what's blocked."

Claude runs the CLI (against the local snapshot cache when one exists), parses the JSON, and answers. One exec call. No MCP server running in the background, no protocol handshake, no session that quietly went stale mid-task.

## Quick Start

```bash
# 1. Install globally
npm install -g @m2015agg/notion-cli

# 2. Set up (prompts for API key, validates it, installs the agent skill,
#    adds a pointer to ~/.claude/CLAUDE.md and the key to your shell profile)
notion-cli install

# 3. Reload shell
source ~/.bashrc  # or source ~/.zshrc

# 4. Initialize in your project (project skill + pointer, .env, permissions, snapshot)
cd your-project && notion-cli init

# 5. Use /notion in Claude Code for a guided walkthrough

# 6. Check setup health
notion-cli doctor
```

## Install

```bash
# 1. Install
npm install -g @m2015agg/notion-cli

# 2. Set up (prompts for your API key, installs the agent skill,
#    adds a CLAUDE.md pointer and the key to your shell profile)
notion-cli install

# 3. Reload shell
source ~/.bashrc  # or source ~/.zshrc

# 4. Verify
notion-cli users me --json
```

Or non-interactive:
```bash
npm install -g @m2015agg/notion-cli
notion-cli install --api-key ntn_your-key-here
source ~/.bashrc
```

### Getting a Notion API Key

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create a new integration
3. Copy the "Internal Integration Secret" (starts with `ntn_`)
4. Share your Notion pages/databases with the integration

The CLI reads `NOTION_API_KEY` from the environment, and auto-loads it from a `.env` in the current directory when the variable isn't already set (only that one key; a real environment variable always wins).

## Setup

### The Docs Are Baked In (Skill-First)

A CLI without documentation is useless to an agent. The binary does the work; the doc teaches the agent how to use it. notion-cli ships both as a unit — a complete, agent-ready command reference written for LLM consumption, not a vague help page — so your agent knows the full surface area before you type a word.

As of v0.6.0, setup no longer pastes the full command reference into your CLAUDE.md. Instead it writes an on-demand **agent skill** and leaves a one-line pointer behind. Claude Code loads skills lazily — only the frontmatter description is read at session start, so the full reference costs zero context in sessions that never touch Notion. It's the same lazy-loading argument this tool makes against MCP schema dumps, applied to its own docs.

If a previous version injected the full reference into your CLAUDE.md, the next time you run `install`/`init` yourself it migrates to the pointer automatically (the injected block is marker-delimited). Automatic refreshes — npm postinstall and `notion-cli update` — preserve an existing full-doc block instead, so an explicit `install --claude-md` choice survives upgrades.

### Global (already done during install)

Writes the skill to `~/.claude/skills/notion-cli/SKILL.md`, puts a one-line pointer in `~/.claude/CLAUDE.md`, and adds `NOTION_API_KEY` to your shell profile:

```bash
notion-cli install

# Legacy behavior: inject the full reference into CLAUDE.md instead of skill + pointer
notion-cli install --claude-md
```

### Per-Project

Run inside any project directory for the project-scoped equivalent — `.claude/skills/notion-cli/SKILL.md` plus a pointer in the project `CLAUDE.md` — and to create a `.env`, update `.gitignore`, install the `/notion` walkthrough command, approve read permissions, snapshot the workspace, and set up the nightly cron:

```bash
notion-cli init
```

### Health Check

```bash
notion-cli doctor
```

Validates: API key set, API key works, agent skill installed, .env configured, permissions approved.

### Approve Permissions

Pre-approve read-only commands in Claude Code so you don't get prompted:

```bash
# Project-level (recommended)
notion-cli approve

# Global
notion-cli approve --global

# Remove approvals
notion-cli approve --remove
```

### Self-Update

```bash
# Check for updates
notion-cli update --check

# Update to latest
notion-cli update
```

### Uninstall

```bash
notion-cli uninstall              # Remove the agent skill + pointer from ~/.claude
                                  # (also drops this project's SessionStart snapshot hook)
notion-cli uninstall --remove-env # Also remove NOTION_API_KEY from shell profile
npm uninstall -g @m2015agg/notion-cli  # Remove the binary
```

## Commands

### Pages

```bash
# Retrieve page properties
notion-cli pages get <page_id> --json

# Retrieve page content as markdown
notion-cli pages get <page_id> --markdown --json

# Create a page
notion-cli pages create --parent-page-id <id> --title "My Page" --json

# Create a page with markdown content
notion-cli pages create --parent-page-id <id> --title "Page" --markdown "# Hello World" --json

# Create a database row
notion-cli pages create --parent-database-id <id> --properties '{"Name":{"title":[{"text":{"content":"Row"}}]}}' --json

# Update a page
notion-cli pages update <page_id> --title "New Title" --icon-emoji "🚀" --json

# Trash a page
notion-cli pages update <page_id> --archive --json
```

### Databases

```bash
# Get database schema (columns, not rows)
notion-cli db get <database_id> --json

# Create a database
notion-cli db create --parent-page-id <id> --title "My DB" --json

# Query rows
notion-cli db query <database_id> --json

# Query ALL rows (auto-paginates)
notion-cli db query <database_id> --all --json

# Filter rows
notion-cli db query <database_id> --filter '{"property":"Status","status":{"equals":"Done"}}' --json

# Sort rows
notion-cli db query <database_id> --sorts '[{"property":"Date","direction":"descending"}]' --json

# Compound filter via stdin
echo '{"filter":{"and":[{"property":"Category","select":{"equals":"Backend"}},{"property":"Status","select":{"equals":"Done"}}]}}' | notion-cli db query <database_id> --stdin --json
```

### Blocks

```bash
# Get a block
notion-cli blocks get <block_id> --json

# List child blocks
notion-cli blocks children <block_id> --all --json

# Append content to a page/block
notion-cli blocks append <block_id> --children '[{"object":"block","type":"paragraph","paragraph":{"rich_text":[{"type":"text","text":{"content":"Hello"}}]}}]' --json

# Delete a block
notion-cli blocks delete <block_id> --json
```

### Comments

```bash
# Comment on a page
notion-cli comments create --page-id <id> --text "Great work!" --json

# Reply to a discussion thread
notion-cli comments create --discussion-id <id> --text "Thanks!" --json

# List comments
notion-cli comments list <block_id> --all --json
```

### Search

```bash
# Search everything
notion-cli search "query" --json

# Search pages only
notion-cli search "query" --filter-type page --json

# Search databases only
notion-cli search "query" --filter-type database --json

# List all shared items
notion-cli search --all --json
```

### File Uploads

```bash
# Upload a file
notion-cli files upload ./document.pdf --json

# Check upload status
notion-cli files get <file_upload_id> --json

# List uploads
notion-cli files list --status uploaded --json
```

### Users

```bash
# Current bot user (auth check)
notion-cli users me --json

# List workspace users
notion-cli users list --json
```

## Workspace Snapshot (Local Cache)

Cache your entire Notion workspace structure locally for instant searches:

```bash
# Snapshot all shared pages and databases
notion-cli snapshot

# Refresh only if the cache is older than 24 hours (cheap no-op otherwise)
notion-cli snapshot --if-stale 24

# Search cached workspace
notion-cli workspace search "backend"
notion-cli workspace pages
notion-cli workspace databases
notion-cli workspace schema <database_id>
notion-cli workspace tree            # hierarchical page/database view
```

One API call snapshots everything into SQLite + FTS5 + markdown:

```
.notion-cache/
├── workspace.db         # SQLite + FTS5 (fast queries)
├── index.md             # All pages + databases overview
├── pages/               # (future: page summaries)
└── databases/
    └── <id>.md          # Database schema (properties + types)
```

Your agent searches locally instead of hitting the Notion API every time. `init` runs snapshot + nightly cron automatically.

### Keeping the Cache Fresh

```bash
# Nightly refresh via cron (init sets this up)
notion-cli cron --time 03:30
notion-cli cron --status
notion-cli cron --remove

# Claude Code SessionStart hook: runs `notion-cli snapshot --if-stale 24`
# when a session starts, so the cache is never more than a day old
notion-cli cron --hook
```

## Why a CLI Instead of MCP?

The original 2025 argument had two prongs that compounded. Every MCP server dumped its whole capability schema into context before doing anything useful — and despite eating all that context, the LLM still picked the wrong tool with the wrong parameters. Then the auth layer underneath failed silently, and the agent confidently returned garbage you only caught when you checked Notion and nothing had changed.

Half of that critique is now dated, and this README won't pretend otherwise: modern Claude Code defers MCP tool schemas and loads them on demand, so the "schema dump eats 30-40% of your context window" problem has largely evaporated. The advantages that endure are structural:

- **No persistent auth layer** — an MCP server holds a session that can silently go stale mid-conversation; the CLI reads `NOTION_API_KEY` fresh on every invocation and fails loudly if it's wrong.
- **One exec call with clean exit codes** — success or failure is `$?`, not a tool-result blob to interpret.
- **Shell composability** — pipes, `jq`, exit-code branching, `xargs`, cron. A CLI slots into every workflow the shell already has.
- **The local `.notion-cache/` snapshot** — offline FTS5 search over your whole workspace, which the official Notion MCP server doesn't offer.

Skills apply the same lazy-loading philosophy to documentation: load nothing until the task needs it. That's why this tool's own docs install as an on-demand skill rather than a CLAUDE.md dump — the argument this tool makes against MCP is one it also applies to itself.

## Agent-Friendly Design

Every command follows three rules from the [CLI army pattern](https://medium.com/@rentierdigital/why-clis-beat-mcp-for-ai-agents-and-how-to-build-your-own-cli-army-6c27b0aec969):

### 1. `--json` for structured output

All commands support `--json`. When stdout is piped (not a TTY), JSON is the default. Your agent can't parse an ASCII table; it can parse JSON.

```bash
# Pipe to jq
notion-cli db query <id> --all --json | jq '.results | length'
```

### 2. Clean exit codes

- `0` = success
- `1` = error (with structured JSON on stderr)

That's it. The agent uses `$?` to decide what to do next — a CLI that exits 0 on failure is a silent killer.

```bash
notion-cli pages get invalid-id --json 2>/dev/null; echo $?
# 1
```

### 3. `--help` that explains everything

Agents read `--help` the way humans read READMEs. If it's vague, the agent hallucinates flags. Every command states exactly what it does, what it takes, and what comes back.

```bash
notion-cli db query --help
```

## Complex Inputs

Agents love stdin. Rather than jamming a compound filter object into an inline flag, pipe the full JSON payload directly. Three tiers, from most to least flexible — the agent uses whichever fits the task:

```bash
# 1. Pipe full JSON via stdin (agent preferred)
echo '{"parent":{"database_id":"abc"},"properties":{...}}' | notion-cli pages create --stdin --json

# 2. Inline JSON flags
notion-cli db query <id> --filter '{"property":"Status","status":{"equals":"Done"}}' --json

# 3. Convenience shorthands
notion-cli pages create --parent-page-id <id> --title "Quick Page" --json
```

## Generating LLM Docs

One command reference, routed to whatever agent you run:

```bash
# Raw snippet (stdout)
notion-cli docs

# Append to CLAUDE.md
notion-cli docs --format claude >> CLAUDE.md

# For Codex
notion-cli docs --format agents >> AGENTS.md

# For Cursor
notion-cli docs --format cursor >> .cursorrules

# Agent skill with YAML frontmatter — exactly what install/init write
notion-cli docs --format skill > SKILL.md
```

## Limitations

- **Database visibility** — Notion databases must be explicitly shared with the integration to appear in snapshots. If you see 0 databases, share them in Notion.
- **Page content not cached** — Snapshot caches page titles and metadata, not full page content (too expensive for large workspaces). Use `pages get --markdown` for content.
- **No real-time sync** — Cache refreshes via nightly cron or manual `snapshot`. Changes between refreshes won't appear.
- **Rate limits** — Large workspaces (1000+ pages) may hit Notion API rate limits during snapshot. The SDK handles retries automatically.

## Benchmarks

9-eval benchmark suite comparing notion-cli (with local SQLite cache) vs the official Notion MCP server. Each eval runs 3 times for consistency. Graded on task completion + assertion matching.

### Results Summary

| Eval | CLI Pass | CLI Time | MCP Pass | MCP Time | Speedup |
|------|----------|----------|----------|----------|---------|
| workspace_search | **100%** | 9.2s | 83% | 25.5s | **2.8x** |
| targeted_lookup | **100%** | 13.4s | 100% | 28.9s | **2.2x** |
| cross_reference | 83% | 15.1s | **100%** | 31.3s | **2.1x** |
| page_lookup | **50%** | 19.5s | 0% | 57.4s | **2.9x** |
| workspace_tree | **33%** | 43.1s | 0% | 48.4s | **1.1x** |
| find_recent | 33% | 16.9s | 33% | 30.8s | **1.8x** |
| db_create | 0% | 42.3s | 11% | 80.1s | **1.9x** |
| page_create | 0% | 47.3s | 0% | 96.4s | **2.0x** |
| workspace_overview | 0% | 61.8s | 0% | 42.1s | 1.5x slower |
| **OVERALL** | **44%** | **29.9s** | **36%** | **49.0s** | **2.1x** |

### Key Takeaways

- **CLI is 2.1x faster on average** — local SQLite cache eliminates network round-trips
- **CLI wins 8 of 9 evals on speed** — workspace_overview is the only MCP advantage
- **Read operations dominate** — workspace_search (2.8x), page_lookup (2.9x), targeted_lookup (2.2x)
- **Write operations** — both struggle with strict assertions, but CLI is still 2x faster
- **Pass rate: CLI 44% vs MCP 36%** — CLI is more reliable for task completion

### Running Benchmarks

```bash
cd benchmarks
./run_benchmark.sh          # Run all 54 evaluations
python3 grade_results.py    # Grade with assertion matching
```

Full results in `benchmarks/grading/` directory.

## Roadmap

### v0.6 — Skill-First Setup (shipped in 0.6.0)
- [x] On-demand agent skill (`skills/notion-cli/SKILL.md`) instead of full CLAUDE.md injection
- [x] One-line CLAUDE.md pointer, with automatic migration of legacy full-doc injections
- [x] Automatic `.env` loading (`NOTION_API_KEY` from the current directory)
- [x] `snapshot --if-stale <hours>` and `cron --hook` (SessionStart auto-refresh)
- [x] `docs --format skill` emits the skill with frontmatter

### v0.7 — Richer Cache
- [ ] Cache database row counts via `db query --count`
- [ ] Cache page content summaries (first 200 chars)
- [x] `workspace tree` — hierarchical page/database view (shipped in 0.5.1)
- [ ] `workspace diff` — detect changes since last snapshot

### v0.8 — Semantic Search
- [ ] Optional vector embeddings for page titles + content
- [ ] `workspace search --semantic "project status updates"` → fuzzy matching
- [ ] Cross-reference with supabase-skill and context7-skill caches

### v1.0 — Full Workspace Intelligence
- [ ] Anthropic skills marketplace listing
- [x] Benchmarks: CLI vs Notion MCP server (44% vs 36%, 2.1x faster)
- [x] Cursor `.cursorrules` and Codex `AGENTS.md` generation (`docs --format cursor` / `--format agents`)
- [ ] Template operations (create pages from templates)

## Companion Packages

- **[@m2015agg/supabase-skill](https://www.npmjs.com/package/@m2015agg/supabase-skill)** — Same pattern for Supabase database schema (100% benchmark pass rate)
- **[@m2015agg/context7-skill](https://www.npmjs.com/package/@m2015agg/context7-skill)** — Same pattern for library documentation

## Development

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm run dev          # Watch mode
npm test             # Run tests
npm run link         # Build + link globally
```

## Tech Stack

- **TypeScript** (ESM, strict mode)
- **[@notionhq/client](https://github.com/makenotion/notion-sdk-js)** v5.13.0 — official Notion SDK (zero-dep)
- **[Commander.js](https://github.com/tj/commander.js)** v13 — CLI framework
- **[Vitest](https://vitest.dev)** — test runner

## License

MIT
