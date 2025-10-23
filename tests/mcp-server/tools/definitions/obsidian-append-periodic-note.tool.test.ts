/**
 * @fileoverview Tests for obsidian-append-periodic-note tool definition.
 * @module tests/mcp-server/tools/definitions/obsidian-append-periodic-note.tool.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import type { IObsidianProvider } from '../../../../src/services/obsidian/core/IObsidianProvider.js';
import { ObsidianProvider } from '../../../../src/container/tokens.js';
import { obsidianAppendPeriodicNoteTool } from '../../../../src/mcp-server/tools/definitions/obsidian-append-periodic-note.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';
import type { NoteJson } from '../../../../src/services/obsidian/types.js';

describe('obsidian-append-periodic-note tool', () => {
  let mockProvider: IObsidianProvider;

  beforeEach(() => {
    mockProvider = {
      appendPeriodicNote: vi.fn(),
    } as unknown as IObsidianProvider;

    container.clearInstances();
    container.registerInstance(ObsidianProvider, mockProvider);
  });

  describe('metadata', () => {
    it('should have correct name and annotations', () => {
      expect(obsidianAppendPeriodicNoteTool.name).toBe(
        'obsidian_append_periodic_note',
      );
      expect(obsidianAppendPeriodicNoteTool.annotations?.destructiveHint).toBe(
        false,
      );
    });
  });

  describe('schemas', () => {
    it('should validate input with period and content', () => {
      const result = obsidianAppendPeriodicNoteTool.inputSchema.safeParse({
        period: 'daily',
        content: 'Journal entry',
      });
      expect(result.success).toBe(true);
    });

    it('should validate with date parameters', () => {
      const result = obsidianAppendPeriodicNoteTool.inputSchema.safeParse({
        period: 'daily',
        content: 'Entry',
        year: 2024,
        month: 10,
        day: 23,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('logic', () => {
    it('should append to current period note', async () => {
      const mockNote: NoteJson = {
        path: '2024-10-23.md',
        content: 'Existing\nAppended',
        tags: [],
        frontmatter: {},
        stat: { ctime: 0, mtime: 0, size: 200 },
      };

      vi.mocked(mockProvider.appendPeriodicNote).mockResolvedValue(mockNote);

      const input = { period: 'daily' as const, content: 'Appended' };
      const context = requestContextService.createRequestContext();
      const result = await obsidianAppendPeriodicNoteTool.logic(
        input,
        context,
        {} as any,
      );

      expect(mockProvider.appendPeriodicNote).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        { period: 'daily' },
        'Appended',
      );
      expect(result.period).toBe('daily');
    });

    it('should append to specific date periodic note', async () => {
      const mockNote: NoteJson = {
        path: '2024-10.md',
        content: 'Content',
        tags: [],
        frontmatter: {},
        stat: { ctime: 0, mtime: 0, size: 100 },
      };

      vi.mocked(mockProvider.appendPeriodicNote).mockResolvedValue(mockNote);

      const input = {
        period: 'monthly' as const,
        content: 'Entry',
        year: 2024,
        month: 10,
      };
      const context = requestContextService.createRequestContext();
      const result = await obsidianAppendPeriodicNoteTool.logic(
        input,
        context,
        {} as any,
      );

      expect(mockProvider.appendPeriodicNote).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        { period: 'monthly', year: 2024, month: 10 },
        'Entry',
      );
      expect(result.dateParams).toEqual({ year: 2024, month: 10 });
    });
  });

  describe('responseFormatter', () => {
    it('should format append result', () => {
      const result = {
        period: 'daily',
        path: '2024-10-23.md',
        appendedLength: 50,
        totalLength: 150,
        size: 180,
      };

      const formatted =
        obsidianAppendPeriodicNoteTool.responseFormatter!(result);
      expect(formatted).toBeDefined();
      expect(formatted[0]).toBeDefined();
      expect(formatted[0]!.text).toContain('daily');
      expect(formatted[0]!.text).toContain('Current period');
    });
  });
});
