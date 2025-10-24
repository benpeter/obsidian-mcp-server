<div align="center">
  <h1>obsidian-mcp-server</h1>
  <p><b>Production-grade MCP server that enables AI agents to interact with Obsidian vaults through the Obsidian Local REST API. Features comprehensive note operations, search capabilities, periodic notes, and command execution.</b>
  <div>19 Tools • 0 Prompts</div>
  </p>
</div>

<div align="center">

[![Version](https://img.shields.io/badge/Version-2.1.0-blue.svg?style=flat-square)](./CHANGELOG.md) [![MCP Spec](https://img.shields.io/badge/MCP%20Spec-2025--06--18-8A2BE2.svg?style=flat-square)](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-06-18/changelog.mdx) [![MCP SDK](https://img.shields.io/badge/MCP%20SDK-^1.20.1-green.svg?style=flat-square)](https://modelcontextprotocol.io/) [![License](https://img.shields.io/badge/License-Apache%202.0-orange.svg?style=flat-square)](./LICENSE) [![Status](https://img.shields.io/badge/Status-Production-green.svg?style=flat-square)](https://github.com/cyanheads/obsidian-mcp-server/issues) [![TypeScript](https://img.shields.io/badge/TypeScript-^5.9.3-3178C6.svg?style=flat-square)](https://www.typescriptlang.org/) [![Bun](https://img.shields.io/badge/Bun-v1.2.23-blueviolet.svg?style=flat-square)](https://bun.sh/)

</div>

---

## 🛠️ Tools Overview

This server provides 19 comprehensive tools for Obsidian vault operations, organized into five functional categories:

| Category                   | Tool                            | Description                                                 |
| :------------------------- | :------------------------------ | :---------------------------------------------------------- |
| **Note Reading**           | `obsidian_get_note`             | Get content of a specific note by path                      |
|                            | `obsidian_get_active_note`      | Get content of the currently active note                    |
|                            | `obsidian_get_periodic_note`    | Get a periodic note (daily, weekly, monthly, etc.)          |
| **Note Creation & Update** | `obsidian_create_note`          | Create a new note with optional content and frontmatter     |
|                            | `obsidian_append_note`          | Append content to the end of a specific note                |
|                            | `obsidian_append_active_note`   | Append content to the currently active note                 |
|                            | `obsidian_append_periodic_note` | Append content to a periodic note                           |
|                            | `obsidian_patch_note`           | Surgically update parts of a note (frontmatter, tags, etc.) |
|                            | `obsidian_patch_active_note`    | Patch the currently active note                             |
|                            | `obsidian_patch_periodic_note`  | Patch a periodic note                                       |
|                            | `obsidian_update_active_note`   | Replace entire content of the active note                   |
| **Vault Operations**       | `obsidian_list_vault_files`     | List all files and directories in the vault                 |
|                            | `obsidian_open_note`            | Open a specific note in Obsidian                            |
|                            | `obsidian_delete_note`          | Delete a note from the vault                                |
| **Search**                 | `obsidian_search_simple`        | Simple text search across all notes                         |
|                            | `obsidian_search_dataview`      | Advanced search using Dataview Query Language               |
|                            | `obsidian_search_jsonlogic`     | Complex search using JSONLogic queries                      |
| **Commands**               | `obsidian_list_commands`        | List all available Obsidian commands                        |
|                            | `obsidian_execute_command`      | Execute any Obsidian command by ID                          |

### Use Cases

Integrate AI agents with your Obsidian workflows:

- **Knowledge Management**: Read, search, and update notes programmatically
- **Daily Journaling**: Automatically create and append to daily notes with meeting notes, tasks, and reflections
- **Research Organization**: Tag, categorize, and link research notes through AI-assisted workflows
- **Project Management**: Update project status, track tasks, and maintain project documentation
- **Content Creation**: Draft, refine, and organize long-form content across multiple notes
- **Periodic Reviews**: Automatically generate weekly, monthly, or quarterly review notes
- **Command Automation**: Execute Obsidian commands to trigger complex workflows
- **Vault Analysis**: Search and analyze your knowledge base with advanced query capabilities

## 🚀 Getting Started

### Prerequisites

Before using this MCP server, you need:

1. **Obsidian** (latest version recommended)
2. **[Obsidian Local REST API Plugin](https://github.com/coddingtonbear/obsidian-local-rest-api)** installed and configured
3. **Either** [Bun v1.2.0+](https://bun.sh/) **OR** [Node.js v20.0.0+](https://nodejs.org/)

#### Setting up Obsidian Local REST API

1. Install the "Local REST API" plugin from Obsidian's Community Plugins
2. Enable the plugin in Settings → Community Plugins
3. Go to Settings → Local REST API
4. Note the **API Key** (you'll need this for `OBSIDIAN_API_KEY`)
5. Verify the server is running (default: `https://127.0.0.1:27124`)

### Runtime Compatibility

This server works with **both Bun and Node.js runtimes**:

| Runtime     | Command                             | Minimum Version | Notes                                    |
| ----------- | ----------------------------------- | --------------- | ---------------------------------------- |
| **Bun**     | `bunx obsidian-mcp-server@latest`   | ≥ 1.2.0         | Native Bun runtime (optimal performance) |
| **Node.js** | `npx -y obsidian-mcp-server@latest` | ≥ 20.0.0        | Via npx (universal compatibility)        |

The server automatically detects the runtime and optimizes performance accordingly.

### MCP Client Settings/Configuration

Add the following to your MCP Client configuration file (e.g., `cline_mcp_settings.json`). Clients have different ways to configure servers, so refer to your client's documentation for specifics.

**Be sure to update the `OBSIDIAN_API_KEY` with your actual API key from the Obsidian Local REST API plugin!**

#### Using Bun (bunx)

```json
{
  "mcpServers": {
    "obsidian": {
      "type": "stdio",
      "command": "bunx",
      "args": ["obsidian-mcp-server@latest"],
      "env": {
        "MCP_TRANSPORT_TYPE": "stdio",
        "MCP_LOG_LEVEL": "info",
        "OBSIDIAN_BASE_URL": "https://127.0.0.1:27124",
        "OBSIDIAN_API_KEY": "your-api-key-here",
        "OBSIDIAN_VERIFY_SSL": "false"
      }
    }
  }
}
```

#### Using Node.js (npx)

```json
{
  "mcpServers": {
    "obsidian": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "obsidian-mcp-server@latest"],
      "env": {
        "MCP_TRANSPORT_TYPE": "stdio",
        "MCP_LOG_LEVEL": "info",
        "OBSIDIAN_BASE_URL": "https://127.0.0.1:27124",
        "OBSIDIAN_API_KEY": "your-api-key-here",
        "OBSIDIAN_VERIFY_SSL": "false"
      }
    }
  }
}
```

#### Streamable HTTP Configuration

```bash
MCP_TRANSPORT_TYPE=http
MCP_HTTP_PORT=3010
OBSIDIAN_BASE_URL=https://127.0.0.1:27124
OBSIDIAN_API_KEY=your-api-key-here
OBSIDIAN_VERIFY_SSL=false
```

#### SSL Certificate Notes

The Obsidian Local REST API uses a self-signed certificate by default. If you encounter SSL errors:

1. Set `OBSIDIAN_VERIFY_SSL=false` (recommended for local use)
2. Or, trust the self-signed certificate in your system

### Development Environment Setup

#### Installation from Source

1. **Clone the repository:**

```sh
git clone https://github.com/cyanheads/obsidian-mcp-server.git
```

2. **Navigate into the directory:**

```sh
cd obsidian-mcp-server
```

3. **Install dependencies:**

**With Bun (recommended for development):**

```sh
bun install
```

**With Node.js:**

```sh
npm install
```

4. **Configure environment:**

```sh
# Create .env file
cp .env.example .env

# Edit .env and set:
# OBSIDIAN_BASE_URL=https://127.0.0.1:27124
# OBSIDIAN_API_KEY=your-api-key-here
# OBSIDIAN_VERIFY_SSL=false
```

## ✨ Server Features

This server is built on the [`mcp-ts-template`](https://github.com/cyanheads/mcp-ts-template) and inherits its rich feature set:

- **Declarative Tools**: Define capabilities in single, self-contained files. The framework handles registration, validation, and execution.
- **Robust Error Handling**: A unified `McpError` system ensures consistent, structured error responses.
- **Pluggable Authentication**: Secure your server with zero-fuss support for `none`, `jwt`, or `oauth` modes.
- **Abstracted Storage**: Swap storage backends (`in-memory`, `filesystem`, `Supabase`, `Cloudflare KV/R2`) without changing business logic.
- **Full-Stack Observability**: Deep insights with structured logging (Pino) and optional, auto-instrumented OpenTelemetry for traces and metrics.
- **Dependency Injection**: Built with `tsyringe` for a clean, decoupled, and testable architecture.
- **Edge-Ready Architecture**: Run seamlessly on local machines (stdio/HTTP) or deploy to Cloudflare Workers.

Plus, specialized features for **Obsidian integration**:

- **Type-Safe API Client**: Full TypeScript support with auto-generated types from Obsidian Local REST API OpenAPI spec
- **Comprehensive Note Operations**: Full CRUD operations with support for frontmatter, tags, and content manipulation
- **Granular Content Updates**: Append, patch, or replace note content with surgical precision
- **Periodic Notes Support**: First-class support for daily, weekly, monthly, quarterly, and yearly notes
- **Advanced Search Modes**: Simple text search, Dataview queries, and JSONLogic queries
- **Active Note Context**: Special operations for the currently active note in Obsidian
- **Command Execution**: List and execute any Obsidian command programmatically
- **Vault Management**: List files and directories across your entire vault
- **Error Mapping**: Intelligent error handling with detailed diagnostic information

## ⚙️ Configuration

All configuration is centralized and validated at startup in `src/config/index.ts`. Key environment variables in your `.env` file include:

| Variable              | Description                                                      | Default                   | Required |
| :-------------------- | :--------------------------------------------------------------- | :------------------------ | :------- |
| `OBSIDIAN_BASE_URL`   | Base URL for Obsidian Local REST API                             | `https://127.0.0.1:27124` | No       |
| `OBSIDIAN_API_KEY`    | API key from Obsidian Local REST API plugin settings             | `(none)`                  | Yes      |
| `OBSIDIAN_VERIFY_SSL` | Enable SSL certificate verification                              | `false`                   | No       |
| `MCP_TRANSPORT_TYPE`  | The transport to use: `stdio` or `http`                          | `stdio`                   | No       |
| `MCP_HTTP_PORT`       | The port for the HTTP server                                     | `3010`                    | No       |
| `MCP_HTTP_HOST`       | The hostname for the HTTP server                                 | `127.0.0.1`               | No       |
| `MCP_AUTH_MODE`       | Authentication mode: `none`, `jwt`, or `oauth`                   | `none`                    | No       |
| `MCP_LOG_LEVEL`       | The minimum level for logging (`debug`, `info`, `warn`, `error`) | `info`                    | No       |
| `OTEL_ENABLED`        | Set to `true` to enable OpenTelemetry                            | `false`                   | No       |
| `MCP_AUTH_SECRET_KEY` | **Required for `jwt` auth.** A 32+ character secret key          | `(none)`                  | No       |
| `OAUTH_ISSUER_URL`    | **Required for `oauth` auth.** URL of the OIDC provider          | `(none)`                  | No       |

### Authentication & Authorization

- **Modes**: `none` (default), `jwt` (requires `MCP_AUTH_SECRET_KEY`), or `oauth` (requires `OAUTH_ISSUER_URL` and `OAUTH_AUDIENCE`).
- **Authorization Scopes**:
  - `tool:obsidian:read` - Read operations (get notes, search, list)
  - `tool:obsidian:write` - Write operations (create, update, append, patch, delete)
  - `tool:obsidian:execute` - Command execution
- **Enforcement**: All tools are wrapped with `withToolAuth([...])` to enforce scope checks. Scope checks are bypassed when auth mode is `none`.

### Observability

- **Structured Logging**: Pino is integrated out-of-the-box. All logs are JSON and include the `RequestContext`.
- **OpenTelemetry**: Disabled by default. Enable with `OTEL_ENABLED=true` and configure OTLP endpoints. Traces, metrics (duration, payload sizes), and errors are automatically captured for every tool call.

## 📤 Understanding Tool Responses

This server follows MCP's dual-output architecture for all tools ([MCP Tools Specification](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)):

### What Users See (Human-Readable)

When you invoke a tool through your MCP client, you see a **formatted summary** designed for human consumption. For example, `obsidian_search_simple` might show:

```
Found 3 matches for "project status":

1. Projects/Project Alpha.md
   Updated: 2025-10-20

2. Daily/2025-10-15.md
   Updated: 2025-10-15

3. Weekly/2025-W42.md
   Updated: 2025-10-18
```

### What the LLM Sees (Complete Structured Data)

Behind the scenes, the LLM receives **complete structured data** as [content blocks](https://modelcontextprotocol.io/specification/2025-06-18/server/tools#tool-results) via the `responseFormatter` function. This includes:

- Full file paths and metadata
- Complete note content (when applicable)
- Frontmatter, tags, and all note properties
- Search results with match context
- Command details and execution results
- Everything needed to answer follow-up questions

**Why This Matters**: The LLM can answer detailed questions like "What's in the frontmatter of Project Alpha?" or "Show me the content of the second search result" because it has access to the full dataset, even if you only saw a summary.

**For Developers**: When creating custom tools, always include complete data in your `responseFormatter`. Balance human-readable summaries with comprehensive structured information. See [`CLAUDE.md`](CLAUDE.md) for response formatter best practices and the [MCP specification](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) for technical details.

## 🧑‍💻 Agent Development Guide

For strict rules when using this server with an AI agent, refer to the **[`CLAUDE.md`](CLAUDE.md)** file. Key principles include:

- **Logic Throws, Handlers Catch**: Never use `try/catch` in your tool `logic`. Throw an `McpError` instead.
- **Pass the Context**: Always pass the `RequestContext` object through your call stack for logging and tracing.
- **Use DI for Services**: Inject services via `@inject(ObsidianProvider)` instead of direct imports.
- **Validate Everything**: Use Zod schemas for all input validation with `.describe()` on every field.
- **Declarative Tool Pattern**: Each tool is defined in a single `*.tool.ts` file with schema, logic, and response formatting.

Quick reference for Obsidian development:

1. **Follow tool patterns**: `obsidian_<action>_<target>` naming convention
2. **Use authorization scopes**: Wrap logic with `withToolAuth(['tool:obsidian:read'])`
3. **Leverage the Obsidian provider**: All API interactions go through the injected `IObsidianProvider`
4. **Handle errors gracefully**: Map API errors to appropriate `McpError` with context
5. **See [docs/obsidian/](docs/obsidian/)** for complete integration documentation

## ▶️ Running the Server

### For End Users (via Package Manager)

The easiest way to use the server is via `bunx` or `npx` (no installation required):

**With Bun:**

```sh
bunx obsidian-mcp-server@latest
```

**With Node.js:**

```sh
npx -y obsidian-mcp-server@latest
```

Both commands work identically and are configured through environment variables or your MCP client configuration.

### Local Development

- **Build and run the production version**:

  ```sh
  # One-time build
  bun rebuild

  # Run the built server
  bun start:http
  # or
  bun start:stdio
  ```

- **Development mode with hot reload**:

  ```sh
  bun dev:http
  # or
  bun dev:stdio
  ```

- **Run checks and tests**:
  ```sh
  bun devcheck # Lints, formats, type-checks, and more
  bun test     # Runs the test suite
  ```

### Cloudflare Workers

1. **Build the Worker bundle**:

```sh
bun build:worker
```

2. **Run locally with Wrangler**:

```sh
bun deploy:dev
```

3. **Deploy to Cloudflare**:

```sh
bun deploy:prod
```

> **Note**: Cloudflare Workers deployment requires proper environment variable configuration in `wrangler.toml` or Cloudflare dashboard.

## 📂 Project Structure

| Directory                   | Purpose & Contents                                                                  |
| :-------------------------- | :---------------------------------------------------------------------------------- |
| `src/mcp-server/tools`      | Obsidian tool definitions (`obsidian-*.tool.ts`). All 19 tools are defined here.    |
| `src/services/obsidian`     | Obsidian REST API client (core interfaces, providers, utils, and generated types).  |
| `src/mcp-server/transports` | Implementations for HTTP and STDIO transports, including auth middleware.           |
| `src/storage`               | `StorageService` abstraction and all storage provider implementations.              |
| `src/container`             | Dependency injection container registrations and tokens.                            |
| `src/utils`                 | Core utilities for logging, error handling, performance, security, and telemetry.   |
| `src/config`                | Environment variable parsing and validation with Zod.                               |
| `tests/`                    | Unit and integration tests, mirroring the `src/` directory structure.               |
| `docs/`                     | Comprehensive documentation including Obsidian integration guides and architecture. |

## 🧪 Testing

This server uses [Vitest](https://vitest.dev/) for testing.

- **Run all tests:**

  ```sh
  bun test
  ```

- **Run tests with coverage:**

  ```sh
  bun test:coverage
  ```

- **Run tests in watch mode:**
  ```sh
  bun test --watch
  ```

Test coverage includes:

- Unit tests for all 19 Obsidian tools
- Integration tests with mocked Obsidian REST API
- Obsidian provider tests with comprehensive error scenarios
- Path normalization and error mapping tests
- Authentication and authorization tests

## 🔧 Troubleshooting

### Connection Refused

- Ensure Obsidian is running
- Verify the Local REST API plugin is enabled
- Check that `OBSIDIAN_BASE_URL` matches the plugin's configured port

### SSL Certificate Errors

- Set `OBSIDIAN_VERIFY_SSL=false` in your environment variables
- Or trust the self-signed certificate in your system's certificate store

### Authentication Errors

- Verify `OBSIDIAN_API_KEY` matches the key shown in plugin settings
- The API key should be copied exactly (no extra spaces)

### Note Not Found

- Paths should be relative to vault root (e.g., `folder/note.md`)
- The `.md` extension is optional but recommended for clarity
- Check vault file list with `obsidian_list_vault_files`

### Periodic Notes Not Working

- Ensure you have the Periodic Notes plugin installed and configured
- Verify your folder paths are set correctly in Periodic Notes settings
- Check that templates are configured if required

### Dataview Search Fails

- Ensure the Dataview plugin is installed and enabled in Obsidian
- Verify your Dataview query syntax is correct
- Test the query directly in Obsidian first

## 🤝 Contributing

Issues and pull requests are welcome! If you plan to contribute, please run the local checks and tests before submitting your PR.

```sh
bun run devcheck
bun test
```

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the existing patterns
4. Run `bun devcheck` to ensure code quality
5. Run `bun test` to verify all tests pass
6. Commit your changes with conventional commits
7. Push to your fork and open a Pull Request

## 📚 Documentation

- **[CHANGELOG.md](CHANGELOG.md)** - Version history and release notes
- **[CLAUDE.md](CLAUDE.md)** - Development guide and architecture rules
- **[docs/obsidian/](docs/obsidian/)** - Obsidian integration documentation
- **[docs/tree.md](docs/tree.md)** - Complete project directory structure
- **[mcp-ts-template docs](https://github.com/cyanheads/mcp-ts-template)** - Framework documentation

## 📜 License

This project is licensed under the Apache 2.0 License. See the [LICENSE](./LICENSE) file for details.

---

<div align="center">
  <p>Built with ❤️ using the <a href="https://github.com/cyanheads/mcp-ts-template">mcp-ts-template</a></p>
  <p>
    <a href="https://github.com/sponsors/cyanheads">Sponsor this project</a> •
    <a href="https://www.buymeacoffee.com/cyanheads">Buy me a coffee</a>
  </p>
</div>
