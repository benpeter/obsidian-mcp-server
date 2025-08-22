/**
 * @fileoverview Core logic for the 'obsidian_global_search' tool.
 * @module src/mcp-server/tools/obsidianGlobalSearchTool/logic
 */

import path from "node:path/posix";
import { z } from "zod";
import { config } from "../../../config/index.js";
import { ObsidianRestApiService } from "../../../services/obsidianRestAPI/index.js";
import {
  components,
  paths,
} from "../../../services/obsidianRestAPI/generated-types.js";
import { VaultCacheService } from "../../../services/obsidianRestAPI/vaultCache/index.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import {
  dateParser,
  logger,
  type RequestContext,
} from "../../../utils/index.js";
import { formatTimestamp } from "../../../services/obsidianRestAPI/utils/index.js";

// 1. DEFINE the Zod input schema.
export const ObsidianGlobalSearchInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe("The search query (text or regex pattern)."),
  searchInPath: z
    .string()
    .optional()
    .describe(
      "Optional vault-relative path to recursively search within (e.g., 'Notes/Projects'). If omitted, searches the entire vault.",
    ),
  contextLength: z
    .number()
    .int()
    .positive()
    .default(100)
    .describe("Characters of context around matches."),
  modified_since: z
    .string()
    .optional()
    .describe(
      "Filter files modified *since* this date/time (e.g., '2 weeks ago', '2024-01-15').",
    ),
  modified_until: z
    .string()
    .optional()
    .describe(
      "Filter files modified *until* this date/time (e.g., 'today', '2024-03-20 17:00').",
    ),
  useRegex: z
    .boolean()
    .default(false)
    .describe("Treat 'query' as regex. Defaults to false."),
  caseSensitive: z
    .boolean()
    .default(false)
    .describe("Perform case-sensitive search. Defaults to false."),
  pageSize: z
    .number()
    .int()
    .positive()
    .default(50)
    .describe("Maximum number of result files per page. Defaults to 50."),
  page: z
    .number()
    .int()
    .positive()
    .default(1)
    .describe("Page number of results to return. Defaults to 1."),
  maxMatchesPerFile: z
    .number()
    .int()
    .positive()
    .default(5)
    .describe("Maximum number of matches to show per file. Defaults to 5."),
});

// 2. DEFINE the Zod response schema.
const MatchContextSchema = z.object({
  context: z.string(),
  matchText: z.string().optional(),
  position: z.number().optional(),
});

const GlobalSearchResultSchema = z.object({
  path: z.string(),
  filename: z.string(),
  matches: z.array(MatchContextSchema),
  modifiedTime: z.string(),
  createdTime: z.string(),
  numericMtime: z.number(),
});

export const ObsidianGlobalSearchOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  results: z.array(GlobalSearchResultSchema),
  totalFilesFound: z.number(),
  totalMatchesFound: z.number(),
  currentPage: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
  alsoFoundInFiles: z.array(z.string()).optional(),
});

// 3. INFER and export TypeScript types.
export type ObsidianGlobalSearchInput = z.infer<
  typeof ObsidianGlobalSearchInputSchema
>;
export type ObsidianGlobalSearchOutput = z.infer<
  typeof ObsidianGlobalSearchOutputSchema
>;
type GlobalSearchResult = z.infer<typeof GlobalSearchResultSchema>;
type MatchContext = z.infer<typeof MatchContextSchema>;
type NoteJson = components["schemas"]["NoteJson"];
type SimpleSearchResult =
  paths["/search/simple/"]["post"]["responses"]["200"]["content"]["application/json"][number];

// Helper to find matches in a string, used by the cache fallback.
function findMatchesInContent(
  content: string,
  query: string,
  useRegex: boolean,
  caseSensitive: boolean,
  contextLength: number,
): MatchContext[] {
  const matches: MatchContext[] = [];
  let regex: RegExp;
  try {
    const flags = `g${caseSensitive ? "" : "i"}`;
    regex = useRegex
      ? new RegExp(query, flags)
      : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
  } catch (e) {
    throw new McpError(
      BaseErrorCode.VALIDATION_ERROR,
      `Invalid regex pattern: ${query}`,
    );
  }
  let match;
  while ((match = regex.exec(content)) !== null) {
    const matchIndex = match.index;
    const matchText = match[0];
    const startIndex = Math.max(0, matchIndex - contextLength);
    const endIndex = Math.min(
      content.length,
      matchIndex + matchText.length + contextLength,
    );
    const contextSnippet = content.substring(startIndex, endIndex);
    matches.push({ context: contextSnippet });
    if (matchText.length === 0) regex.lastIndex++;
  }
  return matches;
}

// Helper to process and filter results from either API or cache.
async function processAndFilterResults(
  results: (SimpleSearchResult | GlobalSearchResult)[],
  params: ObsidianGlobalSearchInput,
  context: RequestContext,
  obsidianService: ObsidianRestApiService,
): Promise<GlobalSearchResult[]> {
  const { searchInPath, modified_since, modified_until, maxMatchesPerFile } =
    params;
  const sinceDate = modified_since
    ? await dateParser.parseToDate(modified_since, context)
    : null;
  const untilDate = modified_until
    ? await dateParser.parseToDate(modified_until, context)
    : null;
  const searchPathPrefix = searchInPath
    ? path.normalize(searchInPath) + (searchInPath === "/" ? "" : "/")
    : "";

  const filteredResults: GlobalSearchResult[] = [];

  for (const result of results) {
    const filePath = "path" in result ? result.path : result.filename!;
    if (searchPathPrefix && !filePath.startsWith(searchPathPrefix)) {
      continue;
    }

    // For API results, we need to fetch metadata to filter by date.
    // For cache results, metadata is already present.
    let mtime: number, ctime: number;
    if ("numericMtime" in result) {
      mtime = result.numericMtime;
      ctime = (result as any).ctime ?? 0;
    } else {
      const noteJson = (await obsidianService.getFileContent(
        filePath,
        "json",
        context,
      )) as NoteJson;
      mtime = noteJson.stat.mtime;
      ctime = noteJson.stat.ctime;
    }

    if (
      (sinceDate && mtime < sinceDate.getTime()) ||
      (untilDate && mtime > untilDate.getTime())
    ) {
      continue;
    }

    filteredResults.push({
      path: filePath,
      filename: path.basename(filePath),
      matches: (result.matches ?? []).slice(0, maxMatchesPerFile),
      modifiedTime: formatTimestamp(mtime, context),
      createdTime: formatTimestamp(ctime, context),
      numericMtime: mtime,
    });
  }
  return filteredResults;
}

/**
 * 4. IMPLEMENT the core logic function.
 * @throws {McpError} If the logic encounters an unrecoverable issue.
 */
export async function obsidianGlobalSearchLogic(
  params: ObsidianGlobalSearchInput,
  context: RequestContext,
  obsidianService: ObsidianRestApiService,
  vaultCacheService?: VaultCacheService,
): Promise<ObsidianGlobalSearchOutput> {
  const { query, contextLength, pageSize, page, useRegex, caseSensitive } =
    params;
  let allFilteredResults: GlobalSearchResult[] = [];
  let totalMatchesCount = 0;
  let strategyMessage = "";

  let apiFailedOrTimedOut = false;
  try {
    strategyMessage = "Attempting live API search... ";
    const apiResults: SimpleSearchResult[] = await Promise.race([
      obsidianService.searchSimple(query, contextLength, context),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("API search timed out")),
          config.obsidianApiSearchTimeoutMs,
        ),
      ),
    ]);
    strategyMessage += `API search successful, returned ${apiResults.length} potential files. `;
    allFilteredResults = await processAndFilterResults(
      apiResults,
      params,
      context,
      obsidianService,
    );
    totalMatchesCount = allFilteredResults.reduce(
      (sum, r) => sum + r.matches.length,
      0,
    );
  } catch (apiError) {
    logger.warning("Live API search failed or timed out.", {
      ...context,
      apiError,
    });
    apiFailedOrTimedOut = true;
    strategyMessage += "API search failed or timed out. ";
  }

  if (apiFailedOrTimedOut) {
    if (vaultCacheService?.isReady()) {
      strategyMessage += "Falling back to in-memory cache. ";
      const cache = vaultCacheService.getCache();
      const cacheResults: GlobalSearchResult[] = [];

      for (const [filePath, cacheEntry] of cache.entries()) {
        const matches = findMatchesInContent(
          cacheEntry.content,
          query,
          useRegex,
          caseSensitive,
          contextLength,
        );
        if (matches.length > 0) {
          cacheResults.push({
            path: filePath,
            filename: path.basename(filePath),
            matches: matches,
            modifiedTime: "", // Will be populated in processAndFilterResults
            createdTime: "", // Will be populated in processAndFilterResults
            numericMtime: cacheEntry.mtime,
          });
        }
      }
      allFilteredResults = await processAndFilterResults(
        cacheResults,
        params,
        context,
        obsidianService,
      );
      totalMatchesCount = allFilteredResults.reduce(
        (sum, r) => sum + r.matches.length,
        0,
      );
    } else {
      throw new McpError(
        BaseErrorCode.SERVICE_UNAVAILABLE,
        "Live API search failed and the cache is not available or ready.",
      );
    }
  }

  allFilteredResults.sort((a, b) => b.numericMtime - a.numericMtime);

  const totalFilesFound = allFilteredResults.length;
  const totalPages = Math.ceil(totalFilesFound / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedResults = allFilteredResults.slice(
    startIndex,
    startIndex + pageSize,
  );

  const paginatedFilePaths = new Set(paginatedResults.map((r) => r.path));
  const alsoFoundInFiles =
    totalPages > 1
      ? [
          ...new Set(
            allFilteredResults
              .filter((r) => !paginatedFilePaths.has(r.path))
              .map((r) => r.filename),
          ),
        ]
      : undefined;

  const finalMessage = `${strategyMessage}Found ${totalMatchesCount} matches across ${totalFilesFound} files. Returning page ${page} of ${totalPages}.`;

  return {
    success: true,
    message: finalMessage,
    results: paginatedResults,
    totalFilesFound,
    totalMatchesFound: totalMatchesCount,
    currentPage: page,
    pageSize,
    totalPages,
    alsoFoundInFiles,
  };
}
