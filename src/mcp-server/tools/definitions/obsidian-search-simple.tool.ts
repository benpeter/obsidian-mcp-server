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
  'Perform a fast text search across all notes in the Obsidian vault. Returns matching files with context snippets showing where the query appears. Supports basic text matching for quick discovery of notes containing specific terms or phrases.';

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
      .describe('Search query string to find in vault notes.'),
    contextLength: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        'Number of characters of context to include around each match (default: 100).',
      ),
  })
  .describe('Parameters for simple text search.');

// Output Schema
const OutputSchema = z
  .object({
    query: z.string().describe('The search query that was executed.'),
    resultCount: z.number().describe('Total number of files with matches.'),
    totalMatches: z
      .number()
      .describe('Total number of matches across all files.'),
    results: z
      .array(
        z.object({
          filename: z.string().describe('Path to the file containing matches.'),
          score: z
            .number()
            .optional()
            .describe('Relevance score for this result (if available).'),
          matchCount: z
            .number()
            .describe('Number of matches found in this file.'),
          matches: z
            .array(
              z.object({
                match: z.string().describe('The matched text.'),
                context: z
                  .string()
                  .describe('Surrounding context for the match.'),
              }),
            )
            .optional()
            .describe('Array of individual matches with context.'),
        }),
      )
      .describe('Array of search results.'),
  })
  .describe('Search results.');

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
  });

  const obsidianProvider =
    container.resolve<IObsidianProvider>(ObsidianProvider);
  const results = await obsidianProvider.searchSimple(appContext, {
    query: input.query,
    ...(input.contextLength !== undefined && {
      contextLength: input.contextLength,
    }),
  });

  // Calculate total matches
  let totalMatches = 0;
  const enrichedResults = results.map((result) => {
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
    resultCount: results.length,
    totalMatches,
    results: enrichedResults,
  };
}

// Response formatter
function responseFormatter(result: ToolResponse): ContentBlock[] {
  const md = markdown().h1('Search Results').blankLine();

  // Summary
  md.text(`**Query:** "${result.query}"`).blankLine();
  md.list([
    `**Files Found:** ${result.resultCount}`,
    `**Total Matches:** ${result.totalMatches}`,
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

  // Footer tip
  if (result.resultCount > 10) {
    md.hr()
      .blankLine()
      .text(
        `_Showing ${Math.min(result.resultCount, 10)} of ${result.resultCount} files. Consider refining your search query for more targeted results._`,
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
