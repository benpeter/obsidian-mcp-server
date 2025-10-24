/**
 * @fileoverview Tool definition for executing Obsidian commands.
 * @module src/mcp-server/tools/definitions/obsidian-execute-command.tool
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

const TOOL_NAME = 'obsidian_execute_command';
const TOOL_TITLE = 'Execute Command';
const TOOL_DESCRIPTION =
  'Executes an Obsidian command by its ID, allowing for a wide range of operations like editor actions, file management, and plugin-specific functions. To find available command IDs, use the `obsidian_list_commands` tool. Note that this operation is not idempotent.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false, // Command execution is not idempotent
  openWorldHint: false,
};

// Input Schema
const InputSchema = z
  .object({
    commandId: z
      .string()
      .min(1)
      .describe(
        'The ID of the command to execute. You can use `obsidian_list_commands` to discover the available command IDs.',
      ),
  })
  .describe('Parameters for executing an Obsidian command.');

// Output Schema
const OutputSchema = z
  .object({
    commandId: z.string().describe('The ID of the command that was executed.'),
    executed: z
      .boolean()
      .describe('Indicates whether the command was successfully executed.'),
    message: z
      .string()
      .describe('A message indicating the result of the command execution.'),
  })
  .describe('The result of the command execution.');

type ToolInput = z.infer<typeof InputSchema>;
type ToolResponse = z.infer<typeof OutputSchema>;

// Pure business logic
async function toolLogic(
  input: ToolInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<ToolResponse> {
  logger.info('Executing Obsidian command', {
    ...appContext,
    commandId: input.commandId,
  });

  const obsidianProvider =
    container.resolve<IObsidianProvider>(ObsidianProvider);
  await obsidianProvider.executeCommand(appContext, input.commandId);

  return {
    commandId: input.commandId,
    executed: true,
    message: `Command "${input.commandId}" executed successfully.`,
  };
}

// Response formatter
function responseFormatter(result: ToolResponse): ContentBlock[] {
  const md = markdown().h1('Command Executed').blankLine();

  if (result.executed) {
    md.text('✅ **Success**').blankLine();
    md.list([`**Command ID:** ${result.commandId}`, `**Status:** Executed`]);

    md.blankLine()
      .text(result.message)
      .blankLine()
      .text(
        '_Note: Command effects depend on the specific command and current Obsidian state._',
      );
  } else {
    md.text('❌ **Failed**').blankLine().text(result.message);
  }

  return [{ type: 'text', text: md.build() }];
}

// Tool definition
export const obsidianExecuteCommandTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: TOOL_ANNOTATIONS,
  logic: withToolAuth(['tool:obsidian_commands:execute'], toolLogic),
  responseFormatter,
};
