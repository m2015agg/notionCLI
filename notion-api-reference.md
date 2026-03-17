# Notion API Reference

**Base URL:** `https://api.notion.com`
**Current API Version:** `2026-03-11`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Pages](#pages)
   - [Create a Page](#create-a-page)
   - [Retrieve a Page](#retrieve-a-page)
   - [Update a Page](#update-a-page)
3. [Databases](#databases)
   - [Create a Database](#create-a-database)
   - [Retrieve a Database](#retrieve-a-database)
   - [Update a Database](#update-a-database)
   - [Query a Database](#query-a-database)

---

## Authentication

### Bearer Token Authentication

All requests require the `Authorization` header with a bearer token.

### Required Headers

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer {TOKEN}` |
| `Notion-Version` | `2026-03-11` |

### Token Acquisition

- **Internal Integrations**: Tokens issued when creating the integration at https://www.notion.so/my-integrations
- **Public Integrations (OAuth)**: Users receive tokens upon completing the OAuth authorization flow

### cURL Example

```bash
curl 'https://api.notion.com/v1/users' \
  -H 'Authorization: Bearer '"$NOTION_ACCESS_TOKEN"'' \
  -H "Notion-Version: 2026-03-11"
```

### JavaScript SDK

```javascript
const { Client } = require('@notionhq/client');
const client = new Client({ auth: process.env.NOTION_ACCESS_TOKEN });
```

### Bot Attribution

Operations performed via authenticated integrations appear in Notion as actions taken by a bot. The bot's name and avatar are controlled in the integration settings.

---

## Pages

### Create a Page

**Endpoint:** `POST /v1/pages`

Creates a new page as a child of an existing page or database.

**Requirements:** Integration must have "Insert Content capabilities" on the target parent.

#### Request Body

##### Parent (required)

```json
// Under an existing page
{ "parent": { "page_id": "uuid", "type": "page_id" } }

// Under a database
{ "parent": { "database_id": "uuid", "type": "database_id" } }

// Workspace level (public integrations only)
{ "parent": { "workspace": true, "type": "workspace" } }
```

##### Properties

For page/workspace parents, only `title` is supported. For database parents, keys must match the database schema.

| Type | Schema |
|------|--------|
| **Title** | `{ "title": [{ "text": { "content": "string" } }] }` |
| **Rich Text** | `{ "rich_text": [rich_text_items] }` |
| **Number** | `{ "number": number \| null }` |
| **URL** | `{ "url": "string" \| null }` |
| **Select** | `{ "select": { "id": "string" } \| { "name": "string" } \| null }` |
| **Multi Select** | `{ "multi_select": [select_items] }` |
| **People** | `{ "people": [user_objects] }` |
| **Email** | `{ "email": "string" \| null }` |
| **Phone Number** | `{ "phone_number": "string" \| null }` |
| **Date** | `{ "date": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" \| null, "time_zone": "string" \| null } \| null }` |
| **Checkbox** | `{ "checkbox": boolean }` |
| **Relation** | `{ "relation": [{ "id": "string" }] }` |
| **Files** | `{ "files": [file_objects] }` |
| **Status** | `{ "status": { "id": "string" } \| { "name": "string" } \| null }` |

##### Content (children or markdown)

```json
// Using children array (max 100 items)
{
  "children": [
    {
      "object": "block",
      "type": "paragraph",
      "paragraph": {
        "rich_text": [{ "type": "text", "text": { "content": "Content here" } }]
      }
    }
  ]
}

// Or using markdown
{ "markdown": "# Heading\n\nParagraph text" }
```

##### Icon and Cover

```json
{
  "icon": { "type": "emoji", "emoji": "🎉" },
  "cover": { "type": "external", "external": { "url": "https://example.com/image.jpg" } }
}
```

##### Template

```json
{ "template": { "type": "none" } }
{ "template": { "type": "default", "timezone": "America/New_York" } }
{ "template": { "type": "template_id", "template_id": "uuid", "timezone": "America/New_York" } }
```

#### Response (200)

```json
{
  "object": "page",
  "id": "uuid",
  "created_time": "ISO8601",
  "last_edited_time": "ISO8601",
  "in_trash": false,
  "is_locked": false,
  "url": "https://notion.so/...",
  "public_url": null,
  "parent": { },
  "properties": { },
  "icon": null,
  "cover": null,
  "created_by": { "id": "uuid", "object": "user" },
  "last_edited_by": { "id": "uuid", "object": "user" }
}
```

#### TypeScript Example

```typescript
import { Client } from "@notionhq/client"
const notion = new Client({ auth: process.env.NOTION_API_KEY })

const response = await notion.pages.create({
  parent: { database_id: "d9824bdc-8445-4327-be8b-5b47500af6ce" },
  properties: {
    Name: { title: [{ text: { content: "New Page Title" } }] }
  }
})
```

---

### Retrieve a Page

**Endpoint:** `GET /v1/pages/{page_id}`

Returns page properties (not content). Use "Retrieve block children" for content.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page_id` | UUID (path) | Yes | Page identifier |
| `filter_properties` | string[] (query) | No | Property IDs to include (max 100) |

#### Limitations

- Properties limited to 25 references per property
- Use "Retrieve a Page Property" endpoint for properties exceeding 25 references
- Affects: People, Relation, Rich Text, Title properties

#### Response (200)

```json
{
  "object": "page",
  "id": "uuid",
  "created_time": "ISO8601",
  "last_edited_time": "ISO8601",
  "in_trash": false,
  "is_locked": false,
  "url": "https://notion.so/...",
  "parent": { "type": "database_id", "database_id": "..." },
  "properties": { },
  "icon": null,
  "cover": null,
  "created_by": { "id": "uuid", "object": "user" },
  "last_edited_by": { "id": "uuid", "object": "user" }
}
```

#### TypeScript Example

```typescript
const response = await notion.pages.retrieve({
  page_id: "b55c9c91-384d-452b-81db-d1ef79372b75"
})
```

---

### Update a Page

**Endpoint:** `PATCH /v1/pages/{page_id}`

Updates page properties, icon, cover, lock status, and content.

**Requirements:** Integration must have "Update Content capabilities."

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page_id` | UUID (path) | Yes | Page identifier |

#### Request Body (all fields optional)

##### Properties

Update page field values. Schema must match parent database configuration. Same types as Create a Page.

##### Icon

```json
{ "type": "emoji", "emoji": "🎯" }
{ "type": "external", "external": { "url": "https://example.com/icon.png" } }
{ "type": "file_upload", "file_upload": { "id": "file-upload-id" } }
```

##### Cover

```json
{ "type": "external", "external": { "url": "https://example.com/cover.jpg" } }
{ "type": "file_upload", "file_upload": { "id": "file-upload-id" } }
```

##### Other Options

```json
{ "is_locked": true }
{ "in_trash": true }
{ "erase_content": true }  // DESTRUCTIVE - cannot be reversed via API
```

#### TypeScript Example

```typescript
const response = await notion.pages.update({
  page_id: "b55c9c91-384d-452b-81db-d1ef79372b75",
  properties: {
    Name: { title: [{ text: { content: "Updated Title" } }] }
  }
})
```

#### Limitations

- Rollup property values cannot be updated
- A page's parent cannot be changed

---

## Databases

### Create a Database

**Endpoint:** `POST /v1/databases`

Creates a database as a subpage in the specified parent page.

**Requirements:** Integration must have "Insert Content capabilities."

#### Request Body

##### Parent (required)

```json
{ "parent": { "type": "page_id", "page_id": "uuid" } }
{ "parent": { "type": "workspace", "workspace": true } }
```

##### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | Rich Text[] (max 100) | Database display name |
| `description` | Rich Text[] (max 100) | Database description |
| `is_inline` | boolean | Display inline in parent page (default: false) |
| `initial_data_source` | object | Property schema configuration |
| `icon` | object | Database icon |
| `cover` | object | Cover image |

##### Property Types for `initial_data_source.properties`

- **Text:** title, rich_text, url, email, phone_number
- **Structured:** number, select, multi_select, status, checkbox, date, files, people
- **Computed:** formula, rollup, created_by, created_time, last_edited_by, last_edited_time, unique_id
- **References:** relation

#### Response (200)

```json
{
  "object": "database",
  "id": "uuid",
  "title": [rich_text_items],
  "description": [rich_text_items],
  "parent": { },
  "is_inline": false,
  "in_trash": false,
  "is_locked": false,
  "created_time": "ISO8601",
  "last_edited_time": "ISO8601",
  "data_sources": [{ "id": "uuid", "name": "string" }],
  "icon": null,
  "cover": null,
  "url": "https://notion.so/...",
  "public_url": null
}
```

#### TypeScript Example

```typescript
const response = await notion.databases.create({
  parent: { type: "page_id", page_id: "b55c9c91-384d-452b-81db-d1ef79372b75" },
  title: [{ text: { content: "My Database" } }]
})
```

---

### Retrieve a Database

**Endpoint:** `GET /v1/databases/{database_id}`

Returns database structure and column schema (not rows).

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `database_id` | UUID (path) | Yes | Database identifier |

#### Response (200)

```json
{
  "object": "database",
  "id": "uuid",
  "title": [rich_text_items],
  "description": [],
  "parent": { "type": "workspace", "workspace": true },
  "is_inline": false,
  "in_trash": false,
  "is_locked": false,
  "created_time": "ISO8601",
  "last_edited_time": "ISO8601",
  "data_sources": [{ "id": "uuid", "name": "string" }],
  "icon": null,
  "cover": null,
  "url": "https://notion.so/...",
  "public_url": null
}
```

#### Important Notes

- Related databases must be shared with your integration to retrieve relation properties
- Linked databases cannot be retrieved directly; share the original source database
- To fetch rows, use "Query a Database" endpoint

#### TypeScript Example

```typescript
const response = await notion.databases.retrieve({
  database_id: "d9824bdc-8445-4327-be8b-5b47500af6ce"
})
```

---

### Update a Database

**Endpoint:** `PATCH /v1/databases/{database_id}`

Updates database metadata including title, description, properties, icon, and cover.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `database_id` | UUID (path) | Yes | Database identifier |

#### Request Body (all fields optional)

| Field | Type | Description |
|-------|------|-------------|
| `title` | Rich Text[] (max 100) | Database display name |
| `description` | Rich Text[] (max 100) | Database description |
| `icon` | object | Database icon |
| `cover` | object | Cover image |
| `parent` | object | Move to different page or workspace |
| `is_inline` | boolean | Inline display toggle |
| `in_trash` | boolean | Move to/from trash |
| `is_locked` | boolean | Lock from UI editing |

#### Limitations

Cannot update via API:
- `formula` properties
- `select` property definitions
- `status` property definitions
- Synced content
- `multi_select` option values (removal allowed, updates blocked)
- Schema max size: **50KB**

#### TypeScript Example

```typescript
const response = await notion.databases.update({
  database_id: "d9824bdc-8445-4327-be8b-5b47500af6ce",
  title: [{ text: { content: "Updated Database Title" } }]
})
```

---

### Query a Database

**Endpoint:** `POST /v1/databases/{database_id}/query`

Retrieves pages from a database with filtering and sorting. Results are paginated.

**Requirements:** Integration must have "Read Content capabilities."

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `database_id` | UUID (path) | Yes | Database identifier |
| `filter_properties` | string[] (query) | No | Property IDs to include |

#### Request Body

##### Filter

Single property filter:
```json
{
  "filter": {
    "property": "Done",
    "checkbox": { "equals": true }
  }
}
```

Compound filter (AND/OR):
```json
{
  "filter": {
    "and": [
      { "property": "Done", "checkbox": { "equals": true } },
      {
        "or": [
          { "property": "Tags", "contains": "A" },
          { "property": "Tags", "contains": "B" }
        ]
      }
    ]
  }
}
```

##### Sort

```json
{
  "sorts": [
    { "property": "Created", "direction": "descending" },
    { "property": "Name", "direction": "ascending" }
  ]
}
```

##### Pagination

```json
{
  "start_cursor": "cursor-from-previous-response",
  "page_size": 100
}
```

#### Response (200)

```json
{
  "object": "list",
  "results": [ /* page objects */ ],
  "has_more": true,
  "next_cursor": "cursor-string",
  "type": "page_or_database"
}
```

#### Limitations

- Relations with 25+ references: only first 25 evaluated in formulas
- Multi-layer relation rollups may produce incorrect results

#### TypeScript Example

```typescript
const response = await notion.databases.query({
  database_id: "d9824bdc-8445-4327-be8b-5b47500af6ce",
  filter: {
    property: "Status",
    status: { equals: "Done" }
  },
  sorts: [{ property: "Created", direction: "descending" }]
})
```

---

## Error Codes (All Endpoints)

| Status | Code | Description |
|--------|------|-------------|
| 400 | `validation_error` / `invalid_request` | Invalid request parameters |
| 401 | `unauthorized` | Authentication failed |
| 403 | `restricted_resource` | Missing required capabilities |
| 404 | `object_not_found` | Resource not found or not shared |
| 409 | `conflict_error` | Request conflicts with current state |
| 429 | `rate_limited` | Rate limit exceeded (3 req/sec avg) |
| 500 | `internal_server_error` | Server error |
| 503 | `service_unavailable` | Service temporarily unavailable |

---

## Rate Limits

- **Average:** 3 requests per second
- Implement exponential backoff on 429 responses
- Use `Retry-After` header value when available
