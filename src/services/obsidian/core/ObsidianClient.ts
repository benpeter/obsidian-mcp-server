/**
 * @fileoverview Obsidian API client using openapi-fetch for type-safe requests.
 * @module src/services/obsidian/core/ObsidianClient
 */

import createClient, { type Client } from 'openapi-fetch';
import { Agent, setGlobalDispatcher } from 'undici';
import type { paths } from '../types/obsidian-api.js';
import type { ObsidianConfig } from '../types.js';
import { validateObsidianConfig } from '../utils/error-mapper.js';
import { logger } from '@/utils/index.js';
import type { RequestContext } from '@/utils/index.js';

/**
 * Default timeout for Obsidian API requests (in milliseconds)
 */
const DEFAULT_TIMEOUT = 10000; // 10 seconds

/**
 * Detect if running in Bun environment
 */
const isBun = typeof Bun !== 'undefined';

/**
 * Create custom fetch function with timeout and optional certificate validation
 * @param config - Obsidian configuration
 * @param timeout - Request timeout in milliseconds
 * @param configureDispatcher - Whether to configure undici dispatcher (Node.js only)
 * @returns Custom fetch function
 */
function createCustomFetch(
  config: ObsidianConfig,
  timeout: number = DEFAULT_TIMEOUT,
  configureDispatcher = true,
) {
  // For Node.js with HTTPS, configure undici's global dispatcher if requested
  // Note: This affects all undici/fetch calls globally
  if (!isBun && config.apiUrl.startsWith('https://') && configureDispatcher) {
    const agent = new Agent({
      connect: {
        rejectUnauthorized: config.certValidation,
      },
    });
    setGlobalDispatcher(agent);
  }

  return async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    // Handle Request objects by extracting URL and merging init options
    let url: string | URL;
    const baseOptions: RequestInit = { ...init };

    if (input instanceof Request) {
      url = input.url;
      // Merge Request properties with init options
      Object.assign(baseOptions, {
        method: input.method,
        headers: input.headers,
        body: input.body || undefined,
      });
    } else {
      url = input;
    }

    const fetchOptions: RequestInit = { ...baseOptions };

    // For Bun with HTTPS, add TLS options
    if (isBun && config.apiUrl.startsWith('https://')) {
      Object.assign(fetchOptions, {
        tls: {
          rejectUnauthorized: config.certValidation,
        },
      });
    }

    // Add timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
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
 * @param configureDispatcher - Whether to configure undici dispatcher (Node.js only)
 * @returns Configured openapi-fetch client
 */
export function createObsidianClient(
  config: ObsidianConfig,
  timeout: number = DEFAULT_TIMEOUT,
  configureDispatcher = true,
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
    fetch: createCustomFetch(config, timeout, configureDispatcher),
  });

  return client;
}

/**
 * ObsidianClient class wrapping the openapi-fetch client
 */
export class ObsidianClient {
  private readonly client: Client<paths>;
  private readonly loggerInstance: typeof logger | undefined;
  private readonly dispatcherConfigured: boolean = false;

  constructor(config: ObsidianConfig, loggerInstance?: typeof logger) {
    this.loggerInstance = loggerInstance;

    // Configure dispatcher on first client creation
    // Note: undici's dispatcher is inherently global, so this affects all subsequent requests
    // If multiple clients with different SSL settings are needed, the last one configured wins
    const shouldConfigureDispatcher =
      !isBun && config.apiUrl.startsWith('https://');

    this.client = createObsidianClient(
      config,
      DEFAULT_TIMEOUT,
      shouldConfigureDispatcher,
    );
    this.dispatcherConfigured = shouldConfigureDispatcher;

    // Note: Initialization logging happens at provider level with proper RequestContext
  }

  /**
   * Get the underlying openapi-fetch client
   */
  getClient(): Client<paths> {
    return this.client;
  }

  /**
   * Check if this client configured the undici dispatcher
   * @returns True if dispatcher was configured by this instance
   */
  isDispatcherConfigured(): boolean {
    return this.dispatcherConfigured;
  }

  /**
   * Test API connectivity
   * @param appContext - Optional request context for logging correlation
   * @returns Object with connection status and optional error details
   */
  async testConnection(appContext?: RequestContext): Promise<{
    connected: boolean;
    error?: string;
  }> {
    // Only log when we have proper RequestContext from caller
    if (this.loggerInstance && appContext) {
      this.loggerInstance.debug('Testing Obsidian API connection', {
        ...appContext,
        operation: 'testConnection',
      });
    }

    try {
      // Try to list vault root to test connection
      const response = await this.client.GET('/vault/');

      if (response.response.ok) {
        if (this.loggerInstance && appContext) {
          this.loggerInstance.debug('Obsidian API connection successful', {
            ...appContext,
            operation: 'testConnection',
            httpStatus: response.response.status,
          });
        }
        return { connected: true };
      }

      const errorMsg = `HTTP ${response.response.status}: ${response.response.statusText}`;
      if (this.loggerInstance && appContext) {
        this.loggerInstance.debug('Obsidian API connection failed', {
          ...appContext,
          operation: 'testConnection',
          httpStatus: response.response.status,
          error: errorMsg,
        });
      }

      return {
        connected: false,
        error: errorMsg,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown connection error';

      if (this.loggerInstance && appContext) {
        this.loggerInstance.debug('Obsidian API connection error', {
          ...appContext,
          operation: 'testConnection',
          error: errorMessage,
        });
      }

      return {
        connected: false,
        error: errorMessage,
      };
    }
  }
}
