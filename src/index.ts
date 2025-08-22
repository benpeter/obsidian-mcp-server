#!/usr/bin/env node

import "./utils/internal/fetch.js"; // Apply global fetch dispatcher
import { ServerType } from "@hono/node-server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { config, environment } from "./config/index.js";
import { initializeAndStartServer } from "./mcp-server/server.js";
import { requestContextService, retryWithDelay } from "./utils/index.js";
import { logger, McpLogLevel } from "./utils/internal/logger.js";
import { ObsidianRestApiService } from "./services/obsidianRestAPI/index.js";
import { VaultCacheService } from "./services/obsidianRestAPI/vaultCache/index.js";

let server: McpServer | undefined;
let httpServerInstance: ServerType | undefined;
let obsidianService: ObsidianRestApiService | undefined;
let vaultCacheService: VaultCacheService | undefined;

const shutdown = async (signal: string) => {
  const shutdownContext = requestContextService.createRequestContext({
    operation: "Shutdown",
    signal,
  });

  logger.info(
    `Received ${signal}. Starting graceful shutdown...`,
    shutdownContext,
  );

  try {
    if (config.obsidianEnableCache && vaultCacheService) {
      vaultCacheService.stopPeriodicRefresh();
    }

    if (server) {
      await server.close();
      logger.info(
        "Main MCP server (stdio) closed successfully",
        shutdownContext,
      );
    }

    if (httpServerInstance) {
      await new Promise<void>((resolve, reject) => {
        httpServerInstance!.close((err?: Error) => {
          if (err) {
            logger.error("Error closing HTTP server", err, shutdownContext);
            reject(err);
            return;
          }
          resolve();
        });
      });
      logger.info("Main HTTP server closed successfully", shutdownContext);
    }

    logger.info("Graceful shutdown completed successfully", shutdownContext);
    process.exit(0);
  } catch (error) {
    logger.error(
      "Critical error during shutdown",
      error as Error,
      shutdownContext,
    );
    process.exit(1);
  }
};

const start = async () => {
  const validMcpLogLevels: McpLogLevel[] = [
    "debug",
    "info",
    "notice",
    "warning",
    "error",
    "crit",
    "alert",
    "emerg",
  ];
  const initialLogLevelConfig = config.logLevel;
  let validatedMcpLogLevel: McpLogLevel = "info";
  if (validMcpLogLevels.includes(initialLogLevelConfig as McpLogLevel)) {
    validatedMcpLogLevel = initialLogLevelConfig as McpLogLevel;
  } else {
    console.warn(
      `Invalid MCP_LOG_LEVEL "${initialLogLevelConfig}". Defaulting to "info".`,
    );
  }
  await logger.initialize(validatedMcpLogLevel);

  const transportType = config.mcpTransportType;
  const startupContext = requestContextService.createRequestContext({
    operation: `ServerStartup_${transportType}`,
    appName: config.mcpServerName,
    appVersion: config.mcpServerVersion,
    environment: environment,
  });

  logger.info(
    `Starting ${config.mcpServerName} v${config.mcpServerVersion} (Transport: ${transportType})...`,
    startupContext,
  );

  try {
    obsidianService = new ObsidianRestApiService();

    if (config.obsidianEnableCache) {
      vaultCacheService = new VaultCacheService(obsidianService);
      obsidianService.setVaultCacheService(vaultCacheService);
      logger.info("Vault cache is enabled.", startupContext);
    }

    try {
      logger.info(
        "Performing initial Obsidian API status check...",
        startupContext,
      );
      const status = await retryWithDelay(
        async () => {
          const currentStatus =
            await obsidianService!.checkStatus(startupContext);
          if (
            currentStatus?.service !== "Obsidian Local REST API" ||
            !currentStatus?.authenticated
          ) {
            throw new Error(
              `Obsidian API status check failed. Status: ${JSON.stringify(currentStatus)}`,
            );
          }
          return currentStatus;
        },
        {
          operationName: "initialObsidianApiCheck",
          context: startupContext,
          maxRetries: 5,
          delayMs: 3000,
        },
      );
      logger.info("Obsidian API status check successful.", {
        ...startupContext,
        versions: status.versions,
      });
    } catch (statusError) {
      logger.error("Critical error during Obsidian API status check.", {
        ...startupContext,
        error: (statusError as Error).message,
      });
      throw statusError;
    }

    const serverOrHttpInstance = await initializeAndStartServer(
      obsidianService,
      vaultCacheService,
    );

    if (
      transportType === "stdio" &&
      serverOrHttpInstance instanceof McpServer
    ) {
      server = serverOrHttpInstance;
    } else if (transportType === "http") {
      httpServerInstance = serverOrHttpInstance as ServerType;
    }

    logger.info(`${config.mcpServerName} is running.`, startupContext);

    if (config.obsidianEnableCache && vaultCacheService) {
      logger.info("Triggering background vault cache build...", startupContext);
      vaultCacheService
        .buildVaultCache()
        .then(() => vaultCacheService?.startPeriodicRefresh())
        .catch((cacheBuildError) =>
          logger.error("Error during background cache build", {
            ...startupContext,
            error: (cacheBuildError as Error).message,
          }),
        );
    }

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught exception.", {
        ...startupContext,
        error: error.message,
        stack: error.stack,
      });
      shutdown("uncaughtException");
    });
    process.on("unhandledRejection", (reason) => {
      logger.error("Unhandled promise rejection.", {
        ...startupContext,
        reason: reason as string,
      });
      shutdown("unhandledRejection");
    });
  } catch (error) {
    logger.error("Critical error during startup, exiting.", {
      ...startupContext,
      error: (error as Error).message,
    });
    process.exit(1);
  }
};

start();
