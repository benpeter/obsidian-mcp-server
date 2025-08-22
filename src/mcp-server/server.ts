/**
 * @fileoverview Main entry point for the MCP server.
 * @module src/mcp-server/server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ServerType } from "@hono/node-server";
import { config, environment } from "../config/index.js";
import { ErrorHandler, logger, requestContextService } from "../utils/index.js";
import { ObsidianRestApiService } from "../services/obsidianRestAPI/index.js";
import { VaultCacheService } from "../services/obsidianRestAPI/vaultCache/index.js";
import { registerObsidianDeleteNoteTool } from "./tools/obsidianDeleteNoteTool/index.js";
import { registerObsidianGlobalSearchTool } from "./tools/obsidianGlobalSearchTool/index.js";
import { registerObsidianListNotesTool } from "./tools/obsidianListNotesTool/index.js";
import { registerObsidianManageFrontmatterTool } from "./tools/obsidianManageFrontmatterTool/index.js";
import { registerObsidianManageTagsTool } from "./tools/obsidianManageTagsTool/index.js";
import { registerObsidianReadNoteTool } from "./tools/obsidianReadNoteTool/index.js";
import { registerObsidianSearchReplaceTool } from "./tools/obsidianSearchReplaceTool/index.js";
import { registerObsidianUpdateNoteTool } from "./tools/obsidianUpdateNoteTool/index.js";
import { startHttpTransport } from "./transports/http/httpTransport.js";
import { startStdioTransport } from "./transports/stdio/stdioTransport.js";

async function createMcpServerInstance(
  obsidianService: ObsidianRestApiService,
  vaultCacheService: VaultCacheService | undefined,
): Promise<McpServer> {
  const context = requestContextService.createRequestContext({
    operation: "createMcpServerInstance",
  });
  logger.info("Initializing MCP server instance", context);

  requestContextService.configure({
    appName: config.mcpServerName,
    appVersion: config.mcpServerVersion,
    environment,
  });

  const server = new McpServer(
    { name: config.mcpServerName, version: config.mcpServerVersion },
    {
      capabilities: {
        logging: {},
        resources: { listChanged: true },
        tools: { listChanged: true },
      },
    },
  );

  try {
    await registerObsidianDeleteNoteTool(server, obsidianService);
    await registerObsidianGlobalSearchTool(server, obsidianService);
    await registerObsidianListNotesTool(server, obsidianService);
    await registerObsidianManageFrontmatterTool(server, obsidianService);
    await registerObsidianManageTagsTool(server, obsidianService);
    await registerObsidianReadNoteTool(server, obsidianService);
    await registerObsidianSearchReplaceTool(server, obsidianService);
    await registerObsidianUpdateNoteTool(server, obsidianService);

    if (vaultCacheService) {
      vaultCacheService.buildVaultCache().catch((err) => {
        logger.error("Error building vault cache", { ...context, error: err });
      });
    }
  } catch (err) {
    logger.error("Failed to register tools", { ...context, error: err });
    throw err;
  }

  return server;
}

async function startTransport(
  obsidianService: ObsidianRestApiService,
  vaultCacheService: VaultCacheService | undefined,
): Promise<McpServer | ServerType | void> {
  const transportType = config.mcpTransportType;
  const context = requestContextService.createRequestContext({
    operation: "startTransport",
    transport: transportType,
  });
  logger.info(`Starting transport: ${transportType}`, context);

  if (transportType === "http") {
    const mcpServerFactory = () =>
      createMcpServerInstance(obsidianService, vaultCacheService);
    const { server } = await startHttpTransport(mcpServerFactory, context);
    return server;
  }

  if (transportType === "stdio") {
    const server = await createMcpServerInstance(
      obsidianService,
      vaultCacheService,
    );
    await startStdioTransport(server, context);
    return server;
  }

  throw new Error(`Unsupported transport type: ${transportType}`);
}

export async function initializeAndStartServer(
  obsidianService: ObsidianRestApiService,
  vaultCacheService: VaultCacheService | undefined,
): Promise<void | McpServer | ServerType> {
  const context = requestContextService.createRequestContext({
    operation: "initializeAndStartServer",
  });
  logger.info("MCP Server initialization sequence started.", context);

  try {
    const result = await startTransport(obsidianService, vaultCacheService);
    logger.info("MCP Server initialization sequence completed.", context);
    return result;
  } catch (err) {
    logger.fatal("Critical error during server initialization.", {
      ...context,
      error: err,
    });
    ErrorHandler.handleError(err, {
      operation: "initializeAndStartServer",
      context,
      critical: true,
    });
    process.exit(1);
  }
}
