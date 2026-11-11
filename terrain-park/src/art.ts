/**
 * Franz STOMP arcade 3D art — cropped TP-only atlas frames at 2× DPR
 * + resort backdrop styles (bg-bluebird / bg-night).
 * Global sprite factor: ride CSS = RIDER_H_FRAC × height for every atlas sprite.
 */

export type AtlasFrame = { x: number; y: number; w: number; h: number };

export const RIDER_FRAMES = {
  ride: { x: 0, y: 6, w: 145, h: 170 },
  air: { x: 149, y: 34, w: 134, h: 142 },
  indy: { x: 287, y: 4, w: 126, h: 172 },
  method: { x: 417, y: 6, w: 130, h: 170 },
  mute: { x: 551, y: 30, w: 125, h: 146 },
  stalefish: { x: 680, y: 0, w: 123, h: 176 },
  slide: { x: 807, y: 20, w: 144, h: 156 },
  land: { x: 955, y: 47, w: 135, h: 129 },
  crash: { x: 1094, y: 38, w: 152, h: 138 },
} as const satisfies Record<string, AtlasFrame>;

/** Cropped world atlas — only frames Terrain Park draws. */
export const WORLD_FRAMES = {
  pine_tall: { x: 2, y: 0, w: 202, h: 375 },
  pine_small: { x: 206, y: 105, w: 134, h: 270 },
  patrol: { x: 2, y: 377, w: 123, h: 190 },
  skier: { x: 127, y: 377, w: 111, h: 190 },
  kicker: { x: 240, y: 377, w: 215, h: 135 },
} as const satisfies Record<string, AtlasFrame>;

export type RiderFrameId = keyof typeof RIDER_FRAMES;
export type WorldFrameId = keyof typeof WORLD_FRAMES;
export type BackdropId = "bluebird" | "night";

/** Atlas pixel height of the ride pose (2×). Native CSS height = this / 2 = 85. */
export const RIDE_ATLAS_H = RIDER_FRAMES.ride.h;
export const RIDE_NATIVE_CSS = RIDE_ATLAS_H / 2;

/** Opaque resort backdrop native size (1×). */
export const BG_W = 780;
export const BG_H = 520;

const RIDER_SRC = "./assets/rider-atlas@2x.webp";
const WORLD_SRC = "./assets/world-atlas@2x.webp";
const BG_SRC: Record<BackdropId, string> = {
  bluebird: "./assets/bg-bluebird.webp",
  night: "./assets/bg-night.webp",
};

export type ArtKit = {
  ready: boolean;
  rider: HTMLImageElement | null;
  world: HTMLImageElement | null;
  /** Lazy map — missing entry means not loaded yet. */
  bg: Partial<Record<BackdropId, HTMLImageElement | null>>;
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

/** Load atlases + primary backdrop. Second backdrop loads lazily via ensureBackdrop. */
export async function loadArt(primary: BackdropId = "bluebird"): Promise<ArtKit> {
  const secondary: BackdropId = primary === "bluebird" ? "night" : "bluebird";
  const [rider, world, first] = await Promise.all([
    loadImg(RIDER_SRC),
    loadImg(WORLD_SRC),
    loadImg(BG_SRC[primary]),
  ]);
  const kit: ArtKit = {
    ready: !!(rider && world),
    rider,
    world,
    bg: { [primary]: first },
  };
  // Lazy-load the other resort look after first paint.
  const idle = (cb: () => void) => {
    const ric = (window as unknown as { requestIdleCallback?: (fn: () => void, opts?: { timeout: number }) => void }).requestIdleCallback;
    if (typeof ric === "function") ric(cb, { timeout: 1800 });
    else setTimeout(cb, 400);
  };
  idle(() => { void ensureBackdrop(kit, secondary); });
  return kit;
}

/** Ensure a backdrop image is loaded (idempotent). */
export async function ensureBackdrop(kit: ArtKit, id: BackdropId): Promise<HTMLImageElement | null> {
  if (kit.bg[id] !== undefined) return kit.bg[id] ?? null;
  const img = await loadImg(BG_SRC[id]);
  kit.bg[id] = img;
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
