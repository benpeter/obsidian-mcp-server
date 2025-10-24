/**
 * @fileoverview Tool definition for appending content to the active note.
 * @module src/mcp-server/tools/definitions/obsidian-append-active-note.tool
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

const TOOL_NAME = 'obsidian_append_active_note';
const TOOL_TITLE = 'Append to Active Note';
const TOOL_DESCRIPTION =
  'Appends content to the end of the currently active note in Obsidian. This is a non-destructive operation that preserves existing content by adding a newline separator before the new content.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

// Input Schema
const InputSchema = z
  .object({
    content: z
      .string()
      .min(1)
      .describe('The content to append to the end of the note.'),
  })
  .describe('The parameters for appending content to the active note.');

// Output Schema
const OutputSchema = z
  .object({
    path: z.string().describe('The file path of the updated note.'),
    appendedLength: z
      .number()
      .describe('The length of the content that was appended.'),
    totalLength: z
      .number()
      .describe(
        'The total length of the note content after the append operation.',
      ),
    size: z.number().describe('The new file size in bytes.'),
  })
  .describe('The result of the append operation.');

type ToolInput = z.infer<typeof InputSchema>;
type ToolResponse = z.infer<typeof OutputSchema>;

// Pure business logic
async function toolLogic(
  input: ToolInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<ToolResponse> {
  logger.debug('Appending content to active note', {
    ...appContext,
    appendLength: input.content.length,
  });

  const obsidianProvider =
    container.resolve<IObsidianProvider>(ObsidianProvider);
  const note = await obsidianProvider.appendActiveNote(
    appContext,
    input.content,
  );

  return {
    path: note.path,
    appendedLength: input.content.length,
    totalLength: note.content.length,
    size: note.stat?.size ?? note.content.length,
  };
}

// Response formatter
function responseFormatter(result: ToolResponse): ContentBlock[] {
  const md = markdown()
    .h1('Content Appended Successfully')
    .blankLine()
    .list([
      `**Path:** ${result.path}`,
      `**Appended:** ${result.appendedLength} characters`,
      `**Total Length:** ${result.totalLength.toLocaleString()} characters`,
      `**New size:** ${result.size.toLocaleString()} bytes`,
    ]);

  return [{ type: 'text', text: md.build() }];
}

// Tool definition
export const obsidianAppendActiveNoteTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: TOOL_ANNOTATIONS,
  logic: withToolAuth(['tool:obsidian_note:write'], toolLogic),
  responseFormatter,
};
