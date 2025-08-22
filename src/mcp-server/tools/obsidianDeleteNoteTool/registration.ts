/**
 * @fileoverview Registers the 'obsidian_delete_note' tool with the MCP server.
 * @module src/mcp-server/tools/obsidianDeleteNoteTool/registration
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
  obsidianDeleteNoteLogic,
  ObsidianDeleteNoteInput,
  ObsidianDeleteNoteInputSchema,
  ObsidianDeleteNoteOutputSchema,
} from "./logic.js";

const TOOL_NAME = "obsidian_delete_note";
const TOOL_DESCRIPTION =
  "Permanently deletes a specified Obsidian note. Tries the exact path first, then attempts a case-insensitive fallback if the note is not found. Requires the vault-relative path including the file extension. Returns a success message.";

/**
 * Registers the 'obsidian_delete_note' tool with the MCP server.
 * @param server The MCP server instance.
 * @param obsidianService An instance of the ObsidianRestApiService.
 */
export const registerObsidianDeleteNoteTool = async (
  server: McpServer,
  obsidianService: ObsidianRestApiService,
): Promise<void> => {
  server.registerTool(
    TOOL_NAME,
    {
      title: "Delete Obsidian Note",
      description: TOOL_DESCRIPTION,
      inputSchema: ObsidianDeleteNoteInputSchema.shape,
      outputSchema: ObsidianDeleteNoteOutputSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
      },
    },
    async (params: ObsidianDeleteNoteInput, callContext) => {
      const handlerContext = requestContextService.createRequestContext({
        toolName: TOOL_NAME,
        parentContext: callContext,
      });

      try {
        // Explicitly validate the input using the Zod schema.
        const validatedParams = ObsidianDeleteNoteInputSchema.parse(params);

        const result = await obsidianDeleteNoteLogic(
          validatedParams,
          handlerContext,
          obsidianService,
        );

        logger.info("Tool execution successful", { ...handlerContext, result });

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
