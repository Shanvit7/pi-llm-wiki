import { resolve, sep } from "node:path";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { scheduleReindex } from "./indexing.js";
import { rebuildMetadataLight } from "./metadata.js";
import type { Runtime } from "./runtime.js";
import { isProtectedPath, resolveVaultPaths } from "./utils.js";

/**
 * Guardrails and auto-rebuild hooks for the LLM Wiki extension.
 */

let pendingRebuild = false;

const PATCH_HEADER = /^\[([^#\r\n]+)#[0-9A-F]{4}\]$/gm;

function collectMutationPaths(input: unknown, seen: WeakSet<object>): string[] {
  if (typeof input === "string") {
    return Array.from(input.matchAll(PATCH_HEADER), ([, target]) => target);
  }
  if (!input || typeof input !== "object" || seen.has(input)) return [];

  seen.add(input);
  if (Array.isArray(input)) return input.flatMap((value) => collectMutationPaths(value, seen));

  const { path, ...nested } = input as Record<string, unknown>;
  if (typeof path === "string" && path.length > 0) return [path];

  return Object.values(nested).flatMap((value) => collectMutationPaths(value, seen));
}

/** Return every file path targeted by a write or patch-shaped edit input. */
export function extractMutationPaths(input: unknown): string[] {
  return [...new Set(collectMutationPaths(input, new WeakSet()))];
}

/** True when a write or patch-shaped edit targets a page in the wiki directory. */
export function hasWikiMutation(input: unknown, wikiPath: string): boolean {
  const resolvedWikiPath = resolve(wikiPath);
  return extractMutationPaths(input).some((path) => {
    const resolvedPath = resolve(path);
    return (
      resolvedPath === resolvedWikiPath || resolvedPath.startsWith(`${resolvedWikiPath}${sep}`)
    );
  });
}

/** Install guardrails on the extension API. */
export function installGuardrails(pi: ExtensionAPI, runtime?: Runtime): void {
  // Block direct edits to raw/ and meta/
  pi.on("tool_call", async (event) => {
    if (isToolCallEventType("write", event)) {
      const path = event.input.path as string;
      const paths = resolveVaultPaths(process.cwd());
      const check = isProtectedPath(path, paths);
      if (check.protected) {
        return { block: true, reason: check.reason };
      }
    }

    if (isToolCallEventType("edit", event)) {
      const targetPaths = extractMutationPaths(event.input);
      if (targetPaths.length === 0) {
        return { block: true, reason: "Cannot determine the files targeted by this edit." };
      }

      const paths = resolveVaultPaths(process.cwd());
      for (const path of targetPaths) {
        const check = isProtectedPath(path, paths);
        if (check.protected) {
          return { block: true, reason: check.reason };
        }
      }
    }
  });

  // Track wiki edits for auto-rebuild
  pi.on("tool_result", async (event) => {
    if (event.toolName === "write" || event.toolName === "edit") {
      const paths = resolveVaultPaths(process.cwd());
      if (hasWikiMutation(event.input, paths.wiki)) {
        pendingRebuild = true;
      }
    }
  });

  // Rebuild metadata at end of turn if wiki was modified, then refresh
  // semantic embeddings in the background (#66) so manual page edits get
  // re-embedded. Both are best-effort no-ops when nothing is configured.
  pi.on("turn_end", async (_event, ctx) => {
    if (pendingRebuild) {
      pendingRebuild = false;
      try {
        const paths = resolveVaultPaths(process.cwd());
        // Manual page edits also rebuild off the critical path. Without a
        // runtime (shouldn't happen in normal wiring) fall back to inline.
        if (runtime) {
          const launchCtx = ctx ? { hasUI: ctx.hasUI, ui: ctx.ui } : { hasUI: false as const };
          scheduleReindex(runtime, launchCtx, paths);
        } else {
          rebuildMetadataLight(paths);
        }
      } catch {
        // Silently fail — metadata rebuild is best-effort
      }
    }
  });
}
