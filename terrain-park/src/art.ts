/**
 * Franz STOMP arcade 3D art — cropped TP-only atlas frames at 2× DPR
 * + resort backdrop styles (bg-bluebird / bg-night).
 * Global sprite factor: ride CSS = RIDER_H_FRAC × height for every atlas sprite.
 */

export type AtlasFrame = { x: number; y: number; w: number; h: number };

/** Franz rider v2 (Woman3) — every pose faces +X / downhill. Drop-in frame names. */
export const RIDER_FRAMES = {
  ride: { x: 0, y: 17, w: 150, h: 170 },
  air: { x: 154, y: 20, w: 142, h: 167 },
  indy: { x: 300, y: 14, w: 149, h: 173 },
  method: { x: 453, y: 4, w: 143, h: 183 },
  mute: { x: 600, y: 22, w: 137, h: 165 },
  stalefish: { x: 741, y: 6, w: 136, h: 181 },
  slide: { x: 881, y: 11, w: 146, h: 176 },
  land: { x: 1031, y: 0, w: 172, h: 187 },
  crash: { x: 1207, y: 7, w: 200, h: 180 },
} as const satisfies Record<string, AtlasFrame>;

/** Cropped world atlas — only frames Terrain Park draws. */
export const WORLD_FRAMES = {
  pine_tall: { x: 2, y: 0, w: 202, h: 375 },
  pine_small: { x: 206, y: 105, w: 134, h: 270 },
  patrol: { x: 2, y: 377, w: 123, h: 190 },
  skier: { x: 127, y: 377, w: 111, h: 190 },
  kicker: { x: 240, y: 377, w: 215, h: 135 },
} as const satisfies Record<string, AtlasFrame>;

/**
 * Franz Grom 1 (kid) — faces +X / downhill. Native÷2: ride ≈ 60 CSS px (~70% of adult).
 * grom_ride 91×120 · grom_sit 96×80 (2× atlas px).
 */
export const GROM_FRAMES = {
  grom_ride: { x: 0, y: 0, w: 91, h: 120 },
  grom_sit: { x: 95, y: 40, w: 96, h: 80 },
} as const satisfies Record<string, AtlasFrame>;

export type RiderFrameId = keyof typeof RIDER_FRAMES;
export type WorldFrameId = keyof typeof WORLD_FRAMES;
export type GromFrameId = keyof typeof GROM_FRAMES;
export type BackdropId = "bluebird" | "night";

/** Atlas pixel height of the ride pose (2×). Native CSS height = this / 2 = 85. */
export const RIDE_ATLAS_H = RIDER_FRAMES.ride.h;
export const RIDE_NATIVE_CSS = RIDE_ATLAS_H / 2;
/** Grom ride native CSS height (atlas÷2). */
export const GROM_RIDE_NATIVE_CSS = GROM_FRAMES.grom_ride.h / 2;

/** Opaque resort backdrop native size (1×). */
export const BG_W = 780;
export const BG_H = 520;

const RIDER_SRC = "./assets/rider-atlas@2x.webp";
const WORLD_SRC = "./assets/world-atlas@2x.webp";
const GROM_SRC = "./assets/grom-atlas@2x.webp";
const BG_SRC: Record<BackdropId, string> = {
  bluebird: "./assets/bg-bluebird.webp",
  night: "./assets/bg-night.webp",
};

export type ArtKit = {
  ready: boolean;
  rider: HTMLImageElement | null;
  world: HTMLImageElement | null;
  /** Franz kid obstacle atlas (sit + ride). */
  grom: HTMLImageElement | null;
  /** Lazy map — missing entry means not loaded yet. */
  bg: Partial<Record<BackdropId, HTMLImageElement | null>>;
  /** Average top-row sky color per backdrop (for seamless extension above cover). */
  bgSky: Partial<Record<BackdropId, string>>;
};

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Skip the flat upper sky slab (~top 8%). Keep peaks + red gondola through ~62%;
 * the densest near-tree fringe is dissolved in-engine into the slope snow so
 * the mid-frame reads resort mountains, not a tree wall. Foreground: ≤1–2 pines.
 */
/** Keep a touch more cloudy sky in the plate so the top seam isn't a hard cut. */
export const BG_SRC_TOP = Math.round(BG_H * 0.05);
export const BG_SRC_END = Math.round(BG_H * 0.62);
export const BG_SRC_H = BG_SRC_END - BG_SRC_TOP;

/** Sample average RGB from the backdrop content-top row — sky extension matches the art. */
export function sampleBgSky(img: HTMLImageElement): string {
  try {
    const natW = img.naturalWidth || img.width || BG_W;
    const natH = img.naturalHeight || img.height || BG_H;
    const srcY = Math.round((BG_SRC_TOP / BG_H) * natH);
    const w = Math.min(96, Math.max(1, natW));
    const c = document.createElement("canvas");
    c.width = w; c.height = 1;
    const x = c.getContext("2d", { willReadFrequently: true });
    if (!x) return "#6eb0e8";
    x.drawImage(img, 0, srcY, natW, 1, 0, 0, w, 1);
    const d = x.getImageData(0, 0, w, 1).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < w; i++) { r += d[i * 4]!; g += d[i * 4 + 1]!; b += d[i * 4 + 2]!; }
    return `rgb(${(r / w) | 0},${(g / w) | 0},${(b / w) | 0})`;
  } catch {
    return "#6eb0e8";
  }
}

function rememberSky(kit: ArtKit, id: BackdropId, img: HTMLImageElement | null) {
  if (!img) { kit.bgSky[id] = id === "night" ? "#0c1028" : "#6eb0e8"; return; }
  if (!kit.bgSky[id]) kit.bgSky[id] = sampleBgSky(img);
}

/** Load atlases + primary backdrop. Second backdrop loads lazily via ensureBackdrop. */
export async function loadArt(primary: BackdropId = "bluebird"): Promise<ArtKit> {
  // Primary backdrop only on first paint. Night (or the other look) loads on
  // demand via ensureBackdrop — keeps first-load under Ted's ~350 KB gzip budget.
  const [rider, world, grom, first] = await Promise.all([
    loadImg(RIDER_SRC),
    loadImg(WORLD_SRC),
    loadImg(GROM_SRC),
    loadImg(BG_SRC[primary]),
  ]);
  const kit: ArtKit = {
    ready: !!(rider && world),
    rider,
    world,
    grom,
    bg: { [primary]: first },
    bgSky: {},
  };
  rememberSky(kit, primary, first);
  return kit;
}

/** Ensure a backdrop image is loaded (idempotent). */
export async function ensureBackdrop(kit: ArtKit, id: BackdropId): Promise<HTMLImageElement | null> {
  if (kit.bg[id] !== undefined) {
    if (kit.bg[id] && !kit.bgSky[id]) rememberSky(kit, id, kit.bg[id] ?? null);
    return kit.bg[id] ?? null;
  }
  const img = await loadImg(BG_SRC[id]);
  kit.bg[id] = img;
  rememberSky(kit, id, img);
  return img;
}

/**
 * World-unit destination size.
 * spriteG = (RIDER_H_FRAC × playfieldCssH) / RIDE_NATIVE_CSS — same for every sprite.
 */
export function frameWu(frame: AtlasFrame, dpr: number, scale: number, spriteG: number) {
  const wuPerCss = dpr / Math.max(1e-6, scale);
  const g = wuPerCss * Math.max(0.05, spriteG);
  return { w: (frame.w / 2) * g, h: (frame.h / 2) * g };
}

/**
 * Draw an atlas frame bottom-aligned at (ax, groundY).
 * facing: +1 = as authored, -1 = mirror horizontally about ax.
 * rot: local slope for ground props (radians).
 */
export function drawAtlasFrame(
  cx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  frame: AtlasFrame,
  ax: number,
  groundY: number,
  dpr: number,
  scale: number,
  spriteG: number,
  facing: 1 | -1 = 1,
  rot = 0,
) {
  const { w, h } = frameWu(frame, dpr, scale, spriteG);
  cx.save();
  cx.translate(ax, groundY);
  if (rot) cx.rotate(rot);
  if (facing < 0) cx.scale(-1, 1);
  cx.drawImage(img, frame.x, frame.y, frame.w, frame.h, -w / 2, -h, w, h);
  cx.restore();
}
