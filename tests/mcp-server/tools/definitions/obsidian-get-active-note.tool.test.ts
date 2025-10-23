/**
 * @fileoverview Tests for obsidian-get-active-note tool definition.
 * @module tests/mcp-server/tools/definitions/obsidian-get-active-note.tool.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import type { IObsidianProvider } from '../../../../src/services/obsidian/core/IObsidianProvider.js';
import { ObsidianProvider } from '../../../../src/container/tokens.js';
import { obsidianGetActiveNoteTool } from '../../../../src/mcp-server/tools/definitions/obsidian-get-active-note.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';
import type { NoteJson } from '../../../../src/services/obsidian/types.js';

describe('obsidian-get-active-note tool', () => {
  let mockProvider: IObsidianProvider;

  beforeEach(() => {
    // Create mock provider
    mockProvider = {
      getActiveNote: vi.fn(),
    } as unknown as IObsidianProvider;

    // Register mock in DI container
    container.clearInstances();
    container.registerInstance(ObsidianProvider, mockProvider);
  });

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(obsidianGetActiveNoteTool.name).toBe('obsidian_get_active_note');
    });

    it('should have correct title', () => {
      expect(obsidianGetActiveNoteTool.title).toBe('Get Active Note');
    });

    it('should have a description', () => {
      expect(obsidianGetActiveNoteTool.description).toBeDefined();
      expect(obsidianGetActiveNoteTool.description.length).toBeGreaterThan(0);
    });
  });

  describe('annotations', () => {
    it('should have correct annotations', () => {
      expect(obsidianGetActiveNoteTool.annotations).toEqual({
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      });
    });
  });

  describe('schemas', () => {
    it('should validate valid input', () => {
      const validInput = {
        includeMetadata: true,
      };
      const result =
        obsidianGetActiveNoteTool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should use default value for includeMetadata', () => {
      const input = {};
      const result = obsidianGetActiveNoteTool.inputSchema.parse(input);
      expect(result.includeMetadata).toBe(true);
    });

    it('should validate output schema', () => {
      const validOutput = {
        path: 'test.md',
        content: 'Test content',
      };
      const result =
        obsidianGetActiveNoteTool.outputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });
  });

  describe('logic', () => {
    it('should retrieve active note', async () => {
      const mockNote: NoteJson = {
        path: 'test.md',
        content: 'Test content',
        tags: [],
        frontmatter: {},
        stat: {
          ctime: 1234567890000,
          mtime: 1234567891000,
          size: 100,
        },
      };

      vi.mocked(mockProvider.getActiveNote).mockResolvedValue(mockNote);

      const input = { includeMetadata: true };
      const context = requestContextService.createRequestContext();
      const sdkContext = {} as any;

      const result = await obsidianGetActiveNoteTool.logic(
        input,
        context,
        sdkContext,
      );

      expect(mockProvider.getActiveNote).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
      );
      expect(result.path).toBe('test.md');
      expect(result.content).toBe('Test content');
    });

    it('should include metadata when requested', async () => {
      const mockNote = {
        path: 'test.md',
        content: 'Test content',
        tags: ['tag1', 'tag2'],
        headings: [
          { level: 1, text: 'Heading 1' },
          { level: 2, text: 'Heading 2' },
        ],
        wikilinks: ['[[link1]]', '[[link2]]'],
        frontmatter: { title: 'Test' },
        stat: {
          ctime: 1234567890000,
          mtime: 1234567891000,
          size: 100,
        },
      } as NoteJson;

      vi.mocked(mockProvider.getActiveNote).mockResolvedValue(mockNote);

      const input = { includeMetadata: true };
      const context = requestContextService.createRequestContext();
      const result = await obsidianGetActiveNoteTool.logic(
        input,
        context,
        {} as any,
      );

      expect(result.tags).toEqual(['tag1', 'tag2']);
      expect(result.headings).toHaveLength(2);
      expect(result.wikilinks).toHaveLength(2);
    });

    it('should not include metadata when not requested', async () => {
      const mockNote = {
        path: 'test.md',
        content: 'Test content',
        tags: ['tag1'],
        frontmatter: {},
        stat: {
          ctime: 1234567890000,
          mtime: 1234567891000,
          size: 100,
        },
      } as NoteJson;

      vi.mocked(mockProvider.getActiveNote).mockResolvedValue(mockNote);

      const input = { includeMetadata: false };
      const context = requestContextService.createRequestContext();
      const result = await obsidianGetActiveNoteTool.logic(
        input,
        context,
        {} as any,
      );

      expect(result.tags).toBeUndefined();
      expect(result.headings).toBeUndefined();
      expect(result.wikilinks).toBeUndefined();
    });
  });

  describe('responseFormatter', () => {
    it('should format response with all data', () => {
      const result = {
        path: 'test.md',
        content: '# Test\nContent here',
        tags: ['tag1'],
        headings: [{ level: 1, text: 'Test' }],
        wikilinks: ['[[link]]'],
        frontmatter: { title: 'Test' },
        stat: {
          ctime: 1234567890000,
          mtime: 1234567891000,
          size: 100,
        },
      };

      const formatted = obsidianGetActiveNoteTool.responseFormatter!(result);

      expect(formatted).toBeDefined();
      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toBeDefined();
      expect(formatted[0]!.type).toBe('text');
      expect(formatted[0]!.text).toContain('test.md');
      expect(formatted[0]!.text).toContain('# Test');
    });

    it('should handle minimal note data', () => {
      const result = {
        path: 'simple.md',
        content: 'Simple content',
      };

      const formatted = obsidianGetActiveNoteTool.responseFormatter!(result);

      expect(formatted).toBeDefined();
      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toBeDefined();
      expect(formatted[0]!.type).toBe('text');
      expect(formatted[0]!.text).toContain('simple.md');
      expect(formatted[0]!.text).toContain('Simple content');
    });
  });
});
