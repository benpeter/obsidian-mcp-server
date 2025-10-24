/**
 * @fileoverview Periodic note operations for Obsidian API.
 * Handles daily, weekly, monthly, quarterly, and yearly note operations.
 * @module src/services/obsidian/providers/operations/periodic-operations
 */

import type { RequestContext } from '@/utils/index.js';
import { OperationBase } from '../shared/operation-base.js';
import type {
  NoteJson,
  PeriodicNoteParams,
  PatchOptions,
} from '../shared/types.js';
import { enrichNoteData } from '../../utils/response-mapper.js';
import {
  validatePeriodicParams,
  validatePatchOptions,
} from '../../utils/validators.js';
import { buildPatchHeaders } from '../../utils/patch-builder.js';

/**
 * Handles all periodic note-related operations
 */
export class PeriodicOperations extends OperationBase {
  /**
   * Build query parameters from periodic note params
   */
  private buildQueryParams(params: PeriodicNoteParams): Record<string, string> {
    const queryParams: Record<string, string> = {};

    if (params.year !== undefined) {
      queryParams.year = params.year.toString();
    }
    if (params.month !== undefined) {
      queryParams.month = params.month.toString();
    }
    if (params.day !== undefined) {
      queryParams.day = params.day.toString();
    }

    return queryParams;
  }

  /**
   * Get a periodic note (current or specific date)
   */
  async getPeriodicNote(
    appContext: RequestContext,
    params: PeriodicNoteParams,
  ): Promise<NoteJson> {
    // Validate periodic params
    validatePeriodicParams(params);

    return this.executeOperation(
      'getPeriodicNote',
      appContext,
      async () => {
        const queryParams = this.buildQueryParams(params);

        const response = await this.apiGet('/periodic/{period}', {
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

        const note = this.extractNoteData(response.data);
        return enrichNoteData(note);
      },
      {
        period: params.period,
        year: params.year,
        month: params.month,
        day: params.day,
      },
    );
  }

  /**
   * Append content to a periodic note
   */
  async appendPeriodicNote(
    appContext: RequestContext,
    params: PeriodicNoteParams,
    content: string,
  ): Promise<NoteJson> {
    // Validate periodic params
    validatePeriodicParams(params);

    return this.executeOperation(
      'appendPeriodicNote',
      appContext,
      async () => {
        const queryParams = this.buildQueryParams(params);

        const response = await this.apiPost('/periodic/{period}', {
          params: {
            path: {
              period: params.period,
            },
            query: queryParams,
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
        period: params.period,
        contentLength: content.length,
        year: params.year,
        month: params.month,
        day: params.day,
      },
    );
  }

  /**
   * Patch specific sections of a periodic note
   */
  async patchPeriodicNote(
    appContext: RequestContext,
    params: PeriodicNoteParams,
    patchOptions: Omit<PatchOptions, 'path'>,
  ): Promise<NoteJson> {
    // Validate periodic params and patch options
    validatePeriodicParams(params);
    validatePatchOptions(patchOptions);

    return this.executeOperation(
      'patchPeriodicNote',
      appContext,
      async () => {
        const queryParams = this.buildQueryParams(params);
        const headers = buildPatchHeaders(patchOptions);

        const response = await this.apiPatch('/periodic/{period}', {
          params: {
            path: {
              period: params.period,
            },
            query: queryParams,
            header: headers,
          },
          body: patchOptions.content,
        });

        const note = this.extractNoteData(response.data);
        return enrichNoteData(note);
      },
      {
        period: params.period,
        targetType: patchOptions.targetType,
        target: patchOptions.target,
        operation: patchOptions.operation,
        year: params.year,
        month: params.month,
        day: params.day,
      },
    );
  }

  /**
   * Delete a periodic note (current or specific date)
   */
  async deletePeriodicNote(
    appContext: RequestContext,
    params: PeriodicNoteParams,
  ): Promise<void> {
    // Validate periodic params
    validatePeriodicParams(params);

    return this.executeOperation(
      'deletePeriodicNote',
      appContext,
      async () => {
        // Use specific date endpoint if date params provided, otherwise current period
        if (
          params.year !== undefined ||
          params.month !== undefined ||
          params.day !== undefined
        ) {
          // Specific date endpoint requires all date components
          // API expects non-null values, so use defaults if not provided
          await this.apiDelete('/periodic/{period}/{year}/{month}/{day}/', {
            params: {
              path: {
                period: params.period,
                year: params.year ?? new Date().getFullYear(),
                month: params.month ?? new Date().getMonth() + 1,
                day: params.day ?? new Date().getDate(),
              },
            },
          });
        } else {
          // Current period endpoint
          await this.apiDelete('/periodic/{period}/', {
            params: {
              path: {
                period: params.period,
              },
            },
          });
        }
      },
      {
        period: params.period,
        year: params.year,
        month: params.month,
        day: params.day,
      },
    );
  }
}
