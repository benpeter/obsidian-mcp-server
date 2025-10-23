# Obsidian MCP Server

**Status**: 💡 Idea

**Project Name**: `obsidian-mcp-server`

## Overview & Concept

An MCP server that enables AI agents to interact with Obsidian vaults through the Obsidian Local REST API plugin. Provides comprehensive read/write access to notes, search capabilities, periodic note management, and command execution within Obsidian.

## Priority & Difficulty

**Priority**: High
**Rationale**: Obsidian is a widely-used knowledge management tool with a large user base seeking AI-powered note-taking and organization capabilities.

**Difficulty**: Medium
**Technical Complexity**: Requires managing multiple content types (markdown, JSON), handling complex PATCH operations for surgical note updates, and supporting advanced search queries (Dataview DQL, JsonLogic).

**Estimated Effort**: 2-3 weeks

**Target Market**: Knowledge workers, researchers, writers, students, and PKM (Personal Knowledge Management) enthusiasts using Obsidian for note-taking and organization.

---

## API Access & Authentication

**Authentication Required**: Yes

**Authentication Type**:
- API Key (HTTP header: `Authorization: Bearer <token>`)
- Requires Obsidian Local REST API plugin installed and configured

**Access Details**:
- How to obtain credentials: Install [Obsidian Local REST API plugin](https://github.com/coddingtonbear/obsidian-local-rest-api), generate API key in plugin settings
- Cost: Free (open source plugin)
- Registration required: No (local installation only)
- Approval process: Instant (self-hosted)

**Key Limitations**:
- Local only: API runs on localhost (default: `https://127.0.0.1:27124`)
- Requires Obsidian to be running with plugin enabled
- Self-signed certificate (HTTPS with cert verification disabled or cert installation)
- No rate limits (local API)

---

## Official Documentation & Data Sources

**Primary Data Source**: [Obsidian Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api)

**Documentation Links:**
- Main Repository: [GitHub](https://github.com/coddingtonbear/obsidian-local-rest-api)
- API Specifications: [OpenAPI Schema](https://github.com/coddingtonbear/obsidian-local-rest-api/blob/master/openapi.yaml)
- Plugin Installation: [Obsidian Community Plugins](https://obsidian.md/plugins?id=obsidian-local-rest-api)
- Base URL: `https://127.0.0.1:27124` (configurable)

**Alternative/Additional Sources:**
- [Obsidian API Documentation](https://docs.obsidian.md/Home) - Official Obsidian plugin API reference
- [Dataview Plugin](https://blacksmithgu.github.io/obsidian-dataview/) - Query language documentation for advanced searches

---

## 🛠️ Tools Overview

> **Tool Naming Convention**: Use lowercase snake_case following the pattern `obsidian_<action>_<object>`.

| Tool Name | Description |
| :--- | :--- |
| `obsidian_get_active_note` | Retrieve the currently active note with metadata |
| `obsidian_update_active_note` | Replace entire content of the active note |
| `obsidian_append_active_note` | Append content to the end of active note |
| `obsidian_patch_active_note` | Modify specific sections within active note |
| `obsidian_list_vault_files` | List files and directories at a given path |
| `obsidian_get_note` | Retrieve any note by file path with metadata |
| `obsidian_create_note` | Create new note or update existing one |
| `obsidian_append_note` | Append content to any note by path |
| `obsidian_patch_note` | Modify specific sections within any note |
| `obsidian_delete_note` | Delete a note by path |
| `obsidian_search_simple` | Fast text search with context snippets |
| `obsidian_search_dataview` | Query vault using Dataview DQL |
| `obsidian_search_jsonlogic` | Advanced queries using JsonLogic |
| `obsidian_get_periodic_note` | Get current periodic note (daily/weekly/monthly/etc) |
| `obsidian_append_periodic_note` | Append to periodic note |
| `obsidian_patch_periodic_note` | Modify specific sections within periodic note |
| `obsidian_list_commands` | List all available Obsidian commands |
| `obsidian_execute_command` | Execute an Obsidian command by ID |
| `obsidian_open_note` | Open a note in Obsidian UI |

---

## General Workflow

> **Purpose**: This section demonstrates typical interaction patterns to help LLMs understand how to use this server's tools effectively in realistic scenarios.

### Quick Note Capture Workflow
1. **Append to Daily Note** - Use `obsidian_append_periodic_note` with period="daily" to add timestamped entry (1 call)

*Expected total: 1 tool call*

**Example scenario**: "Add 'Meeting with John about project timeline' to today's daily note"

### Research & Knowledge Synthesis Workflow
1. **Find Relevant Notes** - Use `obsidian_search_dataview` to query notes by tags, frontmatter, or content (1 call)
2. **Retrieve Note Details** - Use `obsidian_get_note` for top matching notes (3-5 parallel calls)
3. **Extract & Synthesize** - Process content and create summary
4. **Update Summary Note** - Use `obsidian_patch_note` to append findings under specific heading (1 call)

*Expected total: 5-7 tool calls*

**Example scenario**: "Find all notes tagged #machine-learning from the past month, extract key insights, and add them to my ML Summary note under the 'Recent Learnings' heading"

### Vault Organization & Cleanup Workflow
1. **Explore Structure** - Use `obsidian_list_vault_files` to map directory structure (1-2 calls)
2. **Search for Updates** - Use `obsidian_search_simple` to find notes needing organization (1 call)
3. **Batch Metadata Update** - Use `obsidian_patch_note` to update frontmatter fields across multiple notes (5-10 parallel calls)

*Expected total: 7-13 tool calls*

**Example scenario**: "Find all notes in my 'Drafts' folder that don't have status frontmatter, and add 'status: draft' to each"

### Daily Review & Planning Workflow
1. **Get Yesterday's Note** - Use `obsidian_get_periodic_note` with specific date for previous day (1 call)
2. **Get Today's Note** - Use `obsidian_get_periodic_note` for current daily note (1 call)
3. **Extract Tasks** - Parse incomplete tasks from yesterday
4. **Update Today** - Use `obsidian_patch_note` to add tasks under "Carried Over" heading (1 call)

*Expected total: 3 tool calls*

**Example scenario**: "Review yesterday's daily note, find incomplete tasks, and add them to today's note"

### Cross-Vault Search & Link Creation Workflow
1. **Text Search** - Use `obsidian_search_simple` to find mentions of a topic (1 call)
2. **Contextual Search** - Use `obsidian_search_dataview` to find related notes by metadata (1 call)
3. **Update Source Note** - Use `obsidian_patch_note` to add wikilinks to related notes (1 call)
4. **Open in Obsidian** - Use `obsidian_open_note` to review changes (1 call, optional)

*Expected total: 3-4 tool calls*

**Example scenario**: "Find all notes mentioning 'quantum computing' and add related note links to my Quantum Computing MOC"

---

## Exposed Tools

### `obsidian_get_active_note`

**Description**: Retrieve the content and metadata of the currently active note open in Obsidian. Returns full note content, parsed frontmatter, tags, and file statistics.

> **When to use**: User wants to read, analyze, or reference the currently open note without specifying a file path
>
> **Why useful**: Provides context-aware access to the note the user is actively working on

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `include_metadata` | boolean | No | Return structured metadata (frontmatter, tags, file stats) in addition to content. Default: `true`. Set to `false` for plain markdown only. |

**API Endpoint:** `GET /active/`

**Query Parameters:**
- None

**Headers:**
- `Accept: application/vnd.olrapi.note+json` (for metadata) or `Accept: text/markdown` (for plain content)

**Returns:**
- `content`: Full markdown content of the note (string)
- `path`: File path relative to vault root (string)
- `frontmatter`: Parsed YAML frontmatter as JSON object (object)
- `tags`: Array of tags found in note (including frontmatter and inline tags) (string[])
- `stat`: File statistics object
  - `ctime`: Creation timestamp (Unix milliseconds)
  - `mtime`: Modification timestamp (Unix milliseconds)
  - `size`: File size in bytes
- `timestamp`: Response generation time (ISO 8601)

**Annotations:**
- `readOnlyHint`: true (read operation, no side effects)
- `idempotentHint`: true (repeated calls return current state)
- `openWorldHint`: true (calls local Obsidian API)

**Authorization:**
- Required scopes: `tool:obsidian_note:read`

**Example Response:**
```json
{
  "content": "---\ntitle: Project Ideas\ntags: [brainstorming, projects]\nstatus: active\n---\n\n# Project Ideas\n\n## Machine Learning\n- Build a sentiment analyzer\n- Train a recommendation system\n\n## Web Development\n- Create a portfolio site\n- Build a task manager app",
  "path": "Notes/Project Ideas.md",
  "frontmatter": {
    "title": "Project Ideas",
    "tags": ["brainstorming", "projects"],
    "status": "active"
  },
  "tags": ["brainstorming", "projects"],
  "stat": {
    "ctime": 1698235200000,
    "mtime": 1698321600000,
    "size": 234
  },
  "timestamp": "2025-10-23T10:30:00Z"
}
```

---

### `obsidian_update_active_note`

**Description**: Replace the entire content of the currently active note. Use this for complete rewrites or when generating new content from scratch.

> **When to use**: User wants to completely replace the active note's content with new text
>
> **Why useful**: Allows complete note regeneration without needing to specify file path

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | Yes | New markdown content to replace the entire note. Can include frontmatter (YAML between `---` delimiters), headings, lists, tables, code blocks, etc. |

**API Endpoint:** `PUT /active/`

**Request Body:** Raw markdown text (Content-Type: `text/markdown`)

**Returns:**
- `success`: Boolean indicating successful update
- `message`: Confirmation message
- `timestamp`: Update completion time (ISO 8601)

**Annotations:**
- `readOnlyHint`: false (modifies note content)
- `destructiveHint`: true (replaces all content - cannot be undone except via Obsidian's undo/history)
- `idempotentHint`: true (repeated calls with same content have same effect)
- `openWorldHint`: true (calls local Obsidian API)

**Authorization:**
- Required scopes: `tool:obsidian_note:write`

---

### `obsidian_append_active_note`

**Description**: Append content to the end of the currently active note. Ideal for adding new entries, sections, or updates without modifying existing content.

> **When to use**: User wants to add content to the active note without replacing or modifying what's already there
>
> **Why useful**: Safe, non-destructive way to grow notes incrementally

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | Yes | Markdown content to append to the note. Will be added to the very end of the file. Include leading newlines if spacing is important (e.g., `"\n\n## New Section"`). |

**API Endpoint:** `POST /active/`

**Request Body:** Raw markdown text (Content-Type: `text/markdown`)

**Returns:**
- `success`: Boolean indicating successful append
- `message`: Confirmation message
- `timestamp`: Update completion time (ISO 8601)

**Annotations:**
- `readOnlyHint`: false (modifies note content)
- `destructiveHint`: false (only appends - does not modify existing content)
- `idempotentHint`: false (repeated calls append multiple times)
- `openWorldHint`: true (calls local Obsidian API)

**Authorization:**
- Required scopes: `tool:obsidian_note:write`

**Example Usage:**
Appending a new journal entry:
```markdown
\n\n## 2:30 PM - Meeting Notes\n- Discussed Q4 goals\n- Action items: Review budget, Schedule follow-up
```

---

### `obsidian_patch_active_note`

**Description**: Surgically modify specific sections within the currently active note. Target content by heading hierarchy, block reference ID, or frontmatter field name. Operations: append, prepend, or replace targeted content.

> **When to use**: User needs to update a specific section, add content under a heading, modify a frontmatter field, or update content near a block reference
>
> **Why useful**: Precise content updates without parsing or rewriting entire note. Essential for structured note updates.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `operation` | enum | Yes | Type of modification: `append` (add after target), `prepend` (add before target), or `replace` (replace target content). |
| `target_type` | enum | Yes | Type of target to modify: `heading` (markdown heading like "# Title"), `block` (block reference ID like `^abc123`), or `frontmatter` (YAML field name). |
| `target` | string | Yes | Target identifier. For headings: use `::` to separate nested levels (e.g., "Projects::Machine Learning"). For blocks: block reference ID without `^`. For frontmatter: field name. Can be URL-encoded for non-ASCII characters. |
| `content` | string | Yes | Content to insert. Can be markdown text or JSON (for structured frontmatter/table updates). Content-Type determined automatically based on `content_format`. |
| `content_format` | enum | No | Format of content: `markdown` (default) or `json`. Use `json` for frontmatter updates or table row insertions (e.g., `[["City", "Population"]]` for table rows). |
| `heading_delimiter` | string | No | Delimiter for nested headings. Default: `"::"`. Example: "Main::Sub::SubSub" uses `::` to separate heading levels. |
| `trim_whitespace` | boolean | No | Trim whitespace from target before matching. Default: `false`. Useful for handling inconsistent heading spacing. |

**API Endpoint:** `PATCH /active/`

**Headers:**
- `Operation`: `append` | `prepend` | `replace`
- `Target-Type`: `heading` | `block` | `frontmatter`
- `Target`: Target identifier (URL-encoded if needed)
- `Target-Delimiter`: Custom heading delimiter (optional, default: `::`)
- `Trim-Target-Whitespace`: `true` | `false` (optional)

**Request Body:** Content to insert (Content-Type: `text/markdown` or `application/json`)

**Returns:**
- `success`: Boolean indicating successful patch
- `operation`: Operation performed
- `target_type`: Type of target modified
- `target`: Target that was modified
- `message`: Confirmation message
- `timestamp`: Update completion time (ISO 8601)

**Annotations:**
- `readOnlyHint`: false (modifies note content)
- `destructiveHint`: true (can replace content - use cautiously)
- `idempotentHint`: false (append/prepend operations are not idempotent)
- `openWorldHint`: true (calls local Obsidian API)

**Authorization:**
- Required scopes: `tool:obsidian_note:write`

**Example Scenarios:**

**Append under heading:**
```json
{
  "operation": "append",
  "target_type": "heading",
  "target": "Projects::Machine Learning",
  "content": "\n- Train sentiment analysis model\n- Collect training data",
  "content_format": "markdown"
}
```

**Update frontmatter field:**
```json
{
  "operation": "replace",
  "target_type": "frontmatter",
  "target": "status",
  "content": "completed",
  "content_format": "json"
}
```

**Add table row via block reference:**
```json
{
  "operation": "append",
  "target_type": "block",
  "target": "2c7cfa",
  "content": [["Chicago, IL", "16"]],
  "content_format": "json"
}
```

---

### `obsidian_list_vault_files`

**Description**: List files and subdirectories at a specified path within the vault. Returns file names (ending with `.md`) and directory names (ending with `/`). Use to explore vault structure, find notes by location, or build navigation systems.

> **When to use**: User wants to browse vault structure, list notes in a folder, or discover available files before reading them
>
> **Why useful**: Enables vault exploration and directory-based note discovery without full-text search

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | No | Directory path relative to vault root. Use empty string or `"/"` for vault root. Omit trailing slash for subdirectories (e.g., `"Projects/2024"`). Default: vault root. |

**API Endpoint:** `GET /vault/` (root) or `GET /vault/{pathToDirectory}/` (subdirectory)

**Query Parameters:** None

**Returns:**
- `files`: Array of file and directory names
  - Files: End with `.md` extension (e.g., `"Note.md"`)
  - Directories: End with `/` (e.g., `"Subfolder/"`)
- `path`: Path that was listed
- `count`: Total number of items returned
- `timestamp`: Response generation time (ISO 8601)

**Annotations:**
- `readOnlyHint`: true (read operation, no side effects)
- `idempotentHint`: true (repeated calls return current directory state)
- `openWorldHint`: true (calls local Obsidian API)

**Authorization:**
- Required scopes: `tool:obsidian_vault:read`

**Example Response:**
```json
{
  "files": [
    "Daily Notes/",
    "Projects/",
    "README.md",
    "Index.md",
    "Templates/"
  ],
  "path": "/",
  "count": 5,
  "timestamp": "2025-10-23T10:30:00Z"
}
```

---

### `obsidian_get_note`

**Description**: Retrieve the content and metadata of any note by file path. Returns full note content, parsed frontmatter, tags, and file statistics. Use when you need to read a specific note (not the currently active one).

> **When to use**: User specifies a note by name/path, or you've identified a note to read via search or list operations
>
> **Why useful**: Direct access to any note in the vault without requiring it to be open in Obsidian

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | File path relative to vault root. Can include or omit `.md` extension (both `"Projects/ML"` and `"Projects/ML.md"` work). Forward slashes separate directories. |
| `include_metadata` | boolean | No | Return structured metadata (frontmatter, tags, file stats) in addition to content. Default: `true`. Set to `false` for plain markdown only. |

**API Endpoint:** `GET /vault/{filename}`

**Headers:**
- `Accept: application/vnd.olrapi.note+json` (for metadata) or `Accept: text/markdown` (for plain content)

**Returns:**
- `content`: Full markdown content of the note (string)
- `path`: File path relative to vault root (string)
- `frontmatter`: Parsed YAML frontmatter as JSON object (object)
- `tags`: Array of tags found in note (string[])
- `stat`: File statistics object
  - `ctime`: Creation timestamp (Unix milliseconds)
  - `mtime`: Modification timestamp (Unix milliseconds)
  - `size`: File size in bytes
- `timestamp`: Response generation time (ISO 8601)

**Annotations:**
- `readOnlyHint`: true (read operation, no side effects)
- `idempotentHint`: true (repeated calls return current state)
- `openWorldHint`: true (calls local Obsidian API)

**Authorization:**
- Required scopes: `tool:obsidian_note:read`

**Example Response:**
```json
{
  "content": "---\ntitle: Machine Learning Resources\ntags: [ml, learning]\n---\n\n# Resources\n\n## Papers\n- Attention Is All You Need\n\n## Courses\n- Fast.ai Practical Deep Learning",
  "path": "Projects/ML Resources.md",
  "frontmatter": {
    "title": "Machine Learning Resources",
    "tags": ["ml", "learning"]
  },
  "tags": ["ml", "learning"],
  "stat": {
    "ctime": 1698235200000,
    "mtime": 1698408000000,
    "size": 187
  },
  "timestamp": "2025-10-23T10:30:00Z"
}
```

---

### `obsidian_create_note`

**Description**: Create a new note or completely replace an existing note at the specified path. If the note doesn't exist, it will be created (including parent directories). If it exists, content will be replaced.

> **When to use**: User wants to create a new note from scratch or completely rewrite an existing note
>
> **Why useful**: Single operation for both creation and update. Handles directory creation automatically.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | File path relative to vault root where note should be created/updated. Can include or omit `.md` extension. Parent directories will be created if they don't exist (e.g., `"Projects/2024/New Note"`). |
| `content` | string | Yes | Full markdown content for the note. Can include frontmatter (YAML between `---` delimiters), headings, lists, tables, code blocks, etc. |

**API Endpoint:** `PUT /vault/{filename}`

**Request Body:** Raw markdown text (Content-Type: `text/markdown`)

**Returns:**
- `success`: Boolean indicating successful creation/update
- `path`: Path where note was created/updated
- `created`: Boolean indicating if note was newly created (true) or updated (false)
- `message`: Confirmation message
- `timestamp`: Operation completion time (ISO 8601)

**Annotations:**
- `readOnlyHint`: false (creates or modifies note)
- `destructiveHint`: true (replaces all content if note exists)
- `idempotentHint`: true (repeated calls with same content have same effect)
- `openWorldHint`: true (calls local Obsidian API)

**Authorization:**
- Required scopes: `tool:obsidian_note:write`

**Example Usage:**
Creating a new note with frontmatter:
```markdown
---
title: Weekly Review
date: 2024-10-23
tags: [review, weekly]
---

# Week of October 23, 2024

## Accomplishments
- Completed project milestone
- Published blog post

## Next Week
- Start new feature development
- Review Q4 goals
```

---

### `obsidian_append_note`

**Description**: Append content to the end of any note specified by path. If the note doesn't exist, it will be created. Ideal for adding entries, sections, or updates to existing notes.

> **When to use**: User wants to add content to a specific note without replacing what's there
>
> **Why useful**: Safe, non-destructive way to grow notes incrementally. Works on any note, not just the active one.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | File path relative to vault root. Can include or omit `.md` extension. Note will be created if it doesn't exist. |
| `content` | string | Yes | Markdown content to append. Will be added to the end of the file. Include leading newlines for spacing (e.g., `"\n\n## New Section"`). |

**API Endpoint:** `POST /vault/{filename}`

**Request Body:** Raw markdown text (Content-Type: `text/markdown`)

**Returns:**
- `success`: Boolean indicating successful append
- `path`: Path where content was appended
- `message`: Confirmation message
- `timestamp`: Operation completion time (ISO 8601)

**Annotations:**
- `readOnlyHint`: false (modifies note content)
- `destructiveHint`: false (only appends - does not modify existing content)
- `idempotentHint`: false (repeated calls append multiple times)
- `openWorldHint`: true (calls local Obsidian API)

**Authorization:**
- Required scopes: `tool:obsidian_note:write`

---

### `obsidian_patch_note`

**Description**: Surgically modify specific sections within any note specified by path. Target content by heading hierarchy, block reference ID, or frontmatter field name. Operations: append, prepend, or replace targeted content.

> **When to use**: User needs to update a specific section, add content under a heading, modify a frontmatter field, or update content near a block reference in a specific note
>
> **Why useful**: Precise content updates without parsing or rewriting entire note. Works on any note by path.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | File path relative to vault root. Can include or omit `.md` extension. |
| `operation` | enum | Yes | Type of modification: `append`, `prepend`, or `replace`. |
| `target_type` | enum | Yes | Type of target: `heading`, `block`, or `frontmatter`. |
| `target` | string | Yes | Target identifier (heading path with `::`, block ID, or frontmatter field name). |
| `content` | string | Yes | Content to insert (markdown or JSON). |
| `content_format` | enum | No | Format: `markdown` (default) or `json`. |
| `heading_delimiter` | string | No | Delimiter for nested headings. Default: `"::"`. |
| `trim_whitespace` | boolean | No | Trim whitespace from target. Default: `false`. |

**API Endpoint:** `PATCH /vault/{filename}`

**Headers:**
- `Operation`: `append` | `prepend` | `replace`
- `Target-Type`: `heading` | `block` | `frontmatter`
- `Target`: Target identifier (URL-encoded if needed)

**Request Body:** Content to insert (Content-Type: `text/markdown` or `application/json`)

**Returns:**
- `success`: Boolean indicating successful patch
- `path`: Path to patched note
- `operation`: Operation performed
- `target_type`: Type of target modified
- `target`: Target that was modified
- `message`: Confirmation message
- `timestamp`: Operation completion time (ISO 8601)

**Annotations:**
- `readOnlyHint`: false (modifies note content)
- `destructiveHint`: true (can replace content - use cautiously)
- `idempotentHint`: false (append/prepend not idempotent)
- `openWorldHint`: true (calls local Obsidian API)

**Authorization:**
- Required scopes: `tool:obsidian_note:write`

---

### `obsidian_delete_note`

**Description**: Permanently delete a note from the vault. This operation cannot be undone except through Obsidian's file recovery features.

> **When to use**: User explicitly requests note deletion or cleanup operations
>
> **Why useful**: Enables vault maintenance and organization automation. Use with caution.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | File path relative to vault root of the note to delete. Can include or omit `.md` extension. |
| `confirm` | boolean | Yes | Explicit confirmation required. Must be `true` to proceed with deletion. Safety check to prevent accidental deletions. |

**API Endpoint:** `DELETE /vault/{filename}`

**Returns:**
- `success`: Boolean indicating successful deletion
- `path`: Path of deleted note
- `message`: Confirmation message
- `timestamp`: Deletion completion time (ISO 8601)

**Annotations:**
- `readOnlyHint`: false (deletes note)
- `destructiveHint`: true (PERMANENT deletion - cannot be undone via API)
- `idempotentHint`: true (deleting same note twice results in same state)
- `openWorldHint`: true (calls local Obsidian API)

**Authorization:**
- Required scopes: `tool:obsidian_note:delete`

---

### `obsidian_search_simple`

**Description**: Fast full-text search across all notes in the vault. Returns matching notes with context snippets showing where matches occur. Ideal for quick keyword searches and content discovery.

> **When to use**: User wants to find notes containing specific text, phrases, or keywords
>
> **Why useful**: Simple, fast search without requiring query language knowledge. Returns context for immediate relevance assessment.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query text. Searches note content (not file names). Case-insensitive. Matches partial words and phrases. |
| `context_length` | number | No | Number of characters to show around each match for context. Default: `100`. Range: 0-500. Higher values show more surrounding text. |

**API Endpoint:** `POST /search/simple/`

**Query Parameters:**
- `query`: Search string (required)
- `contextLength`: Context characters (optional, default: 100)

**Returns:**
- `results`: Array of matching notes
  - `filename`: Path to matching note (relative to vault root)
  - `score`: Relevance score (float, higher is more relevant)
  - `matches`: Array of match objects
    - `context`: Text snippet showing match with surrounding context
    - `match`: Object with `start` and `end` character positions within context
- `total`: Total number of matching notes
- `query`: Original search query
- `timestamp`: Search completion time (ISO 8601)

**Annotations:**
- `readOnlyHint`: true (search operation, no side effects)
- `idempotentHint`: true (same query returns consistent results)
- `openWorldHint`: true (calls local Obsidian API)

**Authorization:**
- Required scopes: `tool:obsidian_vault:search`

**Example Response:**
```json
{
  "results": [
    {
      "filename": "Projects/ML Resources.md",
      "score": 2.45,
      "matches": [
        {
          "context": "...learning frameworks. **Machine learning** is transforming how we build software. Key concepts include...",
          "match": {
            "start": 23,
            "end": 39
          }
        }
      ]
    },
    {
      "filename": "Daily Notes/2024-10-15.md",
      "score": 1.87,
      "matches": [
        {
          "context": "...today's meeting. Discussed **machine learning** applications in production. Next steps: research...",
          "match": {
            "start": 30,
            "end": 46
          }
        }
      ]
    }
  ],
  "total": 2,
  "query": "machine learning",
  "timestamp": "2025-10-23T10:30:00Z"
}
```

---

### `obsidian_search_dataview`

**Description**: Query vault using Dataview Query Language (DQL). Supports powerful TABLE queries that filter notes by frontmatter, tags, file properties, and content. Requires Dataview plugin installed in Obsidian.

> **When to use**: User needs structured queries filtering by metadata (frontmatter fields, tags, dates, file properties)
>
> **Why useful**: Enables database-like queries over note collections. Perfect for finding notes by status, dates, tags, or custom frontmatter fields.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Dataview DQL query (TABLE format). Example: `TABLE status, tags FROM "Projects" WHERE status = "active" SORT file.mtime DESC`. See [Dataview documentation](https://blacksmithgu.github.io/obsidian-dataview/query/queries/) for query syntax. |

**API Endpoint:** `POST /search/`

**Request Headers:**
- `Content-Type: application/vnd.olrapi.dataview.dql+txt`

**Request Body:** DQL query string (plain text)

**Returns:**
- `results`: Array of matching notes
  - `filename`: Path to matching note
  - `result`: Query result for this note (depends on query - can be string, number, array, object)
- `total`: Total number of matches
- `query`: Original DQL query
- `timestamp`: Search completion time (ISO 8601)

**Annotations:**
- `readOnlyHint`: true (search operation, no side effects)
- `idempotentHint`: true (same query returns consistent results)
- `openWorldHint`: true (calls local Obsidian API and Dataview plugin)

**Authorization:**
- Required scopes: `tool:obsidian_vault:search`

**Example Queries:**

**Find active project notes:**
```dql
TABLE status, tags
FROM "Projects"
WHERE status = "active"
SORT file.mtime DESC
```

**Find notes modified this week with specific tag:**
```dql
TABLE file.mtime
WHERE contains(tags, "#important")
AND date(now) - file.mtime <= dur(7 days)
```

**Example Response:**
```json
{
  "results": [
    {
      "filename": "Projects/ML Pipeline.md",
      "result": {
        "status": "active",
        "tags": ["ml", "infrastructure"]
      }
    },
    {
      "filename": "Projects/API Redesign.md",
      "result": {
        "status": "active",
        "tags": ["backend", "api"]
      }
    }
  ],
  "total": 2,
  "query": "TABLE status, tags FROM \"Projects\" WHERE status = \"active\" SORT file.mtime DESC",
  "timestamp": "2025-10-23T10:30:00Z"
}
```

---

### `obsidian_search_jsonlogic`

**Description**: Advanced programmatic search using JsonLogic query language. Supports complex filtering logic with custom operators including glob patterns and regular expressions. Most powerful search option for algorithmic note filtering.

> **When to use**: User needs complex conditional logic, pattern matching (glob/regex), or programmatic filtering beyond Dataview's capabilities
>
> **Why useful**: Maximum query flexibility. Enables sophisticated filtering logic with boolean operators, comparisons, and custom operators.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | object | Yes | JsonLogic query object. Uses [JsonLogic](https://jsonlogic.com/operations.html) syntax with extensions: `glob` operator for pattern matching, `regexp` operator for regex matching. Queries evaluate against note objects (schema: `NoteJson` with `content`, `path`, `frontmatter`, `tags`, `stat` fields). |

**API Endpoint:** `POST /search/`

**Request Headers:**
- `Content-Type: application/vnd.olrapi.jsonlogic+json`

**Request Body:** JsonLogic query object (JSON)

**Returns:**
- `results`: Array of matching notes
  - `filename`: Path to matching note
  - `result`: Query evaluation result (depends on query - can be any type)
- `total`: Total number of matches
- `query`: Original JsonLogic query
- `timestamp`: Search completion time (ISO 8601)

**Annotations:**
- `readOnlyHint`: true (search operation, no side effects)
- `idempotentHint`: true (same query returns consistent results)
- `openWorldHint`: true (calls local Obsidian API)

**Authorization:**
- Required scopes: `tool:obsidian_vault:search`

**Extended Operators:**
- `glob`: Pattern matching - `{"glob": ["*.md", {"var": "path"}]}` - Returns true if path matches glob pattern
- `regexp`: Regular expression matching - `{"regexp": ["^Projects/.*", {"var": "path"}]}` - Returns true if path matches regex

**Example Queries:**

**Find notes in Projects folder modified in last 7 days:**
```json
{
  "and": [
    {"glob": ["Projects/*.md", {"var": "path"}]},
    {">": [
      {"var": "stat.mtime"},
      {"- ": [{"*": [{"var": "now"}, 1]}, 604800000]}
    ]}
  ]
}
```

**Find notes with specific frontmatter and tag:**
```json
{
  "and": [
    {"==": [{"var": "frontmatter.status"}, "active"]},
    {"in": ["ml", {"var": "tags"}]}
  ]
}
```

**Example Response:**
```json
{
  "results": [
    {
      "filename": "Projects/ML Pipeline.md",
      "result": true
    },
    {
      "filename": "Projects/Data Processing.md",
      "result": true
    }
  ],
  "total": 2,
  "query": {
    "and": [
      {"glob": ["Projects/*.md", {"var": "path"}]},
      {"==": [{"var": "frontmatter.status"}, "active"]}
    ]
  },
  "timestamp": "2025-10-23T10:30:00Z"
}
```

---

### `obsidian_get_periodic_note`

**Description**: Retrieve the current periodic note for a specified period (daily, weekly, monthly, quarterly, or yearly). Returns full note content with metadata. Requires Periodic Notes or Calendar plugin configured in Obsidian.

> **When to use**: User wants to access today's daily note, this week's note, current month's note, etc.
>
> **Why useful**: Context-aware access to time-based notes without calculating dates or knowing file paths

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | enum | Yes | Type of periodic note: `daily`, `weekly`, `monthly`, `quarterly`, or `yearly`. Returns the current period's note (e.g., today for daily, this week for weekly). |
| `include_metadata` | boolean | No | Return structured metadata in addition to content. Default: `true`. |

**API Endpoint:** `GET /periodic/{period}/`

**Path Parameters:**
- `period`: `daily` | `weekly` | `monthly` | `quarterly` | `yearly`

**Headers:**
- `Accept: application/vnd.olrapi.note+json` (for metadata) or `Accept: text/markdown` (for plain content)

**Returns:**
- `content`: Full markdown content of the periodic note
- `path`: File path relative to vault root
- `frontmatter`: Parsed YAML frontmatter as JSON object
- `tags`: Array of tags found in note
- `stat`: File statistics (ctime, mtime, size)
- `period`: Period type requested
- `date`: Current date/period this note represents
- `timestamp`: Response generation time (ISO 8601)

**Annotations:**
- `readOnlyHint`: true (read operation, no side effects)
- `idempotentHint`: false (returns different notes as time changes)
- `openWorldHint`: true (calls local Obsidian API)

**Authorization:**
- Required scopes: `tool:obsidian_note:read`

**Example Response:**
```json
{
  "content": "# October 23, 2024\n\n## Tasks\n- [ ] Review pull requests\n- [ ] Team standup at 10am\n\n## Notes\nDiscussed project timeline in morning meeting.",
  "path": "Daily Notes/2024-10-23.md",
  "frontmatter": {
    "date": "2024-10-23",
    "tags": ["daily"]
  },
  "tags": ["daily"],
  "stat": {
    "ctime": 1698062400000,
    "mtime": 1698080000000,
    "size": 156
  },
  "period": "daily",
  "date": "2024-10-23",
  "timestamp": "2025-10-23T10:30:00Z"
}
```

---

### `obsidian_append_periodic_note`

**Description**: Append content to a periodic note (current or specific date). If the note doesn't exist, it will be created according to your periodic note template settings. Supports all period types: daily, weekly, monthly, quarterly, yearly.

> **When to use**: User wants to add entries to their daily journal, weekly review, or any periodic note
>
> **Why useful**: Quick capture to time-based notes without managing file paths or date calculations. Auto-creates notes if needed.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | enum | Yes | Type of periodic note: `daily`, `weekly`, `monthly`, `quarterly`, or `yearly`. |
| `content` | string | Yes | Markdown content to append. Include leading newlines for spacing (e.g., `"\n\n## New Entry"`). |
| `date` | string | No | Specific date for the periodic note in flexible format (e.g., "2024-10-23", "October 23, 2024", "yesterday", "last Monday"). Omit to use current period. Parsed automatically. |
| `year` | number | No | Year (if specifying date via components). Used with `month` and `day`. Alternative to `date` parameter. |
| `month` | number | No | Month 1-12 (if specifying date via components). |
| `day` | number | No | Day 1-31 (if specifying date via components). |

**API Endpoint:**
- Current: `POST /periodic/{period}/`
- Specific date (components): `POST /periodic/{period}/{year}/{month}/{day}/`

**Path Parameters:**
- `period`: `daily` | `weekly` | `monthly` | `quarterly` | `yearly`
- `year`: Year number (e.g., 2024)
- `month`: Month number 1-12
- `day`: Day number 1-31

**Request Body:** Raw markdown text (Content-Type: `text/markdown`)

**Returns:**
- `success`: Boolean indicating successful append
- `path`: Path where content was appended
- `period`: Period type
- `date`: Date of the periodic note
- `created`: Boolean indicating if note was newly created
- `message`: Confirmation message
- `timestamp`: Operation completion time (ISO 8601)

**Annotations:**
- `readOnlyHint`: false (modifies note content)
- `destructiveHint`: false (only appends - does not modify existing content)
- `idempotentHint`: false (repeated calls append multiple times)
- `openWorldHint`: true (calls local Obsidian API)

**Authorization:**
- Required scopes: `tool:obsidian_note:write`

**Example Usage:**

**Append to today's daily note:**
```json
{
  "period": "daily",
  "content": "\n\n## 3:00 PM - Quick Note\nRemembered to follow up with Sarah about the design mockups."
}
```

**Append to specific date:**
```json
{
  "period": "daily",
  "content": "\n\n## Retrospective\nWhat went well: Completed all sprint goals.",
  "year": 2024,
  "month": 10,
  "day": 18
}
```

---

### `obsidian_patch_periodic_note`

**Description**: Surgically modify specific sections within a periodic note (current or specific date). Target content by heading, block reference, or frontmatter field. Operations: append, prepend, or replace targeted content.

> **When to use**: User needs to update a specific section in a periodic note, such as adding tasks under a heading or updating metadata
>
> **Why useful**: Precise updates to time-based notes without rewriting entire note. Maintains structure while adding/updating content.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | enum | Yes | Type of periodic note: `daily`, `weekly`, `monthly`, `quarterly`, or `yearly`. |
| `operation` | enum | Yes | Type of modification: `append`, `prepend`, or `replace`. |
| `target_type` | enum | Yes | Type of target: `heading`, `block`, or `frontmatter`. |
| `target` | string | Yes | Target identifier (heading path with `::`, block ID, or frontmatter field name). |
| `content` | string | Yes | Content to insert (markdown or JSON). |
| `content_format` | enum | No | Format: `markdown` (default) or `json`. |
| `date` | string | No | Specific date (flexible format). Omit for current period. |
| `year` | number | No | Year (if specifying date via components). |
| `month` | number | No | Month 1-12 (if specifying date via components). |
| `day` | number | No | Day 1-31 (if specifying date via components). |
| `heading_delimiter` | string | No | Delimiter for nested headings. Default: `"::"`. |
| `trim_whitespace` | boolean | No | Trim whitespace from target. Default: `false`. |

**API Endpoint:**
- Current: `PATCH /periodic/{period}/`
- Specific date: `PATCH /periodic/{period}/{year}/{month}/{day}/`

**Headers:**
- `Operation`: `append` | `prepend` | `replace`
- `Target-Type`: `heading` | `block` | `frontmatter`
- `Target`: Target identifier (URL-encoded if needed)

**Request Body:** Content to insert (Content-Type: `text/markdown` or `application/json`)

**Returns:**
- `success`: Boolean indicating successful patch
- `path`: Path to patched periodic note
- `period`: Period type
- `date`: Date of the periodic note
- `operation`: Operation performed
- `target_type`: Type of target modified
- `target`: Target that was modified
- `message`: Confirmation message
- `timestamp`: Operation completion time (ISO 8601)

**Annotations:**
- `readOnlyHint`: false (modifies note content)
- `destructiveHint`: true (can replace content)
- `idempotentHint`: false (append/prepend not idempotent)
- `openWorldHint`: true (calls local Obsidian API)

**Authorization:**
- Required scopes: `tool:obsidian_note:write`

**Example Usage:**

**Add task under "Tasks" heading in today's daily note:**
```json
{
  "period": "daily",
  "operation": "append",
  "target_type": "heading",
  "target": "Tasks",
  "content": "\n- [ ] Complete code review for PR #456",
  "content_format": "markdown"
}
```

---

### `obsidian_list_commands`

**Description**: List all available Obsidian commands. Commands include built-in Obsidian actions and commands provided by installed plugins. Use this to discover available commands before executing them.

> **When to use**: User wants to see what commands are available in their Obsidian installation
>
> **Why useful**: Enables discovery of Obsidian capabilities and plugin features. Essential for automating Obsidian actions.

**Parameters:**
None (no parameters required)

**API Endpoint:** `GET /commands/`

**Returns:**
- `commands`: Array of available command objects
  - `id`: Unique command identifier (use with `obsidian_execute_command`)
  - `name`: Human-readable command name
- `total`: Total number of available commands
- `timestamp`: Response generation time (ISO 8601)

**Annotations:**
- `readOnlyHint`: true (lists commands, no side effects)
- `idempotentHint`: true (repeated calls return current command list)
- `openWorldHint`: true (calls local Obsidian API)

**Authorization:**
- Required scopes: `tool:obsidian_commands:read`

**Example Response:**
```json
{
  "commands": [
    {
      "id": "global-search:open",
      "name": "Search: Search in all files"
    },
    {
      "id": "graph:open",
      "name": "Graph view: Open graph view"
    },
    {
      "id": "daily-notes",
      "name": "Daily notes: Open today's daily note"
    },
    {
      "id": "editor:toggle-bold",
      "name": "Toggle bold"
    }
  ],
  "total": 4,
  "timestamp": "2025-10-23T10:30:00Z"
}
```

---

### `obsidian_execute_command`

**Description**: Execute an Obsidian command by ID. Commands can perform various actions like opening views, creating notes, running plugin features, or triggering editor operations. Use `obsidian_list_commands` to discover available command IDs.

> **When to use**: User wants to trigger an Obsidian action programmatically
>
> **Why useful**: Automates Obsidian workflows and plugin operations. Enables integration with Obsidian's full feature set.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `command_id` | string | Yes | Unique identifier for the command to execute. Get available IDs from `obsidian_list_commands`. Examples: `"global-search:open"`, `"graph:open"`, `"daily-notes"`. |

**API Endpoint:** `POST /commands/{commandId}/`

**Path Parameters:**
- `commandId`: Command ID string

**Returns:**
- `success`: Boolean indicating successful execution
- `command_id`: ID of executed command
- `message`: Confirmation message
- `timestamp`: Execution completion time (ISO 8601)

**Annotations:**
- `readOnlyHint`: false (commands can have side effects)
- `destructiveHint`: varies (depends on command - some modify state, some don't)
- `idempotentHint`: false (repeated executions may have cumulative effects)
- `openWorldHint`: true (calls local Obsidian API)

**Authorization:**
- Required scopes: `tool:obsidian_commands:execute`

**Example Usage:**

**Open graph view:**
```json
{
  "command_id": "graph:open"
}
```

**Open today's daily note:**
```json
{
  "command_id": "daily-notes"
}
```

---

### `obsidian_open_note`

**Description**: Open a specific note in the Obsidian user interface. Optionally open in a new pane (leaf) instead of replacing the active note. If the note doesn't exist, Obsidian will create it.

> **When to use**: User wants to view a note in Obsidian after creating, modifying, or finding it
>
> **Why useful**: Seamless transition from automation back to manual interaction. User can review AI-generated or modified content.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | File path relative to vault root. Can include or omit `.md` extension. If file doesn't exist, Obsidian will create an empty note at this path. |
| `new_leaf` | boolean | No | Open in new pane/tab instead of replacing active note. Default: `false`. Set to `true` to preserve currently open note. |

**API Endpoint:** `POST /open/{filename}`

**Path Parameters:**
- `filename`: File path to open

**Query Parameters:**
- `newLeaf`: Boolean (optional, default: false)

**Returns:**
- `success`: Boolean indicating note was opened in Obsidian
- `path`: Path that was opened
- `new_leaf`: Whether it was opened in a new pane
- `message`: Confirmation message
- `timestamp`: Operation completion time (ISO 8601)

**Annotations:**
- `readOnlyHint`: false (changes UI state - opens note)
- `destructiveHint`: false (doesn't modify note content, only UI)
- `idempotentHint`: true (repeated calls result in same UI state)
- `openWorldHint`: true (calls local Obsidian API)

**Authorization:**
- Required scopes: `tool:obsidian_ui:navigate`

**Example Usage:**

**Open note in current pane:**
```json
{
  "path": "Projects/ML Resources.md",
  "new_leaf": false
}
```

**Open note in new pane:**
```json
{
  "path": "Daily Notes/2024-10-23.md",
  "new_leaf": true
}
```

---

## Use Cases

Clear, specific examples of how AI agents would use this server:

- **"Add today's meeting notes to my daily note under the Meetings heading"** - Use `obsidian_patch_periodic_note` with period="daily", target="Meetings", operation="append"

- **"Find all notes tagged #ml that I haven't updated in the past month and show me summaries"** - Use `obsidian_search_dataview` with date filters, then `obsidian_get_note` for each result

- **"Create a new project note for the 'API Redesign' project with standard frontmatter"** - Use `obsidian_create_note` with template content including frontmatter

- **"Search all my notes for mentions of 'quantum computing' and create a summary note with links"** - Use `obsidian_search_simple`, extract relevant notes, then `obsidian_create_note` with wikilinks to findings

- **"Review yesterday's daily note, find incomplete tasks, and add them to today's note under 'Carried Over'"** - Use `obsidian_get_periodic_note` with date parameter, parse content, then `obsidian_patch_periodic_note` for today

- **"Update the status frontmatter field to 'completed' for all project notes in the Done folder"** - Use `obsidian_list_vault_files`, iterate results, use `obsidian_patch_note` with target_type="frontmatter"

- **"Find all notes that link to 'Machine Learning MOC' and compile a list of topics covered"** - Use `obsidian_search_jsonlogic` or `obsidian_search_dataview` to find backlinks, retrieve notes, analyze content

- **"Create a weekly review note with all daily notes from this week automatically included"** - Use `obsidian_get_periodic_note` for each day of the week, extract content, create summary with `obsidian_create_note`

**Value Proposition**: This server transforms Obsidian from a manual note-taking tool into an AI-powered knowledge management system. Enables automated organization, intelligent search, context-aware note creation, and seamless integration with AI workflows while maintaining the structure and flexibility Obsidian users expect.

---

## Implementation Notes

### Authentication

- How to obtain: Install [Obsidian Local REST API plugin](https://github.com/coddingtonbear/obsidian-local-rest-api) from Community Plugins, navigate to plugin settings, generate API token
- Where to include: HTTP header `Authorization: Bearer <token>`
- Limitations: Local access only (localhost API), requires Obsidian running
- Security: HTTPS with self-signed certificate (requires cert trust or verification disabled)

### Rate Limits

- Limits: No rate limits (local API)
- Caching: Not necessary (instant local access), but can cache frequently accessed notes
- Pagination: Not applicable (search results returned in full)
- Performance: Local filesystem speed - very fast

### Data Considerations

- **Freshness**: Real-time (reflects current vault state immediately)
- **Quality**: Depends on vault organization and note quality. Parsing relies on proper markdown syntax.
- **Volume**: Limited by vault size. Most vaults are <10GB. Search performance degrades with very large vaults (>10,000 notes).
- **File Paths**: Case-sensitive on Linux/macOS, case-insensitive on Windows. Handle path variations gracefully.
- **Note Format**: Markdown with YAML frontmatter. Support wikilinks `[[Note]]`, tags `#tag`, block references `^blockid`.

### Error Handling

- `400`: Bad request - invalid parameters, malformed JSON, invalid DQL/JsonLogic query. Check query syntax.
- `401`: Unauthorized - invalid or missing API token. Verify token in plugin settings.
- `404`: File/directory does not exist. Verify path is correct and relative to vault root.
- `405`: Method not allowed - operation not valid for target (e.g., trying to delete a directory). Use correct endpoint.
- `500`: Server error - Obsidian plugin error or crash. Check Obsidian console for details.
- **API errors**: Return error objects with `errorCode` (5-digit unique ID) and `message` (human-readable). Log for debugging.
- **Retry strategy**: No retries needed for local API. If Obsidian not running, return clear error to user.

### Performance Optimization

- **Caching**: Cache frequently accessed notes (daily note, MOCs) for 30-60 seconds. Invalidate on writes.
- **Bulk ops**: Use parallel calls for reading multiple notes. API supports concurrent requests.
- **Local data**: All data is already local. No download needed. Vault is user's filesystem.
- **Search optimization**:
  - Use `obsidian_search_simple` for basic text searches (fastest)
  - Use `obsidian_search_dataview` for metadata queries (requires Dataview plugin)
  - Use `obsidian_search_jsonlogic` for complex programmatic filtering
- **PATCH operations**: More efficient than reading + parsing + rewriting entire notes

### Integration Opportunities

This server works exceptionally well with other knowledge management and productivity tools. Obsidian can serve as a central knowledge repository that other services feed into and draw from.

**Example Flow:**
1. **Research Server** (arXiv, PubMed, etc.): Find relevant papers → `obsidian_create_note` to store paper summaries
2. **Obsidian Server**: Organize and link research notes → `obsidian_search_dataview` to find related content
3. **Writing Server** (notion, docs): Pull insights → `obsidian_get_note` to retrieve knowledge for content creation

**Integration Scenarios:**
- **Daily Workflows**: Calendar/task systems → `obsidian_append_periodic_note` → Automatic daily note population
- **Knowledge Synthesis**: Web clipper → `obsidian_create_note` → `obsidian_search_dataview` → Link related notes
- **Content Publishing**: `obsidian_get_note` → Export to blog/website → Obsidian as CMS backend
- **Research Pipelines**: Academic databases → `obsidian_create_note` with references → Literature review automation

### Best Practices

- **Frontmatter consistency**: Establish frontmatter schema for your vault. Use consistent field names across notes for reliable Dataview queries.
- **Heading structure**: Maintain consistent heading hierarchies. Makes PATCH operations more reliable.
- **Block references**: Add block references (`^blockid`) to important sections you'll update programmatically.
- **Path handling**: Always use forward slashes `/` for paths. Handle both with and without `.md` extension.
- **Content formatting**: Preserve markdown formatting. When appending, include appropriate newlines (`\n\n`) for spacing.
- **Error recovery**: Always check if notes exist before patching. Use `obsidian_get_note` to verify structure before complex patches.
- **Backup strategy**: Obsidian + Git is highly recommended. API operations are immediate and can't be undone except through Obsidian's file history.

### Alternative Data Sources

- [Obsidian Sync API](https://obsidian.md/sync) - Official cloud sync with API access (paid, requires Obsidian Sync subscription)
- [Obsidian Git Plugin](https://github.com/denolehov/obsidian-git) - Git-based sync and version control (free)
- [Obsidian HTTP Request Plugin](https://github.com/Rooyca/obsidian-api-request) - Alternative REST API plugin with different feature set
- [Dataview Plugin Direct](https://blacksmithgu.github.io/obsidian-dataview/) - Query vault via plugin API if building Obsidian plugin instead of MCP server

---

## Tool Implementation Standards

> **Note**: For complete implementation guidance, see [AGENTS.md Tool Implementation Standards](../../AGENTS.md#iva-tool-implementation-standards-mcp-ts-template-alignment).

When implementing this server using [mcp-ts-template](https://github.com/cyanheads/mcp-ts-template), each tool follows this structure:

```typescript
/**
 * @fileoverview Retrieve content and metadata of any note by file path
 * @module src/mcp-server/tools/definitions/obsidian-get-note.tool
 */

import { z } from 'zod';
import { McpError, JsonRpcErrorCode } from '@/types-global/errors.js';
import { logger } from '@/utils/index.js';
import { withToolAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';
import type {
  ToolDefinition,
  RequestContext,
  SdkContext,
  ContentBlock
} from '@/types-global/index.js';

// 1. Metadata
const TOOL_NAME = 'obsidian_get_note';
const TOOL_TITLE = 'Get Obsidian Note';
const TOOL_DESCRIPTION = 'Retrieve content and metadata of a note by file path. Use when you need to read a specific note (not the currently active one). Returns full content, frontmatter, tags, and file statistics.';

// 2. Input/Output schemas with LLM-friendly validation
const InputSchema = z.object({
  path: z.string()
    .min(1, 'Path cannot be empty')
    .describe('File path relative to vault root. Can include or omit .md extension (e.g., "Projects/ML" or "Projects/ML.md"). Forward slashes separate directories.'),

  include_metadata: z.boolean()
    .optional()
    .describe('Return structured metadata (frontmatter, tags, file stats) in addition to content. Default: true. Set to false for plain markdown only.'),
}).describe('Parameters for retrieving an Obsidian note');

const OutputSchema = z.object({
  content: z.string().describe('Full markdown content of the note'),
  path: z.string().describe('File path relative to vault root'),
  frontmatter: z.record(z.unknown()).optional().describe('Parsed YAML frontmatter as JSON object'),
  tags: z.array(z.string()).optional().describe('Array of tags found in note'),
  stat: z.object({
    ctime: z.number().describe('Creation timestamp (Unix milliseconds)'),
    mtime: z.number().describe('Modification timestamp (Unix milliseconds)'),
    size: z.number().describe('File size in bytes'),
  }).optional().describe('File statistics'),
  timestamp: z.string().describe('Response generation time (ISO 8601)'),
}).describe('Note content and metadata');

type ToolInput = z.infer<typeof InputSchema>;
type ToolOutput = z.infer<typeof OutputSchema>;

// 3. Pure business logic (no try/catch - throw McpError)
async function toolLogic(
  input: ToolInput,
  appContext: RequestContext,
  sdkContext: SdkContext
): Promise<ToolOutput> {
  logger.info('Fetching Obsidian note', {
    ...appContext,
    path: input.path,
    include_metadata: input.include_metadata ?? true,
  });

  // Normalize path (handle with/without .md extension)
  const normalizedPath = input.path.endsWith('.md') ? input.path : `${input.path}.md`;

  // Build API URL
  const baseUrl = process.env.OBSIDIAN_BASE_URL || 'https://127.0.0.1:27124';
  const apiToken = process.env.OBSIDIAN_API_KEY;

  if (!apiToken) {
    throw new McpError(
      JsonRpcErrorCode.InvalidRequest,
      'Obsidian API token not configured',
      { requestId: appContext.requestId }
    );
  }

  const url = `${baseUrl}/vault/${encodeURIComponent(normalizedPath)}`;
  const includeMetadata = input.include_metadata ?? true;

  // API call with timeout
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Accept': includeMetadata
        ? 'application/vnd.olrapi.note+json'
        : 'text/markdown',
    },
    signal: AbortSignal.timeout(5000),
    // Note: May need to disable cert verification for self-signed certs
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new McpError(
        JsonRpcErrorCode.InvalidParams,
        `Note not found: ${input.path}`,
        { requestId: appContext.requestId, path: normalizedPath }
      );
    }
    throw new McpError(
      JsonRpcErrorCode.ServiceUnavailable,
      `Obsidian API error: ${response.status} ${response.statusText}`,
      { requestId: appContext.requestId, status: response.status }
    );
  }

  // Parse response
  const rawData = includeMetadata ? await response.json() : { content: await response.text() };

  // Validate API response
  const parsed = OutputSchema.safeParse({
    ...rawData,
    timestamp: new Date().toISOString(),
  });

  if (!parsed.success) {
    logger.error('Obsidian API response validation failed', {
      ...appContext,
      issues: parsed.error.issues,
    });
    throw new McpError(
      JsonRpcErrorCode.ServiceUnavailable,
      'Obsidian API returned unexpected data format',
      { requestId: appContext.requestId, issues: parsed.error.issues }
    );
  }

  return parsed.data;
}

// 4. Optional response formatter
function responseFormatter(result: ToolOutput): ContentBlock[] {
  const md = [];

  md.push(`# ${result.path}\n`);

  if (result.frontmatter && Object.keys(result.frontmatter).length > 0) {
    md.push(`**Frontmatter**: ${JSON.stringify(result.frontmatter, null, 2)}\n`);
  }

  if (result.tags && result.tags.length > 0) {
    md.push(`**Tags**: ${result.tags.join(', ')}\n`);
  }

  if (result.stat) {
    const modifiedDate = new Date(result.stat.mtime).toLocaleString();
    md.push(`**Last Modified**: ${modifiedDate}\n`);
    md.push(`**Size**: ${result.stat.size} bytes\n`);
  }

  md.push(`\n---\n\n${result.content}`);

  return [{
    type: 'text',
    text: md.join('\n')
  }];
}

// 5. Tool definition export
export const toolDef: ToolDefinition = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  logic: withToolAuth(['tool:obsidian_note:read'], toolLogic),
  responseFormatter,
};
```

**Key Requirements:**
- Use Zod schemas with `.describe()` on every field following LLM-Facing Design Principles
- Accept flexible input formats (paths with/without extensions, various date formats)
- Throw `McpError` (never use try/catch in logic)
- Validate external API responses with Zod
- Include `...appContext` in all logger calls
- Wrap logic with `withToolAuth()` for authorization
- Handle self-signed certificates appropriately (may need to disable cert verification)
- Normalize paths to handle different input formats
- Parse markdown frontmatter and tags when metadata requested

**Obsidian-Specific Considerations:**
- **URL Encoding**: Paths with spaces or special characters must be URL-encoded
- **Accept Headers**: Use `application/vnd.olrapi.note+json` for structured data or `text/markdown` for plain text
- **Authorization**: Bearer token in `Authorization` header
- **Self-Signed Certs**: Local API uses HTTPS with self-signed cert - may need to trust cert or disable verification
- **Content-Type**: Use `text/markdown` for note content, `application/json` for structured updates (frontmatter, table rows)
- **Error Codes**: API returns 5-digit error codes in error responses - log for debugging

---

## Technical Requirements

**Alignment with [mcp-ts-template](https://github.com/cyanheads/mcp-ts-template):**

- **Service Layer**:
  - HTTP client with retry/timeout for API calls
  - Certificate handling for self-signed HTTPS (trust or verification bypass)
  - Path normalization utilities (handle `.md` extension variations)
  - Markdown parsing utilities (frontmatter, tags, block references)
  - Response parsing with Zod validation
  - Error mapping from API error codes to MCP errors

- **Tool Definitions**:
  - 16 tools covering full API surface area
  - Parameter schemas with flexible LLM-friendly validation (dates, paths, content)
  - Response formatters for readable output with context
  - Error patterns for 400, 401, 404, 405, 500 status codes
  - Authorization scopes: `obsidian_note:read`, `obsidian_note:write`, `obsidian_note:delete`, `obsidian_vault:read`, `obsidian_vault:search`, `obsidian_commands:read`, `obsidian_commands:execute`, `obsidian_ui:navigate`

- **Infrastructure**:
  - Multi-tenancy support (different users → different Obsidian instances/vaults)
  - Observability with structured logging (all API calls, errors)
  - Environment configuration for API URL and token
  - Optional caching layer for frequently accessed notes
  - Edge compatibility (local API only - no network latency concerns)

---

## References & Resources

- [Obsidian Local REST API GitHub](https://github.com/coddingtonbear/obsidian-local-rest-api)
- [OpenAPI Specification](https://github.com/coddingtonbear/obsidian-local-rest-api/blob/master/openapi.yaml)
- [Obsidian Documentation](https://obsidian.md/docs)
- [Dataview Plugin Docs](https://blacksmithgu.github.io/obsidian-dataview/)
- [JsonLogic Documentation](https://jsonlogic.com/operations.html)
- [Obsidian Community Forum](https://forum.obsidian.md/)
- [Obsidian Plugin API](https://docs.obsidian.md/Home)
- [mcp-ts-template](https://github.com/cyanheads/mcp-ts-template) - Reference implementation architecture

---

## Notes

**Prerequisites:**
- Obsidian must be installed and running on the user's machine
- Obsidian Local REST API plugin must be installed and enabled
- API token must be generated in plugin settings
- User may need to trust the self-signed certificate or configure cert verification bypass

**Security Considerations:**
- API runs on localhost only - no remote access
- HTTPS with self-signed certificate - provides encryption but not identity verification
- API token required for all requests except server status endpoint
- No IP restrictions - any local process with token can access API
- Vault access is filesystem-level - API has full read/write access to vault directory

**Plugin Compatibility:**
- Search features require respective plugins installed:
  - `obsidian_search_dataview` requires Dataview plugin
  - Periodic notes require Periodic Notes or Calendar plugin (configured with note templates and paths)
- Commands available via `obsidian_list_commands` / `obsidian_execute_command` depend on installed plugins

**Future Enhancements:**
- WebSocket support for real-time vault change notifications
- Bulk operations endpoint for batch note updates
- Graph analysis tools (query note connections, backlinks, etc.)
- Export capabilities (vault → PDF, HTML, etc.)
- Template system integration for programmatic note creation from templates

---

**Maintained by**: [@cyanheads](https://github.com/cyanheads)
**Last Updated**: 2025-10-23
