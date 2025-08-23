/**
 * @fileoverview Loads, validates, and exports application configuration.
 * @module src/config/index
 */

import dotenv from "dotenv";
import { existsSync, mkdirSync, readFileSync, statSync } from "fs";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

dotenv.config();

// --- Determine Project Root ---
const findProjectRoot = (startDir: string): string => {
  let currentDir = startDir;
  while (true) {
    const packageJsonPath = join(currentDir, "package.json");
    if (existsSync(packageJsonPath)) {
      return currentDir;
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error(
        `Could not find project root (package.json) starting from ${startDir}`,
      );
    }
    currentDir = parentDir;
  }
};

let projectRoot: string;
try {
  const currentModuleDir = dirname(fileURLToPath(import.meta.url));
  projectRoot = findProjectRoot(currentModuleDir);
} catch (error: any) {
  console.error(`FATAL: Error determining project root: ${error.message}`);
  projectRoot = process.cwd();
  console.warn(
    `Warning: Using process.cwd() (${projectRoot}) as fallback project root.`,
  );
}
// --- End Determine Project Root ---

const pkgPath = join(projectRoot, "package.json");
let pkg = { name: "obsidian-mcp-server", version: "0.0.0" };

try {
  pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
} catch (error) {
  if (process.stderr.isTTY) {
    console.error(
      "Warning: Could not read package.json for default config values.",
      error,
    );
  }
}

const EnvSchema = z.object({
  MCP_SERVER_NAME: z.string().optional(),
  MCP_SERVER_VERSION: z.string().optional(),
  MCP_LOG_LEVEL: z.string().default("info"),
  LOGS_DIR: z.string().default(path.join(projectRoot, "logs")),
  NODE_ENV: z.string().default("development"),
  MCP_TRANSPORT_TYPE: z.enum(["stdio", "http"]).default("stdio"),
  MCP_SESSION_MODE: z.enum(["stateless", "stateful", "auto"]).default("auto"),
  MCP_HTTP_PORT: z.coerce.number().int().positive().default(3016),
  MCP_HTTP_HOST: z.string().default("127.0.0.1"),
  MCP_HTTP_ENDPOINT_PATH: z.string().default("/mcp"),
  MCP_HTTP_MAX_PORT_RETRIES: z.coerce.number().int().nonnegative().default(15),
  MCP_HTTP_PORT_RETRY_DELAY_MS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(50),
  MCP_STATEFUL_SESSION_STALE_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(1_800_000),
  MCP_ALLOWED_ORIGINS: z.string().optional(),
  MCP_AUTH_SECRET_KEY: z
    .string()
    .min(32, "MCP_AUTH_SECRET_KEY must be at least 32 characters long.")
    .optional(),
  MCP_AUTH_MODE: z.enum(["jwt", "oauth", "none"]).default("none"),
  OAUTH_ISSUER_URL: z.string().url().optional(),
  OAUTH_JWKS_URI: z.string().url().optional(),
  OAUTH_AUDIENCE: z.string().optional(),
  DEV_MCP_CLIENT_ID: z.string().optional(),
  DEV_MCP_SCOPES: z.string().optional(),
  OBSIDIAN_API_KEY: z.string().min(1, "OBSIDIAN_API_KEY cannot be empty"),
  OBSIDIAN_BASE_URL: z.string().url().default("http://127.0.0.1:27123"),
  OBSIDIAN_VERIFY_SSL: z
    .string()
    .transform((val) => val.toLowerCase() === "true")
    .default("false"),
  OBSIDIAN_CACHE_REFRESH_INTERVAL_MIN: z.coerce
    .number()
    .int()
    .positive()
    .default(10),
  OBSIDIAN_ENABLE_CACHE: z
    .string()
    .transform((val) => val.toLowerCase() === "true")
    .default("true"),
  OBSIDIAN_API_SEARCH_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(30000),
  OBSIDIAN_CACHE_CONTENT_MAX_ITEMS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(500),
  OBSIDIAN_CACHE_CONTENT_TTL_SECONDS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(3600),
  OBSIDIAN_CACHE_REFRESH_CONCURRENCY: z.coerce
    .number()
    .int()
    .positive()
    .default(5),
  OBSIDIAN_CACHE_REPAIR_ENABLED: z
    .string()
    .transform((val) => val.toLowerCase() === "true")
    .default("false"),
  OBSIDIAN_CACHE_REPAIR_DRY_RUN: z
    .string()
    .transform((val) => val.toLowerCase() === "true")
    .default("false"),
  OBSIDIAN_CACHE_MAX_REPAIRS_PER_RUN: z.coerce
    .number()
    .int()
    .positive()
    .default(500),
  OBSIDIAN_CACHE_NORMALIZE_TAGS_TO_LOWERCASE: z
    .string()
    .transform((val) => val.toLowerCase() === "true")
    .default("false"),
});

const parsedEnv = EnvSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    "❌ Invalid environment variables:",
    parsedEnv.error.flatten().fieldErrors,
  );
  throw new Error("Invalid environment configuration.");
}

const env = parsedEnv.data;

const ensureDirectory = (
  dirPath: string,
  rootDir: string,
  dirName: string,
): string | null => {
  const resolvedDirPath = path.isAbsolute(dirPath)
    ? dirPath
    : path.resolve(rootDir, dirPath);
  if (
    !resolvedDirPath.startsWith(rootDir + path.sep) &&
    resolvedDirPath !== rootDir
  ) {
    console.error(`Error: ${dirName} path is outside the project boundary.`);
    return null;
  }
  if (!existsSync(resolvedDirPath)) {
    try {
      mkdirSync(resolvedDirPath, { recursive: true });
    } catch (err: any) {
      console.error(`Error creating ${dirName} directory: ${err.message}`);
      return null;
    }
  } else if (!statSync(resolvedDirPath).isDirectory()) {
    console.error(`Error: ${dirName} path exists but is not a directory.`);
    return null;
  }
  return resolvedDirPath;
};

const validatedLogsPath = ensureDirectory(env.LOGS_DIR, projectRoot, "logs");

if (!validatedLogsPath) {
  console.error("FATAL: Logs directory is invalid. Exiting.");
  process.exit(1);
}

export const config = {
  pkg,
  mcpServerName: env.MCP_SERVER_NAME || pkg.name,
  mcpServerVersion: env.MCP_SERVER_VERSION || pkg.version,
  logLevel: env.MCP_LOG_LEVEL,
  logsPath: validatedLogsPath,
  environment: env.NODE_ENV,
  mcpTransportType: env.MCP_TRANSPORT_TYPE,
  mcpSessionMode: env.MCP_SESSION_MODE,
  mcpHttpPort: env.MCP_HTTP_PORT,
  mcpHttpHost: env.MCP_HTTP_HOST,
  mcpHttpEndpointPath: env.MCP_HTTP_ENDPOINT_PATH,
  mcpHttpMaxPortRetries: env.MCP_HTTP_MAX_PORT_RETRIES,
  mcpHttpPortRetryDelayMs: env.MCP_HTTP_PORT_RETRY_DELAY_MS,
  mcpStatefulSessionStaleTimeoutMs: env.MCP_STATEFUL_SESSION_STALE_TIMEOUT_MS,
  mcpAllowedOrigins: env.MCP_ALLOWED_ORIGINS?.split(",").map((o) => o.trim()),
  mcpAuthSecretKey: env.MCP_AUTH_SECRET_KEY,
  mcpAuthMode: env.MCP_AUTH_MODE,
  oauthIssuerUrl: env.OAUTH_ISSUER_URL,
  oauthJwksUri: env.OAUTH_JWKS_URI,
  oauthAudience: env.OAUTH_AUDIENCE,
  devMcpClientId: env.DEV_MCP_CLIENT_ID,
  devMcpScopes: env.DEV_MCP_SCOPES?.split(",").map((s) => s.trim()),
  obsidianApiKey: env.OBSIDIAN_API_KEY,
  obsidianBaseUrl: env.OBSIDIAN_BASE_URL,
  obsidianVerifySsl: env.OBSIDIAN_VERIFY_SSL,
  obsidianCacheRefreshIntervalMin: env.OBSIDIAN_CACHE_REFRESH_INTERVAL_MIN,
  obsidianEnableCache: env.OBSIDIAN_ENABLE_CACHE,
  obsidianApiSearchTimeoutMs: env.OBSIDIAN_API_SEARCH_TIMEOUT_MS,
  obsidianCacheContentMaxItems: env.OBSIDIAN_CACHE_CONTENT_MAX_ITEMS,
  obsidianCacheContentTtlSeconds: env.OBSIDIAN_CACHE_CONTENT_TTL_SECONDS,
  obsidianCacheRefreshConcurrency: env.OBSIDIAN_CACHE_REFRESH_CONCURRENCY,
  obsidianCacheRepairEnabled: env.OBSIDIAN_CACHE_REPAIR_ENABLED,
  obsidianCacheRepairDryRun: env.OBSIDIAN_CACHE_REPAIR_DRY_RUN,
  obsidianCacheMaxRepairsPerRun: env.OBSIDIAN_CACHE_MAX_REPAIRS_PER_RUN,
  obsidianCacheNormalizeTagsToLowercase:
    env.OBSIDIAN_CACHE_NORMALIZE_TAGS_TO_LOWERCASE,
  security: {
    authRequired: env.MCP_AUTH_MODE !== "none",
  },
};

export const logLevel = config.logLevel;
export const environment = config.environment;
