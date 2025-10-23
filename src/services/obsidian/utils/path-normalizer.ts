/**
 * @fileoverview Path normalization utilities for Obsidian file paths.
 * Handles .md extension variations, URL encoding, and path validation.
 * @module src/services/obsidian/utils/path-normalizer
 */

/**
 * Normalize a file path by ensuring it has the .md extension
 * @param path - File path (with or without .md)
 * @returns Normalized path with .md extension
 */
export function normalizePath(path: string): string {
  if (!path) {
    return '';
  }

  // Remove leading slash if present
  let normalized = path.startsWith('/') ? path.slice(1) : path;

  // Add .md extension if not present
  if (!normalized.endsWith('.md')) {
    normalized = `${normalized}.md`;
  }

  return normalized;
}

/**
 * Remove .md extension from a file path
 * @param path - File path
 * @returns Path without .md extension
 */
export function removeMdExtension(path: string): string {
  if (!path) {
    return '';
  }

  return path.endsWith('.md') ? path.slice(0, -3) : path;
}

/**
 * URL encode a path for API requests
 * @param path - File path
 * @returns URL-encoded path
 */
export function encodePathForApi(path: string): string {
  if (!path) {
    return '';
  }

  // Split path by / to preserve directory structure
  const parts = path.split('/');
  return parts.map((part) => encodeURIComponent(part)).join('/');
}

/**
 * Validate a file path
 * @param path - File path to validate
 * @returns True if path is valid
 */
export function isValidPath(path: string): boolean {
  if (!path) {
    return false;
  }

  // Check for invalid characters
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  if (invalidChars.test(path)) {
    return false;
  }

  // Check for path traversal attempts
  if (path.includes('..')) {
    return false;
  }

  return true;
}

/**
 * Normalize a directory path for listing operations
 * @param path - Directory path
 * @returns Normalized directory path (without trailing slash, empty for root)
 */
export function normalizeDirectoryPath(path: string | undefined): string {
  if (!path || path === '/' || path === '.') {
    return '';
  }

  // Remove leading and trailing slashes
  let normalized = path.trim();
  if (normalized.startsWith('/')) {
    normalized = normalized.slice(1);
  }
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * Get the basename (filename without directory path) from a path
 * @param path - File path
 * @returns Basename
 */
export function getBasename(path: string): string {
  if (!path) {
    return '';
  }

  const parts = path.split('/');
  return parts[parts.length - 1] || '';
}

/**
 * Get the directory path (without filename) from a path
 * @param path - File path
 * @returns Directory path
 */
export function getDirectoryPath(path: string): string {
  if (!path) {
    return '';
  }

  const parts = path.split('/');
  if (parts.length <= 1) {
    return '';
  }

  return parts.slice(0, -1).join('/');
}
