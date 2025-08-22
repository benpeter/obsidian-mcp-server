/**
 * @module ObsidianRestApiService Barrel File
 * @description
 * Exports the singleton instance of the Obsidian REST API service and related types.
 */

// Removed singleton export
export { ObsidianRestApiService, PatchOptions } from "./service.js"; // Export the class itself
export { VaultCacheService } from "./vaultCache/index.js";
export type { components as ObsidianApi } from "./generated-types.js";
