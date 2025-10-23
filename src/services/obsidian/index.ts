/**
 * @fileoverview Barrel export for Obsidian service.
 * @module src/services/obsidian
 */

// Core
export { ObsidianClient } from './core/ObsidianClient.js';
export type { IObsidianProvider } from './core/IObsidianProvider.js';

// Providers
export { ObsidianRestProvider } from './providers/obsidian-rest.provider.js';

// Types
export type {
  NoteJson,
  ErrorResponse,
  Command,
  SearchResult,
  PeriodicNotePeriod,
  PatchOperation,
  PatchTargetType,
  ObsidianConfig,
  NoteOptions,
  SearchOptions,
  PatchOptions,
  PeriodicNoteParams,
  VaultFile,
} from './types.js';

// Utils
export {
  normalizePath,
  removeMdExtension,
  encodePathForApi,
  isValidPath,
  normalizeDirectoryPath,
  getBasename,
  getDirectoryPath,
} from './utils/path-normalizer.js';

export {
  parseFrontmatter,
  extractTags,
  findBlockReferences,
  extractHeadings,
  findWikilinks,
  updateFrontmatter,
  hasFrontmatter,
  getContentUnderHeading,
} from './utils/markdown-parser.js';

export {
  mapHttpStatusToErrorCode,
  createErrorFromApiResponse,
  handleNetworkError,
  validateObsidianConfig,
} from './utils/error-mapper.js';

export {
  enrichNoteData,
  mapVaultFiles,
  formatNoteForDisplay,
  formatCommandList,
  formatVaultFileList,
} from './utils/response-mapper.js';
