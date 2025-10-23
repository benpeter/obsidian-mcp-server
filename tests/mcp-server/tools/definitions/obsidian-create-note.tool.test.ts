/**
 * @fileoverview Tests for obsidian-create-note tool definition.
 * @module tests/mcp-server/tools/definitions/obsidian-create-note.tool.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import type { IObsidianProvider } from '../../../../src/services/obsidian/core/IObsidianProvider.js';
import { ObsidianProvider } from '../../../../src/container/tokens.js';
import { obsidianCreateNoteTool } from '../../../../src/mcp-server/tools/definitions/obsidian-create-note.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';
import type { NoteJson } from '../../../../src/services/obsidian/types.js';

describe('obsidian-create-note tool', () => {
  let mockProvider: IObsidianProvider;

  beforeEach(() => {
    mockProvider = {
      createNote: vi.fn(),
    } as unknown as IObsidianProvider;

    container.clearInstances();
    container.registerInstance(ObsidianProvider, mockProvider);
  });

  describe('metadata', () => {
    it('should have correct name and annotations', () => {
      expect(obsidianCreateNoteTool.name).toBe('obsidian_create_note');
      expect(obsidianCreateNoteTool.annotations?.destructiveHint).toBe(true);
    });
  });

  describe('schemas', () => {
    it('should validate input with required fields', () => {
      const result = obsidianCreateNoteTool.inputSchema.safeParse({
        path: 'new/note.md',
        content: 'Content',
      });
      expect(result.success).toBe(true);
    });

    it('should use default overwrite value', () => {
      const input = { path: 'note.md', content: 'Content' };
      const parsed = obsidianCreateNoteTool.inputSchema.parse(input);
      expect(parsed.overwrite).toBe(false);
    });

    it('should accept overwrite parameter', () => {
      const input = { path: 'note.md', content: 'Content', overwrite: true };
      const parsed = obsidianCreateNoteTool.inputSchema.parse(input);
      expect(parsed.overwrite).toBe(true);
    });
  });

  describe('logic', () => {
    it('should create new note', async () => {
      const now = Date.now();
      const mockNote: NoteJson = {
        path: 'new/note.md',
        content: 'New content',
        tags: [],
        frontmatter: {},
        stat: { ctime: now, mtime: now, size: 100 },
      };

      vi.mocked(mockProvider.createNote).mockResolvedValue(mockNote);

      const input = {
        path: 'new/note.md',
        content: 'New content',
        overwrite: false,
      };
      const context = requestContextService.createRequestContext();
      const result = await obsidianCreateNoteTool.logic(
        input,
        context,
        {} as any,
      );

      expect(mockProvider.createNote).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        expect.objectContaining({
          path: 'new/note.md',
          content: 'New content',
        }),
      );
      expect(result.path).toBe('new/note.md');
      expect(result.created).toBe(true);
    });

    it('should detect updated vs created', async () => {
      const oneHourAgo = Date.now() - 3600000;
      const mockNote: NoteJson = {
        path: 'existing.md',
        content: 'Updated',
        tags: [],
        frontmatter: {},
        stat: { ctime: oneHourAgo, mtime: Date.now(), size: 100 },
      };

      vi.mocked(mockProvider.createNote).mockResolvedValue(mockNote);

      const input = {
        path: 'existing.md',
        content: 'Updated',
        overwrite: true,
      };
      const context = requestContextService.createRequestContext();
      const result = await obsidianCreateNoteTool.logic(
        input,
        context,
        {} as any,
      );

      expect(result.created).toBe(false); // mtime much later than ctime
    });
  });

  describe('responseFormatter', () => {
    it('should format creation response', () => {
      const result = {
        path: 'new.md',
        created: true,
        contentLength: 100,
        size: 120,
      };

      const formatted = obsidianCreateNoteTool.responseFormatter!(result);
      expect(formatted).toBeDefined();
      expect(formatted[0]).toBeDefined();
      expect(formatted[0]!.text).toContain('Created');
      expect(formatted[0]!.text).toContain('new.md');
    });

    it('should format update response', () => {
      const result = {
        path: 'existing.md',
        created: false,
        contentLength: 100,
        size: 120,
      };

      const formatted = obsidianCreateNoteTool.responseFormatter!(result);
      expect(formatted).toBeDefined();
      expect(formatted[0]).toBeDefined();
      expect(formatted[0]!.text).toContain('Updated');
    });
  });
});
