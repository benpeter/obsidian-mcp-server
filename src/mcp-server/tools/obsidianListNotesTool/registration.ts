/**
 * @fileoverview Registers the 'obsidian_list_notes' tool with the MCP server.
 * @module src/mcp-server/tools/obsidianListNotesTool/registration
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
  obsidianListNotesLogic,
  ObsidianListNotesInput,
  ObsidianListNotesInputSchema,
  ObsidianListNotesOutputSchema,
} from "./logic.js";

const TOOL_NAME = "obsidian_list_notes";
const TOOL_DESCRIPTION =
  "Lists Obsidian notes and subdirectories within a specified folder. Supports optional filtering by extension or name regex, and recursive listing to a specified depth (-1 for infinite). Returns a JSON object with the directory path, a formatted tree of its contents, and the total entry count. Use an empty string or '/' for dirPath to list the vault root.";

/**
 * Registers the 'obsidian_list_notes' tool with the MCP server.
 * @param server The MCP server instance.
 * @param obsidianService An instance of the ObsidianRestApiService.
 */
export const registerObsidianListNotesTool = async (
  server: McpServer,
  obsidianService: ObsidianRestApiService,
): Promise<void> => {
  server.registerTool(
    TOOL_NAME,
    {
      title: "List Notes and Directories in Obsidian",
      description: TOOL_DESCRIPTION,
      inputSchema: ObsidianListNotesInputSchema.shape,
      outputSchema: ObsidianListNotesOutputSchema.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (params: ObsidianListNotesInput, callContext) => {
      const handlerContext = requestContextService.createRequestContext({
        toolName: TOOL_NAME,
        parentContext: callContext,
      });

      try {
        const validatedParams = ObsidianListNotesInputSchema.parse(params);
        const result = await obsidianListNotesLogic(
          validatedParams,
          handlerContext,
          obsidianService,
        );

        const outputText = `Listed ${result.totalEntries} entries in '${result.directoryPath}':\n${result.tree}`;

        return {
          structuredContent: result,
          content: [
            {
              type: "text",
              text: outputText,
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
