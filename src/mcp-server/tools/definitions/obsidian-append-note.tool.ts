/**
 * @fileoverview Tool definition for appending content to a note in Obsidian.
 * @module src/mcp-server/tools/definitions/obsidian-append-note.tool
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

const TOOL_NAME = 'obsidian_append_note';
const TOOL_TITLE = 'Append to Note';
const TOOL_DESCRIPTION =
  'Appends content to a specific note in the Obsidian vault. This is a non-destructive operation that adds content after the existing content, making it useful for incremental updates, logs, or adding to notes without replacing them.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

// Input Schema
const InputSchema = z
  .object({
    path: z
      .string()
      .min(1)
      .describe(
        'The path to the note relative to the vault root. You can include or omit the .md extension (e.g., "folder/note" or "folder/note.md").',
      ),
    content: z
      .string()
      .min(1)
      .describe(
        'The content to append to the note. It will be added at the end of the existing content.',
      ),
  })
  .describe('Parameters for appending content to a note.');

// Output Schema
const OutputSchema = z
  .object({
    path: z.string().describe('The path of the updated note.'),
    appendedLength: z
      .number()
      .describe('The length of the content that was appended, in characters.'),
    totalLength: z
      .number()
      .describe('The total length of the note after appending, in characters.'),
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
  logger.debug('Appending content to note', {
    ...appContext,
    path: input.path,
    appendedLength: input.content.length,
  });

  const obsidianProvider =
    container.resolve<IObsidianProvider>(ObsidianProvider);
  const note = await obsidianProvider.appendNote(
    appContext,
    input.path,
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
  const md = markdown().h1('Content Appended').blankLine();

  md.list([
    `**Note:** ${result.path}`,
    `**Appended:** ${result.appendedLength.toLocaleString()} characters`,
    `**Total Length:** ${result.totalLength.toLocaleString()} characters`,
    `**File Size:** ${result.size.toLocaleString()} bytes`,
  ]);

  md.blankLine()
    .text('✅ Content successfully appended to note.')
    .blankLine()
    .text(
      '_Tip: Use obsidian_get_note to verify the updated content if needed._',
    );

  return [{ type: 'text', text: md.build() }];
}

// Tool definition
export const obsidianAppendNoteTool: ToolDefinition<
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
