/**
 * @fileoverview Tool definition for updating the content of the active note.
 * @module src/mcp-server/tools/definitions/obsidian-update-active-note.tool
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

const TOOL_NAME = 'obsidian_update_active_note';
const TOOL_TITLE = 'Update Active Note';
const TOOL_DESCRIPTION =
  'Replaces the entire content of the currently active note in Obsidian. This is a destructive operation that overwrites all existing content, so it should be used for complete note rewrites.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

// Input Schema
const InputSchema = z
  .object({
    content: z
      .string()
      .min(0)
      .describe('The new content that will replace the entire note.'),
  })
  .describe('Parameters for updating the content of the active note.');

// Output Schema
const OutputSchema = z
  .object({
    path: z.string().describe('The file path of the updated note.'),
    content: z.string().describe('The new content of the note.'),
    size: z.number().describe('The new file size in bytes.'),
  })
  .describe('The data of the updated note.');

type ToolInput = z.infer<typeof InputSchema>;
type ToolResponse = z.infer<typeof OutputSchema>;

// Pure business logic
async function toolLogic(
  input: ToolInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<ToolResponse> {
  logger.debug('Updating active note content', {
    ...appContext,
    contentLength: input.content.length,
  });

  const obsidianProvider =
    container.resolve<IObsidianProvider>(ObsidianProvider);
  const note = await obsidianProvider.updateActiveNote(
    appContext,
    input.content,
  );

  return {
    path: note.path,
    content: note.content,
    size: note.stat?.size ?? input.content.length,
  };
}

// Response formatter
function responseFormatter(result: ToolResponse): ContentBlock[] {
  const md = markdown()
    .h1('Note Updated Successfully')
    .blankLine()
    .list([
      `**Path:** ${result.path}`,
      `**Size:** ${result.size.toLocaleString()} bytes`,
      `**Content length:** ${result.content.length} characters`,
    ])
    .blankLine();

  // Show preview of new content (first 200 chars)
  const preview =
    result.content.length > 200
      ? `${result.content.slice(0, 197)}...`
      : result.content;

  md.h2('Content Preview').codeBlock(preview, 'markdown');

  return [{ type: 'text', text: md.build() }];
}

// Tool definition
export const obsidianUpdateActiveNoteTool: ToolDefinition<
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
