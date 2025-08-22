/**
 * @fileoverview Core logic for the 'obsidian_manage_frontmatter' tool.
 * @module src/mcp-server/tools/obsidianManageFrontmatterTool/logic
 */

import { z } from "zod";
import { components } from "../../../services/obsidianRestAPI/generated-types.js";
import {
  ObsidianRestApiService,
  PatchOptions,
} from "../../../services/obsidianRestAPI/index.js";
import { resolveVaultPath } from "../../../services/obsidianRestAPI/utils/pathResolver.js";
import { type RequestContext } from "../../../utils/index.js";
import { JsonValueSchema } from "../schemas/jsonSchema.js";

type NoteJson = components["schemas"]["NoteJson"];

// 1. DEFINE the Zod input schema.
export const BaseObsidianManageFrontmatterInputSchema = z.object({
  filePath: z
    .string()
    .min(1)
    .describe(
      "The vault-relative path to the target note (e.g., 'projects/active/my-note.md').",
    ),
  operation: z
    .enum(["get", "set", "delete"])
    .describe(
      "The operation to perform on the frontmatter: 'get' to read a key, 'set' to create or update a key, or 'delete' to remove a key.",
    ),
  key: z
    .string()
    .min(1)
    .describe(
      "The name of the frontmatter key to target, such as 'status', 'tags', or 'aliases'.",
    ),
  value: JsonValueSchema.optional().describe(
    "The value to assign when using the 'set' operation. Can be a string, number, boolean, array, or a JSON object.",
  ),
});

export const ObsidianManageFrontmatterInputSchema =
  BaseObsidianManageFrontmatterInputSchema.refine(
    (data) => !(data.operation === "set" && data.value === undefined),
    {
      message: "A 'value' is required when the 'operation' is 'set'.",
      path: ["value"],
    },
  );

// 2. DEFINE the Zod response schema.
export const ObsidianManageFrontmatterOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  value: JsonValueSchema.optional(),
});

// 3. INFER and export TypeScript types.
export type ObsidianManageFrontmatterInput = z.infer<
  typeof ObsidianManageFrontmatterInputSchema
>;
export type ObsidianManageFrontmatterOutput = z.infer<
  typeof ObsidianManageFrontmatterOutputSchema
>;

/**
 * Manages frontmatter for a specific Obsidian note.
 * @throws {McpError} If the logic encounters an unrecoverable issue.
 */
export async function obsidianManageFrontmatterLogic(
  params: ObsidianManageFrontmatterInput,
  context: RequestContext,
  obsidianService: ObsidianRestApiService,
): Promise<ObsidianManageFrontmatterOutput> {
  const { filePath, operation, key, value } = params;

  const effectiveFilePath = await resolveVaultPath(
    filePath,
    context,
    (fp, ctx) => obsidianService.getFileMetadata(fp, ctx),
    (dp, ctx) => obsidianService.listFiles(dp, ctx),
  );

  switch (operation) {
    case "get": {
      const note = (await obsidianService.getFileContent(
        effectiveFilePath,
        "json",
        context,
      )) as NoteJson;
      const retrievedValue = note.frontmatter?.[key];
      return {
        success: true,
        message: `Successfully retrieved key '${key}' from frontmatter.`,
        value: retrievedValue as z.infer<typeof JsonValueSchema>,
      };
    }

    case "set": {
      const patchOptions: PatchOptions = {
        operation: "replace",
        targetType: "frontmatter",
        target: key,
        createTargetIfMissing: true,
        contentType: "application/json",
      };
      await obsidianService.patchFile(
        effectiveFilePath,
        JSON.stringify(value),
        patchOptions,
        context,
      );
      return {
        success: true,
        message: `Successfully set key '${key}' in frontmatter.`,
        value: value,
      };
    }

    case "delete": {
      const note = (await obsidianService.getFileContent(
        effectiveFilePath,
        "json",
        context,
      )) as NoteJson;
      const frontmatter = note.frontmatter || {};
      if (key in frontmatter) {
        const patchOptions: PatchOptions = {
          operation: "replace",
          targetType: "frontmatter",
          target: key,
          contentType: "application/json",
        };
        await obsidianService.patchFile(
          effectiveFilePath,
          JSON.stringify(null),
          patchOptions,
          context,
        );
        return {
          success: true,
          message: `Successfully deleted key '${key}' from frontmatter.`,
        };
      }
      return {
        success: true,
        message: `Key '${key}' not found in frontmatter; no action taken.`,
      };
    }
  }
}
