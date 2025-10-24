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
  "Lists files and directories at a specified path in the Obsidian vault, returning an array of files and folders with their types, basenames, and extensions. This is useful for exploring the vault's structure and discovering notes. If no path is specified, it defaults to the root directory.";

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
        'The directory path to list, relative to the vault root. Omit this or use an empty string to list the root directory.',
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .default(100)
      .describe(
        'The maximum number of items to return per page. [Default: 100, Max: 500]',
      ),
    offset: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe('The number of items to skip for pagination. [Default: 0]'),
  })
  .describe('Parameters for listing vault files.');

// Output Schema
const OutputSchema = z
  .object({
    path: z
      .string()
      .describe(
        'The directory path that was listed. An empty string indicates the vault root.',
      ),
    files: z
      .array(
        z.object({
          path: z.string().describe('The full path of the file or folder.'),
          type: z
            .enum(['file', 'folder'])
            .describe('Indicates whether the item is a file or a folder.'),
          basename: z
            .string()
            .describe(
              'The base name of the item, without the extension for files.',
            ),
          extension: z
            .string()
            .optional()
            .describe('The file extension, if the item is a file.'),
        }),
      )
      .describe('An array of files and folders found at the specified path.'),
    fileCount: z.number().describe('The number of files on the current page.'),
    folderCount: z
      .number()
      .describe('The number of folders on the current page.'),
    totalCount: z
      .number()
      .describe('The total number of items available at this path.'),
    limit: z
      .number()
      .describe('The maximum number of items returned per page.'),
    offset: z
      .number()
      .describe('The number of items that were skipped for pagination.'),
    hasMore: z
      .boolean()
      .describe(
        'Indicates whether more items are available on a subsequent page.',
      ),
  })
  .describe('The directory listing for a path in the vault.');

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
    limit: input.limit,
    offset: input.offset,
  });

  const obsidianProvider =
    container.resolve<IObsidianProvider>(ObsidianProvider);
  const allFiles = await obsidianProvider.listVaultFiles(
    appContext,
    input.path,
  );

  // Apply pagination
  const totalCount = allFiles.length;
  const paginatedFiles = allFiles.slice(
    input.offset,
    input.offset + input.limit,
  );
  const hasMore = input.offset + input.limit < totalCount;

  // Count files and folders in the current page
  const fileCount = paginatedFiles.filter((f) => f.type === 'file').length;
  const folderCount = paginatedFiles.filter((f) => f.type === 'folder').length;

  return {
    path: input.path || '',
    files: paginatedFiles.map((f) => ({
      path: f.path,
      type: f.type,
      basename: f.basename,
      extension: f.extension,
    })),
    fileCount,
    folderCount,
    totalCount,
    limit: input.limit,
    offset: input.offset,
    hasMore,
  };
}

// Response formatter
function responseFormatter(result: ToolResponse): ContentBlock[] {
  const md = markdown()
    .h1(`Vault Listing: ${result.path || '(root)'}`)
    .blankLine();

  // Pagination info
  const startIndex = result.offset + 1;
  const endIndex = Math.min(
    result.offset + result.files.length,
    result.totalCount,
  );

  // Summary stats
  md.text(
    `Showing **${startIndex}-${endIndex}** of **${result.totalCount}** items`,
  ).blankLine();
  md.text(
    `**${result.fileCount} files** and **${result.folderCount} folders** in this page`,
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

  // Pagination navigation hint
  if (result.hasMore) {
    md.blankLine().text(
      `_**More items available.** Use \`offset: ${result.offset + result.limit}\` to get the next page._`,
    );
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
