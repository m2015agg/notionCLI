export const WALKTHROUGH_TEMPLATE = `---
name: notion
description: Interactive walkthrough of your Notion workspace — pages, databases, and available commands
user_invocable: true
---

# Notion Workspace Walkthrough

When the user invokes this skill, follow these steps:

## Step 1: Test Connection

Run: \`notion-cli users me --json\`

If this fails, tell the user to run \`notion-cli doctor\` to diagnose the issue.

## Step 2: Explore Workspace

Run: \`notion-cli search --all --json\`

Show the user the first 5 results (pages and databases). Summarize what's in their workspace.

## Step 3: Database Example

If any databases were found in Step 2, pick the first one and run:

\`notion-cli db get <database_id> --json\`

Show the schema (columns/properties) and explain what data it holds.

Then run:

\`notion-cli db query <database_id> --json\`

Show a few example rows.

## Step 4: Available Commands

List the main command groups:
- \`notion-cli pages\` — get, create, update pages
- \`notion-cli db\` — get schema, create, query databases
- \`notion-cli blocks\` — get, append, update, delete blocks
- \`notion-cli comments\` — create, list, get comments
- \`notion-cli search\` — search pages and databases
- \`notion-cli files\` — upload, get, list file uploads
- \`notion-cli users\` — list workspace users

All commands support \`--json\` for structured output and \`--help\` for usage details.

## Step 5: Interactive

Tell the user: "Ask me anything about your Notion workspace — I can read pages, query databases, search for content, and more."
`;
