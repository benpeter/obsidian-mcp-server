<div align="center">
  <h1>Obsidian MCP Server</h1>
  <p><b>Production-grade MCP server that enables AI agents to interact with Obsidian vaults through the Obsidian Local REST API. Features comprehensive note operations, search capabilities, periodic notes, and command execution.</b>
  <div>19 Tools • 0 Resources • 0 Prompts</div>
  </p>
</div>

<div align="center">

[![Version](https://img.shields.io/badge/Version-2.1.0-blue.svg?style=flat-square)](./CHANGELOG.md) [![MCP Spec](https://img.shields.io/badge/MCP%20Spec-2025--06--18-8A2BE2.svg?style=flat-square)](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-06-18/changelog.mdx) [![MCP SDK](https://img.shields.io/badge/MCP%20SDK-^1.20.1-green.svg?style=flat-square)](https://modelcontextprotocol.io/) [![License](https://img.shields.io/badge/License-Apache%202.0-orange.svg?style=flat-square)](./LICENSE) [![Status](https://img.shields.io/badge/Status-Production-green.svg?style=flat-square)](https://github.com/cyanheads/obsidian-mcp-server/issues) [![TypeScript](https://img.shields.io/badge/TypeScript-^5.9.3-3178C6.svg?style=flat-square)](https://www.typescriptlang.org/) [![Bun](https://img.shields.io/badge/Bun-v1.2.23-blueviolet.svg?style=flat-square)](https://bun.sh/) [![Built with mcp-ts-template](https://img.shields.io/badge/Built%20with-mcp--ts--template-blue.svg?style=flat-square)](https://github.com/cyanheads/mcp-ts-template)

</div>

---

## ✨ Features

- **🗒️ Comprehensive Note Operations**: Full CRUD operations on notes with support for frontmatter, tags, and content manipulation
- **📝 Granular Content Updates**: Append, patch, or completely replace note content with surgical precision
- **🔍 Advanced Search**: Multiple search modes including simple text search, Dataview queries, and JSONLogic queries
- **📅 Periodic Notes Support**: First-class support for daily, weekly, monthly, quarterly, and yearly notes
- **⚡ Command Execution**: List and execute any Obsidian command programmatically
- **🎯 Active Note Context**: Special operations for the currently active note in Obsidian
- **📁 Vault Management**: List files and directories across your entire vault
- **🔒 Type-Safe API**: Full TypeScript support with generated types from OpenAPI spec
- **⚙️ Production Ready**: Built on [mcp-ts-template](https://github.com/cyanheads/mcp-ts-template) with observability, error handling, and testing built-in

## 📋 Prerequisites

Before using this MCP server, you need:

1. **Obsidian** (latest version recommended)
2. **[Obsidian Local REST API Plugin](https://github.com/coddingtonbear/obsidian-local-rest-api)** installed and configured
3. **Bun** v1.2.21 or higher (for development)

### Setting up Obsidian Local REST API

1. Install the "Local REST API" plugin from Obsidian's Community Plugins
2. Enable the plugin in Settings → Community Plugins
3. Go to Settings → Local REST API
4. Note the **API Key** (you'll need this for `OBSIDIAN_API_KEY`)
5. Verify the server is running (default: `https://127.0.0.1:27124`)

## 🚀 Quick Start

### Installation via NPM

The easiest way to use this server is via `npx`:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "npx",
      "args": ["-y", "obsidian-mcp-server"],
      "env": {
        "OBSIDIAN_BASE_URL": "https://127.0.0.1:27124",
        "OBSIDIAN_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Installation via Bunx

If you have Bun installed:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "bunx",
      "args": ["obsidian-mcp-server"],
      "env": {
        "OBSIDIAN_BASE_URL": "https://127.0.0.1:27124",
        "OBSIDIAN_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Installation from Source

1. Clone the repository:
   ```sh
   git clone https://github.com/cyanheads/obsidian-mcp-server.git
   cd obsidian-mcp-server
   ```

2. Install dependencies:
   ```sh
   bun install
   ```

3. Build the server:
   ```sh
   bun run build
   ```

4. Add to your MCP client configuration:
   ```json
   {
     "mcpServers": {
       "obsidian": {
         "command": "bun",
         "args": ["run", "start:stdio"],
         "cwd": "/path/to/obsidian-mcp-server",
         "env": {
           "OBSIDIAN_BASE_URL": "https://127.0.0.1:27124",
           "OBSIDIAN_API_KEY": "your-api-key-here"
         }
       }
     }
   }
   ```

## ⚙️ Configuration

### Required Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `OBSIDIAN_BASE_URL` | Base URL for Obsidian Local REST API | `https://127.0.0.1:27124` | No |
| `OBSIDIAN_API_KEY` | API key from Obsidian Local REST API plugin settings | - | Yes |
| `OBSIDIAN_VERIFY_SSL` | Enable SSL certificate verification | `false` | No |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_LOG_LEVEL` | Logging level (`debug`, `info`, `warn`, `error`) | `info` |
| `MCP_TRANSPORT_TYPE` | Transport type (`stdio` or `http`) | `stdio` |

### SSL Certificate Notes

The Obsidian Local REST API uses a self-signed certificate by default. If you encounter SSL errors:

1. Set `OBSIDIAN_VERIFY_SSL=false` (recommended for local use)
2. Or, trust the self-signed certificate in your system

## 🛠️ Available Tools

All 19 tools follow a consistent, predictable naming pattern: `obsidian_{action}_{target}`

### Note Reading (3 tools)

| Tool | Description |
|------|-------------|
| `obsidian_get_note` | Get content of a specific note by path |
| `obsidian_get_active_note` | Get content of the currently active note |
| `obsidian_get_periodic_note` | Get a periodic note (daily, weekly, monthly, etc.) |

### Note Creation & Modification (8 tools)

| Tool | Description |
|------|-------------|
| `obsidian_create_note` | Create a new note with optional content and frontmatter |
| `obsidian_append_note` | Append content to the end of a specific note |
| `obsidian_append_active_note` | Append content to the currently active note |
| `obsidian_append_periodic_note` | Append content to a periodic note |
| `obsidian_patch_note` | Surgically update parts of a note (frontmatter, tags, headings) |
| `obsidian_patch_active_note` | Patch the currently active note |
| `obsidian_patch_periodic_note` | Patch a periodic note |
| `obsidian_update_active_note` | Replace entire content of the active note |

### Vault Operations (3 tools)

| Tool | Description |
|------|-------------|
| `obsidian_list_vault_files` | List all files and directories in the vault |
| `obsidian_open_note` | Open a specific note in Obsidian |
| `obsidian_delete_note` | Delete a note from the vault |

### Search (3 tools)

| Tool | Description |
|------|-------------|
| `obsidian_search_simple` | Simple text search across all notes |
| `obsidian_search_dataview` | Advanced search using Dataview Query Language (requires Dataview plugin) |
| `obsidian_search_jsonlogic` | Complex search using JSONLogic queries |

### Commands (2 tools)

| Tool | Description |
|------|-------------|
| `obsidian_list_commands` | List all available Obsidian commands |
| `obsidian_execute_command` | Execute any Obsidian command by ID |

## 📖 Usage Examples

### Creating a Daily Note

```typescript
// Using obsidian_get_periodic_note
{
  "granularity": "daily",
  "offset": 0  // Today
}
```

### Searching with Dataview

```typescript
// Using obsidian_search_dataview
{
  "query": "TABLE file.mtime as Modified FROM \"Projects\" WHERE status = \"active\""
}
```

### Patching Frontmatter

```typescript
// Using obsidian_patch_note
{
  "path": "Projects/MyProject.md",
  "operation": "insert",
  "targetType": "frontmatter",
  "content": "status: completed\ndate: 2025-10-23"
}
```

### Appending to Active Note

```typescript
// Using obsidian_append_active_note
{
  "content": "\n## New Section\n\nSome new content here."
}
```

## 🏗️ Architecture

Built on the [mcp-ts-template](https://github.com/cyanheads/mcp-ts-template) framework, this server follows a clean, modular architecture:

```
obsidian-mcp-server/
├── src/
│   ├── mcp-server/
│   │   └── tools/definitions/     # 19 Obsidian tool definitions
│   ├── services/obsidian/         # Obsidian REST API client
│   │   ├── core/                  # Client and provider interfaces
│   │   ├── providers/             # REST API implementation
│   │   ├── utils/                 # Error mapping, path normalization
│   │   └── types/                 # OpenAPI-generated types
│   ├── config/                    # Configuration and env validation
│   └── utils/                     # Logging, error handling, parsing
└── tests/                         # Comprehensive test suite
```

## 🧪 Development

### Running Tests

```sh
bun test
```

### Running Checks

```sh
bun run devcheck  # Lints, formats, type-checks, and audits
```

### Local Development Mode

```sh
# STDIO mode (for MCP clients)
bun run dev:stdio

# HTTP mode (for testing with curl/Postman)
bun run dev:http
```

## 📚 Documentation

- **[CHANGELOG.md](CHANGELOG.md)** - Version history and release notes
- **[CLAUDE.md](CLAUDE.md)** - Development guide and architecture rules
- **[docs/obsidian/](docs/obsidian/)** - Obsidian integration documentation
- **[mcp-ts-template docs](https://github.com/cyanheads/mcp-ts-template)** - Framework documentation

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

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `bun run devcheck` to ensure quality
5. Submit a pull request

## 📜 License

This project is licensed under the Apache 2.0 License. See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Built with [mcp-ts-template](https://github.com/cyanheads/mcp-ts-template)
- Integrates with [Obsidian Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api)
- Powered by the [Model Context Protocol](https://modelcontextprotocol.io/)

---

<div align="center">
  <p>
    <a href="https://github.com/sponsors/cyanheads">Sponsor this project</a> •
    <a href="https://www.buymeacoffee.com/cyanheads">Buy me a coffee</a>
  </p>
  <p>
    <sub>Made with ❤️ for the Obsidian and MCP communities</sub>
  </p>
</div>
