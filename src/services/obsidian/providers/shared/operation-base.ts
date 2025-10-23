/**
 * @fileoverview Base class for Obsidian API operation handlers.
 * Provides shared utilities for logging, error handling, and API interaction.
 * @module src/services/obsidian/providers/shared/operation-base
 */

import { logger } from '@/utils/index.js';
import type { RequestContext } from '@/utils/index.js';
import type { ObsidianClient } from '../../core/ObsidianClient.js';

/**
 * Base class for operation handlers
 * Provides common functionality for all Obsidian API operations
 */
export abstract class OperationBase {
  /**
   * Create an operation handler
   * @param client - Obsidian API client
   * @param loggerInstance - Logger instance
   */
  constructor(
    protected readonly client: ObsidianClient,
    protected readonly loggerInstance: typeof logger,
  ) {}

  /**
   * Type guard to check if openapi-fetch response has an error
   * @param response - API response
   * @returns True if response contains an error
   */
  protected isErrorResponse<T>(response: {
    data?: T;
    error?: unknown;
    response: Response;
  }): response is { error: unknown; response: Response; data?: never } {
    return 'error' in response && response.error !== undefined;
  }

  /**
   * Log an informational message with context
   * @param message - Log message
   * @param context - Request context
   */
  protected logInfo(message: string, context: RequestContext): void {
    this.loggerInstance.info(message, context);
  }

  /**
   * Log a debug message with context
   * @param message - Log message
   * @param context - Request context
   */
  protected logDebug(message: string, context: RequestContext): void {
    this.loggerInstance.debug(message, context);
  }

  /**
   * Log an error message with context
   * @param message - Log message
   * @param context - Request context
   */
  protected logError(message: string, context: RequestContext): void {
    this.loggerInstance.error(message, context);
  }

  /**
   * Log a warning message with context
   * @param message - Log message
   * @param context - Request context
   */
  protected logWarning(message: string, context: RequestContext): void {
    this.loggerInstance.warning(message, context);
  }

  /**
   * Get the underlying API client
   * @returns OpenAPI client instance
   */
  protected getClient() {
    return this.client.getClient();
  }

  /**
   * Create operation context from request context
   * @param operation - Operation name
   * @param appContext - Request context
   * @param additional - Additional context fields
   * @returns Combined context object with operation and additional fields
   */
  protected createContext(
    operation: string,
    appContext: RequestContext,
    additional?: Record<string, unknown>,
  ): RequestContext & { operation: string } {
    return {
      ...appContext,
      operation,
      ...additional,
    };
  }
}
