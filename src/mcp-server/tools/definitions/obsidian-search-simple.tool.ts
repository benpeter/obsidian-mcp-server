/**
 * @fileoverview Tool definition for simple text search across the Obsidian vault.
 * @module src/mcp-server/tools/definitions/obsidian-search-simple.tool
 */

import type { ContentBlock } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { container } from 'tsyringe';

import type {
  SdkContext,
  ToolAnnotations,
  ToolDefinition,
} from '@/mcp-server/tools/utils/index.js';
import { withToolAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';
import type { RequestContext } from '@/utils/index.js';
import { logger, markdown } from '@/utils/index.js';
import type { IObsidianProvider } from '@/services/obsidian/core/IObsidianProvider.js';
import { ObsidianProvider } from '@/container/tokens.js';

const TOOL_NAME = 'obsidian_search_simple';
const TOOL_TITLE = 'Simple Search';
const TOOL_DESCRIPTION =
  'Performs a fast text search across all notes in the Obsidian vault, returning matching files with context snippets showing where the query appears. This tool supports basic text matching, making it ideal for quickly discovering notes that contain specific terms or phrases.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

// Input Schema
const InputSchema = z
  .object({
    query: z
      .string()
      .min(1)
      .describe('The search query string to find in the vault notes.'),
    contextLength: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        'The number of characters of context to include around each match. [Default: 100]',
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .default(100)
      .describe(
        'The maximum number of results to return per page. [Default: 100, Max: 500]',
      ),
    offset: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe('The number of results to skip for pagination. [Default: 0]'),
  })
  .describe('Parameters for a simple text search.');

// Output Schema
const OutputSchema = z
  .object({
    query: z.string().describe('The search query that was executed.'),
    resultCount: z.number().describe('The total number of files with matches.'),
    totalMatches: z
      .number()
      .describe('The total number of matches across all files.'),
    results: z
      .array(
        z.object({
          filename: z
            .string()
            .describe('The path to the file containing the matches.'),
          score: z
            .number()
            .optional()
            .describe('The relevance score for this result, if available.'),
          matchCount: z
            .number()
            .describe('The number of matches found in this file.'),
          matches: z
            .array(
              z.object({
                match: z.string().describe('The text that was matched.'),
                context: z
                  .string()
                  .describe('The surrounding context for the match.'),
              }),
            )
            .optional()
            .describe('An array of individual matches, each with its context.'),
        }),
      )
      .describe('An array of search results.'),
    limit: z
      .number()
      .describe('The maximum number of results returned per page.'),
    offset: z
      .number()
      .describe('The number of results that were skipped for pagination.'),
    hasMore: z
      .boolean()
      .describe(
        'Indicates whether more results are available on a subsequent page.',
      ),
  })
  .describe('The results of the search.');

type ToolInput = z.infer<typeof InputSchema>;
type ToolResponse = z.infer<typeof OutputSchema>;

// Pure business logic
async function toolLogic(
  input: ToolInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<ToolResponse> {
  logger.debug('Searching vault with simple search', {
    ...appContext,
    query: input.query,
    contextLength: input.contextLength,
    limit: input.limit,
    offset: input.offset,
  });

  const obsidianProvider =
    container.resolve<IObsidianProvider>(ObsidianProvider);
  const allResults = await obsidianProvider.searchSimple(appContext, {
    query: input.query,
    ...(input.contextLength !== undefined && {
      contextLength: input.contextLength,
    }),
  });

  // Apply pagination
  const totalResultCount = allResults.length;
  const paginatedResults = allResults.slice(
    input.offset,
    input.offset + input.limit,
  );
  const hasMore = input.offset + input.limit < totalResultCount;

  // Calculate total matches (only for paginated results)
  let totalMatches = 0;
  const enrichedResults = paginatedResults.map((result) => {
    const matchCount = result.matches?.length || 0;
    totalMatches += matchCount;

    return {
      filename: result.filename,
      score: result.score,
      matchCount,
      matches: result.matches,
    };
  });

  return {
    query: input.query,
    resultCount: totalResultCount,
    totalMatches,
    results: enrichedResults,
    limit: input.limit,
    offset: input.offset,
    hasMore,
  };
}

// Response formatter
function responseFormatter(result: ToolResponse): ContentBlock[] {
  const md = markdown().h1('Search Results').blankLine();

  // Pagination info
  const startIndex = result.offset + 1;
  const endIndex = Math.min(
    result.offset + result.results.length,
    result.resultCount,
  );

  // Summary
  md.text(`**Query:** "${result.query}"`).blankLine();
  md.text(
    `Showing **${startIndex}-${endIndex}** of **${result.resultCount}** files`,
  ).blankLine();
  md.list([
    `**Total Matches:** ${result.totalMatches} (in this page)`,
  ]).blankLine();

  if (result.resultCount === 0) {
    md.text('_No results found for this query._');
    return [{ type: 'text', text: md.build() }];
  }

  // Results
  md.h2('Matches').blankLine();

  result.results.forEach((fileResult, index) => {
    md.h3(`${index + 1}. ${fileResult.filename}`);

    const metadata: string[] = [`Matches: ${fileResult.matchCount}`];
    if (fileResult.score !== undefined) {
      metadata.push(`Score: ${fileResult.score.toFixed(2)}`);
    }
    md.text(metadata.join(' • ')).blankLine();

    // Show first few matches with context
    if (fileResult.matches && fileResult.matches.length > 0) {
      const maxMatches = Math.min(fileResult.matches.length, 3);
      for (let i = 0; i < maxMatches; i++) {
        const match = fileResult.matches[i];
        if (match) {
          md.text(`> ${match.context}\n`);
        }
      }

      if (fileResult.matches.length > maxMatches) {
        md.text(
          `_...and ${fileResult.matches.length - maxMatches} more matches_\n`,
        );
      }
    }

    md.blankLine();
  });

  // Pagination navigation hint
  if (result.hasMore) {
    md.hr()
      .blankLine()
      .text(
        `_**More results available.** Use \`offset: ${result.offset + result.limit}\` to get the next page._`,
      );
  }

  return [{ type: 'text', text: md.build() }];
}

// Tool definition
export const obsidianSearchSimpleTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: TOOL_ANNOTATIONS,
  logic: withToolAuth(['tool:obsidian_vault:search'], toolLogic),
  responseFormatter,
};
