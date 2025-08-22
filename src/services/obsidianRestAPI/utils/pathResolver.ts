/**
 * @fileoverview Provides a utility for resolving file paths within the Obsidian vault,
 * supporting case-insensitive fallbacks.
 * @module src/services/obsidianRestAPI/utils/pathResolver
 */
import path from "node:path";
import { RequestContext, logger } from "../../../utils/index.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { components } from "../generated-types.js";

type NoteStat = components["schemas"]["NoteJson"]["stat"];
type MetadataFetcher = (
  filePath: string,
  context: RequestContext,
) => Promise<NoteStat | null>;
type FileLister = (
  dirPath: string,
  context: RequestContext,
) => Promise<string[]>;

/**
 * Resolves a vault-relative file path with a case-insensitive fallback.
 * It first attempts a direct, case-sensitive match. If that fails, it searches
 * the file's directory for a case-insensitive match.
 *
 * @param filePath The vault-relative path to resolve.
 * @param context The request context for logging and tracing.
 * @param metadataFetcher A function to fetch file metadata.
 * @param fileLister A function to list files in a directory.
 * @returns A promise that resolves with the correct, case-sensitive file path.
 * @throws {McpError} If the path is not found, or if there are ambiguous matches.
 */
export async function resolveVaultPath(
  filePath: string,
  context: RequestContext,
  metadataFetcher: MetadataFetcher,
  fileLister: FileLister,
): Promise<string> {
  // 1. Try a direct, case-sensitive check first for performance.
  const metadata = await metadataFetcher(filePath, context);
  if (metadata) {
    return filePath;
  }

  // 2. If not found, attempt a case-insensitive fallback.
  logger.info(
    `Path '${filePath}' not found, attempting case-insensitive fallback.`,
    context,
  );
  const dirname = path.posix.dirname(filePath);
  const filenameLower = path.posix.basename(filePath).toLowerCase();
  const dirToList = dirname === "." ? "/" : dirname;

  const filesInDir = await fileLister(dirToList, context);
  const matches = filesInDir.filter(
    (f: string) =>
      !f.endsWith("/") &&
      path.posix.basename(f).toLowerCase() === filenameLower,
  );

  if (matches.length === 1) {
    const matchedFile = matches[0];
    // listFiles returns the full path for files in subdirectories, but just the basename for files in the root.
    const finalPath =
      dirToList === "/"
        ? matchedFile
        : path.posix.join(dirname, path.posix.basename(matchedFile));
    logger.info(`Found case-insensitive match: '${finalPath}'`, context);
    return finalPath;
  }

  if (matches.length > 1) {
    throw new McpError(
      BaseErrorCode.CONFLICT,
      `Ambiguous case-insensitive matches for '${filePath}'. Found: [${matches.join(", ")}]`,
      context,
    );
  }

  throw new McpError(
    BaseErrorCode.NOT_FOUND,
    `Path not found: '${filePath}' (case-insensitive fallback also failed).`,
    context,
  );
}
