/**
 * @fileoverview Obsidian API client using openapi-fetch for type-safe requests.
 * @module src/services/obsidian/core/ObsidianClient
 */

import createClient, { type Client } from 'openapi-fetch';
import type { paths } from '../types/obsidian-api.js';
import type { ObsidianConfig } from '../types.js';
import { validateObsidianConfig } from '../utils/error-mapper.js';
import https from 'node:https';

/**
 * Default timeout for Obsidian API requests (in milliseconds)
 */
const DEFAULT_TIMEOUT = 10000; // 10 seconds

/**
 * Detect if running in Node.js environment
 * @returns True if running in Node.js
 */
function isNodeEnvironment(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.versions != null &&
    process.versions.node != null
  );
}

/**
 * Create custom fetch function with timeout and optional certificate validation
 * @param config - Obsidian configuration
 * @param timeout - Request timeout in milliseconds
 * @returns Custom fetch function
 */
function createCustomFetch(
  config: ObsidianConfig,
  timeout: number = DEFAULT_TIMEOUT,
) {
  return async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const fetchOptions: RequestInit = { ...init };

    // Add HTTPS agent for certificate validation (Node.js only)
    if (isNodeEnvironment() && config.apiUrl.startsWith('https://')) {
      const agent = new https.Agent({
        rejectUnauthorized: config.certValidation,
      });
      // @ts-expect-error - agent is Node.js specific
      fetchOptions.agent = agent;
    }

    // Add timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(input, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };
}

/**
 * Create and configure an Obsidian API client
 * @param config - Obsidian configuration
 * @param timeout - Optional request timeout in milliseconds (default: 10000)
 * @returns Configured openapi-fetch client
 */
export function createObsidianClient(
  config: ObsidianConfig,
  timeout: number = DEFAULT_TIMEOUT,
): Client<paths> {
  // Validate configuration
  validateObsidianConfig(config.apiUrl, config.apiToken);

  // Create headers with optional authorization
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.apiToken) {
    headers.Authorization = `Bearer ${config.apiToken}`;
  }

  // Create the base client with custom fetch
  const client = createClient<paths>({
    baseUrl: config.apiUrl,
    headers,
    fetch: createCustomFetch(config, timeout),
  });

  return client;
}

/**
 * ObsidianClient class wrapping the openapi-fetch client
 */
export class ObsidianClient {
  private client: Client<paths>;

  constructor(config: ObsidianConfig) {
    this.client = createObsidianClient(config);
  }

  /**
   * Get the underlying openapi-fetch client
   */
  getClient(): Client<paths> {
    return this.client;
  }

  /**
   * Test API connectivity
   * @returns Object with connection status and optional error details
   */
  async testConnection(): Promise<{
    connected: boolean;
    error?: string;
  }> {
    try {
      // Try to list vault root to test connection
      const response = await this.client.GET('/vault/');

      if (response.response.ok) {
        return { connected: true };
      }

      return {
        connected: false,
        error: `HTTP ${response.response.status}: ${response.response.statusText}`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown connection error';
      return {
        connected: false,
        error: errorMessage,
      };
    }
  }
}
