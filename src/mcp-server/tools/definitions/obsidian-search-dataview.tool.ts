/**
 * @fileoverview Tool definition for Dataview DQL search in Obsidian.
 * @module src/mcp-server/tools/definitions/obsidian-search-dataview.tool
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

const TOOL_NAME = 'obsidian_search_dataview';
const TOOL_TITLE = 'Dataview Search';
const TOOL_DESCRIPTION =
  'Executes Dataview Query Language (DQL) queries to search and filter notes in the Obsidian vault. This tool, which requires the Dataview plugin, supports complex queries with WHERE clauses, sorting, and field selection for advanced note discovery and data extraction.';

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
      .describe(
        'The Dataview Query Language (DQL) query string. Example: "LIST FROM #tag WHERE date > date(today) - dur(7 days)"',
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
  .describe('Parameters for a Dataview DQL search.');

// Output Schema
const OutputSchema = z
  .object({
    query: z.string().describe('The DQL query that was executed.'),
    resultCount: z
      .number()
      .describe('The total number of files that matched the query.'),
    results: z
      .array(
        z.object({
          filename: z.string().describe('The path to the file.'),
          score: z
            .number()
            .optional()
            .describe('The relevance score for this result, if available.'),
          matches: z
            .array(
              z.object({
                match: z
                  .string()
                  .describe('The matched content or field value.'),
                context: z
                  .string()
                  .describe(
                    'Additional context or information about the match.',
                  ),
              }),
            )
            .optional()
            .describe('An array of matches or field values from the query.'),
        }),
      )
      .describe('An array of files that match the DQL query.'),
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
  .describe('The results of the Dataview query.');

type ToolInput = z.infer<typeof InputSchema>;
type ToolResponse = z.infer<typeof OutputSchema>;

// Pure business logic
async function toolLogic(
  input: ToolInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<ToolResponse> {
  logger.debug('Executing Dataview DQL query', {
    ...appContext,
    query: input.query,
    limit: input.limit,
    offset: input.offset,
  });

  const obsidianProvider =
    container.resolve<IObsidianProvider>(ObsidianProvider);
  const allResults = await obsidianProvider.searchDataview(
    appContext,
    input.query,
  );

  // Apply pagination
  const totalResultCount = allResults.length;
  const paginatedResults = allResults.slice(
    input.offset,
    input.offset + input.limit,
  );
  const hasMore = input.offset + input.limit < totalResultCount;

  return {
    query: input.query,
    resultCount: totalResultCount,
    results: paginatedResults.map((result) => ({
      filename: result.filename,
      score: result.score,
      matches: result.matches,
    })),
    limit: input.limit,
    offset: input.offset,
    hasMore,
  };
}

// Response formatter
function responseFormatter(result: ToolResponse): ContentBlock[] {
  const md = markdown().h1('Dataview Query Results').blankLine();

  // Show query in code block
  md.text('**Query:**')
    .blankLine()
    .codeBlock(result.query, 'dataview')
    .blankLine();

  // Pagination info
  const startIndex = result.offset + 1;
  const endIndex = Math.min(
    result.offset + result.results.length,
    result.resultCount,
  );

  // Summary
  md.text(
    `Showing **${startIndex}-${endIndex}** of **${result.resultCount}** files`,
  ).blankLine();

  if (result.resultCount === 0) {
    md.text('_No results found for this query._')
      .blankLine()
      .text(
        '_Tip: Ensure the Dataview plugin is installed and enabled in Obsidian._',
      );
    return [{ type: 'text', text: md.build() }];
  }

  // Results
  md.h2('Results').blankLine();

  result.results.forEach((fileResult, index) => {
    md.h3(`${index + 1}. ${fileResult.filename}`);

    if (fileResult.score !== undefined) {
      md.text(`Score: ${fileResult.score.toFixed(2)}`).blankLine();
    }

    // Show matches/field values if available
    if (fileResult.matches && fileResult.matches.length > 0) {
      fileResult.matches.forEach((match) => {
        if (match.match) {
          md.text(`- **${match.match}**`);
          if (match.context) {
            md.text(`: ${match.context}`);
          }
          md.text('\n');
        }
      });
      md.blankLine();
    } else {
      md.blankLine();
    }
  });

  // Pagination navigation hint
  if (result.hasMore) {
    md.hr()
      .blankLine()
      .text(
        `_**More results available.** Use \`offset: ${result.offset + result.limit}\` to get the next page._`,
      )
      .blankLine();
  }

  // Footer tips
  if (!result.hasMore) {
    md.hr().blankLine();
  }
  md.text('**Dataview Query Examples:**')
    .blankLine()
    .list([
      '`LIST FROM #tag` - List all notes with a specific tag',
      '`TABLE file.ctime, file.mtime FROM "folder"` - Show creation and modification times',
      '`LIST WHERE date > date(today) - dur(7 days)` - Notes from the last week',
      '`TABLE rating, summary FROM #books WHERE rating >= 4` - Filtered data from notes',
    ]);

  return [{ type: 'text', text: md.build() }];
}

// Tool definition
export const obsidianSearchDataviewTool: ToolDefinition<
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
