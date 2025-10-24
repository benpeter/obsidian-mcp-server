/**
 * @fileoverview Tests for obsidian-list-vault-files tool definition.
 * @module tests/mcp-server/tools/definitions/obsidian-list-vault-files.tool.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import type { IObsidianProvider } from '../../../../src/services/obsidian/core/IObsidianProvider.js';
import { ObsidianProvider } from '../../../../src/container/tokens.js';
import { obsidianListVaultFilesTool } from '../../../../src/mcp-server/tools/definitions/obsidian-list-vault-files.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';
import type { VaultFile } from '../../../../src/services/obsidian/types.js';

describe('obsidian-list-vault-files tool', () => {
  let mockProvider: IObsidianProvider;

  beforeEach(() => {
    mockProvider = {
      listVaultFiles: vi.fn(),
    } as unknown as IObsidianProvider;

    container.clearInstances();
    container.registerInstance(ObsidianProvider, mockProvider);
  });

  describe('metadata', () => {
    it('should have correct name and annotations', () => {
      expect(obsidianListVaultFilesTool.name).toBe('obsidian_list_vault_files');
      expect(obsidianListVaultFilesTool.annotations?.readOnlyHint).toBe(true);
      expect(obsidianListVaultFilesTool.annotations?.idempotentHint).toBe(true);
    });
  });

  describe('schemas', () => {
    it('should validate input without path', () => {
      const result = obsidianListVaultFilesTool.inputSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate input with path', () => {
      const result = obsidianListVaultFilesTool.inputSchema.safeParse({
        path: 'folder',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('logic', () => {
    it('should list files and folders', async () => {
      const mockFiles: VaultFile[] = [
        { path: 'file1.md', type: 'file', basename: 'file1', extension: 'md' },
        { path: 'folder1', type: 'folder', basename: 'folder1' },
      ];

      vi.mocked(mockProvider.listVaultFiles).mockResolvedValue(mockFiles);

      const input = { limit: 100, offset: 0 };
      const context = requestContextService.createRequestContext();
      const result = await obsidianListVaultFilesTool.logic(
        input,
        context,
        {} as any,
      );

      expect(mockProvider.listVaultFiles).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        undefined,
      );
      expect(result.fileCount).toBe(1);
      expect(result.folderCount).toBe(1);
      expect(result.files).toHaveLength(2);
    });

    it('should list files at specified path', async () => {
      const mockFiles: VaultFile[] = [
        {
          path: 'docs/note.md',
          type: 'file',
          basename: 'note',
          extension: 'md',
        },
      ];

      vi.mocked(mockProvider.listVaultFiles).mockResolvedValue(mockFiles);

      const input = { path: 'docs', limit: 100, offset: 0 };
      const context = requestContextService.createRequestContext();
      const result = await obsidianListVaultFilesTool.logic(
        input,
        context,
        {} as any,
      );

      expect(mockProvider.listVaultFiles).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        'docs',
      );
      expect(result.path).toBe('docs');
    });
  });

  describe('responseFormatter', () => {
    it('should format file listing', () => {
      const result = {
        path: '',
        files: [
          {
            path: 'file.md',
            type: 'file' as const,
            basename: 'file',
            extension: 'md',
          },
          { path: 'folder', type: 'folder' as const, basename: 'folder' },
        ],
        fileCount: 1,
        folderCount: 1,
        totalCount: 2,
        limit: 100,
        offset: 0,
        hasMore: false,
      };

      const formatted = obsidianListVaultFilesTool.responseFormatter!(result);
      expect(formatted).toBeDefined();
      expect(formatted[0]).toBeDefined();
      expect(formatted[0]!.type).toBe('text');
      expect(formatted[0]!.text).toContain('1 files');
      expect(formatted[0]!.text).toContain('1 folders');
    });
  });
});
