/**
 * @fileoverview Search operations for Obsidian API.
 * Handles simple, Dataview DQL, and JsonLogic search queries.
 * @module src/services/obsidian/providers/operations/search-operations
 */

import type { RequestContext } from '@/utils/index.js';
import { McpError, JsonRpcErrorCode } from '@/types-global/errors.js';
import { OperationBase } from '../shared/operation-base.js';
import type { SearchResult, SearchOptions } from '../shared/types.js';
import {
  createErrorFromApiResponse,
  handleNetworkError,
} from '../../utils/error-mapper.js';

/**
 * Handles all search-related operations
 */
export class SearchOperations extends OperationBase {
  /**
   * Simple text search across vault
   */
  async searchSimple(
    appContext: RequestContext,
    options: SearchOptions,
  ): Promise<SearchResult> {
    this.logInfo(
      'Performing simple search',
      this.createContext('searchSimple', appContext, {
        query: options.query,
        contextLength: options.contextLength,
      }),
    );

    try {
      const client = this.getClient();
      const response = await client.POST('/search/simple/', {
        params: {
          query: {
            query: options.query,
            ...(options.contextLength !== undefined && {
              contextLength: options.contextLength,
            }),
          },
        },
      });

      if (this.isErrorResponse(response) || !response.response.ok) {
        throw createErrorFromApiResponse(
          response.response.status,
          response.error ?? null,
          'searchSimple',
        );
      }

      if (!response.data) {
        throw new McpError(
          JsonRpcErrorCode.InternalError,
          'No data returned from Obsidian API',
        );
      }

      const results = response.data as unknown as SearchResult;

      this.logDebug(
        'Search completed',
        this.createContext('searchSimple', appContext, {
          resultCount: results.length,
        }),
      );

      return results;
    } catch (error) {
      this.logError(
        'Failed to perform simple search',
        this.createContext('searchSimple', appContext, {
          query: options.query,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      if (error instanceof McpError) {
        throw error;
      }
      throw handleNetworkError(error, 'searchSimple');
    }
  }

  /**
   * Search using Dataview DQL query
   */
  async searchDataview(
    appContext: RequestContext,
    query: string,
  ): Promise<SearchResult> {
    this.logInfo(
      'Performing Dataview DQL search',
      this.createContext('searchDataview', appContext, {
        queryLength: query.length,
      }),
    );

    try {
      const client = this.getClient();
      const response = await client.POST('/search/', {
        body: query as never,
        headers: {
          'Content-Type': 'application/vnd.olrapi.dataview.dql+txt',
        },
      });

      if (this.isErrorResponse(response) || !response.response.ok) {
        throw createErrorFromApiResponse(
          response.response.status,
          response.error ?? null,
          'searchDataview',
        );
      }

      if (!response.data) {
        throw new McpError(
          JsonRpcErrorCode.InternalError,
          'No data returned from Obsidian API',
        );
      }

      const results = response.data as unknown as SearchResult;

      this.logDebug(
        'Dataview search completed',
        this.createContext('searchDataview', appContext, {
          resultCount: results.length,
        }),
      );

      return results;
    } catch (error) {
      this.logError(
        'Failed to perform Dataview search',
        this.createContext('searchDataview', appContext, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      if (error instanceof McpError) {
        throw error;
      }
      throw handleNetworkError(error, 'searchDataview');
    }
  }

  /**
   * Search using JsonLogic query
   */
  async searchJsonLogic(
    appContext: RequestContext,
    query: Record<string, unknown>,
  ): Promise<SearchResult> {
    this.logInfo(
      'Performing JsonLogic search',
      this.createContext('searchJsonLogic', appContext),
    );

    try {
      const client = this.getClient();
      const response = await client.POST('/search/', {
        body: query as never,
        headers: {
          'Content-Type': 'application/vnd.olrapi.jsonlogic+json',
        },
      });

      if (this.isErrorResponse(response) || !response.response.ok) {
        throw createErrorFromApiResponse(
          response.response.status,
          response.error ?? null,
          'searchJsonLogic',
        );
      }

      if (!response.data) {
        throw new McpError(
          JsonRpcErrorCode.InternalError,
          'No data returned from Obsidian API',
        );
      }

      const results = response.data as unknown as SearchResult;

      this.logDebug(
        'JsonLogic search completed',
        this.createContext('searchJsonLogic', appContext, {
          resultCount: results.length,
        }),
      );

      return results;
    } catch (error) {
      this.logError(
        'Failed to perform JsonLogic search',
        this.createContext('searchJsonLogic', appContext, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      if (error instanceof McpError) {
        throw error;
      }
      throw handleNetworkError(error, 'searchJsonLogic');
    }
  }
}
