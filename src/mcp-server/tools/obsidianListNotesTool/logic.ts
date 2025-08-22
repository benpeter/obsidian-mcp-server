/**
 * @fileoverview Core logic for the 'obsidian_list_notes' tool.
 * @module src/mcp-server/tools/obsidianListNotesTool/logic
 */

import path from "node:path";
import { z } from "zod";
import { logger, type RequestContext } from "../../../utils/index.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { ObsidianRestApiService as ObsidianService } from "../../../services/obsidianRestAPI/service.js";

// 1. DEFINE the Zod input schema.
export const ObsidianListNotesInputSchema = z.object({
  dirPath: z
    .string()
    .describe(
      'The vault-relative path to the directory to list (e.g., "developer/atlas-mcp-server", "/" for root). Case-sensitive.',
    ),
  fileExtensionFilter: z
    .array(z.string().startsWith("."))
    .optional()
    .describe(
      'Optional array of file extensions (e.g., [".md"]) to filter files. Directories are always included.',
    ),
  nameRegexFilter: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Optional regex pattern (JavaScript syntax) to filter results by name.",
    ),
  recursionDepth: z
    .number()
    .int()
    .default(-1)
    .describe(
      "Maximum recursion depth. 0 for no recursion, -1 for infinite (default).",
    ),
});

// 2. DEFINE the Zod response schema.
export const ObsidianListNotesOutputSchema = z.object({
  directoryPath: z.string(),
  tree: z.string(),
  totalEntries: z.number(),
});

// 3. INFER and export TypeScript types.
export type ObsidianListNotesInput = z.infer<
  typeof ObsidianListNotesInputSchema
>;
export type ObsidianListNotesOutput = z.infer<
  typeof ObsidianListNotesOutputSchema
>;

// Internal Type Definitions
interface FileTreeNode {
  name: string;
  type: "file" | "directory";
  children: FileTreeNode[];
}

// Helper Functions
function formatTree(
  nodes: FileTreeNode[],
  indent = "",
): { tree: string; count: number } {
  let treeString = "";
  let count = nodes.length;

  nodes.forEach((node, index) => {
    const isLast = index === nodes.length - 1;
    const prefix = isLast ? "└── " : "├── ";
    const childIndent = isLast ? "    " : "│   ";

    treeString += `${indent}${prefix}${node.name}\n`;

    if (node.children && node.children.length > 0) {
      const result = formatTree(node.children, indent + childIndent);
      treeString += result.tree;
      count += result.count;
    }
  });

  return { tree: treeString, count };
}

async function buildFileTree(
  dirPath: string,
  currentDepth: number,
  params: ObsidianListNotesInput,
  context: RequestContext,
  obsidianService: ObsidianService,
): Promise<FileTreeNode[]> {
  const { recursionDepth, fileExtensionFilter, nameRegexFilter } = params;

  if (recursionDepth !== -1 && currentDepth > recursionDepth) {
    return [];
  }

  let fileNames;
  try {
    fileNames = await obsidianService.listFiles(dirPath, context);
  } catch (error) {
    if (error instanceof McpError && error.code === BaseErrorCode.NOT_FOUND) {
      logger.warning(
        `Directory not found during recursive list: ${dirPath}. Skipping.`,
        context,
      );
      return [];
    }
    throw error;
  }

  const regex = nameRegexFilter ? new RegExp(nameRegexFilter) : null;
  const treeNodes: FileTreeNode[] = [];

  for (const name of fileNames) {
    const fullPath = path.posix.join(dirPath, name);
    const isDirectory = name.endsWith("/");
    const cleanName = isDirectory ? name.slice(0, -1) : name;

    if (regex && !regex.test(cleanName)) continue;
    if (
      !isDirectory &&
      fileExtensionFilter &&
      fileExtensionFilter.length > 0 &&
      !fileExtensionFilter.includes(path.posix.extname(name))
    ) {
      continue;
    }

    const node: FileTreeNode = {
      name: isDirectory ? `${cleanName}/` : cleanName,
      type: isDirectory ? "directory" : "file",
      children: isDirectory
        ? await buildFileTree(
            fullPath,
            currentDepth + 1,
            params,
            context,
            obsidianService,
          )
        : [],
    };
    treeNodes.push(node);
  }

  treeNodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "directory" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return treeNodes;
}

/**
 * 4. IMPLEMENT the core logic function.
 * @throws {McpError} If the logic encounters an unrecoverable issue.
 */
export async function obsidianListNotesLogic(
  params: ObsidianListNotesInput,
  context: RequestContext,
  obsidianService: ObsidianService,
): Promise<ObsidianListNotesOutput> {
  const { dirPath } = params;
  const effectiveDirPath = dirPath === "" ? "/" : dirPath;
  logger.debug(
    `Executing obsidianListNotesLogic for path: ${effectiveDirPath}`,
    { ...context, params },
  );

  const fileTree = await buildFileTree(
    effectiveDirPath,
    0,
    params,
    context,
    obsidianService,
  );

  if (fileTree.length === 0) {
    return {
      directoryPath: effectiveDirPath,
      tree: "(empty or all items filtered)",
      totalEntries: 0,
    };
  }

  const { tree, count } = formatTree(fileTree);

  return {
    directoryPath: effectiveDirPath,
    tree: tree.trimEnd(),
    totalEntries: count,
  };
}
