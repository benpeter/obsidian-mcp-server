/**
 * @fileoverview Tool definition for patching specific sections of the active note.
 * @module src/mcp-server/tools/definitions/obsidian-patch-active-note.tool
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

const TOOL_NAME = 'obsidian_patch_active_note';
const TOOL_TITLE = 'Patch Active Note';
const TOOL_DESCRIPTION =
  'Performs surgical updates to specific sections of the currently active note using PATCH operations. This tool supports targeting headings, blocks, or frontmatter with various insertion strategies (such as inserting before or after, or replacing), enabling precise modifications without rewriting the entire note.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
};

// Input Schema
const InputSchema = z
  .object({
    operation: z
      .enum(['append', 'prepend', 'replace'])
      .describe(
        'The PATCH operation to perform: `append` (add after target), `prepend` (add before target), or `replace` (overwrite target).',
      ),
    targetType: z
      .enum(['heading', 'block', 'frontmatter'])
      .describe(
        'The type of target to patch, which can be a `heading` (markdown heading), `block` (block reference), or `frontmatter` (YAML frontmatter).',
      ),
    target: z
      .string()
      .min(1)
      .describe(
        'The identifier for the target, such as the heading text for headings, the block ID for blocks, or the property key for frontmatter.',
      ),
    content: z
      .string()
      .min(0)
      .describe('The content to be inserted or used for replacement.'),
  })
  .describe('Parameters for patching the active note.');

// Output Schema
const OutputSchema = z
  .object({
    path: z.string().describe('The file path of the patched note.'),
    operation: z.string().describe('The PATCH operation that was performed.'),
    targetType: z.string().describe('The type of target that was patched.'),
    target: z.string().describe('The target identifier that was modified.'),
    contentLength: z
      .number()
      .describe('The total length of the note after patching.'),
    size: z.number().describe('The new file size in bytes.'),
  })
  .describe('The result of the patch operation.');

type ToolInput = z.infer<typeof InputSchema>;
type ToolResponse = z.infer<typeof OutputSchema>;

// Pure business logic
async function toolLogic(
  input: ToolInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<ToolResponse> {
  logger.debug('Patching active note section', {
    ...appContext,
    operation: input.operation,
    targetType: input.targetType,
    target: input.target,
  });

  const obsidianProvider =
    container.resolve<IObsidianProvider>(ObsidianProvider);
  const note = await obsidianProvider.patchActiveNote(appContext, {
    operation: input.operation,
    targetType: input.targetType,
    target: input.target,
    content: input.content,
  });

  return {
    path: note.path,
    operation: input.operation,
    targetType: input.targetType,
    target: input.target,
    contentLength: note.content.length,
    size: note.stat?.size ?? note.content.length,
  };
}

// Response formatter
function responseFormatter(result: ToolResponse): ContentBlock[] {
  const md = markdown()
    .h1('Note Patched Successfully')
    .blankLine()
    .list([
      `**Path:** ${result.path}`,
      `**Operation:** ${result.operation}`,
      `**Target Type:** ${result.targetType}`,
      `**Target:** "${result.target}"`,
      `**Content length:** ${result.contentLength.toLocaleString()} characters`,
      `**Size:** ${result.size.toLocaleString()} bytes`,
    ]);

  return [{ type: 'text', text: md.build() }];
}

// Tool definition
export const obsidianPatchActiveNoteTool: ToolDefinition<
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
