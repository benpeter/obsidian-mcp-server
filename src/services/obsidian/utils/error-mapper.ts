/**
 * @fileoverview Error mapping utilities for Obsidian API errors.
 * Maps HTTP status codes and API error responses to McpError.
 * @module src/services/obsidian/utils/error-mapper
 */

import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import type { ErrorResponse } from '../types.js';

/**
 * Map HTTP status code to JsonRpcErrorCode
 * @param status - HTTP status code
 * @returns Appropriate JsonRpcErrorCode
 */
export function mapHttpStatusToErrorCode(status: number): JsonRpcErrorCode {
  switch (status) {
    case 400:
      return JsonRpcErrorCode.InvalidParams;
    case 401:
      return JsonRpcErrorCode.Unauthorized;
    case 403:
      return JsonRpcErrorCode.Forbidden;
    case 404:
      return JsonRpcErrorCode.InvalidParams; // File not found is an invalid param
    case 405:
      return JsonRpcErrorCode.MethodNotAllowed;
    case 408:
      return JsonRpcErrorCode.Timeout;
    case 409:
      return JsonRpcErrorCode.Conflict;
    case 429:
      return JsonRpcErrorCode.RateLimited;
    case 500:
    case 502:
    case 503:
    case 504:
      return JsonRpcErrorCode.ServiceUnavailable;
    default:
      return JsonRpcErrorCode.InternalError;
  }
}

/**
 * Create an McpError from an Obsidian API error response
 * @param status - HTTP status code
 * @param errorResponse - API error response
 * @param operation - Operation that failed (for context)
 * @returns McpError instance
 */
export function createErrorFromApiResponse(
  status: number,
  errorResponse: ErrorResponse | null,
  operation: string,
): McpError {
  const errorCode = mapHttpStatusToErrorCode(status);

  if (errorResponse) {
    const message = `Obsidian API error (${operation}): ${errorResponse.message}`;
    return new McpError(errorCode, message, {
      apiErrorCode: errorResponse.errorCode,
      httpStatus: status,
      operation,
    });
  }

  const message = `Obsidian API error (${operation}): HTTP ${status}`;
  return new McpError(errorCode, message, {
    httpStatus: status,
    operation,
  });
}

/**
 * Handle network/connection errors
 * @param error - Original error
 * @param operation - Operation that failed
 * @returns McpError instance
 */
export function handleNetworkError(
  error: unknown,
  operation: string,
): McpError {
  if (error instanceof Error) {
    // Check for common network error patterns
    if (error.message.includes('ECONNREFUSED')) {
      return new McpError(
        JsonRpcErrorCode.ServiceUnavailable,
        `Cannot connect to Obsidian API (${operation}). Ensure Obsidian is running and the Local REST API plugin is enabled.`,
        {
          originalError: error.message,
          operation,
        },
      );
    }

    if (
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('timeout')
    ) {
      return new McpError(
        JsonRpcErrorCode.Timeout,
        `Obsidian API request timed out (${operation})`,
        {
          originalError: error.message,
          operation,
        },
      );
    }

    if (
      error.message.includes('ENOTFOUND') ||
      error.message.includes('getaddrinfo')
    ) {
      return new McpError(
        JsonRpcErrorCode.ServiceUnavailable,
        `Cannot resolve Obsidian API host (${operation}). Check OBSIDIAN_BASE_URL configuration.`,
        {
          originalError: error.message,
          operation,
        },
      );
    }

    if (
      error.message.includes('certificate') ||
      error.message.includes('SSL') ||
      error.message.includes('TLS')
    ) {
      return new McpError(
        JsonRpcErrorCode.ServiceUnavailable,
        `SSL/TLS certificate error (${operation}). Try setting OBSIDIAN_VERIFY_SSL=false or trust the self-signed certificate.`,
        {
          originalError: error.message,
          operation,
        },
      );
    }

    return new McpError(
      JsonRpcErrorCode.InternalError,
      `Network error (${operation}): ${error.message}`,
      {
        originalError: error.message,
        operation,
      },
    );
  }

  return new McpError(
    JsonRpcErrorCode.InternalError,
    `Unknown error occurred (${operation})`,
    {
      operation,
    },
  );
}

/**
 * Validate Obsidian configuration
 * @param apiUrl - API URL
 * @param _apiToken - API token (optional - some local setups don't require auth, unused but kept for API compatibility)
 * @throws McpError if configuration is invalid
 */
export function validateObsidianConfig(
  apiUrl?: string,
  _apiToken?: string,
): void {
  if (!apiUrl) {
    throw new McpError(
      JsonRpcErrorCode.ConfigurationError,
      'OBSIDIAN_BASE_URL is not configured. Please set it in your environment variables.',
      { configKey: 'OBSIDIAN_BASE_URL' },
    );
  }

  // Note: apiToken is optional - some local Obsidian setups allow connections without authentication

  // Validate URL format
  try {
    new URL(apiUrl);
  } catch {
    throw new McpError(
      JsonRpcErrorCode.ConfigurationError,
      `Invalid OBSIDIAN_BASE_URL format: ${apiUrl}. Must be a valid URL (e.g., https://127.0.0.1:27124)`,
      { configKey: 'OBSIDIAN_BASE_URL', value: apiUrl },
    );
  }
}
