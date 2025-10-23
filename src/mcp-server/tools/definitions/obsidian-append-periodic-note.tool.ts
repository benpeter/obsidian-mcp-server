/**
 * @fileoverview Tool definition for appending content to periodic notes in Obsidian.
 * @module src/mcp-server/tools/definitions/obsidian-append-periodic-note.tool
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

const TOOL_NAME = 'obsidian_append_periodic_note';
const TOOL_TITLE = 'Append to Periodic Note';
const TOOL_DESCRIPTION =
  'Append content to a periodic note (daily, weekly, monthly, quarterly, or yearly) in Obsidian. Can append to the current period note or a specific date. Automatically creates the note if it does not exist. Useful for journaling, logging, and time-based note capture.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

// Input Schema
const InputSchema = z
  .object({
    period: z
      .enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
      .describe(
        'Type of periodic note: daily, weekly, monthly, quarterly, or yearly.',
      ),
    content: z
      .string()
      .min(1)
      .describe(
        'Content to append to the periodic note. Will be added at the end of existing content.',
      ),
    year: z
      .number()
      .int()
      .min(1900)
      .max(2100)
      .optional()
      .describe(
        'Year for the periodic note (e.g., 2024). Omit for current period.',
      ),
    month: z
      .number()
      .int()
      .min(1)
      .max(12)
      .optional()
      .describe(
        'Month for the periodic note (1-12). Required for monthly/quarterly if year is specified.',
      ),
    day: z
      .number()
      .int()
      .min(1)
      .max(31)
      .optional()
      .describe(
        'Day of month for the periodic note (1-31). Required for daily/weekly if year/month specified.',
      ),
  })
  .describe('Parameters for appending to a periodic note.');

// Output Schema
const OutputSchema = z
  .object({
    period: z.string().describe('Type of periodic note updated.'),
    path: z.string().describe('Path of the updated periodic note.'),
    appendedLength: z
      .number()
      .describe('Length of content that was appended (in characters).'),
    totalLength: z
      .number()
      .describe('Total length of note after appending (in characters).'),
    size: z.number().describe('New file size in bytes.'),
    dateParams: z
      .object({
        year: z.number().optional().describe('Year used.'),
        month: z.number().optional().describe('Month used.'),
        day: z.number().optional().describe('Day used.'),
      })
      .optional()
      .describe('Date parameters used (if specified).'),
  })
  .describe('Append operation result.');

type ToolInput = z.infer<typeof InputSchema>;
type ToolResponse = z.infer<typeof OutputSchema>;

// Pure business logic
async function toolLogic(
  input: ToolInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<ToolResponse> {
  logger.debug('Appending content to periodic note', {
    ...appContext,
    period: input.period,
    appendedLength: input.content.length,
    year: input.year,
    month: input.month,
    day: input.day,
  });

  const obsidianProvider =
    container.resolve<IObsidianProvider>(ObsidianProvider);
  const note = await obsidianProvider.appendPeriodicNote(
    appContext,
    {
      period: input.period,
      ...(input.year !== undefined && { year: input.year }),
      ...(input.month !== undefined && { month: input.month }),
      ...(input.day !== undefined && { day: input.day }),
    },
    input.content,
  );

  const response: ToolResponse = {
    period: input.period,
    path: note.path,
    appendedLength: input.content.length,
    totalLength: note.content.length,
    size: note.stat?.size || 0,
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
  const md = markdown().h1('Content Appended to Periodic Note').blankLine();

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

  info.push(
    `**Appended:** ${result.appendedLength.toLocaleString()} characters`,
  );
  info.push(
    `**Total Length:** ${result.totalLength.toLocaleString()} characters`,
  );
  info.push(`**File Size:** ${result.size.toLocaleString()} bytes`);

  md.list(info);

  md.blankLine()
    .text('✅ Content successfully appended to periodic note.')
    .blankLine()
    .text(
      '_Note: The note was automatically created if it did not already exist._',
    );

  return [{ type: 'text', text: md.build() }];
}

// Tool definition
export const obsidianAppendPeriodicNoteTool: ToolDefinition<
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
