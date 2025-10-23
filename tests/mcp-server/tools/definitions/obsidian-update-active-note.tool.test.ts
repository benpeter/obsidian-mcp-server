/**
 * @fileoverview Tests for obsidian-update-active-note tool definition.
 * @module tests/mcp-server/tools/definitions/obsidian-update-active-note.tool.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import type { IObsidianProvider } from '../../../../src/services/obsidian/core/IObsidianProvider.js';
import { ObsidianProvider } from '../../../../src/container/tokens.js';
import { obsidianUpdateActiveNoteTool } from '../../../../src/mcp-server/tools/definitions/obsidian-update-active-note.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';
import type { NoteJson } from '../../../../src/services/obsidian/types.js';

describe('obsidian-update-active-note tool', () => {
  let mockProvider: IObsidianProvider;

  beforeEach(() => {
    mockProvider = {
      updateActiveNote: vi.fn(),
    } as unknown as IObsidianProvider;

    container.clearInstances();
    container.registerInstance(ObsidianProvider, mockProvider);
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(obsidianUpdateActiveNoteTool.name).toBe(
        'obsidian_update_active_note',
      );
    });

    it('should have correct title', () => {
      expect(obsidianUpdateActiveNoteTool.title).toBe('Update Active Note');
    });

    it('should have a description', () => {
      expect(obsidianUpdateActiveNoteTool.description).toBeDefined();
      expect(obsidianUpdateActiveNoteTool.description.length).toBeGreaterThan(
        0,
      );
    });
  });

  describe('annotations', () => {
    it('should have correct annotations', () => {
      expect(obsidianUpdateActiveNoteTool.annotations).toEqual({
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      });
    });
  });

  describe('schemas', () => {
    it('should validate valid input', () => {
      const validInput = {
        content: 'New content',
      };
      const result =
        obsidianUpdateActiveNoteTool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept empty content', () => {
      const validInput = {
        content: '',
      };
      const result =
        obsidianUpdateActiveNoteTool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });

  describe('logic', () => {
    it('should update active note content', async () => {
      const mockNote: NoteJson = {
        path: 'test.md',
        content: 'Updated content',
        tags: [],
        frontmatter: {},
        stat: {
          ctime: 1234567890000,
          mtime: Date.now(),
          size: 200,
        },
      };

      vi.mocked(mockProvider.updateActiveNote).mockResolvedValue(mockNote);

      const input = { content: 'Updated content' };
      const context = requestContextService.createRequestContext();

      const result = await obsidianUpdateActiveNoteTool.logic(
        input,
        context,
        {} as any,
      );

      expect(mockProvider.updateActiveNote).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        'Updated content',
      );
      expect(result.path).toBe('test.md');
      expect(result.content).toBe('Updated content');
    });
  });

  describe('responseFormatter', () => {
    it('should format response', () => {
      const result = {
        path: 'test.md',
        content: 'Updated content',
        size: 150,
      };

      const formatted = obsidianUpdateActiveNoteTool.responseFormatter!(result);

      expect(formatted).toBeDefined();
      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toBeDefined();
      expect(formatted[0]!.type).toBe('text');
      expect(formatted[0]!.text).toContain('test.md');
    });
  });
});
