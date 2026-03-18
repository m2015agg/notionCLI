---
name: notion-cli
description: Query and manage Notion pages and databases via CLI.
metadata:
  requires:
    env:
      - NOTION_API_KEY
    bins:
      - notion-cli
      - node
    primaryEnv: NOTION_API_KEY
---

# notion-cli

## notion-cli (Notion API)

Requires: `NOTION_API_KEY` env var. Returns JSON by default when piped.

### Pages
- `notion-cli pages get <page_id> --json` — retrieve page properties
- `notion-cli pages get <page_id> --markdown --json` — retrieve page content as markdown
- `notion-cli pages create --parent-page-id <id> --title "Title" --json` — create page
- `notion-cli pages create --parent-database-id <id> --properties '<json>' --json` — create DB row
- `notion-cli pages update <page_id> --title "New" --json` — update page
- `notion-cli pages update <page_id> --properties '<json>' --json` — update properties
- `notion-cli pages update <page_id> --archive --json` — trash page

### Databases
- `notion-cli db get <database_id> --json` — get schema (columns, not rows)
- `notion-cli db create --parent-page-id <id> --title "Name" --json` — create DB
- `notion-cli db update <database_id> --title "Name" --json` — update DB
- `notion-cli db query <database_id> --json` — get rows (page 1)
- `notion-cli db query <database_id> --all --json` — get ALL rows
- `notion-cli db query <database_id> --filter '<json>' --json` — filtered query
- `notion-cli db query <database_id> --sorts '<json>' --json` — sorted query

### Blocks
- `notion-cli blocks get <block_id> --json` — retrieve a block
- `notion-cli blocks delete <block_id> --json` — delete (trash) a block
- `notion-cli blocks children <block_id> --json` — list child blocks (page 1)
- `notion-cli blocks children <block_id> --all --json` — list ALL child blocks
- `notion-cli blocks append <block_id> --children '<json>' --json` — append child blocks
- `notion-cli blocks update <block_id> --content '<json>' --json` — update block content
- `notion-cli blocks update <block_id> --archive --json` — trash a block

### Comments
- `notion-cli comments create --page-id <id> --text "Comment" --json` — comment on a page
- `notion-cli comments create --block-id <id> --text "Comment" --json` — comment on a block
- `notion-cli comments create --discussion-id <id> --text "Reply" --json` — reply to thread
- `notion-cli comments list <block_id> --json` — list comments
- `notion-cli comments list <block_id> --all --json` — list ALL comments
- `notion-cli comments get <comment_id> --json` — retrieve a comment

### Search
- `notion-cli search "query" --json` — search pages and databases
- `notion-cli search "query" --filter-type page --json` — search pages only
- `notion-cli search "query" --filter-type database --json` — search databases only
- `notion-cli search --all --json` — list all shared items
- `notion-cli search "query" --sort-direction descending --json` — sort by last edited

### File Uploads
- `notion-cli files upload <filepath> --json` — upload a file (returns file_upload object)
- `notion-cli files get <file_upload_id> --json` — check upload status
- `notion-cli files list --json` — list uploads
- `notion-cli files list --status uploaded --json` — filter by status

### Users
- `notion-cli users me --json` — current bot user (auth check)
- `notion-cli users list --json` — list workspace users
- `notion-cli users list --all --json` — list ALL workspace users

### Complex inputs
- Pipe JSON via stdin: `echo '<json>' | notion-cli pages create --stdin --json`
- Inline JSON flags: `--properties`, `--filter`, `--sorts`, `--children`, `--content`

### Workspace Snapshot (local cache — use INSTEAD of searching every time)
If `.notion-cache/` exists, ALWAYS use these commands for workspace lookups:
- `notion-cli snapshot` — cache workspace structure (pages, databases, schemas)
- `notion-cli workspace search <query>` — FTS5 search across cached pages, databases, properties
- `notion-cli workspace pages` — list all cached pages
- `notion-cli workspace databases` — list all cached databases
- `notion-cli workspace schema <database_id>` — show cached database schema (properties + types)
- Read `.notion-cache/index.md` — overview of all pages and databases
- Read `.notion-cache/databases/<id>.md` — database schema detail

### Workspace Snapshot Auto-Refresh
- Snapshot refreshes nightly via cron (if configured with `notion-cli cron`)
- **After creating pages/databases**: Run `notion-cli snapshot` to update cache
- **Rule of thumb**: If you created or restructured Notion content, refresh the snapshot

### Setup
- `notion-cli install` — global setup (adds to ~/.claude/CLAUDE.md + shell profile)
- `notion-cli init` — per-project setup (CLAUDE.md + .env + .gitignore)
- `notion-cli docs` — output LLM instruction snippet
- `notion-cli docs --format claude` — CLAUDE.md format

### Exit codes
- 0 = success, 1 = error (JSON error on stderr)
