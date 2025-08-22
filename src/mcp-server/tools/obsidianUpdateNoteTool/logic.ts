/**
 * @fileoverview Core logic for the 'obsidian_update_note' tool.
 * @module src/mcp-server/tools/obsidianUpdateNoteTool/logic
 */

import path from "node:path";
import { z } from "zod";
import {
  logger,
  retryWithDelay,
  type RequestContext,
} from "../../../utils/index.js";
import { createFormattedStatWithTokenCount } from "../../../services/obsidianRestAPI/utils/formatting.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { ObsidianRestApiService } from "../../../services/obsidianRestAPI/service.js";
import { components } from "../../../services/obsidianRestAPI/generated-types.js";
import { resolveVaultPath } from "../../../services/obsidianRestAPI/utils/pathResolver.js";

type NoteJson = components["schemas"]["NoteJson"];

// 1. DEFINE the Zod input schema.
export const BaseObsidianUpdateNoteInputSchema = z.object({
  targetType: z
    .enum(["filePath", "activeFile", "periodicNote"])
    .describe("The type of target note to modify."),
  content: z.string().describe("The content to write to the note."),
  targetIdentifier: z
    .string()
    .optional()
    .describe(
      "Identifier for the target, required if targetType is 'filePath' or 'periodicNote'. For 'filePath', this is the vault-relative path. For 'periodicNote', it's the period (e.g., 'daily', 'weekly').",
    ),
  modificationType: z
    .literal("wholeFile")
    .describe("Specifies that the entire file will be modified."),
  wholeFileMode: z
    .enum(["append", "prepend", "overwrite"])
    .describe(
      "The mode of operation: 'append' to add to the end, 'prepend' to add to the beginning, or 'overwrite' to replace the entire content.",
    ),
  createIfNeeded: z
    .boolean()
    .default(true)
    .describe(
      "If true, a new note will be created if the target does not exist.",
    ),
  overwriteIfExists: z
    .boolean()
    .default(false)
    .describe(
      "If true, an existing note will be overwritten. Use with caution. Only applicable when wholeFileMode is 'overwrite'.",
    ),
  returnContent: z
    .boolean()
    .default(false)
    .describe(
      "If true, the final content of the note will be returned in the response.",
    ),
});

export const ObsidianUpdateNoteInputSchema =
  BaseObsidianUpdateNoteInputSchema.refine(
    (data) =>
      !(
        (data.targetType === "filePath" ||
          data.targetType === "periodicNote") &&
        !data.targetIdentifier
      ),
    {
      message: "targetIdentifier is required for filePath or periodicNote",
      path: ["targetIdentifier"],
    },
  );

// 2. DEFINE the Zod response schema.
const FormattedStatSchema = z.object({
  createdTime: z.string(),
  modifiedTime: z.string(),
  tokenCountEstimate: z.number(),
});

export const ObsidianUpdateNoteOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  stats: FormattedStatSchema.optional(),
  finalContent: z.string().optional(),
});

// 3. INFER and export TypeScript types.
export type ObsidianUpdateNoteInput = z.infer<
  typeof ObsidianUpdateNoteInputSchema
>;
export type ObsidianUpdateNoteOutput = z.infer<
  typeof ObsidianUpdateNoteOutputSchema
>;

// Helper function
async function getTargetNote(
  targetType: string,
  targetIdentifier: string | undefined,
  obsidianService: ObsidianRestApiService,
  context: RequestContext,
): Promise<NoteJson | null> {
  try {
    if (targetType === "filePath" && targetIdentifier) {
      return (await obsidianService.getFileContent(
        targetIdentifier,
        "json",
        context,
      )) as NoteJson;
    }
    if (targetType === "activeFile") {
      return (await obsidianService.getActiveFile("json", context)) as NoteJson;
    }
    if (targetType === "periodicNote" && targetIdentifier) {
      return (await obsidianService.getPeriodicNote(
        targetIdentifier as any,
        "json",
        context,
      )) as NoteJson;
    }
    return null;
  } catch (error) {
    if (error instanceof McpError && error.code === BaseErrorCode.NOT_FOUND) {
      return null;
    }
    throw error;
  }
}

/**
 * 4. IMPLEMENT the core logic function.
 * @throws {McpError} If the logic encounters an unrecoverable issue.
 */
export async function obsidianUpdateNoteLogic(
  params: ObsidianUpdateNoteInput,
  context: RequestContext,
  obsidianService: ObsidianRestApiService,
): Promise<ObsidianUpdateNoteOutput> {
  const {
    targetType,
    targetIdentifier,
    content,
    wholeFileMode,
    createIfNeeded,
    overwriteIfExists,
    returnContent,
  } = params;

  let effectiveFilePath = targetIdentifier;
  if (targetType === "filePath" && targetIdentifier) {
    try {
      effectiveFilePath = await resolveVaultPath(
        targetIdentifier,
        context,
        (fp, ctx) => obsidianService.getFileMetadata(fp, ctx),
        (dp, ctx) => obsidianService.listFiles(dp, ctx),
      );
    } catch (error) {
      if (
        error instanceof McpError &&
        error.code === BaseErrorCode.NOT_FOUND &&
        createIfNeeded
      ) {
        // If the file doesn't exist and we're allowed to create it, we use the original path.
        effectiveFilePath = targetIdentifier;
      } else {
        // Otherwise, re-throw the error.
        throw error;
      }
    }
  }

  const existingNote = await getTargetNote(
    targetType,
    effectiveFilePath,
    obsidianService,
    context,
  );

  if (!existingNote && !createIfNeeded) {
    throw new McpError(
      BaseErrorCode.NOT_FOUND,
      `Target ${targetType} '${
        targetIdentifier ?? "(active)"
      }' not found, and 'createIfNeeded' is set to false.`,
    );
  }

  if (wholeFileMode === "overwrite" && existingNote && !overwriteIfExists) {
    throw new McpError(
      BaseErrorCode.CONFLICT,
      `Target ${targetType} '${
        targetIdentifier ?? "(active)"
      }' exists, and 'overwriteIfExists' is set to false.`,
    );
  }

  let finalContent = content;
  if (
    (wholeFileMode === "append" || wholeFileMode === "prepend") &&
    existingNote
  ) {
    const oldContent = existingNote.content ?? "";
    finalContent =
      wholeFileMode === "prepend" ? content + oldContent : oldContent + content;
  }

  // Perform the write operation
  try {
    switch (targetType) {
      case "filePath":
        await obsidianService.updateFileContent(
          effectiveFilePath!,
          finalContent,
          context,
        );
        break;
      case "activeFile":
        if (!existingNote) {
          throw new McpError(
            BaseErrorCode.VALIDATION_ERROR,
            "Cannot create a new note when targetType is 'activeFile'. The file must already be open in Obsidian.",
          );
        }
        await obsidianService.updateActiveFile(finalContent, context);
        break;
      case "periodicNote":
        await obsidianService.updatePeriodicNote(
          targetIdentifier as any,
          finalContent,
          context,
        );
        break;
    }
  } catch (error) {
    if (
      error instanceof McpError &&
      error.code === BaseErrorCode.NOT_FOUND &&
      targetType === "filePath" &&
      targetIdentifier &&
      targetIdentifier.includes("/")
    ) {
      const parentDir = path.posix.dirname(targetIdentifier);
      throw new McpError(
        BaseErrorCode.VALIDATION_ERROR,
        `Failed to create note. The parent directory '${parentDir}' may not exist. Please create it in Obsidian first.`,
      );
    }
    throw error;
  }

  // Retry fetching the final state to account for file system delays
  const finalState = await retryWithDelay(
    () => getTargetNote(targetType, targetIdentifier, obsidianService, context),
    {
      operationName: "getFinalNoteState",
      context,
      maxRetries: 3,
      delayMs: 500,
      shouldRetry: (err: unknown) =>
        err instanceof McpError && err.code === BaseErrorCode.NOT_FOUND,
    },
  );

  if (!finalState) {
    throw new McpError(
      BaseErrorCode.INTERNAL_ERROR,
      "Failed to retrieve note state after update operation.",
    );
  }

  const stats = finalState.stat
    ? await createFormattedStatWithTokenCount(
        finalState.stat,
        finalState.content ?? "",
        context,
      )
    : undefined;

  return {
    success: true,
    message: `Successfully updated note.`,
    stats: stats ?? undefined,
    finalContent: returnContent ? finalState.content : undefined,
  };
}
