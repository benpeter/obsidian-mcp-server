/**
 * @fileoverview Tests for obsidian-patch-periodic-note tool definition.
 * @module tests/mcp-server/tools/definitions/obsidian-patch-periodic-note.tool.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import type { IObsidianProvider } from '../../../../src/services/obsidian/core/IObsidianProvider.js';
import { ObsidianProvider } from '../../../../src/container/tokens.js';
import { obsidianPatchPeriodicNoteTool } from '../../../../src/mcp-server/tools/definitions/obsidian-patch-periodic-note.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';
import type { NoteJson } from '../../../../src/services/obsidian/types.js';

describe('obsidian-patch-periodic-note tool', () => {
  let mockProvider: IObsidianProvider;

  beforeEach(() => {
    mockProvider = {
      patchPeriodicNote: vi.fn(),
    } as unknown as IObsidianProvider;

    container.clearInstances();
    container.registerInstance(ObsidianProvider, mockProvider);
  });

  describe('metadata', () => {
    it('should have correct name and annotations', () => {
      expect(obsidianPatchPeriodicNoteTool.name).toBe(
        'obsidian_patch_periodic_note',
      );
      expect(obsidianPatchPeriodicNoteTool.annotations?.destructiveHint).toBe(
        true,
      );
    });
  });

  describe('schemas', () => {
    it('should validate complete patch input', () => {
      const result = obsidianPatchPeriodicNoteTool.inputSchema.safeParse({
        period: 'daily',
        operation: 'replace',
        targetType: 'heading',
        target: 'Tasks',
        content: 'New tasks',
      });
      expect(result.success).toBe(true);
    });

    it('should validate with date parameters', () => {
      const result = obsidianPatchPeriodicNoteTool.inputSchema.safeParse({
        period: 'weekly',
        operation: 'replace',
        targetType: 'heading',
        target: 'Notes',
        content: 'Entry',
        year: 2024,
        month: 10,
        day: 23,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('logic', () => {
    it('should patch periodic note', async () => {
      const mockNote: NoteJson = {
        path: '2024-10-23.md',
        content: 'Patched content',
        tags: [],
        frontmatter: {},
        stat: { ctime: 0, mtime: 0, size: 200 },
      };

      vi.mocked(mockProvider.patchPeriodicNote).mockResolvedValue(mockNote);

      const input = {
        period: 'daily' as const,
        operation: 'replace' as const,
        targetType: 'heading' as const,
        target: 'Tasks',
        content: 'New tasks',
      };
      const context = requestContextService.createRequestContext();
      const result = await obsidianPatchPeriodicNoteTool.logic(
        input,
        context,
        {} as any,
      );

      expect(mockProvider.patchPeriodicNote).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        { period: 'daily' },
        {
          operation: 'replace',
          targetType: 'heading',
          target: 'Tasks',
          content: 'New tasks',
        },
      );
      expect(result.operation).toBe('replace');
    });

    it('should handle date parameters', async () => {
      const mockNote: NoteJson = {
        path: '2024-10.md',
        content: 'Content',
        tags: [],
        frontmatter: {},
        stat: { ctime: 0, mtime: 0, size: 100 },
      };

      vi.mocked(mockProvider.patchPeriodicNote).mockResolvedValue(mockNote);

      const input = {
        period: 'monthly' as const,
        operation: 'replace' as const,
        targetType: 'heading' as const,
        target: 'Summary',
        content: 'Summary text',
        year: 2024,
        month: 10,
      };
      const context = requestContextService.createRequestContext();
      const result = await obsidianPatchPeriodicNoteTool.logic(
        input,
        context,
        {} as any,
      );

      expect(mockProvider.patchPeriodicNote).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        { period: 'monthly', year: 2024, month: 10 },
        expect.objectContaining({ operation: 'replace' }),
      );
      expect(result.dateParams).toEqual({ year: 2024, month: 10 });
    });
  });

  describe('responseFormatter', () => {
    it('should format patch result', () => {
      const result = {
        period: 'daily',
        path: '2024-10-23.md',
        operation: 'replace',
        targetType: 'heading',
        target: 'Tasks',
        contentLength: 100,
        size: 120,
      };

      const formatted =
        obsidianPatchPeriodicNoteTool.responseFormatter!(result);
      expect(formatted).toBeDefined();
      expect(formatted[0]).toBeDefined();
      expect(formatted[0]!.text).toContain('daily');
      expect(formatted[0]!.text).toContain('replace');
    });
  });
});
