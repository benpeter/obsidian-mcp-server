/**
 * @fileoverview Explicit API response types for Obsidian Local REST API.
 * These types represent the actual responses from the API, handling schema mismatches
 * between the auto-generated OpenAPI types and real API behavior.
 * @module src/services/obsidian/types/api-responses
 */

import type { NoteJson, Command, SearchResult } from '../types.js';

/**
 * Generic successful API response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  error?: never;
  response: Response;
}

/**
 * Generic error API response wrapper
 */
export interface ApiErrorResponse {
  data?: never;
  error: unknown;
  response: Response;
}

/**
 * Union type for any API response
 */
export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

/**
 * Response from note retrieval endpoints
 * Includes GET /active/, GET /vault/{path}, GET /periodic/{period}
 */
export interface NoteResponse {
  data: NoteJson;
}

/**
 * Response from vault list endpoint
 * GET /vault/{path} when path is a directory
 */
export interface VaultListResponse {
  files: string[];
}

/**
 * Response from command list endpoint
 * GET /commands/
 */
export interface CommandListResponse {
  commands: Command[];
}

/**
 * Response from search endpoints
 * POST /search/simple/, POST /search/
 */
export type SearchResponse = SearchResult;

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse<T>(
  response: ApiResult<T>,
): response is ApiErrorResponse {
  return 'error' in response && response.error !== undefined;
}

/**
 * Type guard to check if response is successful
 */
export function isSuccessResponse<T>(
  response: ApiResult<T>,
): response is ApiResponse<T> {
  return response.response.ok && 'data' in response;
}

/**
 * Type guard to check if response contains note data
 */
export function isNoteResponse(data: unknown): data is NoteJson {
  return (
    typeof data === 'object' &&
    data !== null &&
    'content' in data &&
    'path' in data &&
    typeof (data as { content: unknown }).content === 'string' &&
    typeof (data as { path: unknown }).path === 'string'
  );
}

/**
 * Type guard to check if response contains command list
 */
export function isCommandListResponse(
  data: unknown,
): data is CommandListResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'commands' in data &&
    Array.isArray((data as { commands: unknown }).commands)
  );
}

/**
 * Type guard to check if response contains vault file list
 */
export function isVaultListResponse(data: unknown): data is VaultListResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'files' in data &&
    Array.isArray((data as { files: unknown }).files)
  );
}

/**
 * Type guard to check if response contains search results
 */
export function isSearchResponse(data: unknown): data is SearchResult {
  return Array.isArray(data);
}

/**
 * Extract note data from response with type validation
 * @param data - Response data
 * @returns Validated note data
 * @throws TypeError if data is not a valid note response
 */
export function extractNoteData(data: unknown): NoteJson {
  if (!isNoteResponse(data)) {
    throw new TypeError(
      'Invalid note response: missing required fields (content, path)',
    );
  }
  return data;
}

/**
 * Extract command list from response with type validation
 * @param data - Response data
 * @returns Validated command list
 * @throws TypeError if data is not a valid command list response
 */
export function extractCommandList(data: unknown): Command[] {
  if (!isCommandListResponse(data)) {
    throw new TypeError(
      'Invalid command list response: expected object with commands array',
    );
  }
  return data.commands;
}

/**
 * Extract vault file list from response with type validation
 * @param data - Response data
 * @returns Validated file list
 * @throws TypeError if data is not a valid vault list response
 */
export function extractVaultFileList(data: unknown): string[] {
  if (!isVaultListResponse(data)) {
    throw new TypeError(
      'Invalid vault list response: expected object with files array',
    );
  }
  return data.files;
}

/**
 * Extract search results from response with type validation
 * @param data - Response data
 * @returns Validated search results
 * @throws TypeError if data is not a valid search response
 */
export function extractSearchResults(data: unknown): SearchResult {
  if (!isSearchResponse(data)) {
    throw new TypeError('Invalid search response: expected array of results');
  }
  return data;
}
