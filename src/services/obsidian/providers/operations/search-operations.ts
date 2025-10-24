/**
 * @fileoverview Search operations for Obsidian API.
 * Handles simple, Dataview DQL, and JsonLogic search queries.
 * @module src/services/obsidian/providers/operations/search-operations
 */

import type { RequestContext } from '@/utils/index.js';
import { OperationBase } from '../shared/operation-base.js';
import type { SearchResult, SearchOptions } from '../shared/types.js';
import {
  validateSearchOptions,
  validateDataviewQuery,
  validateJsonLogicQuery,
} from '../../utils/validators.js';

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
    // Validate search options
    validateSearchOptions(options);

    return this.executeOperation(
      'searchSimple',
      appContext,
      async () => {
        const response = await this.apiPost('/search/simple/', {
          params: {
            query: {
              query: options.query,
              ...(options.contextLength !== undefined && {
                contextLength: options.contextLength,
              }),
            },
          },
        });

        return this.extractSearchResults(response.data);
      },
      {
        query: options.query,
        contextLength: options.contextLength,
      },
    );
  }

  /**
   * Search using Dataview DQL query
   */
  async searchDataview(
    appContext: RequestContext,
    query: string,
  ): Promise<SearchResult> {
    // Validate Dataview query
    validateDataviewQuery(query);

    return this.executeOperation(
      'searchDataview',
      appContext,
      async () => {
        const response = await this.apiPost('/search/', {
          body: query,
          headers: {
            'Content-Type': 'application/vnd.olrapi.dataview.dql+txt',
          },
        });

        return this.extractSearchResults(response.data);
      },
      { queryLength: query.length },
    );
  }

  /**
   * Search using JsonLogic query
   */
  async searchJsonLogic(
    appContext: RequestContext,
    query: Record<string, unknown>,
  ): Promise<SearchResult> {
    // Validate JsonLogic query
    validateJsonLogicQuery(query);

    return this.executeOperation('searchJsonLogic', appContext, async () => {
      const response = await this.apiPost('/search/', {
        body: query,
        headers: {
          'Content-Type': 'application/vnd.olrapi.jsonlogic+json',
        },
      });

      return this.extractSearchResults(response.data);
    });
  }
}
