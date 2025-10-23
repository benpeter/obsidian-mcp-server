/**
 * @fileoverview Service-specific types for Obsidian integration.
 * @module src/services/obsidian/types
 */

import type { components } from './types/obsidian-api.js';

/**
 * Type alias for Note JSON response from Obsidian API
 * Note: We override frontmatter to use Record<string, unknown> instead of Record<string, never>
 * as the auto-generated type is incorrect (frontmatter can contain any JSON values)
 */
export type NoteJson = Omit<
  components['schemas']['NoteJson'],
  'frontmatter'
> & {
  frontmatter: Record<string, unknown>;
};

/**
 * Type alias for Error response from Obsidian API
 */
export type ErrorResponse = components['schemas']['Error'];

/**
 * Command interface - manually defined from inline API type
 * (not available in components.schemas)
 */
export interface Command {
  id: string;
  name: string;
}

/**
 * Search result interface - manually defined from inline API type
 * (not available in components.schemas)
 */
export interface SearchResultItem {
  filename: string;
  score?: number;
  matches?: Array<{
    match: string;
    context: string;
  }>;
}

/**
 * Search result array type
 */
export type SearchResult = SearchResultItem[];

/**
 * Periodic note period types
 */
export type PeriodicNotePeriod =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

/**
 * PATCH operation types for note updates
 * Matches Obsidian Local REST API spec exactly
 */
export type PatchOperation = 'append' | 'prepend' | 'replace';

/**
 * PATCH target types for note updates
 */
export type PatchTargetType = 'heading' | 'block' | 'frontmatter';

/**
 * Configuration for Obsidian service
 */
export interface ObsidianConfig {
  apiUrl: string;
  apiToken: string | undefined;
  certValidation: boolean;
}

/**
 * Options for creating/updating notes
 */
export interface NoteOptions {
  path: string;
  content: string;
  overwrite?: boolean;
}

/**
 * Options for searching notes
 */
export interface SearchOptions {
  query: string;
  contextLength?: number;
}

/**
 * Options for PATCH operations
 * Aligns with Obsidian Local REST API PATCH endpoint headers
 */
export interface PatchOptions {
  /** Path to the note (omit for active note operations) */
  path: string;
  /** Patch operation to perform */
  operation: PatchOperation;
  /** Type of target to patch */
  targetType: PatchTargetType;
  /** Target to patch (heading name, block ID, or frontmatter field) */
  target: string;
  /** Content to insert */
  content: string;
  /** Delimiter to use for nested targets (default: "::") */
  targetDelimiter?: string;
  /** Trim whitespace from target before applying patch (default: false) */
  trimTargetWhitespace?: boolean;
}

/**
 * Periodic note parameters
 */
export interface PeriodicNoteParams {
  period: PeriodicNotePeriod;
  year?: number;
  month?: number;
  day?: number;
}

/**
 * Vault file/folder information
 */
export interface VaultFile {
  path: string;
  type: 'file' | 'folder';
  basename: string;
  extension?: string;
}
