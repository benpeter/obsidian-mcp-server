/**
 * @fileoverview Registers the 'obsidian_manage_tags' tool with the MCP server.
 * @module src/mcp-server/tools/obsidianManageTagsTool/registration
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
  ObsidianManageTagsInput,
  ObsidianManageTagsInputSchema,
  obsidianManageTagsLogic,
  ObsidianManageTagsOutputSchema,
} from "./logic.js";

const TOOL_NAME = "obsidian_manage_tags";
const TOOL_DESCRIPTION =
  "Manages tags for a specified note by modifying the `tags` key in the note's YAML frontmatter. Supports adding, removing, and listing tags.";

/**
 * Registers the 'obsidian_manage_tags' tool with the MCP server.
 * @param server The MCP server instance.
 * @param obsidianService An instance of the ObsidianRestApiService.
 */
export const registerObsidianManageTagsTool = async (
  server: McpServer,
  obsidianService: ObsidianRestApiService,
): Promise<void> => {
  server.registerTool(
    TOOL_NAME,
    {
      title: "Manage Obsidian Tags",
      description: TOOL_DESCRIPTION,
      inputSchema: ObsidianManageTagsInputSchema.shape,
      outputSchema: ObsidianManageTagsOutputSchema.shape,
      annotations: {
        readOnlyHint: false,
      },
    },
    async (
      params: ObsidianManageTagsInput,
      callContext: Record<string, unknown>,
    ) => {
      const handlerContext = requestContextService.createRequestContext({
        toolName: TOOL_NAME,
        parentContext: callContext,
      });

      try {
        const validatedParams = ObsidianManageTagsInputSchema.parse(params);
        const result = await obsidianManageTagsLogic(
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
