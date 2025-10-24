/**
 * @fileoverview Barrel file for all tool definitions.
 * This file re-exports all tool definitions for easy import and registration.
 * It also exports an array of all definitions for automated registration.
 * @module src/mcp-server/tools/definitions
 */

// Obsidian tools - Active Note Operations
import { obsidianAppendActiveNoteTool } from './obsidian-append-active-note.tool.js';
import { obsidianGetActiveNoteTool } from './obsidian-get-active-note.tool.js';
import { obsidianPatchActiveNoteTool } from './obsidian-patch-active-note.tool.js';
import { obsidianUpdateActiveNoteTool } from './obsidian-update-active-note.tool.js';

// Obsidian tools - General Note Operations
import { obsidianAppendNoteTool } from './obsidian-append-note.tool.js';
import { obsidianCreateNoteTool } from './obsidian-create-note.tool.js';
import { obsidianDeleteNoteTool } from './obsidian-delete-note.tool.js';
import { obsidianGetNoteTool } from './obsidian-get-note.tool.js';
import { obsidianListVaultFilesTool } from './obsidian-list-vault-files.tool.js';
import { obsidianPatchNoteTool } from './obsidian-patch-note.tool.js';

// Obsidian tools - Search Operations
import { obsidianSearchDataviewTool } from './obsidian-search-dataview.tool.js';
import { obsidianSearchJsonLogicTool } from './obsidian-search-jsonlogic.tool.js';
import { obsidianSearchSimpleTool } from './obsidian-search-simple.tool.js';

// Obsidian tools - Periodic Note Operations
import { obsidianAppendPeriodicNoteTool } from './obsidian-append-periodic-note.tool.js';
import { obsidianGetPeriodicNoteTool } from './obsidian-get-periodic-note.tool.js';
import { obsidianPatchPeriodicNoteTool } from './obsidian-patch-periodic-note.tool.js';

// Obsidian tools - Commands & UI Operations
import { obsidianExecuteCommandTool } from './obsidian-execute-command.tool.js';
import { obsidianListCommandsTool } from './obsidian-list-commands.tool.js';
import { obsidianOpenNoteTool } from './obsidian-open-note.tool.js';

/**
 * An array containing all tool definitions for easy iteration.
 */
export const allToolDefinitions = [
  // Obsidian - Active Note Operations
  obsidianAppendActiveNoteTool,
  obsidianGetActiveNoteTool,
  obsidianPatchActiveNoteTool,
  obsidianUpdateActiveNoteTool,

  // Obsidian - General Note Operations
  obsidianAppendNoteTool,
  obsidianCreateNoteTool,
  obsidianDeleteNoteTool,
  obsidianGetNoteTool,
  obsidianListVaultFilesTool,
  obsidianPatchNoteTool,

  // Obsidian - Search Operations
  obsidianSearchDataviewTool,
  obsidianSearchJsonLogicTool,
  obsidianSearchSimpleTool,

  // Obsidian - Periodic Note Operations
  obsidianAppendPeriodicNoteTool,
  obsidianGetPeriodicNoteTool,
  obsidianPatchPeriodicNoteTool,

  // Obsidian - Commands & UI Operations
  obsidianExecuteCommandTool,
  obsidianListCommandsTool,
  obsidianOpenNoteTool,
];
