/**
 * @fileoverview Tests for obsidian-append-active-note tool definition.
 * @module tests/mcp-server/tools/definitions/obsidian-append-active-note.tool.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import type { IObsidianProvider } from '../../../../src/services/obsidian/core/IObsidianProvider.js';
import { ObsidianProvider } from '../../../../src/container/tokens.js';
import { obsidianAppendActiveNoteTool } from '../../../../src/mcp-server/tools/definitions/obsidian-append-active-note.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';
import type { NoteJson } from '../../../../src/services/obsidian/types.js';

describe('obsidian-append-active-note tool', () => {
  let mockProvider: IObsidianProvider;

  beforeEach(() => {
    mockProvider = {
      appendActiveNote: vi.fn(),
    } as unknown as IObsidianProvider;

    container.clearInstances();
    container.registerInstance(ObsidianProvider, mockProvider);
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(obsidianAppendActiveNoteTool.name).toBe(
        'obsidian_append_active_note',
      );
    });

    it('should have correct annotations', () => {
      expect(obsidianAppendActiveNoteTool.annotations).toEqual({
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      });
    });
  });

  describe('schemas', () => {
    it('should validate valid input', () => {
      const validInput = { content: 'Appended content' };
      const result =
        obsidianAppendActiveNoteTool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const invalidInput = { content: '' };
      const result =
        obsidianAppendActiveNoteTool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('logic', () => {
    it('should append content to active note', async () => {
      const mockNote: NoteJson = {
        path: 'test.md',
        content: 'Original content\nAppended content',
        tags: [],
        frontmatter: {},
        stat: {
          ctime: 1234567890000,
          mtime: Date.now(),
          size: 200,
        },
      };

      vi.mocked(mockProvider.appendActiveNote).mockResolvedValue(mockNote);

      const input = { content: 'Appended content' };
      const context = requestContextService.createRequestContext();

      const result = await obsidianAppendActiveNoteTool.logic(
        input,
        context,
        {} as any,
      );

      expect(mockProvider.appendActiveNote).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        'Appended content',
      );
      expect(result.path).toBe('test.md');
      expect(result.appendedLength).toBe(16);
      expect(result.totalLength).toBe(33);
    });
  });

  describe('responseFormatter', () => {
    it('should format response', () => {
      const result = {
        path: 'test.md',
        appendedLength: 16,
        totalLength: 100,
        size: 150,
      };

      const formatted = obsidianAppendActiveNoteTool.responseFormatter!(result);

      expect(formatted).toBeDefined();
      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toBeDefined();
      expect(formatted[0]!.type).toBe('text');
      expect(formatted[0]!.text).toContain('test.md');
      expect(formatted[0]!.text).toContain('16');
    });
  });
});
