# notion-cli

CLI wrapper for the Notion API. Designed for LLM/AI agent consumption.

## Setup
- Requires: Node.js 20+, `NOTION_API_KEY` env var (auto-loaded from `./.env` when unset; a real env var always wins)
- Build: `npm run build`
- Link locally: `npm run link`
- Test: `npm test`
- Global install: `notion-cli install` - writes agent skill to `~/.claude/skills/notion-cli/SKILL.md` + one-line pointer in `~/.claude/CLAUDE.md` + shell profile key; `--claude-md` = legacy full injection into CLAUDE.md
- Init in project: `notion-cli init` - project skill (`.claude/skills/notion-cli/SKILL.md`) + pointer in project CLAUDE.md, plus `.env`, `.gitignore`, `/notion` command, permissions, snapshot, nightly cron
- Legacy full-doc CLAUDE.md injections migrate to the pointer when `install`/`init` run explicitly (marker-delimited); npm postinstall (`install --postinstall`) refreshes an existing full-doc block in place so `--claude-md` survives updates
- Health check: `notion-cli doctor`

## Available CLIs

### Pages
- `notion-cli pages get <page_id> --json` - retrieve page properties
- `notion-cli pages get <page_id> --markdown --json` - retrieve page content as markdown
- `notion-cli pages get <page_id> --filter-properties id1,id2 --json` - specific properties only
- `notion-cli pages create --parent-page-id <id> --title "My Page" --json` - create page
- `notion-cli pages create --parent-database-id <id> --properties '<json>' --json` - create DB row
- `notion-cli pages create --parent-page-id <id> --title "Page" --markdown "# Hello" --json` - with markdown
- `notion-cli pages update <page_id> --title "New Title" --json` - update title
- `notion-cli pages update <page_id> --properties '<json>' --json` - update properties
- `notion-cli pages update <page_id> --icon-emoji "🚀" --json` - update icon
- `notion-cli pages update <page_id> --archive --json` - move to trash

### Databases
- `notion-cli db get <database_id> --json` - get schema (columns, not rows)
- `notion-cli db create --parent-page-id <id> --title "My DB" --json` - create database
- `notion-cli db create --parent-page-id <id> --title "DB" --properties '<json>' --json` - with schema
- `notion-cli db update <database_id> --title "Name" --json` - rename
- `notion-cli db update <database_id> --lock --json` - lock from UI editing
- `notion-cli db query <database_id> --json` - get rows (page 1, max 100)
- `notion-cli db query <database_id> --all --json` - get ALL rows (auto-paginates)
- `notion-cli db query <database_id> --filter '<json>' --json` - filtered query
- `notion-cli db query <database_id> --sorts '<json>' --json` - sorted query

### Blocks
- `notion-cli blocks get <block_id> --json` - retrieve a block
- `notion-cli blocks delete <block_id> --json` - delete (trash) a block
- `notion-cli blocks children <block_id> --json` - list child blocks
- `notion-cli blocks children <block_id> --all --json` - list ALL child blocks
- `notion-cli blocks append <block_id> --children '<json>' --json` - append children
- `notion-cli blocks append <block_id> --stdin --json` - append from piped JSON
- `notion-cli blocks update <block_id> --content '<json>' --json` - update block content
- `notion-cli blocks update <block_id> --archive --json` - trash a block

### Comments
- `notion-cli comments create --page-id <id> --text "Comment" --json` - comment on page
- `notion-cli comments create --block-id <id> --text "Comment" --json` - comment on block
- `notion-cli comments create --discussion-id <id> --text "Reply" --json` - reply to thread
- `notion-cli comments list <block_id> --json` - list comments
- `notion-cli comments list <block_id> --all --json` - list ALL comments
- `notion-cli comments get <comment_id> --json` - retrieve a comment

### Search
- `notion-cli search "query" --json` - search pages and databases
- `notion-cli search "query" --filter-type page --json` - pages only
- `notion-cli search "query" --filter-type database --json` - databases only
- `notion-cli search --all --json` - list all shared items
- `notion-cli search "query" --sort-direction descending --json` - sort by last edited

### File Uploads
- `notion-cli files upload <filepath> --json` - upload file (returns file_upload object)
- `notion-cli files get <file_upload_id> --json` - check upload status
- `notion-cli files list --json` - list uploads
- `notion-cli files list --status uploaded --json` - filter by status

### Users
- `notion-cli users me --json` - current bot user (auth check)
- `notion-cli users list --json` - list workspace users
- `notion-cli users list --all --json` - list ALL workspace users

### Stdin (pipe JSON for complex requests)
- `echo '<json>' | notion-cli pages create --stdin --json`
- `echo '<json>' | notion-cli db query <id> --stdin --json`
- `echo '<json>' | notion-cli blocks append <id> --stdin --json`
- `echo '<json>' | notion-cli comments create --stdin --json`

### Workspace Snapshot (local `.notion-cache/`)
- `notion-cli snapshot` - cache workspace structure (pages, databases, schemas)
- `notion-cli snapshot --if-stale 24` - refresh only if cache is older than 24 hours
- `notion-cli workspace search <query>` - FTS5 search across cached pages, databases, properties
- `notion-cli workspace pages` / `notion-cli workspace databases` - list cached items
- `notion-cli workspace schema <database_id>` - cached database schema
- `notion-cli cron --time 03:30` - nightly snapshot refresh (`--status`, `--remove`)
- `notion-cli cron --hook` - Claude Code SessionStart hook running `notion-cli snapshot --if-stale 24`

### Setup / Docs
- `notion-cli install` / `notion-cli init` / `notion-cli doctor` / `notion-cli approve` / `notion-cli uninstall` / `notion-cli update`
- `notion-cli docs --format skill` - print the agent skill (SKILL.md with frontmatter)
- Other docs formats: `claude`, `agents`, `cursor`, `raw`

## Architecture
- `src/index.ts` - Entry point, Commander program
- `src/client.ts` - Notion SDK client (reads NOTION_API_KEY)
- `src/output.ts` - JSON/human output formatting
- `src/errors.ts` - Error handling wrapper (withErrorHandling HOF)
- `src/commands/pages/` - Pages (create, get, update)
- `src/commands/db/` - Databases (create, get, update, query)
- `src/commands/blocks/` - Blocks (get, delete, children, append, update)
- `src/commands/comments/` - Comments (create, list, get)
- `src/commands/search.ts` - Search
- `src/commands/files/` - File uploads (upload, get, list)
- `src/commands/users/` - Users (me, list)
- `src/commands/docs.ts` - Generate LLM instruction snippets (incl. `--format skill`)
- `src/commands/install.ts` - Global setup (skill + pointer + shell profile)
- `src/commands/init.ts` - Per-project setup
- `src/commands/snapshot.ts` / `workspace.ts` / `cron.ts` - Local cache: build, query, auto-refresh
- `src/commands/doctor.ts` / `approve.ts` / `uninstall.ts` / `update.ts` - Health, permissions, lifecycle
- `src/util/skill.ts` - Agent skill install/remove (`skills/notion-cli/SKILL.md` in a `.claude` dir)
- `src/util/skill-doc.ts` - `SKILL_DOC`: the full command reference markdown
- `src/util/claude-md.ts` - Marker-delimited CLAUDE.md upsert (pointer by default, full doc legacy)
- `src/util/` - Also: pagination, stdin, datasource resolution, icon/cover builder, workspace DB

## Conventions
- All commands support `--json` for structured output (auto-enabled when piped)
- Complex inputs via `--stdin` (pipe JSON) or inline JSON flags
- Exit code 0 = success, 1 = error (JSON error on stderr)
- SDK v5 uses `dataSources.query()` — CLI resolves database_id → data_source_id automatically
