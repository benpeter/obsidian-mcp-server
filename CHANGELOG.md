# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2025-10-23

### Alignment

- Aligned with mcp-ts-template v2.5.5 architecture and patterns

### Major Rewrite

This release represents a complete rewrite of the Obsidian MCP server with a new, more granular tool architecture.

### Added

- **Obsidian Service Layer**: New `src/services/obsidian/` module providing typed API client for Obsidian Local REST API integration
- **19 Comprehensive Obsidian Tools**:
  - `obsidian_append_active_note`: Append content to currently active note
  - `obsidian_append_note`: Append content to specified note
  - `obsidian_append_periodic_note`: Append content to periodic note (daily, weekly, etc.)
  - `obsidian_create_note`: Create new notes with content
  - `obsidian_delete_note`: Delete notes from vault
  - `obsidian_execute_command`: Execute Obsidian commands
  - `obsidian_get_active_note`: Retrieve currently active note
  - `obsidian_get_note`: Retrieve specified note content
  - `obsidian_get_periodic_note`: Retrieve periodic note content
  - `obsidian_list_commands`: List available Obsidian commands
  - `obsidian_list_vault_files`: List all files in vault
  - `obsidian_open_note`: Open note in Obsidian
  - `obsidian_patch_active_note`: Patch active note content
  - `obsidian_patch_note`: Patch specified note content
  - `obsidian_patch_periodic_note`: Patch periodic note content
  - `obsidian_search_dataview`: Search using Dataview queries
  - `obsidian_search_jsonlogic`: Search using JSONLogic queries
  - `obsidian_search_simple`: Perform simple text search across vault
  - `obsidian_update_active_note`: Update active note content
- **Documentation**: New `docs/obsidian/` directory with comprehensive Obsidian integration documentation
- **Full Test Coverage**: Complete test suite for all 19 Obsidian tools

### Removed

- **Legacy Obsidian Tools (v2.0.7)**: Replaced 8 monolithic tools with 19 granular tools:
  - `obsidian_read_note` → Replaced by `obsidian_get_note`, `obsidian_get_active_note`, `obsidian_get_periodic_note`
  - `obsidian_update_note` → Replaced by granular operations (`append`, `patch`, `update`) for different target types
  - `obsidian_search_replace` → Replaced by `patch` operations on notes
  - `obsidian_global_search` → Replaced by `obsidian_search_simple`, `obsidian_search_dataview`, `obsidian_search_jsonlogic`
  - `obsidian_list_notes` → Replaced by `obsidian_list_vault_files`
  - `obsidian_manage_frontmatter` → Replaced by `patch` operations with frontmatter support
  - `obsidian_manage_tags` → Replaced by `patch` operations with tag support
  - `obsidian_delete_note` → Retained with same functionality
- **Template Tools**: Removed all example/template tools and their tests:
  - `template-cat-fact`: Cat fact API example tool
  - `template-code-review-sampling`: Code review sampling example
  - `template-echo-message`: Echo message example
  - `template-image-test`: Image handling example
  - `template-madlibs-elicitation`: MadLibs elicitation example
- **Template Documentation**: Removed generic template documentation files:
  - `docs/devdocs.md`
  - `docs/mcp-elicitation-summary.md`
  - `docs/publishing-mcp-server-registry.md`
  - `docs/storage-surrealdb-setup.md`
  - `docs/surrealdb-schema.surql`
- **Changelog Archives**: Removed `changelog/archive1.md` and `changelog/archive2.md`

### Changed

- **Architecture Alignment**: Updated to align with mcp-ts-template v2.5.5 architecture
- **Configuration**: Updated configuration schema to support Obsidian-specific settings
- **Container Registration**: Modified DI container to register Obsidian services
- **Tool Definitions**: Reorganized tool definition exports to focus on Obsidian tools
- **Dependencies**: Updated dependencies to support Obsidian API integration (`openapi-fetch`, `gray-matter`)
- **Documentation**: Comprehensive updates to README.md and CLAUDE.md reflecting new Obsidian focus
- **Server Metadata**: Updated server.json with Obsidian-specific server information

### Fixed

- Storage provider validation for SurrealDB KV operations
- Error handling improvements across core type definitions
- Test coverage for transport and storage implementations

---

## Project Attribution

This project is built using [mcp-ts-template](https://github.com/cyanheads/mcp-ts-template) v2.5.5, a production-grade TypeScript template for building Model Context Protocol servers.
