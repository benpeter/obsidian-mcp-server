/**
 * @fileoverview Tests for obsidian-get-note tool definition.
 * @module tests/mcp-server/tools/definitions/obsidian-get-note.tool.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import type { IObsidianProvider } from '../../../../src/services/obsidian/core/IObsidianProvider.js';
import { ObsidianProvider } from '../../../../src/container/tokens.js';
import { obsidianGetNoteTool } from '../../../../src/mcp-server/tools/definitions/obsidian-get-note.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';
import type { NoteJson } from '../../../../src/services/obsidian/types.js';

describe('obsidian-get-note tool', () => {
  let mockProvider: IObsidianProvider;

  beforeEach(() => {
    mockProvider = {
      getNote: vi.fn(),
    } as unknown as IObsidianProvider;

    container.clearInstances();
    container.registerInstance(ObsidianProvider, mockProvider);
  });

  describe('metadata', () => {
    it('should have correct name and annotations', () => {
      expect(obsidianGetNoteTool.name).toBe('obsidian_get_note');
      expect(obsidianGetNoteTool.annotations?.readOnlyHint).toBe(true);
      expect(obsidianGetNoteTool.annotations?.idempotentHint).toBe(true);
    });
  });

  describe('schemas', () => {
    it('should validate input with path', () => {
      const result = obsidianGetNoteTool.inputSchema.safeParse({
        path: 'folder/note.md',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing path', () => {
      const result = obsidianGetNoteTool.inputSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('logic', () => {
    it('should retrieve note by path', async () => {
      const mockNote: NoteJson = {
        path: 'folder/note.md',
        content: 'Note content',
        tags: [],
        frontmatter: {},
        stat: { ctime: 0, mtime: 0, size: 100 },
      };

      vi.mocked(mockProvider.getNote).mockResolvedValue(mockNote);

      const input = { path: 'folder/note.md', includeMetadata: true };
      const context = requestContextService.createRequestContext();
      const result = await obsidianGetNoteTool.logic(input, context, {} as any);

      expect(mockProvider.getNote).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        'folder/note.md',
      );
      expect(result.path).toBe('folder/note.md');
      expect(result.content).toBe('Note content');
    });

    it('should include metadata when requested', async () => {
      const mockNote = {
        path: 'note.md',
        content: 'Content',
        tags: ['tag1'],
        headings: [{ level: 1, text: 'Header' }],
        wikilinks: ['[[link]]'],
        frontmatter: {},
        stat: { ctime: 0, mtime: 0, size: 100 },
      } as NoteJson;

      vi.mocked(mockProvider.getNote).mockResolvedValue(mockNote);

      const input = { path: 'note.md', includeMetadata: true };
      const context = requestContextService.createRequestContext();
      const result = await obsidianGetNoteTool.logic(input, context, {} as any);

      expect(result.tags).toEqual(['tag1']);
      expect(result.headings).toHaveLength(1);
    });
  });

  describe('responseFormatter', () => {
    it('should format note data', () => {
      const result = {
        path: 'note.md',
        content: '# Test',
        stat: { ctime: 0, mtime: 0, size: 100 },
      };

      const formatted = obsidianGetNoteTool.responseFormatter!(result);
      expect(formatted).toBeDefined();
      expect(formatted[0]).toBeDefined();
      expect(formatted[0]!.type).toBe('text');
      expect(formatted[0]!.text).toContain('note.md');
    });
  });
});
