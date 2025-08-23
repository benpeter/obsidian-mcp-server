/**
 * @module VaultCacheService
 * @description Service for building and managing a hybrid in-memory cache of Obsidian vault metadata and content.
 *
 * Level 1: Metadata Cache — complete in-memory index of all notes' metadata (stats, tags, frontmatter).
 * Level 2: Content Cache — true LRU (Least Recently Used) cache for full content of notes with TTL.
 *
 * Enhancements:
 *  - True LRU using `lru-cache`
 *  - Recovery path when NoteJson is missing/invalid (parse Markdown & synthesize metadata)
 *  - Optional auto-repair for frontmatter/tags with dry-run + per-run repair cap
 *  - Concurrency limit on refresh
 *  - Diagnostics (issues & repair reports)
 *  - Safer normalization & validation
 */

import { LRUCache } from "lru-cache";
import path from "node:path";
import YAML from "yaml";
import { config } from "../../../config/index.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import {
  logger,
  RequestContext,
  requestContextService,
  retryWithDelay,
} from "../../../utils/index.js";
import { ObsidianApi, ObsidianRestApiService } from "../index.js";

// -- Type helpers -------------------------------------------------------------

type NoteJson = ObsidianApi["schemas"]["NoteJson"];
type NoteMetadata = Omit<NoteJson, "content">;
type NoteContent = string;

type Maybe<T> = T | undefined | null;

type IssueKind =
  | "MISSING_STAT"
  | "MISSING_NOTEJSON"
  | "INVALID_NOTEJSON"
  | "INVALID_FRONTMATTER"
  | "MISSING_FRONTMATTER"
  | "TAGS_NOT_ARRAY"
  | "REPAIR_FAILED"
  | "PARSE_ERROR"
  | "FETCH_ERROR";

interface FileIssue {
  filePath: string;
  kind: IssueKind;
  detail?: string;
}

interface RepairAction {
  type:
    | "ADD_FRONTMATTER"
    | "REWRITE_FRONTMATTER"
    | "NORMALIZE_TAGS"
    | "FIX_INVALID_YAML";
  description: string;
}

interface RepairPlan {
  filePath: string;
  actions: RepairAction[];
  originalFrontmatter?: Record<string, any>;
  newFrontmatter?: Record<string, any>;
  // Present only if we propose rewriting the note content (frontmatter normalized).
  newContent?: string;
}

interface RefreshStats {
  added: number;
  updated: number;
  removed: number;
  skipped: number;
  repaired: number;
}

// -- Configuration defaults (non-breaking) -----------------------------------

const CACHE_TTL_MS = (config.obsidianCacheContentTtlSeconds ?? 300) * 1000;
const CACHE_MAX_ITEMS = config.obsidianCacheContentMaxItems ?? 500;
const REFRESH_INTERVAL_MIN = config.obsidianCacheRefreshIntervalMin ?? 10;

const REFRESH_CONCURRENCY = config.obsidianCacheRefreshConcurrency ?? 8;

const REPAIR_ENABLED = config.obsidianCacheRepairEnabled ?? false;
const REPAIR_DRY_RUN =
  config.obsidianCacheRepairDryRun ??
  // safer default when enabling repairs
  true;
const REPAIR_MAX_PER_RUN = config.obsidianCacheMaxRepairsPerRun ?? 10;
const NORMALIZE_TAGS_TO_LOWERCASE =
  config.obsidianCacheNormalizeTagsToLowercase ?? true;

// -- Utility ------------------------------------------------------------------

function toPosix(p: string): string {
  // sanitize and enforce posix separators
  return p.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
}

function basenameNoExt(p: string): string {
  const base = path.posix.basename(p);
  const i = base.lastIndexOf(".");
  return i > 0 ? base.slice(0, i) : base;
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function hasValidStat(note: any): boolean {
  return (
    note &&
    note.stat &&
    isFiniteNumber(note.stat.mtime) &&
    isFiniteNumber(note.stat.ctime)
  );
}

function isNoteJson(x: any): x is NoteJson {
  // Extremely light validation to gate obvious issues.
  return x && typeof x === "object" && typeof x.path === "string";
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function normalizeTags(tags: unknown): string[] {
  let arr: string[] = [];
  if (Array.isArray(tags)) arr = tags.filter((t) => typeof t === "string");
  else if (typeof tags === "string") arr = [tags];
  if (NORMALIZE_TAGS_TO_LOWERCASE) arr = arr.map((t) => t.toLowerCase());
  return uniq(arr);
}

function extractInlineTags(markdown: string): string[] {
  // Rough heuristic for inline #tags; excludes inside code blocks by stripping fences first.
  // (keeps simple; advanced parsing could be added later)
  const stripped = markdown.replace(/```[\s\S]*?```/g, "");
  const tags: string[] = [];
  const re = /(^|\s)#([A-Za-z0-9/_-]{1,64})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped))) {
    tags.push(m[2]);
  }
  return normalizeTags(tags);
}

function parseFrontmatter(markdown: string): {
  frontmatter: Record<string, any> | null;
  body: string;
  error?: string;
} {
  const fmRe = /^---\n([\s\S]*?)\n---\n?/;
  const m = markdown.match(fmRe);
  if (!m) {
    return { frontmatter: null, body: markdown };
  }
  const yamlBlock = m[1];
  const body = markdown.slice(m[0].length);
  try {
    const parsed = YAML.parse(yamlBlock) ?? {};
    if (typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        frontmatter: {},
        body,
        error: "Frontmatter parsed to a non-object; coercing to {}",
      };
    }
    return { frontmatter: parsed as Record<string, any>, body };
  } catch (e: any) {
    return {
      frontmatter: {},
      body,
      error: `YAML parse error: ${e?.message ?? "Unknown"}`,
    };
  }
}

function buildFrontmatterString(fm: Record<string, any>): string {
  const yaml = YAML.stringify(fm).trimEnd();
  return `---\n${yaml}---\n`;
}

function withFrontmatter(markdownBody: string, fm: Record<string, any>): string {
  return buildFrontmatterString(fm) + (markdownBody.startsWith("\n") ? "" : "\n") + markdownBody;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// simple concurrency limiter (no extra deps)
async function runLimited<T>(
  limit: number,
  items: T[],
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const running: Promise<void>[] = [];
  for (let i = 0; i < Math.min(limit, queue.length); i++) {
    const next = queue.shift()!;
    running.push(
      (async function spin(item: T) {
        await worker(item);
        const n = queue.shift();
        if (n !== undefined) await spin(n);
      })(next),
    );
  }
  await Promise.all(running);
}

// -- Service ------------------------------------------------------------------

export class VaultCacheService {
  // Level 1: A complete map of all note metadata. Key is the file path (posix).
  private metadataCache: Map<string, NoteMetadata> = new Map();

  // Level 2: LRU cache for note content (true LRU with TTL).
  private contentCache: LRUCache<string, NoteContent>;

  private isCacheReady = false;
  private isBuilding = false;
  private refreshIntervalId: NodeJS.Timeout | null = null;

  private obsidianService: ObsidianRestApiService;

  // Diagnostics
  private issueIndex: Map<string, FileIssue[]> = new Map();

  constructor(obsidianService: ObsidianRestApiService) {
    this.obsidianService = obsidianService;

    this.contentCache = new LRUCache<string, NoteContent>({
      max: CACHE_MAX_ITEMS,
      ttl: CACHE_TTL_MS,
      allowStale: false,
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    });

    logger.info(
      `VaultCacheService initialized. Content LRU max=${CACHE_MAX_ITEMS}, TTL=${CACHE_TTL_MS}ms, refresh every ${REFRESH_INTERVAL_MIN}m. Repairs: ${REPAIR_ENABLED ? `enabled (dryRun=${REPAIR_DRY_RUN}, maxPerRun=${REPAIR_MAX_PER_RUN})` : "disabled"}.`,
      requestContextService.createRequestContext({
        operation: "VaultCacheServiceInit",
      }),
    );
  }

  // --- Public Cache Status and Control Methods ---

  public startPeriodicRefresh(): void {
    const refreshIntervalMs = REFRESH_INTERVAL_MIN * 60 * 1000;
    if (this.refreshIntervalId) {
      logger.warning(
        "Periodic refresh is already running.",
        requestContextService.createRequestContext({ operation: "startPeriodicRefresh" }),
      );
      return;
    }
    this.refreshIntervalId = setInterval(
      () => this.refreshCache(),
      refreshIntervalMs,
    );
    logger.info(
      `Vault cache periodic refresh scheduled every ${REFRESH_INTERVAL_MIN} minutes.`,
      requestContextService.createRequestContext({
        operation: "startPeriodicRefresh",
      }),
    );
  }

  public stopPeriodicRefresh(): void {
    const context = requestContextService.createRequestContext({
      operation: "stopPeriodicRefresh",
    });
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
      logger.info("Stopped periodic cache refresh.", context);
    } else {
      logger.info("Periodic cache refresh was not running.", context);
    }
  }

  public dispose(): void {
    this.stopPeriodicRefresh();
    this.contentCache.clear();
    this.metadataCache.clear();
    this.issueIndex.clear();
    this.isCacheReady = false;
    this.isBuilding = false;
  }

  public isReady(): boolean {
    return this.isCacheReady;
  }

  public getIsBuilding(): boolean {
    return this.isBuilding;
  }

  public getDiagnostics(): ReadonlyMap<string, FileIssue[]> {
    return this.issueIndex;
  }

  // --- Public Data Accessor Methods ---

  /**
   * Retrieves the metadata for a single file from the cache.
   * @param filePath The vault-relative path of the file.
   * @returns The cached metadata or undefined if not found.
   */
  public getMetadata(filePath: string): NoteMetadata | undefined {
    return this.metadataCache.get(toPosix(filePath));
  }

  /**
   * Returns all cached metadata. Use for vault-wide searches.
   * @returns A readonly map copy of all file paths to their metadata.
   */
  public getAllMetadata(): ReadonlyMap<string, NoteMetadata> {
    // Return a shallow copy to avoid accidental external mutation.
    return new Map(this.metadataCache);
  }

  /**
   * Retrieves the content of a file, using the cache first.
   * If not in the cache, it fetches from the Obsidian API and caches it.
   * @param filePath The vault-relative path of the file.
   * @param context The request context.
   * @returns The file content.
   */
  public async getContent(
    filePath: string,
    context: RequestContext,
  ): Promise<NoteContent> {
    const key = toPosix(filePath);

    const cached = this.contentCache.get(key);
    if (cached !== undefined) {
      logger.debug(`Content LRU HIT: ${key}`, context);
      return cached;
    }

    logger.debug(`Content LRU MISS: ${key}. Fetching from source.`, context);

    // Fetch raw markdown content, cache it, return it.
    const content = (await this.obsidianService.fetchFileContentDirect(
      key,
      "markdown",
      context,
    )) as NoteContent;

    this.contentCache.set(key, content);
    return content;
  }

  // --- Cache Maintenance Methods ---

  /**
   * Proactively updates or invalidates cache for a single file after a write operation.
   */
  public async updateCacheForFile(
    filePath: string,
    context: RequestContext,
  ): Promise<void> {
    const key = toPosix(filePath);
    const opContext = {
      ...context,
      operation: "updateCacheForFile",
      filePath: key,
    };
    logger.debug(`Proactively updating cache for file: ${key}`, opContext);

    // Invalidate L2 immediately.
    this.contentCache.delete(key);

    try {
      const noteJson = await retryWithDelay(
        () =>
          this.obsidianService.fetchFileContentDirect(
            key,
            "json",
            opContext,
          ) as Promise<NoteJson>,
        {
          operationName: "proactiveCacheUpdate",
          context: opContext,
          maxRetries: 3,
          delayMs: 300,
        },
      );

      if (noteJson && isNoteJson(noteJson)) {
        const { content, ...metadata } = noteJson;
        this.metadataCache.set(key, metadata);
        // Pre-warm content
        if (typeof content === "string") this.contentCache.set(key, content);
        logger.info(`Proactively updated metadata cache for: ${key}`, opContext);
      } else {
        this.recordIssue(key, "INVALID_NOTEJSON", "updateCacheForFile");
        logger.warning(
          `Proactive update for ${key} received invalid data, removing from metadata cache.`,
          opContext,
        );
        this.metadataCache.delete(key);
      }
    } catch (error) {
      if (error instanceof McpError && error.code === BaseErrorCode.NOT_FOUND) {
        this.metadataCache.delete(key);
        this.contentCache.delete(key);
        logger.info(
          `Proactively removed deleted file from cache: ${key}`,
          opContext,
        );
      } else {
        this.recordIssue(
          key,
          "FETCH_ERROR",
          `updateCacheForFile: ${(error as Error)?.message}`,
        );
        logger.error(
          `Failed to proactively update metadata cache for ${key}.`,
          opContext,
        );
      }
    }
  }

  public async buildVaultCache(): Promise<void> {
    const initialBuildContext =
      requestContextService.createRequestContext({
        operation: "buildVaultCache.initialCheck",
      });
    if (this.isBuilding) {
      logger.warning("Cache build already in progress. Skipping.", initialBuildContext);
      return;
    }
    if (this.isCacheReady) {
      logger.info("Cache already built. Skipping.", initialBuildContext);
      return;
    }
    await this.refreshCache(true);
  }

  public async refreshCache(isInitialBuild = false): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: "refreshCache",
      isInitialBuild,
    });
    if (this.isBuilding) {
      logger.warning("Cache refresh already in progress. Skipping.", context);
      return;
    }

    this.isBuilding = true;
    if (isInitialBuild) this.isCacheReady = false;
    this.issueIndex.clear();

    logger.info("Starting vault metadata cache refresh process...", context);

    const stats: RefreshStats = {
      added: 0,
      updated: 0,
      removed: 0,
      skipped: 0,
      repaired: 0,
    };

    let repairsRemaining = REPAIR_ENABLED ? REPAIR_MAX_PER_RUN : 0;

    try {
      const startTime = Date.now();

      const remoteFiles = await this.listAllMarkdownFiles("/", context);
      const remoteFileSet = new Set(remoteFiles);
      const cachedFileSet = new Set(this.metadataCache.keys());

      // 1) Remove deleted files
      for (const cached of cachedFileSet) {
        if (!remoteFileSet.has(cached)) {
          this.metadataCache.delete(cached);
          this.contentCache.delete(cached);
          stats.removed++;
        }
      }

      // 2) Process current remote files with concurrency
      await runLimited(REFRESH_CONCURRENCY, remoteFiles, async (origPath) => {
        const filePath = toPosix(origPath);
        const fileCtx: RequestContext = {
          ...context,
          filePath,
          operation: "refreshCache.processFile",
        };

        try {
          const cachedMetadata = this.metadataCache.get(filePath);
          // Try lightweight stat first (and retry on transient unavailability).
          const remoteStat = await retryWithDelay(
            () => this.obsidianService.getFileMetadata(filePath, fileCtx),
            {
              operationName: "refreshCache.getFileMetadata",
              context: fileCtx,
              maxRetries: 2,
              delayMs: 250,
              shouldRetry: (e: unknown) =>
                e instanceof McpError &&
                e.code === BaseErrorCode.SERVICE_UNAVAILABLE,
            },
          ).catch((e) => {
            this.recordIssue(
              filePath,
              "FETCH_ERROR",
              `getFileMetadata: ${(e as Error)?.message}`,
            );
            return undefined as unknown as Maybe<{ mtime: number; ctime: number; size?: number }>;
          });

          const needsUpdate =
            !cachedMetadata ||
            !remoteStat ||
            (cachedMetadata.stat?.mtime ?? 0) < (remoteStat?.mtime ?? Number.MAX_SAFE_INTEGER);

          if (!needsUpdate) {
            stats.skipped++;
            return;
          }

          // Prefer canonical NoteJson; if bad/absent, recover from Markdown.
          const noteJson = await this.tryFetchNoteJson(filePath, fileCtx);

          if (noteJson) {
            const { content, ...metadata } = noteJson;
            // If the stat was missing from JSON, backfill from remoteStat/cached/now.
            if (!hasValidStat(metadata)) {
              this.recordIssue(filePath, "MISSING_STAT", "NoteJson missing stat; backfilling");
              (metadata as any).stat = (metadata as any).stat ?? {};
              (metadata as any).stat.mtime =
                remoteStat?.mtime ??
                cachedMetadata?.stat?.mtime ??
                Date.now();
              (metadata as any).stat.ctime =
                remoteStat?.ctime ??
                cachedMetadata?.stat?.ctime ??
                (metadata as any).stat.mtime;
              (metadata as any).stat.size =
                remoteStat?.size ??
                cachedMetadata?.stat?.size ??
                (typeof content === "string" ? content.length : undefined);
            }

            // Normalize tags/frontmatter defensively
            const normalized = this.normalizeMetadata(filePath, metadata);

            this.metadataCache.set(filePath, normalized);
            if (!cachedMetadata) stats.added++;
            else stats.updated++;

            // Optional: try to repair if we detected metadata/frontmatter problems.
            if (repairsRemaining > 0) {
              const plan = await this.buildRepairPlanIfNeeded(
                filePath,
                content,
                normalized,
                fileCtx,
              );
              if (plan) {
                const applied = await this.applyRepairPlan(plan, fileCtx);
                if (applied) {
                  stats.repaired++;
                  repairsRemaining--;
                }
              }
            }
          } else {
            // Could not get NoteJson; attempt Markdown recovery path.
            const recovered = await this.recoverFromMarkdown(filePath, fileCtx);
            if (recovered) {
              this.metadataCache.set(filePath, recovered.metadata);
              if (!cachedMetadata) stats.added++;
              else stats.updated++;

              if (repairsRemaining > 0 && recovered.repairPlan) {
                const applied = await this.applyRepairPlan(
                  recovered.repairPlan,
                  fileCtx,
                );
                if (applied) {
                  stats.repaired++;
                  repairsRemaining--;
                }
              }
            } else {
              // last resort: do not drop; try to keep prior metadata if it existed
              if (!cachedMetadata) {
                this.recordIssue(
                  filePath,
                  "MISSING_NOTEJSON",
                  "No recovery possible; not added",
                );
              } else {
                this.recordIssue(
                  filePath,
                  "MISSING_NOTEJSON",
                  "No recovery possible; kept existing",
                );
              }
            }
          }
        } catch (error) {
          this.recordIssue(
            filePath,
            "FETCH_ERROR",
            `processFile: ${(error as Error)?.message}`,
          );
          logger.error(
            `Failed to process file during cache refresh: ${filePath}. Skipping.`,
            { ...fileCtx, error },
          );
        }
      });

      const duration = (Date.now() - startTime) / 1000;

      if (isInitialBuild) {
        this.isCacheReady = true;
        logger.info(
          `Initial vault metadata cache build completed in ${duration.toFixed(
            2,
          )}s. Indexed ${this.metadataCache.size} files. Repaired: ${
            stats.repaired
          }.`,
          context,
        );
      } else {
        logger.info(
          `Vault metadata cache refresh completed in ${duration.toFixed(
            2,
          )}s. Added: ${stats.added}, Updated: ${stats.updated}, Removed: ${
            stats.removed
          }, Skipped: ${stats.skipped}, Repaired: ${stats.repaired}. Total indexed: ${
            this.metadataCache.size
          }.`,
          context,
        );
      }
    } catch (error) {
      logger.error(
        `Critical error during vault cache refresh. Cache may be incomplete.`,
        context,
      );
      if (isInitialBuild) this.isCacheReady = false;
    } finally {
      this.isBuilding = false;
    }
  }

  // --- Private: Fetch & Recovery Paths --------------------------------------

  private async tryFetchNoteJson(
    filePath: string,
    context: RequestContext,
  ): Promise<NoteJson | null> {
    try {
      const noteJson = await retryWithDelay(
        () =>
          this.obsidianService.fetchFileContentDirect(
            filePath,
            "json",
            context,
          ) as Promise<NoteJson>,
        {
          operationName: "refreshCache.fetchFileContentDirect",
          context,
          maxRetries: 2,
          delayMs: 250,
          shouldRetry: (e: unknown) =>
            e instanceof McpError &&
            e.code === BaseErrorCode.SERVICE_UNAVAILABLE,
        },
      );

      if (!noteJson || !isNoteJson(noteJson)) {
        this.recordIssue(
          filePath,
          "INVALID_NOTEJSON",
          "NoteJson missing or invalid",
        );
        return null;
      }

      return noteJson;
    } catch (e) {
      this.recordIssue(
        filePath,
        "FETCH_ERROR",
        `fetch NoteJson: ${(e as Error)?.message}`,
      );
      return null;
    }
  }

  private normalizeMetadata(
    filePath: string,
    metadata: NoteMetadata,
  ): NoteMetadata {
    const normalized: NoteMetadata = { ...metadata };

    // Ensure path and basename
    (normalized as any).path = toPosix((normalized as any).path ?? filePath);
    (normalized as any).basename =
      (normalized as any).basename ?? basenameNoExt(filePath);

    // Ensure frontmatter present (can be empty object)
    const fm = (normalized as any).frontmatter;
    if (fm == null) {
      (normalized as any).frontmatter = {};
      this.recordIssue(filePath, "MISSING_FRONTMATTER");
    } else if (typeof fm !== "object" || Array.isArray(fm)) {
      (normalized as any).frontmatter = {};
      this.recordIssue(filePath, "INVALID_FRONTMATTER", "Coerced to {}");
    }

    // Normalize tags (frontmatter.tags has priority)
    const fmTags = normalizeTags((normalized as any).frontmatter?.tags);
    if ((normalized as any).frontmatter?.tags && !Array.isArray((normalized as any).frontmatter?.tags)) {
      this.recordIssue(filePath, "TAGS_NOT_ARRAY", "Coerced to array");
    }
    (normalized as any).tags = fmTags;

    // Stat must exist; create placeholder if missing (filled by caller where possible)
    if (!hasValidStat(normalized)) {
      (normalized as any).stat = {
        mtime: Date.now(),
        ctime: Date.now(),
      };
      this.recordIssue(filePath, "MISSING_STAT", "Filled with now()");
    }

    return normalized;
  }

  private async recoverFromMarkdown(
    filePath: string,
    context: RequestContext,
  ): Promise<
    | {
        metadata: NoteMetadata;
        repairPlan?: RepairPlan;
      }
    | null
  > {
    try {
      const markdown = (await this.obsidianService.fetchFileContentDirect(
        filePath,
        "markdown",
        context,
      )) as string;

      // cache content on recovery path too
      this.contentCache.set(filePath, markdown);

      const { frontmatter, body, error } = parseFrontmatter(markdown);
      if (error) {
        this.recordIssue(filePath, "INVALID_FRONTMATTER", error);
      }
      const inlineTags = extractInlineTags(markdown);
      const fmTags = normalizeTags(frontmatter?.tags);
      const tags = fmTags.length > 0 ? fmTags : inlineTags;

      // Best-effort stat
      const stat = await this.obsidianService
        .getFileMetadata(filePath, context)
        .catch(() => undefined as any);

      const synthesized: NoteMetadata = {
        path: filePath,
        basename: basenameNoExt(filePath),
        frontmatter: frontmatter ?? {},
        tags,
        stat: {
          mtime: stat?.mtime ?? Date.now(),
          ctime: stat?.ctime ?? Date.now(),
          size: stat?.size ?? markdown.length,
        },
      } as NoteMetadata;

      const normalized = this.normalizeMetadata(filePath, synthesized);

      // Consider repair if frontmatter missing/invalid or tags were injected
      const needsFmAdd =
        !frontmatter || Object.keys(frontmatter).length === 0;
      const tagsMismatch =
        (frontmatter?.tags && !Array.isArray(frontmatter.tags)) ||
        (frontmatter && normalizeTags(frontmatter.tags).join(",") !== tags.join(","));
      const yamlWasInvalid = Boolean(error);

      if (needsFmAdd || tagsMismatch || yamlWasInvalid) {
        const newFm = {
          ...(frontmatter ?? {}),
          ...(tags.length ? { tags } : {}),
        };
        const newContent = withFrontmatter(body, newFm);

        const plan: RepairPlan = {
          filePath,
          actions: [],
          originalFrontmatter: frontmatter ?? undefined,
          newFrontmatter: newFm,
          newContent,
        };

        if (needsFmAdd) {
          plan.actions.push({
            type: "ADD_FRONTMATTER",
            description: "Add missing frontmatter block with normalized tags.",
          });
        } else if (yamlWasInvalid) {
          plan.actions.push({
            type: "FIX_INVALID_YAML",
            description: "Rewrite frontmatter to valid YAML.",
          });
        } else if (tagsMismatch) {
          plan.actions.push({
            type: "NORMALIZE_TAGS",
            description:
              "Coerce tags to array and normalize (dedupe, optional lowercase).",
          });
        }

        return { metadata: normalized, repairPlan: plan };
      }

      return { metadata: normalized };
    } catch (e) {
      this.recordIssue(
        filePath,
        "PARSE_ERROR",
        `Markdown recovery failed: ${(e as Error)?.message}`,
      );
      return null;
    }
  }

  private async buildRepairPlanIfNeeded(
    filePath: string,
    content: unknown,
    metadata: NoteMetadata,
    context: RequestContext,
  ): Promise<RepairPlan | null> {
    // We only attempt repairs when we actually have markdown content.
    if (typeof content !== "string") return null;

    const { frontmatter, body, error } = parseFrontmatter(content);
    const fm = frontmatter ?? {};
    const fmTags = normalizeTags(fm.tags);
    const inlineTags = extractInlineTags(content);
    const chosenTags = fmTags.length ? fmTags : inlineTags;

    const actions: RepairAction[] = [];

    if (!frontmatter) {
      actions.push({
        type: "ADD_FRONTMATTER",
        description: "Add missing frontmatter block.",
      });
    } else if (error) {
      actions.push({
        type: "FIX_INVALID_YAML",
        description: "Rewrite invalid YAML frontmatter.",
      });
    }

    if (frontmatter && fm.tags && !Array.isArray(fm.tags)) {
      actions.push({
        type: "NORMALIZE_TAGS",
        description: "Coerce frontmatter.tags to an array.",
      });
    }

    // If tags in metadata differ from normalized choice, prefer normalized.
    const metaTags = normalizeTags((metadata as any).tags);
    if (metaTags.join(",") !== chosenTags.join(",")) {
      actions.push({
        type: "NORMALIZE_TAGS",
        description:
          "Align metadata tags to normalized set (frontmatter or inline).",
      });
    }

    if (actions.length === 0) return null;

    const newFm = {
      ...(fm ?? {}),
      ...(chosenTags.length ? { tags: chosenTags } : {}),
    };
    const newContent = withFrontmatter(body, newFm);

    const plan: RepairPlan = {
      filePath,
      actions,
      originalFrontmatter: fm,
      newFrontmatter: newFm,
      newContent,
    };

    return plan;
  }

  private async applyRepairPlan(
    plan: RepairPlan,
    context: RequestContext,
  ): Promise<boolean> {
    if (!REPAIR_ENABLED) return false;

    const svcAny = this.obsidianService as any;

    const describe = plan.actions.map((a) => a.type).join(", ");
    if (REPAIR_DRY_RUN) {
      logger.info(
        `DRY-RUN repair for ${plan.filePath}: ${describe}`,
        { ...context, repairPlan: plan },
      );
      return false;
    }

    // We try to write content back if possible. We don't assume the API shape, so we probe.
    try {
      if (plan.newContent && typeof svcAny?.writeFileContentDirect === "function") {
        // Prefer a direct raw content write if provided by the service.
        await svcAny.writeFileContentDirect(
          plan.filePath,
          plan.newContent,
          "markdown",
          context,
        );
        logger.info(
          `Applied repair (content rewrite) to ${plan.filePath}: ${describe}`,
          context,
        );
        // After write, proactively refresh this file's cache entry.
        await this.updateCacheForFile(plan.filePath, context);
        return true;
      }

      // Fallback: Some services might expose an 'upsertFrontmatter'
      if (typeof svcAny?.upsertFrontmatter === "function" && plan.newFrontmatter) {
        await svcAny.upsertFrontmatter(
          plan.filePath,
          plan.newFrontmatter,
          context,
        );
        logger.info(
          `Applied repair (frontmatter upsert) to ${plan.filePath}: ${describe}`,
          context,
        );
        await this.updateCacheForFile(plan.filePath, context);
        return true;
      }

      // If we can't write, at least report the plan.
      logger.warning(
        `Repair suggested but write API not available for ${plan.filePath}: ${describe}`,
        { ...context, repairPlan: plan },
      );
      this.recordIssue(plan.filePath, "REPAIR_FAILED", "No compatible write method");
      return false;
    } catch (e) {
      this.recordIssue(
        plan.filePath,
        "REPAIR_FAILED",
        (e as Error)?.message ?? "Unknown error",
      );
      logger.error(
        `Failed to apply repair for ${plan.filePath}: ${(e as Error)?.message}`,
        context,
      );
      return false;
    }
  }

  // --- Private: Listing ------------------------------------------------------

  private async listAllMarkdownFiles(
    dirPath: string,
    context: RequestContext,
    visitedDirs: Set<string> = new Set(),
  ): Promise<string[]> {
    const operation = "listAllMarkdownFiles";
    const cleanDirPath = toPosix(dirPath);
    const opContext = { ...context, operation, dirPath: cleanDirPath };

    if (visitedDirs.has(cleanDirPath)) {
      logger.warning(
        `Cycle detected or directory already visited during cache build: ${cleanDirPath}. Skipping.`,
        opContext,
      );
      return [];
    }
    visitedDirs.add(cleanDirPath);

    let markdownFiles: string[] = [];
    try {
      const entries = await this.obsidianService.listFiles(
        cleanDirPath,
        opContext,
      );

      if (!Array.isArray(entries)) {
        logger.warning(
          `Obsidian service did not return an array for listFiles on path: "${cleanDirPath}". Skipping.`,
          opContext,
        );
        return [];
      }

      for (const entry of entries) {
        const cleanEntry = toPosix(entry);
        const fullPath = cleanDirPath
          ? path.posix.join(cleanDirPath, cleanEntry)
          : cleanEntry;

        if (entry.endsWith("/")) {
          const subDirFiles = await this.listAllMarkdownFiles(
            fullPath,
            opContext,
            visitedDirs,
          );
          markdownFiles = markdownFiles.concat(subDirFiles);
        } else if (entry.toLowerCase().endsWith(".md")) {
          markdownFiles.push(fullPath);
        }
      }
      return markdownFiles;
    } catch (error) {
      const errMsg = `Failed to list directory during cache build scan: ${cleanDirPath}`;
      const err = error as McpError | Error;

      if (err instanceof McpError && err.code === BaseErrorCode.NOT_FOUND) {
        logger.debug(`${errMsg} - Directory not found, skipping.`, opContext);
      } else if (err instanceof Error) {
        logger.error(
          `${errMsg}. Skipping. Error: ${err.message}`,
          err,
          opContext,
        );
      } else {
        logger.error(`${errMsg}. Skipping.`, opContext);
      }
      return [];
    }
  }

  // --- Private: Issues -------------------------------------------------------

  private recordIssue(filePath: string, kind: IssueKind, detail?: string) {
    const key = toPosix(filePath);
    const arr = this.issueIndex.get(key) ?? [];
    arr.push({ filePath: key, kind, detail });
    this.issueIndex.set(key, arr);
  }
}
