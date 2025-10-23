/**
 * @fileoverview Tool definition for deleting a note in Obsidian.
 * @module src/mcp-server/tools/definitions/obsidian-delete-note.tool
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
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';

const TOOL_NAME = 'obsidian_delete_note';
const TOOL_TITLE = 'Delete Note';
const TOOL_DESCRIPTION =
  'Delete a note from the Obsidian vault. This is a destructive and irreversible operation. Requires explicit confirmation via the confirm parameter set to true. Use with caution as deleted notes cannot be recovered unless backed up externally.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true, // Deleting same note twice has same effect
  openWorldHint: false,
};

// Input Schema
const InputSchema = z
  .object({
    path: z
      .string()
      .min(1)
      .describe(
        'Path to the note to delete, relative to vault root. Can include or omit .md extension (e.g., "folder/note" or "folder/note.md").',
      ),
    confirm: z
      .boolean()
      .describe(
        'Explicit confirmation required to delete the note. Must be set to true to proceed with deletion. This safety check prevents accidental deletions.',
      ),
  })
  .describe('Parameters for deleting a note.');

// Output Schema
const OutputSchema = z
  .object({
    path: z.string().describe('Path of the deleted note.'),
    deleted: z.boolean().describe('Whether the note was successfully deleted.'),
    message: z.string().describe('Confirmation message.'),
  })
  .describe('Deletion result.');

type ToolInput = z.infer<typeof InputSchema>;
type ToolResponse = z.infer<typeof OutputSchema>;

// Pure business logic
async function toolLogic(
  input: ToolInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<ToolResponse> {
  // Safety check: require explicit confirmation
  if (!input.confirm) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'Deletion requires explicit confirmation. Set confirm parameter to true to proceed.',
      {
        path: input.path,
        confirm: input.confirm,
      },
    );
  }

  logger.warning('Deleting note from Obsidian', {
    ...appContext,
    path: input.path,
  });

  const obsidianProvider =
    container.resolve<IObsidianProvider>(ObsidianProvider);
  await obsidianProvider.deleteNote(appContext, input.path);

  return {
    path: input.path,
    deleted: true,
    message: `Note "${input.path}" has been permanently deleted.`,
  };
}

// Response formatter
function responseFormatter(result: ToolResponse): ContentBlock[] {
  const md = markdown().h1('Note Deleted').blankLine();

  if (result.deleted) {
    md.text('⚠️ **IMPORTANT: This action is irreversible**').blankLine();
    md.list([
      `**Deleted Note:** ${result.path}`,
      `**Status:** Successfully deleted`,
    ]);

    md.blankLine()
      .text('🗑️ The note has been permanently removed from the vault.')
      .blankLine()
      .text(
        '_Warning: Unless you have external backups, this note cannot be recovered._',
      )
      .blankLine()
      .text(
        '_Tip: Consider using git version control or regular vault backups to prevent data loss._',
      );
  } else {
    md.text('❌ Note deletion failed.').blankLine().text(result.message);
  }

  return [{ type: 'text', text: md.build() }];
}

// Tool definition
export const obsidianDeleteNoteTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: TOOL_ANNOTATIONS,
  logic: withToolAuth(['tool:obsidian_note:delete'], toolLogic),
  responseFormatter,
};
