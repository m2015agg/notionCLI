# Notion CLI v2 — Cache + Write Improvements

**Date**: 2026-03-18
**Status**: Planned
**Branch**: TBD

## Problem Statement

Benchmark results show notion-cli CLI cache beats MCP on search-only tasks (1.4-2.5x faster) but loses on content-heavy reads and writes:

| Category | CLI Pass Rate | MCP Pass Rate | CLI Speed | MCP Speed |
|----------|-------------|---------------|-----------|-----------|
| Search (read) | 100% | 100% | **1.4-2.5x faster** | — |
| Content fetch | 67% | 100% | 0.6-0.7x slower | — |
| Workspace overview | 33% | 100% | ~same | — |
| Write operations | TBD | TBD | ~same | MCP wins on db_create |

**Root causes:**
1. Cache stores flat titles only — no hierarchy, no summaries, no schemas
2. Agent needs 2 steps (search + fetch) for content, MCP does it in 1
3. Write DDL syntax is clunkier than MCP's SQL-style approach
4. 0 databases cached (integration sharing issue)

## Improvement Plan

### Phase 1: Better Metadata Cache (fixes read quality)

#### 1.1 — Cache page hierarchy (parent_id)
- During `snapshot`, store `parent_id` for every page
- SQLite schema: `ALTER TABLE pages ADD COLUMN parent_id TEXT`
- Enables: `workspace tree` command, breadcrumb paths in search results
- **Fixes**: workspace_overview (33% → 100%)

#### 1.2 — Cache first-paragraph summaries
- During `snapshot`, fetch first 200 chars of each page body
- Store as `summary` column in pages table
- Rate limit: batch fetch, 3 req/sec to avoid Notion API limits
- For 909 pages at 3/sec = ~5 min snapshot time (acceptable)
- **Fixes**: targeted_lookup (67% → 100%), page_lookup speed

#### 1.3 — Cache database schemas
- Fix integration sharing (user action: share DBs with bot)
- During `snapshot`, fetch each DB schema via `db get`
- Store in `databases` table: id, title, columns (JSON), options
- Enables: `workspace databases`, `workspace schema <db>`
- **Fixes**: db_create speed (agent knows schema before creating)

#### 1.4 — Add `workspace tree` command
- Build tree from parent_id relationships
- Output: indented hierarchy with icons
- ```
  📋 Home
    📊 Matt's Backend Work
      🔧 Sprint 1
      🔧 Sprint 2
    🛠️ Support
      📋 Support Docs
      🏗️ Architecture
  ```
- Agent gets full workspace structure in one command
- **Fixes**: workspace_overview quality

### Phase 2: Smarter Content Fetching (fixes read speed)

#### 2.1 — `workspace search` returns summaries
- Search results include first-paragraph summary from cache
- Agent can often answer without a second `pages get` call
- Reduces 2-step → 1-step for most lookups

#### 2.2 — `workspace get <query>` convenience command
- Combines search + fetch in one CLI call
- `notion-cli workspace get "Support AI Console"` → searches cache, auto-fetches top result's full content
- Single command, single response — matches MCP's one-call pattern

### Phase 3: Better Write Operations (fixes write speed)

#### 3.1 — SQL DDL syntax for `db create`
- Current: `notion-cli db create --parent-page-id <id> --title "Name" --json` + pipe JSON properties
- New: `notion-cli db create --schema "Name TITLE, Status SELECT('To Do','Done'), Priority NUMBER" --parent-page-id <id>`
- Matches MCP's CREATE TABLE syntax — agent already knows SQL
- Parser converts DDL → Notion API property spec

#### 3.2 — Shorthand for `pages create` with content
- Current: requires `--children` with Notion block JSON (ugly)
- New: `notion-cli pages create --title "Title" --markdown "# Heading\nContent here"`
- Accept markdown string, convert to Notion blocks internally
- Matches MCP's content parameter approach

#### 3.3 — Bulk row insertion
- Current: one `pages create` call per row
- New: `notion-cli db insert <db_id> --rows '[{"Name":"Task 1","Status":"To Do"},...]'`
- Single command for multiple rows — API batching under the hood

### Phase 4: Skill Doc Updates

#### 4.1 — Update CLAUDE.md skill doc
- Add `workspace tree`, `workspace get`, `workspace schema` commands
- Update instructions: "Use `workspace get` for content, `workspace search` for discovery"
- Add write shortcuts to skill doc

#### 4.2 — Re-run benchmarks
- Full 12-eval suite (6 read + 6 write)
- Target: 100% pass rate, faster than MCP on all reads, competitive on writes

## Implementation Order

1. **Phase 1.1 + 1.4** (hierarchy + tree) — biggest quality win, ~2 hours
2. **Phase 1.2** (summaries) — second biggest quality win, ~2 hours
3. **Phase 2.2** (workspace get) — biggest speed win, ~1 hour
4. **Phase 3.1** (DDL syntax) — biggest write win, ~3 hours
5. **Phase 1.3** (DB schemas) — depends on user sharing DBs, ~1 hour
6. **Phase 2.1 + 3.2 + 3.3** (polish) — nice to have, ~3 hours
7. **Phase 4** (benchmarks) — validation, ~1 hour

## Success Criteria

- Read benchmarks: 100% pass rate (up from 83%)
- Read speed: faster than MCP on all 6 evals
- Write benchmarks: 100% pass rate
- Write speed: within 1.2x of MCP on all evals
- Snapshot time: under 10 minutes for 1000-page workspace
