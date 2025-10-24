/**
 * @fileoverview Note operations for Obsidian API (active and general notes).
 * Handles all note CRUD operations including listing, reading, creating, updating, and deleting.
 * @module src/services/obsidian/providers/operations/note-operations
 */

import type { RequestContext } from '@/utils/index.js';
import { OperationBase } from '../shared/operation-base.js';
import type {
  NoteJson,
  VaultFile,
  NoteOptions,
  PatchOptions,
} from '../shared/types.js';
import {
  normalizePath,
  encodePathForApi,
  normalizeDirectoryPath,
} from '../../utils/path-normalizer.js';
import { enrichNoteData, mapVaultFiles } from '../../utils/response-mapper.js';
import {
  validateNotePath,
  validatePatchOptions,
} from '../../utils/validators.js';
import { buildPatchHeaders } from '../../utils/patch-builder.js';

/**
 * Handles all note-related operations (active and general notes)
 */
export class NoteOperations extends OperationBase {
  // ===== Active Note Operations =====

  /**
   * Get the currently active note in Obsidian
   */
  async getActiveNote(appContext: RequestContext): Promise<NoteJson> {
    return this.executeOperation('getActiveNote', appContext, async () => {
      const response = await this.apiGet('/active/', {
        headers: {
          Accept: 'application/vnd.olrapi.note+json',
        },
      });

      const note = this.extractNoteData(response.data);
      return enrichNoteData(note);
    });
  }

  /**
   * Update the content of the active note
   */
  async updateActiveNote(
    appContext: RequestContext,
    content: string,
  ): Promise<NoteJson> {
    return this.executeOperation(
      'updateActiveNote',
      appContext,
      async () => {
        const response = await this.apiPut('/active/', {
          body: content,
          headers: {
            'Content-Type': 'text/markdown',
            Accept: 'application/vnd.olrapi.note+json',
          },
        });

        const note = this.extractNoteData(response.data);
        return enrichNoteData(note);
      },
      { contentLength: content.length },
    );
  }

  /**
   * Append content to the active note
   */
  async appendActiveNote(
    appContext: RequestContext,
    content: string,
  ): Promise<NoteJson> {
    return this.executeOperation(
      'appendActiveNote',
      appContext,
      async () => {
        const response = await this.apiPost('/active/', {
          body: content,
          headers: {
            'Content-Type': 'text/markdown',
            Accept: 'application/vnd.olrapi.note+json',
          },
        });

        const note = this.extractNoteData(response.data);
        return enrichNoteData(note);
      },
      { contentLength: content.length },
    );
  }

  /**
   * Patch specific sections of the active note
   */
  async patchActiveNote(
    appContext: RequestContext,
    options: Omit<PatchOptions, 'path'>,
  ): Promise<NoteJson> {
    // Validate PATCH options
    validatePatchOptions(options);

    return this.executeOperation(
      'patchActiveNote',
      appContext,
      async () => {
        const headers = buildPatchHeaders(options);

        const response = await this.apiPatch('/active/', {
          params: {
            header: headers,
          },
          body: options.content,
        });

        const note = this.extractNoteData(response.data);
        return enrichNoteData(note);
      },
      {
        targetType: options.targetType,
        target: options.target,
        operation: options.operation,
      },
    );
  }

  /**
   * Delete the currently active note
   */
  async deleteActiveNote(appContext: RequestContext): Promise<void> {
    return this.executeOperation('deleteActiveNote', appContext, async () => {
      await this.apiDelete('/active/');
    });
  }

  // ===== General Note Operations =====

  /**
   * List files and directories at a path
   */
  async listVaultFiles(
    appContext: RequestContext,
    path?: string,
  ): Promise<VaultFile[]> {
    return this.executeOperation(
      'listVaultFiles',
      appContext,
      async () => {
        const normalizedPath = normalizeDirectoryPath(path);
        // Fix Issue #3: Apply path encoding for special characters
        const encodedPath = encodePathForApi(normalizedPath || '/');

        const response = await this.apiGet('/vault/{filepath}', {
          params: {
            path: {
              filepath: encodedPath,
            },
          },
        });

        const fileList = this.extractVaultFileList(response.data);
        return mapVaultFiles({ files: fileList }, normalizedPath);
      },
      { path: path || '/' },
    );
  }

  /**
   * Get a note by path
   */
  async getNote(appContext: RequestContext, path: string): Promise<NoteJson> {
    // Validate path
    validateNotePath(path);

    const normalizedPath = normalizePath(path);
    const encodedPath = encodePathForApi(normalizedPath);

    return this.executeOperation(
      'getNote',
      appContext,
      async () => {
        const response = await this.apiGet('/vault/{filepath}', {
          params: {
            path: {
              filepath: encodedPath,
            },
          },
          headers: {
            Accept: 'application/vnd.olrapi.note+json',
          },
        });

        const note = this.extractNoteData(response.data);
        return enrichNoteData(note);
      },
      { path: normalizedPath },
    );
  }

  /**
   * Create or update a note
   */
  async createNote(
    appContext: RequestContext,
    options: NoteOptions,
  ): Promise<NoteJson> {
    // Validate path
    validateNotePath(options.path);

    const normalizedPath = normalizePath(options.path);
    const encodedPath = encodePathForApi(normalizedPath);

    return this.executeOperation(
      'createNote',
      appContext,
      async () => {
        const response = await this.apiPut('/vault/{filepath}', {
          params: {
            path: {
              filepath: encodedPath,
            },
          },
          body: options.content,
          headers: {
            'Content-Type': 'text/markdown',
            Accept: 'application/vnd.olrapi.note+json',
          },
        });

        const note = this.extractNoteData(response.data);
        return enrichNoteData(note);
      },
      {
        path: normalizedPath,
        contentLength: options.content.length,
      },
    );
  }

  /**
   * Append content to a note
   */
  async appendNote(
    appContext: RequestContext,
    path: string,
    content: string,
  ): Promise<NoteJson> {
    // Validate path
    validateNotePath(path);

    const normalizedPath = normalizePath(path);
    const encodedPath = encodePathForApi(normalizedPath);

    return this.executeOperation(
      'appendNote',
      appContext,
      async () => {
        const response = await this.apiPost('/vault/{filepath}', {
          params: {
            path: {
              filepath: encodedPath,
            },
          },
          body: content,
          headers: {
            'Content-Type': 'text/markdown',
            Accept: 'application/vnd.olrapi.note+json',
          },
        });

        const note = this.extractNoteData(response.data);
        return enrichNoteData(note);
      },
      {
        path: normalizedPath,
        contentLength: content.length,
      },
    );
  }

  /**
   * Patch specific sections of a note
   */
  async patchNote(
    appContext: RequestContext,
    options: PatchOptions,
  ): Promise<NoteJson> {
    // Validate options (including path)
    validatePatchOptions(options);

    const normalizedPath = normalizePath(options.path);
    const encodedPath = encodePathForApi(normalizedPath);

    return this.executeOperation(
      'patchNote',
      appContext,
      async () => {
        const headers = buildPatchHeaders(options);

        const response = await this.apiPatch('/vault/{filepath}', {
          params: {
            path: {
              filepath: encodedPath,
            },
            header: headers,
          },
          body: options.content,
        });

        const note = this.extractNoteData(response.data);
        return enrichNoteData(note);
      },
      {
        path: normalizedPath,
        targetType: options.targetType,
        target: options.target,
        operation: options.operation,
      },
    );
  }

  /**
   * Delete a note
   */
  async deleteNote(appContext: RequestContext, path: string): Promise<void> {
    // Validate path
    validateNotePath(path);

    const normalizedPath = normalizePath(path);
    const encodedPath = encodePathForApi(normalizedPath);

    return this.executeOperation(
      'deleteNote',
      appContext,
      async () => {
        await this.apiDelete('/vault/{filepath}', {
          params: {
            path: {
              filepath: encodedPath,
            },
          },
        });
      },
      { path: normalizedPath },
    );
  }
}
