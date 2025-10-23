/**
 * @fileoverview Tests for obsidian-patch-active-note tool definition.
 * @module tests/mcp-server/tools/definitions/obsidian-patch-active-note.tool.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import type { IObsidianProvider } from '../../../../src/services/obsidian/core/IObsidianProvider.js';
import { ObsidianProvider } from '../../../../src/container/tokens.js';
import { obsidianPatchActiveNoteTool } from '../../../../src/mcp-server/tools/definitions/obsidian-patch-active-note.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';
import type { NoteJson } from '../../../../src/services/obsidian/types.js';

describe('obsidian-patch-active-note tool', () => {
  let mockProvider: IObsidianProvider;

  beforeEach(() => {
    mockProvider = {
      patchActiveNote: vi.fn(),
    } as unknown as IObsidianProvider;

    container.clearInstances();
    container.registerInstance(ObsidianProvider, mockProvider);
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(obsidianPatchActiveNoteTool.name).toBe(
        'obsidian_patch_active_note',
      );
    });

    it('should have correct annotations', () => {
      expect(obsidianPatchActiveNoteTool.annotations).toEqual({
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      });
    });
  });

  describe('schemas', () => {
    it('should validate valid input', () => {
      const validInput = {
        operation: 'replace' as const,
        targetType: 'heading' as const,
        target: 'Test Heading',
        content: 'New content',
      };
      const result =
        obsidianPatchActiveNoteTool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept all operation types', () => {
      const operations = ['append', 'prepend', 'replace'];

      operations.forEach((operation) => {
        const input = {
          operation,
          targetType: 'heading' as const,
          target: 'Test',
          content: 'Content',
        };
        const result = obsidianPatchActiveNoteTool.inputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('should accept all target types', () => {
      const targetTypes = ['heading', 'block', 'frontmatter'];

      targetTypes.forEach((targetType) => {
        const input = {
          operation: 'replace' as const,
          targetType,
          target: 'Test',
          content: 'Content',
        };
        const result = obsidianPatchActiveNoteTool.inputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('logic', () => {
    it('should patch active note', async () => {
      const mockNote: NoteJson = {
        path: 'test.md',
        content: 'Patched content',
        tags: [],
        frontmatter: {},
        stat: {
          ctime: 1234567890000,
          mtime: Date.now(),
          size: 200,
        },
      };

      vi.mocked(mockProvider.patchActiveNote).mockResolvedValue(mockNote);

      const input = {
        operation: 'replace' as const,
        targetType: 'heading' as const,
        target: 'Old Heading',
        content: 'New content',
      };
      const context = requestContextService.createRequestContext();

      const result = await obsidianPatchActiveNoteTool.logic(
        input,
        context,
        {} as any,
      );

      expect(mockProvider.patchActiveNote).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        {
          operation: 'replace',
          targetType: 'heading',
          target: 'Old Heading',
          content: 'New content',
        },
      );
      expect(result.path).toBe('test.md');
      expect(result.operation).toBe('replace');
    });
  });

  describe('responseFormatter', () => {
    it('should format response', () => {
      const result = {
        path: 'test.md',
        operation: 'replace',
        targetType: 'heading',
        target: 'Test Heading',
        contentLength: 100,
        size: 150,
      };

      const formatted = obsidianPatchActiveNoteTool.responseFormatter!(result);

      expect(formatted).toBeDefined();
      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toBeDefined();
      expect(formatted[0]!.type).toBe('text');
      expect(formatted[0]!.text).toContain('test.md');
      expect(formatted[0]!.text).toContain('replace');
    });
  });
});
