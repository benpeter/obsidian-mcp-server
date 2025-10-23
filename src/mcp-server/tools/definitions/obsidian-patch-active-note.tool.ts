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
  'Perform surgical updates to specific sections of the currently active note using PATCH operations. Supports targeting headings, blocks, or frontmatter with various insertion strategies (insert before/after start/end, or replace). Enables precise content modifications without rewriting the entire note.';

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
        'PATCH operation type: append (add after target), prepend (add before target), or replace (overwrite target).',
      ),
    targetType: z
      .enum(['heading', 'block', 'frontmatter'])
      .describe(
        'Type of target to patch: heading (markdown heading), block (block reference), or frontmatter (YAML frontmatter).',
      ),
    target: z
      .string()
      .min(1)
      .describe(
        'Target identifier: heading text for headings, block ID for blocks, or property key for frontmatter.',
      ),
    content: z
      .string()
      .min(0)
      .describe('Content to insert or use for replacement.'),
  })
  .describe('Parameters for patching the active note.');

// Output Schema
const OutputSchema = z
  .object({
    path: z.string().describe('File path of the patched note.'),
    operation: z.string().describe('PATCH operation that was performed.'),
    targetType: z.string().describe('Type of target that was patched.'),
    target: z.string().describe('Target identifier that was modified.'),
    contentLength: z
      .number()
      .describe('Total length of the note after patching.'),
    size: z.number().describe('New file size in bytes.'),
  })
  .describe('Patch operation result.');

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
