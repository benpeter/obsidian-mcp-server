/**
 * @fileoverview Utilities for handling API errors.
 * @module src/services/obsidianRestAPI/utils/apiErrors
 */
import { RequestContext, logger } from "../../../utils/index.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";

export type FetchError =
  | {
      data?: any;
      error: string | object;
    }
  | {
      data?: any;
      error?: undefined;
    };

export function handleApiError(
  error: FetchError,
  context: RequestContext,
  operation: string,
): McpError {
  const errorMessage =
    typeof error.error === "string" ? error.error : JSON.stringify(error.error);
  logger.error(`Obsidian API Error during ${operation}: ${errorMessage}`, {
    ...context,
    apiError: error,
  });

  if (errorMessage.includes("Not Found")) {
    return new McpError(
      BaseErrorCode.NOT_FOUND,
      `File or resource not found in Obsidian during ${operation}.`,
      { ...context, originalError: error },
    );
  }

  return new McpError(
    BaseErrorCode.SERVICE_UNAVAILABLE,
    `An error occurred while communicating with the Obsidian API during ${operation}.`,
    { ...context, originalError: error },
  );
}
