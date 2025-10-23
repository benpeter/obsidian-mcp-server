/**
 * @fileoverview Markdown parsing utilities for Obsidian notes.
 * Handles frontmatter extraction, tag parsing, and block reference finding.
 * @module src/services/obsidian/utils/markdown-parser
 */

import matter from 'gray-matter';

/**
 * Parse frontmatter from markdown content
 * @param content - Markdown content
 * @returns Parsed frontmatter object and content without frontmatter
 */
export function parseFrontmatter(content: string): {
  data: Record<string, unknown>;
  content: string;
} {
  try {
    const result = matter(content);
    return {
      data: result.data,
      content: result.content,
    };
  } catch (_error) {
    // If parsing fails, return empty frontmatter and original content
    return {
      data: {},
      content,
    };
  }
}

/**
 * Extract tags from markdown content
 * Finds both #tag and frontmatter tags
 * @param content - Markdown content
 * @returns Array of unique tags (without # prefix)
 */
export function extractTags(content: string): string[] {
  const tags = new Set<string>();

  // Extract frontmatter tags
  const { data, content: bodyContent } = parseFrontmatter(content);
  if (data.tags) {
    if (Array.isArray(data.tags)) {
      data.tags.forEach((tag) => {
        if (typeof tag === 'string') {
          tags.add(tag.replace(/^#/, ''));
        }
      });
    } else if (typeof data.tags === 'string') {
      const tagString = data.tags;
      tagString.split(',').forEach((tag) => {
        tags.add(tag.trim().replace(/^#/, ''));
      });
    }
  }

  // Extract inline tags (#tag)
  const inlineTagRegex = /#([a-zA-Z0-9_\-/]+)/g;
  let match;
  while ((match = inlineTagRegex.exec(bodyContent)) !== null) {
    if (match[1]) {
      tags.add(match[1]);
    }
  }

  return Array.from(tags);
}

/**
 * Find block references in markdown content
 * @param content - Markdown content
 * @returns Array of block IDs found in the content
 */
export function findBlockReferences(content: string): string[] {
  const blockRefs = new Set<string>();
  const blockRefRegex = /\^([a-zA-Z0-9\-]+)/g;

  let match;
  while ((match = blockRefRegex.exec(content)) !== null) {
    if (match[1]) {
      blockRefs.add(match[1]);
    }
  }

  return Array.from(blockRefs);
}

/**
 * Find all headings in markdown content
 * @param content - Markdown content
 * @returns Array of heading objects with level and text
 */
export function extractHeadings(
  content: string,
): Array<{ level: number; text: string; line: number }> {
  const headings: Array<{ level: number; text: string; line: number }> = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line?.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch && headingMatch[1] && headingMatch[2]) {
      headings.push({
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
        line: i + 1,
      });
    }
  }

  return headings;
}

/**
 * Find wikilinks in markdown content
 * @param content - Markdown content
 * @returns Array of wikilink targets
 */
export function findWikilinks(content: string): string[] {
  const wikilinks = new Set<string>();
  const wikilinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

  let match;
  while ((match = wikilinkRegex.exec(content)) !== null) {
    if (match[1]) {
      wikilinks.add(match[1]);
    }
  }

  return Array.from(wikilinks);
}

/**
 * Add or update a frontmatter field
 * @param content - Markdown content
 * @param key - Frontmatter key
 * @param value - Frontmatter value
 * @returns Updated markdown content
 */
export function updateFrontmatter(
  content: string,
  key: string,
  value: unknown,
): string {
  const { data, content: bodyContent } = parseFrontmatter(content);
  data[key] = value;

  return matter.stringify(bodyContent, data);
}

/**
 * Check if content has frontmatter
 * @param content - Markdown content
 * @returns True if frontmatter exists
 */
export function hasFrontmatter(content: string): boolean {
  return content.trimStart().startsWith('---');
}

/**
 * Get content between two headings
 * @param content - Markdown content
 * @param headingText - Target heading text
 * @returns Content under the heading (until next same-level heading)
 */
export function getContentUnderHeading(
  content: string,
  headingText: string,
): string | null {
  const headings = extractHeadings(content);
  const targetIndex = headings.findIndex((h) => h.text === headingText);

  if (targetIndex === -1) {
    return null;
  }

  const targetHeading = headings[targetIndex];
  if (!targetHeading) {
    return null;
  }

  const lines = content.split('\n');
  const startLine = targetHeading.line; // Line number (1-indexed)

  // Find the next heading of same or higher level
  let endLine = lines.length;
  for (let i = targetIndex + 1; i < headings.length; i++) {
    const nextHeading = headings[i];
    if (nextHeading && nextHeading.level <= targetHeading.level) {
      endLine = nextHeading.line - 1;
      break;
    }
  }

  // Extract content (excluding the heading itself)
  return lines.slice(startLine, endLine).join('\n');
}
