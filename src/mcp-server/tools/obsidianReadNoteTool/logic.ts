/**
 * @fileoverview Defines the core logic, schemas, and types for the obsidian_read_note tool.
 * @module src/mcp-server/tools/obsidianReadNoteTool/logic
 */

import { z } from "zod";
import {
  logger,
  type RequestContext,
  countTokens,
} from "../../../utils/index.js";
import { formatTimestamp } from "../../../services/obsidianRestAPI/utils/index.js";
import { ObsidianRestApiService } from "../../../services/obsidianRestAPI/service.js";
import { components } from "../../../services/obsidianRestAPI/generated-types.js";
import { JsonValue, JsonValueSchema } from "../schemas/jsonSchema.js";
import { resolveVaultPath } from "../../../services/obsidianRestAPI/utils/pathResolver.js";

type NoteJson = components["schemas"]["NoteJson"];

const StatSchema = z.object({
  size: z.number(),
  mtime: z.number(),
  ctime: z.number(),
});

const NoteJsonSchema = z.object({
  content: z.string().optional(),
  frontmatter: z.record(z.string(), JsonValueSchema).optional(),
  stat: StatSchema,
  tags: z.array(z.string()),
  path: z.string(),
});

// 1. DEFINE the Zod input schema.
export const ObsidianReadNoteInputSchema = z.object({
  filePath: z
    .string()
    .min(1)
    .describe(
      'The vault-relative path to the target Obsidian note (e.g., "developer/github/tips.md"). Tries case-sensitive first, then case-insensitive fallback.',
    ),
  format: z
    .enum(["markdown", "json"])
    .default("markdown")
    .describe(
      "The desired format for the note's content. 'markdown' returns a raw string, while 'json' provides a structured object.",
    ),
  includeStat: z
    .boolean()
    .default(false)
    .describe(
      "If true and format is 'markdown', includes file stats in the response. Stats are always included for the 'json' format.",
    ),
});

// 2. DEFINE the Zod response schema.
const FormattedStatSchema = z.object({
  createdTime: z.string(),
  modifiedTime: z.string(),
  tokenCountEstimate: z.number(),
});

export const ObsidianReadNoteOutputSchema = z.object({
  content: z.union([z.string(), NoteJsonSchema]),
  stats: FormattedStatSchema.optional(),
});

// 3. INFER and export TypeScript types.
export type ObsidianReadNoteInput = z.infer<typeof ObsidianReadNoteInputSchema>;
export type ObsidianReadNoteOutput = z.infer<
  typeof ObsidianReadNoteOutputSchema
>;

type NoteStat = components["schemas"]["NoteJson"]["stat"];

async function createFormattedStatWithTokenCount(
  stat: NoteStat,
  content: string,
  context: RequestContext,
) {
  const tokenCount = await countTokens(content, context);
  return {
    createdTime: formatTimestamp(stat.ctime, context),
    modifiedTime: formatTimestamp(stat.mtime, context),
    tokenCountEstimate: tokenCount,
  };
}

/**
 * 4. IMPLEMENT the core logic function.
 * @throws {McpError} If the logic encounters an unrecoverable issue.
 */
export async function obsidianReadNoteLogic(
  params: ObsidianReadNoteInput,
  context: RequestContext,
  obsidianService: ObsidianRestApiService,
): Promise<ObsidianReadNoteOutput> {
  const { filePath: originalFilePath, format, includeStat } = params;
  logger.debug(`Executing obsidianReadNoteLogic for: ${originalFilePath}`, {
    ...context,
    params,
  });

  const effectiveFilePath = await resolveVaultPath(
    originalFilePath,
    context,
    (fp, ctx) => obsidianService.getFileMetadata(fp, ctx),
    (dp, ctx) => obsidianService.listFiles(dp, ctx),
  );

  const noteJson = (await obsidianService.getFileContent(
    effectiveFilePath,
    "json",
    context,
  )) as NoteJson;

  const formattedStat = noteJson.stat
    ? await createFormattedStatWithTokenCount(
        noteJson.stat,
        noteJson.content ?? "",
        context,
      )
    : undefined;

  const response: ObsidianReadNoteOutput = {
    content:
      format === "json"
        ? ({
            ...noteJson,
            path: effectiveFilePath,
            frontmatter: noteJson.frontmatter as Record<string, JsonValue>,
          } as z.infer<typeof NoteJsonSchema>)
        : (noteJson.content ?? ""),
  };

  if (
    formattedStat &&
    (format === "json" || (format === "markdown" && includeStat))
  ) {
    response.stats = formattedStat;
  }

  return response;
}
