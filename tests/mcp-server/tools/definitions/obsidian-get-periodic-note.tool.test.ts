/**
 * @fileoverview Tests for obsidian-get-periodic-note tool definition.
 * @module tests/mcp-server/tools/definitions/obsidian-get-periodic-note.tool.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import type { IObsidianProvider } from '../../../../src/services/obsidian/core/IObsidianProvider.js';
import { ObsidianProvider } from '../../../../src/container/tokens.js';
import { obsidianGetPeriodicNoteTool } from '../../../../src/mcp-server/tools/definitions/obsidian-get-periodic-note.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';
import type { NoteJson } from '../../../../src/services/obsidian/types.js';

describe('obsidian-get-periodic-note tool', () => {
  let mockProvider: IObsidianProvider;

  beforeEach(() => {
    mockProvider = {
      getPeriodicNote: vi.fn(),
    } as unknown as IObsidianProvider;

    container.clearInstances();
    container.registerInstance(ObsidianProvider, mockProvider);
  });

  describe('metadata', () => {
    it('should have correct name and annotations', () => {
      expect(obsidianGetPeriodicNoteTool.name).toBe(
        'obsidian_get_periodic_note',
      );
      expect(obsidianGetPeriodicNoteTool.annotations?.readOnlyHint).toBe(true);
    });
  });

  describe('schemas', () => {
    it('should validate all period types', () => {
      const periods = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

      periods.forEach((period) => {
        const result = obsidianGetPeriodicNoteTool.inputSchema.safeParse({
          period,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should validate with date parameters', () => {
      const result = obsidianGetPeriodicNoteTool.inputSchema.safeParse({
        period: 'daily',
        year: 2024,
        month: 10,
        day: 23,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid year', () => {
      const result = obsidianGetPeriodicNoteTool.inputSchema.safeParse({
        period: 'daily',
        year: 1800,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('logic', () => {
    it('should get current period note', async () => {
      const mockNote: NoteJson = {
        path: '2024-10-23.md',
        content: 'Daily note',
        tags: [],
        frontmatter: {},
        stat: { ctime: 0, mtime: 0, size: 100 },
      };

      vi.mocked(mockProvider.getPeriodicNote).mockResolvedValue(mockNote);

      const input = { period: 'daily' as const, includeMetadata: true };
      const context = requestContextService.createRequestContext();
      const result = await obsidianGetPeriodicNoteTool.logic(
        input,
        context,
        {} as any,
      );

      expect(mockProvider.getPeriodicNote).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        {
          period: 'daily',
        },
      );
      expect(result.period).toBe('daily');
    });

    it('should get specific date periodic note', async () => {
      const mockNote: NoteJson = {
        path: '2024-10.md',
        content: 'Monthly note',
        tags: [],
        frontmatter: {},
        stat: { ctime: 0, mtime: 0, size: 100 },
      };

      vi.mocked(mockProvider.getPeriodicNote).mockResolvedValue(mockNote);

      const input = {
        period: 'monthly' as const,
        year: 2024,
        month: 10,
        includeMetadata: true,
      };
      const context = requestContextService.createRequestContext();
      const result = await obsidianGetPeriodicNoteTool.logic(
        input,
        context,
        {} as any,
      );

      expect(mockProvider.getPeriodicNote).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        {
          period: 'monthly',
          year: 2024,
          month: 10,
        },
      );
      expect(result.dateParams).toEqual({ year: 2024, month: 10 });
    });
  });

  describe('responseFormatter', () => {
    it('should format periodic note', () => {
      const result = {
        period: 'daily',
        path: '2024-10-23.md',
        content: 'Content',
        stat: { ctime: 0, mtime: 0, size: 100 },
      };

      const formatted = obsidianGetPeriodicNoteTool.responseFormatter!(result);
      expect(formatted).toBeDefined();
      expect(formatted[0]).toBeDefined();
      expect(formatted[0]!.text).toContain('Daily');
      expect(formatted[0]!.text).toContain('Current period');
    });
  });
});
