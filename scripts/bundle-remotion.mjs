#!/usr/bin/env node

/**
 * Pre-bundle the Remotion project during build time
 * This creates a static bundle that can be used by the render API
 */

import { bundle } from "@remotion/bundler";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log("📦 Bundling Remotion project...");

  const bundleLocation = await bundle({
    entryPoint: join(process.cwd(), "remotion/index.ts"),
    webpackOverride: (config) => config,
  });

  console.log("✅ Bundle created at:", bundleLocation);

  // Save the bundle location for the API route to use
  const outputDir = join(process.cwd(), ".remotion");
  mkdirSync(outputDir, { recursive: true });

  writeFileSync(
    join(outputDir, "bundle-location.json"),
    JSON.stringify({ bundleLocation }, null, 2)
  );

  console.log("✅ Bundle location saved to .remotion/bundle-location.json");
}

main().catch((err) => {
  console.error("❌ Error bundling Remotion:", err);
  process.exit(1);
});
