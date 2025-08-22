/**
 * @fileoverview Registers the 'obsidian_search_replace' tool with the MCP server.
 * @module src/mcp-server/tools/obsidianSearchReplaceTool/registration
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ObsidianRestApiService } from "../../../services/obsidianRestAPI/index.js";
import { McpError } from "../../../types-global/errors.js";
import {
  ErrorHandler,
  logger,
  requestContextService,
} from "../../../utils/index.js";
import {
  obsidianSearchReplaceLogic,
  ObsidianSearchReplaceInput,
  BaseObsidianSearchReplaceInputSchema,
  ObsidianSearchReplaceInputSchema,
  ObsidianSearchReplaceOutputSchema,
} from "./logic.js";

const TOOL_NAME = "obsidian_search_replace";
const TOOL_DESCRIPTION =
  "Performs one or more search-and-replace operations within a target Obsidian note. Supports targeting by file path, active note, or periodic note. Allows for string or regex matching, case sensitivity, and more. Writes changes back to the vault.";

/**
 * Registers the 'obsidian_search_replace' tool with the MCP server.
 * @param server The MCP server instance.
 * @param obsidianService An instance of the ObsidianRestApiService.
 */
export const registerObsidianSearchReplaceTool = async (
  server: McpServer,
  obsidianService: ObsidianRestApiService,
): Promise<void> => {
  server.registerTool(
    TOOL_NAME,
    {
      title: "Search and Replace in Obsidian Note",
      description: TOOL_DESCRIPTION,
      inputSchema: BaseObsidianSearchReplaceInputSchema.shape,
      outputSchema: ObsidianSearchReplaceOutputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false, // It's not deleting, but it is modifying
      },
    },
    async (
      params: ObsidianSearchReplaceInput,
      callContext: Record<string, unknown>,
    ) => {
      const handlerContext = requestContextService.createRequestContext({
        toolName: TOOL_NAME,
        parentContext: callContext,
      });

      try {
        const validatedParams = ObsidianSearchReplaceInputSchema.parse(params);
        const result = await obsidianSearchReplaceLogic(
          validatedParams,
          handlerContext,
          obsidianService,
        );

        return {
          structuredContent: result,
          content: [
            {
              type: "text",
              text: result.message,
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
