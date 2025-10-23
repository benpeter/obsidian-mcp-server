/**
 * @fileoverview Tests for obsidian-execute-command tool definition.
 * @module tests/mcp-server/tools/definitions/obsidian-execute-command.tool.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import type { IObsidianProvider } from '../../../../src/services/obsidian/core/IObsidianProvider.js';
import { ObsidianProvider } from '../../../../src/container/tokens.js';
import { obsidianExecuteCommandTool } from '../../../../src/mcp-server/tools/definitions/obsidian-execute-command.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';

describe('obsidian-execute-command tool', () => {
  let mockProvider: IObsidianProvider;

  beforeEach(() => {
    mockProvider = {
      executeCommand: vi.fn(),
    } as unknown as IObsidianProvider;

    container.clearInstances();
    container.registerInstance(ObsidianProvider, mockProvider);
  });

  describe('metadata', () => {
    it('should have correct name and annotations', () => {
      expect(obsidianExecuteCommandTool.name).toBe('obsidian_execute_command');
      expect(obsidianExecuteCommandTool.annotations?.idempotentHint).toBe(
        false,
      );
    });
  });

  describe('schemas', () => {
    it('should validate valid command ID', () => {
      const result = obsidianExecuteCommandTool.inputSchema.safeParse({
        commandId: 'editor:save',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty command ID', () => {
      const result = obsidianExecuteCommandTool.inputSchema.safeParse({
        commandId: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('logic', () => {
    it('should execute command', async () => {
      vi.mocked(mockProvider.executeCommand).mockResolvedValue(undefined);

      const input = { commandId: 'editor:save' };
      const context = requestContextService.createRequestContext();
      const result = await obsidianExecuteCommandTool.logic(
        input,
        context,
        {} as any,
      );

      expect(mockProvider.executeCommand).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: expect.any(String) }),
        'editor:save',
      );
      expect(result.executed).toBe(true);
      expect(result.commandId).toBe('editor:save');
    });
  });

  describe('responseFormatter', () => {
    it('should format execution success', () => {
      const result = {
        commandId: 'editor:save',
        executed: true,
        message: 'Command executed',
      };

      const formatted = obsidianExecuteCommandTool.responseFormatter!(result);
      expect(formatted).toBeDefined();
      expect(formatted[0]).toBeDefined();
      expect(formatted[0]!.text).toContain('editor:save');
      expect(formatted[0]!.text).toContain('Success');
    });
  });
});
