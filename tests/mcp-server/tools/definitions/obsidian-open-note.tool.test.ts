/**
 * @fileoverview Tests for obsidian-open-note tool definition.
 * @module tests/mcp-server/tools/definitions/obsidian-open-note.tool.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import type { IObsidianProvider } from '../../../../src/services/obsidian/core/IObsidianProvider.js';
import { ObsidianProvider } from '../../../../src/container/tokens.js';
import { obsidianOpenNoteTool } from '../../../../src/mcp-server/tools/definitions/obsidian-open-note.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';

describe('obsidian-open-note tool', () => {
  let mockProvider: IObsidianProvider;

  beforeEach(() => {
    mockProvider = {
      openNote: vi.fn(),
    } as unknown as IObsidianProvider;

    container.clearInstances();
    container.registerInstance(ObsidianProvider, mockProvider);
  });

  describe('metadata', () => {
    it('should have correct name and annotations', () => {
      expect(obsidianOpenNoteTool.name).toBe('obsidian_open_note');
      expect(obsidianOpenNoteTool.annotations?.idempotentHint).toBe(true);
    });
  });

  describe('schemas', () => {
    it('should validate valid input', () => {
      const result = obsidianOpenNoteTool.inputSchema.safeParse({
        path: 'note.md',
      });
      expect(result.success).toBe(true);
    });

    it('should use default newLeaf value', () => {
      const input = { path: 'note.md' };
      const parsed = obsidianOpenNoteTool.inputSchema.parse(input);
      expect(parsed.newLeaf).toBe(false);
    });

    it('should accept newLeaf parameter', () => {
      const result = obsidianOpenNoteTool.inputSchema.safeParse({
        path: 'note.md',
        newLeaf: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.newLeaf).toBe(true);
      }
    });
  });

  describe('logic', () => {
    it('should open note in current pane', async () => {
      vi.mocked(mockProvider.openNote).mockResolvedValue(undefined);

      const input = { path: 'note.md', newLeaf: false };
      const context = requestContextService.createRequestContext();
      const result = await obsidianOpenNoteTool.logic(
        input,
        context,
        {} as any,
      );

      expect(mockProvider.openNote).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        'note.md',
        false,
      );
      expect(result.path).toBe('note.md');
      expect(result.newLeaf).toBe(false);
    });

    it('should open note in new pane', async () => {
      vi.mocked(mockProvider.openNote).mockResolvedValue(undefined);

      const input = { path: 'note.md', newLeaf: true };
      const context = requestContextService.createRequestContext();
      const result = await obsidianOpenNoteTool.logic(
        input,
        context,
        {} as any,
      );

      expect(mockProvider.openNote).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        'note.md',
        true,
      );
      expect(result.newLeaf).toBe(true);
    });
  });

  describe('responseFormatter', () => {
    it('should format open in current pane', () => {
      const result = {
        path: 'note.md',
        newLeaf: false,
        message: 'Note opened',
      };

      const formatted = obsidianOpenNoteTool.responseFormatter!(result);
      expect(formatted).toBeDefined();
      expect(formatted[0]).toBeDefined();
      expect(formatted[0]!.text).toContain('note.md');
      expect(formatted[0]!.text).toContain('Current pane');
    });

    it('should format open in new pane', () => {
      const result = {
        path: 'note.md',
        newLeaf: true,
        message: 'Note opened',
      };

      const formatted = obsidianOpenNoteTool.responseFormatter!(result);
      expect(formatted).toBeDefined();
      expect(formatted[0]).toBeDefined();
      expect(formatted[0]!.text).toContain('New pane');
    });
  });
});
