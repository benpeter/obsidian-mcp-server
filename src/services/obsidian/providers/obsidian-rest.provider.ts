/**
 * @fileoverview Obsidian REST API provider implementation.
 * Orchestrates operations via specialized operation handler classes.
 * @module src/services/obsidian/providers/obsidian-rest
 */

import { injectable, inject } from 'tsyringe';
import type { AppConfig } from '@/config/index.js';
import { AppConfig as AppConfigToken, Logger } from '@/container/tokens.js';
import { logger } from '@/utils/index.js';
import type { RequestContext } from '@/utils/index.js';
import { ObsidianClient } from '../core/ObsidianClient.js';
import type { IObsidianProvider } from '../core/IObsidianProvider.js';
import type {
  NoteJson,
  Command,
  SearchResult,
  NoteOptions,
  SearchOptions,
  PatchOptions,
  PeriodicNoteParams,
  VaultFile,
  ObsidianConfig,
} from '../types.js';
import {
  NoteOperations,
  SearchOperations,
  PeriodicOperations,
  CommandOperations,
} from './operations/index.js';

/**
 * Obsidian REST API provider implementation
 * Delegates operations to specialized handler classes
 */
@injectable()
export class ObsidianRestProvider implements IObsidianProvider {
  private client: ObsidianClient;
  private config: ObsidianConfig;
  private logger: typeof logger;

  // Operation handlers
  private noteOps: NoteOperations;
  private searchOps: SearchOperations;
  private periodicOps: PeriodicOperations;
  private commandOps: CommandOperations;

  constructor(
    @inject(AppConfigToken) appConfig: AppConfig,
    @inject(Logger) loggerInstance: typeof logger,
  ) {
    this.logger = loggerInstance;

    // Extract Obsidian config or use defaults
    const obsidianConfig = appConfig.obsidian ?? {
      apiUrl: 'https://127.0.0.1:27124',
      apiToken: undefined,
      certValidation: false,
    };

    this.config = {
      apiUrl: obsidianConfig.apiUrl,
      apiToken: obsidianConfig.apiToken,
      certValidation: obsidianConfig.certValidation,
    };

    this.client = new ObsidianClient(this.config);

    // Initialize operation handlers
    this.noteOps = new NoteOperations(this.client, this.logger);
    this.searchOps = new SearchOperations(this.client, this.logger);
    this.periodicOps = new PeriodicOperations(this.client, this.logger);
    this.commandOps = new CommandOperations(this.client, this.logger);
  }

  /**
   * Health check for the Obsidian API connection
   */
  async healthCheck(
    appContext: RequestContext,
  ): Promise<{ healthy: boolean; details?: string }> {
    this.logger.info('Performing Obsidian API health check', {
      operation: 'healthCheck',
      ...appContext,
    });

    const result = await this.client.testConnection();

    if (result.connected) {
      this.logger.info('Obsidian API health check passed', {
        operation: 'healthCheck',
        healthy: true,
        ...appContext,
      });
      return { healthy: true };
    }

    this.logger.warning('Obsidian API health check failed', {
      operation: 'healthCheck',
      healthy: false,
      error: result.error,
      ...appContext,
    });

    return {
      healthy: false,
      details: result.error || 'API connection test failed',
    };
  }

  // ===== Active Note Operations (delegated to NoteOperations) =====

  async getActiveNote(appContext: RequestContext): Promise<NoteJson> {
    return this.noteOps.getActiveNote(appContext);
  }

  async updateActiveNote(
    appContext: RequestContext,
    content: string,
  ): Promise<NoteJson> {
    return this.noteOps.updateActiveNote(appContext, content);
  }

  async appendActiveNote(
    appContext: RequestContext,
    content: string,
  ): Promise<NoteJson> {
    return this.noteOps.appendActiveNote(appContext, content);
  }

  async patchActiveNote(
    appContext: RequestContext,
    options: Omit<PatchOptions, 'path'>,
  ): Promise<NoteJson> {
    return this.noteOps.patchActiveNote(appContext, options);
  }

  async deleteActiveNote(appContext: RequestContext): Promise<void> {
    return this.noteOps.deleteActiveNote(appContext);
  }

  // ===== General Note Operations (delegated to NoteOperations) =====

  async listVaultFiles(
    appContext: RequestContext,
    path?: string,
  ): Promise<VaultFile[]> {
    return this.noteOps.listVaultFiles(appContext, path);
  }

  async getNote(appContext: RequestContext, path: string): Promise<NoteJson> {
    return this.noteOps.getNote(appContext, path);
  }

  async createNote(
    appContext: RequestContext,
    options: NoteOptions,
  ): Promise<NoteJson> {
    return this.noteOps.createNote(appContext, options);
  }

  async appendNote(
    appContext: RequestContext,
    path: string,
    content: string,
  ): Promise<NoteJson> {
    return this.noteOps.appendNote(appContext, path, content);
  }

  async patchNote(
    appContext: RequestContext,
    options: PatchOptions,
  ): Promise<NoteJson> {
    return this.noteOps.patchNote(appContext, options);
  }

  async deleteNote(appContext: RequestContext, path: string): Promise<void> {
    return this.noteOps.deleteNote(appContext, path);
  }

  // ===== Search Operations (delegated to SearchOperations) =====

  async searchSimple(
    appContext: RequestContext,
    options: SearchOptions,
  ): Promise<SearchResult> {
    return this.searchOps.searchSimple(appContext, options);
  }

  async searchDataview(
    appContext: RequestContext,
    query: string,
  ): Promise<SearchResult> {
    return this.searchOps.searchDataview(appContext, query);
  }

  async searchJsonLogic(
    appContext: RequestContext,
    query: Record<string, unknown>,
  ): Promise<SearchResult> {
    return this.searchOps.searchJsonLogic(appContext, query);
  }

  // ===== Periodic Notes Operations (delegated to PeriodicOperations) =====

  async getPeriodicNote(
    appContext: RequestContext,
    params: PeriodicNoteParams,
  ): Promise<NoteJson> {
    return this.periodicOps.getPeriodicNote(appContext, params);
  }

  async appendPeriodicNote(
    appContext: RequestContext,
    params: PeriodicNoteParams,
    content: string,
  ): Promise<NoteJson> {
    return this.periodicOps.appendPeriodicNote(appContext, params, content);
  }

  async patchPeriodicNote(
    appContext: RequestContext,
    params: PeriodicNoteParams,
    patchOptions: Omit<PatchOptions, 'path'>,
  ): Promise<NoteJson> {
    return this.periodicOps.patchPeriodicNote(appContext, params, patchOptions);
  }

  async deletePeriodicNote(
    appContext: RequestContext,
    params: PeriodicNoteParams,
  ): Promise<void> {
    return this.periodicOps.deletePeriodicNote(appContext, params);
  }

  // ===== Commands & UI Operations (delegated to CommandOperations) =====

  async listCommands(appContext: RequestContext): Promise<Command[]> {
    return this.commandOps.listCommands(appContext);
  }

  async executeCommand(
    appContext: RequestContext,
    commandId: string,
  ): Promise<void> {
    return this.commandOps.executeCommand(appContext, commandId);
  }

  async openNote(
    appContext: RequestContext,
    path: string,
    newLeaf?: boolean,
  ): Promise<void> {
    return this.commandOps.openNote(appContext, path, newLeaf);
  }
}
