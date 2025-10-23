/**
 * @fileoverview Tests for obsidian-list-commands tool definition.
 * @module tests/mcp-server/tools/definitions/obsidian-list-commands.tool.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import type { IObsidianProvider } from '../../../../src/services/obsidian/core/IObsidianProvider.js';
import { ObsidianProvider } from '../../../../src/container/tokens.js';
import { obsidianListCommandsTool } from '../../../../src/mcp-server/tools/definitions/obsidian-list-commands.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';
import type { Command } from '../../../../src/services/obsidian/types.js';

describe('obsidian-list-commands tool', () => {
  let mockProvider: IObsidianProvider;

  beforeEach(() => {
    mockProvider = {
      listCommands: vi.fn(),
    } as unknown as IObsidianProvider;

    container.clearInstances();
    container.registerInstance(ObsidianProvider, mockProvider);
  });

  describe('metadata', () => {
    it('should have correct name and annotations', () => {
      expect(obsidianListCommandsTool.name).toBe('obsidian_list_commands');
      expect(obsidianListCommandsTool.annotations?.readOnlyHint).toBe(true);
    });
  });

  describe('schemas', () => {
    it('should validate input without filter', () => {
      const result = obsidianListCommandsTool.inputSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate input with filter', () => {
      const result = obsidianListCommandsTool.inputSchema.safeParse({
        filter: 'editor',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('logic', () => {
    it('should list all commands', async () => {
      const mockCommands: Command[] = [
        { id: 'editor:open', name: 'Open file' },
        { id: 'editor:save', name: 'Save file' },
        { id: 'workspace:split', name: 'Split pane' },
      ];

      vi.mocked(mockProvider.listCommands).mockResolvedValue(mockCommands);

      const input = {};
      const context = requestContextService.createRequestContext();
      const result = await obsidianListCommandsTool.logic(
        input,
        context,
        {} as any,
      );

      expect(mockProvider.listCommands).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
      );
      expect(result.commandCount).toBe(3);
      expect(result.commands).toHaveLength(3);
    });

    it('should filter commands by name', async () => {
      const mockCommands: Command[] = [
        { id: 'editor:open', name: 'Open file' },
        { id: 'editor:save', name: 'Save file' },
        { id: 'workspace:split', name: 'Split pane' },
      ];

      vi.mocked(mockProvider.listCommands).mockResolvedValue(mockCommands);

      const input = { filter: 'editor' };
      const context = requestContextService.createRequestContext();
      const result = await obsidianListCommandsTool.logic(
        input,
        context,
        {} as any,
      );

      expect(result.commandCount).toBe(3);
      expect(result.filteredCount).toBe(2);
      expect(result.commands).toHaveLength(2);
      expect(result.commands.every((cmd) => cmd.id.includes('editor'))).toBe(
        true,
      );
    });

    it('should filter commands case-insensitively', async () => {
      const mockCommands: Command[] = [
        { id: 'editor:open', name: 'Open File' },
      ];

      vi.mocked(mockProvider.listCommands).mockResolvedValue(mockCommands);

      const input = { filter: 'EDITOR' };
      const context = requestContextService.createRequestContext();
      const result = await obsidianListCommandsTool.logic(
        input,
        context,
        {} as any,
      );

      expect(result.commands).toHaveLength(1);
    });
  });

  describe('responseFormatter', () => {
    it('should format command list', () => {
      const result = {
        commandCount: 2,
        commands: [
          { id: 'cmd1', name: 'Command 1' },
          { id: 'cmd2', name: 'Command 2' },
        ],
      };

      const formatted = obsidianListCommandsTool.responseFormatter!(result);
      expect(formatted).toBeDefined();
      expect(formatted[0]).toBeDefined();
      expect(formatted[0]!.text).toContain('2');
      expect(formatted[0]!.text).toContain('cmd1');
    });
  });
});
