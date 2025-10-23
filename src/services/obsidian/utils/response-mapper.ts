/**
 * @fileoverview Response mapping utilities for Obsidian API responses.
 * Transforms API responses to tool output schemas.
 * @module src/services/obsidian/utils/response-mapper
 */

import type { NoteJson, VaultFile, Command } from '../types.js';
import {
  extractTags,
  extractHeadings,
  findWikilinks,
} from './markdown-parser.js';
import { getBasename } from './path-normalizer.js';

/**
 * Enrich note data with parsed metadata
 * @param note - Note JSON from API
 * @returns Enriched note data
 */
export function enrichNoteData(note: NoteJson): NoteJson & {
  tags?: string[];
  headings?: Array<{ level: number; text: string }>;
  wikilinks?: string[];
} {
  const enriched = { ...note };

  // Extract tags from content
  const tags = extractTags(note.content);
  if (tags.length > 0) {
    (enriched as { tags?: string[] }).tags = tags;
  }

  // Extract headings
  const headings = extractHeadings(note.content);
  if (headings.length > 0) {
    (
      enriched as { headings?: Array<{ level: number; text: string }> }
    ).headings = headings.map((h) => ({
      level: h.level,
      text: h.text,
    }));
  }

  // Extract wikilinks
  const wikilinks = findWikilinks(note.content);
  if (wikilinks.length > 0) {
    (enriched as { wikilinks?: string[] }).wikilinks = wikilinks;
  }

  return enriched;
}

/**
 * Map vault list response to VaultFile array
 * @param apiResponse - File list from API (folders end with "/")
 * @param basePath - Base path for the listing
 * @returns Array of vault files
 */
export function mapVaultFiles(
  apiResponse: { files?: string[] },
  basePath: string,
): VaultFile[] {
  const result: VaultFile[] = [];
  const files = apiResponse.files ?? [];

  for (const item of files) {
    const isFolder = item.endsWith('/');
    const itemName = isFolder ? item.slice(0, -1) : item;
    const fullPath = basePath ? `${basePath}/${itemName}` : itemName;
    const basename = getBasename(fullPath);

    if (isFolder) {
      result.push({
        path: fullPath,
        type: 'folder',
        basename,
      });
    } else {
      const extension = basename.includes('.')
        ? (basename.split('.').pop() ?? '')
        : '';

      result.push({
        path: fullPath,
        type: 'file',
        basename,
        ...(extension && { extension }),
      });
    }
  }

  return result;
}

/**
 * Format note content for display
 * @param note - Note data
 * @param includeMetadata - Whether to include metadata in output
 * @returns Formatted content string
 */
export function formatNoteForDisplay(
  note: NoteJson,
  includeMetadata: boolean = true,
): string {
  const lines: string[] = [];

  if (includeMetadata) {
    lines.push(`# ${note.path}`);
    lines.push('');

    if (note.stat) {
      lines.push('**Metadata:**');
      lines.push(`- Created: ${new Date(note.stat.ctime).toISOString()}`);
      lines.push(`- Modified: ${new Date(note.stat.mtime).toISOString()}`);
      lines.push(`- Size: ${note.stat.size} bytes`);
      lines.push('');
    }

    // Add enriched metadata if available
    const enriched = note as NoteJson & {
      tags?: string[];
      headings?: Array<{ level: number; text: string }>;
      wikilinks?: string[];
    };

    if (enriched.tags && enriched.tags.length > 0) {
      lines.push(`**Tags:** ${enriched.tags.map((t) => `#${t}`).join(', ')}`);
    }

    if (enriched.headings && enriched.headings.length > 0) {
      lines.push(`**Headings:** ${enriched.headings.length} found`);
    }

    if (enriched.wikilinks && enriched.wikilinks.length > 0) {
      lines.push(`**Links:** ${enriched.wikilinks.length} wikilinks`);
    }

    if (enriched.tags || enriched.headings || enriched.wikilinks) {
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  lines.push(note.content);

  return lines.join('\n');
}

/**
 * Format command list for display
 * @param commands - Command array
 * @returns Formatted command list
 */
export function formatCommandList(commands: Command[]): string {
  const lines: string[] = [];

  lines.push(`# Available Commands (${commands.length})`);
  lines.push('');

  for (const cmd of commands) {
    lines.push(`## ${cmd.name}`);
    lines.push(`- **ID:** \`${cmd.id}\``);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format vault file list for display
 * @param files - Vault file array
 * @param path - Base path
 * @returns Formatted file list
 */
export function formatVaultFileList(files: VaultFile[], path: string): string {
  const lines: string[] = [];

  const displayPath = path || '/';
  lines.push(`# Files in: ${displayPath}`);
  lines.push('');

  const folders = files.filter((f) => f.type === 'folder');
  const regularFiles = files.filter((f) => f.type === 'file');

  if (folders.length > 0) {
    lines.push('## Folders');
    for (const folder of folders) {
      lines.push(`- 📁 ${folder.basename}`);
    }
    lines.push('');
  }

  if (regularFiles.length > 0) {
    lines.push('## Files');
    for (const file of regularFiles) {
      const icon = file.extension === 'md' ? '📝' : '📄';
      lines.push(`- ${icon} ${file.basename}`);
    }
    lines.push('');
  }

  lines.push(
    `**Total:** ${folders.length} folders, ${regularFiles.length} files`,
  );

  return lines.join('\n');
}
