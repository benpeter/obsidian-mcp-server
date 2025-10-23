/**
 * @fileoverview Tool definition for JsonLogic-based advanced search in Obsidian.
 * @module src/mcp-server/tools/definitions/obsidian-search-jsonlogic.tool
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

const TOOL_NAME = 'obsidian_search_jsonlogic';
const TOOL_TITLE = 'JsonLogic Search';
const TOOL_DESCRIPTION =
  'Execute advanced programmatic searches using JsonLogic queries. Supports complex logical operations, glob patterns, regular expressions, and path matching for sophisticated note filtering and discovery. Most powerful search option for programmatic vault exploration.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

// Input Schema
const InputSchema = z
  .object({
    query: z
      .record(z.unknown())
      .describe(
        'JsonLogic query object for advanced filtering. Supports operators like "and", "or", "glob", "regexp", "===", ">", "<", "in", etc. Example: {"and": [{"glob": {"path": "folder/*.md"}}, {"regexp": {"content": "pattern"}}]}',
      ),
  })
  .describe('Parameters for JsonLogic search.');

// Output Schema
const OutputSchema = z
  .object({
    query: z
      .record(z.unknown())
      .describe('The JsonLogic query that was executed.'),
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
                match: z.string().describe('Matched content.'),
                context: z.string().describe('Context around the match.'),
              }),
            )
            .optional()
            .describe('Array of matches with context.'),
        }),
      )
      .describe('Array of files matching the JsonLogic query.'),
  })
  .describe('JsonLogic query results.');

type ToolInput = z.infer<typeof InputSchema>;
type ToolResponse = z.infer<typeof OutputSchema>;

// Pure business logic
async function toolLogic(
  input: ToolInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<ToolResponse> {
  logger.debug('Executing JsonLogic query', {
    ...appContext,
    queryKeys: Object.keys(input.query),
  });

  const obsidianProvider =
    container.resolve<IObsidianProvider>(ObsidianProvider);
  const results = await obsidianProvider.searchJsonLogic(
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
  const md = markdown().h1('JsonLogic Query Results').blankLine();

  // Show query in code block
  md.text('**Query:**')
    .blankLine()
    .codeBlock(JSON.stringify(result.query, null, 2), 'json')
    .blankLine();

  // Summary
  md.list([`**Files Found:** ${result.resultCount}`]).blankLine();

  if (result.resultCount === 0) {
    md.text('_No results found for this query._');
    return [{ type: 'text', text: md.build() }];
  }

  // Results
  md.h2('Results').blankLine();

  result.results.forEach((fileResult, index) => {
    md.h3(`${index + 1}. ${fileResult.filename}`);

    if (fileResult.score !== undefined) {
      md.text(`Score: ${fileResult.score.toFixed(2)}`).blankLine();
    }

    // Show matches if available
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
      md.blankLine();
    } else {
      md.blankLine();
    }
  });

  // Footer with examples
  md.hr()
    .blankLine()
    .text('**JsonLogic Query Examples:**')
    .blankLine()
    .text('**Path glob pattern:**')
    .blankLine()
    .codeBlock('{"glob": {"path": "projects/**/*.md"}}', 'json')
    .blankLine()
    .text('**Content regex search:**')
    .blankLine()
    .codeBlock('{"regexp": {"content": "TODO|FIXME"}}', 'json')
    .blankLine()
    .text('**Complex AND/OR logic:**')
    .blankLine()
    .codeBlock(
      JSON.stringify(
        {
          and: [
            { glob: { path: 'notes/*.md' } },
            {
              or: [
                { regexp: { tags: 'important' } },
                { '===': [{ var: 'status' }, 'active'] },
              ],
            },
          ],
        },
        null,
        2,
      ),
      'json',
    );

  return [{ type: 'text', text: md.build() }];
}

// Tool definition
export const obsidianSearchJsonLogicTool: ToolDefinition<
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
