/**
 * @fileoverview Tool definition for listing files and directories in the Obsidian vault.
 * @module src/mcp-server/tools/definitions/obsidian-list-vault-files.tool
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

const TOOL_NAME = 'obsidian_list_vault_files';
const TOOL_TITLE = 'List Vault Files';
const TOOL_DESCRIPTION =
  'List files and directories at a specified path in the Obsidian vault. Returns an array of files and folders with their types, basenames, and extensions. Useful for exploring vault structure and discovering available notes. Defaults to root directory if no path specified.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

// Input Schema
const InputSchema = z
  .object({
    path: z
      .string()
      .optional()
      .describe(
        'Directory path to list (relative to vault root). Omit or use empty string for vault root.',
      ),
  })
  .describe('Parameters for listing vault files.');

// Output Schema
const OutputSchema = z
  .object({
    path: z
      .string()
      .describe('The directory path that was listed (empty string for root).'),
    files: z
      .array(
        z.object({
          path: z.string().describe('Full path of the file or folder.'),
          type: z
            .enum(['file', 'folder'])
            .describe('Whether this is a file or folder.'),
          basename: z
            .string()
            .describe('Base name without extension (for files).'),
          extension: z
            .string()
            .optional()
            .describe('File extension (only for files).'),
        }),
      )
      .describe('Array of files and folders at the specified path.'),
    fileCount: z.number().describe('Number of files found.'),
    folderCount: z.number().describe('Number of folders found.'),
  })
  .describe('Vault directory listing.');

type ToolInput = z.infer<typeof InputSchema>;
type ToolResponse = z.infer<typeof OutputSchema>;

// Pure business logic
async function toolLogic(
  input: ToolInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<ToolResponse> {
  logger.debug('Listing vault files', {
    ...appContext,
    path: input.path || '(root)',
  });

  const obsidianProvider =
    container.resolve<IObsidianProvider>(ObsidianProvider);
  const files = await obsidianProvider.listVaultFiles(appContext, input.path);

  // Count files and folders
  const fileCount = files.filter((f) => f.type === 'file').length;
  const folderCount = files.filter((f) => f.type === 'folder').length;

  return {
    path: input.path || '',
    files: files.map((f) => ({
      path: f.path,
      type: f.type,
      basename: f.basename,
      extension: f.extension,
    })),
    fileCount,
    folderCount,
  };
}

// Response formatter
function responseFormatter(result: ToolResponse): ContentBlock[] {
  const md = markdown()
    .h1(`Vault Listing: ${result.path || '(root)'}`)
    .blankLine();

  // Summary stats
  md.text(
    `Found **${result.fileCount} files** and **${result.folderCount} folders**`,
  ).blankLine();

  if (result.files.length === 0) {
    md.text('_No files or folders found at this path._');
    return [{ type: 'text', text: md.build() }];
  }

  // Separate files and folders
  const folders = result.files.filter((f) => f.type === 'folder');
  const files = result.files.filter((f) => f.type === 'file');

  // List folders first
  if (folders.length > 0) {
    md.h2('Folders').blankLine();
    folders.forEach((folder) => {
      md.text(`- 📁 ${folder.basename}/\n`);
    });
    md.blankLine();
  }

  // Then list files
  if (files.length > 0) {
    md.h2('Files').blankLine();
    files.forEach((file) => {
      const ext = file.extension ? ` (${file.extension})` : '';
      md.text(`- 📄 ${file.basename}${ext}\n`);
    });
  }

  return [{ type: 'text', text: md.build() }];
}

// Tool definition
export const obsidianListVaultFilesTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: TOOL_ANNOTATIONS,
  logic: withToolAuth(['tool:obsidian_vault:read'], toolLogic),
  responseFormatter,
};
