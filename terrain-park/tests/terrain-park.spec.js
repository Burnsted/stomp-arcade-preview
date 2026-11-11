// @ts-check
const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const ART = "/opt/cursor/artifacts/terrain-park-next";
fs.mkdirSync(ART, { recursive: true });
fs.mkdirSync(path.join(__dirname, "../test-evidence"), { recursive: true });

/** @param {import('@playwright/test').Page} page */
async function waitGame(page) {
  await page.waitForFunction(() => window.TerrainPark && window.TerrainPark.getSnap);
  // Franz atlases load async — wait briefly so sprites (not only vector fallback) paint.
  await page.waitForFunction(() => window.TerrainPark.artReady && window.TerrainPark.artReady(), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(80);
}

/** @param {import('@playwright/test').Page} page */
async function consoleErrors(page) {
  /** @type {string[]} */
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errs.push(msg.text());
  });
  return errs;
}

test.describe("Terrain Park v0.5.1-next", () => {
  test("loads, menus, legend, mute, saves, fail-tests", async ({ page }, testInfo) => {
    const errs = await consoleErrors(page);
    await page.goto("./index.html");
    await waitGame(page);

    const version = await page.evaluate(() => window.TerrainPark.version);
    expect(version).toBe("0.5.1-next");

    // Boot into play with jump available
    await expect(page.locator("button.jump.air")).toBeVisible();

    // Open menu — version string visible
    await page.locator('button[aria-label="Park menu"]').click();
    await expect(page.locator('.sheet.menu .foot')).toContainText("v0.5.1-next");
    await expect(page.getByRole("button", { name: "How tricks work" })).toBeVisible();

    // Board locker visible
    await expect(page.locator(".sheet.menu h2", { hasText: "Board" })).toBeVisible();
    await expect(page.getByText("Grom Deck").first()).toBeVisible();

    if (testInfo.project.name === "phone") {
      await page.screenshot({ path: path.join(ART, "phone-menu.png"), fullPage: true });
    }

    // Legend from menu → back to menu
    await page.getByRole("button", { name: "How tricks work" }).click();
    await expect(page.getByRole("dialog", { name: "How to play" })).toBeVisible();
    await expect(page.locator(".sheet .foot")).toContainText("v0.5.1-next");
    if (testInfo.project.name === "phone") {
      await page.screenshot({ path: path.join(ART, "phone-legend.png"), fullPage: true });
    }
    await page.getByRole("button", { name: "PLAY" }).click();
    await expect(page.getByRole("dialog", { name: "Terrain Park" })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "How to play" })).toHaveCount(0);

    await page.getByRole("button", { name: "CLOSE" }).click();
    // Returned from menu opened during play → pause
    await expect(page.getByRole("dialog", { name: "Paused" })).toBeVisible();

    // Legend from pause path: menu → legend → dismiss → menu → close → pause
    await page.locator('button[aria-label="Park menu"]').click();
    await page.getByRole("button", { name: "How tricks work" }).click();
    await expect(page.getByRole("dialog", { name: "How to play" })).toBeVisible();
    await page.locator('button[aria-label="Park menu"]').click(); // dismiss legend via chrome
    await expect(page.getByRole("dialog", { name: "Terrain Park" })).toBeVisible();
    await page.getByRole("button", { name: "CLOSE" }).click();
    await expect(page.getByRole("dialog", { name: "Paused" })).toBeVisible();
    await page.getByRole("button", { name: "RESUME" }).click();
    await expect.poll(async () => page.evaluate(() => window.TerrainPark.getSnap().mode)).toBe("play");
    await expect(page.locator("button.jump.air")).toBeVisible();

    // Mute persists across reload
    await page.locator('button[aria-label="Mute"]').click();
    await expect.poll(async () => page.evaluate(() => window.TerrainPark.getSnap().muted)).toBe(true);
    await page.reload();
    await waitGame(page);
    expect(await page.evaluate(() => window.TerrainPark.getSnap().muted)).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem("terrainPark.mute"))).toBe("1");

    // Saves only under terrainPark.*
    const keys = await page.evaluate(() => Object.keys(localStorage));
    expect(keys.every((k) => k.startsWith("terrainPark."))).toBeTruthy();
    expect(keys.some((k) => k.startsWith("tpRelease."))).toBeFalsy();

    // Keyboard R sets playAt (160ms guard). dispatchEvent is sync — no setTimeout
    // (timer slack under load can exceed 160ms and false-fail the guard).
    const guard = await page.evaluate(() => {
      const TP = window.TerrainPark;
      TP.debugStart(1);
      const before = TP.state().playAt;
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "R", bubbles: true }));
      const after = TP.state().playAt;
      const mode = TP.getSnap().mode;
      // Immediate press must be ignored within the arm window.
      TP.press();
      const hopped = !TP.state().p.on || TP.state().p.vy < -1;
      return { before, after, mode, hoppedImmediately: hopped, playAtFresh: after > before - 1 };
    });
    expect(guard.mode).toBe("play");
    expect(guard.after).toBeGreaterThan(0);
    expect(guard.hoppedImmediately).toBe(false);

    // debugStart also sets playAt
    const dbg = await page.evaluate(() => {
      const TP = window.TerrainPark;
      const t0 = performance.now();
      TP.debugStart(5);
      return { playAt: TP.state().playAt, now: performance.now(), mode: TP.getSnap().mode, level: TP.getSnap().levelN };
    });
    expect(dbg.mode).toBe("play");
    expect(dbg.level).toBe(5);
    expect(dbg.playAt).toBeGreaterThan(dbg.now - 500);

    // Park visuals: kicker approach, mid-air, rail grind + zoomed-out line overview
    if (testInfo.project.name === "phone") {
      await page.evaluate(() => {
        const TP = window.TerrainPark;
        TP.setGod(true);
        TP.setOverview(false);
        TP.debugStart(5);
        const S = TP.state();
        for (let i = 0; i < 220; i++) TP.step(1 / 60);
        let kick = S.feats.find((f) => f.k === "kicker");
        if (!kick) {
          S.feats.push({ k: "kicker", wx: S.dist + S.p.x + 220, w: 0, h: 0, ap: 72, dk: 16, ex: 118, amp: 67.5, gap: 0, r: 0, vx: 0, ph: 0, step: 0, variant: "table" });
          kick = S.feats[S.feats.length - 1];
        }
        S.dist = kick.wx - S.p.x - 150;
        S.p.on = true; S.p.vy = 0;
        TP.step(1 / 60);
      });
      await page.waitForTimeout(60);
      await page.screenshot({ path: path.join(ART, "phone-kicker-approach.png") });

      // Kicker must have a real landing slope (not a vertical back).
      const kickProf = await page.evaluate(() => window.TerrainPark.getKickerProfile());
      expect(kickProf).toBeTruthy();
      expect(kickProf.ex).toBeGreaterThanOrEqual(70);
      expect(kickProf.landingDrop).toBeGreaterThan(12);
      expect(kickProf.landingSlope).toBeGreaterThan(0.08);
      // featH eases from lip (most negative) toward 0 across the landing
      expect(kickProf.samples[5].h).toBeGreaterThan(kickProf.samples[0].h);
      expect(kickProf.samples[10].h).toBeGreaterThan(kickProf.samples[5].h);

      await page.evaluate(() => {
        const TP = window.TerrainPark;
        const S = TP.state();
        const kick = S.feats.find((f) => f.k === "kicker");
        if (kick) S.dist = kick.wx - S.p.x + 8;
        S.p.on = false; S.p.vy = -420; S.p.y = 210; S.holding = true; S.flip = 1.15;
        TP.step(1 / 60);
      });
      await page.waitForTimeout(40);
      await page.screenshot({ path: path.join(ART, "phone-midair.png") });

      // Full-line overview: landscape 1600×600 frame of one pack with debug labels.
      const overviewRaw = path.join(ART, "overview-raw.png");
      await page.setViewportSize({ width: 1600, height: 600 });
      await page.evaluate(() => {
        const TP = window.TerrainPark;
        TP.setOverview(true);
        TP.debugStart(5);
        const S = TP.state();
        // Start further down the fall line so the pack clearly steps downhill left→right.
        const base = S.dist + S.p.x + 520;
        const gap = 175;
        /** @type {any[]} */
        const pack = [
          { k: "hit", ap: 44, dk: 10, ex: 52, amp: 22 },
          { k: "box", w: 140, h: 14 },
          { k: "rail", w: 220, h: 42.5, down: 6 },
          { k: "hit", ap: 40, dk: 10, ex: 48, amp: 24 },
          { k: "kicker", ap: 58, dk: 14, ex: 96, amp: 38, variant: "table" },
          { k: "kicker", ap: 70, dk: 16, ex: 112, amp: 50, variant: "table" },
          { k: "kicker", ap: 78, dk: 18, ex: 124, amp: 62, variant: "step", step: 12 },
          { k: "rail", w: 180, h: 42.5, down: 4 },
        ];
        S.feats = pack.map((sp, i) => ({
          w: 0, h: 0, ap: 0, dk: 0, ex: 0, amp: 0, gap: 0, r: 0, vx: 0, ph: 0, step: 0,
          ...sp,
          wx: base + i * gap,
        }));
        S.dist = base - S.p.x + 40;
        S.p.on = true; S.p.vy = 0; S.grindOn = null; S.pops = [];
        // Seat rider on the descending snow under them.
        S.p.y = 300;
        TP.step(1 / 60);
      });
      await page.waitForTimeout(80);
      await page.screenshot({ path: overviewRaw });
      await page.evaluate(() => window.TerrainPark.setOverview(false));
      await page.setViewportSize({ width: 390, height: 844 });
      const { execFileSync } = require("child_process");
      execFileSync("python3", ["-c", `
from PIL import Image
raw = ${JSON.stringify(overviewRaw)}
out = ${JSON.stringify(path.join(ART, "phone-jumpline-overview.png"))}
im = Image.open(raw).convert("RGB")
im = im.resize((1600, 600), Image.Resampling.LANCZOS)
im.save(out, "PNG")
print(out, im.size)
`]);
    }

    await page.evaluate(() => {
      const TP = window.TerrainPark;
      TP.setGod(true);
      TP.setOverview(false);
      TP.debugStart(2);
      const S = TP.state();
      S.feats = [{
        k: "rail", wx: S.dist + S.p.x + 120, w: 300, h: 42.5, ap: 0, dk: 0, ex: 0, amp: 0, gap: 0, r: 0, vx: 0, ph: 0, down: 5,
      }];
      const rail = S.feats[0];
      S.dist = rail.wx - S.p.x + 40;
      S.p.on = true;
      S.p.vy = 0;
      S.grindOn = rail;
      S.pops = [];
      // Snap rider onto the rail deck for a clean grind shot (no RAIL callout on head).
      const sx = rail.wx - S.dist + S.p.x;
      S.p.y = 300 - 42.5;
      for (let i = 0; i < 3; i++) TP.step(1 / 120);
      S.grindOn = rail;
      S.pops = [];
      TP.step(0);
    });
    await page.waitForTimeout(50);
    if (testInfo.project.name === "phone") {
      await page.screenshot({ path: path.join(ART, "phone-midride-rail.png") });
    } else {
      await page.screenshot({ path: path.join(ART, "desktop-midride.png") });
    }

    // Trees upright behind features; foreground decor never overlaps features/rider
    // in screen space (bank/treetops vs features — rope/flags removed).
    const layerCheck = await page.evaluate(() => {
      const TP = window.TerrainPark;
      TP.setOverview(false);
      TP.debugStart(5);
      for (let i = 0; i < 180; i++) TP.step(1 / 60);
      TP.step(0);
      const toScreen = (b) => TP.toScreenBox(b);
      const trees = TP.getTrees();
      const feats = TP.getFeatBoxes().map(toScreen);
      const fgRaw = TP.getFgDecor();
      const fg = fgRaw.map(toScreen);
      const rider = toScreen(TP.getRiderBox());
      const hit = (a, b) =>
        a.x + a.w > b.x && a.x < b.x + b.w && a.y + a.h > b.y && a.y < b.y + b.h;
      const treeBox = (t) => toScreen({ x: t.x - t.w / 2, y: t.y, w: t.w, h: t.h });
      const treeFeat = trees.filter((t) => feats.some((f) => hit(treeBox(t), f)));
      const fgFeat = fg.filter((d) => feats.some((f) => hit(d, f)));
      const fgRider = fg.filter((d) => hit(d, rider));
      return {
        treeCount: trees.length,
        maxRot: trees.reduce((m, t) => Math.max(m, Math.abs(t.rot || 0)), 0),
        treeFeat: treeFeat.length,
        fgFeat: fgFeat.length,
        fgRider: fgRider.length,
        fgCount: fg.length,
        fenceCount: fgRaw.filter((d) => d.k === "fence").length,
      };
    });
    expect(layerCheck.maxRot).toBe(0);
    expect(layerCheck.treeFeat).toBe(0);
    expect(layerCheck.fgFeat).toBe(0);
    expect(layerCheck.fgRider).toBe(0);
    expect(layerCheck.treeCount).toBeGreaterThan(0);
    expect(layerCheck.fgCount).toBeGreaterThan(0);
    expect(layerCheck.fenceCount).toBe(0);

    // Wind drifts falling flakes (no streak ribbons); direction matches physics.
    const windCheck = await page.evaluate(() => {
      const TP = window.TerrainPark;
      TP.debugStart(6);
      TP.setWind(0.85, -1);
      for (let i = 0; i < 90; i++) TP.step(1 / 60);
      const w = TP.getWind();
      return { now: w.now, flakes: w.flakes, dir: w.dir };
    });
    expect(windCheck.dir).toBe(-1);
    expect(windCheck.now).toBeLessThan(0);
    expect(windCheck.flakes).toBeGreaterThan(20);

    // Full line → clear, NEXT advances
    await page.evaluate(() => {
      const TP = window.TerrainPark;
      TP.setGod(true);
      TP.debugStart(1);
      const S = TP.state();
      S.dist = TP.lineLength(4400) + 10;
      TP.step(1 / 60);
    });
    await expect.poll(async () => page.evaluate(() => window.TerrainPark.getSnap().mode)).toBe("clear");
    await expect(page.locator("button.nextline")).toBeVisible();
    await expect(page.locator("button.replay")).toBeVisible();
    if (testInfo.project.name === "phone") {
      await page.screenshot({ path: path.join(ART, "phone-clear.png") });
    }

    // N advances on clear
    const nextBefore = await page.evaluate(() => window.TerrainPark.getSnap().levelN);
    await page.keyboard.press("n");
    await expect.poll(async () => page.evaluate(() => window.TerrainPark.getSnap().levelN)).toBe(nextBefore + 1);
    // startLevel leaves ready — press PLAY
    const modeAfterN = await page.evaluate(() => window.TerrainPark.getSnap().mode);
    expect(modeAfterN).toBe("ready");

    // Wipeout: N does nothing; Replay works
    await page.evaluate(() => {
      const TP = window.TerrainPark;
      TP.setGod(false);
      TP.debugStart(1);
      const S = TP.state();
      S.p.on = false;
      S.p.vy = 200;
      S.p.y = 2000;
      TP.step(1 / 60);
    });
    await expect.poll(async () => page.evaluate(() => window.TerrainPark.getSnap().mode)).toBe("over");
    const overLevel = await page.evaluate(() => window.TerrainPark.getSnap().levelN);
    const overLives = await page.evaluate(() => window.TerrainPark.getSnap().lives);
    await page.keyboard.press("n");
    await page.waitForTimeout(40);
    expect(await page.evaluate(() => window.TerrainPark.getSnap().mode)).toBe("over");
    expect(await page.evaluate(() => window.TerrainPark.getSnap().levelN)).toBe(overLevel);
    expect(await page.evaluate(() => window.TerrainPark.getSnap().lives)).toBe(overLives);
    await page.locator("button.replay").click();
    await expect.poll(async () => page.evaluate(() => window.TerrainPark.getSnap().mode)).toBe("play");

    // Fail-test: storage throwing must not abort boot
    await page.addInitScript(() => {
      const boom = () => { throw new Error("quota"); };
      Storage.prototype.setItem = boom;
      Storage.prototype.getItem = boom;
      Storage.prototype.removeItem = boom;
      Storage.prototype.clear = boom;
    });
    await page.reload();
    await waitGame(page);
    expect(await page.evaluate(() => window.TerrainPark.getSnap().mode)).toBe("play");
    expect(await page.locator("canvas#c").count()).toBe(1);

    // Rapid taps should not throw
    await page.evaluate(() => {
      const TP = window.TerrainPark;
      TP.debugStart(1);
      for (let i = 0; i < 40; i++) {
        TP.press();
        TP.hold(true);
        TP.hold(false);
      }
    });
    expect(await page.evaluate(() => window.TerrainPark.getSnap().mode)).toMatch(/play|over|clear|pause/);

    // Mid-run orientation flip: rider stays framed, camera rot stays 0.
    const orient = await page.evaluate(async () => {
      const TP = window.TerrainPark;
      TP.setGod(true); TP.setOverview(false); TP.debugStart(5);
      for (let i = 0; i < 120; i++) TP.step(1 / 60);
      const before = TP.getView();
      return { before, mode: TP.getSnap().mode };
    });
    expect(orient.mode).toBe("play");
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(80);
    await page.evaluate(() => {
      window.TerrainPark.resize();
      for (let i = 0; i < 8; i++) window.TerrainPark.step(1 / 60);
    });
    const land = await page.evaluate(() => {
      const v = window.TerrainPark.getView();
      const c = window.TerrainPark.getCam();
      return { ...v, rot: c.rot };
    });
    expect(land.rot).toBe(0);
    expect(land.riderYFrac).toBeGreaterThanOrEqual(0.35);
    expect(land.riderYFrac).toBeLessThanOrEqual(0.78);
    expect(land.riderXFrac).toBeGreaterThanOrEqual(0.18);
    expect(land.riderXFrac).toBeLessThanOrEqual(0.48);
    // Landscape must keep RIDER_H_FRAC (spriteG from playfield height), not CSS-native size.
    expect(land.riderHFrac).toBeGreaterThanOrEqual(0.09);
    expect(land.riderHFrac).toBeLessThanOrEqual(0.11);
    expect(Math.abs(land.riderHFrac - land.riderHFracTarget)).toBeLessThan(0.012);
    if (testInfo.project.name === "phone") {
      await page.evaluate(() => window.TerrainPark.setBackdrop("bluebird"));
      await page.waitForTimeout(80);
      await page.screenshot({ path: path.join(ART, "phone-landscape-view.png") });
      await page.screenshot({ path: path.join(ART, "phone-landscape-bluebird.png") });
      await page.evaluate(() => window.TerrainPark.setBackdrop("night"));
      await page.waitForTimeout(100);
      await page.screenshot({ path: path.join(ART, "phone-landscape-night.png") });
      await page.evaluate(() => window.TerrainPark.setBackdrop(null));
    }
    await page.setViewportSize(
      testInfo.project.name === "phone" ? { width: 390, height: 844 } : { width: 1280, height: 800 },
    );
    await page.waitForTimeout(80);
    await page.evaluate(() => {
      window.TerrainPark.resize();
      for (let i = 0; i < 8; i++) window.TerrainPark.step(1 / 60);
    });
    const back = await page.evaluate(() => {
      const v = window.TerrainPark.getView();
      return { ...v, rot: window.TerrainPark.getCam().rot };
    });
    expect(back.rot).toBe(0);
    expect(back.riderYFrac).toBeGreaterThanOrEqual(0.45);
    expect(back.riderYFrac).toBeLessThanOrEqual(0.7);
    expect(await page.evaluate(() => window.TerrainPark.getSnap().mode)).toBeTruthy();

    // Phone fill: standing rider locked to RIDER_H_FRAC (9–11% / ~75–90 CSS px)
    if (testInfo.project.name === "phone") {
      const fill = await page.evaluate(() => {
        const TP = window.TerrainPark;
        TP.setOverview(false);
        TP.debugStart(1);
        TP.step(0);
        const v = TP.getView();
        const box = TP.toScreenBox(TP.getRiderBox());
        return { ...v, riderBoxCssH: box.h, playfieldCssH: v.cssH };
      });
      expect(fill.tallPhone).toBe(true);
      expect(fill.riderCssPx).toBeGreaterThanOrEqual(75);
      expect(fill.riderCssPx).toBeLessThanOrEqual(90);
      expect(fill.riderHFrac).toBeGreaterThanOrEqual(0.09);
      expect(fill.riderHFrac).toBeLessThanOrEqual(0.11);
      expect(Math.abs(fill.riderHFrac - fill.riderHFracTarget)).toBeLessThan(0.012);
      // Franz atlases should be ready on phone evidence runs.
      expect(await page.evaluate(() => window.TerrainPark.artReady())).toBe(true);
      expect(fill.groundYFrac).toBeGreaterThanOrEqual(0.52);
      expect(fill.groundYFrac).toBeLessThanOrEqual(0.66);
      expect(fill.riderYFrac).toBeGreaterThanOrEqual(0.45);
      expect(fill.riderYFrac).toBeLessThanOrEqual(0.7);
      expect(fill.snowFrac).toBeGreaterThanOrEqual(0.22);
      expect(fill.lookAheadWu).toBeGreaterThanOrEqual(180);
      const qa = {
        viewport: { w: 390, h: 844 },
        riderCssPx: fill.riderCssPx,
        riderBoxCssH: fill.riderBoxCssH,
        playfieldCssH: fill.playfieldCssH,
        riderHFrac: fill.riderHFrac,
        riderHFracTarget: fill.riderHFracTarget,
        ratio: fill.riderCssPx / fill.playfieldCssH,
      };
      fs.writeFileSync(path.join(ART, "rider-scale-qa.json"), JSON.stringify(qa, null, 2));
    }

    // Terrain must actually undulate — not a flat straight-line pack.
    const terrVar = await page.evaluate(() => {
      const TP = window.TerrainPark;
      TP.setGod(true);
      TP.debugStart(5);
      for (let i = 0; i < 240; i++) TP.step(1 / 60);
      return TP.getTerrainVariance(120, 40);
    });
    expect(terrVar.range).toBeGreaterThan(28);
    expect(terrVar.stdev).toBeGreaterThan(7);

    // Mean fall-line must descend in the direction of travel (screen Y rises left→right).
    const terrSlope = await page.evaluate(() => {
      const TP = window.TerrainPark;
      TP.setGod(true);
      TP.debugStart(5);
      for (let i = 0; i < 200; i++) TP.step(1 / 60);
      const slope = TP.getTerrainSlope(140, 36);
      const S = TP.state();
      const line = TP.sampleSnowLine(S.dist, S.dist + 1600, 50);
      return { ...slope, dropTerr: line.dropTerr, dropGy: line.dropGy };
    });
    expect(terrSlope.meanSlope).toBeGreaterThan(0.06);
    expect(terrSlope.drop).toBeGreaterThan(80);
    expect(terrSlope.dropTerr).toBeGreaterThan(80);
    // Ride surface (incl. features) still nets downhill across a pack-length window.
    expect(terrSlope.dropGy).toBeGreaterThan(40);

    // Scripted 3-run sample: every restored gameplay item spawns ≥1.
    const census = await page.evaluate(() => {
      const TP = window.TerrainPark;
      TP.setGod(true);
      /** @type {Record<string, number>} */
      const total = {};
      const add = (c) => {
        for (const [k, v] of Object.entries(c)) total[k] = (total[k] || 0) + v;
      };
      // Run A — flat tops (flat/kicker/box) after short teach
      TP.debugStart(4);
      for (let i = 0; i < 720; i++) TP.step(1 / 60);
      add(TP.getCensus());
      // Run B — slide street: log early in LINE_SEQ + hearts
      TP.debugStart(7);
      TP.setLives(1);
      for (let i = 0; i < 900; i++) TP.step(1 / 60);
      add(TP.getCensus());
      // Run C — chain: kicker/flat/rail + denser traffic (no falling stars)
      TP.debugStart(8);
      TP.setLives(1);
      for (let i = 0; i < 900; i++) TP.step(1 / 60);
      add(TP.getCensus());
      return total;
    });
    expect(census.starGate || 0, "falling stars must stay removed").toBe(0);
    for (const k of ["hit", "box", "log", "rail", "flat", "kicker", "grom", "skier", "heart"]) {
      expect(census[k] || 0, `restored item missing: ${k}`).toBeGreaterThanOrEqual(1);
    }

    // Steady camera: no rotation; OY velocity capped over rollers + air; forward-only scroll.
    const camProbe = await page.evaluate(() => {
      const TP = window.TerrainPark;
      TP.setGod(true);
      TP.setOverview(false);
      TP.debugStart(5);
      /** @type {number[]} */
      const oyVels = [];
      /** @type {number[]} */
      const riderXs = [];
      /** @type {number[]} */
      const scrollXs = [];
      let maxOyVel = 0;
      let rot = 0;
      let trafficHit = false;
      let backedUp = false;
      let prevRider = -Infinity;
      let prevScroll = -Infinity;
      for (let i = 0; i < 420; i++) {
        TP.step(1 / 60);
        // Force some air time mid-run
        if (i === 120) {
          const S = TP.state();
          S.p.on = false; S.p.vy = -520; S.holding = true;
        }
        const c = TP.getCam();
        rot = c.rot;
        oyVels.push(c.oyVel);
        maxOyVel = Math.max(maxOyVel, Math.abs(c.oyVel));
        riderXs.push(c.riderWorldX);
        scrollXs.push(c.scrollX);
        if (c.riderWorldX + 1e-6 < prevRider || c.scrollX + 1e-6 < prevScroll || c.spd < 0) backedUp = true;
        prevRider = c.riderWorldX;
        prevScroll = c.scrollX;
        if (TP.trafficInLanding()) trafficHit = true;
      }
      // Multi-run traffic landing census
      let trafficBad = trafficHit;
      for (const n of [3, 6, 8]) {
        TP.debugStart(n);
        for (let i = 0; i < 500; i++) {
          TP.step(1 / 60);
          if (TP.trafficInLanding()) trafficBad = true;
        }
      }
      // Mid-run framing after rollers — rider should sit mid-screen on phone.
      TP.debugStart(5);
      for (let i = 0; i < 180; i++) TP.step(1 / 60);
      const view = TP.getView();
      return {
        rot, maxOyVel, backedUp, trafficBad,
        riderFrac: view.riderScreenFrac,
        riderYFrac: view.riderYFrac,
        groundYFrac: view.groundYFrac,
        tallPhone: view.tallPhone,
      };
    });
    expect(camProbe.rot).toBe(0);
    expect(camProbe.maxOyVel).toBeLessThan(70);
    expect(camProbe.backedUp).toBe(false);
    expect(camProbe.trafficBad).toBe(false);
    expect(camProbe.riderFrac).toBeGreaterThanOrEqual(0.28);
    expect(camProbe.riderFrac).toBeLessThanOrEqual(0.38);
    if (testInfo.project.name === "phone") {
      expect(camProbe.tallPhone).toBe(true);
      expect(camProbe.riderYFrac).toBeGreaterThanOrEqual(0.45);
      expect(camProbe.riderYFrac).toBeLessThanOrEqual(0.7);
      expect(camProbe.groundYFrac).toBeGreaterThanOrEqual(0.5);
      expect(camProbe.groundYFrac).toBeLessThanOrEqual(0.68);
    }

    // Phone evidence shots Ted asked for
    if (testInfo.project.name === "phone") {
      // (a) portrait falling snow (wind angles flakes, no streak lines)
      await page.evaluate(() => {
        const TP = window.TerrainPark;
        TP.setGod(true); TP.setOverview(false); TP.debugStart(5);
        TP.setWind(0.55, -1);
        const S = TP.state();
        for (let i = 0; i < 160; i++) TP.step(1 / 60);
        S.p.on = true; S.p.vy = 0; S.holding = false; S.pops = [];
        TP.step(1 / 60);
      });
      await page.waitForTimeout(40);
      await page.screenshot({ path: path.join(ART, "phone-falling-snow.png") });
      await page.screenshot({ path: path.join(ART, "phone-steady-rollers.png") });

      // (b) rail with continuous thin snow layer + scrape under the board
      await page.evaluate(() => {
        const TP = window.TerrainPark;
        TP.setGod(true); TP.setOverview(false); TP.debugStart(2);
        TP.setWind(0.3, -1);
        const S = TP.state();
        for (let i = 0; i < 20; i++) TP.step(1 / 60);
        const base = S.dist + S.p.x + 100;
        S.feats = [
          { k: "rail", wx: base, w: 300, h: 42.5, ap: 0, dk: 0, ex: 0, amp: 0, gap: 0, r: 0, vx: 0, ph: 0, snowCap: 1, down: 4 },
        ];
        // Rider mid-rail so the continuous layer + bare scrape strip both read.
        S.dist = base - S.p.x;
        S.p.on = true; S.p.vy = 0; S.grindOn = S.feats[0]; S.grindStyle = "fifty"; S.pops = [];
        for (let i = 0; i < 4; i++) TP.step(1 / 60);
        S.feats[0].snowCap = 1;
        S.pops = [];
        S.parts = []; // no scrape squares reading as cotton blobs on the rail
        TP.step(0);
      });
      await page.waitForTimeout(40);
      await page.screenshot({ path: path.join(ART, "phone-rail-snow-cap.png") });

      // (c) named trick popup — fully on-screen, clear of rider + HUD
      await page.evaluate(() => {
        const TP = window.TerrainPark;
        TP.setGod(true); TP.setOverview(false); TP.debugStart(3);
        const S = TP.state();
        for (let i = 0; i < 40; i++) TP.step(1 / 60);
        S.mode = "pause";
        S.p.on = false; S.p.y -= 70; S.p.vy = -40; S.holding = false;
        S.spinDir = -1; S.flip = Math.PI * 2;
        TP.setGrab("Indy", true);
        // Place pop ahead of rider — draw() must clamp fully inside the phone frame.
        S.pops = [{ x: S.p.x + 120, y: S.p.y - 96, l: 0.95, txt: "Backside 360 Indy +64" }];
        S.lastTrickName = "Backside 360 Indy";
        TP.step(0);
      });
      await page.waitForTimeout(60);
      await page.screenshot({ path: path.join(ART, "phone-named-trick.png") });
      // Pixel-assert popup is fully inside the phone frame with padding, below HUD.
      const popBounds = await page.evaluate(() => {
        const c = document.querySelector("canvas");
        if (!c) return null;
        const ctx = c.getContext("2d");
        const w = c.width, h = c.height;
        const img = ctx.getImageData(0, 0, w, h).data;
        let minX = w, maxX = 0, minY = h, maxY = 0, n = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const r = img[i], g = img[i + 1], b = img[i + 2];
            // White fill of strokeText near navy outline
            if (r > 248 && g > 248 && b > 248) {
              let navy = false;
              for (let dy = -3; dy <= 3 && !navy; dy++) {
                for (let dx = -3; dx <= 3; dx++) {
                  const xx = x + dx, yy = y + dy;
                  if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
                  const j = (yy * w + xx) * 4;
                  const rr = img[j], gg = img[j + 1], bb = img[j + 2];
                  if (rr >= 20 && rr <= 50 && gg >= 45 && gg <= 80 && bb >= 85 && bb <= 130) {
                    navy = true; break;
                  }
                }
              }
              if (navy && y > 200 && y < h * 0.7) {
                n++; minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                minY = Math.min(minY, y); maxY = Math.max(maxY, y);
              }
            }
          }
        }
        const dpr = window.devicePixelRatio || 1;
        return { n, minX, maxX, minY, maxY, w, h, dpr, padPx: 20 * dpr, hudMax: 200 };
      });
      expect(popBounds && popBounds.n > 20, "named trick popup pixels").toBeTruthy();
      expect(popBounds.minX).toBeGreaterThanOrEqual(popBounds.padPx - 4);
      expect(popBounds.maxX).toBeLessThanOrEqual(popBounds.w - popBounds.padPx + 4);
      expect(popBounds.minY).toBeGreaterThan(popBounds.hudMax);

      // Pose QA sheet kept for the existing pose data layer (rider art overhaul is separate).
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => window.TerrainPark.renderPoseSheet());
      await page.waitForTimeout(80);
      await page.screenshot({ path: path.join(ART, "phone-pose-qa-sheet.png") });
      await page.evaluate(() => window.TerrainPark.resize());

      // (d) Resort backdrop evidence — riding on each look + grab/rail (390×844)
      const shootRiding = async (bg, outName) => {
        await page.evaluate((id) => {
          const TP = window.TerrainPark;
          TP.setGod(true); TP.setOverview(false); TP.debugStart(1);
          TP.setBackdrop(id);
          const S = TP.state();
          for (let i = 0; i < 30; i++) TP.step(1 / 60);
          S.feats = []; S.pops = []; S.parts = [];
          S.p.on = true; S.p.vy = 0; S.holding = false; S.grab = null; S.grabEase = 0;
          TP.step(0);
        }, bg);
        await page.waitForTimeout(120);
        await page.screenshot({ path: path.join(ART, outName) });
      };
      await shootRiding("bluebird", "phone-art-riding.png");
      await shootRiding("bluebird", "phone-art-riding-bluebird.png");
      await shootRiding("night", "phone-art-riding-night.png");

      await page.evaluate(() => {
        const TP = window.TerrainPark;
        TP.setBackdrop("bluebird");
        const S = TP.state();
        S.mode = "pause";
        S.p.on = false; S.p.y -= 60; S.p.vy = -30;
        S.spinDir = -1; S.flip = Math.PI * 0.4;
        TP.setGrab("Indy", true);
        S.pops = [];
        TP.step(0);
      });
      await page.waitForTimeout(40);
      await page.screenshot({ path: path.join(ART, "phone-art-grab.png") });

      await page.evaluate(() => {
        const TP = window.TerrainPark;
        TP.setGod(true); TP.setOverview(false); TP.debugStart(2);
        TP.setBackdrop("bluebird");
        const S = TP.state();
        const base = S.dist + S.p.x + 100;
        S.feats = [
          { k: "rail", wx: base, w: 300, h: 42.5, ap: 0, dk: 0, ex: 0, amp: 0, gap: 0, r: 0, vx: 0, ph: 0, snowCap: 1, down: 4 },
        ];
        S.dist = base - S.p.x;
        S.p.on = true; S.p.vy = 0; S.grindOn = S.feats[0]; S.grindStyle = "boardslide";
        S.grab = null; S.grabEase = 0; S.pops = []; S.parts = [];
        S.feats[0].snowCap = 1;
        // Seat board on rail top (grind snap), then draw.
        TP.step(1 / 60);
        TP.step(0);
      });
      await page.waitForTimeout(40);
      await page.screenshot({ path: path.join(ART, "phone-art-rail-slide.png") });

      // Soft Alps / no-flags (vector tip trees when clipped near-bank)
      await page.evaluate(() => {
        const TP = window.TerrainPark;
        TP.setOverview(false); TP.debugStart(1);
        TP.setWind(0.2, -1);
        const S = TP.state();
        S.feats = []; S.pickups = []; S.pops = [];
        S.p.on = true; S.p.vy = 0; S.grindOn = null;
        TP.step(0);
      });
      await page.waitForTimeout(40);
      await page.screenshot({ path: path.join(ART, "phone-trees-closeup.png") });
      await page.screenshot({ path: path.join(ART, "phone-ride-no-flags.png") });

      // (e) overview
      const overviewRaw = path.join(ART, "overview-raw.png");
      await page.setViewportSize({ width: 1600, height: 600 });
      await page.evaluate(() => {
        const TP = window.TerrainPark;
        TP.setOverview(true); TP.debugStart(5);
        const S = TP.state();
        const base = S.dist + S.p.x + 520;
        const gap = 175;
        const pack = [
          { k: "hit", ap: 44, dk: 10, ex: 52, amp: 22 },
          { k: "box", w: 140, h: 14 },
          { k: "rail", w: 220, h: 42.5, down: 6 },
          { k: "hit", ap: 40, dk: 10, ex: 48, amp: 24 },
          { k: "kicker", ap: 58, dk: 14, ex: 96, amp: 38, variant: "table" },
          { k: "kicker", ap: 70, dk: 16, ex: 112, amp: 50, variant: "table" },
          { k: "kicker", ap: 78, dk: 18, ex: 124, amp: 62, variant: "step", step: 12 },
          { k: "rail", w: 180, h: 42.5, down: 4 },
        ];
        S.feats = pack.map((sp, i) => ({
          w: 0, h: 0, ap: 0, dk: 0, ex: 0, amp: 0, gap: 0, r: 0, vx: 0, ph: 0, step: 0, ...sp, wx: base + i * gap,
        }));
        S.dist = base - S.p.x + 40; S.p.on = true; S.p.vy = 0; S.pops = [];
        TP.step(1 / 60);
      });
      await page.waitForTimeout(60);
      await page.screenshot({ path: overviewRaw });
      await page.evaluate(() => window.TerrainPark.setOverview(false));
      await page.setViewportSize({ width: 390, height: 844 });
      const { execFileSync } = require("child_process");
      execFileSync("python3", ["-c", `
from PIL import Image
im = Image.open(${JSON.stringify(overviewRaw)}).convert("RGB").resize((1600, 600), Image.Resampling.LANCZOS)
im.save(${JSON.stringify(path.join(ART, "phone-jumpline-overview.png"))}, "PNG")
`]);
    }

    // No forbidden storage writes / console errors from app (ignore our intentional storage mocks after reload)
    const bad = errs.filter((e) => !/quota|blocked|Frame recovered/i.test(e));
    expect(bad).toEqual([]);
  });
});
