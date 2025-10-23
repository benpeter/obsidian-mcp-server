/**
 * @fileoverview Tool definition for retrieving the currently active note in Obsidian.
 * @module src/mcp-server/tools/definitions/obsidian-get-active-note.tool
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

const TOOL_NAME = 'obsidian_get_active_note';
const TOOL_TITLE = 'Get Active Note';
const TOOL_DESCRIPTION =
  'Retrieve the currently active note in Obsidian with its content and metadata. Returns the full note content, frontmatter, path, and file statistics. Read-only operation with no side effects.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

// Input Schema
const InputSchema = z
  .object({
    includeMetadata: z
      .boolean()
      .default(true)
      .describe(
        'Whether to include parsed metadata (tags, headings, wikilinks) in the response.',
      ),
  })
  .describe('Parameters for retrieving the active note.');

// Output Schema
const OutputSchema = z
  .object({
    path: z.string().describe('File path of the active note.'),
    content: z.string().describe('Full content of the note.'),
    frontmatter: z
      .record(z.unknown())
      .optional()
      .describe('Parsed YAML frontmatter if present.'),
    tags: z
      .array(z.string())
      .optional()
      .describe('Array of tags found in the note.'),
    headings: z
      .array(
        z.object({
          level: z.number().describe('Heading level (1-6).'),
          text: z.string().describe('Heading text content.'),
        }),
      )
      .optional()
      .describe('Array of headings found in the note.'),
    wikilinks: z
      .array(z.string())
      .optional()
      .describe('Array of wikilink targets found in the note.'),
    stat: z
      .object({
        ctime: z.number().describe('Creation time (milliseconds since epoch).'),
        mtime: z
          .number()
          .describe('Modification time (milliseconds since epoch).'),
        size: z.number().describe('File size in bytes.'),
      })
      .optional()
      .describe('File statistics.'),
  })
  .describe('Active note data.');

type ToolInput = z.infer<typeof InputSchema>;
type ToolResponse = z.infer<typeof OutputSchema>;

// Pure business logic
async function toolLogic(
  input: ToolInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<ToolResponse> {
  logger.debug('Getting active note from Obsidian', {
    ...appContext,
    toolInput: input,
  });

  const obsidianProvider =
    container.resolve<IObsidianProvider>(ObsidianProvider);
  const note = await obsidianProvider.getActiveNote(appContext);

  // Build response
  const response: ToolResponse = {
    path: note.path,
    content: note.content,
  };

  // Add frontmatter if available
  if (note.frontmatter && Object.keys(note.frontmatter).length > 0) {
    response.frontmatter = note.frontmatter as Record<string, unknown>;
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
  const md = markdown().h1(result.path).blankLine();

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
export const obsidianGetActiveNoteTool: ToolDefinition<
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
