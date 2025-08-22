/**
 * @fileoverview Registers the 'obsidian_global_search' tool with the MCP server.
 * @module src/mcp-server/tools/obsidianGlobalSearchTool/registration
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ObsidianRestApiService,
  VaultCacheService,
} from "../../../services/obsidianRestAPI/index.js";
import { McpError } from "../../../types-global/errors.js";
import {
  ErrorHandler,
  logger,
  requestContextService,
} from "../../../utils/index.js";
import {
  obsidianGlobalSearchLogic,
  ObsidianGlobalSearchInput,
  ObsidianGlobalSearchInputSchema,
  ObsidianGlobalSearchOutputSchema,
} from "./logic.js";

const TOOL_NAME = "obsidian_global_search";
const TOOL_DESCRIPTION =
  "Performs a search across the Obsidian vault. Supports text or regex queries, filtering by modification date and path, and pagination. Returns a comprehensive JSON object with results and search metadata.";

/**
 * Registers the 'obsidian_global_search' tool with the MCP server.
 * @param server The MCP server instance.
 * @param obsidianService An instance of the ObsidianRestApiService.
 * @param vaultCacheService An optional instance of the VaultCacheService for fallback searches.
 */
export const registerObsidianGlobalSearchTool = async (
  server: McpServer,
  obsidianService: ObsidianRestApiService,
  vaultCacheService?: VaultCacheService,
): Promise<void> => {
  server.registerTool(
    TOOL_NAME,
    {
      title: "Search Obsidian Vault",
      description: TOOL_DESCRIPTION,
      inputSchema: ObsidianGlobalSearchInputSchema.shape,
      outputSchema: ObsidianGlobalSearchOutputSchema.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (params: ObsidianGlobalSearchInput, callContext) => {
      const handlerContext = requestContextService.createRequestContext({
        toolName: TOOL_NAME,
        parentContext: callContext,
      });

      try {
        const validatedParams = ObsidianGlobalSearchInputSchema.parse(params);
        const result = await obsidianGlobalSearchLogic(
          validatedParams,
          handlerContext,
          obsidianService,
          vaultCacheService,
        );

        return {
          structuredContent: result,
          content: [
            {
              type: "text",
              text: `Search successful: ${result.message}`,
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in ${TOOL_NAME} handler`, {
          error,
          ...handlerContext,
        });
        const mcpError = ErrorHandler.handleError(error, {
          operation: `tool:${TOOL_NAME}`,
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
  logger.info(`Tool '${TOOL_NAME}' registered successfully.`);
};
