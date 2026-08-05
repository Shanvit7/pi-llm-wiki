import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { afterEach, expect, it } from "vitest";
import { parseKnowledgeDocument } from "../extensions/llm-wiki/lib/knowledge-document.js";
import { repairLegacyKnowledgeDocuments } from "../extensions/llm-wiki/lib/legacy-repair.js";
import { rebuildMetadata } from "../extensions/llm-wiki/lib/metadata.js";
import { registerWikiLint } from "../extensions/llm-wiki/lib/tools.js";
import { ensureVaultStructure, getVaultPaths } from "../extensions/llm-wiki/lib/utils.js";

type TestTool = {
  execute: (...args: unknown[]) => Promise<{
    isError?: boolean;
    content: Array<{ text: string }>;
    details: Record<string, unknown>;
  }>;
};
const root = join(import.meta.dirname, "..", "tmp", `lint-okf-${Date.now()}`);
afterEach(() => rmSync(root, { recursive: true, force: true }));

it("reports and auto-fixes one target referenced by Markdown and a legacy wikilink", async () => {
  const paths = getVaultPaths(root);
  ensureVaultStructure(paths);
  writeFileSync(join(paths.dotWiki, "config.json"), JSON.stringify({ name: "Lint test" }));
  writeFileSync(
    join(paths.wiki, "concepts", "markdown-source.md"),
    "---\ntype: concept\ntitle: Markdown source\n---\n\n[missing](/concepts/missing.md)\n",
  );
  writeFileSync(
    join(paths.wiki, "concepts", "wikilink-source.md"),
    "---\ntype: concept\ntitle: Wikilink source\n---\n\n[[concepts/missing]]\n",
  );

  let tool: TestTool | undefined;
  registerWikiLint({
    registerTool: (definition: unknown) => {
      tool = definition as TestTool;
    },
  } as unknown as ExtensionAPI);
  if (!tool) throw new Error("wiki_lint was not registered");
  const result = await tool.execute("test", { auto_fix: true }, undefined, undefined, {
    cwd: root,
    hasUI: false,
  });

  expect(result.isError).not.toBe(true);
  expect(result.content[0].text).toContain("Missing: 2");
  expect(existsSync(join(paths.wiki, "concepts", "missing.md"))).toBe(true);
  const gaps = JSON.parse(readFileSync(join(paths.discoveries, "gaps.json"), "utf8"));
  expect(gaps.gaps).toEqual([
    {
      topic: "concepts/missing",
      mentionedBy: ["concepts/markdown-source", "concepts/wikilink-source"],
    },
  ]);
});

it("backs up and repairs malformed legacy pages before rebuilding metadata", async () => {
  const paths = getVaultPaths(root);
  ensureVaultStructure(paths);
  writeFileSync(join(paths.dotWiki, "config.json"), JSON.stringify({ name: "Legacy repair" }));
  const fixtures: Record<string, string> = {
    "analyses/plain.md": "# Plain legacy page\n\nBody preserved.\n",
    "sources/missing-type.md":
      "---\ntitle: Missing type\nunknown: keep\n---\n\n# Missing type\n\nBody preserved.\n",
    "sources/broken-yaml.md":
      '---\ntitle: "Observation: quoted "value""\nunknown: keep\n---\n\n# Broken YAML\n\nBody preserved.\n',
  };
  for (const [path, content] of Object.entries(fixtures)) {
    writeFileSync(join(paths.wiki, path), content);
  }
  writeFileSync(
    join(paths.meta, "registry.json"),
    `${JSON.stringify({
      pages: {
        "analyses/plain": { type: "analysis", title: "Plain legacy page" },
        "sources/missing-type": { type: "source", title: "Missing type" },
        "sources/broken-yaml": { type: "source", title: "Broken YAML" },
      },
    })}\n`,
  );
  expect(rebuildMetadata(paths).ok).toBe(false);

  let tool: TestTool | undefined;
  registerWikiLint({
    registerTool: (definition: unknown) => {
      tool = definition as TestTool;
    },
  } as unknown as ExtensionAPI);
  if (!tool) throw new Error("wiki_lint was not registered");

  const audit = await tool.execute("test", { auto_fix: false }, undefined, undefined, {
    cwd: root,
    hasUI: false,
  });
  expect(audit.content[0].text).toContain("Projection-blocking diagnostics");
  for (const [path, content] of Object.entries(fixtures)) {
    expect(readFileSync(join(paths.wiki, path), "utf8")).toBe(content);
  }

  const repaired = await tool.execute("test", { auto_fix: true }, undefined, undefined, {
    cwd: root,
    hasUI: false,
  });
  expect(repaired.isError).not.toBe(true);
  expect(repaired.content[0].text).toContain("Legacy pages repaired: 3");
  expect(rebuildMetadata(paths).ok).toBe(true);

  const backupName = readdirSync(paths.outputs).find((entry) => entry.startsWith("legacy-repair-"));
  expect(backupName).toBeDefined();
  if (!backupName) return;
  const manifest = JSON.parse(
    readFileSync(join(paths.outputs, backupName, "manifest.json"), "utf8"),
  ) as { entries: Array<{ path: string; backup: string; before_sha256: string }> };
  expect(manifest.entries.map((entry) => entry.path).sort()).toEqual(Object.keys(fixtures).sort());
  for (const entry of manifest.entries) {
    expect(readFileSync(join(root, entry.backup), "utf8")).toBe(fixtures[entry.path]);
    const parsed = parseKnowledgeDocument(
      readFileSync(join(paths.wiki, entry.path), "utf8"),
      entry.path,
    );
    expect(parsed.ok, entry.path).toBe(true);
  }

  const missingType = readFileSync(join(paths.wiki, "sources/missing-type.md"), "utf8");
  expect(missingType).toContain("unknown: keep");
  const broken = parseKnowledgeDocument(
    readFileSync(join(paths.wiki, "sources/broken-yaml.md"), "utf8"),
    "sources/broken-yaml.md",
  );
  expect(broken.ok).toBe(true);
  if (broken.ok) {
    expect(broken.document.body).toContain("Body preserved.");
    expect(broken.document.extensions.legacy_frontmatter).toContain("unknown: keep");
  }
});

it("resumes a checkpointed legacy repair after interruption", () => {
  const paths = getVaultPaths(root);
  ensureVaultStructure(paths);
  writeFileSync(join(paths.dotWiki, "config.json"), JSON.stringify({ name: "Interrupted" }));
  writeFileSync(join(paths.wiki, "analyses", "first.md"), "# First\n\nBody one.\n");
  writeFileSync(join(paths.wiki, "concepts", "second.md"), "# Second\n\nBody two.\n");

  expect(() =>
    repairLegacyKnowledgeDocuments(paths, new Date("2026-08-05T00:00:00Z"), () => {
      throw new Error("simulated interruption");
    }),
  ).toThrow("simulated interruption");
  const transaction = readdirSync(paths.outputs).find((entry) =>
    entry.startsWith("legacy-repair-"),
  );
  expect(transaction).toBeDefined();
  if (!transaction) return;
  const journalPath = join(paths.outputs, transaction, "journal.json");
  expect(existsSync(journalPath)).toBe(true);
  expect(
    (JSON.parse(readFileSync(journalPath, "utf8")) as { completed: string[] }).completed,
  ).toHaveLength(1);

  writeFileSync(
    join(paths.dotWiki, ".legacy-repair.lock"),
    JSON.stringify({ operation_id: "stale", pid: 999_999_999 }),
  );
  const resumed = repairLegacyKnowledgeDocuments(paths);
  expect(resumed.repaired).toBe(2);
  expect(existsSync(journalPath)).toBe(false);
  expect(existsSync(join(paths.dotWiki, ".legacy-repair.lock"))).toBe(false);
  expect(rebuildMetadata(paths).ok).toBe(true);
  expect(
    parseKnowledgeDocument(
      readFileSync(join(paths.wiki, "analyses", "first.md"), "utf8"),
      "analyses/first.md",
    ).ok,
  ).toBe(true);
  expect(
    parseKnowledgeDocument(
      readFileSync(join(paths.wiki, "concepts", "second.md"), "utf8"),
      "concepts/second.md",
    ).ok,
  ).toBe(true);
});
