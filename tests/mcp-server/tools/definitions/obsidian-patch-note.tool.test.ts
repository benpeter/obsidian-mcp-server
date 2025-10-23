/**
 * @fileoverview Tests for obsidian-patch-note tool definition.
 * @module tests/mcp-server/tools/definitions/obsidian-patch-note.tool.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import type { IObsidianProvider } from '../../../../src/services/obsidian/core/IObsidianProvider.js';
import { ObsidianProvider } from '../../../../src/container/tokens.js';
import { obsidianPatchNoteTool } from '../../../../src/mcp-server/tools/definitions/obsidian-patch-note.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';
import type { NoteJson } from '../../../../src/services/obsidian/types.js';

describe('obsidian-patch-note tool', () => {
  let mockProvider: IObsidianProvider;

  beforeEach(() => {
    mockProvider = {
      patchNote: vi.fn(),
    } as unknown as IObsidianProvider;

    container.clearInstances();
    container.registerInstance(ObsidianProvider, mockProvider);
  });

  describe('metadata', () => {
    it('should have correct name and annotations', () => {
      expect(obsidianPatchNoteTool.name).toBe('obsidian_patch_note');
      expect(obsidianPatchNoteTool.annotations?.destructiveHint).toBe(true);
    });
  });

  describe('schemas', () => {
    it('should validate valid patch input', () => {
      const result = obsidianPatchNoteTool.inputSchema.safeParse({
        path: 'note.md',
        operation: 'replace',
        targetType: 'heading',
        target: 'Test',
        content: 'New content',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all operation types', () => {
      const operations = ['append', 'prepend', 'replace'];

      operations.forEach((operation) => {
        const result = obsidianPatchNoteTool.inputSchema.safeParse({
          path: 'note.md',
          operation,
          targetType: 'heading',
          target: 'Test',
          content: 'Content',
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('logic', () => {
    it('should patch note section', async () => {
      const mockNote: NoteJson = {
        path: 'note.md',
        content: 'Patched content',
        tags: [],
        frontmatter: {},
        stat: { ctime: 0, mtime: 0, size: 200 },
      };

      vi.mocked(mockProvider.patchNote).mockResolvedValue(mockNote);

      const input = {
        path: 'note.md',
        operation: 'replace' as const,
        targetType: 'heading' as const,
        target: 'Heading',
        content: 'New',
      };
      const context = requestContextService.createRequestContext();
      const result = await obsidianPatchNoteTool.logic(
        input,
        context,
        {} as any,
      );

      expect(mockProvider.patchNote).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        {
          path: 'note.md',
          operation: 'replace',
          targetType: 'heading',
          target: 'Heading',
          content: 'New',
        },
      );
      expect(result.operation).toBe('replace');
    });
  });

  describe('responseFormatter', () => {
    it('should format patch result', () => {
      const result = {
        path: 'note.md',
        operation: 'replace',
        targetType: 'heading',
        target: 'Test',
        contentLength: 100,
        size: 150,
      };

      const formatted = obsidianPatchNoteTool.responseFormatter!(result);
      expect(formatted).toBeDefined();
      expect(formatted[0]).toBeDefined();
      expect(formatted[0]!.text).toContain('replace');
      expect(formatted[0]!.text).toContain('heading');
    });
  });
});
