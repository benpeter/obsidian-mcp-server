/**
 * @fileoverview Base class for Obsidian API operation handlers.
 * Provides shared utilities for logging, error handling, and API interaction.
 * @module src/services/obsidian/providers/shared/operation-base
 */

import { logger } from '@/utils/index.js';
import { McpError, JsonRpcErrorCode } from '@/types-global/errors.js';
import type { RequestContext } from '@/utils/index.js';
import type { ObsidianClient } from '../../core/ObsidianClient.js';
import {
  isErrorResponse,
  extractNoteData,
  extractCommandList,
  extractVaultFileList,
  extractSearchResults,
  type ApiResult,
} from '../../types/api-responses.js';
import {
  createErrorFromApiResponse,
  handleNetworkError,
} from '../../utils/error-mapper.js';

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
   * @deprecated Use isErrorResponse from api-responses module instead
   */
  protected isErrorResponse<T>(response: {
    data?: T;
    error?: unknown;
    response: Response;
  }): response is { error: unknown; response: Response; data?: never } {
    return isErrorResponse(response as ApiResult<T>);
  }

  /**
   * Execute an operation with consistent logging and error handling
   * This wrapper reduces duplication by handling the common try-catch-log pattern
   *
   * @param operationName - Name of the operation for logging
   * @param appContext - Request context for logging and tracing
   * @param operation - Async function containing the operation logic
   * @param metadata - Additional metadata to include in logs
   * @returns Result of the operation
   * @throws McpError on failure
   *
   * @example
   * ```typescript
   * return this.executeOperation(
   *   'getNote',
   *   appContext,
   *   async () => {
   *     const response = await this.apiGet('/vault/{path}', { path });
   *     return extractNoteData(response.data);
   *   },
   *   { path }
   * );
   * ```
   */
  protected async executeOperation<TOutput>(
    operationName: string,
    appContext: RequestContext,
    operation: () => Promise<TOutput>,
    metadata?: Record<string, unknown>,
  ): Promise<TOutput> {
    // Log operation start
    this.logInfo(
      `Executing ${operationName}`,
      this.createContext(operationName, appContext, metadata),
    );

    try {
      // Execute the operation
      const result = await operation();

      // Log success
      this.logDebug(
        `${operationName} completed successfully`,
        this.createContext(operationName, appContext, metadata),
      );

      return result;
    } catch (error) {
      // Log error
      this.logError(
        `${operationName} failed`,
        this.createContext(operationName, appContext, {
          ...metadata,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      // Re-throw McpError as-is, wrap others
      if (error instanceof McpError) {
        throw error;
      }

      throw handleNetworkError(error, operationName);
    }
  }

  /**
   * Execute a GET request with proper typing and error handling
   * @param path - API path
   * @param init - Request options
   * @returns Typed response
   * @throws McpError on failure
   */
  protected async apiGet(
    path: string,
    init?: Record<string, unknown>,
  ): Promise<ApiResult<unknown>> {
    // Using `any` for client to bypass openapi-fetch strict path typing
    // Runtime type safety is maintained through validators and type guards
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = this.getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const response = (await client.GET(path, init)) as ApiResult<unknown>;

    if (isErrorResponse(response) || !response.response.ok) {
      throw createErrorFromApiResponse(
        response.response.status,
        response.error ?? null,
        String(path),
      );
    }

    if (!response.data) {
      throw new McpError(
        JsonRpcErrorCode.InternalError,
        'No data returned from Obsidian API',
      );
    }

    return response;
  }

  /**
   * Execute a POST request with proper typing and error handling
   * @param path - API path
   * @param init - Request options
   * @returns Typed response
   * @throws McpError on failure
   */
  protected async apiPost(
    path: string,
    init?: Record<string, unknown>,
  ): Promise<ApiResult<unknown>> {
    // Using `any` for client to bypass openapi-fetch strict path typing
    // Runtime type safety is maintained through validators and type guards
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = this.getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const response = (await client.POST(path, init)) as ApiResult<unknown>;

    if (isErrorResponse(response) || !response.response.ok) {
      throw createErrorFromApiResponse(
        response.response.status,
        response.error ?? null,
        String(path),
      );
    }

    if (!response.data) {
      throw new McpError(
        JsonRpcErrorCode.InternalError,
        'No data returned from Obsidian API',
      );
    }

    return response;
  }

  /**
   * Execute a PUT request with proper typing and error handling
   * @param path - API path
   * @param init - Request options
   * @returns Typed response
   * @throws McpError on failure
   */
  protected async apiPut(
    path: string,
    init?: Record<string, unknown>,
  ): Promise<ApiResult<unknown>> {
    // Using `any` for client to bypass openapi-fetch strict path typing
    // Runtime type safety is maintained through validators and type guards
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = this.getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const response = (await client.PUT(path, init)) as ApiResult<unknown>;

    if (isErrorResponse(response) || !response.response.ok) {
      throw createErrorFromApiResponse(
        response.response.status,
        response.error ?? null,
        String(path),
      );
    }

    if (!response.data) {
      throw new McpError(
        JsonRpcErrorCode.InternalError,
        'No data returned from Obsidian API',
      );
    }

    return response;
  }

  /**
   * Execute a PATCH request with proper typing and error handling
   * @param path - API path
   * @param init - Request options
   * @returns Typed response
   * @throws McpError on failure
   */
  protected async apiPatch(
    path: string,
    init?: Record<string, unknown>,
  ): Promise<ApiResult<unknown>> {
    // Using `any` for client to bypass openapi-fetch strict path typing
    // Runtime type safety is maintained through validators and type guards
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = this.getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const response = (await client.PATCH(path, init)) as ApiResult<unknown>;

    if (isErrorResponse(response) || !response.response.ok) {
      throw createErrorFromApiResponse(
        response.response.status,
        response.error ?? null,
        String(path),
      );
    }

    if (!response.data) {
      throw new McpError(
        JsonRpcErrorCode.InternalError,
        'No data returned from Obsidian API',
      );
    }

    return response;
  }

  /**
   * Execute a DELETE request with proper typing and error handling
   * @param path - API path
   * @param init - Request options
   * @returns Response (no data expected)
   * @throws McpError on failure
   */
  protected async apiDelete(
    path: string,
    init?: Record<string, unknown>,
  ): Promise<void> {
    // Using `any` for client to bypass openapi-fetch strict path typing
    // Runtime type safety is maintained through validators and type guards
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = this.getClient();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const response = (await client.DELETE(path, init)) as ApiResult<unknown>;

    if (isErrorResponse(response) || !response.response.ok) {
      throw createErrorFromApiResponse(
        response.response.status,
        response.error ?? null,
        String(path),
      );
    }
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

  /**
   * Helper to extract note data from API response
   * @param data - Response data
   * @returns Validated note data
   */
  protected extractNoteData = extractNoteData;

  /**
   * Helper to extract command list from API response
   * @param data - Response data
   * @returns Validated command list
   */
  protected extractCommandList = extractCommandList;

  /**
   * Helper to extract vault file list from API response
   * @param data - Response data
   * @returns Validated file list
   */
  protected extractVaultFileList = extractVaultFileList;

  /**
   * Helper to extract search results from API response
   * @param data - Response data
   * @returns Validated search results
   */
  protected extractSearchResults = extractSearchResults;
}
