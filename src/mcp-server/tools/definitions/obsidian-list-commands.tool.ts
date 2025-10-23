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
  'List all available commands in Obsidian, including both core commands and those provided by installed plugins. Returns command IDs and names that can be used with the execute command tool.';

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
        'Optional filter string to search for specific commands by name or ID (case-insensitive).',
      ),
  })
  .describe('Parameters for listing Obsidian commands.');

// Output Schema
const OutputSchema = z
  .object({
    commandCount: z.number().describe('Total number of commands available.'),
    filteredCount: z
      .number()
      .optional()
      .describe('Number of commands after filtering (if filter applied).'),
    commands: z
      .array(
        z.object({
          id: z.string().describe('Unique command identifier.'),
          name: z.string().describe('Human-readable command name.'),
        }),
      )
      .describe('Array of available commands.'),
  })
  .describe('Available Obsidian commands.');

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

  return {
    commandCount: allCommands.length,
    ...(input.filter && { filteredCount: commands.length }),
    commands: commands.map((cmd) => ({
      id: cmd.id,
      name: cmd.name,
    })),
  };
}

// Response formatter
function responseFormatter(result: ToolResponse): ContentBlock[] {
  const md = markdown().h1('Obsidian Commands').blankLine();

  // Summary
  if (result.filteredCount !== undefined) {
    md.text(
      `Found **${result.filteredCount}** commands (filtered from ${result.commandCount} total)`,
    ).blankLine();
  } else {
    md.text(`Found **${result.commandCount}** commands`).blankLine();
  }

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
