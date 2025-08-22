/**
 * @fileoverview Core logic for the 'obsidian_search_replace' tool.
 * @module src/mcp-server/tools/obsidianSearchReplaceTool/logic
 */

import { z } from "zod";
import {
  logger,
  type RequestContext,
  countTokens,
} from "../../../utils/index.js";
import { formatTimestamp } from "../../../services/obsidianRestAPI/utils/index.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { resolveVaultPath } from "../../../services/obsidianRestAPI/utils/pathResolver.js";
import { ObsidianRestApiService } from "../../../services/obsidianRestAPI/service.js";
import { components } from "../../../services/obsidianRestAPI/generated-types.js";

type NoteJson = components["schemas"]["NoteJson"];

// 1. DEFINE the Zod input schema.
const ReplacementBlockSchema = z.object({
  search: z.string().min(1),
  replace: z.string(),
});

export const BaseObsidianSearchReplaceInputSchema = z.object({
  targetType: z
    .enum(["filePath", "activeFile", "periodicNote"])
    .describe("The type of target note to perform the search and replace on."),
  targetIdentifier: z
    .string()
    .optional()
    .describe(
      "Identifier for the target note, required if targetType is 'filePath' or 'periodicNote'. For 'filePath', this is the vault-relative path. For 'periodicNote', it's the period (e.g., 'daily', 'weekly').",
    ),
  replacements: z
    .array(ReplacementBlockSchema)
    .min(1)
    .describe("An array of one or more search/replace pairs to apply."),
  useRegex: z
    .boolean()
    .default(false)
    .describe(
      "If true, the 'search' string is treated as a regular expression.",
    ),
  replaceAll: z
    .boolean()
    .default(true)
    .describe(
      "If true, all occurrences of the search string will be replaced. If false, only the first occurrence is replaced.",
    ),
  caseSensitive: z
    .boolean()
    .default(true)
    .describe("If true, the search will be case-sensitive."),
  flexibleWhitespace: z
    .boolean()
    .default(false)
    .describe(
      "If true, treats consecutive whitespace in the search string as a single space that can match multiple whitespace characters in the note. Cannot be used with useRegex.",
    ),
  wholeWord: z
    .boolean()
    .default(false)
    .describe(
      "If true, the search will only match whole words (bounded by non-word characters).",
    ),
  returnContent: z
    .boolean()
    .default(false)
    .describe(
      "If true, the final content of the note will be returned in the response.",
    ),
});

export const ObsidianSearchReplaceInputSchema =
  BaseObsidianSearchReplaceInputSchema.refine(
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
  ).refine((data) => !(data.flexibleWhitespace && data.useRegex), {
    message: "flexibleWhitespace cannot be true if useRegex is true",
    path: ["flexibleWhitespace", "useRegex"],
  });

// 2. DEFINE the Zod response schema.
const FormattedStatSchema = z.object({
  createdTime: z.string(),
  modifiedTime: z.string(),
  tokenCountEstimate: z.number(),
});

export const ObsidianSearchReplaceOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  totalReplacementsMade: z.number(),
  stats: FormattedStatSchema.optional(),
  finalContent: z.string().optional(),
});

// 3. INFER and export TypeScript types.
export type ObsidianSearchReplaceInput = z.infer<
  typeof ObsidianSearchReplaceInputSchema
>;
export type ObsidianSearchReplaceOutput = z.infer<
  typeof ObsidianSearchReplaceOutputSchema
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

// Helper functions
async function getTargetNote(
  params: ObsidianSearchReplaceInput,
  context: RequestContext,
  obsidianService: ObsidianRestApiService,
): Promise<{ effectiveFilePath?: string; content: string }> {
  const { targetType, targetIdentifier } = params;

  switch (targetType) {
    case "activeFile": {
      const content = (await obsidianService.getActiveFile(
        "markdown",
        context,
      )) as string;
      const effectiveFilePath =
        await obsidianService.getActiveFilePath(context);
      return { effectiveFilePath: effectiveFilePath ?? undefined, content };
    }
    case "periodicNote": {
      const note = (await obsidianService.getPeriodicNote(
        targetIdentifier as any,
        "json",
        context,
      )) as NoteJson;
      return { effectiveFilePath: note.path, content: note.content };
    }
    case "filePath": {
      const effectiveFilePath = await resolveVaultPath(
        targetIdentifier!,
        context,
        (fp, ctx) => obsidianService.getFileMetadata(fp, ctx),
        (dp, ctx) => obsidianService.listFiles(dp, ctx),
      );
      const content = (await obsidianService.getFileContent(
        effectiveFilePath,
        "markdown",
        context,
      )) as string;
      return { effectiveFilePath, content };
    }
  }
}

async function updateTargetNote(
  params: ObsidianSearchReplaceInput,
  effectiveFilePath: string | undefined,
  content: string,
  context: RequestContext,
  obsidianService: ObsidianRestApiService,
) {
  const { targetType, targetIdentifier } = params;
  switch (targetType) {
    case "filePath":
      await obsidianService.updateFileContent(
        effectiveFilePath!,
        content,
        context,
      );
      break;
    case "activeFile":
      await obsidianService.updateActiveFile(content, context);
      break;
    case "periodicNote":
      await obsidianService.updatePeriodicNote(
        targetIdentifier as any,
        content,
        context,
      );
      break;
  }
}

/**
 * 4. IMPLEMENT the core logic function.
 * @throws {McpError} If the logic encounters an unrecoverable issue.
 */
export async function obsidianSearchReplaceLogic(
  params: ObsidianSearchReplaceInput,
  context: RequestContext,
  obsidianService: ObsidianRestApiService,
): Promise<ObsidianSearchReplaceOutput> {
  const {
    replacements,
    useRegex,
    replaceAll,
    caseSensitive,
    flexibleWhitespace,
    wholeWord,
    returnContent,
  } = params;

  const { effectiveFilePath, content: originalContent } = await getTargetNote(
    params,
    context,
    obsidianService,
  );

  let modifiedContent = originalContent;
  let totalReplacementsMade = 0;

  for (const rep of replacements) {
    let searchPattern: RegExp;
    let flags = replaceAll ? "g" : "";
    if (!caseSensitive) flags += "i";

    let searchStr = useRegex
      ? rep.search
      : rep.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (flexibleWhitespace) {
      searchStr = searchStr.replace(/\s+/g, "\\s+");
    }
    if (wholeWord) {
      searchStr = `\\b${searchStr}\\b`;
    }

    try {
      searchPattern = new RegExp(searchStr, flags);
    } catch (e) {
      throw new McpError(
        BaseErrorCode.VALIDATION_ERROR,
        `Invalid regex pattern constructed: ${searchStr}`,
      );
    }

    const matches = modifiedContent.match(searchPattern);
    const numMatches = matches ? matches.length : 0;

    if (numMatches > 0) {
      modifiedContent = modifiedContent.replace(searchPattern, rep.replace);
      totalReplacementsMade += numMatches;
    }
  }

  if (modifiedContent !== originalContent) {
    await updateTargetNote(
      params,
      effectiveFilePath,
      modifiedContent,
      context,
      obsidianService,
    );
  }

  const finalState = effectiveFilePath
    ? ((await obsidianService.getFileContent(
        effectiveFilePath,
        "json",
        context,
      )) as NoteJson)
    : null;

  const formattedStatResult = finalState?.stat
    ? await createFormattedStatWithTokenCount(
        finalState.stat,
        finalState.content ?? "",
        context,
      )
    : undefined;

  return {
    success: true,
    message: `Search/replace completed. ${totalReplacementsMade} replacements made.`,
    totalReplacementsMade,
    stats: formattedStatResult ?? undefined,
    finalContent: returnContent ? modifiedContent : undefined,
  };
}
