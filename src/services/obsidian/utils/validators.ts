/**
 * @fileoverview Input validation utilities for Obsidian service operations.
 * Provides consistent validation with helpful error messages across all operations.
 * @module src/services/obsidian/utils/validators
 */

import { McpError, JsonRpcErrorCode } from '@/types-global/errors.js';
import type {
  PeriodicNoteParams,
  PeriodicNotePeriod,
  SearchOptions,
  PatchOptions,
} from '../types.js';

/**
 * Valid periodic note periods
 */
const VALID_PERIODS: readonly PeriodicNotePeriod[] = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
] as const;

/**
 * Validate a file path for security and format
 * @param path - File path to validate
 * @param paramName - Parameter name for error messages
 * @throws McpError if path is invalid
 */
export function validateNotePath(path: string, paramName = 'path'): void {
  if (!path) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      `${paramName} is required and cannot be empty`,
    );
  }

  if (typeof path !== 'string') {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      `${paramName} must be a string, got ${typeof path}`,
    );
  }

  // Check for path traversal attempts
  if (path.includes('..')) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      `${paramName} contains path traversal sequence (..) which is not allowed for security reasons`,
      { path, violation: 'path_traversal' },
    );
  }

  // Check for invalid filesystem characters
  // Windows: < > : " | ? * and control characters (0x00-0x1f)
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  if (invalidChars.test(path)) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      `${paramName} contains invalid characters. Avoid: < > : " | ? * and control characters`,
      { path, violation: 'invalid_characters' },
    );
  }

  // Check for absolute paths (should be relative to vault root)
  if (path.startsWith('/') && path.length > 1) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      `${paramName} should be relative to vault root, not an absolute path`,
      { path, violation: 'absolute_path' },
    );
  }
}

/**
 * Validate periodic note parameters
 * @param params - Periodic note parameters to validate
 * @throws McpError if parameters are invalid
 */
export function validatePeriodicParams(params: PeriodicNoteParams): void {
  if (!params) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'Periodic note parameters are required',
    );
  }

  if (!params.period) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'period is required for periodic note operations',
    );
  }

  if (!VALID_PERIODS.includes(params.period)) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      `Invalid period: "${params.period}". Must be one of: ${VALID_PERIODS.join(', ')}`,
      { provided: params.period, valid: VALID_PERIODS },
    );
  }

  // Validate year if provided
  if (params.year !== undefined) {
    if (
      !Number.isInteger(params.year) ||
      params.year < 1900 ||
      params.year > 2100
    ) {
      throw new McpError(
        JsonRpcErrorCode.InvalidParams,
        `Invalid year: ${params.year}. Must be an integer between 1900 and 2100`,
        { year: params.year },
      );
    }
  }

  // Validate month if provided (1-12)
  if (params.month !== undefined) {
    if (
      !Number.isInteger(params.month) ||
      params.month < 1 ||
      params.month > 12
    ) {
      throw new McpError(
        JsonRpcErrorCode.InvalidParams,
        `Invalid month: ${params.month}. Must be an integer between 1 and 12`,
        { month: params.month },
      );
    }
  }

  // Validate day if provided (1-31)
  if (params.day !== undefined) {
    if (!Number.isInteger(params.day) || params.day < 1 || params.day > 31) {
      throw new McpError(
        JsonRpcErrorCode.InvalidParams,
        `Invalid day: ${params.day}. Must be an integer between 1 and 31`,
        { day: params.day },
      );
    }
  }

  // Logical validation based on period type
  if (
    params.period === 'daily' &&
    params.year === undefined &&
    params.day !== undefined
  ) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'For daily notes, if day is specified, year must also be specified',
      { period: params.period, year: params.year, day: params.day },
    );
  }

  if (params.period === 'weekly' && params.day !== undefined) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'day parameter is not applicable for weekly notes',
      { period: params.period },
    );
  }

  if (
    params.period === 'yearly' &&
    (params.month !== undefined || params.day !== undefined)
  ) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'month and day parameters are not applicable for yearly notes',
      { period: params.period },
    );
  }
}

/**
 * Validate command ID format
 * @param commandId - Command ID to validate
 * @throws McpError if command ID is invalid
 */
export function validateCommandId(commandId: string): void {
  if (!commandId) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'commandId is required and cannot be empty',
    );
  }

  if (typeof commandId !== 'string') {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      `commandId must be a string, got ${typeof commandId}`,
    );
  }

  // Command IDs should be reasonable length (typically plugin:command-name)
  if (commandId.length > 200) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      `commandId is too long (${commandId.length} characters). Maximum is 200`,
      { commandId: commandId.substring(0, 50) + '...' },
    );
  }

  // Check for obvious injection attempts
  if (
    commandId.includes('\x00') ||
    commandId.includes('\n') ||
    commandId.includes('\r')
  ) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'commandId contains invalid control characters',
      { violation: 'control_characters' },
    );
  }
}

/**
 * Validate search options
 * @param options - Search options to validate
 * @throws McpError if options are invalid
 */
export function validateSearchOptions(options: SearchOptions): void {
  if (!options) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'Search options are required',
    );
  }

  if (!options.query) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'query is required for search operations',
    );
  }

  if (typeof options.query !== 'string') {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      `query must be a string, got ${typeof options.query}`,
    );
  }

  if (options.query.length === 0) {
    throw new McpError(JsonRpcErrorCode.InvalidParams, 'query cannot be empty');
  }

  if (options.query.length > 10000) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      `query is too long (${options.query.length} characters). Maximum is 10000`,
    );
  }

  // Validate contextLength if provided
  if (options.contextLength !== undefined) {
    if (!Number.isInteger(options.contextLength) || options.contextLength < 0) {
      throw new McpError(
        JsonRpcErrorCode.InvalidParams,
        `contextLength must be a non-negative integer, got ${options.contextLength}`,
        { contextLength: options.contextLength },
      );
    }

    if (options.contextLength > 1000) {
      throw new McpError(
        JsonRpcErrorCode.InvalidParams,
        `contextLength is too large (${options.contextLength}). Maximum is 1000`,
        { contextLength: options.contextLength },
      );
    }
  }
}

/**
 * Validate PATCH operation options
 * @param options - PATCH options to validate
 * @throws McpError if options are invalid
 */
export function validatePatchOptions(
  options: PatchOptions | Omit<PatchOptions, 'path'>,
): void {
  if (!options) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'PATCH options are required',
    );
  }

  // Validate path if present (for non-active note operations)
  if ('path' in options && options.path) {
    validateNotePath(options.path, 'options.path');
  }

  // Validate operation
  const validOperations = ['append', 'prepend', 'replace'] as const;
  if (!options.operation) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'operation is required for PATCH operations',
    );
  }

  if (!validOperations.includes(options.operation)) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      `Invalid operation: "${options.operation}". Must be one of: ${validOperations.join(', ')}`,
      { provided: options.operation, valid: validOperations },
    );
  }

  // Validate targetType
  const validTargetTypes = ['heading', 'block', 'frontmatter'] as const;
  if (!options.targetType) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'targetType is required for PATCH operations',
    );
  }

  if (!validTargetTypes.includes(options.targetType)) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      `Invalid targetType: "${options.targetType}". Must be one of: ${validTargetTypes.join(', ')}`,
      { provided: options.targetType, valid: validTargetTypes },
    );
  }

  // Validate target
  if (!options.target) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'target is required for PATCH operations',
    );
  }

  if (typeof options.target !== 'string') {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      `target must be a string, got ${typeof options.target}`,
    );
  }

  // Validate content
  if (options.content === undefined || options.content === null) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'content is required for PATCH operations',
    );
  }

  if (typeof options.content !== 'string') {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      `content must be a string, got ${typeof options.content}`,
    );
  }

  // Validate optional parameters
  if (
    options.targetDelimiter !== undefined &&
    typeof options.targetDelimiter !== 'string'
  ) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      `targetDelimiter must be a string, got ${typeof options.targetDelimiter}`,
    );
  }

  if (
    options.trimTargetWhitespace !== undefined &&
    typeof options.trimTargetWhitespace !== 'boolean'
  ) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      `trimTargetWhitespace must be a boolean, got ${typeof options.trimTargetWhitespace}`,
    );
  }
}

/**
 * Validate JsonLogic query object
 * @param query - JsonLogic query to validate
 * @throws McpError if query is invalid
 */
export function validateJsonLogicQuery(query: Record<string, unknown>): void {
  if (!query) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'JsonLogic query is required',
    );
  }

  if (typeof query !== 'object' || Array.isArray(query)) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'JsonLogic query must be an object',
      { provided: typeof query },
    );
  }

  // Basic validation - at least one key
  if (Object.keys(query).length === 0) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'JsonLogic query cannot be empty',
    );
  }
}

/**
 * Validate Dataview DQL query string
 * @param query - DQL query string to validate
 * @throws McpError if query is invalid
 */
export function validateDataviewQuery(query: string): void {
  if (!query) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'Dataview query is required',
    );
  }

  if (typeof query !== 'string') {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      `Dataview query must be a string, got ${typeof query}`,
    );
  }

  if (query.trim().length === 0) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'Dataview query cannot be empty',
    );
  }

  if (query.length > 10000) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      `Dataview query is too long (${query.length} characters). Maximum is 10000`,
    );
  }
}
