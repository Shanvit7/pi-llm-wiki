import type { Metadata } from "next";
import { Chakra_Petch, DM_Sans } from "next/font/google";
import "./globals.css";

const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-chakra-petch",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://zosmaai.github.io/pi-llm-wiki/"),
  title: "pi-llm-wiki — a wiki that maintains itself, for pi",
  description:
    "Turn raw sources (URLs, PDFs, markdown, JSON, XML) into a durable, interlinked, AI-maintained wiki that compounds over time. Obsidian-compatible, OKF v0.2 native, built on pi.",
  keywords: [
    "pi",
    "llm-wiki",
    "karpathy",
    "wiki",
    "knowledge base",
    "obsidian",
    "second brain",
    "pkm",
    "markdown",
    "rag",
    "ai",
    "zosmaai",
  ],
  openGraph: {
    title: "pi-llm-wiki — a wiki that maintains itself, for pi",
    description:
      "Turn raw sources into a durable, interlinked, AI-maintained wiki that compounds over time.",
    type: "website",
    url: "https://zosmaai.github.io/pi-llm-wiki/",
  },
};

const RootLayout = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => (
  <html lang="en" className={`${chakraPetch.variable} ${dmSans.variable}`}>
    <body className="min-h-screen bg-paper font-sans text-ink antialiased">
      {children}
    </body>
  </html>
);

export default RootLayout;
