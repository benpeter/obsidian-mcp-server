/**
 * @fileoverview Registers the 'obsidian_manage_frontmatter' tool with the MCP server.
 * @module src/mcp-server/tools/obsidianManageFrontmatterTool/registration
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
  obsidianManageFrontmatterLogic,
  ObsidianManageFrontmatterInput,
  ObsidianManageFrontmatterInputSchema,
  ObsidianManageFrontmatterOutputSchema,
  BaseObsidianManageFrontmatterInputSchema,
} from "./logic.js";

const TOOL_NAME = "obsidian_manage_frontmatter";
const TOOL_DESCRIPTION =
  "Atomically manages a note's YAML frontmatter. Supports getting, setting (creating/updating), and deleting specific keys. Ideal for efficient metadata operations.";

/**
 * Registers the 'obsidian_manage_frontmatter' tool with the MCP server.
 * @param server The MCP server instance.
 * @param obsidianService An instance of the ObsidianRestApiService.
 */
export const registerObsidianManageFrontmatterTool = async (
  server: McpServer,
  obsidianService: ObsidianRestApiService,
): Promise<void> => {
  server.registerTool(
    TOOL_NAME,
    {
      title: "Manage Obsidian Frontmatter",
      description: TOOL_DESCRIPTION,
      inputSchema: BaseObsidianManageFrontmatterInputSchema.shape,
      outputSchema: ObsidianManageFrontmatterOutputSchema.shape,
      annotations: {
        readOnlyHint: false,
      },
    },
    async (
      params: ObsidianManageFrontmatterInput,
      callContext: Record<string, unknown>,
    ) => {
      const handlerContext = requestContextService.createRequestContext({
        toolName: TOOL_NAME,
        parentContext: callContext,
      });

      try {
        const validatedParams =
          ObsidianManageFrontmatterInputSchema.parse(params);
        const result = await obsidianManageFrontmatterLogic(
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
