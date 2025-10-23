/**
 * @fileoverview Periodic note operations for Obsidian API.
 * Handles daily, weekly, monthly, quarterly, and yearly note operations.
 * @module src/services/obsidian/providers/operations/periodic-operations
 */

import type { RequestContext } from '@/utils/index.js';
import { McpError, JsonRpcErrorCode } from '@/types-global/errors.js';
import { OperationBase } from '../shared/operation-base.js';
import type {
  NoteJson,
  PeriodicNoteParams,
  PatchOptions,
} from '../shared/types.js';
import { enrichNoteData } from '../../utils/response-mapper.js';
import {
  createErrorFromApiResponse,
  handleNetworkError,
} from '../../utils/error-mapper.js';

/**
 * Handles all periodic note-related operations
 */
export class PeriodicOperations extends OperationBase {
  /**
   * Get a periodic note (current or specific date)
   */
  async getPeriodicNote(
    appContext: RequestContext,
    params: PeriodicNoteParams,
  ): Promise<NoteJson> {
    this.logInfo(
      'Getting periodic note',
      this.createContext('getPeriodicNote', appContext, {
        period: params.period,
        year: params.year,
        month: params.month,
        day: params.day,
      }),
    );

    try {
      const client = this.getClient();
      const queryParams: Record<string, string> = {};

      if (params.year !== undefined) queryParams.year = params.year.toString();
      if (params.month !== undefined)
        queryParams.month = params.month.toString();
      if (params.day !== undefined) queryParams.day = params.day.toString();

      const response =
        await // @ts-expect-error - openapi-fetch path type inference issue
        client.GET('/periodic/{period}', {
          params: {
            path: {
              period: params.period,
            },
            query: queryParams,
          },
          headers: {
            Accept: 'application/vnd.olrapi.note+json',
          },
        });

      if (this.isErrorResponse(response) || !response.response.ok) {
        throw createErrorFromApiResponse(
          response.response.status,
          response.error ?? null,
          'getPeriodicNote',
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
        'Retrieved periodic note',
        this.createContext('getPeriodicNote', appContext, {
          period: params.period,
          notePath: note.path,
        }),
      );

      return note;
    } catch (error) {
      this.logError(
        'Failed to get periodic note',
        this.createContext('getPeriodicNote', appContext, {
          period: params.period,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      if (error instanceof McpError) {
        throw error;
      }
      throw handleNetworkError(error, 'getPeriodicNote');
    }
  }

  /**
   * Append content to a periodic note
   */
  async appendPeriodicNote(
    appContext: RequestContext,
    params: PeriodicNoteParams,
    content: string,
  ): Promise<NoteJson> {
    this.logInfo(
      'Appending to periodic note',
      this.createContext('appendPeriodicNote', appContext, {
        period: params.period,
        contentLength: content.length,
        year: params.year,
        month: params.month,
        day: params.day,
      }),
    );

    try {
      const client = this.getClient();
      const queryParams: Record<string, string> = {};

      if (params.year !== undefined) queryParams.year = params.year.toString();
      if (params.month !== undefined)
        queryParams.month = params.month.toString();
      if (params.day !== undefined) queryParams.day = params.day.toString();

      const response =
        await // @ts-expect-error - openapi-fetch path type inference issue
        client.POST('/periodic/{period}', {
          params: {
            path: {
              period: params.period,
            },
            query: queryParams,
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
          'appendPeriodicNote',
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
        'Appended to periodic note',
        this.createContext('appendPeriodicNote', appContext, {
          period: params.period,
          notePath: note.path,
        }),
      );

      return note;
    } catch (error) {
      this.logError(
        'Failed to append to periodic note',
        this.createContext('appendPeriodicNote', appContext, {
          period: params.period,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      if (error instanceof McpError) {
        throw error;
      }
      throw handleNetworkError(error, 'appendPeriodicNote');
    }
  }

  /**
   * Patch specific sections of a periodic note
   */
  async patchPeriodicNote(
    appContext: RequestContext,
    params: PeriodicNoteParams,
    patchOptions: Omit<PatchOptions, 'path'>,
  ): Promise<NoteJson> {
    this.logInfo(
      'Patching periodic note',
      this.createContext('patchPeriodicNote', appContext, {
        period: params.period,
        targetType: patchOptions.targetType,
        target: patchOptions.target,
        patchOperation: patchOptions.operation,
        year: params.year,
        month: params.month,
        day: params.day,
      }),
    );

    try {
      const client = this.getClient();
      const queryParams: Record<string, string> = {};

      if (params.year !== undefined) queryParams.year = params.year.toString();
      if (params.month !== undefined)
        queryParams.month = params.month.toString();
      if (params.day !== undefined) queryParams.day = params.day.toString();

      const headers: {
        Operation: 'append' | 'prepend' | 'replace';
        'Target-Type': 'heading' | 'block' | 'frontmatter';
        Target: string;
        'Target-Delimiter'?: string;
        'Trim-Target-Whitespace'?: 'true' | 'false';
      } = {
        Operation: patchOptions.operation,
        'Target-Type': patchOptions.targetType,
        Target: patchOptions.target,
      };

      if (patchOptions.targetDelimiter) {
        headers['Target-Delimiter'] = patchOptions.targetDelimiter;
      }

      if (patchOptions.trimTargetWhitespace !== undefined) {
        headers['Trim-Target-Whitespace'] = patchOptions.trimTargetWhitespace
          ? 'true'
          : 'false';
      }

      const response =
        await // @ts-expect-error - openapi-fetch path type inference issue
        client.PATCH('/periodic/{period}', {
          params: {
            path: {
              period: params.period,
            },
            query: queryParams,
            header: headers,
          },
          body: patchOptions.content as never,
        });

      if (this.isErrorResponse(response) || !response.response.ok) {
        throw createErrorFromApiResponse(
          response.response.status,
          response.error ?? null,
          'patchPeriodicNote',
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
        'Patched periodic note',
        this.createContext('patchPeriodicNote', appContext, {
          period: params.period,
          notePath: note.path,
        }),
      );

      return note;
    } catch (error) {
      this.logError(
        'Failed to patch periodic note',
        this.createContext('patchPeriodicNote', appContext, {
          period: params.period,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      if (error instanceof McpError) {
        throw error;
      }
      throw handleNetworkError(error, 'patchPeriodicNote');
    }
  }

  /**
   * Delete a periodic note (current or specific date)
   */
  async deletePeriodicNote(
    appContext: RequestContext,
    params: PeriodicNoteParams,
  ): Promise<void> {
    this.logInfo(
      'Deleting periodic note',
      this.createContext('deletePeriodicNote', appContext, {
        period: params.period,
        year: params.year,
        month: params.month,
        day: params.day,
      }),
    );

    try {
      const client = this.getClient();

      // Use specific date endpoint if date params provided, otherwise current period
      if (
        params.year !== undefined ||
        params.month !== undefined ||
        params.day !== undefined
      ) {
        const response = await client.DELETE(
          '/periodic/{period}/{year}/{month}/{day}/',
          {
            params: {
              path: {
                period: params.period,
                year: params.year ?? 0,
                month: params.month ?? 0,
                day: params.day ?? 0,
              },
            },
          },
        );

        if (this.isErrorResponse(response) || !response.response.ok) {
          throw createErrorFromApiResponse(
            response.response.status,
            response.error ?? null,
            'deletePeriodicNote',
          );
        }
      } else {
        const response = await client.DELETE('/periodic/{period}/', {
          params: {
            path: {
              period: params.period,
            },
          },
        });

        if (this.isErrorResponse(response) || !response.response.ok) {
          throw createErrorFromApiResponse(
            response.response.status,
            response.error ?? null,
            'deletePeriodicNote',
          );
        }
      }

      this.logDebug(
        'Deleted periodic note',
        this.createContext('deletePeriodicNote', appContext, {
          period: params.period,
        }),
      );
    } catch (error) {
      this.logError(
        'Failed to delete periodic note',
        this.createContext('deletePeriodicNote', appContext, {
          period: params.period,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      if (error instanceof McpError) {
        throw error;
      }
      throw handleNetworkError(error, 'deletePeriodicNote');
    }
  }
}
