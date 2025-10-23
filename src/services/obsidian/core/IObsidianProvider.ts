/**
 * @fileoverview Provider interface for Obsidian service operations.
 * @module src/services/obsidian/core/IObsidianProvider
 */

import type { RequestContext } from '@/utils/index.js';
import type {
  NoteJson,
  Command,
  SearchResult,
  NoteOptions,
  SearchOptions,
  PatchOptions,
  PeriodicNoteParams,
  VaultFile,
} from '../types.js';

/**
 * Interface for Obsidian REST API provider
 */
export interface IObsidianProvider {
  /**
   * Health check for the Obsidian API connection
   * @param appContext - Request context for logging and tracing
   * @returns Promise resolving to health status with details
   */
  healthCheck(
    appContext: RequestContext,
  ): Promise<{ healthy: boolean; details?: string }>;

  // ===== Active Note Operations =====

  /**
   * Get the currently active note in Obsidian
   * @param appContext - Request context for logging and tracing
   * @returns Promise resolving to note data
   */
  getActiveNote(appContext: RequestContext): Promise<NoteJson>;

  /**
   * Update the content of the active note
   * @param appContext - Request context for logging and tracing
   * @param content - New content for the note
   * @returns Promise resolving to updated note data
   */
  updateActiveNote(
    appContext: RequestContext,
    content: string,
  ): Promise<NoteJson>;

  /**
   * Append content to the active note
   * @param appContext - Request context for logging and tracing
   * @param content - Content to append
   * @returns Promise resolving to updated note data
   */
  appendActiveNote(
    appContext: RequestContext,
    content: string,
  ): Promise<NoteJson>;

  /**
   * Patch specific sections of the active note
   * @param appContext - Request context for logging and tracing
   * @param options - Patch operation options
   * @returns Promise resolving to updated note data
   */
  patchActiveNote(
    appContext: RequestContext,
    options: Omit<PatchOptions, 'path'>,
  ): Promise<NoteJson>;

  /**
   * Delete the currently active note
   * @param appContext - Request context for logging and tracing
   * @returns Promise resolving when deletion completes
   */
  deleteActiveNote(appContext: RequestContext): Promise<void>;

  // ===== General Note Operations =====

  /**
   * List files and directories at a path
   * @param appContext - Request context for logging and tracing
   * @param path - Directory path (empty for root)
   * @returns Promise resolving to array of files
   */
  listVaultFiles(
    appContext: RequestContext,
    path?: string,
  ): Promise<VaultFile[]>;

  /**
   * Get a note by path
   * @param appContext - Request context for logging and tracing
   * @param path - Note path (with or without .md extension)
   * @returns Promise resolving to note data
   */
  getNote(appContext: RequestContext, path: string): Promise<NoteJson>;

  /**
   * Create or update a note
   * @param appContext - Request context for logging and tracing
   * @param options - Note creation options
   * @returns Promise resolving to created/updated note data
   */
  createNote(
    appContext: RequestContext,
    options: NoteOptions,
  ): Promise<NoteJson>;

  /**
   * Append content to a note
   * @param appContext - Request context for logging and tracing
   * @param path - Note path
   * @param content - Content to append
   * @returns Promise resolving to updated note data
   */
  appendNote(
    appContext: RequestContext,
    path: string,
    content: string,
  ): Promise<NoteJson>;

  /**
   * Patch specific sections of a note
   * @param appContext - Request context for logging and tracing
   * @param options - Patch operation options
   * @returns Promise resolving to updated note data
   */
  patchNote(
    appContext: RequestContext,
    options: PatchOptions,
  ): Promise<NoteJson>;

  /**
   * Delete a note
   * @param appContext - Request context for logging and tracing
   * @param path - Note path
   * @returns Promise resolving when deletion completes
   */
  deleteNote(appContext: RequestContext, path: string): Promise<void>;

  // ===== Search Operations =====

  /**
   * Simple text search across vault
   * @param appContext - Request context for logging and tracing
   * @param options - Search options
   * @returns Promise resolving to search results
   */
  searchSimple(
    appContext: RequestContext,
    options: SearchOptions,
  ): Promise<SearchResult>;

  /**
   * Search using Dataview DQL query
   * @param appContext - Request context for logging and tracing
   * @param query - DQL query string
   * @returns Promise resolving to search results
   */
  searchDataview(
    appContext: RequestContext,
    query: string,
  ): Promise<SearchResult>;

  /**
   * Search using JsonLogic query
   * @param appContext - Request context for logging and tracing
   * @param query - JsonLogic query object
   * @returns Promise resolving to search results
   */
  searchJsonLogic(
    appContext: RequestContext,
    query: Record<string, unknown>,
  ): Promise<SearchResult>;

  // ===== Periodic Notes Operations =====

  /**
   * Get a periodic note (current or specific date)
   * @param appContext - Request context for logging and tracing
   * @param params - Periodic note parameters
   * @returns Promise resolving to note data
   */
  getPeriodicNote(
    appContext: RequestContext,
    params: PeriodicNoteParams,
  ): Promise<NoteJson>;

  /**
   * Append content to a periodic note
   * @param appContext - Request context for logging and tracing
   * @param params - Periodic note parameters
   * @param content - Content to append
   * @returns Promise resolving to updated note data
   */
  appendPeriodicNote(
    appContext: RequestContext,
    params: PeriodicNoteParams,
    content: string,
  ): Promise<NoteJson>;

  /**
   * Patch specific sections of a periodic note
   * @param appContext - Request context for logging and tracing
   * @param params - Periodic note parameters
   * @param patchOptions - Patch operation options (without path)
   * @returns Promise resolving to updated note data
   */
  patchPeriodicNote(
    appContext: RequestContext,
    params: PeriodicNoteParams,
    patchOptions: Omit<PatchOptions, 'path'>,
  ): Promise<NoteJson>;

  /**
   * Delete a periodic note (current or specific date)
   * @param appContext - Request context for logging and tracing
   * @param params - Periodic note parameters
   * @returns Promise resolving when deletion completes
   */
  deletePeriodicNote(
    appContext: RequestContext,
    params: PeriodicNoteParams,
  ): Promise<void>;

  // ===== Commands & UI Operations =====

  /**
   * List all available Obsidian commands
   * @param appContext - Request context for logging and tracing
   * @returns Promise resolving to array of commands
   */
  listCommands(appContext: RequestContext): Promise<Command[]>;

  /**
   * Execute an Obsidian command by ID
   * @param appContext - Request context for logging and tracing
   * @param commandId - Command identifier
   * @returns Promise resolving when command execution completes
   */
  executeCommand(appContext: RequestContext, commandId: string): Promise<void>;

  /**
   * Open a note in Obsidian UI
   * @param appContext - Request context for logging and tracing
   * @param path - Note path
   * @param newLeaf - Whether to open in new pane
   * @returns Promise resolving when note is opened
   */
  openNote(
    appContext: RequestContext,
    path: string,
    newLeaf?: boolean,
  ): Promise<void>;
}
