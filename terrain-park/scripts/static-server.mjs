#!/usr/bin/env node
import http from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(join(fileURLToPath(new URL(".", import.meta.url)), ".."));
const port = Number(process.argv[2] || process.env.TP_PORT || 8788);
const repoRoot = resolve(join(root, "../.."));

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json",
  ".webp": "image/webp",
};

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith("/")) path += "index.html";
    // Serve from repo root so /arcade/terrain-park-next/... works like GitHub Pages.
    const base = path.startsWith("/arcade/") ? repoRoot : root;
    const rel = path.startsWith("/arcade/") ? path.slice(1) : path.replace(/^\//, "");
    const file = resolve(base, rel);
    if (!file.startsWith(base) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    const body = readFileSync(file);
    res.writeHead(200, {
      "content-type": TYPES[extname(file)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end(String(err));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`terrain-park-next static server on http://127.0.0.1:${port}/arcade/terrain-park-next/`);
});
