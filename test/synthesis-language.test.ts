import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { loadTaskConfig } from "../extensions/llm-wiki/lib/task-config.js";

describe("synthesisLanguage config", () => {
  const testDirs: string[] = [];

  function createTestDir(settings: Record<string, unknown>): string {
    const dir = join(
      tmpdir(),
      `llm-wiki-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    const settingsPath = join(dir, ".pi", "settings.json");
    mkdirSync(join(dir, ".pi"), { recursive: true });
    writeFileSync(settingsPath, JSON.stringify(settings), "utf-8");
    testDirs.push(dir);
    return dir;
  }

  it("parses synthesisLanguage from project settings", () => {
    const dir = createTestDir({ "llm-wiki": { synthesisLanguage: "ru" } });
    const config = loadTaskConfig(dir);
    expect(config.synthesisLanguage).toBe("ru");
  });

  it("trims whitespace from synthesisLanguage", () => {
    const dir = createTestDir({ "llm-wiki": { synthesisLanguage: "  fr  " } });
    const config = loadTaskConfig(dir);
    expect(config.synthesisLanguage).toBe("fr");
  });

  it("ignores empty synthesisLanguage", () => {
    const dir = createTestDir({ "llm-wiki": { synthesisLanguage: "" } });
    const config = loadTaskConfig(dir);
    expect(config.synthesisLanguage).toBeUndefined();
  });

  it("ignores non-string synthesisLanguage", () => {
    const dir = createTestDir({ "llm-wiki": { synthesisLanguage: 123 } });
    const config = loadTaskConfig(dir);
    expect(config.synthesisLanguage).toBeUndefined();
  });

  it("coexists with other llm-wiki settings", () => {
    const dir = createTestDir({
      "llm-wiki": {
        synthesisLanguage: "de",
        trajectories: true,
        notices: false,
      },
    });
    const config = loadTaskConfig(dir);
    expect(config.synthesisLanguage).toBe("de");
    expect(config.trajectories).toBe(true);
    expect(config.notices).toBe(false);
  });

  it("defaults to undefined when not set", () => {
    const dir = createTestDir({});
    const config = loadTaskConfig(dir);
    expect(config.synthesisLanguage).toBeUndefined();
  });

  // Cleanup after all tests
  afterAll(() => {
    for (const dir of testDirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });
});
