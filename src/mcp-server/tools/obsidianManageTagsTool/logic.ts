/**
 * @fileoverview Core logic for the 'obsidian_manage_tags' tool.
 * @module src/mcp-server/tools/obsidianManageTagsTool/logic
 */

import { z } from "zod";
import { components } from "../../../services/obsidianRestAPI/generated-types.js";
import {
  ObsidianRestApiService,
  PatchOptions,
} from "../../../services/obsidianRestAPI/index.js";
import { resolveVaultPath } from "../../../services/obsidianRestAPI/utils/pathResolver.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { type RequestContext } from "../../../utils/index.js";
import { sanitization } from "../../../utils/security/sanitization.js";

type NoteJson = components["schemas"]["NoteJson"];

// 1. DEFINE the Zod input schema.
export const ObsidianManageTagsInputSchema = z.object({
  filePath: z
    .string()
    .min(1)
    .describe(
      "The vault-relative path to the target note (e.g., 'journal/2025-06-12.md').",
    ),
  operation: z
    .enum(["add", "remove", "list"])
    .describe(
      "The tag operation to perform: 'add' to include new tags, 'remove' to delete existing tags, or 'list' to view all current tags.",
    ),
  tags: z
    .array(z.string())
    .describe(
      "An array of tag names to be processed. The '#' prefix should be omitted (e.g., use 'project/active', not '#project/active').",
    ),
});

// 2. DEFINE the Zod response schema.
export const ObsidianManageTagsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  currentTags: z.array(z.string()),
});

// 3. INFER and export TypeScript types.
export type ObsidianManageTagsInput = z.infer<
  typeof ObsidianManageTagsInputSchema
>;
export type ObsidianManageTagsOutput = z.infer<
  typeof ObsidianManageTagsOutputSchema
>;

/**
 * 4. IMPLEMENT the core logic function.
 * @throws {McpError} If the logic encounters an unrecoverable issue.
 */
export async function obsidianManageTagsLogic(
  params: ObsidianManageTagsInput,
  context: RequestContext,
  obsidianService: ObsidianRestApiService,
): Promise<ObsidianManageTagsOutput> {
  const { filePath, operation, tags: inputTags } = params;
  const sanitizedTags = inputTags.map((t) => sanitization.sanitizeTagName(t));

  const effectiveFilePath = await resolveVaultPath(
    filePath,
    context,
    (fp, ctx) => obsidianService.getFileMetadata(fp, ctx),
    (dp, ctx) => obsidianService.listFiles(dp, ctx),
  );

  const initialNote = (await obsidianService.getFileContent(
    effectiveFilePath,
    "json",
    context,
  )) as NoteJson;
  const currentTags = initialNote.tags ?? [];

  if (operation === "list") {
    return {
      success: true,
      message: "Successfully listed all tags.",
      currentTags,
    };
  }

  const frontmatter = initialNote.frontmatter ?? {};
  const frontmatterTags = Array.isArray(frontmatter.tags)
    ? frontmatter.tags.map(String)
    : [];

  if (operation === "add") {
    const tagsToAdd = sanitizedTags.filter((t) => !frontmatterTags.includes(t));
    if (tagsToAdd.length === 0) {
      return {
        success: true,
        message:
          "No new tags to add; all provided tags already exist in frontmatter.",
        currentTags,
      };
    }
    const newTags = [...new Set([...frontmatterTags, ...tagsToAdd])];
    const patchOptions: PatchOptions = {
      operation: "replace",
      targetType: "frontmatter",
      target: "tags",
      createTargetIfMissing: true,
      contentType: "application/json",
    };
    await obsidianService.patchFile(
      effectiveFilePath,
      JSON.stringify(newTags),
      patchOptions,
      context,
    );
    const finalNote = (await obsidianService.getFileContent(
      effectiveFilePath,
      "json",
      context,
    )) as NoteJson;
    return {
      success: true,
      message: `Successfully added tags: ${tagsToAdd.join(", ")}.`,
      currentTags: finalNote.tags ?? [],
    };
  }

  if (operation === "remove") {
    const tagsToRemoveSet = new Set(sanitizedTags);
    const newTags = frontmatterTags.filter((t) => !tagsToRemoveSet.has(t));

    if (newTags.length === frontmatterTags.length) {
      return {
        success: true,
        message:
          "No tags to remove; none of the provided tags exist in frontmatter.",
        currentTags,
      };
    }

    const patchOptions: PatchOptions = {
      operation: "replace",
      targetType: "frontmatter",
      target: "tags",
      contentType: "application/json",
    };
    await obsidianService.patchFile(
      effectiveFilePath,
      JSON.stringify(newTags.length > 0 ? newTags : null),
      patchOptions,
      context,
    );

    const finalNote = (await obsidianService.getFileContent(
      effectiveFilePath,
      "json",
      context,
    )) as NoteJson;
    return {
      success: true,
      message: `Successfully removed tags from frontmatter.`,
      currentTags: finalNote.tags ?? [],
    };
  }

  throw new McpError(
    BaseErrorCode.VALIDATION_ERROR,
    `Invalid operation: ${operation}`,
  );
}
