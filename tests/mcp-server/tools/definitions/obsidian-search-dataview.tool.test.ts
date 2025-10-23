/**
 * @fileoverview Tests for obsidian-search-dataview tool definition.
 * @module tests/mcp-server/tools/definitions/obsidian-search-dataview.tool.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import type { IObsidianProvider } from '../../../../src/services/obsidian/core/IObsidianProvider.js';
import { ObsidianProvider } from '../../../../src/container/tokens.js';
import { obsidianSearchDataviewTool } from '../../../../src/mcp-server/tools/definitions/obsidian-search-dataview.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';
import type { SearchResult } from '../../../../src/services/obsidian/types.js';

describe('obsidian-search-dataview tool', () => {
  let mockProvider: IObsidianProvider;

  beforeEach(() => {
    mockProvider = {
      searchDataview: vi.fn(),
    } as unknown as IObsidianProvider;

    container.clearInstances();
    container.registerInstance(ObsidianProvider, mockProvider);
  });

  describe('metadata', () => {
    it('should have correct name and annotations', () => {
      expect(obsidianSearchDataviewTool.name).toBe('obsidian_search_dataview');
      expect(obsidianSearchDataviewTool.annotations?.readOnlyHint).toBe(true);
    });
  });

  describe('schemas', () => {
    it('should validate DQL query input', () => {
      const result = obsidianSearchDataviewTool.inputSchema.safeParse({
        query: 'LIST FROM #tag',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty query', () => {
      const result = obsidianSearchDataviewTool.inputSchema.safeParse({
        query: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('logic', () => {
    it('should execute Dataview query', async () => {
      const mockResults: SearchResult = [
        { filename: 'note1.md' },
        { filename: 'note2.md', score: 0.9 },
      ];

      vi.mocked(mockProvider.searchDataview).mockResolvedValue(mockResults);

      const input = { query: 'LIST FROM #project' };
      const context = requestContextService.createRequestContext();
      const result = await obsidianSearchDataviewTool.logic(
        input,
        context,
        {} as any,
      );

      expect(mockProvider.searchDataview).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        'LIST FROM #project',
      );
      expect(result.resultCount).toBe(2);
      expect(result.query).toBe('LIST FROM #project');
    });
  });

  describe('responseFormatter', () => {
    it('should format Dataview results', () => {
      const result = {
        query: 'LIST FROM #tag',
        resultCount: 2,
        results: [{ filename: 'note.md' }],
      };

      const formatted = obsidianSearchDataviewTool.responseFormatter!(result);
      expect(formatted).toBeDefined();
      expect(formatted[0]).toBeDefined();
      expect(formatted[0]!.text).toContain('LIST FROM #tag');
      expect(formatted[0]!.text).toContain('Dataview');
    });
  });
});
