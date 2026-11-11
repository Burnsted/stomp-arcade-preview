#!/usr/bin/env node
/** Bundle Terrain Park v0.5.1-next into a single self-contained index.html (no CDN). */
import * as esbuild from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const result = await esbuild.build({
  entryPoints: [join(root, "src/main.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  platform: "browser",
  target: ["es2019"],
  jsx: "automatic",
  write: false,
  outfile: "bundle.js",
  logLevel: "info",
});

const js = result.outputFiles[0];
if (!js) throw new Error("esbuild produced no JS");

const cssText = readFileSync(join(root, "src/styles.css"), "utf8");
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<meta name="theme-color" content="#140828">
<meta name="description" content="Hits, rails, logs, flat tops, and kickers. Stars come from tricks.">
<title>Terrain Park</title>
<link rel="icon" type="image/svg+xml" href="./favicon.svg">
<style>
${cssText}
</style>
</head>
<body>
<div id="root"></div>
<script>
${js.text}
</script>
</body>
</html>
`;

mkdirSync(root, { recursive: true });
writeFileSync(join(root, "index.html"), html);
console.log("Wrote", join(root, "index.html"), `(${(html.length / 1024).toFixed(1)} KiB)`);
