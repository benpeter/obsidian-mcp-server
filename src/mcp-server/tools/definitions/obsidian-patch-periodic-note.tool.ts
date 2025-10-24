/**
 * @fileoverview Tool definition for patching specific sections of periodic notes in Obsidian.
 * @module src/mcp-server/tools/definitions/obsidian-patch-periodic-note.tool
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

const TOOL_NAME = 'obsidian_patch_periodic_note';
const TOOL_TITLE = 'Patch Periodic Note';
const TOOL_DESCRIPTION =
  'Performs surgical updates to specific sections of a periodic note using PATCH operations. It supports targeting headings, blocks, or frontmatter with various insertion strategies, allowing for precise modifications in time-based notes without rewriting the entire file.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
};

// Input Schema
const InputSchema = z
  .object({
    period: z
      .enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
      .describe(
        'The type of periodic note, such as daily, weekly, or monthly.',
      ),
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
    year: z
      .number()
      .int()
      .min(1900)
      .max(2100)
      .optional()
      .describe(
        'The year of the periodic note (e.g., 2024). Omit to use the current period.',
      ),
    month: z
      .number()
      .int()
      .min(1)
      .max(12)
      .optional()
      .describe(
        'The month of the periodic note (1-12). This is required for monthly or quarterly notes when a year is specified.',
      ),
    day: z
      .number()
      .int()
      .min(1)
      .max(31)
      .optional()
      .describe(
        'The day of the month for the periodic note (1-31). This is required for daily or weekly notes when a year and month are specified.',
      ),
  })
  .describe('Parameters for patching a periodic note.');

// Output Schema
const OutputSchema = z
  .object({
    period: z.string().describe('The type of periodic note that was patched.'),
    path: z.string().describe('The file path of the patched periodic note.'),
    operation: z.string().describe('The PATCH operation that was performed.'),
    targetType: z.string().describe('The type of target that was patched.'),
    target: z.string().describe('The target identifier that was modified.'),
    contentLength: z
      .number()
      .describe('The total length of the note after patching.'),
    size: z.number().describe('The new file size in bytes.'),
    dateParams: z
      .object({
        year: z.number().optional().describe('The year that was used.'),
        month: z.number().optional().describe('The month that was used.'),
        day: z.number().optional().describe('The day that was used.'),
      })
      .optional()
      .describe(
        'The date parameters used for the operation, if they were specified.',
      ),
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
  logger.debug('Patching periodic note section', {
    ...appContext,
    period: input.period,
    operation: input.operation,
    targetType: input.targetType,
    target: input.target,
    year: input.year,
    month: input.month,
    day: input.day,
  });

  const obsidianProvider =
    container.resolve<IObsidianProvider>(ObsidianProvider);
  const note = await obsidianProvider.patchPeriodicNote(
    appContext,
    {
      period: input.period,
      ...(input.year !== undefined && { year: input.year }),
      ...(input.month !== undefined && { month: input.month }),
      ...(input.day !== undefined && { day: input.day }),
    },
    {
      operation: input.operation,
      targetType: input.targetType,
      target: input.target,
      content: input.content,
    },
  );

  const response: ToolResponse = {
    period: input.period,
    path: note.path,
    operation: input.operation,
    targetType: input.targetType,
    target: input.target,
    contentLength: note.content.length,
    size: note.stat?.size ?? note.content.length,
  };

  // Add date parameters if specified
  if (
    input.year !== undefined ||
    input.month !== undefined ||
    input.day !== undefined
  ) {
    response.dateParams = {
      year: input.year,
      month: input.month,
      day: input.day,
    };
  }

  return response;
}

// Response formatter
function responseFormatter(result: ToolResponse): ContentBlock[] {
  const md = markdown().h1('Periodic Note Section Patched').blankLine();

  const info = [`**Period:** ${result.period}`, `**Note:** ${result.path}`];

  if (result.dateParams) {
    const dateParts: string[] = [];
    if (result.dateParams.year !== undefined)
      dateParts.push(`${result.dateParams.year}`);
    if (result.dateParams.month !== undefined)
      dateParts.push(`${result.dateParams.month.toString().padStart(2, '0')}`);
    if (result.dateParams.day !== undefined)
      dateParts.push(`${result.dateParams.day.toString().padStart(2, '0')}`);
    if (dateParts.length > 0) {
      info.push(`**Date:** ${dateParts.join('-')}`);
    }
  } else {
    info.push('**Date:** Current period');
  }

  info.push(`**Operation:** ${result.operation}`);
  info.push(`**Target Type:** ${result.targetType}`);
  info.push(`**Target:** ${result.target}`);
  info.push(
    `**Total Length:** ${result.contentLength.toLocaleString()} characters`,
  );
  info.push(`**File Size:** ${result.size.toLocaleString()} bytes`);

  md.list(info);

  md.blankLine()
    .text('✅ Periodic note section successfully patched.')
    .blankLine();

  // Add contextual tips based on operation
  if (result.operation === 'replace') {
    md.text(
      `_Note: The ${result.targetType} "${result.target}" was replaced with new content._`,
    );
  } else if (result.operation.startsWith('insert-before')) {
    md.text(
      `_Note: Content was inserted before the ${result.targetType} "${result.target}"._`,
    );
  } else if (result.operation.startsWith('insert-after')) {
    md.text(
      `_Note: Content was inserted after the ${result.targetType} "${result.target}"._`,
    );
  }

  return [{ type: 'text', text: md.build() }];
}

// Tool definition
export const obsidianPatchPeriodicNoteTool: ToolDefinition<
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
