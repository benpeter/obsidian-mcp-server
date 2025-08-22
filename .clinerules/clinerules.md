# Obsidian MCP Server: Architectural Standard & Developer Mandate

**Effective Date:** 2025-08-21
**Version:** 1.0

## Preamble

This document constitutes the official mandate governing all development practices, architectural patterns, and operational procedures for the `obsidian-mcp-server`. It is adapted from the mature standards of the `git-mcp-server` to ensure consistency and quality. Adherence to these standards is not optional.

## I. Core Architectural Principles

### 1. The Logic Throws, The Handler Catches

This is the immutable cornerstone of our error-handling and control-flow strategy.

- **Core Logic (`logic.ts`):** This layer's sole responsibility is the execution of pure business logic (e.g., calling the Obsidian REST API service). It must be self-contained. If an operational or validation error occurs, it **must** terminate its execution by **throwing a structured `McpError`**. Logic files shall **not** contain `try...catch` blocks for formatting a final response.
- **Handlers (`registration.ts`):** This layer's responsibility is to interface with the MCP server, invoke core logic, and manage the final response lifecycle. It **must** wrap every call to the logic layer in a `try...catch` block. This is the **exclusive** location where errors are caught, processed by the `ErrorHandler`, and formatted into a definitive `CallToolResult`.

### 2. Structured, Traceable Operations

Every operation must be fully traceable via structured logging and context propagation.

- **RequestContext:** Any significant operation shall be initiated by creating a `RequestContext`. This context, containing a unique `requestId`, **must** be passed as an argument through the entire call stack.
- **Logger:** All logging shall be performed through the centralized `logger` singleton. Every log entry **must** include the `RequestContext`.

## II. Tool Development Workflow

This section mandates the workflow for creating and modifying all Obsidian tools.

### A. File and Directory Structure

Each tool shall reside in a dedicated directory within `src/mcp-server/tools/`. The structure is fixed:

- **`toolName/`**
  - `index.ts`: Barrel file exporting only the `register...` function.
  - `logic.ts`: Contains the tool's core logic, Zod schemas (input and output), and all inferred TypeScript types.
  - `registration.ts`: Registers the tool, implementing the "Handler" role.

### B. The Canonical Pattern for Obsidian Tools

The following pattern is the authoritative implementation for all tool development.

**Step 1: Define Schema and Logic (`logic.ts`)**

```typescript
/**
 * @fileoverview Defines the core logic, schemas, and types for an Obsidian tool.
 * @module src/mcp-server/tools/obsidianNoteTool/logic
 */
import { z } from "zod";
import { logger, type RequestContext } from "../../../utils/index.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { ObsidianService } from "../../../services/obsidianRestAPI/service.js";

// 1. DEFINE the Zod input schema.
// CRITICAL: Descriptions are sent to the LLM. They must be clear, concise,
// and contain all necessary context for the model to use the tool effectively.
export const ObsidianNoteInputSchema = z.object({
  filePath: z.string().describe("The vault-relative path to the note."),
  // ... other parameters
});

// 2. DEFINE the Zod response schema for structured output.
export const ObsidianNoteOutputSchema = z.object({
  success: z.boolean().describe("Indicates if the operation was successful."),
  content: z
    .string()
    .optional()
    .describe("The content of the note, if applicable."),
});

// 3. INFER and export TypeScript types.
export type ObsidianNoteInput = z.infer<typeof ObsidianNoteInputSchema>;
export type ObsidianNoteOutput = z.infer<typeof ObsidianNoteOutputSchema>;

/**
 * 4. IMPLEMENT the core logic function.
 * It must remain pure; its only concerns are its inputs and its return value or thrown error.
 * @param params The validated input parameters.
 * @param context The request context for logging and tracing.
 * @param obsidianService An instance of the ObsidianService.
 * @returns A promise resolving with the structured response data.
 * @throws {McpError} If the logic encounters an unrecoverable issue.
 */
export async function obsidianNoteLogic(
  params: ObsidianNoteInput,
  context: RequestContext,
  obsidianService: ObsidianService,
): Promise<ObsidianNoteOutput> {
  logger.debug("Executing obsidianNoteLogic...", { ...context });

  // Example of a logic failure.
  if (!params.filePath.endsWith(".md")) {
    // CRITICAL: Logic layer MUST throw a structured error on failure.
    throw new McpError(
      BaseErrorCode.VALIDATION_ERROR,
      "File path must end with .md",
    );
  }

  // Execute operation via the Obsidian service...
  const noteContent = await obsidianService.readNote(params.filePath);

  // On success, RETURN a structured output object.
  return { success: true, content: noteContent };
}
```

**Step 2: Register the Tool and Handle Outcomes (`registration.ts`)**

```typescript
/**
 * @fileoverview Handles registration and error handling for the Obsidian tool.
 * @module src/mcp-server/tools/obsidianNoteTool/registration
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ErrorHandler,
  logger,
  requestContextService,
} from "../../../utils/index.js";
import {
  ObsidianNoteInput,
  ObsidianNoteInputSchema,
  obsidianNoteLogic,
  ObsidianNoteOutputSchema,
} from "./logic.js";
import { McpError } from "../../../types-global/errors.js";
import { ObsidianService } from "../../../services/obsidianRestAPI/service.js";

/**
 * Registers the tool with the MCP server instance.
 * @param server The MCP server instance.
 * @param obsidianService An instance of the ObsidianService.
 */
export const registerObsidianNoteTool = async (
  server: McpServer,
  obsidianService: ObsidianService,
): Promise<void> => {
  const toolName = "obsidian_note_tool";

  server.registerTool(
    toolName,
    {
      title: "Obsidian Note Tool",
      description: "A clear, concise description for the LLM.",
      inputSchema: ObsidianNoteInputSchema.shape,
      outputSchema: ObsidianNoteOutputSchema.shape, // MANDATORY
      annotations: { readOnlyHint: true },
    },
    async (params: ObsidianNoteInput, callContext) => {
      const handlerContext = requestContextService.createRequestContext({
        toolName,
        parentContext: callContext,
      });

      try {
        const result = await obsidianNoteLogic(
          params,
          handlerContext,
          obsidianService,
        );

        return {
          structuredContent: result,
          content: [
            { type: "text", text: `Success: ${JSON.stringify(result)}` },
          ],
        };
      } catch (error) {
        logger.error(`Error in ${toolName} handler`, {
          error,
          ...handlerContext,
        });
        const mcpError = ErrorHandler.handleError(error, {
          operation: toolName,
          context: handlerContext,
          input: params,
        }) as McpError;

        return {
          isError: true,
          content: [{ type: "text", text: mcpError.message }],
          structuredContent: {
            code: mcpError.code,
            message: mcpError.message,
            details: mcpError.details,
          },
        };
      }
    },
  );
  logger.info(`Tool '${toolName}' registered successfully.`);
};
```

## III. Code Quality and Documentation Mandates

- **JSDoc:** Every file shall begin with a `@fileoverview` and `@module` block. All exported functions, types, and classes shall have complete JSDoc comments.
- **LLM-Facing Descriptions:** The tool's `title`, `description`, and all parameter descriptions in Zod schemas (`.describe()`) are transmitted directly to the LLM. They must be written with the LLM as the primary audience, being descriptive, concise, and explicit about requirements.
- **Clarity and Intent:** Code shall be self-documenting. Variable and function names must be explicit and unambiguous.
- **Formatting:** All code must be formatted using Prettier (`npm run format`) before being committed.
- **Linting:** All code must pass ESLint checks (`npm run lint`) before being committed.

## IV. Security Mandates

- **Input Sanitization:** All input shall be treated as untrusted and validated with Zod. File paths and other sensitive inputs should be sanitized where appropriate.
- **Secrets Management:** All secrets (API keys, credentials) shall be loaded exclusively from environment variables via the `config` module. The Obsidian API key is paramount.

## V. Server Configuration & Operation (Cheatsheet)

### Environment Variables

- **`MCP_TRANSPORT_TYPE`**: `"stdio"` (default) or `"http"`.
- **`MCP_HTTP_PORT`**: Default `3016`.
- **`MCP_HTTP_HOST`**: Default `127.0.0.1`.
- **`MCP_ALLOWED_ORIGINS`**: Comma-separated list for CORS.
- **`MCP_LOG_LEVEL`**: `debug`, `info`, `warning`, `error`, etc. Default `info`.
- **`OBSIDIAN_API_KEY`**: **Required.** The API key for the Obsidian REST API plugin.
- **`OBSIDIAN_API_URL`**: The base URL for the Obsidian REST API. Default `http://127.0.0.1:27123`.

### Running the Server

- **Production (Stdio)**: `npm run start:stdio`
- **Production (HTTP)**: `npm run start:http`
- **Development (Stdio)**: `npm run dev:stdio`
- **Development (HTTP)**: `npm run dev:http`

### Core Utilities

- **Logging**: `src/utils/internal/logger.ts`
- **Error Handling**: `src/types-global/errors.ts`, `src/utils/internal/errorHandler.ts`
- **Request Context**: `src/utils/internal/requestContext.ts`
