"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

const CMD = "pi install npm:@zosmaai/pi-llm-wiki";

export const InstallCommand = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="inline-flex items-stretch border-2 border-ink bg-paper">
      <code className="flex items-center whitespace-nowrap px-5 py-3.5 font-display text-sm font-semibold tracking-wide text-ink">
        {CMD}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : "Copy install command"}
        className="cursor-pointer flex shrink-0 items-center gap-1.5 border-l-2 border-ink bg-ink px-5 font-display text-[11px] font-bold tracking-[0.16em] text-paper uppercase transition-colors hover:bg-primary"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
      </button>
    </div>
  );
};
