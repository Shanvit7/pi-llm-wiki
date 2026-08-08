import { InstallCommand } from "@/components/install-command";
import Graph from "@/components/graph";

/* ── links & data ────────────────────────────────────────────────────────── */

const NPM = "https://www.npmjs.com/package/@zosmaai/pi-llm-wiki";
const GITHUB = "https://github.com/zosmaai/pi-llm-wiki";

const flow = [
  ["SOURCE", "urls · pdfs · notes · json"],
  ["CAPTURE", "immutable packets"],
  ["INGEST", "distill to pages"],
  ["WIKI", "linked · searchable"],
  ["RECALL", "cited answers"],
] as const;

const sheet = [
  ["Input", "URLs, PDFs, markdown, JSON, XML"],
  ["Storage", "Plain markdown vault · Obsidian-compatible"],
  ["Format", "Open Knowledge Format v0.2 · dual-read legacy"],
  ["Index", "Generated registry · full-text search"],
  ["Interface", "pi session · MCP — Claude Code, Cursor, Windsurf"],
  ["Maintenance", "lint · watch · digest — scheduled via crontab"],
  ["Guardrails", "Raw sources and metadata locked"],
] as const;

const GithubIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
);

/* ── page ───────────────────────────────────────────────────────────────── */

const Home = () => (
  <main className="min-h-svh bg-paper text-ink">
    <div className="mx-auto max-w-5xl px-6 sm:px-10">

      {/* masthead */}
      <header className="border-t-2 border-ink">
        <div className="border-y-2 border-ink">
          <div className="flex items-baseline justify-between gap-4 py-3">
            <span className="font-display text-xl font-bold tracking-tight sm:text-2xl">
              PI-LLM-WIKI
            </span>
            <span className="hidden font-display text-[11px] tracking-[0.22em] text-mist-ink uppercase md:block">
              The self-maintaining archive
            </span>
            <span className="font-display text-[11px] tracking-[0.22em] text-mist-ink uppercase">
              Rev 0.6.3 · MIT
            </span>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="rise grid gap-10 border-b-2 border-ink py-14 lg:grid-cols-[1fr_400px]">
        <div className="flex flex-col justify-center">
          <h1 className="font-display text-[clamp(2.8rem,6.5vw,5.5rem)] leading-[0.92] font-black tracking-tight">
            A wiki that
            <br />
            <span className="text-primary">maintains</span>
            <br />
            <span className="text-primary">itself.</span>
          </h1>
          <p className="mt-6 max-w-md text-[17px] leading-[1.6] text-mist-ink">
            Turn raw sources — URLs, PDFs, notes, JSON — into a durable,
            interlinked knowledge base that compounds over time. The agent
            captures, synthesizes, links, and lints. You just talk.
          </p>
          <div className="mt-8">
            <InstallCommand />
          </div>
        </div>
        <div className="flex items-center justify-center border-2 border-ink p-5">
          <Graph />
        </div>
      </section>

      {/* sub-nav */}
      <div className="flex flex-wrap gap-x-10 gap-y-1 border-b-2 border-ink py-3 font-display text-[10px] tracking-[0.22em] text-mist-ink uppercase">
        <span>01 · how it works</span>
        <span>02 · data sheet</span>
        <span>03 · the archive</span>
        <span>04 · built by zosma ai</span>
      </div>

      {/* 01 · how it works */}
      <section className="border-b-2 border-ink py-16">
        <h2 className="font-display text-2xl font-bold tracking-tight">01 · How it works</h2>
        <div className="mt-8 grid border-2 border-ink sm:grid-cols-5">
          {flow.map(([stage, cap], i) => (
            <div
              key={stage}
              className={`flex flex-col justify-center gap-1 p-4 sm:p-5 ${
                i < flow.length - 1
                  ? "border-b-2 border-ink sm:border-b-0 sm:border-r-2"
                  : ""
              }`}
            >
              <span className="font-display text-sm font-bold tracking-wide">{stage}</span>
              <span className="font-display text-[10px] tracking-wide text-mist-ink uppercase">
                {cap}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 02 · data sheet */}
      <section className="border-b-2 border-ink py-16">
        <h2 className="font-display text-2xl font-bold tracking-tight">02 · Data sheet</h2>
        <div className="mt-8 divide-y-2 divide-ink border-2 border-ink">
          {sheet.map(([param, value]) => (
            <div
              key={param}
              className="grid gap-2 px-5 py-4 sm:grid-cols-[180px_1fr] sm:gap-8"
            >
              <span className="font-display text-[13px] font-bold tracking-wide uppercase">
                {param}
              </span>
              <span className="text-[15px] leading-relaxed">{value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 03 · the archive */}
      <section className="border-b-2 border-ink py-16">
        <h2 className="font-display text-2xl font-bold tracking-tight">03 · The Archive</h2>
        <div className="mt-8 grid border-2 border-ink md:grid-cols-2">
          <p className="border-b-2 border-ink p-6 text-[15px] leading-[1.7] text-mist-ink md:border-b-0 md:border-r-2">
            Most file-based AI workflows behave like one-shot RAG — the model
            searches raw documents on every question, and synthesis is
            ephemeral. pi-llm-wiki adds a middle layer: raw source packets
            preserve what you captured, source pages summarize each source,
            canonical pages track what the wiki believes, and generated
            metadata keeps everything searchable.
          </p>
          <p className="p-6 text-[15px] leading-[1.7] text-mist-ink">
            The result is a wiki that compounds — every capture makes the next
            answer better, every query leaves the archive more connected.
            Obsidian opens it like any vault. MCP clients query it from any
            editor. Nothing is hand-maintained: the registry is generated, the
            lint is mechanical, the watch is a crontab line.
          </p>
        </div>
      </section>

      {/* 04 · built by zosma ai */}
      <footer className="flex flex-col gap-5 py-12 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-lg font-bold tracking-tight">
          Built and Maintained by{" "}
          <a
            href="https://www.zosma.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline decoration-2 underline-offset-4 transition-opacity hover:opacity-50"
          >
            zosma ai
          </a>
        </p>
        <nav className="flex flex-wrap gap-6 font-display text-[12px] font-semibold tracking-wide">
          <a
            href={GITHUB}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-50"
          >
            <GithubIcon />
            GitHub
          </a>
          <a
            href={NPM}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-50"
          >
            npm
          </a>
          <a
            href={`${GITHUB}#readme`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-50"
          >
            docs
          </a>
        </nav>
      </footer>
    </div>
  </main>
);

export default Home;
