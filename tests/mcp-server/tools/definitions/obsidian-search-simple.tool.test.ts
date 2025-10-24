/**
 * @fileoverview Tests for obsidian-search-simple tool definition.
 * @module tests/mcp-server/tools/definitions/obsidian-search-simple.tool.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import type { IObsidianProvider } from '../../../../src/services/obsidian/core/IObsidianProvider.js';
import { ObsidianProvider } from '../../../../src/container/tokens.js';
import { obsidianSearchSimpleTool } from '../../../../src/mcp-server/tools/definitions/obsidian-search-simple.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';
import type { SearchResult } from '../../../../src/services/obsidian/types.js';

describe('obsidian-search-simple tool', () => {
  let mockProvider: IObsidianProvider;

  beforeEach(() => {
    mockProvider = {
      searchSimple: vi.fn(),
    } as unknown as IObsidianProvider;

    container.clearInstances();
    container.registerInstance(ObsidianProvider, mockProvider);
  });

  describe('metadata', () => {
    it('should have correct name and annotations', () => {
      expect(obsidianSearchSimpleTool.name).toBe('obsidian_search_simple');
      expect(obsidianSearchSimpleTool.annotations?.readOnlyHint).toBe(true);
      expect(obsidianSearchSimpleTool.annotations?.idempotentHint).toBe(true);
    });
  });

  describe('schemas', () => {
    it('should validate input with query', () => {
      const result = obsidianSearchSimpleTool.inputSchema.safeParse({
        query: 'test query',
      });
      expect(result.success).toBe(true);
    });

    it('should validate input with contextLength', () => {
      const result = obsidianSearchSimpleTool.inputSchema.safeParse({
        query: 'test',
        contextLength: 200,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid contextLength', () => {
      const result = obsidianSearchSimpleTool.inputSchema.safeParse({
        query: 'test',
        contextLength: -1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('logic', () => {
    it('should perform simple search', async () => {
      const mockResults: SearchResult = [
        {
          filename: 'note1.md',
          score: 0.95,
          matches: [
            { match: 'test query', context: 'This is a test query example' },
          ],
        },
        {
          filename: 'note2.md',
          matches: [{ match: 'test', context: 'Another test' }],
        },
      ];

      vi.mocked(mockProvider.searchSimple).mockResolvedValue(mockResults);

      const input = { query: 'test query', limit: 100, offset: 0 };
      const context = requestContextService.createRequestContext();
      const result = await obsidianSearchSimpleTool.logic(
        input,
        context,
        {} as any,
      );

      expect(mockProvider.searchSimple).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        {
          query: 'test query',
        },
      );
      expect(result.resultCount).toBe(2);
      expect(result.totalMatches).toBe(2);
    });

    it('should handle contextLength parameter', async () => {
      vi.mocked(mockProvider.searchSimple).mockResolvedValue([]);

      const input = {
        query: 'test',
        contextLength: 150,
        limit: 100,
        offset: 0,
      };
      const context = requestContextService.createRequestContext();
      await obsidianSearchSimpleTool.logic(input, context, {} as any);

      expect(mockProvider.searchSimple).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        {
          query: 'test',
          contextLength: 150,
        },
      );
    });
  });

  describe('responseFormatter', () => {
    it('should format search results', () => {
      const result = {
        query: 'test',
        resultCount: 2,
        totalMatches: 3,
        results: [
          {
            filename: 'note.md',
            score: 0.9,
            matchCount: 2,
            matches: [
              { match: 'test', context: 'Context 1' },
              { match: 'test', context: 'Context 2' },
            ],
          },
        ],
        limit: 100,
        offset: 0,
        hasMore: false,
      };

      const formatted = obsidianSearchSimpleTool.responseFormatter!(result);
      expect(formatted).toBeDefined();
      expect(formatted[0]).toBeDefined();
      expect(formatted[0]!.text).toContain('test');
      expect(formatted[0]!.text).toContain('2');
    });
  });
});
