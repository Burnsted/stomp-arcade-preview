/**
 * Franz STOMP arcade 3D art — cropped TP-only atlas frames at 2× DPR.
 * Resort backdrop is procedural (see park-backdrop.ts) — no photographic plates.
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

/** Cropped world atlas — pines + traffic. (Legacy atlas kicker crop left for BC; TP uses KICKER_FRAME.) */
export const WORLD_FRAMES = {
  pine_tall: { x: 2, y: 0, w: 202, h: 375 },
  pine_small: { x: 206, y: 105, w: 134, h: 270 },
  patrol: { x: 2, y: 377, w: 123, h: 190 },
  skier: { x: 127, y: 377, w: 111, h: 190 },
  /** Legacy crop — not drawn by Terrain Park after Franz snow kicker v1. */
  kicker: { x: 240, y: 377, w: 215, h: 135 },
} as const satisfies Record<string, AtlasFrame>;

/**
 * Franz Terrain Park kicker snow v1 — complete approach+lip+landing landform.
 * 424×135 at 2× (native÷2). Height unchanged → amp stays 67.5. Facing +X.
 */
export const KICKER_FRAME: AtlasFrame = { x: 0, y: 0, w: 424, h: 135 };

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
/**
 * Level setting ids (procedural park/resort). Legacy bluebird/night alias
 * main-park / night-park for older evidence helpers.
 */
export type BackdropId =
  | "bluebird"
  | "night"
  | "resort-base"
  | "alpine-bowl"
  | "dusk-glow"
  | "night-village"
  | "frozen-lake"
  | "open-snowfield";

/** Atlas pixel height of the ride pose (2×). Native CSS height = this / 2 = 85. */
export const RIDE_ATLAS_H = RIDER_FRAMES.ride.h;
export const RIDE_NATIVE_CSS = RIDE_ATLAS_H / 2;
/** Grom ride native CSS height (atlas÷2). */
export const GROM_RIDE_NATIVE_CSS = GROM_FRAMES.grom_ride.h / 2;
/** Kicker native CSS height (atlas÷2) — physics amp = 67.5. */
export const KICKER_NATIVE_CSS = KICKER_FRAME.h / 2;

/** Per-level park/resort setting (procedural). */
export const LEVEL_BACKDROPS: BackdropId[] = [
  "resort-base",    // 1 park base by the lodge
  "alpine-bowl",    // 2 main park midday
  "frozen-lake",    // 3 pro jump line
  "open-snowfield", // 4 rail garden flat light
  "dusk-glow",      // 5 sunset session
  "night-village",  // 6 night park under lights
  "resort-base",    // 7
  "alpine-bowl",    // 8
  "dusk-glow",      // 9
  "night-village",  // 10
  "alpine-bowl",    // 11 Endless
];

const RIDER_SRC = "./assets/rider-atlas@2x.webp";
const RIDER_RIG_SRC = "./assets/rider-rig@2x.webp";
const RIDER_RIG_JSON = "./assets/rider-rig.json";
const WORLD_SRC = "./assets/world-atlas@2x.webp";
const GROM_SRC = "./assets/grom-atlas@2x.webp";
const KICKER_SRC = "./assets/kicker@2x.webp";
const KICKER_FALLBACK_SRC = "./assets/kicker@2x.png";

/** Dark / warm settings that need night-style fill light on the rider. */
export function isDarkBackdrop(id: BackdropId): boolean {
  return id === "night" || id === "night-village" || id === "dusk-glow";
}

/** One cutout layer from Woman3 ride (atlas px + rest pose in ride-frame px). */
export type RigPart = {
  x: number; y: number; w: number; h: number;
  pivotX: number; pivotY: number;
  restX: number; restY: number;
};

/** Woman3 side-profile cutout rig metadata (derived from approved ride frame). */
export type RiderRigMeta = {
  src: string;
  frameW: number;
  frameH: number;
  profile: boolean;
  parts: Record<string, RigPart>;
};

export type ArtKit = {
  ready: boolean;
  rider: HTMLImageElement | null;
  /** Cutout layers for articulated Woman3 side-profile rig. */
  rig: HTMLImageElement | null;
  rigMeta: RiderRigMeta | null;
  world: HTMLImageElement | null;
  /** Franz kid obstacle atlas (sit + ride). */
  grom: HTMLImageElement | null;
  /** Franz TP kicker snow v1 (standalone; not world-atlas). */
  kicker: HTMLImageElement | null;
  /** Always null — backdrops are procedural (kept for API compatibility). */
  bg: Partial<Record<BackdropId, HTMLImageElement | null>>;
  /** Sky top color per setting (from park-backdrop palette). */
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

async function loadJson<T>(src: string): Promise<T | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Load atlases only — no photographic backdrop plates on first paint. */
export async function loadArt(_primary: BackdropId = "resort-base"): Promise<ArtKit> {
  const [rider, rig, rigMeta, world, grom, kickerWebp] = await Promise.all([
    loadImg(RIDER_SRC),
    loadImg(RIDER_RIG_SRC),
    loadJson<RiderRigMeta>(RIDER_RIG_JSON),
    loadImg(WORLD_SRC),
    loadImg(GROM_SRC),
    loadImg(KICKER_SRC),
  ]);
  const kicker = kickerWebp || await loadImg(KICKER_FALLBACK_SRC);
  return {
    ready: !!((rig && rigMeta) || rider) && !!world,
    rider,
    rig: rig && rigMeta ? rig : null,
    rigMeta: rig && rigMeta ? rigMeta : null,
    world,
    grom,
    kicker,
    bg: {},
    bgSky: {},
  };
}

/** No-op for procedural backdrops (idempotent API kept for engine callers). */
export async function ensureBackdrop(kit: ArtKit, id: BackdropId): Promise<HTMLImageElement | null> {
  kit.bg[id] = null;
  if (!kit.bgSky[id]) kit.bgSky[id] = isDarkBackdrop(id) ? "#0c1028" : "#4f96d0";
  return null;
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
