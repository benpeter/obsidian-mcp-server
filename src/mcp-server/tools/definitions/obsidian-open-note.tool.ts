/**
 * @fileoverview Tool definition for opening notes in the Obsidian UI.
 * @module src/mcp-server/tools/definitions/obsidian-open-note.tool
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

const TOOL_NAME = 'obsidian_open_note';
const TOOL_TITLE = 'Open Note';
const TOOL_DESCRIPTION =
  'Open a note in the Obsidian user interface. Brings the specified note into focus in the editor. Optionally open in a new pane (leaf) to preserve the current view. Useful for navigation and bringing notes to user attention.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true, // Opening the same note multiple times has the same effect
  openWorldHint: false,
};

// Input Schema
const InputSchema = z
  .object({
    path: z
      .string()
      .min(1)
      .describe(
        'Path to the note to open, relative to vault root. Can include or omit .md extension (e.g., "folder/note" or "folder/note.md").',
      ),
    newLeaf: z
      .boolean()
      .default(false)
      .describe(
        'Whether to open the note in a new pane (leaf). If false, opens in the current pane.',
      ),
  })
  .describe('Parameters for opening a note in Obsidian.');

// Output Schema
const OutputSchema = z
  .object({
    path: z.string().describe('Path of the note that was opened.'),
    newLeaf: z.boolean().describe('Whether the note was opened in a new pane.'),
    message: z.string().describe('Result message.'),
  })
  .describe('Note open result.');

type ToolInput = z.infer<typeof InputSchema>;
type ToolResponse = z.infer<typeof OutputSchema>;

// Pure business logic
async function toolLogic(
  input: ToolInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<ToolResponse> {
  logger.info('Opening note in Obsidian UI', {
    ...appContext,
    path: input.path,
    newLeaf: input.newLeaf,
  });

  const obsidianProvider =
    container.resolve<IObsidianProvider>(ObsidianProvider);
  await obsidianProvider.openNote(appContext, input.path, input.newLeaf);

  return {
    path: input.path,
    newLeaf: input.newLeaf,
    message: `Note "${input.path}" opened successfully in ${input.newLeaf ? 'new pane' : 'current pane'}.`,
  };
}

// Response formatter
function responseFormatter(result: ToolResponse): ContentBlock[] {
  const md = markdown().h1('Note Opened').blankLine();

  md.text('✅ **Success**').blankLine();

  md.list([
    `**Note:** ${result.path}`,
    `**Location:** ${result.newLeaf ? 'New pane' : 'Current pane'}`,
  ]);

  md.blankLine().text(result.message).blankLine();

  if (result.newLeaf) {
    md.text(
      '_The note was opened in a new pane, preserving your current view._',
    );
  } else {
    md.text(
      '_The note was opened in the current pane, replacing the previous content._',
    );
  }

  md.blankLine().text(
    '_Tip: Use `newLeaf: true` to open multiple notes side-by-side for comparison or reference._',
  );

  return [{ type: 'text', text: md.build() }];
}

// Tool definition
export const obsidianOpenNoteTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: TOOL_ANNOTATIONS,
  logic: withToolAuth(['tool:obsidian_ui:navigate'], toolLogic),
  responseFormatter,
};
