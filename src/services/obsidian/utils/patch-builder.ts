/**
 * @fileoverview PATCH header builder utility for Obsidian API PATCH operations.
 * Centralizes the construction of PATCH request headers to eliminate duplication.
 * @module src/services/obsidian/utils/patch-builder
 */

import type { PatchOptions } from '../types.js';

/**
 * PATCH request headers type
 * Matches the Obsidian Local REST API PATCH endpoint header requirements
 */
export interface PatchHeaders {
  Operation: 'append' | 'prepend' | 'replace';
  'Target-Type': 'heading' | 'block' | 'frontmatter';
  Target: string;
  'Target-Delimiter'?: string;
  'Trim-Target-Whitespace'?: 'true' | 'false';
}

/**
 * Build PATCH request headers from options
 * @param options - PATCH options (with or without path)
 * @returns Properly formatted headers object for Obsidian API
 *
 * @example
 * ```typescript
 * const headers = buildPatchHeaders({
 *   operation: 'append',
 *   targetType: 'heading',
 *   target: 'Notes',
 *   content: '- New item',
 *   targetDelimiter: '::',
 *   trimTargetWhitespace: true
 * });
 * // Returns:
 * // {
 * //   Operation: 'append',
 * //   'Target-Type': 'heading',
 * //   Target: 'Notes',
 * //   'Target-Delimiter': '::',
 * //   'Trim-Target-Whitespace': 'true'
 * // }
 * ```
 */
export function buildPatchHeaders(
  options: PatchOptions | Omit<PatchOptions, 'path'>,
): PatchHeaders {
  const headers: PatchHeaders = {
    Operation: options.operation,
    'Target-Type': options.targetType,
    Target: options.target,
  };

  // Add optional delimiter if provided
  if (options.targetDelimiter !== undefined) {
    headers['Target-Delimiter'] = options.targetDelimiter;
  }

  // Add optional whitespace trimming flag if provided
  // API expects 'true' or 'false' as strings
  if (options.trimTargetWhitespace !== undefined) {
    headers['Trim-Target-Whitespace'] = options.trimTargetWhitespace
      ? 'true'
      : 'false';
  }

  return headers;
}
