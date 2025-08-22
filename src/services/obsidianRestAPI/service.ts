/**
 * @module ObsidianRestApiService
 * @description
 * This module provides the core implementation for the Obsidian REST API service.
 * It encapsulates the logic for making authenticated requests to the API endpoints.
 */

import createClient from "openapi-fetch";
import { config } from "../../config/index.js";
import { BaseErrorCode, McpError } from "../../types-global/errors.js";
import {
  logger,
  RequestContext,
  requestContextService,
} from "../../utils/index.js";
import { components, paths } from "./generated-types.js";
import { VaultCacheService } from "./vaultCache/index.js";
import {
  FetchError,
  handleApiError,
  encodeVaultPath,
  encodeDirectoryPath,
} from "./utils/index.js";

// Define a type for our client for easier use
export type ObsidianApiClient = ReturnType<typeof createClient<paths>>;
type NoteJson = components["schemas"]["NoteJson"];
type NoteStat = components["schemas"]["NoteJson"]["stat"];
type ObsidianCommand = NonNullable<
  paths["/commands/"]["get"]["responses"]["200"]["content"]["application/json"]["commands"]
>[number];
type Period =
  paths["/periodic/{period}/"]["get"]["parameters"]["path"]["period"];
type SimpleSearchResult =
  paths["/search/simple/"]["post"]["responses"]["200"]["content"]["application/json"];
type ComplexSearchResult =
  paths["/search/"]["post"]["responses"]["200"]["content"]["application/json"];

type PatchHeaders = paths["/vault/{filename}"]["patch"]["parameters"]["header"];

export interface PatchOptions {
  operation: "append" | "prepend" | "replace";
  targetType: "heading" | "block" | "frontmatter";
  target: string;
  targetDelimiter?: string;
  trimTargetWhitespace?: boolean;
  createTargetIfMissing?: boolean;
  contentType?: "text/markdown" | "application/json";
}

export class ObsidianRestApiService {
  private apiClient: ObsidianApiClient;
  private vaultCacheService: VaultCacheService | null = null;

  constructor() {
    if (!config.obsidianApiKey) {
      throw new McpError(
        BaseErrorCode.CONFIGURATION_ERROR,
        "Obsidian API Key is missing in configuration.",
        {},
      );
    }

    this.apiClient = createClient<paths>({
      baseUrl: config.obsidianBaseUrl.replace(/\/$/, ""),
      headers: {
        Authorization: `Bearer ${config.obsidianApiKey}`,
      },
    });

    logger.info(
      `ObsidianRestApiService initialized with base URL: ${config.obsidianBaseUrl}`,
      requestContextService.createRequestContext({
        operation: "ObsidianServiceInit",
        verifySsl: config.obsidianVerifySsl,
      }),
    );
  }

  public setVaultCacheService(service: VaultCacheService) {
    this.vaultCacheService = service;
  }

  private async _performWriteOperation(
    filePath: string | null | undefined,
    context: RequestContext,
    operation: () => Promise<void>,
  ): Promise<void> {
    await operation();
    if (this.vaultCacheService && filePath) {
      this.vaultCacheService
        .updateCacheForFile(filePath, context)
        .catch((err) => {
          logger.error(`Background cache update failed for ${filePath}`, {
            ...context,
            error: err,
          });
        });
    }
  }

  private _buildPatchHeaders(options: PatchOptions): PatchHeaders {
    const headers: PatchHeaders = {
      Operation: options.operation,
      "Target-Type": options.targetType,
      Target: encodeURIComponent(options.target),
    };
    if (options.targetDelimiter) {
      headers["Target-Delimiter"] = options.targetDelimiter;
    }
    if (options.trimTargetWhitespace !== undefined) {
      headers["Trim-Target-Whitespace"] = String(
        options.trimTargetWhitespace,
      ) as "true" | "false";
    }
    if (options.createTargetIfMissing !== undefined) {
      headers["Create-Target-If-Missing"] = String(
        options.createTargetIfMissing,
      ) as "true" | "false";
    }
    if (options.contentType) {
      headers["Content-Type"] = options.contentType;
    } else {
      headers["Content-Type"] = "text/markdown";
    }

    return headers;
  }

  // --- Status Method ---
  async checkStatus(context: RequestContext) {
    const { data, error } = await this.apiClient.GET(`/`, {});
    if (error) {
      logger.error(`Failed to check Obsidian API status`, {
        ...context,
        error,
      });
      throw handleApiError(error as FetchError, context, "checkStatus");
    }
    return data;
  }

  // --- Vault Methods ---

  async getFileContent(
    filePath: string,
    format: "markdown" | "json" = "markdown",
    context: RequestContext,
  ): Promise<string | NoteJson> {
    const acceptHeader =
      format === "json" ? "application/vnd.olrapi.note+json" : "text/markdown";
    const encodedFilename = encodeVaultPath(filePath);

    const { data, error } = await this.apiClient.GET(`/vault/{filename}`, {
      params: {
        path: { filename: encodedFilename },
      },
      headers: {
        Accept: acceptHeader,
      },
    });

    if (error) {
      logger.error(`Failed to get file content for ${filePath}`, {
        ...context,
        error,
      });
      throw handleApiError(error as FetchError, context, "getFileContent");
    }
    return data as string | NoteJson;
  }

  async updateFileContent(
    filePath: string,
    content: string,
    context: RequestContext,
  ): Promise<void> {
    await this._performWriteOperation(filePath, context, async () => {
      const encodedFilename = encodeVaultPath(filePath);
      const { error } = await this.apiClient.PUT(`/vault/{filename}`, {
        params: {
          path: { filename: encodedFilename },
        },
        headers: {
          "Content-Type": "text/markdown",
        },
        body: content,
      });

      if (error) {
        logger.error(`Failed to update file content for ${filePath}`, {
          ...context,
          error,
        });
        throw handleApiError(error as FetchError, context, "updateFileContent");
      }
    });
  }

  async appendFileContent(
    filePath: string,
    content: string,
    context: RequestContext,
  ): Promise<void> {
    await this._performWriteOperation(filePath, context, async () => {
      const encodedFilename = encodeVaultPath(filePath);
      const { error } = await this.apiClient.POST(`/vault/{filename}`, {
        params: {
          path: { filename: encodedFilename },
        },
        headers: {
          "Content-Type": "text/markdown",
        },
        body: content,
      });

      if (error) {
        logger.error(`Failed to append file content for ${filePath}`, {
          ...context,
          error,
        });
        throw handleApiError(error as FetchError, context, "appendFileContent");
      }
    });
  }

  async deleteFile(filePath: string, context: RequestContext): Promise<void> {
    await this._performWriteOperation(filePath, context, async () => {
      const encodedFilename = encodeVaultPath(filePath);
      const { error } = await this.apiClient.DELETE(`/vault/{filename}`, {
        params: {
          path: { filename: encodedFilename },
        },
      });

      if (error) {
        logger.error(`Failed to delete file ${filePath}`, {
          ...context,
          error,
        });
        throw handleApiError(error as FetchError, context, "deleteFile");
      }
    });
  }

  async listFiles(dirPath: string, context: RequestContext): Promise<string[]> {
    type FileListResponse =
      paths["/vault/"]["get"]["responses"]["200"]["content"]["application/json"];
    const encodedPath = encodeDirectoryPath(dirPath);

    const { data, error } = encodedPath
      ? await this.apiClient.GET(`/vault/{pathToDirectory}/`, {
          params: {
            path: { pathToDirectory: encodedPath },
          },
        })
      : await this.apiClient.GET(`/vault/`, {});

    if (error) {
      logger.error(`Failed to list files in ${dirPath}`, { ...context, error });
      throw handleApiError(error as FetchError, context, "listFiles");
    }
    return (data as FileListResponse).files ?? [];
  }

  async getFileMetadata(
    filePath: string,
    context: RequestContext,
  ): Promise<NoteStat | null> {
    const encodedFilename = encodeVaultPath(filePath);
    const { error, response } = await this.apiClient.HEAD(`/vault/{filename}`, {
      params: {
        path: { filename: encodedFilename },
      },
    });

    if (error) {
      if (response.status !== 404) {
        logger.error(`Failed to get file metadata for ${filePath}`, {
          ...context,
          error,
        });
      }
      return null;
    }

    if (response.ok && response.headers) {
      const headers = response.headers;
      return {
        mtime: headers.get("x-obsidian-mtime")
          ? parseFloat(headers.get("x-obsidian-mtime")!) * 1000
          : 0,
        ctime: headers.get("x-obsidian-ctime")
          ? parseFloat(headers.get("x-obsidian-ctime")!) * 1000
          : 0,
        size: headers.get("content-length")
          ? parseInt(headers.get("content-length")!, 10)
          : 0,
      };
    }
    return null;
  }

  // --- Search Methods ---

  async searchSimple(
    query: string,
    contextLength: number = 100,
    context: RequestContext,
  ): Promise<SimpleSearchResult> {
    const { data, error } = await this.apiClient.POST(`/search/simple/`, {
      params: {
        query: { query, contextLength },
      },
    });

    if (error) {
      logger.error(`Failed to perform simple search for "${query}"`, {
        ...context,
        error,
      });
      throw handleApiError(error as FetchError, context, "searchSimple");
    }
    return data;
  }

  async searchComplex(
    query: string | object,
    contentType:
      | "application/vnd.olrapi.dataview.dql+txt"
      | "application/vnd.olrapi.jsonlogic+json",
    context: RequestContext,
  ): Promise<ComplexSearchResult> {
    const { data, error } = await this.apiClient.POST(`/search/`, {
      headers: { "Content-Type": contentType },
      body: query as any,
    });

    if (error) {
      logger.error(`Failed to perform complex search`, { ...context, error });
      throw handleApiError(error as FetchError, context, "searchComplex");
    }
    return data;
  }

  // --- Command Methods ---

  async executeCommand(
    commandId: string,
    context: RequestContext,
  ): Promise<void> {
    const { error } = await this.apiClient.POST(`/commands/{commandId}/`, {
      params: {
        path: { commandId },
      },
    });

    if (error) {
      logger.error(`Failed to execute command ${commandId}`, {
        ...context,
        error,
      });
      throw handleApiError(error as FetchError, context, "executeCommand");
    }
  }

  async listCommands(context: RequestContext): Promise<ObsidianCommand[]> {
    const { data, error } = await this.apiClient.GET(`/commands/`, {});

    if (error) {
      logger.error(`Failed to list commands`, { ...context, error });
      throw handleApiError(error as FetchError, context, "listCommands");
    }
    return data.commands ?? [];
  }

  // --- Open Methods ---

  async openFile(
    filePath: string,
    newLeaf: boolean = false,
    context: RequestContext,
  ): Promise<void> {
    const { error } = await this.apiClient.POST(`/open/{filename}`, {
      params: {
        path: { filename: filePath },
        query: { newLeaf },
      },
    });

    if (error) {
      logger.error(`Failed to open file ${filePath}`, { ...context, error });
      throw handleApiError(error, context, "openFile");
    }
  }

  // --- Active File Methods ---

  async getActiveFile(
    format: "markdown" | "json" = "markdown",
    context: RequestContext,
  ): Promise<string | NoteJson> {
    const acceptHeader =
      format === "json" ? "application/vnd.olrapi.note+json" : "text/markdown";
    const { data, error } = await this.apiClient.GET(`/active/`, {
      headers: {
        Accept: acceptHeader,
      },
    });

    if (error) {
      logger.error(`Failed to get active file`, { ...context, error });
      throw handleApiError(error, context, "getActiveFile");
    }
    return data as string | NoteJson;
  }

  async getActiveFilePath(context: RequestContext): Promise<string | null> {
    const note = await this.getActiveFile("json", context);
    if (typeof note === "object" && note.path) {
      return note.path;
    }
    return null;
  }

  async updateActiveFile(
    content: string,
    context: RequestContext,
  ): Promise<void> {
    const filePath = await this.getActiveFilePath(context);
    await this._performWriteOperation(filePath, context, async () => {
      const { error } = await this.apiClient.PUT(`/active/`, {
        headers: {
          "Content-Type": "text/markdown",
        },
        body: content,
      });

      if (error) {
        logger.error(`Failed to update active file`, { ...context, error });
        throw handleApiError(error as FetchError, context, "updateActiveFile");
      }
    });
  }

  async appendActiveFile(
    content: string,
    context: RequestContext,
  ): Promise<void> {
    const filePath = await this.getActiveFilePath(context);
    await this._performWriteOperation(filePath, context, async () => {
      const { error } = await this.apiClient.POST(`/active/`, {
        headers: {
          "Content-Type": "text/markdown",
        },
        body: content,
      });

      if (error) {
        logger.error(`Failed to append to active file`, { ...context, error });
        throw handleApiError(error as FetchError, context, "appendActiveFile");
      }
    });
  }

  async deleteActiveFile(context: RequestContext): Promise<void> {
    const filePath = await this.getActiveFilePath(context);
    await this._performWriteOperation(filePath, context, async () => {
      const { error } = await this.apiClient.DELETE(`/active/`, {});

      if (error) {
        logger.error(`Failed to delete active file`, { ...context, error });
        throw handleApiError(error as FetchError, context, "deleteActiveFile");
      }
    });
  }

  // --- Periodic Notes Methods ---

  async getPeriodicNote(
    period: Period,
    format: "markdown" | "json" = "markdown",
    context: RequestContext,
  ): Promise<string | NoteJson> {
    const acceptHeader =
      format === "json" ? "application/vnd.olrapi.note+json" : "text/markdown";
    const { data, error } = await this.apiClient.GET(`/periodic/{period}/`, {
      params: {
        path: { period },
      },
      headers: { Accept: acceptHeader },
    });

    if (error) {
      logger.error(`Failed to get periodic note for period ${period}`, {
        ...context,
        error,
      });
      throw handleApiError(error as FetchError, context, "getPeriodicNote");
    }
    return data as string | NoteJson;
  }

  async getPeriodicNotePath(
    period: Period,
    context: RequestContext,
  ): Promise<string | null> {
    const note = await this.getPeriodicNote(period, "json", context);
    if (typeof note === "object" && note.path) {
      return note.path;
    }
    return null;
  }

  async updatePeriodicNote(
    period: Period,
    content: string,
    context: RequestContext,
  ): Promise<void> {
    const filePath = await this.getPeriodicNotePath(period, context);
    await this._performWriteOperation(filePath, context, async () => {
      const { error } = await this.apiClient.PUT(`/periodic/{period}/`, {
        params: {
          path: { period },
        },
        headers: { "Content-Type": "text/markdown" },
        body: content,
      });

      if (error) {
        logger.error(`Failed to update periodic note for period ${period}`, {
          ...context,
          error,
        });
        throw handleApiError(
          error as FetchError,
          context,
          "updatePeriodicNote",
        );
      }
    });
  }

  async appendPeriodicNote(
    period: Period,
    content: string,
    context: RequestContext,
  ): Promise<void> {
    const filePath = await this.getPeriodicNotePath(period, context);
    await this._performWriteOperation(filePath, context, async () => {
      const { error } = await this.apiClient.POST(`/periodic/{period}/`, {
        params: {
          path: { period },
        },
        headers: { "Content-Type": "text/markdown" },
        body: content,
      });

      if (error) {
        logger.error(`Failed to append to periodic note for period ${period}`, {
          ...context,
          error,
        });
        throw handleApiError(
          error as FetchError,
          context,
          "appendPeriodicNote",
        );
      }
    });
  }

  async deletePeriodicNote(
    period: Period,
    context: RequestContext,
  ): Promise<void> {
    const filePath = await this.getPeriodicNotePath(period, context);
    await this._performWriteOperation(filePath, context, async () => {
      const { error } = await this.apiClient.DELETE(`/periodic/{period}/`, {
        params: {
          path: { period },
        },
      });

      if (error) {
        logger.error(`Failed to delete periodic note for period ${period}`, {
          ...context,
          error,
        });
        throw handleApiError(
          error as FetchError,
          context,
          "deletePeriodicNote",
        );
      }
    });
  }

  // --- Patch Methods ---

  async patchFile(
    filePath: string,
    content: string | object,
    options: PatchOptions,
    context: RequestContext,
  ): Promise<void> {
    await this._performWriteOperation(filePath, context, async () => {
      const headers = this._buildPatchHeaders(options);
      const requestData =
        typeof content === "object" ? JSON.stringify(content) : content;
      const encodedFilename = encodeVaultPath(filePath);

      const { error } = await this.apiClient.PATCH(`/vault/{filename}`, {
        params: {
          path: { filename: encodedFilename },
          header: headers,
        },
        body: requestData,
      });

      if (error) {
        logger.error(`Failed to patch file ${filePath}`, { ...context, error });
        throw handleApiError(error as FetchError, context, "patchFile");
      }
    });
  }

  async patchActiveFile(
    content: string | object,
    options: PatchOptions,
    context: RequestContext,
  ): Promise<void> {
    const filePath = await this.getActiveFilePath(context);
    await this._performWriteOperation(filePath, context, async () => {
      const headers = this._buildPatchHeaders(options);
      const requestData =
        typeof content === "object" ? JSON.stringify(content) : content;

      const { error } = await this.apiClient.PATCH(`/active/`, {
        params: {
          header: headers,
        },
        body: requestData,
      });

      if (error) {
        logger.error(`Failed to patch active file`, { ...context, error });
        throw handleApiError(error as FetchError, context, "patchActiveFile");
      }
    });
  }

  async patchPeriodicNote(
    period: Period,
    content: string | object,
    options: PatchOptions,
    context: RequestContext,
  ): Promise<void> {
    const filePath = await this.getPeriodicNotePath(period, context);
    await this._performWriteOperation(filePath, context, async () => {
      const headers = this._buildPatchHeaders(options);
      const requestData =
        typeof content === "object" ? JSON.stringify(content) : content;

      const { error } = await this.apiClient.PATCH(`/periodic/{period}/`, {
        params: {
          path: { period },
          header: headers,
        },
        body: requestData,
      });

      if (error) {
        logger.error(`Failed to patch periodic note for period ${period}`, {
          ...context,
          error,
        });
        throw handleApiError(error as FetchError, context, "patchPeriodicNote");
      }
    });
  }
}
