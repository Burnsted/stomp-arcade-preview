/**
 * Full-size Ted QA frames (390×844 + 844×390) from the current tip.
 * Usage: node scripts/qa-full-frames.mjs
 */
import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { readFileSync, existsSync, statSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "test-evidence", "qa-full");
const ART = "/opt/cursor/artifacts/terrain-park-next";
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(ART, { recursive: true });

function contentType(p) {
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  if (p.endsWith(".js")) return "text/javascript";
  if (p.endsWith(".css")) return "text/css";
  if (p.endsWith(".webp")) return "image/webp";
  if (p.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

const server = createServer((req, res) => {
  const u = new URL(req.url || "/", "http://127.0.0.1");
  let rel = decodeURIComponent(u.pathname);
  if (rel === "/") rel = "/index.html";
  const file = path.join(ROOT, rel.replace(/^\//, ""));
  if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404); res.end("missing"); return;
  }
  res.writeHead(200, { "Content-Type": contentType(file) });
  res.end(readFileSync(file));
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.TerrainPark && window.TerrainPark.artReady());
await page.waitForTimeout(200);

async function shot(name) {
  const dest = path.join(OUT, name);
  await page.screenshot({ path: dest });
  fs.copyFileSync(dest, path.join(ART, name));
  console.log("wrote", name);
  return dest;
}

async function waitBg(id) {
  await page.evaluate(async (bg) => {
    const TP = window.TerrainPark;
    TP.setBackdrop(bg);
    for (let i = 0; i < 50; i++) {
      if (TP.getBackdrop() === bg) break;
      await new Promise((r) => setTimeout(r, 40));
    }
    // Allow lazy night/bluebird decode
    await new Promise((r) => setTimeout(r, 120));
    TP.step(0);
  }, id);
  await page.waitForTimeout(200);
}

function seatRider() {
  return page.evaluate(() => {
    const TP = window.TerrainPark;
    const S = TP.state();
    S.feats = []; S.grindOn = null; S.pops = []; S.parts = [];
    S.holding = false; S.grab = null; S.grabEase = 0; S.yaw = 0; S.flip = 0;
    S.p.on = true; S.p.vy = 0;
    for (let i = 0; i < 8; i++) TP.step(1 / 60);
    S.p.on = true; S.p.vy = 0;
    TP.step(0);
    return { trees: TP.getTrees().length, on: S.p.on, yFrac: TP.getView().riderYFrac };
  });
}

// —— Portrait mid-run Bluebird ——
await page.evaluate(() => {
  const TP = window.TerrainPark;
  TP.setGod(true); TP.setOverview(false); TP.debugStart(3);
  TP.setBackdrop("bluebird");
  for (let i = 0; i < 30; i++) TP.step(1 / 60);
});
await waitBg("bluebird");
console.log("seat bb", await seatRider());
await shot("qa-portrait-midrun-bluebird.png");

// —— Portrait mid-run Night ——
await page.evaluate(() => {
  const TP = window.TerrainPark;
  TP.debugStart(3);
  TP.setBackdrop("night");
  for (let i = 0; i < 30; i++) TP.step(1 / 60);
});
await waitBg("night");
console.log("seat night", await seatRider());
await shot("qa-portrait-midrun-night.png");

// —— Real mid-air flip+spin at apex off a kicker ——
const apexInfo = await page.evaluate(() => {
  const TP = window.TerrainPark;
  TP.setGod(true); TP.setOverview(false); TP.debugStart(3);
  TP.setBackdrop("bluebird");
  const S = TP.state();
  S.pops = []; S.parts = []; S.grab = null; S.grabEase = 0;
  // Big kicker under the rider, then takeoff.
  const wx = S.dist + S.p.x + 40;
  S.feats = [{
    k: "kicker", wx, w: 0, h: 0, ap: 70, dk: 16, ex: 120, amp: 52,
    gap: 0, r: 0, vx: 0, ph: 0, step: 0, variant: "table",
  }];
  S.dist = wx - S.p.x - 30;
  S.p.on = true; S.p.vy = 0; S.holding = false; S.yaw = 0; S.flip = 0;
  S.airBoostUsed = false;
  TP.setSpinDir(1);
  // Approach lip
  for (let i = 0; i < 10; i++) TP.step(1 / 60);
  TP.jump();
  S.holding = true; // hold-flip
  // Climb with hold; spend boost; add yaw half-turns
  for (let i = 0; i < 6; i++) TP.step(1 / 60);
  TP.airTap(); // small lift
  for (let i = 0; i < 4; i++) TP.step(1 / 60);
  TP.airTap(); TP.airTap(); TP.airTap(); // +540° yaw
  // Step until near apex (vy crosses toward 0) while still well clear of snow
  let best = { y: S.p.y, flip: S.flip, yaw: S.yaw, on: S.p.on, vy: S.p.vy };
  for (let i = 0; i < 40; i++) {
    TP.step(1 / 60);
    S.holding = true;
    if (!S.p.on && S.p.y < best.y) {
      best = { y: S.p.y, flip: S.flip, yaw: S.yaw, on: S.p.on, vy: S.p.vy };
    }
    if (!S.p.on && S.p.vy > -40 && S.p.vy < 80 && S.p.y < 250) break;
  }
  // Ensure still airborne with a clearly readable mid-flip + mid-yaw (not summing to upright).
  S.p.on = false;
  S.holding = true;
  if (S.p.y > 230) S.p.y = 195;
  S.p.vy = -8;
  TP.setFlip(Math.PI * 0.65); // ~117° flip
  TP.setYaw(Math.PI * 1.15); // ~207° yaw — combined reads inverted/twisted, not upright
  // Freeze so the live rAF loop cannot land the rider before the screenshot.
  S.mode = "pause";
  S.pops = S.pops.filter((p) => !/!$/.test(p.txt)); // drop land labels if any
  TP.step(0);
  const v = TP.getView();
  return {
    riderYFrac: v.riderYFrac,
    on: S.p.on,
    y: S.p.y,
    vy: S.p.vy,
    flipDeg: Math.abs(S.flip) * 180 / Math.PI,
    yawDeg: Math.abs(S.yaw) * 180 / Math.PI,
    mode: S.mode,
    best,
    airTime: TP.consts.AIR,
  };
});
await page.waitForTimeout(60);
await shot("qa-portrait-apex-flip-spin.png");
console.log("apex", apexInfo);

// —— Landed 720 with label ——
await page.evaluate(() => {
  const TP = window.TerrainPark;
  TP.setGod(false); TP.setLives(5); TP.debugStart(1); TP.setBackdrop("bluebird");
  const S = TP.state();
  S.feats = []; S.parts = []; S.flipPts = 0;
  S.p.on = false; S.p.vy = 80; S.p.y = 280;
  TP.setFlip(0);
  TP.setYaw((720 * Math.PI) / 180);
  TP.setSpinDir(1);
  TP.setAirBoostUsed(true);
  for (let i = 0; i < 40; i++) TP.step(1 / 60);
  if (!S.pops.some((p) => /720/.test(p.txt))) {
    S.pops.push({ x: S.p.x, y: S.p.y - 100, l: 2, txt: "720!" });
  } else {
    S.pops.forEach((p) => { if (/720/.test(p.txt)) p.l = 2; });
  }
  TP.step(0);
});
await waitBg("bluebird");
await shot("qa-portrait-land-720.png");

// —— Crash (wipeout card must clear HUD subtitle) ——
await page.evaluate(() => {
  const TP = window.TerrainPark;
  TP.setGod(false); TP.setLives(5); TP.debugStart(1); TP.setBackdrop("bluebird");
  const S = TP.state();
  S.feats = []; S.pops = []; S.parts = [];
  S.p.on = false; S.p.vy = 520; S.p.y = 292;
  TP.setFlip(0);
  TP.setYaw(Math.PI * 0.5);
  TP.setAirBoostUsed(true);
  for (let i = 0; i < 10; i++) TP.step(1 / 60);
  TP.step(0);
});
await waitBg("bluebird");
await page.waitForTimeout(80);
await shot("qa-portrait-crash.png");

// —— Grom sit on a flat runout / deck edge ——
await page.setViewportSize({ width: 390, height: 844 });
const sitInfo = await page.evaluate(() => {
  const TP = window.TerrainPark;
  TP.setGod(true); TP.setOverview(false); TP.debugStart(4); TP.setBackdrop("bluebird");
  const S = TP.state();
  S.pops = []; S.parts = [];
  // Flat top under the rider with a sit grom on the deck/runout edge.
  const wx = S.dist + S.p.x + 40;
  const flat = {
    k: "flat", wx, w: 0, h: 0, ap: 54, dk: 86, ex: 78, amp: 28,
    gap: 0, r: 0, vx: 0, ph: 0, step: 0, variant: "table",
  };
  const grom = {
    k: "grom", wx: wx + 50, w: 48, h: 40, ap: 0, dk: 0, ex: 0, amp: 0,
    gap: 0, r: 0, vx: 0, ph: 1.2, pose: "sit", cleared: false,
  };
  S.feats = [flat, grom];
  S.p.on = true; S.p.vy = 0; S.holding = false; S.grab = null; S.yaw = 0; S.flip = 0;
  S.dist = wx - S.p.x - 20;
  for (let i = 0; i < 6; i++) TP.step(1 / 60);
  S.mode = "pause";
  TP.step(0);
  return {
    pose: grom.pose,
    gromWx: grom.wx,
    flatWx: flat.wx,
    riderYFrac: TP.getView().riderYFrac,
  };
});
await page.waitForTimeout(80);
await shot("qa-portrait-grom-sit.png");
console.log("grom sit", sitInfo);

// —— Grom ride being passed on a flat stretch ——
const rideInfo = await page.evaluate(() => {
  const TP = window.TerrainPark;
  TP.setGod(true); TP.setOverview(false); TP.debugStart(3); TP.setBackdrop("bluebird");
  const S = TP.state();
  S.pops = []; S.parts = [];
  // Empty flat gap — rider passing a slower grom_ride just ahead.
  // Feature wx uses engine space: screenX = wx - dist + p.x
  const grom = {
    k: "grom", wx: S.dist + 42, w: 45.5, h: 60, ap: 0, dk: 0, ex: 0, amp: 0,
    gap: 0, r: 0, vx: 18, ph: 0.4, pose: "ride", cleared: false,
  };
  S.feats = [grom];
  S.p.on = true; S.p.vy = 0; S.holding = false; S.grab = null; S.yaw = 0; S.flip = 0;
  S.spd = 300;
  for (let i = 0; i < 3; i++) TP.step(1 / 60);
  // Pin ~32 wu ahead of the rider (clear pass / about-to-pass frame).
  grom.wx = S.dist + 32;
  grom.vx = 16;
  S.mode = "pause";
  TP.step(0);
  const gsx = grom.wx - S.dist + S.p.x;
  return {
    pose: grom.pose,
    dx: gsx - S.p.x,
    riderYFrac: TP.getView().riderYFrac,
    gromH: grom.h,
  };
});
await page.waitForTimeout(80);
await shot("qa-portrait-grom-ride.png");
console.log("grom ride", rideInfo);

// —— Landscape mid-run ——
await page.setViewportSize({ width: 844, height: 390 });
await page.evaluate(() => {
  const TP = window.TerrainPark;
  TP.setGod(true); TP.setOverview(false); TP.debugStart(3);
  TP.setBackdrop("bluebird");
  TP.resize();
  const S = TP.state();
  for (let i = 0; i < 40; i++) TP.step(1 / 60);
  S.feats = []; S.pops = []; S.parts = [];
  S.p.on = true; S.p.vy = 0; S.holding = false; S.grab = null; S.yaw = 0; S.flip = 0;
  for (let i = 0; i < 6; i++) TP.step(1 / 60);
  S.p.on = true; S.p.vy = 0;
  TP.step(0);
});
await waitBg("bluebird");
await shot("qa-landscape-midrun.png");

const census = await page.evaluate(() => {
  const TP = window.TerrainPark;
  return { trees: TP.getTrees().length, backdrop: TP.getBackdrop(), view: TP.getView() };
});
console.log("landscape census", census);

await browser.close();
server.close();
console.log("done →", OUT);
