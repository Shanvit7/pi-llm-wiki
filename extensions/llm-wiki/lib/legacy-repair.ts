import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import {
  type DiagnosticCode,
  type KnowledgeDiagnostic,
  createKnowledgeDocument,
  parseKnowledgeDocument,
  parseMarkdownFrontmatter,
  serializeKnowledgeDocument,
} from "./knowledge-document.js";
import { type VaultPaths, readJson } from "./utils.js";
import { discoverKnowledgeDocuments, inspectVaultFormat } from "./vault-format.js";

const RECOVERABLE = new Set<DiagnosticCode>([
  "frontmatter_missing",
  "frontmatter_parse_error",
  "concept_missing_type",
]);
const TRANSACTION_PREFIX = "legacy-repair-";
const JOURNAL_NAME = "journal.json";

export interface LegacyRepairEntry {
  path: string;
  backup: string;
  before_sha256: string;
  after_sha256: string;
  diagnostics: DiagnosticCode[];
}

export interface LegacyRepairResult {
  repaired: number;
  backupDir?: string;
  manifestPath?: string;
  entries: LegacyRepairEntry[];
  diagnostics: KnowledgeDiagnostic[];
}

interface RepairJournalEntry extends LegacyRepairEntry {
  mode: number;
  atime_ms: number;
  mtime_ms: number;
}

interface RepairJournal {
  version: 1;
  operation_id: string;
  root: string;
  started: string;
  entries: RepairJournalEntry[];
  completed: string[];
}

function sha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

function inferredType(path: string, registryType: unknown): string {
  if (typeof registryType === "string" && registryType.trim()) return registryType;
  const folder = path.split("/")[0];
  return (
    {
      sources: "source",
      entities: "entity",
      concepts: "concept",
      syntheses: "synthesis",
      analyses: "analysis",
      requirements: "requirement",
      skills: "skill",
      cases: "case",
    }[folder] ?? "concept"
  );
}

function inferredTitle(path: string, content: string, registryTitle: unknown): string {
  if (typeof registryTitle === "string" && registryTitle.trim()) return registryTitle;
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading;
  return basename(path, ".md").replace(/[-_]+/g, " ").trim() || "Recovered page";
}

function splitBrokenFrontmatter(content: string): { raw: string; body: string } {
  const normalized = content.replace(/\r\n?/g, "\n");
  if (!normalized.startsWith("---\n")) return { raw: "", body: normalized };
  const closing = normalized.indexOf("\n---\n", 4);
  if (closing === -1) {
    throw new Error("Cannot safely repair frontmatter without an unambiguous closing delimiter");
  }
  return {
    raw: normalized.slice(4, closing),
    body: normalized.slice(closing + 5).replace(/^\n/, ""),
  };
}

function repairedContent(
  path: string,
  content: string,
  diagnostics: DiagnosticCode[],
  type: string,
  title: string,
): string {
  if (diagnostics.includes("concept_missing_type")) {
    const parsed = parseMarkdownFrontmatter(content, path);
    if (parsed.ok) {
      const candidate = content.replace(/^---\r?\n/, `---\ntype: ${JSON.stringify(type)}\n`);
      if (parseKnowledgeDocument(candidate, path).ok) return candidate;
    }
  }

  const broken = splitBrokenFrontmatter(content);
  return serializeKnowledgeDocument(
    createKnowledgeDocument(
      path,
      {
        type,
        title,
        legacy_repair: true,
        ...(broken.raw ? { legacy_frontmatter: broken.raw } : {}),
      },
      broken.body,
    ),
  );
}

function containedPath(root: string, path: string): string {
  const target = resolve(root, path);
  const relation = relative(root, target);
  if (relation === "" || relation === ".." || relation.startsWith(`..${sep}`)) {
    throw new Error(`Unsafe legacy repair path: ${path}`);
  }
  return target;
}

function syncDirectory(path: string): void {
  let handle: number | undefined;
  try {
    handle = openSync(path, "r");
    fsyncSync(handle);
  } catch (error) {
    if (process.platform !== "win32") throw error;
  } finally {
    if (handle !== undefined) closeSync(handle);
  }
}

function ensurePrivateParent(path: string): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
}

function durableWriteNew(path: string, content: string | Buffer): void {
  ensurePrivateParent(path);
  const handle = openSync(path, "wx", 0o600);
  try {
    writeFileSync(handle, content);
    fsyncSync(handle);
  } finally {
    closeSync(handle);
  }
  syncDirectory(dirname(path));
}

function atomicWriteJson(path: string, value: unknown): void {
  ensurePrivateParent(path);
  const temporary = `${path}.${process.pid}-${randomUUID()}.tmp`;
  durableWriteNew(temporary, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporary, path);
  syncDirectory(dirname(path));
}

function atomicReplace(
  path: string,
  content: Buffer,
  metadata: Pick<RepairJournalEntry, "mode" | "atime_ms" | "mtime_ms">,
): void {
  const temporary = `${path}.legacy-repair-${process.pid}-${randomUUID()}`;
  const handle = openSync(temporary, "wx", metadata.mode & 0o777);
  try {
    writeFileSync(handle, content);
    fsyncSync(handle);
  } finally {
    closeSync(handle);
  }
  chmodSync(temporary, metadata.mode & 0o777);
  utimesSync(temporary, new Date(metadata.atime_ms), new Date(metadata.mtime_ms));
  renameSync(temporary, path);
  syncDirectory(dirname(path));
}

function processAlive(pid: unknown): boolean {
  if (!Number.isInteger(pid) || (pid as number) <= 0) return false;
  try {
    process.kill(pid as number, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function acquireLock(paths: VaultPaths): { path: string; operationId: string } {
  const path = join(paths.dotWiki, ".legacy-repair.lock");
  if (existsSync(path)) {
    let stale = true;
    try {
      const current = JSON.parse(readFileSync(path, "utf8")) as { pid?: unknown };
      stale = !processAlive(current.pid);
    } catch {
      stale = false;
    }
    if (!stale) throw new Error(`Legacy repair is already running: ${path}`);
    unlinkSync(path);
    syncDirectory(dirname(path));
  }
  const operationId = randomUUID();
  durableWriteNew(
    path,
    `${JSON.stringify({ operation_id: operationId, pid: process.pid, started: new Date().toISOString() })}\n`,
  );
  return { path, operationId };
}

function releaseLock(lock: { path: string; operationId: string }): void {
  if (!existsSync(lock.path)) return;
  const current = JSON.parse(readFileSync(lock.path, "utf8")) as { operation_id?: unknown };
  if (current.operation_id !== lock.operationId) return;
  unlinkSync(lock.path);
  syncDirectory(dirname(lock.path));
}

function inProgressJournal(paths: VaultPaths): string | undefined {
  if (!existsSync(paths.outputs)) return undefined;
  const journals = readdirSync(paths.outputs)
    .filter((entry) => entry.startsWith(TRANSACTION_PREFIX))
    .map((entry) => join(paths.outputs, entry, JOURNAL_NAME))
    .filter(existsSync);
  if (journals.length > 1) throw new Error("Multiple incomplete legacy repair journals found");
  return journals[0];
}

function readJournal(path: string, paths: VaultPaths): RepairJournal {
  const journal = JSON.parse(readFileSync(path, "utf8")) as RepairJournal;
  if (
    journal.version !== 1 ||
    journal.root !== paths.root ||
    typeof journal.operation_id !== "string" ||
    !Array.isArray(journal.entries) ||
    !Array.isArray(journal.completed)
  ) {
    throw new Error(`Invalid legacy repair journal: ${path}`);
  }
  return journal;
}

function applyJournal(
  paths: VaultPaths,
  journalPath: string,
  journal: RepairJournal,
  diagnostics: KnowledgeDiagnostic[],
  afterCheckpoint?: (path: string) => void,
): LegacyRepairResult {
  const transactionDir = dirname(journalPath);
  for (const entry of journal.entries) {
    const pagePath = containedPath(paths.wiki, entry.path);
    const backupPath = containedPath(join(transactionDir, "wiki"), entry.path);
    const repairedPath = containedPath(join(transactionDir, "repaired"), entry.path);
    const backup = readFileSync(backupPath);
    const repaired = readFileSync(repairedPath);
    if (sha256(backup) !== entry.before_sha256 || sha256(repaired) !== entry.after_sha256) {
      throw new Error(`Legacy repair transaction verification failed: ${entry.path}`);
    }

    const current = readFileSync(pagePath);
    const currentHash = sha256(current);
    if (currentHash === entry.before_sha256) {
      atomicReplace(pagePath, repaired, entry);
    } else if (currentHash !== entry.after_sha256) {
      throw new Error(`Legacy page changed during repair: ${entry.path}`);
    }
    if (!journal.completed.includes(entry.path)) {
      journal.completed.push(entry.path);
      atomicWriteJson(journalPath, journal);
      afterCheckpoint?.(entry.path);
    }
  }

  const manifestPath = join(transactionDir, "manifest.json");
  atomicWriteJson(manifestPath, {
    version: 1,
    repaired_at: new Date().toISOString(),
    entries: journal.entries.map(
      ({ mode: _mode, atime_ms: _atime, mtime_ms: _mtime, ...entry }) => entry,
    ),
  });
  unlinkSync(journalPath);
  syncDirectory(transactionDir);
  return {
    repaired: journal.entries.length,
    backupDir: transactionDir,
    manifestPath,
    entries: journal.entries,
    diagnostics,
  };
}

function createJournal(
  paths: VaultPaths,
  diagnostics: KnowledgeDiagnostic[],
  operationId: string,
  now: Date,
): { path: string; journal: RepairJournal } | undefined {
  const byPath = new Map<string, KnowledgeDiagnostic[]>();
  for (const diagnostic of diagnostics) {
    if (!RECOVERABLE.has(diagnostic.code)) continue;
    const current = byPath.get(diagnostic.path) ?? [];
    current.push(diagnostic);
    byPath.set(diagnostic.path, current);
  }
  if (byPath.size === 0) return undefined;

  mkdirSync(paths.outputs, { recursive: true });
  const transactionDir = join(
    paths.outputs,
    `${TRANSACTION_PREFIX}${now.toISOString().replace(/[:.]/g, "-")}-${operationId}`,
  );
  mkdirSync(transactionDir, { mode: 0o700 });
  syncDirectory(paths.outputs);
  const registry = readJson<{ pages?: Record<string, { type?: unknown; title?: unknown }> }>(
    join(paths.meta, "registry.json"),
    {},
  );
  const entries: RepairJournalEntry[] = [];

  for (const [path, pathDiagnostics] of [...byPath].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  )) {
    const pagePath = containedPath(paths.wiki, path);
    const stat = lstatSync(pagePath);
    if (!stat.isFile() || stat.nlink !== 1) {
      throw new Error(`Legacy repair requires a regular, non-hard-linked file: ${path}`);
    }
    const original = readFileSync(pagePath);
    const content = original.toString("utf8");
    if (!Buffer.from(content).equals(original))
      throw new Error(`Legacy page is not UTF-8: ${path}`);
    const id = path.replace(/\.md$/i, "");
    const registryEntry = registry.pages?.[id];
    const type = inferredType(path, registryEntry?.type);
    const title = inferredTitle(path, content, registryEntry?.title);
    const codes = [...new Set(pathDiagnostics.map((diagnostic) => diagnostic.code))];
    const repaired = Buffer.from(repairedContent(path, content, codes, type, title));
    if (!parseKnowledgeDocument(repaired.toString("utf8"), path).ok) {
      throw new Error(`Repair did not produce a valid page: ${path}`);
    }
    const backupPath = containedPath(join(transactionDir, "wiki"), path);
    const repairedPath = containedPath(join(transactionDir, "repaired"), path);
    durableWriteNew(backupPath, original);
    durableWriteNew(repairedPath, repaired);
    entries.push({
      path,
      backup: relative(paths.root, backupPath).replace(/\\/g, "/"),
      before_sha256: sha256(original),
      after_sha256: sha256(repaired),
      diagnostics: codes,
      mode: stat.mode,
      atime_ms: stat.atimeMs,
      mtime_ms: stat.mtimeMs,
    });
  }

  const journal: RepairJournal = {
    version: 1,
    operation_id: operationId,
    root: paths.root,
    started: now.toISOString(),
    entries,
    completed: [],
  };
  const path = join(transactionDir, JOURNAL_NAME);
  atomicWriteJson(path, journal);
  return { path, journal };
}

/** Repair malformed legacy pages with durable backups and crash-resumable checkpoints. */
export function repairLegacyKnowledgeDocuments(
  paths: VaultPaths,
  now = new Date(),
  afterCheckpoint?: (path: string) => void,
): LegacyRepairResult {
  const state = inspectVaultFormat(paths);
  const discovery = discoverKnowledgeDocuments(paths);
  if (state.knowledgeFormat !== "legacy") {
    return { repaired: 0, entries: [], diagnostics: discovery.diagnostics };
  }

  const lock = acquireLock(paths);
  try {
    const existing = inProgressJournal(paths);
    if (existing) {
      return applyJournal(
        paths,
        existing,
        readJournal(existing, paths),
        discovery.diagnostics,
        afterCheckpoint,
      );
    }
    const created = createJournal(paths, discovery.diagnostics, lock.operationId, now);
    if (!created) return { repaired: 0, entries: [], diagnostics: discovery.diagnostics };
    return applyJournal(
      paths,
      created.path,
      created.journal,
      discovery.diagnostics,
      afterCheckpoint,
    );
  } finally {
    releaseLock(lock);
  }
}
