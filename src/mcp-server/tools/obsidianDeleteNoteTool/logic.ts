/**
 * @fileoverview Core logic for the 'obsidian_delete_note' tool.
 * @module src/mcp-server/tools/obsidianDeleteNoteTool/logic
 */

import { z } from "zod";
import { logger, type RequestContext } from "../../../utils/index.js";
import { ObsidianRestApiService } from "../../../services/obsidianRestAPI/service.js";
import { resolveVaultPath } from "../../../services/obsidianRestAPI/utils/pathResolver.js";

export const ObsidianDeleteNoteInputSchema = z.object({
  filePath: z
    .string()
    .min(1)
    .describe(
      'The vault-relative path to the Obsidian note to be deleted (e.g., "archive/old-note.md"). Tries case-sensitive first, then case-insensitive fallback.',
    ),
});

export const ObsidianDeleteNoteOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type ObsidianDeleteNoteInput = z.infer<
  typeof ObsidianDeleteNoteInputSchema
>;
export type ObsidianDeleteNoteOutput = z.infer<
  typeof ObsidianDeleteNoteOutputSchema
>;

/**
 * Deletes a note in Obsidian, resolving the path case-insensitively if necessary.
 * @param params The validated input parameters.
 * @param context The request context for logging and tracing.
 * @param obsidianService An instance of the ObsidianRestApiService.
 * @returns A promise resolving with the structured response data.
 * @throws {McpError} If the file cannot be found or the delete operation fails.
 */
export async function obsidianDeleteNoteLogic(
  params: ObsidianDeleteNoteInput,
  context: RequestContext,
  obsidianService: ObsidianRestApiService,
): Promise<ObsidianDeleteNoteOutput> {
  const { filePath: originalFilePath } = params;
  logger.info(
    `Executing obsidianDeleteNoteLogic for path: '${originalFilePath}'`,
    {
      ...context,
      params,
    },
  );

  const effectiveFilePath = await resolveVaultPath(
    originalFilePath,
    context,
    (fp, ctx) => obsidianService.getFileMetadata(fp, ctx),
    (dp, ctx) => obsidianService.listFiles(dp, ctx),
  );

  await obsidianService.deleteFile(effectiveFilePath, context);

  const message =
    originalFilePath === effectiveFilePath
      ? `Obsidian note '${originalFilePath}' deleted successfully.`
      : `Obsidian note '${effectiveFilePath}' (found via case-insensitive match for '${originalFilePath}') deleted successfully.`;

  logger.info("obsidianDeleteNoteLogic completed successfully.", {
    ...context,
    result: message,
  });

  return {
    success: true,
    message,
  };
}
