/**
 * @fileoverview Utilities for encoding paths for the Obsidian API.
 * @module src/services/obsidianRestAPI/utils/pathEncoding
 */

export function encodeVaultPath(filePath: string): string {
  if (!filePath) return "";
  return filePath
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}

export function encodeDirectoryPath(dirPath: string): string {
  const trimmedPath = dirPath.trim();
  if (trimmedPath === "" || trimmedPath === "/") {
    return "";
  }
  return trimmedPath
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}
