/**
 * @fileoverview Handles registration and error handling for the obsidian_read_note tool.
 * @module src/mcp-server/tools/obsidianReadNoteTool/registration
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
  ObsidianReadNoteInput,
  ObsidianReadNoteInputSchema,
  obsidianReadNoteLogic,
  ObsidianReadNoteOutputSchema,
} from "./logic.js";

const TOOL_NAME = "obsidian_read_note";
const TOOL_DESCRIPTION =
  "Retrieves the content and metadata for a specific Obsidian note. Use this tool to read the contents of Obsidian notes. It tries an exact path match before falling back to a case-insensitive search. The `format` parameter controls the output ('markdown' or 'json'). Set `includeStat` to true to add file stats to the 'markdown' response; stats are always included with 'json'.";

/**
 * Registers the 'obsidian_read_note' tool with the MCP server.
 * @param server The MCP server instance.
 * @param obsidianService An instance of the ObsidianRestApiService.
 */
export const registerObsidianReadNoteTool = async (
  server: McpServer,
  obsidianService: ObsidianRestApiService,
): Promise<void> => {
  server.registerTool(
    TOOL_NAME,
    {
      title: "Read Obsidian Note",
      description: TOOL_DESCRIPTION,
      inputSchema: ObsidianReadNoteInputSchema.shape,
      outputSchema: ObsidianReadNoteOutputSchema.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (params: ObsidianReadNoteInput, callContext) => {
      const handlerContext = requestContextService.createRequestContext({
        toolName: TOOL_NAME,
        parentContext: callContext,
      });

      try {
        const validatedParams = ObsidianReadNoteInputSchema.parse(params);
        const result = await obsidianReadNoteLogic(
          validatedParams,
          handlerContext,
          obsidianService,
        );

        let textOutput: string;
        if (typeof result.content === "string") {
          textOutput = result.content;
          if (result.stats) {
            textOutput += `\n\n---
**Created:** ${result.stats.createdTime}
**Modified:** ${result.stats.modifiedTime}
**Tokens:** ~${result.stats.tokenCountEstimate}`;
          }
        } else {
          textOutput = `Successfully read note: ${result.content.path}`;
        }

        return {
          structuredContent: result,
          content: [
            {
              type: "text",
              text: textOutput,
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
