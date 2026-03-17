# notion-cli

A CLI wrapper for the Notion API, designed for LLM/AI agent consumption.

Built on the principle that [CLIs beat MCP for AI agents](https://medium.com/@rentierdigital/why-clis-beat-mcp-for-ai-agents-and-how-to-build-your-own-cli-army-6c27b0aec969) — zero context overhead, composable via pipes, structured JSON output, clean exit codes.

## Install

```bash
# 1. Install
npm install -g @m2015agg/notion-cli

# 2. Set up (prompts for your API key, adds to shell profile + CLAUDE.md)
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

## Setup

### Per-Project

Run inside any project directory to add notion-cli docs to your CLAUDE.md, create a `.env`, and update `.gitignore`:

```bash
notion-cli init
```

### Global (already done during install)

Adds notion-cli documentation to `~/.claude/CLAUDE.md` and a `NOTION_API_KEY` placeholder to your shell profile:

```bash
notion-cli install
```

### Uninstall

```bash
notion-cli uninstall              # Remove from ~/.claude/CLAUDE.md
notion-cli uninstall --remove-env # Also remove NOTION_API_KEY from shell profile
npm uninstall -g notion-cli       # Remove the binary
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

## Agent-Friendly Design

Every command follows three rules from the [CLI army pattern](https://medium.com/@rentierdigital/why-clis-beat-mcp-for-ai-agents-and-how-to-build-your-own-cli-army-6c27b0aec969):

### 1. `--json` for structured output

All commands support `--json`. When stdout is piped (not a TTY), JSON is the default.

```bash
# Pipe to jq
notion-cli db query <id> --all --json | jq '.results | length'
```

### 2. Clean exit codes

- `0` = success
- `1` = error (with structured JSON on stderr)

```bash
notion-cli pages get invalid-id --json 2>/dev/null; echo $?
# 1
```

### 3. `--help` that explains everything

```bash
notion-cli db query --help
```

## Complex Inputs

Three tiers, from most to least flexible:

```bash
# 1. Pipe full JSON via stdin (agent preferred)
echo '{"parent":{"database_id":"abc"},"properties":{...}}' | notion-cli pages create --stdin --json

# 2. Inline JSON flags
notion-cli db query <id> --filter '{"property":"Status","status":{"equals":"Done"}}' --json

# 3. Convenience shorthands
notion-cli pages create --parent-page-id <id> --title "Quick Page" --json
```

## Generating LLM Docs

Generate a lean instruction snippet for any AI agent:

```bash
# Raw snippet (stdout)
notion-cli docs

# Append to CLAUDE.md
notion-cli docs --format claude >> CLAUDE.md

# For Codex
notion-cli docs --format agents >> AGENTS.md

# For Cursor
notion-cli docs --format cursor >> .cursorrules

# OpenClaw skill format
notion-cli docs --format skill > SKILL.md
```

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
