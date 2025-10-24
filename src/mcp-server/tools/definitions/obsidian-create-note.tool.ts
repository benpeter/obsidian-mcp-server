/**
 * @fileoverview Tool definition for creating or updating a note in Obsidian.
 * @module src/mcp-server/tools/definitions/obsidian-create-note.tool
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

const TOOL_NAME = 'obsidian_create_note';
const TOOL_TITLE = 'Create Note';
const TOOL_DESCRIPTION =
  "Creates a new note or updates an existing one in the Obsidian vault. It automatically creates parent directories if they don't exist and returns metadata for the created/updated note. If the note exists and `overwrite` is disabled, the operation will fail.";

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
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
        'The path where the note should be created, relative to the vault\'s root. You can include or omit the `.md` extension (e.g., "folder/note").',
      ),
    content: z
      .string()
      .min(0)
      .describe(
        'The content for the note. This can include frontmatter in YAML format.',
      ),
    overwrite: z
      .boolean()
      .default(false)
      .describe(
        'Set to `true` to overwrite the note if it already exists. If `false` and the note exists, the operation will fail to prevent data loss. [Default: false]',
      ),
  })
  .describe('Parameters for creating a new note.');

// Output Schema
const OutputSchema = z
  .object({
    path: z.string().describe('The path of the created or updated note.'),
    created: z
      .boolean()
      .describe(
        'Indicates whether a new note was created (`true`) or an existing note was updated (`false`).',
      ),
    contentLength: z
      .number()
      .describe("The length of the note's content in characters."),
    size: z.number().describe('The file size in bytes.'),
  })
  .describe('The result of the note creation operation.');

type ToolInput = z.infer<typeof InputSchema>;
type ToolResponse = z.infer<typeof OutputSchema>;

// Pure business logic
async function toolLogic(
  input: ToolInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<ToolResponse> {
  logger.debug('Creating note in Obsidian', {
    ...appContext,
    path: input.path,
    overwrite: input.overwrite,
    contentLength: input.content.length,
  });

  const obsidianProvider =
    container.resolve<IObsidianProvider>(ObsidianProvider);
  const note = await obsidianProvider.createNote(appContext, {
    path: input.path,
    content: input.content,
    overwrite: input.overwrite,
  });

  // Determine if this was a create or update
  // If the note has a ctime very close to mtime, it was likely just created
  const isNew = note.stat
    ? Math.abs((note.stat.ctime || 0) - (note.stat.mtime || 0)) < 1000
    : true;

  return {
    path: note.path,
    created: isNew,
    contentLength: note.content.length,
    size: note.stat?.size ?? note.content.length,
  };
}

// Response formatter
function responseFormatter(result: ToolResponse): ContentBlock[] {
  const action = result.created ? 'Created' : 'Updated';
  const md = markdown().h1(`${action} Note`).blankLine();

  md.list([
    `**Path:** ${result.path}`,
    `**Action:** ${action}`,
    `**Content Length:** ${result.contentLength.toLocaleString()} characters`,
    `**File Size:** ${result.size.toLocaleString()} bytes`,
  ]);

  if (result.created) {
    md.blankLine()
      .text('✅ Note successfully created.')
      .blankLine()
      .text(
        '_Tip: Parent directories were automatically created if they did not exist._',
      );
  } else {
    md.blankLine()
      .text('✅ Note successfully updated.')
      .blankLine()
      .text('_Note: Existing note was overwritten with new content._');
  }

  return [{ type: 'text', text: md.build() }];
}

// Tool definition
export const obsidianCreateNoteTool: ToolDefinition<
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
