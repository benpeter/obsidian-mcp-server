/**
 * @fileoverview Registers the 'obsidian_update_note' tool with the MCP server.
 * @module src/mcp-server/tools/obsidianUpdateNoteTool/registration
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
  obsidianUpdateNoteLogic,
  ObsidianUpdateNoteInput,
  BaseObsidianUpdateNoteInputSchema,
  ObsidianUpdateNoteInputSchema,
  ObsidianUpdateNoteOutputSchema,
} from "./logic.js";

const TOOL_NAME = "obsidian_update_note";
const TOOL_DESCRIPTION =
  "Modifies Obsidian notes using whole-file operations: 'append', 'prepend', or 'overwrite'. Supports targeting by file path, active note, or periodic note. Options control creation and overwrite behavior.";

/**
 * Registers the 'obsidian_update_note' tool with the MCP server.
 * @param server The MCP server instance.
 * @param obsidianService An instance of the ObsidianRestApiService.
 */
export const registerObsidianUpdateNoteTool = async (
  server: McpServer,
  obsidianService: ObsidianRestApiService,
): Promise<void> => {
  server.registerTool(
    TOOL_NAME,
    {
      title: "Update Obsidian Note",
      description: TOOL_DESCRIPTION,
      inputSchema: BaseObsidianUpdateNoteInputSchema.shape,
      outputSchema: ObsidianUpdateNoteOutputSchema.shape,
      annotations: {
        readOnlyHint: false,
      },
    },
    async (
      params: ObsidianUpdateNoteInput,
      callContext: Record<string, unknown>,
    ) => {
      const handlerContext = requestContextService.createRequestContext({
        toolName: TOOL_NAME,
        parentContext: callContext,
      });

      try {
        const validatedParams = ObsidianUpdateNoteInputSchema.parse(params);
        const result = await obsidianUpdateNoteLogic(
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
