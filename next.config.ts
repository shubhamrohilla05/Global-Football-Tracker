import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // A stray package-lock.json exists in the home directory; pin Turbopack's
  // workspace root to this project so it isn't picked up by mistake.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
