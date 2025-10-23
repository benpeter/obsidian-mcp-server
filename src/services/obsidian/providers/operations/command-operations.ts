/**
 * @fileoverview Command and UI operations for Obsidian API.
 * Handles listing and executing commands, and opening notes in the UI.
 * @module src/services/obsidian/providers/operations/command-operations
 */

import type { RequestContext } from '@/utils/index.js';
import { McpError, JsonRpcErrorCode } from '@/types-global/errors.js';
import { OperationBase } from '../shared/operation-base.js';
import type { Command } from '../shared/types.js';
import {
  normalizePath,
  encodePathForApi,
  isValidPath,
} from '../../utils/path-normalizer.js';
import {
  createErrorFromApiResponse,
  handleNetworkError,
} from '../../utils/error-mapper.js';

/**
 * Handles all command and UI-related operations
 */
export class CommandOperations extends OperationBase {
  /**
   * List all available Obsidian commands
   */
  async listCommands(appContext: RequestContext): Promise<Command[]> {
    this.logInfo(
      'Listing Obsidian commands',
      this.createContext('listCommands', appContext),
    );

    try {
      const client = this.getClient();
      const response = await client.GET('/commands/');

      if (this.isErrorResponse(response) || !response.response.ok) {
        throw createErrorFromApiResponse(
          response.response.status,
          response.error ?? null,
          'listCommands',
        );
      }

      if (!response.data) {
        throw new McpError(
          JsonRpcErrorCode.InternalError,
          'No data returned from Obsidian API',
        );
      }

      // Type assertion: API returns { commands: Command[] }
      const data = response.data as unknown as { commands?: Command[] };
      const commands = data.commands ?? [];

      this.logDebug(
        'Listed commands',
        this.createContext('listCommands', appContext, {
          commandCount: commands.length,
        }),
      );

      return commands;
    } catch (error) {
      this.logError(
        'Failed to list commands',
        this.createContext('listCommands', appContext, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      if (error instanceof McpError) {
        throw error;
      }
      throw handleNetworkError(error, 'listCommands');
    }
  }

  /**
   * Execute an Obsidian command by ID
   */
  async executeCommand(
    appContext: RequestContext,
    commandId: string,
  ): Promise<void> {
    this.logInfo(
      'Executing Obsidian command',
      this.createContext('executeCommand', appContext, { commandId }),
    );

    try {
      const client = this.getClient();
      const response = await client.POST('/commands/{commandId}/', {
        params: {
          path: {
            commandId,
          },
        },
      });

      if (this.isErrorResponse(response) || !response.response.ok) {
        throw createErrorFromApiResponse(
          response.response.status,
          response.error ?? null,
          'executeCommand',
        );
      }

      this.logDebug(
        'Command executed',
        this.createContext('executeCommand', appContext, { commandId }),
      );
    } catch (error) {
      this.logError(
        'Failed to execute command',
        this.createContext('executeCommand', appContext, {
          commandId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      if (error instanceof McpError) {
        throw error;
      }
      throw handleNetworkError(error, 'executeCommand');
    }
  }

  /**
   * Open a note in Obsidian UI
   */
  async openNote(
    appContext: RequestContext,
    path: string,
    newLeaf?: boolean,
  ): Promise<void> {
    if (!isValidPath(path)) {
      throw new McpError(
        JsonRpcErrorCode.InvalidParams,
        `Invalid note path: ${path}`,
      );
    }

    this.logInfo(
      'Opening note in Obsidian UI',
      this.createContext('openNote', appContext, { path, newLeaf }),
    );

    try {
      const normalizedPath = normalizePath(path);
      const encodedPath = encodePathForApi(normalizedPath);
      const client = this.getClient();

      const response = await client.POST('/open/{filename}', {
        params: {
          path: {
            filename: encodedPath,
          },
          ...(newLeaf !== undefined && { query: { newLeaf } }),
        },
      });

      if (this.isErrorResponse(response) || !response.response.ok) {
        throw createErrorFromApiResponse(
          response.response.status,
          response.error ?? null,
          'openNote',
        );
      }

      this.logDebug(
        'Opened note in UI',
        this.createContext('openNote', appContext, { path }),
      );
    } catch (error) {
      this.logError(
        'Failed to open note in UI',
        this.createContext('openNote', appContext, {
          path,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      if (error instanceof McpError) {
        throw error;
      }
      throw handleNetworkError(error, 'openNote');
    }
  }
}
