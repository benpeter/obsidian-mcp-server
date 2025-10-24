/**
 * @fileoverview Tool definition for listing available Obsidian commands.
 * @module src/mcp-server/tools/definitions/obsidian-list-commands.tool
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
import { logger, markdown, tableFormatter } from '@/utils/index.js';
import type { IObsidianProvider } from '@/services/obsidian/core/IObsidianProvider.js';
import { ObsidianProvider } from '@/container/tokens.js';

const TOOL_NAME = 'obsidian_list_commands';
const TOOL_TITLE = 'List Commands';
const TOOL_DESCRIPTION =
  'Lists all available commands in Obsidian, including core commands and those from installed plugins. It returns command IDs and names that can be used with the `obsidian_execute_command` tool.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

// Input Schema
const InputSchema = z
  .object({
    filter: z
      .string()
      .optional()
      .describe(
        'An optional filter string to search for specific commands by name or ID. The search is case-insensitive.',
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .default(100)
      .describe(
        'The maximum number of commands to return per page. [Default: 100, Max: 500]',
      ),
    offset: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe('The number of commands to skip for pagination. [Default: 0]'),
  })
  .describe('Parameters for listing Obsidian commands.');

// Output Schema
const OutputSchema = z
  .object({
    commandCount: z
      .number()
      .describe('The total number of commands available.'),
    filteredCount: z
      .number()
      .optional()
      .describe(
        'The number of commands after filtering, if a filter was applied.',
      ),
    commands: z
      .array(
        z.object({
          id: z.string().describe('The unique identifier for the command.'),
          name: z.string().describe('The human-readable name of the command.'),
        }),
      )
      .describe('An array of the available commands.'),
    limit: z
      .number()
      .describe('The maximum number of commands returned per page.'),
    offset: z
      .number()
      .describe('The number of commands that were skipped for pagination.'),
    hasMore: z
      .boolean()
      .describe(
        'Indicates whether more commands are available on a subsequent page.',
      ),
  })
  .describe('The list of available Obsidian commands.');

type ToolInput = z.infer<typeof InputSchema>;
type ToolResponse = z.infer<typeof OutputSchema>;

// Pure business logic
async function toolLogic(
  input: ToolInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<ToolResponse> {
  logger.debug('Listing Obsidian commands', {
    ...appContext,
    filter: input.filter,
    limit: input.limit,
    offset: input.offset,
  });

  const obsidianProvider =
    container.resolve<IObsidianProvider>(ObsidianProvider);
  const allCommands = await obsidianProvider.listCommands(appContext);

  // Apply filter if provided
  let commands = allCommands;
  if (input.filter) {
    const filterLower = input.filter.toLowerCase();
    commands = allCommands.filter(
      (cmd) =>
        cmd.id.toLowerCase().includes(filterLower) ||
        cmd.name.toLowerCase().includes(filterLower),
    );
  }

  // Apply pagination
  const totalAvailable = commands.length;
  const paginatedCommands = commands.slice(
    input.offset,
    input.offset + input.limit,
  );
  const hasMore = input.offset + input.limit < totalAvailable;

  return {
    commandCount: allCommands.length,
    ...(input.filter && { filteredCount: totalAvailable }),
    commands: paginatedCommands.map((cmd) => ({
      id: cmd.id,
      name: cmd.name,
    })),
    limit: input.limit,
    offset: input.offset,
    hasMore,
  };
}

// Response formatter
function responseFormatter(result: ToolResponse): ContentBlock[] {
  const md = markdown().h1('Obsidian Commands').blankLine();

  // Pagination info
  const totalCommands = result.filteredCount ?? result.commandCount;
  const startIndex = result.offset + 1;
  const endIndex = Math.min(
    result.offset + result.commands.length,
    totalCommands,
  );

  // Summary
  if (result.filteredCount !== undefined) {
    md.text(
      `Found **${result.filteredCount}** commands (filtered from ${result.commandCount} total)`,
    ).blankLine();
  } else {
    md.text(`Found **${result.commandCount}** commands`).blankLine();
  }

  // Pagination status
  md.text(
    `Showing **${startIndex}-${endIndex}** of **${totalCommands}** commands`,
  ).blankLine();

  if (result.commands.length === 0) {
    md.text('_No commands found matching the filter._');
    return [{ type: 'text', text: md.build() }];
  }

  // Create table of commands
  md.h2('Available Commands').blankLine();

  const table = tableFormatter.formatRaw(
    ['Command ID', 'Name'],
    result.commands.map((cmd) => [cmd.id, cmd.name]),
  );

  md.text(table).blankLine();

  // Pagination navigation hint
  if (result.hasMore) {
    md.text(
      `_**More results available.** Use \`offset: ${result.offset + result.limit}\` to get the next page._`,
    ).blankLine();
  }

  // Footer tip
  md.hr()
    .blankLine()
    .text(
      '**Tip:** Use `obsidian_execute_command` to run any command by its ID.',
    )
    .blankLine()
    .text(
      '_Example: Core commands include editor operations, file management, and workspace navigation._',
    );

  return [{ type: 'text', text: md.build() }];
}

// Tool definition
export const obsidianListCommandsTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: TOOL_ANNOTATIONS,
  logic: withToolAuth(['tool:obsidian_commands:read'], toolLogic),
  responseFormatter,
};
