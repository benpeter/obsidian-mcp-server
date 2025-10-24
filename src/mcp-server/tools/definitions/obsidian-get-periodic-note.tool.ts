/**
 * @fileoverview Tool definition for retrieving periodic notes in Obsidian.
 * @module src/mcp-server/tools/definitions/obsidian-get-periodic-note.tool
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

const TOOL_NAME = 'obsidian_get_periodic_note';
const TOOL_TITLE = 'Get Periodic Note';
const TOOL_DESCRIPTION =
  'Retrieves a periodic note (daily, weekly, monthly, quarterly, or yearly) from Obsidian. You can get the note for the current period or a specific date by providing year, month, and/or day parameters. This tool requires the Periodic Notes plugin or a compatible alternative to be installed.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

// Input Schema
const InputSchema = z
  .object({
    period: z
      .enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
      .describe(
        'The type of periodic note to retrieve, such as daily, weekly, or monthly.',
      ),
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
    includeMetadata: z
      .boolean()
      .default(true)
      .describe(
        'Set to `true` to include parsed metadata like tags, headings, and wikilinks in the response. [Default: true]',
      ),
  })
  .describe('Parameters for retrieving a periodic note.');

// Output Schema
const OutputSchema = z
  .object({
    period: z
      .string()
      .describe('The type of periodic note that was retrieved.'),
    path: z.string().describe('The file path of the periodic note.'),
    content: z.string().describe('The full content of the note as a string.'),
    frontmatter: z
      .record(z.unknown())
      .optional()
      .describe('The parsed YAML frontmatter, if it is present.'),
    tags: z
      .array(z.string())
      .optional()
      .describe('An array of tags found in the note.'),
    headings: z
      .array(
        z.object({
          level: z.number().describe('The heading level, from 1 to 6.'),
          text: z.string().describe('The text content of the heading.'),
        }),
      )
      .optional()
      .describe('An array of headings found in the note.'),
    wikilinks: z
      .array(z.string())
      .optional()
      .describe('An array of wikilink targets found in the note.'),
    stat: z
      .object({
        ctime: z
          .number()
          .describe('The creation time, as milliseconds since epoch.'),
        mtime: z
          .number()
          .describe('The modification time, as milliseconds since epoch.'),
        size: z.number().describe('The file size in bytes.'),
      })
      .optional()
      .describe('File statistics for the note.'),
    dateParams: z
      .object({
        year: z
          .number()
          .optional()
          .describe('The year that was used for retrieval.'),
        month: z
          .number()
          .optional()
          .describe('The month that was used for retrieval.'),
        day: z
          .number()
          .optional()
          .describe('The day that was used for retrieval.'),
      })
      .optional()
      .describe(
        'The date parameters used for the operation, if they were specified.',
      ),
  })
  .describe('The data of the periodic note.');

type ToolInput = z.infer<typeof InputSchema>;
type ToolResponse = z.infer<typeof OutputSchema>;

// Pure business logic
async function toolLogic(
  input: ToolInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<ToolResponse> {
  logger.debug('Getting periodic note from Obsidian', {
    ...appContext,
    period: input.period,
    year: input.year,
    month: input.month,
    day: input.day,
  });

  const obsidianProvider =
    container.resolve<IObsidianProvider>(ObsidianProvider);
  const note = await obsidianProvider.getPeriodicNote(appContext, {
    period: input.period,
    ...(input.year !== undefined && { year: input.year }),
    ...(input.month !== undefined && { month: input.month }),
    ...(input.day !== undefined && { day: input.day }),
  });

  // Build response
  const response: ToolResponse = {
    period: input.period,
    path: note.path,
    content: note.content,
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

  // Add frontmatter if available
  if (note.frontmatter && Object.keys(note.frontmatter).length > 0) {
    response.frontmatter = note.frontmatter;
  }

  // Add enriched metadata if requested
  if (input.includeMetadata) {
    const enriched = note as typeof note & {
      tags?: string[];
      headings?: Array<{ level: number; text: string }>;
      wikilinks?: string[];
    };

    if (enriched.tags) response.tags = enriched.tags;
    if (enriched.headings) response.headings = enriched.headings;
    if (enriched.wikilinks) response.wikilinks = enriched.wikilinks;
  }

  // Add file stats if available
  if (note.stat) {
    response.stat = {
      ctime: note.stat.ctime,
      mtime: note.stat.mtime,
      size: note.stat.size,
    };
  }

  return response;
}

// Response formatter
function responseFormatter(result: ToolResponse): ContentBlock[] {
  const md = markdown()
    .h1(
      `${result.period.charAt(0).toUpperCase() + result.period.slice(1)} Note`,
    )
    .blankLine();

  // Period and date info
  const periodInfo = [`**Period:** ${result.period}`];
  if (result.dateParams) {
    const dateParts: string[] = [];
    if (result.dateParams.year !== undefined)
      dateParts.push(`${result.dateParams.year}`);
    if (result.dateParams.month !== undefined)
      dateParts.push(`${result.dateParams.month.toString().padStart(2, '0')}`);
    if (result.dateParams.day !== undefined)
      dateParts.push(`${result.dateParams.day.toString().padStart(2, '0')}`);
    if (dateParts.length > 0) {
      periodInfo.push(`**Date:** ${dateParts.join('-')}`);
    }
  } else {
    periodInfo.push('**Date:** Current period');
  }
  periodInfo.push(`**Path:** ${result.path}`);

  md.list(periodInfo).blankLine();

  // Metadata section
  if (result.stat) {
    md.h2('Metadata')
      .list([
        `Created: ${new Date(result.stat.ctime).toISOString()}`,
        `Modified: ${new Date(result.stat.mtime).toISOString()}`,
        `Size: ${result.stat.size.toLocaleString()} bytes`,
      ])
      .blankLine();
  }

  // Tags, headings, wikilinks
  if (result.tags && result.tags.length > 0) {
    md.text(`**Tags:** ${result.tags.map((t) => `#${t}`).join(', ')}\n`);
  }
  if (result.headings && result.headings.length > 0) {
    md.text(`**Headings:** ${result.headings.length} found\n`);
  }
  if (result.wikilinks && result.wikilinks.length > 0) {
    md.text(`**Links:** ${result.wikilinks.length} wikilinks\n`);
  }

  if (result.tags || result.headings || result.wikilinks) {
    md.blankLine();
  }

  // Frontmatter section
  if (result.frontmatter && Object.keys(result.frontmatter).length > 0) {
    md.h2('Frontmatter')
      .codeBlock(JSON.stringify(result.frontmatter, null, 2), 'yaml')
      .blankLine();
  }

  // Content
  md.h2('Content').hr().blankLine().text(result.content);

  return [{ type: 'text', text: md.build() }];
}

// Tool definition
export const obsidianGetPeriodicNoteTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: TOOL_ANNOTATIONS,
  logic: withToolAuth(['tool:obsidian_note:read'], toolLogic),
  responseFormatter,
};
