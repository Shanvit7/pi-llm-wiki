const basePath = process.env.GH_PAGES === "true" ? "/pi-llm-wiki" : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath,
  reactStrictMode: true,
};

export default nextConfig;
