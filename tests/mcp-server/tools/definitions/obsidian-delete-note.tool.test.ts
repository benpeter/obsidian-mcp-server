/**
 * @fileoverview Tests for obsidian-delete-note tool definition.
 * @module tests/mcp-server/tools/definitions/obsidian-delete-note.tool.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import type { IObsidianProvider } from '../../../../src/services/obsidian/core/IObsidianProvider.js';
import { ObsidianProvider } from '../../../../src/container/tokens.js';
import { obsidianDeleteNoteTool } from '../../../../src/mcp-server/tools/definitions/obsidian-delete-note.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';
import { McpError } from '../../../../src/types-global/errors.js';

describe('obsidian-delete-note tool', () => {
  let mockProvider: IObsidianProvider;

  beforeEach(() => {
    mockProvider = {
      deleteNote: vi.fn(),
    } as unknown as IObsidianProvider;

    container.clearInstances();
    container.registerInstance(ObsidianProvider, mockProvider);
  });

  describe('metadata', () => {
    it('should have correct name and annotations', () => {
      expect(obsidianDeleteNoteTool.name).toBe('obsidian_delete_note');
      expect(obsidianDeleteNoteTool.annotations?.destructiveHint).toBe(true);
      expect(obsidianDeleteNoteTool.annotations?.idempotentHint).toBe(true);
    });
  });

  describe('schemas', () => {
    it('should validate valid input', () => {
      const result = obsidianDeleteNoteTool.inputSchema.safeParse({
        path: 'note.md',
        confirm: true,
      });
      expect(result.success).toBe(true);
    });

    it('should require confirm field', () => {
      const result = obsidianDeleteNoteTool.inputSchema.safeParse({
        path: 'note.md',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('logic', () => {
    it('should delete note when confirmed', async () => {
      vi.mocked(mockProvider.deleteNote).mockResolvedValue(undefined);

      const input = { path: 'note.md', confirm: true };
      const context = requestContextService.createRequestContext();
      const result = await obsidianDeleteNoteTool.logic(
        input,
        context,
        {} as any,
      );

      expect(mockProvider.deleteNote).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        'note.md',
      );
      expect(result.deleted).toBe(true);
      expect(result.path).toBe('note.md');
    });

    it('should throw error when not confirmed', async () => {
      const input = { path: 'note.md', confirm: false };
      const context = requestContextService.createRequestContext();

      await expect(
        obsidianDeleteNoteTool.logic(input, context, {} as any),
      ).rejects.toThrow(McpError);

      await expect(
        obsidianDeleteNoteTool.logic(input, context, {} as any),
      ).rejects.toThrow(/confirmation/i);

      expect(mockProvider.deleteNote).not.toHaveBeenCalled();
    });
  });

  describe('responseFormatter', () => {
    it('should format deletion success', () => {
      const result = {
        path: 'deleted.md',
        deleted: true,
        message: 'Note deleted',
      };

      const formatted = obsidianDeleteNoteTool.responseFormatter!(result);
      expect(formatted).toBeDefined();
      expect(formatted[0]).toBeDefined();
      expect(formatted[0]!.text).toContain('deleted.md');
      expect(formatted[0]!.text).toContain('irreversible');
    });
  });
});
