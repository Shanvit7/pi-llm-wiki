# Code Review Context

## Project

`@zosmaai/pi-llm-wiki` — A pi extension implementing the LLM Wiki pattern as a self-maintaining knowledge base.

## Tech Stack

- TypeScript (ES2022, ESM)
- Vitest for testing
- Biome for linting/formatting
- GitHub Actions for CI

## Key Conventions

- Use `node:fs/promises` for async file I/O
- Prefer small, pure functions in `lib/`
- Extension tools must have: name, label, description, promptSnippet, promptGuidelines, parameters (TypeBox), execute
- Guardrails block `.llm-wiki/raw/**` and `.llm-wiki/meta/**` edits
- Metadata auto-rebuilds on `turn_end` after `.llm-wiki/wiki/**` edits
- Source IDs: `SRC-YYYY-MM-DD-NNN`
- Page filenames: `kebab-case.md`
- Wikilinks: folder-qualified, e.g. `[[concepts/retrieval-augmented-generation]]`

## Architecture

- `extensions/llm-wiki/index.ts` — entry point, registers all tools
- `extensions/llm-wiki/lib/tools.ts` — tool definitions (wiki_ingest, wiki_capture_source, etc.)
- `extensions/llm-wiki/lib/ingest-worker.ts` — background ingest synthesis
- `extensions/llm-wiki/lib/subagent.ts` — sub-agent runner for background tasks
- `extensions/llm-wiki/lib/task-config.ts` — config loading from `.pi/settings.json`
- `extensions/llm-wiki/lib/runtime.ts` — background task runtime (launchTask, resolveModel)
- `extensions/llm-wiki/lib/knowledge-document.ts` — knowledge document format (frontmatter + body)
- `extensions/llm-wiki/lib/metadata.ts` — registry, backlinks, events
- `test/` — Vitest tests
