/**
 * @fileoverview Note operations for Obsidian API (active and general notes).
 * Handles all note CRUD operations including listing, reading, creating, updating, and deleting.
 * @module src/services/obsidian/providers/operations/note-operations
 */

import type { RequestContext } from '@/utils/index.js';
import { McpError, JsonRpcErrorCode } from '@/types-global/errors.js';
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
  isValidPath,
  normalizeDirectoryPath,
} from '../../utils/path-normalizer.js';
import { enrichNoteData, mapVaultFiles } from '../../utils/response-mapper.js';
import {
  createErrorFromApiResponse,
  handleNetworkError,
} from '../../utils/error-mapper.js';

/**
 * Handles all note-related operations (active and general notes)
 */
export class NoteOperations extends OperationBase {
  // ===== Active Note Operations =====

  /**
   * Get the currently active note in Obsidian
   */
  async getActiveNote(appContext: RequestContext): Promise<NoteJson> {
    this.logInfo(
      'Getting active note',
      this.createContext('getActiveNote', appContext),
    );

    try {
      const client = this.getClient();
      const response = await client.GET('/active/', {
        headers: {
          Accept: 'application/vnd.olrapi.note+json',
        },
      });

      if (this.isErrorResponse(response) || !response.response.ok) {
        throw createErrorFromApiResponse(
          response.response.status,
          response.error ?? null,
          'getActiveNote',
        );
      }

      if (!response.data) {
        throw new McpError(
          JsonRpcErrorCode.InternalError,
          'No data returned from Obsidian API',
        );
      }

      const note = enrichNoteData(
        (response as unknown as { data: NoteJson }).data,
      );

      this.logDebug(
        'Retrieved active note',
        this.createContext('getActiveNote', appContext, {
          notePath: note.path,
        }),
      );

      return note;
    } catch (error) {
      this.logError(
        'Failed to get active note',
        this.createContext('getActiveNote', appContext, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      if (error instanceof McpError) {
        throw error;
      }
      throw handleNetworkError(error, 'getActiveNote');
    }
  }

  /**
   * Update the content of the active note
   */
  async updateActiveNote(
    appContext: RequestContext,
    content: string,
  ): Promise<NoteJson> {
    this.logInfo(
      'Updating active note',
      this.createContext('updateActiveNote', appContext, {
        contentLength: content.length,
      }),
    );

    try {
      const client = this.getClient();
      const response = await client.PUT('/active/', {
        body: content as never,
        headers: {
          'Content-Type': 'text/markdown',
          Accept: 'application/vnd.olrapi.note+json',
        },
      });

      if (this.isErrorResponse(response) || !response.response.ok) {
        throw createErrorFromApiResponse(
          response.response.status,
          response.error ?? null,
          'updateActiveNote',
        );
      }

      if (!response.data) {
        throw new McpError(
          JsonRpcErrorCode.InternalError,
          'No data returned from Obsidian API',
        );
      }

      const note = enrichNoteData(
        (response as unknown as { data: NoteJson }).data,
      );

      this.logDebug(
        'Updated active note',
        this.createContext('updateActiveNote', appContext, {
          notePath: note.path,
        }),
      );

      return note;
    } catch (error) {
      this.logError(
        'Failed to update active note',
        this.createContext('updateActiveNote', appContext, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      if (error instanceof McpError) {
        throw error;
      }
      throw handleNetworkError(error, 'updateActiveNote');
    }
  }

  /**
   * Append content to the active note
   */
  async appendActiveNote(
    appContext: RequestContext,
    content: string,
  ): Promise<NoteJson> {
    this.logInfo(
      'Appending to active note',
      this.createContext('appendActiveNote', appContext, {
        contentLength: content.length,
      }),
    );

    try {
      const client = this.getClient();
      const response = await client.POST('/active/', {
        body: content as never,
        headers: {
          'Content-Type': 'text/markdown',
          Accept: 'application/vnd.olrapi.note+json',
        },
      });

      if (this.isErrorResponse(response) || !response.response.ok) {
        throw createErrorFromApiResponse(
          response.response.status,
          response.error ?? null,
          'appendActiveNote',
        );
      }

      if (!response.data) {
        throw new McpError(
          JsonRpcErrorCode.InternalError,
          'No data returned from Obsidian API',
        );
      }

      const note = enrichNoteData(
        (response as unknown as { data: NoteJson }).data,
      );

      this.logDebug(
        'Appended to active note',
        this.createContext('appendActiveNote', appContext, {
          notePath: note.path,
        }),
      );

      return note;
    } catch (error) {
      this.logError(
        'Failed to append to active note',
        this.createContext('appendActiveNote', appContext, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      if (error instanceof McpError) {
        throw error;
      }
      throw handleNetworkError(error, 'appendActiveNote');
    }
  }

  /**
   * Patch specific sections of the active note
   */
  async patchActiveNote(
    appContext: RequestContext,
    options: Omit<PatchOptions, 'path'>,
  ): Promise<NoteJson> {
    this.logInfo(
      'Patching active note',
      this.createContext('patchActiveNote', appContext, {
        targetType: options.targetType,
        target: options.target,
        patchOperation: options.operation,
      }),
    );

    try {
      const client = this.getClient();

      const headers: {
        Operation: 'append' | 'prepend' | 'replace';
        'Target-Type': 'heading' | 'block' | 'frontmatter';
        Target: string;
        'Target-Delimiter'?: string;
        'Trim-Target-Whitespace'?: 'true' | 'false';
      } = {
        Operation: options.operation,
        'Target-Type': options.targetType,
        Target: options.target,
      };

      if (options.targetDelimiter) {
        headers['Target-Delimiter'] = options.targetDelimiter;
      }

      if (options.trimTargetWhitespace !== undefined) {
        headers['Trim-Target-Whitespace'] = options.trimTargetWhitespace
          ? 'true'
          : 'false';
      }

      const response = await client.PATCH('/active/', {
        params: {
          header: headers,
        },
        body: options.content as never,
      });

      if (this.isErrorResponse(response) || !response.response.ok) {
        throw createErrorFromApiResponse(
          response.response.status,
          response.error ?? null,
          'patchActiveNote',
        );
      }

      if (!response.data) {
        throw new McpError(
          JsonRpcErrorCode.InternalError,
          'No data returned from Obsidian API',
        );
      }

      const note = enrichNoteData(
        (response as unknown as { data: NoteJson }).data,
      );

      this.logDebug(
        'Patched active note',
        this.createContext('patchActiveNote', appContext, {
          notePath: note.path,
        }),
      );

      return note;
    } catch (error) {
      this.logError(
        'Failed to patch active note',
        this.createContext('patchActiveNote', appContext, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      if (error instanceof McpError) {
        throw error;
      }
      throw handleNetworkError(error, 'patchActiveNote');
    }
  }

  /**
   * Delete the currently active note
   */
  async deleteActiveNote(appContext: RequestContext): Promise<void> {
    this.logInfo(
      'Deleting active note',
      this.createContext('deleteActiveNote', appContext),
    );

    try {
      const client = this.getClient();
      const response = await client.DELETE('/active/');

      if (this.isErrorResponse(response) || !response.response.ok) {
        throw createErrorFromApiResponse(
          response.response.status,
          response.error ?? null,
          'deleteActiveNote',
        );
      }

      this.logDebug(
        'Deleted active note',
        this.createContext('deleteActiveNote', appContext),
      );
    } catch (error) {
      this.logError(
        'Failed to delete active note',
        this.createContext('deleteActiveNote', appContext, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      if (error instanceof McpError) {
        throw error;
      }
      throw handleNetworkError(error, 'deleteActiveNote');
    }
  }

  // ===== General Note Operations =====

  /**
   * List files and directories at a path
   */
  async listVaultFiles(
    appContext: RequestContext,
    path?: string,
  ): Promise<VaultFile[]> {
    this.logInfo(
      'Listing vault files',
      this.createContext('listVaultFiles', appContext, {
        path: path || '/',
      }),
    );

    try {
      const normalizedPath = normalizeDirectoryPath(path);
      const client = this.getClient();

      const response =
        await // @ts-expect-error - openapi-fetch path type inference issue
        client.GET('/vault/{filepath}', {
          params: {
            path: {
              filepath: normalizedPath || '/',
            },
          },
        });

      if (this.isErrorResponse(response) || !response.response.ok) {
        throw createErrorFromApiResponse(
          response.response.status,
          response.error ?? null,
          'listVaultFiles',
        );
      }

      if (!response.data) {
        throw new McpError(
          JsonRpcErrorCode.InternalError,
          'No data returned from Obsidian API',
        );
      }

      const files = mapVaultFiles(
        response.data as unknown as { files?: string[] },
        normalizedPath,
      );

      this.logDebug(
        'Listed vault files',
        this.createContext('listVaultFiles', appContext, {
          path: normalizedPath || '/',
          fileCount: files.length,
        }),
      );

      return files;
    } catch (error) {
      this.logError(
        'Failed to list vault files',
        this.createContext('listVaultFiles', appContext, {
          path: path || '/',
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      if (error instanceof McpError) {
        throw error;
      }
      throw handleNetworkError(error, 'listVaultFiles');
    }
  }

  /**
   * Get a note by path
   */
  async getNote(appContext: RequestContext, path: string): Promise<NoteJson> {
    if (!isValidPath(path)) {
      throw new McpError(
        JsonRpcErrorCode.InvalidParams,
        `Invalid note path: ${path}`,
      );
    }

    this.logInfo(
      'Getting note',
      this.createContext('getNote', appContext, { path }),
    );

    try {
      const normalizedPath = normalizePath(path);
      const encodedPath = encodePathForApi(normalizedPath);
      const client = this.getClient();

      const response =
        await // @ts-expect-error - openapi-fetch path type inference issue
        client.GET('/vault/{filepath}', {
          params: {
            path: {
              filepath: encodedPath,
            },
          },
          headers: {
            Accept: 'application/vnd.olrapi.note+json',
          },
        });

      if (this.isErrorResponse(response) || !response.response.ok) {
        throw createErrorFromApiResponse(
          response.response.status,
          response.error ?? null,
          'getNote',
        );
      }

      if (!response.data) {
        throw new McpError(
          JsonRpcErrorCode.InternalError,
          'No data returned from Obsidian API',
        );
      }

      const note = enrichNoteData(
        (response as unknown as { data: NoteJson }).data,
      );

      this.logDebug(
        'Retrieved note',
        this.createContext('getNote', appContext, { path: note.path }),
      );

      return note;
    } catch (error) {
      this.logError(
        'Failed to get note',
        this.createContext('getNote', appContext, {
          path,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      if (error instanceof McpError) {
        throw error;
      }
      throw handleNetworkError(error, 'getNote');
    }
  }

  /**
   * Create or update a note
   */
  async createNote(
    appContext: RequestContext,
    options: NoteOptions,
  ): Promise<NoteJson> {
    if (!isValidPath(options.path)) {
      throw new McpError(
        JsonRpcErrorCode.InvalidParams,
        `Invalid note path: ${options.path}`,
      );
    }

    this.logInfo(
      'Creating/updating note',
      this.createContext('createNote', appContext, {
        path: options.path,
        contentLength: options.content.length,
      }),
    );

    try {
      const normalizedPath = normalizePath(options.path);
      const encodedPath = encodePathForApi(normalizedPath);
      const client = this.getClient();

      const response =
        await // @ts-expect-error - openapi-fetch path type inference issue
        client.PUT('/vault/{filepath}', {
          params: {
            path: {
              filepath: encodedPath,
            },
          },
          body: options.content as never,
          headers: {
            'Content-Type': 'text/markdown',
            Accept: 'application/vnd.olrapi.note+json',
          },
        });

      if (this.isErrorResponse(response) || !response.response.ok) {
        throw createErrorFromApiResponse(
          response.response.status,
          response.error ?? null,
          'createNote',
        );
      }

      if (!response.data) {
        throw new McpError(
          JsonRpcErrorCode.InternalError,
          'No data returned from Obsidian API',
        );
      }

      const note = enrichNoteData(
        (response as unknown as { data: NoteJson }).data,
      );

      this.logDebug(
        'Created/updated note',
        this.createContext('createNote', appContext, { path: note.path }),
      );

      return note;
    } catch (error) {
      this.logError(
        'Failed to create/update note',
        this.createContext('createNote', appContext, {
          path: options.path,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      if (error instanceof McpError) {
        throw error;
      }
      throw handleNetworkError(error, 'createNote');
    }
  }

  /**
   * Append content to a note
   */
  async appendNote(
    appContext: RequestContext,
    path: string,
    content: string,
  ): Promise<NoteJson> {
    if (!isValidPath(path)) {
      throw new McpError(
        JsonRpcErrorCode.InvalidParams,
        `Invalid note path: ${path}`,
      );
    }

    this.logInfo(
      'Appending to note',
      this.createContext('appendNote', appContext, {
        path,
        contentLength: content.length,
      }),
    );

    try {
      const normalizedPath = normalizePath(path);
      const encodedPath = encodePathForApi(normalizedPath);
      const client = this.getClient();

      const response =
        await // @ts-expect-error - openapi-fetch path type inference issue
        client.POST('/vault/{filepath}', {
          params: {
            path: {
              filepath: encodedPath,
            },
          },
          body: content as never,
          headers: {
            'Content-Type': 'text/markdown',
            Accept: 'application/vnd.olrapi.note+json',
          },
        });

      if (this.isErrorResponse(response) || !response.response.ok) {
        throw createErrorFromApiResponse(
          response.response.status,
          response.error ?? null,
          'appendNote',
        );
      }

      if (!response.data) {
        throw new McpError(
          JsonRpcErrorCode.InternalError,
          'No data returned from Obsidian API',
        );
      }

      const note = enrichNoteData(
        (response as unknown as { data: NoteJson }).data,
      );

      this.logDebug(
        'Appended to note',
        this.createContext('appendNote', appContext, { path: note.path }),
      );

      return note;
    } catch (error) {
      this.logError(
        'Failed to append to note',
        this.createContext('appendNote', appContext, {
          path,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      if (error instanceof McpError) {
        throw error;
      }
      throw handleNetworkError(error, 'appendNote');
    }
  }

  /**
   * Patch specific sections of a note
   */
  async patchNote(
    appContext: RequestContext,
    options: PatchOptions,
  ): Promise<NoteJson> {
    if (!isValidPath(options.path)) {
      throw new McpError(
        JsonRpcErrorCode.InvalidParams,
        `Invalid note path: ${options.path}`,
      );
    }

    this.logInfo(
      'Patching note',
      this.createContext('patchNote', appContext, {
        path: options.path,
        targetType: options.targetType,
        target: options.target,
        patchOperation: options.operation,
      }),
    );

    try {
      const normalizedPath = normalizePath(options.path);
      const encodedPath = encodePathForApi(normalizedPath);
      const client = this.getClient();

      const headers: {
        Operation: 'append' | 'prepend' | 'replace';
        'Target-Type': 'heading' | 'block' | 'frontmatter';
        Target: string;
        'Target-Delimiter'?: string;
        'Trim-Target-Whitespace'?: 'true' | 'false';
      } = {
        Operation: options.operation,
        'Target-Type': options.targetType,
        Target: options.target,
      };

      if (options.targetDelimiter) {
        headers['Target-Delimiter'] = options.targetDelimiter;
      }

      if (options.trimTargetWhitespace !== undefined) {
        headers['Trim-Target-Whitespace'] = options.trimTargetWhitespace
          ? 'true'
          : 'false';
      }

      const response =
        await // @ts-expect-error - openapi-fetch path type inference issue
        client.PATCH('/vault/{filepath}', {
          params: {
            path: {
              filepath: encodedPath,
            },
            header: headers,
          },
          body: options.content as never,
        });

      if (this.isErrorResponse(response) || !response.response.ok) {
        throw createErrorFromApiResponse(
          response.response.status,
          response.error ?? null,
          'patchNote',
        );
      }

      if (!response.data) {
        throw new McpError(
          JsonRpcErrorCode.InternalError,
          'No data returned from Obsidian API',
        );
      }

      const note = enrichNoteData(
        (response as unknown as { data: NoteJson }).data,
      );

      this.logDebug(
        'Patched note',
        this.createContext('patchNote', appContext, { path: note.path }),
      );

      return note;
    } catch (error) {
      this.logError(
        'Failed to patch note',
        this.createContext('patchNote', appContext, {
          path: options.path,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      if (error instanceof McpError) {
        throw error;
      }
      throw handleNetworkError(error, 'patchNote');
    }
  }

  /**
   * Delete a note
   */
  async deleteNote(appContext: RequestContext, path: string): Promise<void> {
    if (!isValidPath(path)) {
      throw new McpError(
        JsonRpcErrorCode.InvalidParams,
        `Invalid note path: ${path}`,
      );
    }

    this.logInfo(
      'Deleting note',
      this.createContext('deleteNote', appContext, { path }),
    );

    try {
      const normalizedPath = normalizePath(path);
      const encodedPath = encodePathForApi(normalizedPath);
      const client = this.getClient();

      const response =
        await // @ts-expect-error - openapi-fetch path type inference issue
        client.DELETE('/vault/{filepath}', {
          params: {
            path: {
              filepath: encodedPath,
            },
          },
        });

      if (this.isErrorResponse(response) || !response.response.ok) {
        throw createErrorFromApiResponse(
          response.response.status,
          response.error ?? null,
          'deleteNote',
        );
      }

      this.logDebug(
        'Deleted note',
        this.createContext('deleteNote', appContext, { path }),
      );
    } catch (error) {
      this.logError(
        'Failed to delete note',
        this.createContext('deleteNote', appContext, {
          path,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      if (error instanceof McpError) {
        throw error;
      }
      throw handleNetworkError(error, 'deleteNote');
    }
  }
}
