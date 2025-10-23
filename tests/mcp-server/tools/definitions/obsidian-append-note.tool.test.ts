/**
 * @fileoverview Tests for obsidian-append-note tool definition.
 * @module tests/mcp-server/tools/definitions/obsidian-append-note.tool.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import type { IObsidianProvider } from '../../../../src/services/obsidian/core/IObsidianProvider.js';
import { ObsidianProvider } from '../../../../src/container/tokens.js';
import { obsidianAppendNoteTool } from '../../../../src/mcp-server/tools/definitions/obsidian-append-note.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';
import type { NoteJson } from '../../../../src/services/obsidian/types.js';

describe('obsidian-append-note tool', () => {
  let mockProvider: IObsidianProvider;

  beforeEach(() => {
    mockProvider = {
      appendNote: vi.fn(),
    } as unknown as IObsidianProvider;

    container.clearInstances();
    container.registerInstance(ObsidianProvider, mockProvider);
  });

  describe('metadata', () => {
    it('should have correct name and annotations', () => {
      expect(obsidianAppendNoteTool.name).toBe('obsidian_append_note');
      expect(obsidianAppendNoteTool.annotations?.destructiveHint).toBe(false);
    });
  });

  describe('schemas', () => {
    it('should validate valid input', () => {
      const result = obsidianAppendNoteTool.inputSchema.safeParse({
        path: 'note.md',
        content: 'Append this',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const result = obsidianAppendNoteTool.inputSchema.safeParse({
        path: 'note.md',
        content: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('logic', () => {
    it('should append content to note', async () => {
      const mockNote: NoteJson = {
        path: 'note.md',
        content: 'Original\nAppended',
        tags: [],
        frontmatter: {},
        stat: { ctime: 0, mtime: 0, size: 200 },
      };

      vi.mocked(mockProvider.appendNote).mockResolvedValue(mockNote);

      const input = { path: 'note.md', content: 'Appended' };
      const context = requestContextService.createRequestContext();
      const result = await obsidianAppendNoteTool.logic(
        input,
        context,
        {} as any,
      );

      expect(mockProvider.appendNote).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        'note.md',
        'Appended',
      );
      expect(result.appendedLength).toBe(8);
      expect(result.totalLength).toBe(17); // "Original\nAppended" is 17 chars
    });
  });

  describe('responseFormatter', () => {
    it('should format response', () => {
      const result = {
        path: 'note.md',
        appendedLength: 20,
        totalLength: 120,
        size: 150,
      };

      const formatted = obsidianAppendNoteTool.responseFormatter!(result);
      expect(formatted).toBeDefined();
      expect(formatted[0]).toBeDefined();
      expect(formatted[0]!.text).toContain('note.md');
      expect(formatted[0]!.text).toContain('20');
    });
  });
});
