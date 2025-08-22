/**
 * @fileoverview Utilities for formatting stats and timestamps.
 * @module src/services/obsidianRestAPI/utils/formatting
 */

import { format } from "date-fns";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { logger, RequestContext } from "../../../utils/internal/index.js";
import { countTokens } from "../../../utils/metrics/index.js";

const DEFAULT_TIMESTAMP_FORMAT = "hh:mm:ss a | MM-dd-yyyy";

export function formatTimestamp(
  timestampMs: number | undefined | null,
  context: RequestContext,
  formatString: string = DEFAULT_TIMESTAMP_FORMAT,
): string {
  const operation = "formatTimestamp";
  if (
    timestampMs === undefined ||
    timestampMs === null ||
    !Number.isFinite(timestampMs)
  ) {
    const errorMessage = `Invalid timestamp provided for formatting: ${timestampMs}`;
    logger.warning(errorMessage, { ...context, operation });
    throw new McpError(BaseErrorCode.VALIDATION_ERROR, errorMessage, {
      ...context,
      operation,
    });
  }

  try {
    const date = new Date(timestampMs);
    if (isNaN(date.getTime())) {
      const errorMessage = `Timestamp resulted in an invalid date: ${timestampMs}`;
      logger.warning(errorMessage, { ...context, operation });
      throw new McpError(BaseErrorCode.VALIDATION_ERROR, errorMessage, {
        ...context,
        operation,
      });
    }
    return format(date, formatString);
  } catch (error) {
    const errorMessage = `Failed to format timestamp ${timestampMs}: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMessage, error instanceof Error ? error : undefined, {
      ...context,
      operation,
    });
    throw new McpError(BaseErrorCode.INTERNAL_ERROR, errorMessage, {
      ...context,
      operation,
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}

export interface ObsidianStat {
  ctime: number;
  mtime: number;
  size: number;
}

export interface FormattedTimestamps {
  createdTime: string;
  modifiedTime: string;
}

export function formatStatTimestamps(
  stat: ObsidianStat | undefined | null,
  context: RequestContext,
): FormattedTimestamps {
  const operation = "formatStatTimestamps";
  if (!stat) {
    logger.debug(
      "Stat object is undefined or null, returning N/A for timestamps.",
      { ...context, operation },
    );
    return {
      createdTime: "N/A",
      modifiedTime: "N/A",
    };
  }
  try {
    return {
      createdTime: formatTimestamp(stat.ctime, context),
      modifiedTime: formatTimestamp(stat.mtime, context),
    };
  } catch (error) {
    logger.error(
      `Error formatting timestamps within formatStatTimestamps for ctime: ${stat.ctime}, mtime: ${stat.mtime}`,
      error instanceof Error ? error : undefined,
      { ...context, operation },
    );
    return {
      createdTime: "N/A",
      modifiedTime: "N/A",
    };
  }
}

export interface FormattedStatWithTokenCount extends FormattedTimestamps {
  tokenCountEstimate: number;
}

export async function createFormattedStatWithTokenCount(
  stat: ObsidianStat | null | undefined,
  content: string,
  context: RequestContext,
): Promise<FormattedStatWithTokenCount | null | undefined> {
  const operation = "createFormattedStatWithTokenCount";
  if (stat === null || stat === undefined) {
    logger.debug("Input stat is null or undefined, returning as is.", {
      ...context,
      operation,
    });
    return stat;
  }

  const formattedTimestamps = formatStatTimestamps(stat, context);
  let tokenCountEstimate = -1;

  if (content && content.trim().length > 0) {
    try {
      tokenCountEstimate = await countTokens(content, context);
    } catch (tokenError) {
      logger.warning(
        `Failed to count tokens for stat object. Error: ${tokenError instanceof Error ? tokenError.message : String(tokenError)}`,
        {
          ...context,
          operation,
          originalError:
            tokenError instanceof Error
              ? tokenError.message
              : String(tokenError),
        },
      );
    }
  } else {
    logger.debug(
      "Content is empty or whitespace-only, setting tokenCountEstimate to 0.",
      { ...context, operation },
    );
    tokenCountEstimate = 0;
  }

  return {
    createdTime: formattedTimestamps.createdTime,
    modifiedTime: formattedTimestamps.modifiedTime,
    tokenCountEstimate: tokenCountEstimate,
  };
}
