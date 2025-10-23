/**
 * @fileoverview Tests for obsidian-search-jsonlogic tool definition.
 * @module tests/mcp-server/tools/definitions/obsidian-search-jsonlogic.tool.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import type { IObsidianProvider } from '../../../../src/services/obsidian/core/IObsidianProvider.js';
import { ObsidianProvider } from '../../../../src/container/tokens.js';
import { obsidianSearchJsonLogicTool } from '../../../../src/mcp-server/tools/definitions/obsidian-search-jsonlogic.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';
import type { SearchResult } from '../../../../src/services/obsidian/types.js';

describe('obsidian-search-jsonlogic tool', () => {
  let mockProvider: IObsidianProvider;

  beforeEach(() => {
    mockProvider = {
      searchJsonLogic: vi.fn(),
    } as unknown as IObsidianProvider;

    container.clearInstances();
    container.registerInstance(ObsidianProvider, mockProvider);
  });

  describe('metadata', () => {
    it('should have correct name and annotations', () => {
      expect(obsidianSearchJsonLogicTool.name).toBe(
        'obsidian_search_jsonlogic',
      );
      expect(obsidianSearchJsonLogicTool.annotations?.readOnlyHint).toBe(true);
    });
  });

  describe('schemas', () => {
    it('should validate JsonLogic query object', () => {
      const result = obsidianSearchJsonLogicTool.inputSchema.safeParse({
        query: { glob: { path: '*.md' } },
      });
      expect(result.success).toBe(true);
    });

    it('should validate complex query', () => {
      const result = obsidianSearchJsonLogicTool.inputSchema.safeParse({
        query: {
          and: [{ glob: { path: '*.md' } }, { regexp: { content: 'test' } }],
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('logic', () => {
    it('should execute JsonLogic query', async () => {
      const mockResults: SearchResult = [
        { filename: 'note1.md' },
        { filename: 'note2.md' },
      ];

      vi.mocked(mockProvider.searchJsonLogic).mockResolvedValue(mockResults);

      const query = { glob: { path: 'docs/*.md' } };
      const input = { query };
      const context = requestContextService.createRequestContext();
      const result = await obsidianSearchJsonLogicTool.logic(
        input,
        context,
        {} as any,
      );

      expect(mockProvider.searchJsonLogic).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        query,
      );
      expect(result.resultCount).toBe(2);
      expect(result.query).toEqual(query);
    });
  });

  describe('responseFormatter', () => {
    it('should format JsonLogic results', () => {
      const result = {
        query: { glob: { path: '*.md' } },
        resultCount: 2,
        results: [{ filename: 'note.md' }],
      };

      const formatted = obsidianSearchJsonLogicTool.responseFormatter!(result);
      expect(formatted).toBeDefined();
      expect(formatted[0]).toBeDefined();
      expect(formatted[0]!.text).toContain('JsonLogic');
      expect(formatted[0]!.text).toContain('glob');
    });
  });
});
