/**
 * @fileoverview Command and UI operations for Obsidian API.
 * Handles listing and executing commands, and opening notes in the UI.
 * @module src/services/obsidian/providers/operations/command-operations
 */

import type { RequestContext } from '@/utils/index.js';
import { OperationBase } from '../shared/operation-base.js';
import type { Command } from '../shared/types.js';
import {
  normalizePath,
  encodePathForApi,
} from '../../utils/path-normalizer.js';
import { validateNotePath, validateCommandId } from '../../utils/validators.js';

/**
 * Handles all command and UI-related operations
 */
export class CommandOperations extends OperationBase {
  /**
   * List all available Obsidian commands
   */
  async listCommands(appContext: RequestContext): Promise<Command[]> {
    return this.executeOperation('listCommands', appContext, async () => {
      const response = await this.apiGet('/commands/');
      return this.extractCommandList(response.data);
    });
  }

  /**
   * Execute an Obsidian command by ID
   */
  async executeCommand(
    appContext: RequestContext,
    commandId: string,
  ): Promise<void> {
    // Validate command ID
    validateCommandId(commandId);

    return this.executeOperation(
      'executeCommand',
      appContext,
      async () => {
        await this.apiPost('/commands/{commandId}/', {
          params: {
            path: {
              commandId,
            },
          },
        });
      },
      { commandId },
    );
  }

  /**
   * Open a note in Obsidian UI
   */
  async openNote(
    appContext: RequestContext,
    path: string,
    newLeaf?: boolean,
  ): Promise<void> {
    // Validate path
    validateNotePath(path);

    const normalizedPath = normalizePath(path);
    const encodedPath = encodePathForApi(normalizedPath);

    return this.executeOperation(
      'openNote',
      appContext,
      async () => {
        await this.apiPost('/open/{filename}', {
          params: {
            path: {
              filename: encodedPath,
            },
            ...(newLeaf !== undefined && { query: { newLeaf } }),
          },
        });
      },
      { path: normalizedPath, newLeaf },
    );
  }
}
