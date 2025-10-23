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
  'Execute Dataview Query Language (DQL) queries to search and filter notes in the Obsidian vault. Requires the Dataview plugin to be installed and enabled. Supports complex queries with WHERE clauses, sorting, and field selection for advanced note discovery and data extraction.';

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
        'Dataview Query Language (DQL) query string. Example: "LIST FROM #tag WHERE date > date(today) - dur(7 days)"',
      ),
  })
  .describe('Parameters for Dataview DQL search.');

// Output Schema
const OutputSchema = z
  .object({
    query: z.string().describe('The DQL query that was executed.'),
    resultCount: z
      .number()
      .describe('Total number of files matching the query.'),
    results: z
      .array(
        z.object({
          filename: z.string().describe('Path to the file.'),
          score: z
            .number()
            .optional()
            .describe('Relevance score for this result (if available).'),
          matches: z
            .array(
              z.object({
                match: z.string().describe('Matched content or field value.'),
                context: z
                  .string()
                  .describe('Context or additional information.'),
              }),
            )
            .optional()
            .describe('Array of matches or field values from the query.'),
        }),
      )
      .describe('Array of files matching the DQL query.'),
  })
  .describe('Dataview query results.');

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
  });

  const obsidianProvider =
    container.resolve<IObsidianProvider>(ObsidianProvider);
  const results = await obsidianProvider.searchDataview(
    appContext,
    input.query,
  );

  return {
    query: input.query,
    resultCount: results.length,
    results: results.map((result) => ({
      filename: result.filename,
      score: result.score,
      matches: result.matches,
    })),
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

  // Summary
  md.list([`**Files Found:** ${result.resultCount}`]).blankLine();

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

  // Footer tips
  md.hr()
    .blankLine()
    .text('**Dataview Query Examples:**')
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
