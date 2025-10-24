/**
 * @fileoverview Service for registering MCP prompts on a server instance.
 * Prompts are structured message templates that users can discover and invoke.
 *
 * MCP Prompts Specification:
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/basic/prompts | MCP Prompts}
 * @module src/mcp-server/prompts/prompt-registration
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { inject, injectable } from 'tsyringe';

import { Logger } from '@/container/tokens.js';
import { allPromptDefinitions } from './definitions/index.js';
import {
  logger as defaultLogger,
  requestContextService,
} from '@/utils/index.js';

@injectable()
export class PromptRegistry {
  constructor(@inject(Logger) private logger: typeof defaultLogger) {}

  /**
   * Registers all prompts on the given MCP server.
   */
  registerAll(server: McpServer): void {
    const context = requestContextService.createRequestContext({
      operation: 'PromptRegistry.registerAll',
    });

    this.logger.debug(
      `Registering ${allPromptDefinitions.length} prompts...`,
      context,
    );

    // Register each prompt using the SDK's registerPrompt API
    for (const promptDef of allPromptDefinitions) {
      this.logger.debug(`Registering prompt: ${promptDef.name}`, context);

      // Build prompt options with optional argsSchema
      const promptOptions: {
        description: string;
        argsSchema?: unknown;
      } = {
        description: promptDef.description,
      };

      // Use optional chaining to safely access shape
      const schema = promptDef.argumentsSchema;
      if (schema) {
        // @ts-expect-error - TypeScript infers 'never' for empty arrays, but this code is safe when prompts exist
        promptOptions.argsSchema = schema.shape;
      }

      server.registerPrompt(
        promptDef.name,
        promptOptions as Parameters<typeof server.registerPrompt>[1],
        async (args: Record<string, unknown>) => {
          const messages = await promptDef.generate(args as never);
          return { messages };
        },
      );

      this.logger.info(`Registered prompt: ${promptDef.name}`, context);
    }

    this.logger.info(
      `Successfully registered ${allPromptDefinitions.length} prompts`,
      context,
    );
  }
}
