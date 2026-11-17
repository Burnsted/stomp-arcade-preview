/**
 * Terrain Park resort backdrop — port of Boulder Dodge painted resort
 * (Burnsted/stomp-preview draft PR #145 @ b311c69, arcade/boulder-dodge).
 *
 * Right-side-up face: ridge near the top, ~15–20% sky band, forest clumps /
 * glades / trail cuts / lift+chairs / lodge / haze / near pines. Park dressing
 * per setting. World-fixed parallax. No photo plates.
 */
import type { BackdropId } from "./art";

export type ParkBgTreatment = "vector" | "soft" | "sparse";

export type ParkSetting =
  | "park-base"
  | "main-park"
  | "pro-line"
  | "rail-garden"
  | "sunset"
  | "night-park";

/** BD-style zone id used by the shared resort painters. */
type Zone = "base" | "groomer" | "pro" | "rails" | "bowl" | "night";

type Look = {
  zone: Zone;
  sky: [string, string, string];
  snow: string;
  shade: string;
  tint: string;
  far: [string, string];
  midSnow: [string, string];
  forest: [string, string, string];
  near: [string, string];
  fog: [number, number, number];
  dark: boolean;
};

export function settingForBackdrop(id: BackdropId): ParkSetting {
  switch (id) {
    case "resort-base": return "park-base";
    case "alpine-bowl":
    case "bluebird": return "main-park";
    case "frozen-lake": return "pro-line";
    case "open-snowfield": return "rail-garden";
    case "dusk-glow": return "sunset";
    case "night-village":
    case "night": return "night-park";
    default: return "main-park";
  }
}

function lookFor(setting: ParkSetting): Look {
  switch (setting) {
    case "park-base":
      return {
        zone: "base",
        sky: ["#4a8ab8", "#7eb0d4", "#c5dff0"],
        snow: "#f7fbfe", shade: "#8fa8bc", tint: "#e8f2f8",
        far: ["#6a849c", "#8aa4bc"], midSnow: ["#f6fafd", "#e8f0f6"],
        forest: ["#1e3a2c", "#2f5a40", "#3f734f"], near: ["#2a4a38", "#d6e6f0"],
        fog: [196, 214, 226], dark: false,
      };
    case "main-park":
      return {
        zone: "groomer",
        sky: ["#5a9ad0", "#9ec8e8", "#e8f4fc"],
        snow: "#fcfdff", shade: "#c0d4e4", tint: "#eef5fb",
        far: ["#7a96ac", "#a0b8cc"], midSnow: ["#f4f8fb", "#e4edf4"],
        forest: ["#1a3828", "#2e5840", "#3f7050"], near: ["#2a4e3a", "#eaf3f8"],
        fog: [220, 232, 240], dark: false,
      };
    case "pro-line":
      return {
        zone: "pro",
        sky: ["#1e5e98", "#4a92c0", "#a8d4e8"],
        snow: "#eef8fc", shade: "#5e92b0", tint: "#d0e8f4",
        far: ["#3a6a88", "#6a98b4"], midSnow: ["#e8f2f8", "#d4e4ee"],
        forest: ["#0e2a20", "#1e4434", "#326048"], near: ["#1a382c", "#c0dcec"],
        fog: [150, 188, 208], dark: false,
      };
    case "rail-garden":
      return {
        zone: "rails",
        sky: ["#5a7488", "#849eb0", "#c0d0dc"],
        snow: "#f2f5f8", shade: "#8aa0b0", tint: "#e4eaf0",
        far: ["#5a6e80", "#8494a4"], midSnow: ["#e8eef4", "#d0dae4"],
        forest: ["#243830", "#3a4e44", "#52685c"], near: ["#2e4038", "#d0d8e0"],
        fog: [200, 210, 220], dark: false,
      };
    case "sunset":
      return {
        zone: "bowl",
        sky: ["#3a4a78", "#c47868", "#f0c8a0"],
        snow: "#faf4f6", shade: "#6f87b2", tint: "#efe4ec",
        far: ["#5a5870", "#9a8898"], midSnow: ["#f2e8ee", "#d8ccd8"],
        forest: ["#242c28", "#3a4440", "#546058"], near: ["#2e3834", "#e0d4e4"],
        fog: [198, 200, 220], dark: true,
      };
    case "night-park":
      return {
        zone: "night",
        sky: ["#060a18", "#101828", "#1a2438"],
        snow: "#d0dce8", shade: "#4a5a70", tint: "#b0c0d4",
        far: ["#1a2438", "#2a3850"], midSnow: ["#8a9ab0", "#5a6a80"],
        forest: ["#0c1810", "#182820", "#243830"], near: ["#142018", "#3a4858"],
        fog: [40, 52, 72], dark: true,
      };
  }
}

export function skyPalette(setting: ParkSetting): { top: string; mid: string; bot: string; dark: boolean } {
  const L = lookFor(setting);
  return { top: L.sky[0], mid: L.sky[1], bot: L.sky[2], dark: L.dark };
}

type DrawCtx = {
  cx: CanvasRenderingContext2D;
  viewL: number;
  viewR: number;
  clipTop: number;
  crestY: number;
  bot: number;
  dist: number;
  pX: number;
  t: number;
  landscape: boolean;
  treatment: ParkBgTreatment;
  setting: ParkSetting;
  look: Look;
};

function hexRgb(hex: string): [number, number, number] {
  let h = (hex || "#9ecce8").replace("#", "");
  if (h.length === 3) h = h[0]! + h[0] + h[1] + h[1] + h[2] + h[2];
  return [
    parseInt(h.slice(0, 2), 16) || 158,
    parseInt(h.slice(2, 4), 16) || 204,
    parseInt(h.slice(4, 6), 16) || 232,
  ];
}

function rgba(rgb: [number, number, number] | number[], a: number) {
  return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + a + ")";
}

function hash01(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function wrapView(base: number, scroll: number, period: number) {
  let x = ((base - scroll) % period + period) % period;
  if (x > period * 0.85) x -= period;
  return x;
}

/** Ridge leaves a 15–20% sky band above the face (right-side up). */
function faceTop(d: DrawCtx) {
  const viewH = Math.max(80, d.crestY - d.clipTop);
  return d.clipTop + viewH * (d.landscape ? 0.15 : 0.18);
}

/** BD painters were tuned for ~250wu face height — scale props to TP face. */
function faceScale(d: DrawCtx) {
  const faceH = Math.max(80, d.crestY - faceTop(d));
  let s = Math.max(0.95, Math.min(2.5, faceH / 250));
  // Landscape face is shorter in world-Y but wider — bump props so clumps read.
  if (d.landscape) s = Math.max(s, 1.45);
  return s;
}

function ridgeY(wx: number, base: number, amp: number, seed: number) {
  return base
    + amp * (0.55 * Math.sin(wx * 0.0031 + seed)
      + 0.28 * Math.sin(wx * 0.007 + seed * 1.7)
      + 0.17 * Math.sin(wx * 0.013 + seed * 0.6));
}

function fillBand(
  cx: CanvasRenderingContext2D,
  x0: number, span: number,
  yFn: (x: number) => number,
  bot: number, col: string,
) {
  cx.fillStyle = col;
  cx.beginPath();
  cx.moveTo(x0, bot);
  for (let x = x0; x <= x0 + span; x += 12) cx.lineTo(x, yFn(x));
  cx.lineTo(x0 + span, bot);
  cx.closePath();
  cx.fill();
}

function densFor(treatment: ParkBgTreatment) {
  if (treatment === "sparse") return 1;
  if (treatment === "soft") return 2;
  return 3;
}

/* —— painted conifer (BD) — tip is ABOVE base (y − h) —— */
function drawConifer(
  cx: CanvasRenderingContext2D,
  x: number, y: number, h: number,
  body: string, snow: string, dense: number,
) {
  if (h < 3.5) return;
  const w = h * 0.38;
  const skew = (hash01(x * 0.17 + y * 0.09) - 0.5) * w * 0.35;
  cx.fillStyle = "#4a3a2a";
  cx.fillRect(x - h * 0.04, y - h * 0.12, h * 0.08, h * 0.14);
  cx.fillStyle = body;
  cx.beginPath();
  cx.moveTo(x + skew * 0.2, y - h);
  cx.lineTo(x + w + skew, y - h * 0.38);
  cx.lineTo(x + w * 0.28, y - h * 0.38);
  cx.lineTo(x + w * 1.1 + skew * 0.5, y);
  cx.lineTo(x - w * 1.05 + skew * 0.3, y);
  cx.lineTo(x - w * 0.3, y - h * 0.38);
  cx.lineTo(x - w + skew, y - h * 0.38);
  cx.closePath();
  cx.fill();
  if (dense !== 0) {
    cx.fillStyle = snow;
    cx.globalAlpha = 0.48;
    cx.beginPath();
    cx.moveTo(x + skew * 0.2, y - h);
    cx.lineTo(x + w * 0.4 + skew * 0.3, y - h * 0.5);
    cx.lineTo(x - w * 0.35 + skew * 0.2, y - h * 0.5);
    cx.closePath();
    cx.fill();
    if (h > 10) {
      cx.beginPath();
      cx.moveTo(x, y - h * 0.55);
      cx.lineTo(x + w * 0.75 + skew * 0.2, y - h * 0.16);
      cx.lineTo(x - w * 0.7 + skew * 0.2, y - h * 0.16);
      cx.closePath();
      cx.fill();
    }
    cx.globalAlpha = 1;
  }
}

function drawChairSeat(
  cx: CanvasRenderingContext2D,
  x: number, y: number, sc: number, col: string, rider: string | null,
) {
  sc = sc || 1;
  const w = 9 * sc, h = 5.2 * sc;
  cx.strokeStyle = "rgba(255,255,255,.35)";
  cx.lineWidth = Math.max(1, 1.4 * sc);
  cx.beginPath(); cx.moveTo(x, y - h * 1.5); cx.lineTo(x, y); cx.stroke();
  cx.strokeStyle = col;
  cx.lineWidth = Math.max(1.1, 1.5 * sc);
  cx.beginPath(); cx.moveTo(x, y - h * 1.5); cx.lineTo(x, y); cx.stroke();
  cx.fillStyle = col;
  cx.fillRect(x - w * 0.55, y, w, h * 0.55);
  cx.fillRect(x - w * 0.48, y + h * 0.55, w * 0.3, h * 0.6);
  cx.fillRect(x + w * 0.12, y + h * 0.55, w * 0.3, h * 0.6);
  if (rider) {
    cx.fillStyle = rider;
    cx.beginPath(); cx.arc(x, y + h * 0.12, 2 * sc, 0, 7); cx.fill();
    cx.fillRect(x - 1.4 * sc, y + h * 0.12, 2.8 * sc, 3.2 * sc);
  }
}

/** Distance to nearest trail centerline, plus fall-line progress u (0=ridge, 1=park). */
function trailDist(
  x: number, y: number, trails: number[][][],
): { d: number; u: number } {
  let best = 1e9, bestU = 0.5;
  for (let t = 0; t < trails.length; t++) {
    const trail = trails[t]!;
    const topY = trail[0]![1]!, botY = trail[trail.length - 1]![1]!;
    const spanY = Math.max(1, botY - topY);
    for (let i = 0; i < trail.length - 1; i++) {
      const a = trail[i]!, b = trail[i + 1]!;
      const dx = b[0]! - a[0]!, dy = b[1]! - a[1]!;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      let tpar = ((x - a[0]!) * dx + (y - a[1]!) * dy) / (len * len);
      if (tpar < 0) tpar = 0; else if (tpar > 1) tpar = 1;
      const px = a[0]! + dx * tpar, py = a[1]! + dy * tpar;
      const d = Math.sqrt((x - px) * (x - px) + (y - py) * (y - py));
      if (d < best) {
        best = d;
        bestU = Math.max(0, Math.min(1, (py - topY) / spanY));
      }
    }
  }
  return { d: best, u: bestU };
}

/** Soft fall-line half-width at this sample (tapers + edge jitter). */
function trailHalfAt(
  x: number, y: number, trails: number[][][],
  halfLo: number, halfHi: number,
) {
  const { d, u } = trailDist(x, y, trails);
  const jitter = (hash01(x * 0.41 + y * 0.19) - 0.5) * (halfLo * 0.7);
  const half = Math.max(2.5, halfLo + (halfHi - halfLo) * u * u * 0.35 + (halfHi - halfLo) * u * 0.65 + jitter);
  return { d, u, half };
}

/**
 * Trail corridor = tree absence only — no fill/stroke/tint.
 * Soft probabilistic edges so the lane never reads as a hard glass pillar.
 */
function trailClear(
  x: number, y: number, trails: number[][][],
  halfLo: number, halfHi: number,
) {
  if (!trails.length) return false;
  const { d, half } = trailHalfAt(x, y, trails, halfLo, halfHi);
  if (d >= half) return false;
  // Core of the lane is empty; near the rim, occasionally keep a tree (ragged edge).
  const rim = half * 0.55;
  if (d < rim) return true;
  return hash01(x * 1.7 + y * 2.3) > 0.42;
}

/** Near the corridor edge — line the cut with denser trees. */
function trailEdge(
  x: number, y: number, trails: number[][][],
  halfLo: number, halfHi: number, band = 10,
) {
  if (!trails.length) return false;
  const { d, half } = trailHalfAt(x, y, trails, halfLo, halfHi);
  return d >= half * 0.75 && d < half + band;
}

function inGlade(x: number, y: number, glades: number[][]) {
  for (let g = 0; g < glades.length; g++) {
    const gl = glades[g]!;
    const dx = x - gl[0]!, dy = y - gl[1]!;
    if (dx * dx / (gl[2]! * gl[2]!) + dy * dy / (gl[3]! * gl[3]!) < 1) return true;
  }
  return false;
}

function drawLodge(
  cx: CanvasRenderingContext2D,
  x: number, y: number, sc: number, warm: boolean,
) {
  sc = sc || 1;
  const bw = 74 * sc, bh = 30 * sc;
  cx.fillStyle = "rgba(100,78,55,.4)";
  cx.fillRect(x - 6 * sc, y + bh * 0.58, bw + 22 * sc, 8 * sc);
  cx.strokeStyle = "rgba(140,110,75,.55)";
  cx.lineWidth = 1.2;
  cx.beginPath(); cx.moveTo(x - 4 * sc, y + bh * 0.52); cx.lineTo(x + bw + 12 * sc, y + bh * 0.52); cx.stroke();
  for (let d = 0; d < 6; d++) {
    cx.beginPath();
    cx.moveTo(x + d * 16 * sc, y + bh * 0.52);
    cx.lineTo(x + d * 16 * sc, y + bh * 0.58 + 8 * sc);
    cx.stroke();
  }
  cx.fillStyle = "#7a654c";
  cx.fillRect(x, y, bw, bh);
  cx.fillStyle = "#d2b896";
  cx.beginPath();
  cx.moveTo(x - 7 * sc, y);
  cx.lineTo(x + bw * 0.5, y - 20 * sc);
  cx.lineTo(x + bw + 7 * sc, y);
  cx.closePath();
  cx.fill();
  cx.fillStyle = "#5e4c3c";
  cx.fillRect(x + bw * 0.7, y + 3 * sc, bw * 0.42, bh * 0.9);
  cx.fillStyle = "#c4a888";
  cx.beginPath();
  cx.moveTo(x + bw * 0.66, y + 3 * sc);
  cx.lineTo(x + bw * 0.9, y - 10 * sc);
  cx.lineTo(x + bw + 10 * sc, y + 3 * sc);
  cx.closePath();
  cx.fill();
  cx.fillStyle = "#6a5a50";
  cx.fillRect(x + bw * 0.18, y - 26 * sc, 6 * sc, 12 * sc);
  cx.fillStyle = warm ? "rgba(255,200,110,.95)" : "rgba(170,215,235,.85)";
  for (let w = 0; w < 4; w++) {
    cx.fillRect(x + 8 * sc + w * 14 * sc, y + 7 * sc, 9 * sc, 10 * sc);
    if (warm) {
      cx.fillStyle = "rgba(255,230,160,.35)";
      cx.beginPath();
      cx.arc(x + 12 * sc + w * 14 * sc, y + 12 * sc, 7 * sc, 0, 7);
      cx.fill();
      cx.fillStyle = "rgba(255,200,110,.95)";
    }
  }
  cx.fillRect(x + bw * 0.78, y + 9 * sc, 8 * sc, 9 * sc);
  cx.fillStyle = "#4a3428";
  cx.fillRect(x + bw * 0.4, y + bh * 0.32, 10 * sc, bh * 0.68);
}

function drawLiftTerminal(cx: CanvasRenderingContext2D, x: number, y: number, sc: number) {
  sc = sc || 1;
  cx.fillStyle = "#7a8490";
  cx.fillRect(x, y, 36 * sc, 16 * sc);
  cx.fillStyle = "#c8d0d8";
  cx.beginPath();
  cx.moveTo(x - 3 * sc, y);
  cx.lineTo(x + 18 * sc, y - 10 * sc);
  cx.lineTo(x + 39 * sc, y);
  cx.closePath();
  cx.fill();
  cx.fillStyle = "#5a6570";
  cx.fillRect(x + 14 * sc, y + 4 * sc, 8 * sc, 12 * sc);
  cx.strokeStyle = "rgba(50,60,70,.5)";
  cx.lineWidth = 1.5;
  cx.beginPath();
  cx.moveTo(x + 18 * sc, y);
  cx.lineTo(x + 18 * sc, y - 22 * sc);
  cx.stroke();
  cx.fillStyle = "#9aa4b0";
  cx.fillRect(x + 10 * sc, y - 24 * sc, 16 * sc, 4 * sc);
}

function drawPeopleDots(cx: CanvasRenderingContext2D, x: number, y: number, n: number, seed: number) {
  for (let i = 0; i < n; i++) {
    const px = x + hash01(seed + i) * 50 - 8;
    const py = y + hash01(seed + i * 3) * 8;
    cx.fillStyle = i % 3 === 0 ? "#c4a06a" : (i % 3 === 1 ? "#3a5a80" : "#e8eef4");
    cx.beginPath(); cx.arc(px, py, 1.6, 0, 7); cx.fill();
    cx.fillRect(px - 1, py, 2, 3.2);
  }
}

/** Soft snow shelf under a lodge / feature so it sits on terrain. */
function drawSnowShelf(
  cx: CanvasRenderingContext2D,
  cxMid: number, y: number, w: number, h: number, snow: string,
) {
  cx.fillStyle = snow;
  cx.beginPath();
  cx.ellipse(cxMid, y, w * 0.55, h * 0.55, 0, 0, 7);
  cx.fill();
  cx.fillStyle = "rgba(80,110,140,.14)";
  cx.beginPath();
  cx.ellipse(cxMid + w * 0.06, y + h * 0.2, w * 0.48, h * 0.28, 0, 0, 7);
  cx.fill();
}

/**
 * Packed-snow kicker seated on the snow line (gy = plant).
 * Same seating idea as Ted-approved 562cc4a: bury into pack, side face, lip, contact shadow.
 */
function drawSnowKicker(
  cx: CanvasRenderingContext2D,
  x: number, gy: number, w: number, h: number,
) {
  const bury = Math.max(6, h * 0.28);
  // Contact shadow — dark oval on the snow line
  cx.fillStyle = "rgba(25,45,70,.4)";
  cx.beginPath();
  cx.ellipse(x + w * 0.55, gy + 2, w * 0.62, 7.5, 0, 0, 7);
  cx.fill();
  // Snow apron / packed pad under the feature
  cx.fillStyle = "#e8eef4";
  cx.beginPath();
  cx.ellipse(x + w * 0.5, gy + bury * 0.2, w * 0.62, bury * 0.9, 0, 0, 7);
  cx.fill();
  // Side wall (drawn first, peeks past the ramp) — dark packed face
  cx.fillStyle = "#4e6e86";
  cx.beginPath();
  cx.moveTo(x + w * 0.55, gy - h);
  cx.lineTo(x + w * 1.05, gy - h * 0.05);
  cx.lineTo(x + w * 1.02, gy + bury);
  cx.lineTo(x + w * 0.55, gy + bury * 0.35);
  cx.closePath();
  cx.fill();
  cx.fillStyle = "rgba(20,40,60,.35)";
  cx.beginPath();
  cx.moveTo(x + w * 0.55, gy + bury * 0.35);
  cx.lineTo(x + w * 1.02, gy + bury);
  cx.lineTo(x + w * 0.55, gy + bury);
  cx.closePath();
  cx.fill();
  // Ramp face (approach → lip), buried at gy
  cx.fillStyle = "#d2dee8";
  cx.beginPath();
  cx.moveTo(x, gy + bury);
  cx.lineTo(x + w * 0.12, gy - h * 0.28);
  cx.lineTo(x + w * 0.55, gy - h);
  cx.lineTo(x + w * 0.55, gy + bury * 0.35);
  cx.closePath();
  cx.fill();
  // Lit top plane
  cx.fillStyle = "#f4f8fc";
  cx.beginPath();
  cx.moveTo(x + w * 0.12, gy - h * 0.28);
  cx.lineTo(x + w * 0.55, gy - h);
  cx.lineTo(x + w * 0.52, gy - h * 0.18);
  cx.lineTo(x + w * 0.16, gy + bury * 0.1);
  cx.closePath();
  cx.fill();
  // Lip coping
  cx.fillStyle = "#ffffff";
  cx.fillRect(x + w * 0.32, gy - h - 3, w * 0.4, 5);
  cx.strokeStyle = "rgba(30,50,70,.45)";
  cx.lineWidth = 1.4;
  cx.beginPath();
  cx.moveTo(x + w * 0.32, gy - h);
  cx.lineTo(x + w * 0.72, gy - h);
  cx.stroke();
}

function drawParkBox(
  cx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
) {
  cx.fillStyle = "rgba(60,90,120,.16)";
  cx.beginPath();
  cx.ellipse(x + w * 0.5, y + h + 2, w * 0.55, 4, 0, 0, 7);
  cx.fill();
  cx.fillStyle = "#d8e2ec";
  cx.fillRect(x, y, w, h);
  cx.fillStyle = "#b0c0d0";
  cx.fillRect(x, y + h * 0.7, w, h * 0.3);
  cx.fillStyle = "#8a9aac";
  cx.fillRect(x, y, w, 2.5);
  cx.fillStyle = "rgba(255,255,255,.45)";
  cx.fillRect(x + 2, y + 3, w * 0.35, h * 0.35);
}

function drawParkRail(
  cx: CanvasRenderingContext2D,
  x: number, y: number, w: number, rise: number,
) {
  const y1 = y + rise;
  // Legs planted in snow
  cx.strokeStyle = "rgba(50,60,75,.7)";
  cx.lineWidth = 1.6;
  cx.beginPath(); cx.moveTo(x + 3, y); cx.lineTo(x + 3, y + 14); cx.stroke();
  cx.beginPath(); cx.moveTo(x + w - 3, y1); cx.lineTo(x + w - 3, y1 + 14); cx.stroke();
  // Foot pads
  cx.fillStyle = "rgba(60,90,120,.2)";
  cx.fillRect(x - 2, y + 12, 10, 3);
  cx.fillRect(x + w - 8, y1 + 12, 10, 3);
  // Rail tube
  cx.strokeStyle = "rgba(255,255,255,.4)";
  cx.lineWidth = 3.2;
  cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + w, y1); cx.stroke();
  cx.strokeStyle = "#5a6878";
  cx.lineWidth = 2.2;
  cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + w, y1); cx.stroke();
}

function drawBannerPole(
  cx: CanvasRenderingContext2D,
  x: number, groundY: number, h: number, color: string,
) {
  // Snow mound at the plant
  cx.fillStyle = "rgba(70,100,130,.2)";
  cx.beginPath();
  cx.ellipse(x, groundY + 3, 9, 4, 0, 0, 7);
  cx.fill();
  cx.fillStyle = "#f2f6fa";
  cx.beginPath();
  cx.ellipse(x, groundY + 1, 8, 3.5, 0, 0, 7);
  cx.fill();
  // Thick readable pole
  cx.strokeStyle = "#4a3828";
  cx.lineWidth = 2.6;
  cx.lineCap = "round";
  cx.beginPath(); cx.moveTo(x, groundY); cx.lineTo(x, groundY - h); cx.stroke();
  cx.lineCap = "butt";
  // Flag cloth
  cx.fillStyle = color;
  cx.beginPath();
  cx.moveTo(x + 1, groundY - h + 1);
  cx.lineTo(x + 18, groundY - h + 5);
  cx.lineTo(x + 16, groundY - h + 14);
  cx.lineTo(x + 1, groundY - h + 12);
  cx.closePath();
  cx.fill();
  cx.fillStyle = "rgba(255,255,255,.3)";
  cx.fillRect(x + 2, groundY - h + 3, 5, 3);
}

/** Fall-line trail centerlines — start below ridge crown, curve toward park. */
function buildTrails(x0: number, top: number, bot: number, zone: Zone, n: number) {
  const out: number[][][] = [];
  const spread = zone === "groomer" || zone === "rails" ? 340 : (zone === "bowl" || zone === "night" ? 280 : 310);
  const lean = zone === "pro" ? 52 : (zone === "groomer" || zone === "rails" ? 70 : 58);
  // Leave ridge crown intact — cuts begin ~18% down the face
  const startY = top + (bot - top) * 0.18;
  for (let tr = 0; tr < n; tr++) {
    const pts: number[][] = [];
    const ox = x0 + (zone === "pro" ? 260 : 120) + tr * spread + ((tr * 53) % 52);
    const side = tr % 2 ? 1 : -1;
    for (let k = 0; k <= 20; k++) {
      const u = k / 20;
      // Fall-line S-curve: narrow/meandering near ridge, opens toward park
      const wander = side * (22 + (tr % 3) * 7) * Math.sin(u * 2.4 + tr * 0.85)
        + side * 10 * Math.sin(u * 5.1 + tr * 1.4)
        + (hash01(tr * 17 + k) - 0.5) * 6;
      pts.push([
        ox + u * u * lean + wander,
        startY + u * (bot - startY - 8),
      ]);
    }
    out.push(pts);
  }
  return out;
}

/**
 * Mid/far forest — continuous tree mass (~50% after trails/glade), no underlay discs.
 * Openings only from downhill trail cuts + one big glade; denser dark ridge treeline.
 * Trees ~45–55% of near height. BD d233220 style: trees define the outline.
 */
function drawDenseForest(
  cx: CanvasRenderingContext2D,
  x0: number, span: number, topY: number, botY: number,
  forest: [string, string, string], snowCol: string,
  trails: number[][][], dens: number, u = 1,
  fogCol?: [number, number, number],
  trailHalfLo = 8, trailHalfHi = 18,
) {
  const faceH = Math.max(40, botY - topY);
  const treeTop = topY + faceH * 0.12;
  const treeBot = botY - faceH * 0.01;
  const lay = Math.max(1.1, Math.min(u, 1.9));
  const midH = 0.52 * Math.min(u, 1.3);
  // Keep corridors modest — lay widens trees, not the ski-lane half-width
  const halfLo = trailHalfLo * Math.min(lay, 1.25);
  const halfHi = trailHalfHi * Math.min(lay, 1.25);
  const edgeBand = 11 * lay;
  const glades: number[][] = [];
  // Big glades across scroll so one is always on-screen
  for (let big = 0; big < 5; big++) {
    glades.push([
      x0 + 200 + big * 480 + hash01(big * 3) * 60,
      treeTop + faceH * (0.34 + hash01(big * 5) * 0.18),
      (100 + hash01(big) * 28) * lay,
      (44 + hash01(big * 2) * 12) * lay,
    ]);
  }
  for (let gi = 0; gi < 2; gi++) {
    glades.push([
      x0 + 160 + hash01(gi * 11) * span * 0.7,
      treeTop + hash01(gi * 19) * faceH * 0.5,
      (26 + hash01(gi * 3) * 20) * lay,
      (12 + hash01(gi * 7) * 10) * lay,
    ]);
  }

  // Continuous staggered rows — trail cuts are gaps only (no filled slabs).
  const rows = dens <= 1 ? 5 : (dens >= 3 ? 7 : 6);
  const colStep = (dens >= 3 ? 11 : dens <= 1 ? 15 : 13) * Math.max(1, lay * 0.65);
  const cols = Math.floor(span / colStep) + 2;
  for (let ri = 0; ri < rows; ri++) {
    const uRow = ri / Math.max(1, rows - 1);
    const ridgeBoost = uRow < 0.28 ? 1.25 : 1;
    const skipChance = dens <= 1 ? 0.22 : (uRow < 0.25 ? 0.06 : 0.14);
    for (let ci = 0; ci < cols; ci++) {
      const x = x0 + ci * colStep + (ri % 2 ? colStep * 0.5 : 0) + hash01(ci * 9 + ri) * colStep * 0.55;
      const y = treeTop + 6 + uRow * (treeBot - treeTop - 14) + hash01(ci + ri * 13) * 10 * lay;
      if (y < treeTop - 2 || y > treeBot) continue;
      if (trailClear(x, y, trails, halfLo, halfHi) || inGlade(x, y, glades)) continue;
      const edge = trailEdge(x, y, trails, halfLo, halfHi, edgeBand);
      if (!edge && hash01(ri * 31 + ci * 17) < skipChance) continue;
      const depth = Math.max(0, Math.min(1, (y - treeTop) / Math.max(1, treeBot - treeTop)));
      const tone = (edge || uRow < 0.3 || hash01(ci * 3 + ri) < 0.4)
        ? forest[0]!
        : forest[hash01(ci + ri) < 0.65 ? 1 : 0]!;
      const h = (14 + hash01(ci * 4 + ri) * 16) * midH * ridgeBoost
        * (0.85 + depth * 0.28) * (0.9 + hash01(ri * 5 + ci) * 0.3)
        * (edge ? 1.12 : 1);
      if (uRow < 0.2) cx.globalAlpha = 0.85 + uRow;
      // dense=0 — no snow-cap wash on mid trees (alpha blend reads as green discs under clumps)
      drawConifer(cx, x, y, h, tone, snowCol, 0);
      cx.globalAlpha = 1;
      // Edge lining: pack an extra tree along the cut
      if (edge || hash01(ci * 7 + ri * 3) > 0.55) {
        const ox = x + (edge ? 3.5 : 5) * lay;
        const oy = y + (edge ? 1 : 3);
        if (!trailClear(ox, oy, trails, halfLo, halfHi) && !inGlade(ox, oy, glades)) {
          drawConifer(cx, ox, oy, h * (edge ? 0.82 : 0.7), forest[0], snowCol, 0);
        }
      }
    }
  }
  // Extra dark ragged treeline at the ridge — never punched by trail cuts
  const crownStep = 9 * Math.max(1, lay * 0.6);
  for (let i = 0; i < Math.floor(span / crownStep); i++) {
    if (hash01(i * 41) < (dens <= 1 ? 0.15 : 0.06)) continue;
    const x = x0 + i * crownStep + hash01(i * 9) * 7 * lay;
    const y = treeTop - 6 + hash01(i * 17) * 15 * lay;
    if (inGlade(x, y, glades)) continue;
    const h = (17 + hash01(i) * 14) * midH * (1.05 + hash01(i * 3) * 0.2);
    drawConifer(cx, x, y, h, forest[0], snowCol, 0);
    if (hash01(i * 7) > 0.3) drawConifer(cx, x + 4 * lay, y + 3, h * 0.68, forest[0], snowCol, 0);
    if (hash01(i * 11) > 0.5) drawConifer(cx, x - 4 * lay, y + 2, h * 0.58, forest[0], snowCol, 0);
  }
  if (fogCol) {
    const haze = cx.createLinearGradient(0, treeTop, 0, treeBot + 8);
    haze.addColorStop(0, rgba(fogCol, dens <= 1 ? 0.05 : 0.02));
    haze.addColorStop(0.4, rgba(fogCol, dens <= 1 ? 0.025 : 0.01));
    haze.addColorStop(1, rgba(fogCol, 0));
    cx.fillStyle = haze;
    cx.fillRect(x0, treeTop - 4, span, treeBot - treeTop + 12);
  }
}

function drawLiftLine(
  cx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  dist: number, t: number, zone: Zone, u = 1,
  maxY?: number,
) {
  cx.strokeStyle = "rgba(255,255,255,.35)";
  cx.lineWidth = Math.max(1.6, 2.2 * Math.min(u, 1.3));
  cx.lineCap = "round";
  cx.beginPath(); cx.moveTo(x0, y0); cx.lineTo(x1, y1); cx.stroke();
  cx.strokeStyle = "rgba(28,36,48,.75)";
  cx.lineWidth = Math.max(1.2, 1.6 * Math.min(u, 1.3));
  cx.beginPath(); cx.moveTo(x0, y0); cx.lineTo(x1, y1); cx.stroke();
  cx.lineCap = "butt";
  const towers = 6;
  const yCap = maxY != null ? maxY : Math.max(y0, y1) + 8;
  for (let tw = 0; tw < towers; tw++) {
    const uu = tw / (towers - 1);
    const px = x0 + (x1 - x0) * uu;
    const py = y0 + (y1 - y0) * uu;
    const sc = (1.05 - uu * 0.5) * Math.min(u, 1.3);
    // Short posts — stay on the mid face, never into the park lane
    let postH = Math.max(8, 10 + (1 - uu) * 14) * Math.min(u, 1.2);
    if (py + postH > yCap) postH = Math.max(6, yCap - py);
    cx.fillStyle = zone === "night" ? "#2a3440" : "#4a5564";
    cx.fillRect(px - 1.5 * sc, py, 3 * sc, postH);
    cx.fillStyle = zone === "night" ? "#6a7888" : "#8a96a4";
    cx.fillRect(px - 5.5 * sc, py - 2 * sc, 11 * sc, 2.8 * sc);
  }
  const chairN = 9;
  const phase = (dist * 0.16 + t * 18) % 1;
  for (let ci = 0; ci < chairN; ci++) {
    const uu = ((ci / chairN) + phase) % 1;
    const px = x0 + (x1 - x0) * uu;
    const py = y0 + (y1 - y0) * uu;
    drawChairSeat(
      cx, px, py + 3 * u, (1.05 - uu * 0.45) * Math.min(u, 1.35),
      zone === "bowl" || zone === "night" ? "#c4a070" : "#3a4555",
      ci % 2 ? "#c4a06a" : "#2a3a55",
    );
  }
}


/* —— sky —— only the thin band above the ridge —— */
function drawSky(d: DrawCtx) {
  const { cx, viewL, viewR, clipTop, look } = d;
  const span = (viewR - viewL) + 120;
  const top = faceTop(d);
  const skyBot = top + 28; // slight overlap under ridge so no gap
  // Underpaint snow so any gap never flashes body navy
  cx.fillStyle = look.snow;
  cx.fillRect(viewL - 40, top - 4, span, (d.crestY - top) + 40);
  const g = cx.createLinearGradient(0, clipTop - 8, 0, skyBot);
  g.addColorStop(0, look.sky[0]);
  g.addColorStop(0.55, look.sky[1]);
  g.addColorStop(1, look.sky[2]);
  cx.fillStyle = g;
  cx.fillRect(viewL - 40, clipTop - 20, span, skyBot - clipTop + 24);

  const u = faceScale(d);
  if (look.zone === "bowl") {
    const sx = viewL + (viewR - viewL) * 0.78;
    const sy = clipTop + (top - clipTop) * 0.45;
    cx.fillStyle = "rgba(255,170,110,.32)";
    cx.beginPath(); cx.arc(sx, sy, 22 * u, 0, 7); cx.fill();
    cx.fillStyle = "rgba(255,220,170,.55)";
    cx.beginPath(); cx.arc(sx, sy, 9 * u, 0, 7); cx.fill();
  } else if (look.zone === "night") {
    const sx = viewL + (viewR - viewL) * 0.82;
    const sy = clipTop + (top - clipTop) * 0.4;
    cx.fillStyle = "rgba(220,230,255,.55)";
    cx.beginPath(); cx.arc(sx, sy, 12 * u, 0, 7); cx.fill();
    cx.fillStyle = "rgba(255,255,255,.85)";
    cx.beginPath(); cx.arc(sx, sy, 6 * u, 0, 7); cx.fill();
  } else if (look.zone !== "pro") {
    const sx = viewL + (viewR - viewL) * 0.8;
    const sy = clipTop + (top - clipTop) * 0.4;
    cx.fillStyle = "rgba(255,244,200,.4)";
    cx.beginPath(); cx.arc(sx, sy, 16 * u, 0, 7); cx.fill();
    cx.fillStyle = "#fff6d8";
    cx.beginPath(); cx.arc(sx, sy, 7 * u, 0, 7); cx.fill();
  }
}

/* —— far ridge —— peaks point UP into the sky band —— */
function drawResortFar(d: DrawCtx) {
  const { cx, viewL, viewR, crestY, dist, look, landscape } = d;
  const scroll = (dist * 0.07) % 2800;
  const x0 = viewL - scroll - 100;
  const span = (viewR - viewL) + 3000;
  const cols = look.far;
  const u = faceScale(d);
  const lift = (look.zone === "bowl" || look.zone === "night"
    ? (landscape ? 6 : 10)
    : (landscape ? 18 : 28)) * Math.min(u, 1.6);
  const top = faceTop(d) - lift;
  const amp = (look.zone === "bowl" || look.zone === "night" ? 18 : 32) * Math.min(u, 2.0) * (landscape ? 1.25 : 1);
  const bot = crestY - 20 * u;
  fillBand(cx, x0, span, (x) => ridgeY(x + scroll, top, amp, 1.1), bot, cols[0]);
  fillBand(cx, x0, span, (x) => ridgeY(x + scroll, top + 12 * u, amp * 0.55, 2.3), bot, cols[1]);
  // Soft ridge highlight along the crest (silhouette against sky)
  cx.strokeStyle = rgba(hexRgb(cols[0]), 0.55);
  cx.lineWidth = Math.max(1.2, 1.6 * u);
  cx.beginPath();
  for (let x = x0; x <= x0 + span; x += 14) {
    const y = ridgeY(x + scroll, top, amp, 1.1);
    if (x === x0) cx.moveTo(x, y); else cx.lineTo(x, y);
  }
  cx.stroke();
  const sh = cx.createLinearGradient(0, top, 0, bot);
  sh.addColorStop(0, "rgba(255,255,255,.18)");
  sh.addColorStop(0.45, "rgba(40,70,100,.05)");
  sh.addColorStop(1, "rgba(40,70,100,0)");
  cx.fillStyle = sh;
  cx.fillRect(x0, top - 12, span, bot - top + 24);
}

/* —— mid face + forest + trails + lift + lodge —— */
function drawResortMid(d: DrawCtx) {
  const { cx, viewL, viewR, crestY, dist, t, look, landscape, treatment } = d;
  const scroll = (dist * 0.16) % 2200;
  const x0 = viewL - scroll - 80;
  const span = (viewR - viewL) + 2400;
  const zone = look.zone;
  const snow = look.snow;
  const ms = look.zone === "rails" ? ["#dce6ee", "#c0ccd8"] as [string, string] : look.midSnow;
  const forest = look.forest;
  const u = faceScale(d);
  const top = faceTop(d) + (landscape ? 4 : 0);
  const bot = crestY + 6;
  const dens = densFor(treatment);

  fillBand(cx, x0, span, (x) => ridgeY(x + scroll, top, 26 * u, 0.8), bot, ms[1]);
  fillBand(cx, x0, span, (x) => ridgeY(x + scroll, top + 14 * u, 16 * u, 1.9), bot, ms[0]);
  const face = cx.createLinearGradient(0, top, 0, bot);
  face.addColorStop(0, "rgba(255,255,255,.14)");
  face.addColorStop(0.3, "rgba(255,255,255,.04)");
  face.addColorStop(0.65, "rgba(50,80,110,.12)");
  face.addColorStop(1, "rgba(50,80,110,.18)");
  cx.fillStyle = face;
  cx.fillRect(x0, top - 8, span, bot - top + 16);

  if (zone === "bowl" || zone === "night") {
    const glow = cx.createLinearGradient(0, top, 0, bot);
    if (zone === "bowl") {
      glow.addColorStop(0, "rgba(255,200,160,.22)");
      glow.addColorStop(0.35, "rgba(255,210,180,.1)");
      glow.addColorStop(0.7, "rgba(200,190,220,0)");
      glow.addColorStop(1, "rgba(180,190,220,.06)");
    } else {
      glow.addColorStop(0, "rgba(60,80,120,.18)");
      glow.addColorStop(0.5, "rgba(30,40,60,.08)");
      glow.addColorStop(1, "rgba(10,16,28,.12)");
    }
    cx.fillStyle = glow;
    cx.fillRect(x0, top - 6, span, bot - top + 12);
  }

  const faceH = bot - top;
  // Clean light snow band behind the rider — keep, leave ~78% of face for wooded mid.
  const parkBand = faceH * (landscape ? 0.18 : 0.22);
  // Landscape face is shorter — force full vector density so clumps still read ~50%.
  // Night stays dense enough that the one soft trail lane reads as a run, not a beam.
  const forestDens = zone === "night" ? 2 : (landscape ? Math.max(dens, 3) : dens);
  // 1–2 fall-line trail cuts = soft tree absences (never filled pillars/slabs)
  const trailN = zone === "night" ? 1
    : zone === "groomer" || zone === "rails" || zone === "base" ? 2
    : 2;
  const forestBot = bot - parkBand;
  const trails = buildTrails(x0, top, forestBot, zone, trailN);
  // Narrow at ridge, wider near park — modest so gaps read as runs, not pillars
  const trailHalfLo = zone === "groomer" || zone === "rails" ? 4 : 3.5;
  const trailHalfHi = zone === "groomer" || zone === "rails" ? 11 : 9.5;
  drawDenseForest(
    cx, x0, span, top + 2, forestBot,
    forest, look.tint || snow, trails, forestDens, u, look.fog,
    trailHalfLo, trailHalfHi,
  );
  // No trail fill / stroke / tint — cuts are tree gaps on the same slope snow only.

  // Bright park-slope band under the forest (BD composition: rider on open snow)
  const bandTop = forestBot - 4;
  const band = cx.createLinearGradient(0, bandTop, 0, bot + 4);
  band.addColorStop(0, rgba(hexRgb(ms[0]), 0.2));
  band.addColorStop(0.2, rgba(hexRgb(snow), 0.95));
  band.addColorStop(0.75, rgba(hexRgb(snow), 1));
  band.addColorStop(1, rgba(hexRgb(snow), 0.98));
  cx.fillStyle = band;
  cx.fillRect(x0, bandTop, span, bot - bandTop + 10);

  // Soft ridge haze only — low opacity so far slope keeps contrast
  const atmo = cx.createLinearGradient(0, top - 10, 0, top + 28);
  atmo.addColorStop(0, rgba(look.fog, landscape ? 0.08 : 0.12));
  atmo.addColorStop(1, rgba(look.fog, 0));
  cx.fillStyle = atmo;
  cx.fillRect(x0, top - 12, span, 34);

  // Lift stays in the upper wooded band — never into park band / rider lane / JUMP HUD
  const liftLo = landscape
    ? top + faceH * 0.34
    : Math.min(forestBot - faceH * 0.18, top + faceH * 0.52);
  const liftHi = top + faceH * 0.1;
  let liftX0: number, liftY0: number, liftX1: number, liftY1: number;
  if (zone === "base") {
    liftX0 = x0 + 280; liftY0 = liftLo; liftX1 = liftX0 + 640; liftY1 = liftHi;
  } else if (zone === "groomer" || zone === "rails") {
    liftX0 = x0 + 80; liftY0 = liftLo; liftX1 = liftX0 + 720; liftY1 = liftHi;
  } else if (zone === "pro") {
    liftX0 = x0 + 640; liftY0 = liftLo; liftX1 = liftX0 + 480; liftY1 = liftHi;
  } else {
    liftX0 = x0 + 160; liftY0 = liftLo; liftX1 = liftX0 + 640; liftY1 = liftHi;
  }
  const liftCap = Math.min(forestBot - 8, liftLo + 28);
  drawLiftLine(cx, liftX0, liftY0, liftX1, liftY1, dist, t, zone, Math.min(u, 1.15), liftCap);
  // Second lift portrait-only — landscape one cable stays behind the park band
  if (zone !== "pro" && !landscape) {
    drawLiftLine(cx, liftX0 + 920, liftY0, liftX1 + 920, liftY1, dist, t, zone, Math.min(u, 1.15), liftCap);
  }

  if (zone === "base") {
    // Lodge on the park-band shelf — clear of the rider lane
    const lx = viewL + wrapView(180, scroll, 700);
    const lodgeSc = 0.85 * Math.min(u, 1.25);
    const lodgeY = forestBot - 6;
    drawSnowShelf(cx, lx + 38 * lodgeSc, lodgeY + 30 * lodgeSc, 105 * lodgeSc, 18 * lodgeSc, snow);
    drawLodge(cx, lx, lodgeY, lodgeSc, false);
    drawLiftTerminal(cx, lx + 80 * lodgeSc, lodgeY + 12 * lodgeSc, lodgeSc);
    drawPeopleDots(cx, lx + 6, lodgeY + 30 * lodgeSc, 7, 11);
    drawPeopleDots(cx, lx + 88 * lodgeSc, lodgeY + 32 * lodgeSc, 4, 29);
  }

  if (zone === "bowl") {
    // Seat lodge on a berm continuous with the park snow band
    const hx = viewL + wrapView(240, scroll, 740);
    const lodgeSc = 0.7 * Math.min(u, 1.25);
    const shelfY = forestBot + 2;
    // Terrace rising from the park band into the lodge pad
    cx.fillStyle = snow;
    cx.beginPath();
    cx.moveTo(hx - 24 * lodgeSc, bot - 4);
    cx.lineTo(hx - 18 * lodgeSc, shelfY + 34 * lodgeSc);
    cx.quadraticCurveTo(hx + 40 * lodgeSc, shelfY + 18 * lodgeSc, hx + 108 * lodgeSc, shelfY + 36 * lodgeSc);
    cx.lineTo(hx + 118 * lodgeSc, bot - 2);
    cx.closePath();
    cx.fill();
    cx.fillStyle = "rgba(80,100,130,.16)";
    cx.beginPath();
    cx.moveTo(hx - 10 * lodgeSc, shelfY + 34 * lodgeSc);
    cx.quadraticCurveTo(hx + 45 * lodgeSc, shelfY + 40 * lodgeSc, hx + 100 * lodgeSc, shelfY + 36 * lodgeSc);
    cx.lineTo(hx + 100 * lodgeSc, shelfY + 44 * lodgeSc);
    cx.quadraticCurveTo(hx + 45 * lodgeSc, shelfY + 48 * lodgeSc, hx - 10 * lodgeSc, shelfY + 42 * lodgeSc);
    cx.closePath();
    cx.fill();
    drawLodge(cx, hx, shelfY, lodgeSc, true);
    cx.fillStyle = "rgba(255,200,120,.9)";
    for (let li = 0; li < 7; li++) {
      cx.beginPath();
      cx.arc(hx - 10 * lodgeSc + li * 20 * lodgeSc, shelfY + 20 * lodgeSc + hash01(li) * 3, 2.4 * lodgeSc, 0, 7);
      cx.fill();
    }
  }

  if (zone === "groomer") {
    cx.strokeStyle = "rgba(255,255,255,.18)";
    cx.lineWidth = 1;
    for (let gi = 0; gi < 5; gi++) {
      const gy = top + faceH * 0.2 + gi * ((forestBot - top - faceH * 0.25) / 5);
      cx.beginPath();
      for (let gx = x0; gx < x0 + span; gx += 18) {
        const yy = gy + Math.sin((gx + scroll) * 0.02 + gi) * 2;
        if (gx === x0) cx.moveTo(gx, yy); else cx.lineTo(gx, yy);
      }
      cx.stroke();
    }
  }

  // Park dressing sits ON the clear snow band
  paintParkDressing(d, x0, span, top, bot, scroll, bandTop, forestBot);
}

/* —— setting-specific park props — sit on the clear snow band —— */
function paintParkDressing(
  d: DrawCtx,
  x0: number, span: number, top: number, bot: number, scroll: number,
  bandTop: number, forestBot: number,
) {
  const { cx, look, viewL } = d;
  const zone = look.zone;
  const faceH = bot - top;
  const u = Math.min(faceScale(d), 1.4);
  const ground = (t: number) => bandTop + (bot - bandTop) * t;

  // Feature scale stays readable but mid-ground sized (not near-scale).
  const fu = Math.min(1.15, u);

  if (zone === "groomer" || zone === "base") {
    for (let i = 0; i < 5; i++) {
      const kx = viewL + wrapView(70 + i * 175, scroll * 0.9, 980);
      // Plant ON the snow band (gy); ramp rises, base buried
      const gy = ground(0.68 + (i % 3) * 0.08);
      drawSnowKicker(cx, kx, gy, (48 + (i % 2) * 12) * fu, (22 + (i % 3) * 5) * fu);
    }
    for (let i = 0; i < 5; i++) {
      const bx = viewL + wrapView(30 + i * 200, scroll, 1100);
      const gy = ground(0.78 + (i % 2) * 0.06);
      drawBannerPole(cx, bx, gy, (26 + (i % 3) * 4) * fu, i % 2 ? "#e8772e" : "#2bd17e");
    }
  }

  if (zone === "rails") {
    for (let i = 0; i < 6; i++) {
      const rx = viewL + wrapView(50 + i * 155, scroll, 1000);
      const gy = ground(0.62 + (i % 2) * 0.1);
      if (i % 3 === 0) {
        // Box seated on snow — bury + contact shadow
        cx.fillStyle = "rgba(40,70,100,.22)";
        cx.beginPath();
        cx.ellipse(rx + 22 * fu, gy + 2, 26 * fu, 4.5, 0, 0, 7);
        cx.fill();
        drawParkBox(cx, rx, gy - 8 * fu, 44 * fu, 12 * fu);
        cx.fillStyle = "#f0f4f8";
        cx.fillRect(rx - 2, gy, 48 * fu, 4);
      } else if (i % 3 === 1) {
        drawSnowKicker(cx, rx, gy, 46 * fu, 20 * fu);
      } else {
        drawParkRail(cx, rx, gy - 6 * fu, 52 * fu, (i % 2 ? -4 : 5) * fu);
      }
    }
    for (let i = 0; i < 3; i++) {
      const bx = viewL + wrapView(100 + i * 280, scroll, 900);
      drawBannerPole(cx, bx, ground(0.78), 24 * fu, i % 2 ? "#e8772e" : "#2bd17e");
    }
  }

  if (zone === "pro") {
    // No floating halfpipe — seated kickers + banners on the park band instead
    for (let i = 0; i < 4; i++) {
      const kx = viewL + wrapView(90 + i * 200, scroll, 920);
      const gy = ground(0.58 + (i % 3) * 0.1);
      drawSnowKicker(cx, kx, gy, (56 + (i % 2) * 12) * fu, (26 + (i % 3) * 5) * fu);
    }
    for (let i = 0; i < 4; i++) {
      const bx = viewL + wrapView(40 + i * 220, scroll, 1000);
      drawBannerPole(cx, bx, ground(0.72 + (i % 2) * 0.08), (26 + (i % 2) * 4) * fu, i % 2 ? "#e8772e" : "#70b8e8");
    }
  }

  if (zone === "night") {
    for (let i = 0; i < 6; i++) {
      const lx = viewL + wrapView(60 + i * 180, scroll, 1100);
      const ly = forestBot - 20 * u;
      const poolY = ground(0.5 + (i % 3) * 0.12);
      // Tower planted on snow
      cx.fillStyle = "rgba(255,255,255,.25)";
      cx.beginPath(); cx.ellipse(lx, poolY + 4, 10, 4, 0, 0, 7); cx.fill();
      cx.fillStyle = "#2a3440";
      cx.fillRect(lx - 2 * u, ly, 4 * u, poolY - ly);
      cx.fillStyle = "#8a96a4";
      cx.fillRect(lx - 8 * u, ly - 2 * u, 16 * u, 3 * u);
      // Warm light pools on the snow (readable against dark trees)
      const pool = cx.createRadialGradient(lx, poolY, 4, lx, poolY, 85 * fu);
      pool.addColorStop(0, "rgba(255,240,190,.7)");
      pool.addColorStop(0.3, "rgba(255,220,160,.35)");
      pool.addColorStop(0.65, "rgba(255,200,130,.12)");
      pool.addColorStop(1, "rgba(255,200,120,0)");
      cx.fillStyle = pool;
      cx.beginPath(); cx.ellipse(lx, poolY, 85 * fu, 26 * fu, 0, 0, 7); cx.fill();
      cx.fillStyle = "rgba(255,240,200,.98)";
      cx.beginPath(); cx.arc(lx, ly + 2 * fu, 3.8 * fu, 0, 7); cx.fill();
    }
  }

  void x0; void span;
}

/* —— near band —— */
function drawResortNear(d: DrawCtx) {
  const { cx, viewL, viewR, crestY, dist, t, look, landscape } = d;
  const scroll = (dist * 0.34) % 1400;
  const x0 = viewL - scroll - 50;
  const span = (viewR - viewL) + 1600;
  const zone = look.zone;
  const forest = look.forest;
  const snow = look.snow;
  const edge = crestY - (landscape ? 16 : 26);

  const sh = cx.createLinearGradient(0, edge - 30, 0, crestY + 16);
  if (zone === "bowl") {
    sh.addColorStop(0, "rgba(255,255,255,0)");
    sh.addColorStop(0.4, "rgba(236,230,240,.14)");
    sh.addColorStop(0.75, "rgba(255,210,180,.06)");
    sh.addColorStop(1, rgba(hexRgb(snow), 0.2));
  } else if (zone === "night") {
    sh.addColorStop(0, "rgba(255,255,255,0)");
    sh.addColorStop(0.5, "rgba(40,55,80,.16)");
    sh.addColorStop(1, "rgba(20,28,40,.12)");
  } else {
    // Stay snow-white — no blue water strip under the run
    sh.addColorStop(0, "rgba(255,255,255,0)");
    sh.addColorStop(0.55, rgba(hexRgb(snow), 0.2));
    sh.addColorStop(1, rgba(hexRgb(snow), 0.55));
  }
  cx.fillStyle = sh;
  cx.fillRect(x0, edge - 30, span, crestY - edge + 46);

  const u = faceScale(d);
  // Near trees stay readable but sparse — night especially thinned.
  const nTree = zone === "night" ? 6
    : zone === "pro" ? 7
    : (zone === "groomer" || zone === "rails" ? 9 : (zone === "bowl" ? 10 : 12));
  const step = (zone === "night" ? 110 : zone === "pro" ? 95 : (zone === "groomer" || zone === "rails" ? 80 : 62)) * Math.max(1, u * 0.7);
  const nearU = Math.min(u, 1.25);
  for (let i = 0; i < nTree; i++) {
    if ((zone === "groomer" || zone === "rails") && i % 3 === 1) continue;
    if (hash01(i * 11 + zone.length) < (zone === "night" ? 0.35 : 0.22)) continue;
    const tx = x0 + i * step + hash01(i * 9) * 18 * nearU;
    const th = (22 + hash01(i * 3) * 16) * nearU;
    drawConifer(cx, tx, edge + 10, th, forest[2], look.tint || snow, 1);
    if (zone !== "pro" && zone !== "night" && hash01(i * 5) > 0.5) {
      drawConifer(cx, tx + 8 * nearU, edge + 12, th * 0.65, forest[1], snow, 1);
    }
  }

  // Portrait fence only — landscape rope line read as a ground-level lift into JUMP
  if (zone !== "pro" && !landscape) {
    cx.strokeStyle = "rgba(120,90,60,.45)";
    cx.lineWidth = 1.2;
    for (let fi = 0; fi < 14; fi++) {
      const fx = x0 + fi * 80 + 14;
      cx.beginPath(); cx.moveTo(fx, edge + 8); cx.lineTo(fx, edge + 18); cx.stroke();
      if (fi % 2 === 0) {
        cx.beginPath(); cx.moveTo(fx, edge + 12); cx.lineTo(fx + 80, edge + 12); cx.stroke();
      }
    }
    for (let mi = 0; mi < 5; mi++) {
      const mx = x0 + mi * 190 + (zone === "base" ? 40 : 60);
      cx.fillStyle = mi % 2 ? "#e8772e" : "#2bd17e";
      cx.fillRect(mx, edge - 6, 4, 14);
      cx.fillStyle = "#e8eef4";
      cx.fillRect(mx - 1, edge - 8, 6, 3);
    }
  }

  // Near overhead lift — portrait only (landscape already has mid lift; avoids pole forest)
  if ((zone === "groomer" || zone === "rails") && !landscape) {
    const cy = edge - Math.min(70, 48 * u);
    cx.strokeStyle = "rgba(255,255,255,.35)";
    cx.lineWidth = Math.max(1.6, 2.2 * Math.min(u, 1.3));
    cx.beginPath(); cx.moveTo(x0, cy); cx.lineTo(x0 + span, cy + Math.sin(scroll * 0.002) * 4); cx.stroke();
    cx.strokeStyle = "rgba(28,36,48,.75)";
    cx.lineWidth = Math.max(1.2, 1.7 * Math.min(u, 1.3));
    cx.beginPath(); cx.moveTo(x0, cy); cx.lineTo(x0 + span, cy + Math.sin(scroll * 0.002) * 4); cx.stroke();
    for (let tw = 0; tw < 5; tw++) {
      const tx2 = x0 + tw * 240 + 20;
      cx.fillStyle = "#4a5564";
      cx.fillRect(tx2 - 2.5 * u, cy, 5 * u, edge - cy + 8);
      cx.fillStyle = "#8a96a4";
      cx.fillRect(tx2 - 8 * u, cy - 2.5 * u, 16 * u, 3.5 * u);
    }
    const cspan = 96;
    const phase = ((dist * 0.34) + t * 26) % cspan;
    for (let ci = 0; ci < 10; ci++) {
      drawChairSeat(cx, x0 + ci * cspan + phase, cy + 10 * u, 1.15 * Math.min(u, 1.35), "#3a4555", ci % 2 ? "#c4a06a" : "#2a3a50");
    }
  }

  if (zone === "bowl") {
    for (let li = 0; li < 6; li++) {
      const lx = x0 + li * 190 + 50;
      cx.fillStyle = "rgba(255,210,140,.85)";
      cx.beginPath(); cx.arc(lx, edge - 14, 3.4, 0, 7); cx.fill();
    }
  }

  if (zone === "night") {
    for (let li = 0; li < 6; li++) {
      const lx = x0 + li * 190 + 50;
      cx.fillStyle = "rgba(255,220,160,.9)";
      cx.beginPath(); cx.arc(lx, edge - 14, 3.4, 0, 7); cx.fill();
      const pool = cx.createRadialGradient(lx, edge + 8, 2, lx, edge + 8, 40);
      pool.addColorStop(0, "rgba(255,230,160,.28)");
      pool.addColorStop(1, "rgba(255,200,120,0)");
      cx.fillStyle = pool;
      cx.beginPath(); cx.ellipse(lx, edge + 10, 40, 12, 0, 0, 7); cx.fill();
    }
  }

  if (zone === "base") {
    const lx2 = viewL + wrapView(250, scroll, 700);
    drawPeopleDots(cx, lx2, edge + 4, 5, 41);
  }
}

function paintSnowSeam(d: DrawCtx) {
  const { cx, viewL, viewR, crestY, look } = d;
  const fogC = look.zone === "bowl" ? [210, 208, 222] as [number, number, number]
    : look.zone === "night" ? [40, 52, 72] as [number, number, number]
    : look.fog;
  const fogTop = crestY - 48;
  const fogBot = crestY + 24;
  const fog = cx.createLinearGradient(0, fogTop, 0, fogBot);
  fog.addColorStop(0, rgba(fogC, 0));
  fog.addColorStop(0.5, rgba(fogC, 0.18));
  fog.addColorStop(1, rgba(hexRgb(look.snow), 0.24));
  cx.fillStyle = fog;
  cx.fillRect(viewL - 40, fogTop, (viewR - viewL) + 80, fogBot - fogTop);
}

/** Soft elliptical HUD vignette (BD) — zero alpha well inside fill; no rect. */
export function paintHudVignette(
  cx: CanvasRenderingContext2D,
  cssX: number, cssY: number, rx: number, ry: number,
) {
  cx.save();
  cx.translate(cssX, cssY);
  cx.scale(1, ry / rx);
  const scrim = cx.createRadialGradient(0, 0, 0, 0, 0, rx * 0.88);
  scrim.addColorStop(0, "rgba(8,16,30,.42)");
  scrim.addColorStop(0.25, "rgba(8,16,30,.2)");
  scrim.addColorStop(0.5, "rgba(8,16,30,.07)");
  scrim.addColorStop(0.75, "rgba(8,16,30,.015)");
  scrim.addColorStop(1, "rgba(8,16,30,0)");
  cx.fillStyle = scrim;
  cx.beginPath();
  cx.arc(0, 0, rx, 0, 7);
  cx.fill();
  cx.restore();
}

export function paintParkBackdrop(opts: {
  cx: CanvasRenderingContext2D;
  viewL: number;
  viewR: number;
  clipTop: number;
  crestY: number;
  bot: number;
  dist: number;
  pX: number;
  t: number;
  landscape: boolean;
  treatment: ParkBgTreatment;
  backdropId: BackdropId;
}) {
  const setting = settingForBackdrop(opts.backdropId);
  const look = lookFor(setting);
  const d: DrawCtx = { ...opts, setting, look };
  drawSky(d);
  drawResortFar(d);
  drawResortMid(d);
  drawResortNear(d);
  paintSnowSeam(d);
}

export function parkSkyTop(id: BackdropId): string {
  return skyPalette(settingForBackdrop(id)).top;
}

export function parkIsDark(id: BackdropId): boolean {
  return skyPalette(settingForBackdrop(id)).dark;
}
