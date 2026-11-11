/** Terrain Park — tip build. Park identity, not a dodge corridor. */

import {
  loadArt, ensureBackdrop, drawAtlasFrame, frameWu, RIDER_FRAMES, WORLD_FRAMES, GROM_FRAMES,
  RIDE_ATLAS_H, RIDE_NATIVE_CSS,
  BG_W, BG_H, BG_SRC_TOP, BG_SRC_END, BG_SRC_H,
  type ArtKit, type RiderFrameId, type BackdropId,
} from "./art";

export const VERSION = "0.5.1-next";

const VH = 360;
const GROUND = 300;
const GRAVITY = 3600;
const JV = -950;
const DT = 1 / 120;
const AIR = (2 * -JV) / GRAVITY;
/** One full hold across a flat jump lands on exactly one rotation (no floaty stretch). */
const SPIN = (Math.PI * 2) / AIR;
/** Second tap in air — one small extra lift, once per airtime (not a repeat jump). */
const AIR_BOOST_FRAC = 0.14;
/** Max pointer/key down duration to count as a tap (not a hold/flip). */
const TAP_MS = 150;
/** Landing window (°): must be within this of a half/full turn on each axis or crash. */
const SPIN_LAND_WIN_DEG = 30;
/** Below this absolute rotation on an axis, treat as no-rotation on that axis. */
const SPIN_NO_DEG = 25;
/** Each post-boost air tap adds one half-turn (180°) of yaw spin. */
const TAP_SPIN_HALF = Math.PI;
/** Scored yaw tiers (degrees) from tap spins. */
const SPIN_TIERS_DEG = [360, 540, 720, 900, 1080] as const;
/** Tunable points per completed yaw tier (clean land). */
const SPIN_PTS: Record<number, number> = {
  360: 100,
  540: 150,
  720: 300,
  900: 450,
  1080: 700,
};
/** Cap tap-yaw at the top scored tier. */
const YAW_MAX = (1080 * Math.PI) / 180;
const LIP_WIN = 0.2;
const POST_LIP = 0.4;
const GRIND_FRIC = 0.88;
const SPD_BASE = 1;
const SPD_PER_2LV = 0.02;
const SPD_CAP = 1.1;
const COMBO_NEED = 3;
const COMBO_BOOST = 1.14;
const COMBO_T = 1.55;
const LIVES_MAX = 5;
const LIFE_PAUSE = 1.25;
const HEART_SCORE = 380;
const LIP_PTS = 35;
const RAMP_PTS = 45;
const HEART_MIN_LV = 5;
const LEN_MUL = 1.5;
const STORY = 10;
const TAU = Math.PI * 2;
const HAZARD_LEAD = 0.82;
/**
 * Standing rider + board as a fraction of playfield height in BOTH orientations.
 * Global atlas factor spriteG = (RIDER_H_FRAC × cssH) / RIDE_NATIVE_CSS.
 */
const RIDER_H_FRAC = 0.10;
/** Reference ride height in world units (matches native CSS px at spriteG=1). */
const RIDER_STAND_WU = RIDE_NATIVE_CSS; // 85

type Diff = { id: string; name: string; spd: number; pit: number; space: number; lip: number };
type FeatDef = {
  w: number; h: number; ride?: number; grind?: number; haz?: number; mob?: number; terr?: number;
  arch?: number; ap?: number; dk?: number; ex?: number; amp?: number; gap?: number; r?: number;
  vx?: number; s?: string; lab: string; kick?: number;
};
/** Named park goals — score from tricks only (no collectible stars). */
type Trick = {
  t: "spin" | "grab" | "rail" | "combo" | "air";
  n: number;
  lab: string;
  /** Optional exact name match, e.g. "Frontside 360", "Indy", "Boardslide". */
  want?: string;
};
type Level = {
  n: number; name: string; sub: string; park: string[]; base: number; ramp: number; max: number;
  len: number; gapX: number; dense: number; trick: Trick; endless?: boolean;
  mob: number; skiers: boolean; s1: number; s2: number; s3: number;
};
type Feat = {
  k: string; wx: number; w: number; h: number; hit?: boolean; lip?: boolean; arch?: number; down?: number;
  kink?: number; step?: number; variant?: "table" | "step";
  ap: number; dk: number; ex: number; amp: number; gap: number; r: number; vx: number; ph: number; kind?: string;
  railTrick?: number; labeled?: number;
  /** Cosmetic snow buildup 0–1 on rails/boxes. */
  snowCap?: number;
  /** Franz kid pose — sit on decks/runouts; ride crosses flat gaps. */
  pose?: "sit" | "ride";
  /** Cleared by jumping over (one-shot bonus). */
  cleared?: boolean;
};
type Part = { x: number; y: number; vx: number; vy: number; l: number; c: string; s: number };
type Pop = { x: number; y: number; l: number; txt: string };
type Pickup = { x: number; y: number; vy: number; a: number; k: "heart"; pts?: number; sz?: number };
type Rider = { x: number; y: number; vy: number; on: boolean };
type GrabId = "Indy" | "Melon" | "Mute" | "Stalefish" | "Method" | "Tail" | "Nose" | null;
type GrindStyle = "fifty" | "boardslide" | "lipslide" | "nose" | "tail";

export type Mode = "ready" | "play" | "pause" | "menu" | "legend" | "over" | "clear";

export type Snap = {
  mode: Mode;
  muted: boolean;
  levelName: string;
  levelN: number;
  endless: boolean;
  lives: number;
  primary: "PLAY" | "JUMP" | "RETRY" | "NEXT";
  showJump: boolean;
  showResume: boolean;
  hint: string | null;
  showLegend: boolean;
  pb: number;
  careerStars: number;
  diffId: string;
  diffs: Diff[];
  levels: {
    n: number; name: string; sub: string; unlocked: boolean; done: boolean; best: number;
    stars: number; goal: string; endless: boolean;
  }[];
  boards: { id: string; name: string; spd: number; open: boolean; selected: boolean; how: string; tag: string; c: string; s: string }[];
  nowName: string;
  nowTag: string;
  nextName: string | null;
  nextHow: string;
  nextTag: string;
  showReplay: boolean;
  showNext: boolean;
  showPlay: boolean;
  runStars: number;
  bestStars: number;
  starGoal: number;
  runScore: number;
  goalDone: boolean;
  confirmReset: boolean;
};

const DIFFS: Record<string, Diff> = {
  easy: { id: "easy", name: "Easy", spd: 0.86, pit: 0.82, space: 1.28, lip: 1.28 },
  normal: { id: "normal", name: "Normal", spd: 1, pit: 1, space: 1, lip: 1 },
  hard: { id: "hard", name: "Hard", spd: 1.18, pit: 1.34, space: 1.2, lip: 0.72 },
};

const FEAT: Record<string, FeatDef> = {
  // ap=approach, dk=deck/knuckle half, ex=landing run — kickers need a long sloped landing.
  hit: { w: 0, h: 0, terr: 1, ap: 44, dk: 10, ex: 52, amp: 24, lab: "Hit" },
  // Rail/kicker hitboxes match Franz atlas CSS sizes (native÷2 on the shared 2× ruler).
  // Physical deck height above snow (wu). Atlas rail tile is decorative only —
  // continuous tube uses this + railDeck; keep 42.5 so tests/spawn packs match.
  rail: { w: 280, h: 42.5, grind: 1, lab: "Rail" },
  log: { w: 210, h: 16, ride: 1, grind: 1, lab: "Log slide" },
  box: { w: 160, h: 14, ride: 1, grind: 1, lab: "Box" },
  flat: { w: 0, h: 0, terr: 1, ap: 54, dk: 86, ex: 78, amp: 28, lab: "Flat top" },
  kicker: { w: 0, h: 0, terr: 1, ap: 72, dk: 16, ex: 118, amp: WORLD_FRAMES.kicker.h / 2, lab: "Kicker", kick: 1 },
  // Franz Grom 1 — native÷2 (~60 CSS ride ≈ 70% of adult). Sit uses shorter hitbox.
  grom: { w: GROM_FRAMES.grom_ride.w / 2, h: GROM_FRAMES.grom_ride.h / 2, mob: 1, vx: 30, lab: "Grom" },
  skier: { w: WORLD_FRAMES.skier.w / 2, h: WORLD_FRAMES.skier.h / 2, mob: 1, vx: 72, lab: "Skier" },
};

/** Scripted best-combo order from docs/terrain-park-layouts/PARK-LAYOUT-RESEARCH.md */
const LINE_SEQ: Record<number, string[]> = {
  1: ["hit", "box", "hit", "log", "hit"],
  2: ["box", "rail", "log", "rail", "hit"],
  3: ["hit", "box", "kicker", "rail", "kicker"],
  4: ["box", "hit", "flat", "log", "kicker"],
  5: ["hit", "box", "rail", "flat", "kicker", "rail"],
  6: ["box", "hit", "kicker", "rail", "flat", "kicker"],
  7: ["rail", "box", "log", "hit", "flat", "rail"],
  8: ["box", "hit", "flat", "rail", "kicker", "log"],
  9: ["hit", "box", "rail", "flat", "kicker", "rail", "kicker"],
  10: ["box", "rail", "hit", "flat", "kicker", "log", "kicker"],
  11: ["hit", "box", "rail", "flat", "kicker", "log"],
};

const LEVELS: Level[] = [
  { n: 1, name: "Butter Hits", sub: "Warm-up rollers", park: ["hit", "box", "log", "hit"], base: 268, ramp: 1.6, max: 320, len: 4400, gapX: 1.28, dense: 0.9, mob: 0.22, skiers: false, s1: 180, s2: 390, s3: 560, trick: { t: "grab", n: 2, lab: "Land 2 grabs" } },
  { n: 2, name: "Rail Garden", sub: "Jib garden", park: ["rail", "box", "log", "hit"], base: 276, ramp: 1.8, max: 340, len: 5200, gapX: 1.2, dense: 0.88, mob: 0.28, skiers: false, s1: 350, s2: 750, s3: 1050, trick: { t: "rail", n: 1, lab: "Boardslide", want: "Boardslide" } },
  { n: 3, name: "Kicker Line", sub: "Small jump pack", park: ["kicker", "hit", "rail", "box"], base: 284, ramp: 2, max: 360, len: 6000, gapX: 1.14, dense: 0.86, mob: 0.36, skiers: true, s1: 430, s2: 920, s3: 1300, trick: { t: "spin", n: 1, lab: "Frontside 360", want: "Frontside 360" } },
  { n: 4, name: "Flat Tops", sub: "Tables then lip", park: ["flat", "kicker", "box", "hit"], base: 292, ramp: 2.2, max: 380, len: 6800, gapX: 1.08, dense: 0.84, mob: 0.38, skiers: true, s1: 220, s2: 480, s3: 720, trick: { t: "grab", n: 1, lab: "Indy grab", want: "Indy" } },
  { n: 5, name: "The Park", sub: "Full progression lap", park: ["hit", "box", "rail", "flat", "kicker"], base: 304, ramp: 2.5, max: 410, len: 7800, gapX: 1.02, dense: 0.82, mob: 0.4, skiers: true, s1: 320, s2: 690, s3: 980, trick: { t: "rail", n: 1, lab: "50-50 grind", want: "50-50" } },
  { n: 6, name: "Pop Line", sub: "Kicker pack", park: ["kicker", "flat", "rail", "hit", "box"], base: 316, ramp: 2.8, max: 440, len: 8800, gapX: 0.96, dense: 0.8, mob: 0.44, skiers: true, s1: 400, s2: 850, s3: 1200, trick: { t: "spin", n: 1, lab: "Backside 180", want: "Backside 180" } },
  { n: 7, name: "Slide Street", sub: "Steel and wood", park: ["rail", "box", "log", "hit", "flat"], base: 330, ramp: 3.1, max: 480, len: 9800, gapX: 0.9, dense: 0.78, mob: 0.48, skiers: true, s1: 290, s2: 620, s3: 880, trick: { t: "rail", n: 1, lab: "Nose press", want: "Nose Press" } },
  { n: 8, name: "Chain", sub: "Link the lap", park: ["box", "flat", "rail", "kicker", "log"], base: 346, ramp: 3.5, max: 530, len: 11000, gapX: 0.84, dense: 0.74, mob: 0.52, skiers: true, s1: 370, s2: 790, s3: 1100, trick: { t: "combo", n: 1, lab: "Spin + grab combo" } },
  { n: 9, name: "Full Line", sub: "Bigger spins", park: ["hit", "box", "rail", "flat", "kicker"], base: 364, ramp: 4, max: 590, len: 12400, gapX: 0.78, dense: 0.7, mob: 0.56, skiers: true, s1: 270, s2: 590, s3: 840, trick: { t: "spin", n: 1, lab: "Frontside 540", want: "Frontside 540" } },
  { n: 10, name: "Pro Park", sub: "Closing kickers", park: ["box", "rail", "flat", "kicker", "log"], base: 384, ramp: 4.6, max: 660, len: 14000, gapX: 0.72, dense: 0.66, mob: 0.62, skiers: true, s1: 400, s2: 870, s3: 1220, trick: { t: "combo", n: 1, lab: "Backside 360 Indy", want: "Backside 360 Indy" } },
];

const ENDLESS: Level = { n: 11, name: "Endless", sub: "Park forever", park: ["hit", "box", "rail", "flat", "kicker", "log"], base: 340, ramp: 5, max: 720, len: Infinity, gapX: 0.7, dense: 0.64, endless: true, mob: 0.66, skiers: true, s1: 400, s2: 900, s3: 1600, trick: { t: "combo", n: 3, lab: "Chain 3 named tricks" } };

const BOARDS = [
  { id: "grom", name: "Grom Deck", c: "#e85a2a", s: "#ffe8d0", spd: 1, grind: 1, pop: 1, lip: 1.22, need: 0, how: "Starter · wider lip" },
  { id: "log", name: "Log Cruiser", c: "#6b3a1f", s: "#e7c49a", spd: 1.06, grind: 1.35, pop: 1, lip: 1.06, need: 1, how: "Clear line 1 · grind pays" },
  { id: "rail", name: "Rail Steel", c: "#8a94a4", s: "#e8eef8", spd: 1.1, grind: 1.55, pop: 1.04, lip: 1, need: 3, how: "Clear line 3 · skier line" },
  { id: "kick", name: "Kicker Pop", c: "#e8772e", s: "#f7f4fb", spd: 1.14, grind: 1.1, pop: 1.16, lip: 0.96, need: 6, how: "Clear 6 lines · bigger pop" },
  { id: "pro", name: "Pro Park", c: "#ff2d55", s: "#ffd84a", spd: 1.2, grind: 1.4, pop: 1.12, lip: 1.08, need: 10, how: "Clear all 10" },
];

const LESSON: Record<number, string> = { 1: "hit", 2: "rail", 3: "kicker", 4: "flat" };
const TEACH: Record<number, string[]> = {
  1: ["hit", "box", "hit"],
  2: ["rail", "box", "hit"],
  3: ["kicker", "hit", "rail"],
  4: ["flat", "kicker", "box"],
};

function easeInOut(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** Base roller amplitude by line — amplified so the slope actually rides downhill. */
const HILL = [0, 28, 32, 36, 40, 44, 48, 52, 56, 60, 62];
  // Drawn MT_* mountain stacks removed — opaque resort backdrops provide scenery.

type Progress = { done: number[]; best: Record<string, number>; stars: number; diff: string; board: string };
type SaveShape = { progress: Progress; pb: number; mute: boolean; hint: boolean; legend: boolean };

function loadSave(): SaveShape {
  const blank: SaveShape = { progress: { done: [], best: {}, stars: 0, diff: "normal", board: "grom" }, pb: 0, mute: false, hint: false, legend: false };
  try {
    const raw = localStorage.getItem("terrainPark.progress");
    if (raw) {
      const p = JSON.parse(raw) as Partial<Progress>;
      blank.progress = { done: p.done || [], best: p.best || {}, stars: p.stars || 0, diff: p.diff || "normal", board: p.board || "grom" };
    }
    blank.pb = +(localStorage.getItem("terrainPark.pb") || 0);
    blank.mute = localStorage.getItem("terrainPark.mute") === "1";
    blank.hint = localStorage.getItem("terrainPark.hint") === "1";
    blank.legend = localStorage.getItem("terrainPark.legend2") === "1";
  } catch {
    /* private mode must not abort boot — that blanked Boulder Dodge */
  }
  return blank;
}

function store(key: string, val: string) {
  try { localStorage.setItem(key, val); } catch { /* ignore */ }
}

function mkRand(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; };
}

function lineLength(len: number) {
  return Number.isFinite(len) ? len * LEN_MUL : len;
}

export function starsFor(sc: number, gates: readonly [number, number, number]) {
  return sc >= gates[2] ? 3 : sc >= gates[1] ? 2 : sc >= gates[0] ? 1 : 0;
}

type Flake = { x: number; y: number; r: number; z: number; vx: number };
type State = {
  feats: Feat[]; parts: Part[]; pops: Pop[]; flakes: Flake[];
  /** Signed ambient wind (−1…1). Gusts add on top via gustT. */
  wind: number; windDir: number; gustT: number; windLabelT: number;
  pickups: Pickup[]; pickT: number; grindPts: number; lipPts: number;
  flipPts: number; comboPts: number; combo: number; boostT: number; grindT: number; grindOn: Feat | null;
  lipHit: Record<number, number>; flash: number; land: number; landBad: number; hop: number; climbVy: number;
  mode: Mode; prevMode: Mode; t: number; dist: number; spd: number; p: Rider; nextX: number; shake: number;
  done: boolean; flip: number; holding: boolean; lastTap: number; playAt: number; trickProg: number;
  trickDone: boolean; trickFlips: number; trickRamps: number; trickCombos: number; trickGrabs: number; trickRails: number;
  airFrom: string | null;
  /** Once per airtime: second tap already spent on the small air boost. */
  airBoostUsed: boolean;
  /** Tap-yaw spin (radians). Hold backflips stay on `flip`; taps add half-turns here. */
  yaw: number;
  /** +1 frontside, −1 backside. */
  spinDir: number;
  grab: GrabId;
  /** 0→1 grab pose blend (ease in while held, ease out on release). */
  grabEase: number;
  /** True while input wants the grab held; false starts release before landing. */
  grabHeld: boolean;
  /** Shoulder wind-up 0→1 while holding on snow before takeoff. */
  windup: number;
  grindStyle: GrindStyle;
  grindExit: boolean; heartFlashT: number; heartGainT: number; heartAt: number; lostHeart: number;
  autoRetry: boolean; gameOver: boolean; postLip: number; lessonPlaced: boolean; missed: boolean; achT: number; achToast: string;
  lastTrickName: string;
};

export type Game = {
  press: () => void;
  hold: (v: boolean) => void;
  aim: (dx: number, dy: number) => void;
  togglePause: () => void;
  toggleMute: () => void;
  openMenu: () => void;
  closeMenu: () => void;
  dismissLegend: () => void;
  openLegend: () => void;
  replay: () => void;
  nextLine: () => void;
  startLevel: (n: number, keepLives?: boolean) => void;
  setDiff: (id: string) => void;
  selectBoard: (id: string) => void;
  resetProgress: () => void;
  resize: () => void;
  destroy: () => void;
  getSnap: () => Snap;
};

export function createGame(canvas: HTMLCanvasElement, onSnap: (s: Snap) => void): Game {
  const got = canvas.getContext("2d");
  if (!got) throw new Error("Canvas unavailable");
  const cx: CanvasRenderingContext2D = got;
  const save0 = loadSave();
  let PR = save0.progress;
  let pb = save0.pb;
  let muted = save0.mute;
  let hintSeen = save0.hint;
  let legendSeen = save0.legend;
  let lives = LIVES_MAX;
  let LV: Level = LEVELS[0]!;
  let god = false;
  let reduce = false;
  /** Pointer currently down (may become a hold after TAP_MS). */
  let pressArmed = false;
  /** performance.now() of the current press. */
  let pressAt = 0;
  /** This press already took off from snow/rail — release must not air-tap. */
  let pressJumped = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* ignore */ }

  let rng = mkRand(1);
  let rngP = mkRand(2);
  let rngB = mkRand(3);
  let TER = [0, 0, 0];
  let W = 640;
  let scale = 1;
  let OY = 0;
  let worldH = VH;
  /** Horizontal camera shift (world units). Steady side-scroll; rider ~32% from left. */
  let camX = 0;
  /** Y (world, after OY) where white snow fill stops on tall phones. */
  let snowFloor = VH;
  let tallPhone = false;
  /** Overview zoom-out for debug line captures (camera only). */
  let overviewCam = false;
  /** Slow vertical anchor (bare-snow filter). Rollers/jumps do not yank this. */
  let camAnchorY = GROUND;
  let camOYPrev = 0;
  let camOYVel = 0;
  let camXPrev = 0;
  let lastDist = 0;
  /** Camera never rotates — kept for Playwright asserts. */
  const CAM_ROT = 0;
  /** Ignore roller wobble inside this band; sustained fall-line still catches up. */
  const CAM_Y_DEAD = 22;
  const CAM_Y_RATE = 2.6;
  const CAM_Y_VEL_CAP = 64;
  const CAM_X_RATE = 2.2;
  /** Phone snow budget — keep particle work light. */
  const FLAKE_CAP = 64;
  let landscape = false;
  /** Foreground decor bboxes (world, after cam) for overlap asserts. */
  let fgDbg: { x: number; y: number; w: number; h: number; k: string }[] = [];
  let acc = 0;
  let last = 0;
  let overAt = 0;
  let raf = 0;
  let alive = true;
  let sig = "";
  let resetArm = false;
  let mobI = 0;
  let seqI = 0;
  let teachI = 0;
  let sideHitPending = false;
  let bonusKickPending = false;
  /** Spawn census for Playwright restore coverage. */
  const census: Record<string, number> = Object.create(null);
  /** Where “How tricks work” should return (menu or pause). Kept off prevMode so menu→legend→menu still restores the pre-menu pause. */
  let legendFrom: Mode | null = null;
  /** Last-frame upright trees for Playwright (rot always 0). */
  let treeDbg: { x: number; y: number; w: number; h: number; rot: number }[] = [];
  /** When set, draw() paints the pose QA sheet instead of the ride (frozen for screenshots). */
  let poseSheetLock = false;
  /** Franz atlases + resort backdrops — null/failed → vector / skip fallback. */
  let art: ArtKit = { ready: false, rider: null, world: null, grom: null, bg: {}, bgSky: {} };
  /** At most one Franz grom per gap between park features (from level 2). */
  let gapHasGrom = false;
  /** Forced backdrop for evidence shots; null = alternate by level. */
  let bgForce: BackdropId | null = null;
  /** Global sprite factor from playfield height (1 = native÷2 CSS = 85px ride). */
  let spriteG = 1;
  let playCssH = 844;
  void loadArt(backdropForLevel(1)).then((kit) => { art = kit; draw(); });

  function backdropForLevel(n: number): BackdropId {
    // Alternate resort looks: bluebird day runs ↔ floodlit night park.
    return n % 2 === 0 ? "night" : "bluebird";
  }
  function activeBackdrop(): BackdropId {
    return bgForce || backdropForLevel(LV?.n || 1);
  }
  function atlasDpr() { return window.devicePixelRatio || 1; }
  function artOk() { return !!(art.ready && art.rider && art.world); }
  function sprWu(frame: { w: number; h: number }) {
    return frameWu(frame, atlasDpr(), scale, spriteG);
  }
  /** Soft elliptical contact shadow under a ground prop / rider. */
  function contactShadow(ax: number, groundY: number, rw: number, rh = 4, a = 0.22) {
    cx.save();
    cx.fillStyle = `rgba(90,120,150,${a})`;
    cx.beginPath();
    cx.ellipse(ax, groundY + 1.2, Math.max(7, rw), Math.max(2.4, rh), 0, 0, 7);
    cx.fill();
    cx.fillStyle = `rgba(90,120,150,${a * 0.4})`;
    cx.beginPath();
    cx.ellipse(ax, groundY + 1.6, Math.max(10, rw * 1.3), Math.max(3.2, rh * 1.35), 0, 0, 7);
    cx.fill();
    cx.restore();
  }

  let ac: AudioContext | null = null;
  let noiseBuf: AudioBuffer | null = null;
  let scrapeNodes: { src: AudioBufferSourceNode; bp: BiquadFilterNode; grind: boolean } | null = null;
  let scrapeGain: GainNode | null = null;

  const S = {} as State;

  function saveP() { store("terrainPark.progress", JSON.stringify(PR)); }
  function diff() { return DIFFS[PR.diff] || DIFFS.normal!; }
  function clearedN() { return PR.done.filter((n) => n >= 1 && n <= STORY).length; }
  function endlessOpen() { for (let i = 1; i <= STORY; i++) if (!PR.done.includes(i)) return false; return true; }
  function unlocked(n: number) { return n === 1 || PR.done.includes(n - 1) || (n === STORY + 1 && endlessOpen()); }
  function boardOpen(b: (typeof BOARDS)[number]) { return !b.need || clearedN() >= b.need; }
  function board() { return BOARDS.find((b) => b.id === PR.board && boardOpen(b)) || BOARDS[0]!; }
  function boardSpd() { return board().spd; }
  function boardTag(b: (typeof BOARDS)[number]) {
    const bits = ["speed ×" + b.spd.toFixed(2)];
    if (b.grind > 1.02) bits.push("grind ×" + b.grind.toFixed(2));
    if (b.pop > 1.02) bits.push("pop ×" + b.pop.toFixed(2));
    if (b.lip > 1.02) bits.push("wider lip");
    return bits.join(" · ");
  }
  function gatesOf(L: Level): [number, number, number] { return [L.s1, L.s2, L.s3]; }
  function careerFromBest() {
    return LEVELS.reduce((n, L) => n + starsFor(PR.best[L.n] || 0, gatesOf(L)), 0);
  }
  function levelSpd() { return Math.min(SPD_CAP, SPD_BASE + Math.floor((Math.min(LV.n, STORY) - 1) / 2) * SPD_PER_2LV); }
  function runSpd() { return boardSpd() * levelSpd() * diff().spd * (S.boostT > 0 ? COMBO_BOOST : 1) * (S.landBad > 0 ? 0.93 : 1); }
  function lenNow() { return lineLength(LV.len); }
  function score() { return S.grindPts + S.lipPts + S.flipPts + S.comboPts; }
  function seed(s: number) {
    rng = mkRand(s); rngP = mkRand((s ^ 0x85ebca6b) >>> 0); rngB = mkRand((s ^ 0xc2b2ae35) >>> 0);
    const rt = mkRand((s ^ 0x27d4eb2f) >>> 0);
    TER = [rt() * 6.283, rt() * 6.283, rt() * 6.283];
  }
  /**
   * Fall-line grade (world-Y per world-X). Positive = descend on screen as you ride right.
   * Kept steeper than peak roller amplitude so short windows still net downhill.
   */
  const FALL_GRADE = 0.16;
  /** Varied downhill pack: rollers/pitches/banks on top of a clear descending grade. */
  function terr(wx: number) {
    const A = (HILL[LV.n] || 28) * 0.5;
    const rollers = A * (
      0.46 * Math.sin(wx / 320 + TER[0]!) +
      0.28 * Math.sin(wx / 160 + TER[1]!) +
      0.18 * Math.sin(wx / 72 + TER[2]!) +
      0.08 * Math.sin(wx / 50 + TER[0]! * 1.7)
    );
    const pitch = A * 0.22 * Math.sin(wx / 820 + TER[1]! * 0.6);
    const banks = A * 0.1 * Math.sin(wx / 220 + TER[2]! * 1.3);
    // Uncapped downhill — features step down the mountain left→right.
    return rollers + pitch + banks + wx * FALL_GRADE;
  }
  function featH(wx: number) {
    let h = 0;
    for (const f of S.feats) {
      const d = FEAT[f.k];
      if (!d?.terr) continue;
      const dx = wx - f.wx;
      const L = -(f.ap + f.dk);
      const R = f.dk + f.ex;
      if (dx <= L || dx >= R) continue;
      // Step-down tables raise the lip so the landing drops further than a flat tabletop.
      const lipH = terr(f.wx) - f.amp - (f.step || 0);
      // Curved takeoff → flat deck/knuckle → long eased landing back onto the slope.
      if (dx < -f.dk) h += (lipH - terr(f.wx - f.dk)) * easeInOut((dx - L) / Math.max(1, f.ap));
      else if (dx <= f.dk) h += lipH - terr(wx);
      else h += (lipH - terr(f.wx + f.dk)) * (1 - easeInOut((dx - f.dk) / Math.max(1, f.ex)));
    }
    return h;
  }
  function H(sx: number) { return terr(S.dist + sx - S.p.x) + featH(S.dist + sx - S.p.x); }
  function gY(sx: number) { return GROUND + H(sx); }
  /** Snow height without park features — trees stand on this, never on a ramp. */
  function snowY(sx: number) { return GROUND + terr(S.dist + sx - S.p.x); }
  function slopeAt(sx: number) { return Math.atan2(H(sx + 6) - H(sx - 6), 12); }
  function worldX(sx: number) { return S.dist + sx - S.p.x; }
  /** Half-thickness of the continuous rail tube (wu) — grind snaps to the top. */
  const RAIL_TUBE_TOP = 3.15;
  function railDeck(f: Feat, tt: number) {
    // Ride-on nose → down / flat-down / A-frame (kink peak mid-rail).
    // Returns height of tube CENTER above snow; board rides RAIL_TUBE_TOP above center.
    const ramp = Math.min(1, Math.max(0, tt / 0.18));
    let h = f.h * ramp + (f.down || 0) * tt * ramp;
    if (f.kink) {
      const mid = 1 - Math.abs(tt - 0.5) * 2;
      h += f.kink * Math.max(0, mid);
    }
    return h;
  }
  function grindAt(sx: number) {
    const wx = worldX(sx);
    let best: { f: Feat; y: number; ride: boolean } | null = null;
    let by = 1e9;
    for (const f of S.feats) {
      const d = FEAT[f.k];
      if (!d?.grind) continue;
      const x0 = f.wx - f.w / 2; const x1 = f.wx + f.w / 2;
      if (wx < x0 - 2 || wx > x1 + 2) continue;
      const tt = (wx - x0) / Math.max(1, f.w);
      // Board sits on rail/box/log TOP (not through the tube).
      const gy = f.k === "rail"
        ? gY(sx) - railDeck(f, tt) - RAIL_TUBE_TOP
        : gY(sx) - f.h;
      const ride = !!d.ride || (f.k === "rail" && tt < 0.3) || f.k === "box";
      if (gy < by) { by = gy; best = { f, y: gy, ride }; }
    }
    return best;
  }
  /** Half-width used for tree cull + feat AABB overlap tests (tighter than featSpan). */
  function featTreeHalf(f: Feat) {
    const d = FEAT[f.k];
    if (!d || d.mob) return 0;
    if (d.grind) return (f.w || 80) * 0.5 + 32;
    // Kickers/flats span a long landing — keep pines clear of the whole profile AABB.
    if (d.terr) return (f.ap + f.dk + f.ex) * 0.38 + 28;
    return 36;
  }
  function featBlocksTree(wx: number) {
    // Cull past Franz pine canopy half (native÷2 ~67–101 CSS/wu) so trees stay behind ramps.
    const canopy = artOk() ? 72 : 18;
    return S.feats.some((f) => Math.abs(wx - f.wx) < featTreeHalf(f) + canopy);
  }
  function lipNear() {
    const lip = diff().lip * board().lip;
    const back = 18 * lip;
    const fore = Math.max(30 * lip, S.spd * LIP_WIN * lip);
    for (const f of S.feats) {
      const d = FEAT[f.k];
      if (!d?.terr) continue;
      const lipX = f.wx + (f.dk || 0);
      const dx = lipX - S.dist;
      if (dx > -back && dx < fore) return f;
    }
    return null;
  }
  function featSpan(f: Feat) {
    const d = FEAT[f.k]!;
    if (d.grind || d.mob) return (f.w || d.w) + 48;
    return f.ap + f.dk * 2 + f.ex + 36;
  }
  function overlaps(a: Feat, b: Feat) {
    return Math.abs(a.wx - b.wx) < featSpan(a) * 0.45 + featSpan(b) * 0.45 + 28;
  }
  function blockedGrind(wx: number, w: number) {
    return S.feats.some((f) => {
      const d = FEAT[f.k];
      if (!d?.grind) return false;
      const half = (f.w || f.dk * 2 || f.r || 40) / 2;
      return Math.abs(wx - f.wx) < half + w / 2 + 10;
    });
  }
  /**
   * Approach → knuckle → landing → air-arc clear zone for terr features.
   * Traffic must stay out of these for the whole run (place + drift).
   */
  function featAirClear(f: Feat) {
    const d = FEAT[f.k];
    if (!d?.terr) return null;
    const air = Math.max(90, (f.amp || 20) * 2.8 + (f.ex || 0) * 0.35);
    return {
      left: f.wx - (f.ap || 0) - (f.dk || 0) - 36,
      right: f.wx + (f.dk || 0) + (f.ex || 0) + air,
    };
  }
  function trafficSafe(wx: number, w: number) {
    const half = w / 2 + 8;
    for (const f of S.feats) {
      const d = FEAT[f.k];
      if (!d || d.mob) continue;
      const z = featAirClear(f);
      if (z && wx + half > z.left && wx - half < z.right) return false;
      if (d.grind) {
        const gh = (f.w || 80) / 2 + 56;
        if (Math.abs(wx - f.wx) < gh + half) return false;
      }
    }
    return true;
  }
  /**
   * Sit seats: flat-top deck edges + box decks + flat runouts only.
   * Never rail, lip, kicker/hit landing, or in the air arc.
   */
  function sitSafe(wx: number, w: number, host: Feat | null) {
    const half = w / 2 + 6;
    if (host) {
      const hd = FEAT[host.k];
      if (hd?.terr && host.k === "flat") {
        // On / just past the deck edge — still ahead of the landing slope.
        const left = host.wx - host.dk * 0.15;
        const right = host.wx + host.dk + Math.min(22, host.ex * 0.12);
        if (wx + half < left || wx - half > right) return false;
        return true;
      }
      if (hd?.grind && (host.k === "box" || host.k === "log")) {
        const edge = (host.w || hd.w) * 0.48;
        return Math.abs(wx - host.wx) <= edge + 8;
      }
    }
    // Standalone sit in a soft runout pocket — keep clear of rails/lips/landings.
    for (const f of S.feats) {
      const d = FEAT[f.k];
      if (!d || d.mob) continue;
      if (d.grind && f.k === "rail") {
        const gh = (f.w || 80) / 2 + 40;
        if (Math.abs(wx - f.wx) < gh + half) return false;
      }
      if (d.terr && (f.k === "kicker" || f.k === "hit")) {
        const z = featAirClear(f);
        if (z && wx + half > z.left && wx - half < z.right) return false;
      }
      if (d.terr && f.k === "flat") {
        // Keep off the steep approach / deep landing; deck+soft runout OK.
        const apL = f.wx - f.ap - f.dk - 20;
        const landR = f.wx + f.dk + f.ex * 0.55;
        if (wx + half > apL && wx - half < f.wx - f.dk * 0.2) return false;
        if (wx - half > landR) return false;
      }
    }
    return true;
  }

  function reset(sd: number | null, lv?: Level) {
    if (lv) LV = lv;
    mobI = 0;
    gapHasGrom = false;
    seed(sd == null ? (LV.endless ? (Date.now() >>> 0) : 2000 + LV.n) : sd);
    const gy0 = GROUND + terr(0);
    const m0 = boardSpd() * levelSpd() * diff().spd;
    seqI = 0;
    teachI = 0;
    sideHitPending = false;
    bonusKickPending = false;
    for (const k of Object.keys(census)) delete census[k];
    camAnchorY = GROUND + terr(0);
    camOYVel = 0;
    lastDist = 0;
    // Ambient wind grows on later lines; direction flips per seed so physics + visuals stay locked.
    const windDir = rng() < 0.5 ? -1 : 1;
    const windBase = Math.min(0.85, 0.18 + LV.n * 0.055 + (diff().id === "hard" ? 0.12 : 0));
    Object.assign(S, {
      feats: [], parts: [], pops: [], flakes: [],
      wind: windBase, windDir, gustT: 0, windLabelT: 0,
      pickups: [], pickT: 1.8, grindPts: 0,
      lipPts: 0, flipPts: 0, comboPts: 0, combo: 0, boostT: 0, grindT: 0, grindOn: null, lipHit: {}, flash: 0,
      land: 0, landBad: 0, hop: 0, climbVy: 0, mode: "ready" as Mode, prevMode: "ready" as Mode, t: 0, dist: 0,
      spd: LV.base * m0, p: { x: 110, y: gy0, vy: 0, on: true }, nextX: 780, shake: 0, done: false, flip: 0,
      holding: false, lastTap: 0, playAt: 0, trickProg: 0, trickDone: false, trickFlips: 0, trickRamps: 0,
      trickCombos: 0, trickGrabs: 0, trickRails: 0, airFrom: null, airBoostUsed: false, yaw: 0, spinDir: 1, grab: null,
      grabEase: 0, grabHeld: false, windup: 0, grindStyle: "fifty" as GrindStyle,
      grindExit: false, heartFlashT: 0, heartGainT: 0, heartAt: 0, lostHeart: -1,
      autoRetry: false, gameOver: false, postLip: 0, lessonPlaced: false, missed: false, achT: 0, achToast: "",
      lastTrickName: "",
    });
    for (let i = 0; i < FLAKE_CAP; i++) {
      S.flakes.push({
        x: Math.random() * 1000, y: Math.random() * VH,
        // Soft round dots ≈ 2–4 CSS px once scaled (varied with depth).
        r: 2.0 + Math.random() * 2.0, z: Math.random(), vx: (Math.random() - 0.5) * 8,
      });
    }
    // Snap steady camera to the new line (no tween from the previous run).
    // Never clamp OY≥0 — fall-line / landscape need negative OY to keep the rider framed.
    const gFrac = overviewCam ? (tallPhone ? 0.42 : 0.4) : playGroundFrac();
    camX = overviewCam ? W * 0.04 - 20 : W * 0.33 - S.p.x;
    OY = worldH * gFrac - camAnchorY;
    snowFloor = Math.max(camAnchorY + 140, worldH - OY - 2);
    camOYPrev = OY; camOYVel = 0; camXPrev = camX; lastDist = 0;
  }

  function mkFeat(k: string, lesson = false): Feat {
    const d = FEAT[k]!;
    const f: Feat = { k, wx: 0, w: d.w, h: d.h, ap: 0, dk: 0, ex: 0, amp: 0, gap: 0, r: 0, vx: 0, ph: 0 };
    if (d.grind) {
      f.w = d.w * (k === "rail" ? 0.95 + rngB() * 0.12 : k === "box" ? 0.96 + rngB() * 0.1 : 0.92 + rngB() * 0.16);
      f.h = d.h;
      if (k === "rail") {
        const style = Math.floor(rngB() * 3);
        if (style === 0) { f.down = 5 + rngB() * 8; } // down-rail
        else if (style === 1) { f.down = 1 + rngB() * 2; f.kink = 9 + rngB() * 8; } // A-frame / kinked
        else { f.down = 2 + rngB() * 3; } // flat-down
      }
      if (lesson && k === "rail") { f.w = 520; f.down = 4; f.kink = 0; }
      if (lesson && k === "log") f.w = 320;
      if (lesson && k === "box") f.w = 220;
    }
    if (d.mob) {
      f.w = d.w; f.h = d.h; f.vx = (d.vx || 50) * (0.85 + rngB() * 0.35); f.ph = rngB() * 6;
      if (k === "grom") {
        // Default ride; sit pose overrides size/vx in placeGromInGap.
        f.pose = "ride";
        f.cleared = false;
        f.w = GROM_FRAMES.grom_ride.w / 2;
        f.h = GROM_FRAMES.grom_ride.h / 2;
        // Always slower than the player line speed.
        f.vx = Math.min(36, Math.max(18, (d.vx || 30) * (0.85 + rngB() * 0.3)));
      }
    }
    if (d.terr) {
      f.ap = (d.ap || 0) * (0.94 + rngB() * 0.1);
      f.dk = (d.dk || 0) * (0.94 + rngB() * 0.1);
      f.ex = (d.ex || 0) * (0.94 + rngB() * 0.1);
      f.amp = (d.amp || 0) * (0.94 + rngB() * 0.1);
      // Tabletop (shared height) vs step-down (extra lip drop into a deeper landing).
      if (k === "kicker" || k === "flat") {
        if (rngB() < 0.45) { f.variant = "step"; f.step = 8 + rngB() * 12; }
        else { f.variant = "table"; f.step = 0; }
      }
      // S→M→L amp by story line for kickers
      if (k === "kicker") {
        const size = LV.n <= 3 ? 0.78 : LV.n <= 6 ? 1 : LV.n <= 9 ? 1.18 : 1.32;
        f.amp *= size; f.ap *= 0.92 + size * 0.08; f.ex *= 0.95 + size * 0.08;
      }
      if (lesson && k === "hit") f.amp *= 0.9;
      if (lesson && k === "kicker") { f.amp *= 0.9; f.step = 0; f.variant = "table"; }
      if (lesson && k === "flat") { f.dk *= 1.15; f.step = 0; }
    }
    return f;
  }

  function place(f: Feat) {
    const span = featSpan(f);
    const d = FEAT[f.k]!;
    f.wx = Math.round(S.dist + S.nextX + span / 2 - S.p.x);
    let guard = 0;
    while (S.feats.some((o) => overlaps(o, f)) && guard++ < 8) f.wx += Math.round(span + 80);
    // Traffic only in flat/roller gaps — never approach, knuckle, landing, or air arc.
    if (d.mob) {
      let tries = 0;
      while (!trafficSafe(f.wx, f.w || d.w) && tries++ < 14) f.wx += 70;
      if (!trafficSafe(f.wx, f.w || d.w)) return; // skip unsafe spawn
    }
    S.feats.push(f);
    census[f.k] = (census[f.k] || 0) + 1;
    const m = runSpd();
    const ahead = Math.max(0, S.nextX - S.p.x);
    const vArr = Math.min(LV.max * m, S.spd + LV.ramp * m * ahead / Math.max(1, S.spd));
    const den = LV.dense || 1;
    // Spacing jitter so runs don't lock to a metronome — still keep kicker/flat landings safe.
    let g = vArr * (0.22 + AIR * 0.48 + POST_LIP) * den * diff().space + span * 0.3
      + rng() * vArr * LV.gapX * diff().space * den * (0.75 + rng() * 0.55);
    if (d.terr && (f.k === "kicker" || f.k === "flat")) g *= 1.18 + rng() * 0.12;
    else if (d.terr && f.k === "hit") g *= 0.95 + rng() * 0.2;
    if (d.mob) g = Math.max(g, vArr * HAZARD_LEAD * 1.15);
    S.nextX += span + g;
  }

  /** LINE_SEQ backbone + per-run variation (side hits, rail↔box, bonus kicker). */
  function nextParkKind(park: string[]): string {
    if (sideHitPending) { sideHitPending = false; return "hit"; }
    if (bonusKickPending) { bonusKickPending = false; return "kicker"; }
    const seq = LINE_SEQ[LV.n] || park;
    // Keep inserts from starving the researched backbone before the finish line.
    const budget = Number.isFinite(LV.len)
      ? lenNow() - S.dist - Math.max(0, S.nextX - S.p.x)
      : 1e9;
    const canInsert = budget > 1600;
    if (seqI < seq.length) {
      let k = seq[seqI++]!;
      // Alternate rail ↔ box so jib choice changes between runs.
      if ((k === "rail" || k === "box") && park.includes(k === "rail" ? "box" : "rail") && rng() < 0.42) {
        k = k === "rail" ? "box" : "rail";
      }
      // Log swap onto box lines so wood stays common (was flattened by box-heavy LINE_SEQ).
      if (k === "box" && park.includes("log") && rng() < 0.4) k = "log";
      // Side hit before a jib/kicker — denser, more playful packing.
      if (canInsert && (k === "rail" || k === "box" || k === "kicker" || k === "flat") && rng() < 0.38) {
        sideHitPending = true;
      }
      // Optional bonus kicker after a flat / mid-line hit.
      if (canInsert && (k === "flat" || k === "hit") && rng() < 0.32) bonusKickPending = true;
      return k;
    }
    return park[Math.floor(rng() * park.length)]!;
  }

  /** Last non-traffic park feature (host for sit seats / gap rides). */
  function lastParkFeat(): Feat | null {
    for (let i = S.feats.length - 1; i >= 0; i--) {
      const f = S.feats[i]!;
      if (!FEAT[f.k]?.mob) return f;
    }
    return null;
  }

  /**
   * Franz Grom 1 — from level 2, ≤1 per gap.
   * sit = flat runouts / deck edges; ride = flat stretches between features.
   */
  function placeGromInGap() {
    if (LV.n < 2 || gapHasGrom) return;
    const host = lastParkFeat();
    const wantSit = !!(host && (host.k === "flat" || host.k === "box") && rng() < 0.62);
    if (wantSit && host) {
      const f = mkFeat("grom");
      f.pose = "sit";
      f.vx = 0;
      f.w = GROM_FRAMES.grom_sit.w / 2;
      f.h = GROM_FRAMES.grom_sit.h / 2;
      if (host.k === "flat") {
        // Deck edge → soft runout fringe (not the lip or deep landing).
        f.wx = Math.round(host.wx + host.dk * (0.55 + rngB() * 0.35));
      } else {
        f.wx = Math.round(host.wx + (host.w || 80) * (0.28 + rngB() * 0.2));
      }
      if (sitSafe(f.wx, f.w, host)) {
        S.feats.push(f);
        census.grom = (census.grom || 0) + 1;
        gapHasGrom = true;
        return;
      }
      // Fall through to a ride spawn in the same gap if the seat was unsafe.
    }
    // Ride — patrol the flat gap ahead of the last feature only.
    const f = mkFeat("grom");
    f.pose = "ride";
    f.w = GROM_FRAMES.grom_ride.w / 2;
    f.h = GROM_FRAMES.grom_ride.h / 2;
    f.vx = 20 + rngB() * 14; // always << player base (~268+)
    const base = host ? host.wx + featSpan(host) * 0.42 + 60 : S.dist + S.nextX;
    f.wx = Math.round(base + rngB() * 90);
    let tries = 0;
    while (!trafficSafe(f.wx, f.w) && tries++ < 16) f.wx += 48;
    if (!trafficSafe(f.wx, f.w) || blockedGrind(f.wx, f.w)) return;
    S.feats.push(f);
    census.grom = (census.grom || 0) + 1;
    gapHasGrom = true;
  }

  function spawn() {
    if (S.dist + (S.nextX - S.p.x) > lenNow() - 220) { S.nextX += 1e6; return; }
    const teach = LV.n <= 4 && S.t < 4.2;
    const lesson = teach && !S.lessonPlaced;
    const park = teach ? (TEACH[LV.n] || LV.park) : LV.park;
    let k: string;
    if (lesson) {
      k = LESSON[LV.n] || park[0]!;
      S.lessonPlaced = true;
    } else if (teach) {
      const tp = TEACH[LV.n] || park;
      k = tp[teachI % tp.length]!;
      teachI++;
    } else {
      k = nextParkKind(park);
    }
    place(mkFeat(k, lesson));
    // New park feature opens a fresh gap — at most one grom may fill it.
    gapHasGrom = false;
    if (!teach && LV.n >= 2 && rng() < LV.mob * diff().pit * 1.55) {
      placeGromInGap();
    }
    // Skiers stay on later lines (world-atlas patrol); never replace Franz groms.
    if (!teach && LV.skiers && rng() < LV.mob * diff().pit * 0.55) {
      place(mkFeat("skier"));
    }
  }

  function puff(x: number, y: number, n: number, c: string, v: number) {
    for (let i = 0; i < n; i++) S.parts.push({ x, y, vx: (Math.random() - 0.5) * 2 * v, vy: -Math.random() * v, l: 0.35 + Math.random() * 0.3, c, s: 2 + Math.random() * 2 });
  }
  /** Soft landing puff — denser white spray when you stick a kicker/table. */
  function landPuff(sx: number, sy: number, hard: boolean) {
    const n = hard ? 18 : 11;
    const v = hard ? 170 : 110;
    for (let i = 0; i < n; i++) {
      S.parts.push({
        x: sx + (Math.random() - 0.5) * 22,
        y: sy,
        vx: (Math.random() - 0.5) * 2 * v,
        vy: -20 - Math.random() * v * 0.7,
        l: 0.3 + Math.random() * 0.4,
        c: hard ? "#ffffff" : "rgba(255,255,255,0.9)",
        s: 2 + Math.random() * (hard ? 3.5 : 2.4),
      });
    }
  }
  function announce() { emit(true); }
  function trickGoal() { return LV.trick; }
  function trickTick(landedName?: string) {
    const g = trickGoal();
    if (!g || S.trickDone) return;
    if (g.t === "spin") {
      if (g.want) { if (landedName && landedName.includes(g.want)) S.trickProg = Math.max(S.trickProg, 1); }
      else S.trickProg = S.trickFlips;
    } else if (g.t === "grab") {
      if (g.want) { if (landedName && landedName.includes(g.want)) S.trickProg = Math.max(S.trickProg, 1); }
      else S.trickProg = S.trickGrabs;
    } else if (g.t === "rail") {
      if (g.want) { if (landedName && (landedName === g.want || landedName.includes(g.want))) S.trickProg = Math.max(S.trickProg, 1); }
      else S.trickProg = S.trickRails;
    } else if (g.t === "air") S.trickProg = S.trickRamps;
    else S.trickProg = S.trickCombos;
    if (S.trickProg >= g.n) {
      S.trickDone = true;
      pushPop("GOAL", 1, -98, 44);
      beep(1100, 0.08, "square", 0.1); S.flash = 0.15;
    }
  }
  function comboAdd(n: number) {
    S.combo += n;
    if (S.combo >= COMBO_NEED) {
      S.combo = 0; S.boostT = COMBO_T; S.comboPts += 30; S.trickCombos++;
      beep(990, 0.06, "square", 0.1); S.flash = 0.1;
      pushPop("COMBO +30", 0.7);
      trickTick();
    }
  }
  function chainBonus(kind: string, flips: number) {
    const mult = 1 + Math.max(0, flips | 0);
    const pts = kind === "rail" || kind === "log" ? 28 * mult : kind === "kicker" ? 26 * mult : 20 * mult;
    S.comboPts += Math.round(pts);
    S.trickCombos++;
    trickTick();
    comboAdd(1);
    const name = kind === "rail" ? "RAIL→FLIP" : kind === "log" ? "LOG→FLIP" : kind === "box" ? "BOX→FLIP" : kind === "kicker" ? "KICKER TRICK" : kind === "flat" ? "FLAT TRICK" : "HIT TRICK";
    pushPop(name + " +" + Math.round(pts), 0.85);
    beep(860, 0.06, "triangle", 0.1);
    S.flash = 0.12; S.grindExit = false; S.airFrom = null;
  }
  function heartsOk() { return LV.n >= HEART_MIN_LV && lives <= 1; }
  function gainLife() {
    if (!heartsOk() || lives >= LIVES_MAX) return false;
    lives++; S.heartGainT = 1.1; S.flash = 0.12;
    S.pops.push({ x: S.p.x, y: S.p.y - 72, l: 1, txt: "+1" });
    beep(990, 0.07, "square", 0.1);
    return true;
  }
  function checkHeart() {
    if (!heartsOk()) return;
    const sc = score();
    while (heartsOk() && sc >= (S.heartAt + 1) * HEART_SCORE) { S.heartAt++; gainLife(); }
  }

  function settleSpin(dt: number) {
    // Hold = backflips exactly as before (continuous while held). Taps do not drive this axis.
    const dir = S.spinDir >= 0 ? 1 : -1;
    if (S.holding && !S.p.on) S.flip += SPIN * dt * dir;
    else if (S.holding && S.grindOn) S.flip += SPIN * 0.75 * dt * dir;
    else if (!S.holding && S.grindOn) S.flip *= Math.pow(GRIND_FRIC, dt * 6);
    else if (!S.p.on && !S.holding) {
      const into = Math.abs(S.flip) / TAU;
      const base = Math.floor(into);
      const frac = into - base;
      const commit = S.postLip > 0 ? 0.55 : 0.72;
      const targetAbs = (frac >= commit ? base + 1 : base) * TAU;
      const target = Math.sign(S.flip || dir) * targetAbs;
      S.flip += (target - S.flip) * Math.min(1, dt * 9);
    }
  }

  /** Nearest half/full turn (180° grid) for one rotation axis. */
  function spinBucket(absRad: number) {
    const deg = absRad * (180 / Math.PI);
    const nearest = Math.round(deg / 180) * 180;
    return { deg: nearest, err: Math.abs(deg - nearest), raw: deg };
  }

  /** Axis is clean if near 0 (no rot) or within ±window of a half/full turn. */
  function axisClean(absRad: number) {
    const b = spinBucket(absRad);
    if (b.raw < SPIN_NO_DEG) return { ok: true, bucket: { deg: 0, err: b.raw, raw: b.raw } };
    if (b.deg >= 180 && b.err <= SPIN_LAND_WIN_DEG) return { ok: true, bucket: b };
    return { ok: false, bucket: b };
  }

  function sideLabel() { return S.spinDir >= 0 ? "Frontside" : "Backside"; }

  /** Trick / feedback pop — stacked so labels never overlap; draw() clamps on-screen. */
  function pushPop(txt: string, life = 0.9, dy = -96, dx = 28) {
    const stack = S.pops.filter((q) => q.l > 0.12).length;
    S.pops.push({ x: S.p.x + dx, y: S.p.y + dy - stack * 22, l: life, txt });
  }

  function grindStyleName(style: GrindStyle, fs: boolean) {
    if (style === "fifty") return "50-50";
    if (style === "nose") return "Nose Press";
    if (style === "tail") return "Tail Press";
    if (style === "lipslide") return (fs ? "Frontside " : "Backside ") + "Lipslide";
    return (fs ? "Frontside " : "Backside ") + "Boardslide";
  }

  /** Phone swipe: set spin side, grab, or grind style from a unit-ish dx/dy. */
  function aim(dx: number, dy: number) {
    const mag = Math.hypot(dx, dy);
    if (mag < 12) return;
    const nx = dx / mag; const ny = dy / mag;
    if (S.grindOn) {
      if (Math.abs(ny) > Math.abs(nx) * 1.1) S.grindStyle = ny < 0 ? "nose" : "tail";
      else if (Math.abs(nx) > 0.55) S.grindStyle = Math.abs(ny) > 0.35 ? "lipslide" : "boardslide";
      else S.grindStyle = "fifty";
      return;
    }
    if (!S.p.on) {
      if (Math.abs(nx) > 0.45) S.spinDir = nx >= 0 ? 1 : -1;
      // Grabs from swipe quadrant (readable park names, not IP copies).
      let g: GrabId = null;
      if (Math.abs(ny) > 0.65 && Math.abs(nx) < 0.35) g = ny < 0 ? "Nose" : "Tail";
      else if (ny < -0.35 && nx < -0.35) g = "Mute";
      else if (ny < -0.35 && nx > 0.35) g = "Method";
      else if (ny > 0.35 && nx < -0.35) g = "Indy";
      else if (ny > 0.35 && nx > 0.35) g = "Melon";
      else if (Math.abs(nx) > 0.7 && Math.abs(ny) < 0.35) g = "Stalefish";
      if (g) { S.grab = g; S.grabHeld = true; }
    } else if (Math.abs(nx) > 0.5) {
      S.spinDir = nx >= 0 ? 1 : -1;
    }
  }

  function scoreLanding(onGrind: boolean) {
    const flipAx = axisClean(Math.abs(S.flip));
    const yawAx = axisClean(Math.abs(S.yaw));
    const stillGrab = !!(S.grab && S.grabEase > 0.28);
    const grab = S.grabEase > 0.12 ? S.grab : null;
    const side = sideLabel();

    const clearAirSpin = () => {
      S.airBoostUsed = false;
      S.yaw = 0;
      S.flip = 0; S.grab = null; S.grabEase = 0; S.grabHeld = false; S.windup = 0;
      S.grindExit = false; S.airFrom = null; S.grindStyle = "fifty";
    };

    if (onGrind && S.grindExit) {
      let name = grindStyleName(S.grindStyle, S.spinDir >= 0);
      if (flipAx.bucket.deg >= 270 && flipAx.ok) {
        name = "270 " + (S.spinDir >= 0 ? "On" : "Off");
      }
      const pts = 18 + Math.round(S.grindT * 10);
      S.trickRails++;
      S.flipPts += pts;
      S.lastTrickName = name;
      pushPop(name + " +" + pts, 0.9);
      beep(640, 0.05, "triangle", 0.09);
      comboAdd(1);
      trickTick(name);
      clearAirSpin();
      return;
    }

    // Both axes must land clean — bad flip OR bad yaw crashes (no spin label).
    const grabBail = stillGrab && (S.grabEase > 0.72 || S.grabHeld);
    if (!flipAx.ok || !yawAx.ok || grabBail) {
      S.combo = 0;
      clearAirSpin();
      fall();
      return;
    }

    const yawDeg = yawAx.bucket.deg;
    const flipDeg = flipAx.bucket.deg;
    let name = "";
    let pts = 0;
    let tierLabel = "";

    // Tap-yaw scored tiers (360…1080); hold-flip can combine (e.g. flip + 360).
    const tierPts = yawDeg >= 360 ? SPIN_PTS[yawDeg] : undefined;
    if (tierPts != null) {
      pts = tierPts + (grab ? Math.round(tierPts * 0.2) : 0) + (flipDeg >= 180 ? 40 : 0);
      tierLabel = yawDeg + "!";
      name = side + " " + yawDeg;
      if (flipDeg >= 180) name += " Flip";
      if (grab) name += " " + grab;
      S.trickFlips += Math.max(1, Math.round(yawDeg / 360));
      if (grab) S.trickGrabs++;
      if (grab && yawDeg >= 360) S.trickCombos++;
    } else if (yawDeg === 180 || flipDeg >= 180) {
      const deg = Math.max(yawDeg, flipDeg);
      name = grab ? side + " " + deg + " " + grab : side + " " + deg;
      if (yawDeg === 180 && flipDeg >= 180) name = side + " 180 Flip" + (grab ? " " + grab : "");
      pts = grab ? 36 : 22;
      S.trickFlips += 1;
      if (grab) S.trickGrabs++;
    } else if (grab) {
      name = grab;
      pts = stillGrab ? 14 : 24;
      S.trickGrabs++;
    }

    if (name && pts > 0) {
      const mult = 1 + Math.min(3, Math.floor(S.combo / COMBO_NEED));
      const award = Math.round(pts * (mult > 1 ? 1 + (mult - 1) * 0.12 : 1));
      S.flipPts += award;
      S.lastTrickName = name;
      if (tierLabel) {
        pushPop(tierLabel, 1.05, -102, 20);
        spinLandSfx(yawDeg);
      } else {
        pushPop(name + " +" + award, 0.9);
        beep(720, 0.05, "triangle", 0.09);
      }
      comboAdd(1 + (yawDeg >= 360 ? 1 : 0) + (grab ? 1 : 0));
      trickTick(name);
      if (S.airFrom && (yawDeg >= 180 || flipDeg >= 180)) S.comboPts += 8;
    }

    clearAirSpin();
  }

  /** Crisp spin-land sting — brighter for higher tiers. */
  function spinLandSfx(deg: number) {
    if (muted) return;
    try {
      if (!ensureAC() || !ac) return;
      const t = ac.currentTime;
      const base = 520 + Math.min(400, (deg - 360) * 0.35);
      for (let i = 0; i < 2; i++) {
        const o = ac.createOscillator(); const g = ac.createGain();
        o.type = i === 0 ? "square" : "triangle";
        o.frequency.setValueAtTime(base * (i === 0 ? 1 : 1.5), t);
        o.frequency.exponentialRampToValueAtTime(base * (i === 0 ? 1.35 : 2), t + 0.06);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(i === 0 ? 0.12 : 0.07, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.18);
      }
    } catch { /* ignore */ }
  }

  function lipLabel(k: string) {
    if (k === "kicker") return "KICKER";
    if (k === "flat") return "FLAT";
    if (k === "hit") return "HIT";
    return "LIP";
  }
  function awardLip(f: Feat) {
    if (S.lipHit[f.wx]) return;
    S.lipHit[f.wx] = 1; f.lip = true;
    S.postLip = POST_LIP * diff().lip * board().lip;
    const pts = f.k === "kicker" ? RAMP_PTS + 4 : f.k === "flat" ? 42 : f.k === "hit" ? 36 : LIP_PTS;
    S.lipPts += pts;
    S.trickRamps++;
    trickTick();
    comboAdd(1);
    pushPop("+" + pts + " " + lipLabel(f.k), 0.7);
    beep(980, 0.05, "square", 0.09);
  }

  /** Ground / grind takeoff only. Air actions go through airTap() after a short press. */
  function jump() {
    if (S.mode !== "play") return;
    const now = performance.now();
    const p = S.p;
    if (!(p.on || S.grindOn)) return;
    const fromK = S.grindOn ? S.grindOn.k : null;
    const wasGrind = !!S.grindOn;
    p.vy = JV * board().pop * (wasGrind && fromK === "rail" ? 1.06 : wasGrind && fromK === "log" ? 1.03 : 1);
    p.on = false;
    if (wasGrind) { S.airFrom = fromK; S.grindExit = true; }
    else { const lf0 = lipNear(); if (lf0) S.airFrom = lf0.k; }
    S.grindOn = null;
    S.airBoostUsed = false;
    S.yaw = 0;
    S.lastTap = now;
    jumpBoing();
    if (wasGrind) {
      S.pops.push({ x: p.x, y: p.y - 52, l: 0.55, txt: fromK === "rail" ? "RAIL POP" : fromK === "log" ? "LOG POP" : "POP" });
      beep(640, 0.04, "square", 0.07);
    }
    const lf = lipNear();
    if (lf && !S.lipHit[lf.wx]) awardLip(lf);
  }

  /**
   * Confirmed air tap (press ≤ TAP_MS). Second tap = one small boost;
   * each later tap adds one half-turn of yaw. Hold backflips are separate.
   */
  function airTap() {
    if (S.mode !== "play") return;
    const p = S.p;
    if (p.on || S.grindOn) return;
    const now = performance.now();
    if (!S.airBoostUsed) {
      S.airBoostUsed = true;
      S.lastTap = now;
      p.vy += JV * AIR_BOOST_FRAC;
      if (p.vy < JV * 1.12) p.vy = JV * 1.12;
      beep(500, 0.035, "triangle", 0.06);
      return;
    }
    // +180° yaw per tap (capped at 1080°).
    const dir = S.spinDir >= 0 ? 1 : -1;
    S.yaw += TAP_SPIN_HALF * dir;
    if (Math.abs(S.yaw) > YAW_MAX) S.yaw = Math.sign(S.yaw) * YAW_MAX;
    S.lastTap = now;
    const halfs = Math.round(Math.abs(S.yaw) / Math.PI);
    beep(480 + Math.min(6, halfs) * 55, 0.03, "square", 0.065);
  }

  function fall() {
    if (S.mode !== "play" || god) return;
    S.lostHeart = lives - 1;
    lives = Math.max(0, lives - 1);
    S.mode = "over";
    S.gameOver = lives <= 0;
    S.heartFlashT = LIFE_PAUSE;
    S.autoRetry = false;
    S.grindExit = false; S.airFrom = null;
    S.airBoostUsed = false; S.yaw = 0; S.flip = 0;
    if (!reduce) { S.shake = 10; S.flash = -0.35; }
    puff(S.p.x, S.p.y - 10, 22, "#ffffff", 220);
    const sc = score();
    if (sc > pb) { pb = sc; store("terrainPark.pb", String(pb)); }
    if (!((PR.best[LV.n] || 0) >= sc)) { PR.best[LV.n] = sc; saveP(); }
    scrapeStop();
    beep(160, 0.35, "sawtooth", 0.2);
    overAt = performance.now();
    S.pops.push({ x: S.p.x, y: S.p.y - 70, l: 1.2, txt: S.gameOver ? "GAME OVER" : "-1 LIFE" });
    emit(true);
  }
  function finish() {
    if (S.mode !== "play" && S.mode !== "ready") return;
    const goalOpen = !!(trickGoal() && !S.trickDone);
    S.mode = "clear"; S.done = true; S.gameOver = false; S.missed = goalOpen;
    scrapeStop();
    const sc = score();
    const st = starsFor(sc, gatesOf(LV));
    S.pops.push({ x: S.p.x, y: S.p.y - 60, l: 1.1, txt: st >= 3 ? "★★★" : "CLEAR" });
    if (LV.n <= STORY && !PR.done.includes(LV.n)) PR.done.push(LV.n);
    if (!((PR.best[LV.n] || 0) >= sc)) PR.best[LV.n] = sc;
    if (sc > pb) { pb = sc; store("terrainPark.pb", String(pb)); }
    const cn = clearedN();
    for (const bb of BOARDS) if (bb.need && bb.need === cn) { S.achToast = bb.name + " unlocked"; S.achT = 2.6; }
    saveP();
    overAt = performance.now();
    [660, 880, 1100].forEach((f, i) => setTimeout(() => beep(f, 0.12, "square", 0.12), i * 110));
    emit(true);
  }

  function step(dt: number) {
    S.land = Math.max(0, S.land - dt * 6);
    S.flash = Math.max(0, S.flash - dt);
    S.achT = Math.max(0, S.achT - dt);
    S.landBad = Math.max(0, S.landBad - dt);
    S.boostT = Math.max(0, S.boostT - dt);
    S.heartFlashT = Math.max(0, S.heartFlashT - dt);
    S.heartGainT = Math.max(0, S.heartGainT - dt);
    S.postLip = Math.max(0, S.postLip - dt);
    // Defer hold-flip until past TAP_MS so a short air tap is never a flip.
    if (pressArmed && !S.holding && (performance.now() - pressAt) > TAP_MS) S.holding = true;
    // Grab pose: ease in while held, ease out on release (must release before landing).
    if (S.grab && S.grabHeld && !S.p.on) S.grabEase = Math.min(1, S.grabEase + dt * 5.5);
    else if (S.grabEase > 0) {
      S.grabEase = Math.max(0, S.grabEase - dt * 4.2);
      if (S.grabEase <= 0.02) { S.grabEase = 0; if (!S.grabHeld) S.grab = null; }
    }
    // Shoulder wind-up before takeoff while holding spin on snow / rail.
    if (S.holding && (S.p.on || S.grindOn) && !S.grab) S.windup = Math.min(1, S.windup + dt * 3.2);
    else if (!S.holding || !S.p.on) S.windup = Math.max(0, S.windup - dt * (S.p.on ? 4 : 1.2));
    for (let q = S.parts.length - 1; q >= 0; q--) {
      const P = S.parts[q]!; P.x += P.vx * dt; P.y += P.vy * dt; P.vy += 600 * dt; P.l -= dt;
      if (P.l <= 0) S.parts.splice(q, 1);
    }
    if (S.parts.length > 120) S.parts.splice(0, S.parts.length - 120);
    S.t += dt;
    const m = runSpd();
    // Forward only — speed never goes negative; dist is monotonic.
    S.spd = Math.max(0, Math.min(LV.max * m, (LV.base + LV.ramp * S.t) * m));
    const dx = S.spd * dt;
    lastDist = S.dist;
    S.dist += dx; S.nextX -= dx;
    while (S.nextX < 2000) spawn();
    if (Number.isFinite(LV.len) && S.dist >= lenNow()) { updateCam(dt); finish(); return; }
    const p = S.p;
    const py0 = p.y;
    const snow = gY(p.x);
    const surfVy = dt > 1e-6 ? (snow - py0) / dt : 0;
    let gnd = grindAt(p.x);
    settleSpin(dt);
    if ((p.on || S.grindOn) && gnd) {
      const already = !!S.grindOn && S.grindOn === gnd.f;
      const canRide = gnd.ride || !!S.grindOn || (Math.abs(py0 - gnd.y) < 16 && p.vy >= -80);
      // Already grinding: always snap board to rail/box top. Else require approach window.
      if (canRide && (already || (py0 <= gnd.y + 18 && py0 >= gnd.y - 12))) {
        S.grindOn = gnd.f; p.on = true; p.y = gnd.y; p.vy = 0; S.grindT += dt;
        if (!gnd.f.railTrick) {
          gnd.f.railTrick = 1;
          const gName = grindStyleName(S.grindStyle, S.spinDir >= 0);
          pushPop(gName, 0.55);
          S.lastTrickName = gName;
          S.trickRails++;
          trickTick(gName);
        }
        const styleMul = S.grindStyle === "fifty" ? 1 : S.grindStyle === "boardslide" || S.grindStyle === "lipslide" ? 1.25 : 1.15;
        const gp = Math.round(dt * 62 * styleMul * (gnd.f.k === "rail" ? 1.5 : gnd.f.k === "log" ? 1.28 : gnd.f.k === "box" ? 1.15 : 1) * board().grind);
        S.grindPts += gp;
        if (Math.random() < 0.45) puff(p.x, p.y, 2, "#ffffff", 70);
        if (!gnd.f.hit) { gnd.f.hit = true; comboAdd(1); beep(440, 0.04, "square", 0.06); }
      } else if (S.grindOn && (!gnd || gnd.f !== S.grindOn)) S.grindOn = null;
    } else if (S.grindOn) S.grindOn = null;
    if (p.on && !S.grindOn) {
      if (surfVy < S.climbVy) S.climbVy = surfVy;
      if (S.climbVy < -95 && surfVy > 20) {
        const lf0 = lipNear();
        const kick = lf0?.k === "kicker";
        p.on = false;
        p.vy = Math.max((kick ? JV * 1.08 : JV * 0.86) * board().pop, S.climbVy * (kick ? 1.08 : 0.9));
        S.hop = 1; S.climbVy = 0;
        if (!S.holding) S.flip = 0;
        S.airBoostUsed = false;
        S.yaw = 0;
        if (lf0) S.airFrom = lf0.k;
        S.lastTap = performance.now();
        S.postLip = POST_LIP * diff().lip * board().lip;
        puff(p.x, p.y - 2, kick ? 12 : 8, "#ffffff", kick ? 140 : 110);
        beep(260 + Math.random() * 60, 0.05, "square", 0.07);
        if (lf0) awardLip(lf0);
      } else {
        p.y = snow;
        if (surfVy > -40 && surfVy < 40) S.climbVy *= GRIND_FRIC;
      }
    }
    if (p.on && !S.grindOn && p.y < snow - 0.5) p.on = false;
    if (!p.on) {
      p.vy += GRAVITY * dt;
      p.y += p.vy * dt;
      // Air drift matches visible wind (capped so framing / asserts stay stable).
      const wAir = windNow();
      if (Math.abs(wAir) > 0.15) p.x = Math.max(96, Math.min(128, p.x + wAir * 22 * dt));
      gnd = grindAt(p.x);
      if (gnd && p.vy >= 0 && p.y >= gnd.y - 4 && py0 <= gnd.y + 6) {
        p.y = gnd.y; p.vy = 0; p.on = true; S.grindOn = gnd.f; S.land = 1;
        scoreLanding(true);
        landPuff(p.x, p.y, false);
      } else if (p.vy >= 0 && p.y >= snow && py0 <= snow + 2) {
        p.y = snow; p.vy = 0; p.on = true; S.land = 1; S.climbVy = 0;
        const hard = !!S.airFrom && (S.airFrom === "kicker" || S.airFrom === "flat");
        scoreLanding(false);
        landPuff(p.x, snow, hard);
      } else if (p.y >= snow + 70) { updateCam(dt); fall(); return; }
    } else if (!S.grindOn && Math.random() < (S.spd > LV.base * 1.05 ? 0.55 : 0.28)) {
      // Snow spray under the board — denser at speed; wind biases spray direction.
      const spray = S.spd > LV.max * 0.72 ? 3 : 2;
      const wSpray = windNow();
      for (let s = 0; s < spray; s++) {
        S.parts.push({
          x: p.x - 14 - Math.random() * 10,
          y: p.y - 1 + Math.random() * 3,
          vx: -70 - Math.random() * 80 - S.spd * 0.08 + wSpray * 40,
          vy: -15 - Math.random() * 40,
          l: 0.22 + Math.random() * 0.28,
          c: "#ffffff",
          s: 1.5 + Math.random() * 2.5,
        });
      }
    }
    S.pickT -= dt;
    // Hearts only — falling stars removed (score is tricks-only).
    if (S.pickT <= 0 && S.dist < lenNow() - 500 && heartsOk()) {
      S.pickT = 2.4 + rngP() * 2.2;
      const px = p.x + S.spd * (0.9 + rngP() * 0.45);
      const baseY = gY(px);
      S.pickups.push({ x: px, y: baseY - (70 + rngP() * 30), vy: 70, a: 0, k: "heart" });
      census.heart = (census.heart || 0) + 1;
    } else if (S.pickT <= 0) {
      S.pickT = 2.8;
    }
    for (let i = S.pickups.length - 1; i >= 0; i--) {
      const u = S.pickups[i]!;
      u.x -= dx; u.y += u.vy * dt; u.a += dt * 5;
      if (!heartsOk()) { S.pickups.splice(i, 1); continue; }
      if (Math.abs(u.x - p.x) < 22 && u.y > p.y - 48 && u.y < p.y + 14) {
        if (!gainLife()) S.pops.push({ x: u.x, y: u.y - 20, l: 0.55, txt: "FULL" });
        puff(u.x, u.y, 8, "#ff5a7a", 160);
        S.pickups.splice(i, 1); continue;
      }
      if (u.x < -20 || u.y > gY(u.x) + 30) S.pickups.splice(i, 1);
    }
    // Snow accumulates on rails/boxes; board knock-off scrapes under the rider.
    for (const f of S.feats) {
      if (f.k !== "rail" && f.k !== "box" && f.k !== "log") continue;
      if (S.grindOn === f) {
        const before = f.snowCap || 0;
        f.snowCap = Math.max(0, before - dt * 1.35);
        // Tiny scrape puffs (not cotton-ball blobs) flying off the board.
        if (before > 0.12 && Math.random() < 0.22) {
          for (let i = 0; i < 2; i++) {
            S.parts.push({
              x: p.x - 6 + Math.random() * 4,
              y: p.y - 4 + Math.random() * 2,
              vx: -40 - Math.random() * 50,
              vy: -30 - Math.random() * 40,
              l: 0.18 + Math.random() * 0.15,
              c: "#f4f8fc",
              s: 1 + Math.random() * 1.2,
            });
          }
        }
      } else {
        // Subtle growth — a thin cap builds slowly, not a sudden mound.
        f.snowCap = Math.min(1, (f.snowCap || 0) + dt * (0.028 + Math.abs(windNow()) * 0.018));
      }
    }
    checkHeart();
    for (const gm of S.feats) {
      const gd = FEAT[gm.k];
      if (!gd?.mob) continue;
      const sitting = gm.k === "grom" && gm.pose === "sit";
      // Ride groms drift slowly toward the rider on flat stretches only.
      // Sit groms stay put on decks / runouts.
      if (!sitting && Math.abs(gm.vx) > 0.1) {
        const stepWx = Math.abs(gm.vx) * dt;
        const next = gm.wx - stepWx;
        if (trafficSafe(next, gm.w) && !blockedGrind(next, gm.w)) gm.wx = next;
        else if (!trafficSafe(gm.wx, gm.w)) {
          gm.wx += stepWx * 1.4;
        }
      }
      const gsx = gm.wx - S.dist + p.x;
      const gy = gY(gsx);
      const hw = gm.w * 0.42;
      const top = gy - gm.h * (sitting ? 0.92 : 1);
      const above = p.y < top - 2;
      // Jump clear → small one-shot bonus.
      if (above && !gm.cleared && gsx > p.x - hw && gsx < p.x + hw) {
        gm.cleared = true;
        const bonus = gm.k === "skier" ? 18 : 28;
        S.comboPts += bonus;
        S.pops.push({ x: p.x, y: p.y - 56, l: 0.7, txt: "+" + bonus });
        S.flash = Math.max(S.flash, 0.12);
      }
      if (!god && !S.grindOn && !above && gsx > p.x - hw && gsx < p.x + hw && p.y > top + 2 && p.y < gy + 4) {
        S.pops.push({ x: p.x, y: p.y - 48, l: 0.6, txt: gm.k === "skier" ? "SKIER" : "GROM" });
        updateCam(dt); fall(); return;
      }
    }
    tickWind(dt);
    for (let i = S.feats.length - 1; i >= 0; i--) {
      const ft = S.feats[i]!;
      if (ft.wx - S.dist + p.x < -featSpan(ft) - 80) S.feats.splice(i, 1);
    }
    for (let i = S.pops.length - 1; i >= 0; i--) {
      const q = S.pops[i]!;
      q.l -= dt;
      q.y -= 34 * dt;
      q.x += 18 * dt; // drift ahead so labels stay clear of the rider
      if (q.l <= 0) S.pops.splice(i, 1);
    }
    S.hop = Math.max(0, S.hop - dt * 4);
    updateCam(dt);
  }

  function ensureAC() {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ac = ac || new Ctx();
      if (ac.state === "suspended") void ac.resume();
    } catch { /* ignore */ }
    return ac;
  }
  function beep(f: number, d: number, type: OscillatorType, v: number) {
    if (muted) return;
    try {
      if (!ensureAC() || !ac) return;
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(v, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + d);
      o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + d);
    } catch { /* ignore */ }
  }
  function jumpBoing() {
    if (muted || !ensureAC() || !ac) return;
    try {
      const t = ac.currentTime;
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(640, t + 0.05);
      o.frequency.exponentialRampToValueAtTime(180, t + 0.22);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.3);
    } catch { /* ignore */ }
  }
  function scrapeStop() {
    if (!scrapeNodes) return;
    try { scrapeNodes.src.stop(); } catch { /* ignore */ }
    scrapeNodes = null; scrapeGain = null;
  }
  function scrapeTick() {
    if (muted || S.mode !== "play" || !S.p.on) { scrapeStop(); return; }
    const onG = !!S.grindOn;
    if (!ensureAC() || !ac) return;
    if (!scrapeNodes || scrapeNodes.grind !== onG) {
      scrapeStop();
      try {
        if (!noiseBuf) {
          const n = Math.floor(ac.sampleRate * 1.2);
          noiseBuf = ac.createBuffer(1, n, ac.sampleRate);
          const data = noiseBuf.getChannelData(0);
          for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * 0.7;
        }
        const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
        const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = onG ? 620 : 900; bp.Q.value = 0.7;
        scrapeGain = ac.createGain(); scrapeGain.gain.value = 0.0001;
        src.connect(bp).connect(scrapeGain).connect(ac.destination); src.start();
        scrapeGain.gain.exponentialRampToValueAtTime(onG ? 0.04 : 0.032, ac.currentTime + 0.1);
        scrapeNodes = { src, bp, grind: onG };
      } catch { scrapeNodes = null; }
    } else if (scrapeNodes.bp) scrapeNodes.bp.frequency.value = (onG ? 520 : 700) + Math.min(480, S.spd * 0.5);
  }

  /** Ride-line target: action in the middle third; terrain detail fills below. */
  function playGroundFrac() {
    if (landscape) return 0.58;
    // Portrait: larger frac = run lower; fill asserts cap groundYFrac ≤ 0.66.
    return tallPhone ? 0.655 : 0.60;
  }

  /** Signed wind used by falling flakes, tree sway, and air drift — never streak lines. */
  function windNow() {
    const gust = S.gustT > 0 ? (0.45 + 0.45 * Math.min(1, S.gustT / 1.4)) : 0;
    return S.windDir * (S.wind + gust);
  }

  function tickWind(dt: number) {
    S.gustT = Math.max(0, S.gustT - dt);
    S.windLabelT = 0; // Ted: no wind text — wind shows as blowing snow only
    if (S.gustT <= 0 && S.wind > 0.22 && Math.random() < (0.004 + S.wind * 0.012)) {
      S.gustT = 1.4 + Math.random() * 1.6;
    }
    const w = windNow();
    const absW = Math.abs(w);
    // Falling snow from the sky — wind only angles the fall (no streak ribbons).
    const n = Math.min(FLAKE_CAP, S.flakes.length);
    for (let i = 0; i < n; i++) {
      const f = S.flakes[i]!;
      const fall = (26 + f.z * 38) * (0.85 + (1 - Math.min(1, absW)) * 0.25);
      f.y += fall * dt;
      f.x += (w * (18 + f.z * 36) + f.vx * 0.35) * dt - S.spd * dt * (0.06 + 0.12 * f.z);
      if (f.y > worldH + 12) {
        f.y = -6 - Math.random() * 40;
        f.x = Math.random() * W;
        f.r = 2.0 + Math.random() * 2.0;
        f.z = Math.random();
      }
      if (f.x < -24) f.x += W + 48;
      if (f.x > W + 24) f.x -= W + 48;
    }
    // Light spindrift off crests only (small puffs, not streaks).
    if (!reduce && absW > 0.35 && Math.random() < 0.12 + absW * 0.15) {
      const sx = S.p.x + 50 + Math.random() * (W * 0.45);
      const gy = snowY(sx);
      const left = snowY(sx - 16); const right = snowY(sx + 16);
      if (gy <= left + 2 && gy <= right + 2 && S.parts.length < 100) {
        S.parts.push({
          x: sx, y: gy - 2, vx: w * (30 + Math.random() * 40), vy: -12 - Math.random() * 24,
          l: 0.2 + Math.random() * 0.25, c: "#f4f7fb", s: 1.2 + Math.random() * 1.6,
        });
      }
    }
  }

  /**
   * Steady side-scroll camera:
   * - Horizontal: heavily damped; rider held ~32% from left for look-ahead.
   * - Vertical: fixed screen fraction for the ride surface; damped + deadzone on bare snow
   *   so rollers/jumps do not yank the cam (air Y is ignored).
   * - Never rotates or zooms per jump.
   */
  function updateCam(dt: number) {
    const groundFrac = overviewCam ? (tallPhone ? 0.42 : 0.4) : playGroundFrac();
    const px = (S.p && Number.isFinite(S.p.x)) ? S.p.x : 110;
    // Bare snow only — jumps never lift the camera.
    const bare = (S.p && Number.isFinite(S.p.x)) ? snowY(px) : GROUND;
    if (overviewCam) {
      camAnchorY = snowY(-camX + 50);
    } else {
      const err = bare - camAnchorY;
      if (Math.abs(err) > CAM_Y_DEAD) {
        // Catch the sustained fall-line outside the roller deadzone.
        const pull = (Math.abs(err) - CAM_Y_DEAD) * Math.min(1, dt * CAM_Y_RATE);
        camAnchorY += Math.sign(err) * Math.min(pull, 90 * Math.max(dt, 1 / 120));
      }
    }
    const wantOY = worldH * groundFrac - camAnchorY;
    // Cap vertical speed: high enough to track the grade, low enough to kill roller yank.
    const maxOyStep = (overviewCam ? 120 : CAM_Y_VEL_CAP) * Math.max(dt, 1 / 120);
    camOYPrev = OY;
    const dOY = Math.max(-maxOyStep, Math.min(maxOyStep, wantOY - OY));
    OY = OY + dOY;
    camOYVel = dt > 0 ? dOY / dt : 0;
    snowFloor = Math.max(camAnchorY + 160, worldH - OY - 2);

    const wantCamX = overviewCam ? (W * 0.04 - 20) : (W * 0.33 - px);
    camXPrev = camX;
    // Heavily damped horizontal hold — rider stays ~33% from the left.
    const blend = overviewCam || dt <= 0 ? 1 : Math.min(1, dt * CAM_X_RATE);
    camX = camX + (wantCamX - camX) * blend;
  }

  /** Snap camera so the rider stays in frame after resize/orientation changes. */
  function frameToRider() {
    const px = (S.p && Number.isFinite(S.p.x)) ? S.p.x : 110;
    const py = (S.p && Number.isFinite(S.p.y))
      ? S.p.y
      : (S.p && Number.isFinite(S.p.x) ? snowY(px) : GROUND);
    camAnchorY = py;
    const frac = overviewCam ? (tallPhone ? 0.42 : 0.4) : playGroundFrac();
    OY = worldH * frac - py;
    camX = overviewCam ? W * 0.04 - 20 : W * 0.33 - px;
    snowFloor = Math.max(py + 120, worldH - OY - 2);
    if (OY + snowFloor > worldH - 2) snowFloor = worldH - 2 - OY;
    camOYPrev = OY;
    camOYVel = 0;
    camXPrev = camX;
  }

  function resize() {
    poseSheetLock = false;
    const vv = window.visualViewport;
    const cssW = Math.max(1, (vv && vv.width > 1 ? vv.width : innerWidth));
    const cssH = Math.max(1, (vv && vv.height > 1 ? vv.height : innerHeight));
    const r = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(cssW * r));
    canvas.height = Math.max(1, Math.round(cssH * r));
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    const aspect = canvas.height / Math.max(1, canvas.width);
    tallPhone = aspect > 1.55;
    landscape = aspect < 0.9;
    playCssH = cssH;
    // Global atlas factor: ride CSS = RIDER_H_FRAC × playfield height (portrait AND landscape).
    const targetRiderCss = overviewCam
      ? Math.max(14, RIDER_H_FRAC * cssH * 0.28)
      : RIDER_H_FRAC * cssH;
    spriteG = targetRiderCss / RIDE_NATIVE_CSS;
    // Camera zoom: keep look-ahead readable; sprites use spriteG independently.
    if (tallPhone) {
      const zoom = (Math.max(targetRiderCss, 72) * r) / RIDER_STAND_WU;
      const minW = overviewCam ? 1280 : 300;
      scale = Math.min(zoom, canvas.width / minW);
      W = canvas.width / scale;
      worldH = canvas.height / scale;
    } else if (landscape) {
      // Landscape: wider look-ahead; sprites still RIDER_H_FRAC of short axis via spriteG.
      const zoom = (Math.max(56, cssH * 0.16) * r) / RIDER_STAND_WU;
      scale = Math.min(zoom, canvas.width / (overviewCam ? 1100 : 640), canvas.height / 260);
      W = canvas.width / scale;
      worldH = canvas.height / scale;
    } else {
      const zoom = (Math.max(targetRiderCss, 64) * r) / RIDER_STAND_WU;
      const fitH = GROUND + 150;
      scale = Math.min(zoom, canvas.height / fitH, canvas.width / (overviewCam ? 960 : 560));
      W = canvas.width / scale;
      worldH = canvas.height / scale;
    }
    frameToRider();
  }

  /** Layout probe for Playwright / Game Boy — CSS pixels, physics untouched. */
  function getView() {
    const dpr = window.devicePixelRatio || 1;
    const cssH = canvas.height / dpr;
    const rideY = (S.p && Number.isFinite(S.p.y)) ? S.p.y : GROUND;
    const groundCss = ((OY + camAnchorY) * scale) / dpr;
    const riderCss = ((OY + rideY) * scale) / dpr;
    const snowCss = Math.max(0, ((OY + snowFloor) * scale) / dpr - groundCss);
    const px = (S.p && Number.isFinite(S.p.x)) ? S.p.x : 110;
    const cssW = canvas.width / dpr;
    return {
      tallPhone,
      landscape,
      scale,
      camX,
      camOY: OY,
      camRot: CAM_ROT,
      camOYVel,
      riderScreenFrac: (camX + px) / Math.max(1, W),
      riderYFrac: riderCss / cssH,
      riderXFrac: (((camX + px) * scale) / dpr) / cssW,
      groundYFrac: groundCss / cssH,
      snowFrac: snowCss / cssH,
      riderCssPx: RIDE_NATIVE_CSS * spriteG,
      riderHFrac: (RIDE_NATIVE_CSS * spriteG) / cssH,
      riderHFracTarget: RIDER_H_FRAC,
      spriteG,
      lookAheadWu: W - (px + camX),
      cssW,
      cssH,
    };
  }

  function captions() { return !PR.done.includes(LV.n); }
  /**
   * Soft Alps tip snow-on-trees — restored from ad13007 (v0.5.0 port of tip Soft Alps
   * from main 358c4d2), i.e. pre-ac1d264 / pre-882c290 snow-loaded graphics pass.
   * 3 dark body tiers + small white snow caps (uh≈5). Trunk upright (rot=0);
   * wind only tips upper tiers gently.
   */
  function pine(x: number, by: number, sc: number, depth: "far" | "mid" | "near", record = false, tallPick = false) {
    // Atlas pines: mix tall/small, same global spriteG; far rows get depth haze / blue tint.
    if (artOk() && art.world && depth !== "near") {
      const id = tallPick || (depth === "mid" && sc > 0.95) ? "pine_tall" : "pine_small";
      const fr = WORLD_FRAMES[id];
      const { w, h } = sprWu(fr);
      cx.save();
      if (depth === "far") {
        // Cool blue depth haze so back rows recede and the rider reads in front.
        cx.filter = "brightness(0.7) saturate(0.35) hue-rotate(18deg) contrast(0.9)";
        cx.globalAlpha = 0.7;
      } else if (depth === "mid") {
        cx.filter = "brightness(0.88) saturate(0.65)";
        cx.globalAlpha = 0.9;
      }
      contactShadow(x, by, w * 0.28, 3.5, depth === "far" ? 0.1 : 0.18);
      drawAtlasFrame(cx, art.world, fr, x, by, atlasDpr(), scale, spriteG, 1);
      cx.restore();
      if (record) treeDbg.push({ x, y: by - h, w: w * 0.5, h: h * 0.32, rot: 0 });
      return;
    }
    const h = (depth === "far" ? 42 : depth === "mid" ? 52 : 58) * sc;
    const w = (depth === "far" ? 16 : depth === "mid" ? 18 : 20) * sc;
    const body = depth === "far" ? "#1a1030" : depth === "mid" ? "#2a1848" : "#1e4a34";
    const mid = depth === "far" ? "#120a24" : depth === "mid" ? "#1c1034" : "#143828";
    const snow = depth === "far" ? "#d8d0e4" : "#f0e8f8";
    const wAbs = Math.abs(windNow());
    const swayAmp = (!reduce && wAbs > 0.18) ? Math.sin(S.t * 3.1 + x * 0.04) * windNow() * (1.4 + wAbs) * sc : 0;
    cx.fillStyle = "#2a1830";
    cx.fillRect(x - 1.5 * sc, by - h * 0.22, 3 * sc, h * 0.22);
    for (let t = 0; t < 3; t++) {
      const lean = swayAmp * (t / 2);
      const tx = x + lean;
      const ty = by - h * (0.28 + t * 0.24);
      const tw = w * (1 - t * 0.22);
      const th = h * (0.34 - t * 0.04);
      cx.fillStyle = t % 2 ? body : mid;
      cx.beginPath(); cx.moveTo(tx - tw, ty); cx.lineTo(tx, ty - th); cx.lineTo(tx + tw, ty); cx.fill();
    }
    if (depth !== "far") {
      cx.fillStyle = snow;
      for (let u = 0; u < 3; u++) {
        const lean = swayAmp * (u / 2);
        const tx = x + lean;
        const uy = by - h * (0.38 + u * 0.22);
        const uw = w * (0.55 - u * 0.12);
        const uh = 5 * sc;
        cx.beginPath();
        cx.moveTo(tx - uw * 0.55, uy - uh * 0.2);
        cx.lineTo(tx, uy - uh * 1.6);
        cx.lineTo(tx + uw * 0.45, uy);
        cx.lineTo(tx, uy + uh * 0.3);
        cx.fill();
      }
    } else {
      cx.fillStyle = snow;
      const uy = by - h * 0.55; const uw = w * 0.4; const uh = 4 * sc;
      cx.beginPath();
      cx.moveTo(x - uw * 0.5, uy - uh * 0.2); cx.lineTo(x, uy - uh * 1.5);
      cx.lineTo(x + uw * 0.4, uy); cx.lineTo(x, uy + uh * 0.25); cx.fill();
    }
    if (record) treeDbg.push({ x, y: by - h, w: w * 2, h: h * 0.55, rot: 0 });
  }
  function overviewTag(txt: string, x: number, y: number) {
    cx.font = "bold 13px system-ui, sans-serif";
    cx.textAlign = "center";
    cx.lineWidth = 3;
    cx.strokeStyle = "#1a1030";
    cx.fillStyle = "#fff8e8";
    cx.strokeText(txt, x, y);
    cx.fillText(txt, x, y);
  }
  /** One short-lived callout above the feature ahead — never on the rider. */
  function callout(f: Feat, txt: string, x: number, y: number, fill: string) {
    if (!captions() || overviewCam) return;
    if (S.grindOn) return;
    const riderWx = worldX(S.p.x);
    // Only label features still ahead of the rider.
    if (f.wx - riderWx < 70 || f.wx - riderWx > 240) return;
    // Keep clear of the rider sprite (≥60 world px).
    if (Math.hypot(x - S.p.x, y - (S.p.y - 40)) < 60) return;
    if (Math.abs(x - S.p.x) < 60) return;
    if (f.labeled != null && f.labeled > 0.8) return;
    if (f.labeled == null) f.labeled = 0;
    const a = Math.max(0, 1 - f.labeled / 0.8);
    cx.globalAlpha = a;
    cx.fillStyle = fill;
    cx.font = "bold 10px system-ui, sans-serif";
    cx.textAlign = "center";
    cx.fillText(txt, x, y);
    cx.globalAlpha = 1;
  }
  function corduroy(x0: number, x1: number, yFn: (x: number) => number) {
    // Sparse soft groom marks on features only — match white/blue-white snow.
    cx.strokeStyle = "rgba(150,170,190,0.22)"; cx.lineWidth = 1;
    for (let x = x0; x < x1; x += 10) {
      const y = yFn(x);
      cx.beginPath(); cx.moveTo(x, y + 2); cx.lineTo(x + 3, y + 6); cx.stroke();
    }
  }
  /** Feature built INTO the snow — no floating slab. Surface already shaped by featH/gY. */
  function drawTerrFeature(f: Feat, sx: number) {
    const L = sx - (f.ap + f.dk); const R = sx + f.dk + f.ex;
    const lipX = sx + f.dk;
    const deck0 = sx - f.dk;
    const isKick = f.k === "kicker";
    const isFlat = f.k === "flat";
    const accent = isKick ? "#e8772e" : isFlat ? "#5ec4b4" : "#e0a040";
    // Soft sidewall shade hugging the surface curve (not a rectangle block).
    cx.beginPath();
    cx.moveTo(L, gY(L));
    for (let x = L; x <= R; x += 5) cx.lineTo(x, gY(x));
    for (let x = R; x >= L; x -= 5) cx.lineTo(x, gY(x) + 9);
    cx.closePath();
    cx.fillStyle = "rgba(120,150,180,0.12)";
    cx.fill();
    // Packed face highlight along takeoff → deck
    cx.beginPath();
    cx.moveTo(L, gY(L));
    for (let x = L; x <= lipX; x += 4) cx.lineTo(x, gY(x));
    for (let x = lipX; x >= L; x -= 4) cx.lineTo(x, gY(x) + 5);
    cx.closePath();
    cx.fillStyle = "rgba(255,252,248,0.55)";
    cx.fill();
    corduroy(L, R, (x) => gY(x));
    // Soft shadow under landing slope
    cx.fillStyle = "rgba(90,120,150,0.10)";
    cx.beginPath();
    cx.moveTo(lipX, gY(lipX) + 2);
    for (let x = lipX; x <= R; x += 6) cx.lineTo(x, gY(x) + 2);
    for (let x = R; x >= lipX; x -= 6) cx.lineTo(x, gY(x) + 14);
    cx.fill();
    // Thin lip edge along the deck (no block / no fat post)
    cx.strokeStyle = f.lip ? "#3ecf9a" : accent;
    cx.lineWidth = isKick ? 2.2 : 1.8;
    cx.lineCap = "round";
    cx.beginPath();
    cx.moveTo(deck0 + 2, gY(deck0));
    cx.lineTo(lipX, gY(lipX));
    cx.stroke();
    // Emphasize landing slope with a second soft shade stripe following gY
    cx.strokeStyle = "rgba(80,60,120,0.22)";
    cx.lineWidth = 6;
    cx.beginPath();
    for (let x = lipX; x <= R; x += 5) {
      const y = gY(x) + 5;
      x === lipX ? cx.moveTo(x, y) : cx.lineTo(x, y);
    }
    cx.stroke();
    // Lip spray
    if (isKick) {
      cx.fillStyle = "rgba(255,255,255,0.7)";
      for (let i = 0; i < 5; i++) {
        const px = lipX - 4 + i * 5 + Math.sin(S.t * 9 + i) * 2;
        const py = gY(lipX) - 6 - i * 3 - Math.cos(S.t * 7 + i) * 2;
        cx.fillRect(px, py, 2.2, 2.2);
      }
    }
    callout(f, isKick ? "KICKER" : isFlat ? "FLAT" : "HIT", sx, gY(deck0) - f.amp * 0.35 - 18, accent);
  }
  function drawFeat(f: Feat) {
    const sx = f.wx - S.dist + S.p.x;
    const d = FEAT[f.k];
    if (!d) return;
    if (f.labeled != null) f.labeled += 1 / 60;
    if (f.k === "rail") {
      const x0 = sx - f.w / 2;
      const x1 = sx + f.w / 2;
      const yAt = (t: number) => gY(x0 + f.w * t) - railDeck(f, t);
      cx.fillStyle = "#efe8f4";
      cx.beginPath();
      cx.moveTo(x0 - 18, gY(x0 - 18));
      cx.quadraticCurveTo(x0 - 4, yAt(0) + 3, x0 + 8, gY(x0 + 8));
      cx.closePath(); cx.fill();
      // Continuous rail tube (no gaps) seated on snow — deck = yAt; posts into pack.
      const postTs = [0.12, 0.32, 0.52, 0.72, 0.9];
      for (const t of postTs) {
        const x = x0 + f.w * t; const y = yAt(t); const crest = gY(x);
        contactShadow(x, crest, 5, 2.2, 0.18);
        cx.fillStyle = "#2a303a";
        cx.fillRect(x - 2.2, y, 4.4, Math.max(10, crest - y + 4));
      }
      cx.beginPath();
      for (let i = 0; i <= 32; i++) {
        const t = i / 32; const x = x0 + f.w * t;
        i === 0 ? cx.moveTo(x, yAt(t) - RAIL_TUBE_TOP) : cx.lineTo(x, yAt(t) - RAIL_TUBE_TOP);
      }
      for (let i = 32; i >= 0; i--) {
        const t = i / 32; const x = x0 + f.w * t;
        cx.lineTo(x, yAt(t) + 1.35);
      }
      cx.closePath();
      cx.fillStyle = artOk() ? "#4a5564" : "#5a6574";
      cx.fill();
      // Top highlight + Franz-style snow pile-on (continuous, scrapeable).
      cx.strokeStyle = "rgba(220,230,240,0.5)"; cx.lineWidth = 1.15; cx.lineCap = "butt"; cx.beginPath();
      for (let i = 0; i <= 32; i++) {
        const t = i / 32; const x = x0 + f.w * t;
        i === 0 ? cx.moveTo(x, yAt(t) - RAIL_TUBE_TOP + 0.35) : cx.lineTo(x, yAt(t) - RAIL_TUBE_TOP + 0.35);
      }
      cx.stroke();
      // Keep snow-piling / scrape on top of the (atlas or vector) rail.
      const cap = f.snowCap || 0;
      if (cap > 0.04) {
        const baseH = 1.15 + cap * 1.45;
        const grindT = (S.grindOn === f)
          ? Math.max(0.08, Math.min(0.92, (S.p.x - x0) / Math.max(1, f.w)))
          : -1;
        const gap = 0.07;
        const segments: [number, number][] = grindT < 0
          ? [[0, 1]]
          : [[0, Math.max(0, grindT - gap)], [Math.min(1, grindT + gap), 1]];
        const drawRibbon = (t0: number, t1: number) => {
          if (t1 - t0 < 0.035) return;
          const n = Math.max(12, Math.round(36 * (t1 - t0)));
          const topPts: { x: number; y: number }[] = [];
          const botPts: { x: number; y: number }[] = [];
          for (let i = 0; i <= n; i++) {
            const u = i / n;
            const t = t0 + (t1 - t0) * u;
            const x = x0 + f.w * t;
            const railTop = yAt(t) - RAIL_TUBE_TOP;
            const uneven = 0.88 + 0.12 * Math.sin(t * 11.7 + f.wx * 0.017)
              + 0.06 * Math.sin(t * 29.3 + f.wx * 0.04);
            const endLocal = Math.min(u, 1 - u);
            const soft = endLocal < 0.18 ? easeInOut(endLocal / 0.18) : 1;
            const tip = Math.min(t, 1 - t);
            const tipSoft = tip < 0.06 ? easeInOut(tip / 0.06) : 1;
            const h = Math.max(0.15, baseH * uneven * soft * tipSoft);
            const drip = (t < 0.03 || t > 0.97) ? 0.7 * tipSoft : (tip < 0.04 ? 0.25 : 0);
            topPts.push({ x, y: railTop - h });
            botPts.push({ x, y: railTop + 0.15 + drip });
          }
          cx.fillStyle = "#f3f7fb";
          cx.beginPath();
          cx.moveTo(botPts[0]!.x, botPts[0]!.y);
          cx.lineTo(topPts[0]!.x, topPts[0]!.y);
          for (let i = 1; i < topPts.length; i++) {
            const a = topPts[i - 1]!; const b = topPts[i]!;
            cx.quadraticCurveTo(a.x, a.y, (a.x + b.x) * 0.5, (a.y + b.y) * 0.5);
          }
          const lastT = topPts[topPts.length - 1]!;
          cx.lineTo(lastT.x, lastT.y);
          for (let i = botPts.length - 1; i >= 0; i--) cx.lineTo(botPts[i]!.x, botPts[i]!.y);
          cx.closePath();
          cx.fill();
        };
        for (const [a, b] of segments) drawRibbon(a, b);
      }
      if (overviewCam) overviewTag("RAIL", sx, yAt(0.5) - 28);
      else if (!S.grindOn || S.grindOn !== f) callout(f, "RAIL", x0 + f.w * 0.82, yAt(0.82) - 22, "#e8eef8");
    } else if (f.k === "box") {
      const x0 = sx - f.w / 2; const x1 = sx + f.w / 2;
      const crest = gY(sx); const top = crest - f.h;
      contactShadow(sx, crest + 1, f.w * 0.42, 4, 0.22);
      // Approach snow ramp built into the pack (reads as ride-on, not a floating plank).
      cx.fillStyle = "#f0eaf6";
      cx.beginPath();
      cx.moveTo(x0 - 44, gY(x0 - 44));
      cx.lineTo(x0 - 6, top + 2);
      cx.lineTo(x0 + 24, crest + 1);
      cx.lineTo(x0 + 8, crest + 4);
      cx.closePath(); cx.fill();
      // Box body sunk past the crest stroke.
      cx.fillStyle = "#6a7382";
      cx.fillRect(x0, top, f.w, crest - top + 6);
      cx.fillStyle = "#c5ceda";
      cx.fillRect(x0, top, f.w, 5);
      cx.fillStyle = "#9aa6b6";
      cx.fillRect(x0, top + 5, f.w, 3);
      // Box snow — flat even thin blanket on the deck; bare strip under the board.
      const bcap = f.snowCap || 0;
      if (bcap > 0.04) {
        const thick = 1.0 + bcap * 1.4;
        const scrapeX = S.grindOn === f ? S.p.x : -9999;
        cx.fillStyle = "#f5f9fc";
        cx.beginPath();
        const pad = 1.5;
        cx.moveTo(x0 + pad, top + 0.4);
        for (let i = 0; i <= 24; i++) {
          const t = i / 24;
          const x = x0 + pad + (f.w - pad * 2) * t;
          const scrape = Math.max(0, 1 - Math.abs(x - scrapeX) / 18);
          // Soft scrape taper so the gap doesn't look punched out.
          const edge = scrape > 0.55 ? easeInOut((scrape - 0.55) / 0.45) : 0;
          const h = thick * (1 - edge * 0.95);
          const endTaper = Math.min(t, 1 - t) < 0.04 ? easeInOut(Math.min(t, 1 - t) / 0.04) : 1;
          cx.lineTo(x, top - h * endTaper);
        }
        cx.lineTo(x1 - pad, top + 0.4);
        cx.closePath();
        cx.fill();
      }
      // Snow bank wrapping the lower half so the deck sits in the pack.
      cx.fillStyle = "#f2ecf8";
      cx.beginPath();
      cx.moveTo(x0 - 8, crest + 5);
      cx.quadraticCurveTo(x0 + f.w * 0.15, top + f.h * 0.35, x0 + f.w * 0.35, top + f.h * 0.5);
      cx.quadraticCurveTo(x0 + f.w * 0.55, top + f.h * 0.35, x0 + f.w * 0.7, top + f.h * 0.5);
      cx.quadraticCurveTo(x0 + f.w * 0.9, top + f.h * 0.4, x1 + 8, crest + 5);
      cx.lineTo(x1 + 4, crest + 8);
      cx.lineTo(x0 - 4, crest + 8);
      cx.closePath(); cx.fill();
      if (overviewCam) overviewTag("BOX", sx, top - 16);
      else if (!S.grindOn || S.grindOn !== f) callout(f, "BOX", sx, top - 12, "#d7e0ee");
    } else if (f.k === "log") {
      const x0 = sx - f.w / 2; const x1 = sx + f.w / 2; const y = gY(sx) - f.h;
      const base = snowY(sx);
      contactShadow(sx, base + 1, f.w * 0.4, 3.5, 0.22);
      cx.fillStyle = "#4a2a12";
      cx.beginPath(); cx.ellipse(sx, y + 5, f.w / 2, 8, 0, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = "#8a5a32";
      cx.beginPath(); cx.ellipse(sx, y + 3, f.w / 2 - 2, 6, 0, Math.PI, 0); cx.fill();
      cx.fillStyle = "#c4a574";
      cx.beginPath(); cx.ellipse(x0 + 2, y + 5, 7, 8, 0, 0, Math.PI * 2); cx.fill();
      cx.beginPath(); cx.ellipse(x1 - 2, y + 5, 7, 8, 0, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = "#f4f0f8";
      cx.beginPath(); cx.ellipse(x0 - 2, base + 2, 12, 5, 0, 0, 7); cx.fill();
      cx.beginPath(); cx.ellipse(x1 + 2, base + 2, 12, 5, 0, 0, 7); cx.fill();
      if (overviewCam) overviewTag("LOG", sx, y - 16);
      else if (!S.grindOn || S.grindOn !== f) callout(f, "LOG", sx, y - 12, "#e7c49a");
    } else if (d.terr) {
      drawTerrFeature(f, sx);
      // Atlas kicker seated on the slope (bottom at terrain y, rotated to local slope).
      if (f.k === "kicker" && artOk() && art.world) {
        const fr = WORLD_FRAMES.kicker;
        const { w: kw } = sprWu(fr);
        // Anchor under the takeoff face so the ramp doesn't float above the pack.
        const seatX = sx - f.dk * 0.2;
        const seatY = gY(seatX) + 5; // embed into snow so the base reads seated
        const slope = slopeAt(seatX);
        contactShadow(seatX, gY(seatX) + 1, Math.min(kw * 0.48, f.ap * 0.55 + 24), 6, 0.28);
        // Draw bottom-aligned; slope rotate keeps the base on the fall line.
        drawAtlasFrame(cx, art.world, fr, seatX, seatY, atlasDpr(), scale, spriteG, 1, slope * 0.7);
      }
      if (overviewCam) overviewTag(f.k === "kicker" ? "KICKER" : f.k === "flat" ? "FLAT" : "HIT", sx, gY(sx - f.dk) - f.amp * 0.35 - 20);
    } else if (f.k === "grom" || f.k === "skier") {
      drawMob(f, sx);
    }
  }
  /** Traffic — Franz grom atlas (kid) + skier/patrol; vector fallback otherwise. */
  function drawMob(f: Feat, sx: number) {
    const gy = gY(sx);
    const bob = f.pose === "sit" ? 0 : Math.sin(S.t * 6 + f.ph) * 2;
    const ski = f.k === "skier";
    // Franz Grom 1 — sit on decks/runouts, ride on flats; faces +X / downhill.
    if (!ski && art.grom) {
      const fr = f.pose === "sit" ? GROM_FRAMES.grom_sit : GROM_FRAMES.grom_ride;
      const { w: mw } = sprWu(fr);
      contactShadow(sx, gy, mw * 0.34, 3.2, 0.22);
      const rot = f.pose === "sit" ? 0 : slopeAt(sx) * 0.35;
      drawAtlasFrame(cx, art.grom, fr, sx, gy + 1 + bob * 0.25, atlasDpr(), scale, spriteG, 1, rot);
      if (overviewCam) overviewTag("GROM", sx, gy - 48);
      return;
    }
    if (artOk() && art.world && ski) {
      const fr = WORLD_FRAMES.patrol;
      const { w: mw } = sprWu(fr);
      contactShadow(sx, gy, mw * 0.35, 3.5, 0.24);
      drawAtlasFrame(cx, art.world, fr, sx, gy + 1, atlasDpr(), scale, spriteG, 1, slopeAt(sx) * 0.4);
      return;
    }
    const slope = slopeAt(sx);
    const jacket = ski ? "#2f6fed" : "#e85a2a";
    const jacketHi = ski ? "#7eb0ff" : "#ffb07a";
    const pants = ski ? "#1e3a6e" : "#5a2a18";
    const helm = ski ? "#f4f0e8" : "#d4a018";
    const helmDark = ski ? "#c8c0b0" : "#a87810";
    const boardC = ski ? "#e8eef8" : "#ff7a3a";
    const boardS = ski ? "#8a94a4" : "#ffe0c0";
    cx.save();
    cx.translate(sx, gy + bob);
    cx.rotate(slope * 0.9);
    cx.scale(0.7, 0.7);
    if (ski) {
      // Twin skis
      cx.strokeStyle = boardC; cx.lineWidth = 3.2; cx.lineCap = "round";
      cx.beginPath(); cx.moveTo(-30, 4); cx.lineTo(28, 2); cx.stroke();
      cx.beginPath(); cx.moveTo(-28, 8); cx.lineTo(30, 6); cx.stroke();
      cx.strokeStyle = boardS; cx.lineWidth = 1.2;
      cx.beginPath(); cx.moveTo(-28, 4); cx.lineTo(26, 2); cx.moveTo(-26, 8); cx.lineTo(28, 6); cx.stroke();
    } else {
      cx.fillStyle = boardC;
      cx.beginPath(); cx.moveTo(-30, -1); cx.lineTo(30, -1); cx.lineTo(27, 6); cx.lineTo(-27, 6); cx.closePath(); cx.fill();
      cx.fillStyle = boardS; cx.fillRect(-18, 1, 36, 2);
      cx.fillStyle = "#2a2438";
      cx.fillRect(-10, -4, 8, 5); cx.fillRect(2, -4, 8, 5);
    }
    // Boots
    cx.fillStyle = "#1a1828";
    cx.fillRect(-10, -5, 7, 4); cx.fillRect(3, -5, 7, 4);
    // Legs
    cx.fillStyle = pants;
    cx.fillRect(-10, -26, 8, 22); cx.fillRect(2, -26, 8, 22);
    // Jacket
    cx.fillStyle = jacket;
    cx.beginPath(); cx.moveTo(-14, -46); cx.lineTo(14, -46); cx.lineTo(16, -22); cx.lineTo(-16, -22); cx.closePath(); cx.fill();
    cx.strokeStyle = jacketHi; cx.lineWidth = 1.4;
    cx.strokeRect(-8, -40, 6, 9); cx.strokeRect(2, -40, 6, 9);
    // Arms (+ poles for skiers)
    cx.strokeStyle = jacket; cx.lineWidth = 5.2; cx.lineCap = "round";
    cx.beginPath();
    cx.moveTo(-11, -38); cx.lineTo(ski ? -22 : -20, ski ? -18 : -24);
    cx.moveTo(11, -38); cx.lineTo(ski ? 22 : 20, ski ? -18 : -22);
    cx.stroke();
    if (ski) {
      cx.strokeStyle = "#c8d0dc"; cx.lineWidth = 1.8;
      cx.beginPath();
      cx.moveTo(-22, -18); cx.lineTo(-28, 10);
      cx.moveTo(22, -18); cx.lineTo(30, 8);
      cx.stroke();
      cx.fillStyle = "#9aa4b4";
      cx.beginPath(); cx.arc(-28, 10, 2.2, 0, 7); cx.arc(30, 8, 2.2, 0, 7); cx.fill();
    }
    // Helmet + face + goggles
    cx.fillStyle = helm;
    cx.beginPath(); cx.arc(0, -54, 11, 0, 7); cx.fill();
    cx.fillStyle = helmDark;
    cx.beginPath(); cx.arc(0, -57, 9, Math.PI, 0); cx.fill();
    cx.fillStyle = "#e8b890";
    cx.beginPath(); cx.ellipse(0, -48, 6, 5, 0, 0, 7); cx.fill();
    cx.strokeStyle = "#121820"; cx.lineWidth = 2.6; cx.lineCap = "round";
    cx.beginPath(); cx.arc(0, -54, 11.2, 0.35, Math.PI - 0.35); cx.stroke();
    cx.fillStyle = "#1a222c"; cx.fillRect(-9, -56, 18, 8);
    cx.fillStyle = ski ? "#5ec8ff" : "#f0a028";
    cx.fillRect(-8, -55, 7, 6); cx.fillRect(1, -55, 7, 6);
    cx.strokeStyle = "#0e141c"; cx.lineWidth = 1;
    cx.strokeRect(-9, -56, 18, 8);
    if (overviewCam) overviewTag(ski ? "SKIER" : "GROM", 0, -78);
    cx.restore();
  }
  /**
   * Articulated rider pose (local units; board at y≈0, head ~-58).
   * Parts move independently — never a whole-sprite flip for grabs/rails.
   */
  type Pose = {
    boardRot: number; boardSX: number; boardSY: number; boardY: number;
    knee: number; stance: number; arch: number; lean: number;
    twist: number; headTurn: number; headTilt: number;
    lArmX: number; lArmY: number; rArmX: number; rArmY: number;
    press: number;
  };
  function poseIdle(air: boolean): Pose {
    return {
      boardRot: 0, boardSX: 1, boardSY: 1, boardY: 0,
      knee: air ? 0.22 : 0.08, stance: 1, arch: 0, lean: air ? -0.04 : 0.02,
      twist: 0, headTurn: 0, headTilt: 0,
      lArmX: air ? -26 : -20, lArmY: air ? -56 : -28,
      rArmX: air ? 26 : 20, rArmY: air ? -54 : -26,
      press: 0,
    };
  }
  function poseGrab(g: NonNullable<GrabId>): Pose {
    const p = poseIdle(true);
    p.knee = 0.55;
    if (g === "Indy") {
      // Back hand to toe edge between feet; knees bent.
      p.rArmX = 4; p.rArmY = -4; p.lArmX = 24; p.lArmY = -50;
      p.knee = 0.62; p.arch = 0.08; p.boardRot = 0.06;
    } else if (g === "Melon") {
      // Front hand to heel edge between feet.
      p.lArmX = -4; p.lArmY = -4; p.rArmX = -22; p.rArmY = -52;
      p.knee = 0.58; p.boardRot = -0.05;
    } else if (g === "Mute") {
      // Front hand on toe edge.
      p.lArmX = 6; p.lArmY = -6; p.rArmX = 22; p.rArmY = -52;
      p.knee = 0.5; p.boardRot = 0.08;
    } else if (g === "Stalefish") {
      // Back hand reaches behind back leg to heel edge.
      p.rArmX = -6; p.rArmY = -2; p.lArmX = -24; p.lArmY = -48;
      p.knee = 0.6; p.twist = 0.18; p.arch = 0.12; p.boardRot = -0.1;
    } else if (g === "Method") {
      // Knees tucked, back hand grabs heel, board tweaked up behind, back arched.
      p.knee = 1; p.arch = 0.72; p.lean = -0.28; p.stance = 0.72;
      p.rArmX = -10; p.rArmY = -6; p.lArmX = -20; p.lArmY = -64;
      p.boardRot = -0.85; p.boardY = -18; p.headTilt = -0.25;
    } else if (g === "Tail") {
      p.rArmX = 28; p.rArmY = 2; p.lArmX = -16; p.lArmY = -22;
      p.boardRot = 0.42; p.knee = 0.4; p.lean = 0.12; p.press = 0.35;
    } else if (g === "Nose") {
      p.lArmX = -28; p.lArmY = 2; p.rArmX = 16; p.rArmY = -22;
      p.boardRot = -0.42; p.knee = 0.4; p.lean = -0.1; p.press = -0.35;
    }
    return p;
  }
  function poseRail(style: GrindStyle): Pose {
    const p = poseIdle(false);
    if (style === "fifty") {
      p.knee = 0.12; p.lean = 0.02; p.twist = 0;
    } else if (style === "boardslide" || style === "lipslide") {
      // Board perpendicular to rail; shoulders squared to the rail.
      p.boardRot = style === "lipslide" ? -1.15 : 1.15;
      p.boardSX = 0.55; p.twist = 0.85; p.knee = 0.28;
      p.headTurn = style === "lipslide" ? -0.4 : 0.4;
      p.lArmX = -18; p.lArmY = -34; p.rArmX = 18; p.rArmY = -34;
    } else if (style === "nose") {
      p.press = -0.7; p.boardRot = -0.28; p.lean = -0.18; p.knee = 0.2;
      p.boardY = 2; p.lArmX = -14; p.lArmY = -30; p.rArmX = 22; p.rArmY = -40;
    } else if (style === "tail") {
      p.press = 0.7; p.boardRot = 0.28; p.lean = 0.18; p.knee = 0.2;
      p.boardY = 2; p.lArmX = -22; p.lArmY = -40; p.rArmX = 14; p.rArmY = -30;
    }
    return p;
  }
  function poseSpin(air: boolean, flip: number, wind: number, dir: number): Pose {
    const p = poseIdle(air);
    const phase = ((flip % TAU) + TAU) % TAU;
    // 2D spin: rider turns to face camera / away; board foreshortens.
    const face = Math.sin(phase); // 0 side-on, ±1 face cam / away
    p.twist = face * 0.95 * Math.min(1, Math.abs(flip) / 1.2);
    p.boardSX = 0.35 + 0.65 * Math.abs(Math.cos(phase));
    p.boardSY = 0.85 + 0.15 * Math.abs(Math.cos(phase));
    p.headTurn = face * 0.7;
    // Spot the landing in the last quarter of each 180.
    const spot = Math.abs(phase - Math.PI) < 0.7 || Math.abs(phase) < 0.45 || Math.abs(phase - TAU) < 0.45;
    if (spot && Math.abs(flip) > 1) { p.headTurn *= 0.35; p.headTilt = -0.08; }
    if (!air && wind > 0.05) {
      // Shoulders lead / wind up before takeoff.
      p.twist = -dir * wind * 0.55;
      p.lArmX = -22 - dir * wind * 10; p.lArmY = -36 - wind * 8;
      p.rArmX = 22 - dir * wind * 10; p.rArmY = -34 - wind * 6;
      p.lean = dir * wind * 0.08; p.knee = 0.15 + wind * 0.2;
    } else if (air) {
      p.lArmX = -24 - face * 8; p.lArmY = -52;
      p.rArmX = 24 - face * 8; p.rArmY = -50;
      p.knee = 0.35;
    }
    return p;
  }
  function lerpPose(a: Pose, b: Pose, t: number): Pose {
    const u = easeInOut(t);
    const out = {} as Pose;
    (Object.keys(a) as (keyof Pose)[]).forEach((k) => { out[k] = a[k] + (b[k] - a[k]) * u; });
    return out;
  }
  function currentPose(): Pose {
    const air = !S.p.on && !S.grindOn;
    let base = poseIdle(air);
    if (S.grindOn) base = poseRail(S.grindStyle);
    else if (air && (S.holding || Math.abs(S.flip) > 0.2 || Math.abs(S.yaw) > 0.2)) {
      base = poseSpin(true, S.flip + S.yaw, 0, S.spinDir);
    }
    else if (!air && S.windup > 0.05) base = poseSpin(false, 0, S.windup, S.spinDir);
    if (S.grab && S.grabEase > 0.01 && air) {
      base = lerpPose(base, poseGrab(S.grab), S.grabEase);
    }
    if (S.mode === "over") {
      base.lean = 1.1; base.boardRot = 0.8; base.knee = 0.3;
      base.lArmX = -30; base.lArmY = -20; base.rArmX = 28; base.rArmY = -18;
    }
    return base;
  }
  /** Draw articulated rider at local origin (board ≈ y0). */
  function paintRider(pose: Pose, bbC: string, bbS: string, opts?: { label?: string; scale?: number }) {
    const sc = opts?.scale || 1;
    cx.save();
    if (sc !== 1) cx.scale(sc, sc);
    // Board (separate part — tweak / foreshorten / press flex); rises with knee tuck.
    const tuckLift = Math.max(0, Math.min(1, pose.knee)) * 18;
    cx.save();
    cx.translate(pose.press * 6, pose.boardY - tuckLift);
    cx.rotate(pose.boardRot);
    cx.scale(Math.max(0.22, pose.boardSX), Math.max(0.55, pose.boardSY));
    cx.fillStyle = bbC;
    cx.beginPath();
    cx.moveTo(-34, -1); cx.lineTo(34, -1); cx.lineTo(31, 7); cx.lineTo(-31, 7);
    cx.closePath(); cx.fill();
    // Press flex: slight board bend.
    if (Math.abs(pose.press) > 0.2) {
      cx.strokeStyle = bbS; cx.lineWidth = 2;
      cx.beginPath();
      cx.moveTo(-28, 2);
      cx.quadraticCurveTo(0, 2 + pose.press * 5, 28, 2);
      cx.stroke();
    } else {
      cx.fillStyle = bbS; cx.fillRect(-22, 1, 44, 2.5);
    }
    cx.restore();
    // Bindings + boots — high knee pulls boots up toward the chest (real tuck).
    const tuck = Math.max(0, Math.min(1, pose.knee));
    const bootY = -5 - tuck * 22;
    const st = 11 * pose.stance * (1 - tuck * 0.25);
    const bootSpread = st * (1 - tuck * 0.35);
    cx.fillStyle = "#2a2438";
    cx.fillRect(-bootSpread - 1, bootY, 10, 6); cx.fillRect(bootSpread - 9, bootY, 10, 6);
    cx.fillStyle = "#1a1828";
    cx.fillRect(-bootSpread - 1, bootY - 1, 8, 5); cx.fillRect(bootSpread - 7, bootY - 1, 8, 5);
    // Legs (thigh + shin): knee bends forward/back so tuck reads clearly.
    const hipY = -28 - pose.arch * 10 - pose.lean * 6 + tuck * 6;
    const kneeX = tuck * 10;
    const kneeY = hipY + 8 + (1 - tuck) * 12;
    cx.strokeStyle = "#2a9a9a"; cx.lineWidth = 8; cx.lineCap = "round";
    cx.beginPath();
    cx.moveTo(-st + 4, hipY); cx.lineTo(-st + 4 + kneeX, kneeY); cx.lineTo(-bootSpread + 2, bootY);
    cx.moveTo(st - 4, hipY); cx.lineTo(st - 4 + kneeX * 0.6, kneeY); cx.lineTo(bootSpread - 2, bootY);
    cx.stroke();
    // Torso — arch / lean / twist (width foreshortens with twist)
    const torsoW = 15 * (0.45 + 0.55 * (1 - Math.abs(pose.twist) * 0.7));
    const torsoTop = hipY - 24 - pose.arch * 10;
    const torsoLeanX = pose.lean * 12 + pose.twist * 4;
    cx.fillStyle = "#1e5a40";
    cx.beginPath();
    cx.moveTo(-torsoW + torsoLeanX, torsoTop);
    cx.lineTo(torsoW + torsoLeanX, torsoTop);
    cx.lineTo(torsoW + 2 + pose.twist * 3, hipY + 4);
    cx.lineTo(-torsoW - 2 + pose.twist * 3, hipY + 4);
    cx.closePath(); cx.fill();
    cx.strokeStyle = "#8fd96a"; cx.lineWidth = 1.5;
    cx.strokeRect(-6 + torsoLeanX, torsoTop + 6, 5, 8);
    cx.strokeRect(1 + torsoLeanX, torsoTop + 6, 5, 8);
    // Arms (shoulder → hand) as articulated strokes
    const shY = torsoTop + 8;
    const shLX = -torsoW + 2 + torsoLeanX;
    const shRX = torsoW - 2 + torsoLeanX;
    cx.strokeStyle = "#1e5a40"; cx.lineWidth = 5.5; cx.lineCap = "round";
    cx.beginPath();
    cx.moveTo(shLX, shY); cx.lineTo(pose.lArmX, pose.lArmY);
    cx.moveTo(shRX, shY); cx.lineTo(pose.rArmX, pose.rArmY);
    cx.stroke();
    // Hands
    cx.fillStyle = "#e8b890";
    cx.beginPath(); cx.arc(pose.lArmX, pose.lArmY, 3.2, 0, 7); cx.arc(pose.rArmX, pose.rArmY, 3.2, 0, 7); cx.fill();
    // Head + helmet (spots landing via headTurn)
    const hx = torsoLeanX + pose.headTurn * 8 + pose.twist * 6;
    const hy = torsoTop - 10 + pose.headTilt * 6;
    cx.fillStyle = "#1a6a68";
    cx.beginPath(); cx.arc(hx, hy, 11, 0, 7); cx.fill();
    cx.fillStyle = "#145854";
    cx.beginPath(); cx.arc(hx, hy - 3, 9, Math.PI, 0); cx.fill();
    cx.fillStyle = "#e8b890";
    cx.beginPath(); cx.ellipse(hx + pose.headTurn * 2, hy + 5, 6, 5, 0, 0, 7); cx.fill();
    cx.strokeStyle = "#121820"; cx.lineWidth = 2.6; cx.lineCap = "round";
    cx.beginPath(); cx.arc(hx, hy, 11.2, 0.35, Math.PI - 0.35); cx.stroke();
    const gw = 18 * (0.55 + 0.45 * (1 - Math.abs(pose.twist) * 0.5));
    cx.fillStyle = "#1a222c"; cx.fillRect(hx - gw / 2, hy - 3, gw, 8);
    cx.fillStyle = "#f0a028";
    cx.fillRect(hx - gw / 2 + 1, hy - 2, gw * 0.4, 6);
    cx.fillRect(hx + 1, hy - 2, gw * 0.4, 6);
    cx.strokeStyle = "#0e141c"; cx.lineWidth = 1.1;
    cx.strokeRect(hx - gw / 2, hy - 3, gw, 8);
    if (opts?.label) {
      cx.fillStyle = "rgba(20,12,40,0.72)";
      cx.fillRect(-42, 16, 84, 16);
      cx.fillStyle = "#f4eef8";
      cx.font = "bold 10px ui-sans-serif,system-ui,sans-serif";
      cx.textAlign = "center";
      cx.fillText(opts.label, 0, 27);
    }
    cx.restore();
  }
  /** Pick Franz rider frame — distinct body pose per trick; tuck/grab not upscaled. */
  function riderFrameId(): RiderFrameId {
    if (S.mode === "over") return "crash";
    if (S.grindOn) return "slide";
    if (S.land > 0.55) return "land";
    if (S.grabEase > 0.35 && S.grab) {
      const g = S.grab;
      if (g === "Indy") return "indy";
      if (g === "Method") return "method";
      if (g === "Mute") return "mute";
      if (g === "Stalefish") return "stalefish";
      // Melon / Tail / Nose — no dedicated frame yet; use air tuck.
      return "air";
    }
    if (!S.p.on && !S.grindOn) return "air";
    return "ride";
  }
  function drawRider() {
    const p = S.p; const slope = slopeAt(p.x); const hopY = -Math.sin(S.hop * Math.PI) * 10;
    // Soft contact shadow on snow / rail deck.
    if (p.on || S.grindOn) {
      const sw = (RIDE_NATIVE_CSS * spriteG) * 0.22 * (atlasDpr() / scale);
      contactShadow(p.x, p.y + 2, sw, 3.2, S.grindOn ? 0.32 : 0.26);
    }
    cx.save();
    cx.translate(p.x, p.y + hopY);
    // Rider v2 faces +X (downhill) as authored — no facing mirror.
    if (artOk() && art.rider) {
      const fr = RIDER_FRAMES[riderFrameId()];
      let rot = 0;
      if (S.mode === "over") rot = -0.9;
      else if (S.grindOn) {
        // Board snapped to rail: pitch follows deck; boardslide faces across.
        rot = slope * 0.55 + (S.grindStyle === "nose" ? -0.1 : S.grindStyle === "tail" ? 0.1 : S.grindStyle === "boardslide" || S.grindStyle === "lipslide" ? 0.04 : 0.02);
      } else if (p.on) rot = slope * 0.85;
      else {
        rot = Math.max(-0.25, Math.min(0.35, -p.vy / 2200));
        if (Math.abs(S.flip) > 0.25 || Math.abs(S.yaw) > 0.25) rot += S.flip + S.yaw;
      }
      cx.rotate(rot);
      // Grind: nest into rail top. Snow: lift so the board sole sits on the crest (not sunk through it).
      const unit = (RIDE_NATIVE_CSS * spriteG) * (atlasDpr() / scale);
      if (S.grindOn) cx.translate(0, unit * 0.04);
      else if (p.on) cx.translate(0, -unit * 0.09);
      // Dark rim / soft outline so the rider reads in front of the tree band.
      cx.save();
      cx.shadowColor = "rgba(6,2,18,0.95)";
      cx.shadowBlur = 8;
      cx.shadowOffsetX = 0;
      cx.shadowOffsetY = 1.8;
      drawAtlasFrame(cx, art.rider, fr, 0, 0, atlasDpr(), scale, spriteG, 1);
      cx.restore();
    } else {
      let pitch = p.on || S.grindOn
        ? slope + (S.grindOn ? (S.grindStyle === "nose" ? -0.12 : S.grindStyle === "tail" ? 0.12 : 0.04) : 0)
        : Math.max(-0.2, Math.min(0.35, -p.vy / 2200));
      if (!p.on && !S.grindOn && (Math.abs(S.flip) > 0.25 || Math.abs(S.yaw) > 0.25)) {
        pitch += Math.sin(S.flip + S.yaw) * 0.08;
      }
      cx.rotate(pitch);
      if (S.mode === "over") { cx.translate(0, 4); cx.rotate(0.9); }
      const BB = board();
      paintRider(currentPose(), BB.c, BB.s);
    }
    // Boost jets aft of the board (local −X while facing +X).
    if (!p.on && S.boostT > 0) {
      cx.fillStyle = "rgba(255,120,40,0.55)";
      for (let i = 0; i < 4; i++) cx.fillRect(-6 - i * 3, 8 + i * 4, 4, 6);
    }
    cx.restore();
  }
  /** Pose QA sheet — each trick pose large & readable (phone). Original art, not a game copy. */
  function renderPoseSheet() {
    poseSheetLock = true;
    if (S.mode === "play") S.mode = "pause";
    const dpr = window.devicePixelRatio || 1;
    const cssW = 390;
    const cssH = 844;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = cx.createLinearGradient(0, 0, 0, cssH);
    bg.addColorStop(0, "#1a0a38"); bg.addColorStop(1, "#3a1a68");
    cx.fillStyle = bg; cx.fillRect(0, 0, cssW, cssH);
    cx.fillStyle = "#f4eef8";
    cx.font = "bold 18px ui-sans-serif,system-ui,sans-serif";
    cx.textAlign = "left";
    cx.fillText("Terrain Park — Trick Pose QA", 16, 28);
    cx.font = "12px ui-sans-serif,system-ui,sans-serif";
    cx.fillStyle = "#c8b8d8";
    cx.fillText("Articulated rider · original poses · not a game copy", 16, 46);
    const BB = board();
    type Cell = { lab: string; pose: Pose };
    const grabs: Cell[] = (["Indy", "Melon", "Mute", "Stalefish", "Method", "Tail", "Nose"] as NonNullable<GrabId>[]).map((g) => ({ lab: g, pose: poseGrab(g) }));
    const rails: Cell[] = [
      { lab: "50-50", pose: poseRail("fifty") },
      { lab: "Boardslide", pose: poseRail("boardslide") },
      { lab: "Nose Press", pose: poseRail("nose") },
      { lab: "Tail Press", pose: poseRail("tail") },
    ];
    const spins: Cell[] = [
      { lab: "Wind-up", pose: poseSpin(false, 0, 1, 1) },
      { lab: "FS 180 face", pose: poseSpin(true, Math.PI * 0.5, 0, 1) },
      { lab: "BS 360 edge", pose: poseSpin(true, Math.PI, 0, -1) },
      { lab: "FS 540 spot", pose: poseSpin(true, Math.PI * 1.75, 0, 1) },
    ];
    const rows: { title: string; cells: Cell[] }[] = [
      { title: "Grabs", cells: grabs },
      { title: "Rails", cells: rails },
      { title: "Spins", cells: spins },
    ];
    let y0 = 70;
    for (const row of rows) {
      cx.fillStyle = "#e8dcf0";
      cx.font = "bold 13px ui-sans-serif,system-ui,sans-serif";
      cx.textAlign = "left";
      cx.fillText(row.title, 16, y0);
      const n = row.cells.length;
      const cellW = (cssW - 24) / Math.min(4, n);
      row.cells.forEach((cell, i) => {
        const col = i % 4;
        const rr = Math.floor(i / 4);
        const cx0 = 12 + col * cellW + cellW / 2;
        const cy0 = y0 + 78 + rr * 150;
        cx.fillStyle = "rgba(255,255,255,0.06)";
        cx.fillRect(cx0 - cellW / 2 + 4, cy0 - 70, cellW - 8, 138);
        cx.save();
        cx.translate(cx0, cy0);
        paintRider(cell.pose, BB.c, BB.s, { label: cell.lab, scale: 1.15 });
        cx.restore();
      });
      const rowsUsed = Math.ceil(n / 4);
      y0 += 30 + rowsUsed * 150;
    }
  }

  function draw() {
    if (poseSheetLock) { renderPoseSheet(); return; }
    cx.setTransform(1, 0, 0, 1, 0, 0);
    const bgId = activeBackdrop();
    // Sky extension sampled from backdrop top row — matches art, no mismatched band.
    const skyTop = art.bgSky[bgId] || (bgId === "night" ? "#0c1028" : "#0552a0");
    cx.fillStyle = skyTop;
    cx.fillRect(0, 0, canvas.width, canvas.height);

    cx.setTransform(scale, 0, 0, scale, 0, 0);
    const sky = cx.createLinearGradient(0, 0, 0, worldH);
    if (bgId === "night") {
      sky.addColorStop(0, skyTop); sky.addColorStop(0.6, "#141830"); sky.addColorStop(1, "#2a3048");
    } else {
      // Keep the top matching the art; ease slightly lighter downward so the
      // mountain plate never sits under a darker mismatched slab.
      sky.addColorStop(0, skyTop); sky.addColorStop(0.35, skyTop); sky.addColorStop(1, "#3a7ec4");
    }
    cx.fillStyle = sky; cx.fillRect(-80, 0, W + 160, worldH);

    cx.save();
    cx.translate(camX, OY);
    // Clip below chrome only — keep this tight so the backdrop runs up behind the HUD.
    const dpr = window.devicePixelRatio || 1;
    const hudWorld = ((tallPhone ? 64 : 44) * dpr) / scale;
    cx.beginPath();
    cx.rect(-camX - 80, -OY + hudWorld, W + 160, worldH + 40);
    cx.clip();
    if (S.shake > 0 && !reduce) { cx.translate((Math.random() - 0.5) * S.shake, (Math.random() - 0.5) * S.shake); S.shake *= 0.9; if (S.shake < 0.5) S.shake = 0; }
    const clipTop = -OY + hudWorld;
    const viewL = -camX - 40; const viewR = -camX + W + 40;
    let crestSample = 0;
    let crestLow = -Infinity;
    for (let i = 0; i < 8; i++) {
      const y = snowY(viewL + ((viewR - viewL) * (i + 0.5)) / 8);
      crestSample += y;
      if (y > crestLow) crestLow = y;
    }
    const crestY = crestSample / 8;

    // Resort backdrop: bottom-anchored far parallax (no tilt). Portrait keeps peaks
    // near 35–45% screen height; above the tile is a vertical sky gradient sampled
    // from the tile top row with a ~40 CSS-px feathered seam (no hard band).
    {
      const img = art.bg[bgId];
      if (img === undefined) void ensureBackdrop(art, bgId).then(() => draw());
      const bot = (Number.isFinite(crestLow) ? crestLow : crestY) + 52;
      if (img) {
        const aspect = BG_W / BG_SRC_H;
        const needH = Math.max(90, bot - clipTop);
        const needW = Math.max(120, viewR - viewL);
        let wWu: number;
        let hWu: number;
        if (landscape) {
          // Exactly one plate spanning the view — never tile 2–3 copies.
          wWu = Math.max(needW * 1.02, needH * 1.05 * aspect);
          hWu = wWu / aspect;
        } else {
          // Tall phones: start the plate ~18% down so peaks read near 35–45% height
          // (not a thin strip under a flat empty sky).
          const wantTopY = clipTop + needH * 0.18;
          hWu = Math.max(200, bot - wantTopY);
          wWu = hWu * aspect;
          if (wWu < needW) { wWu = needW; hWu = wWu / aspect; }
        }
        const topY = bot - hWu;
        const par = landscape ? 0.02 : 0.028;
        const off = landscape
          ? ((S.dist * par) % (wWu * 0.35))
          : ((S.dist * par) % wWu + wWu) % wWu;
        const featherWu = Math.max(28, (40 * dpr) / Math.max(1e-6, scale));
        const skyRgb = (() => {
          if (skyTop.startsWith("#") && skyTop.length >= 7) {
            return [
              parseInt(skyTop.slice(1, 3), 16),
              parseInt(skyTop.slice(3, 5), 16),
              parseInt(skyTop.slice(5, 7), 16),
            ] as const;
          }
          const m = (skyTop.match(/\d+/g) || ["80", "160", "220"]).map(Number);
          return [m[0] || 80, m[1] || 160, m[2] || 220] as const;
        })();
        const rgba = (r: number, g: number, b: number, a: number) =>
          `rgba(${r | 0},${g | 0},${b | 0},${a})`;
        // Fill ABOVE the tile only with a vertical gradient from the tile top-row color
        // (deeper at the chrome, matching at the seam). Do not paint opaque fill over the
        // plate's own cloudy sky — that reads as a hard empty band.
        if (topY > clipTop - 2) {
          const deep = [
            Math.max(0, skyRgb[0] * 0.68),
            Math.max(0, skyRgb[1] * 0.74),
            Math.max(0, skyRgb[2] * 0.86),
          ] as const;
          const mid = [
            (skyRgb[0] * 0.88 + deep[0] * 0.12),
            (skyRgb[1] * 0.9 + deep[1] * 0.1),
            (skyRgb[2] * 0.94 + deep[2] * 0.06),
          ] as const;
          const skyG = cx.createLinearGradient(0, clipTop - 4, 0, topY);
          skyG.addColorStop(0, rgba(deep[0], deep[1], deep[2], 1));
          skyG.addColorStop(0.55, rgba(mid[0], mid[1], mid[2], 1));
          skyG.addColorStop(1, rgba(skyRgb[0], skyRgb[1], skyRgb[2], 1));
          cx.fillStyle = skyG;
          cx.fillRect(viewL - 40, clipTop - 4, (viewR - viewL) + 80, topY - clipTop + 6);
        }
        const natW = img.naturalWidth || BG_W;
        const natH = img.naturalHeight || BG_H;
        const srcY = Math.round((BG_SRC_TOP / BG_H) * natH);
        const srcEnd = Math.round((BG_SRC_END / BG_H) * natH);
        const srcH = Math.max(1, srcEnd - srcY);
        if (landscape) {
          const x0 = (viewL + viewR) * 0.5 - wWu * 0.5 - off;
          cx.drawImage(img, 0, srcY, natW, srcH, x0, topY, wWu, hWu);
        } else {
          const x0 = viewL + (needW - wWu) * 0.5 - (off % Math.max(1, wWu - needW + 1));
          cx.drawImage(img, 0, srcY, natW, srcH, x0, topY, wWu, hWu);
        }
        // ~40 CSS-px soft feather at the seam — light alpha so plate clouds stay visible.
        {
          const tf = cx.createLinearGradient(0, topY - 1, 0, topY + featherWu);
          tf.addColorStop(0, rgba(skyRgb[0], skyRgb[1], skyRgb[2], 0.55));
          tf.addColorStop(0.4, rgba(skyRgb[0], skyRgb[1], skyRgb[2], 0.22));
          tf.addColorStop(1, rgba(skyRgb[0], skyRgb[1], skyRgb[2], 0));
          cx.fillStyle = tf;
          cx.fillRect(viewL - 40, topY - 2, (viewR - viewL) + 80, featherWu + 4);
        }
        // Dissolve only the lowest fringe into slope snow — keeps peaks/gondola readable.
        const hazeH = Math.min(hWu * 0.22, 64);
        const haze = cx.createLinearGradient(0, bot - hazeH, 0, bot + 2);
        if (bgId === "night") {
          haze.addColorStop(0, "rgba(210,220,235,0)");
          haze.addColorStop(0.45, "rgba(210,220,235,0.28)");
          haze.addColorStop(1, "rgba(230,236,244,0.9)");
        } else {
          haze.addColorStop(0, "rgba(247,251,255,0)");
          haze.addColorStop(0.4, "rgba(247,251,255,0.28)");
          haze.addColorStop(1, "rgba(247,251,255,0.92)");
        }
        cx.fillStyle = haze;
        cx.fillRect(viewL - 40, bot - hazeH, (viewR - viewL) + 80, hazeH + 4);
      } else {
        cx.fillStyle = skyTop;
        cx.fillRect(viewL - 20, clipTop, (viewR - viewL) + 40, bot - clipTop);
        cx.fillStyle = bgId === "night" ? "#2a3048" : "#8ab0d0";
        cx.beginPath();
        cx.moveTo(viewL - 20, crestY);
        cx.lineTo(viewL + W * 0.25, crestY - 50);
        cx.lineTo(viewL + W * 0.55, crestY - 28);
        cx.lineTo(viewL + W * 0.8, crestY - 62);
        cx.lineTo(viewR + 20, crestY);
        cx.closePath();
        cx.fill();
      }
    }

    treeDbg = [];
    fgDbg = [];
    // Sparse scenery: at most 1–2 full-detail atlas pines (never a dense mid-row).
    {
      const maxPines = landscape ? 1 : 2;
      const detailPer = landscape ? 520 : 420;
      const detailOff = (S.dist * 0.22) % detailPer;
      let drawn = 0;
      for (let c = -1; c <= 4 && drawn < maxPines; c++) {
        const x = 90 + c * detailPer - detailOff;
        if (x < viewL - 10 || x > viewR + 10) continue;
        const wx = S.dist + x - S.p.x;
        if (featBlocksTree(wx)) continue;
        if (Math.abs(x - S.p.x) < 100) continue;
        const tallPick = ((Math.floor(wx / detailPer) % 2) === 0);
        pine(x, snowY(x) + 10, tallPick ? 0.86 : 0.72, "mid", true, tallPick);
        drawn++;
      }
      // Portrait only: if none survived culling, place a single pine off the rider —
      // landscape stays on the resort plate alone when empty.
      if (drawn === 0 && !landscape) {
        const x = Math.min(viewR - 70, Math.max(viewL + 70, S.p.x + 170));
        pine(x, snowY(x) + 10, 0.78, "mid", true, true);
      }
    }
    // Ride surface — clean white / blue-white snow; covers mid-tree bases.
    const snowBottom = snowFloor;
    const snowGrad = cx.createLinearGradient(0, Math.min(crestY, GROUND) - 10, 0, snowBottom);
    snowGrad.addColorStop(0, "#f7fbff");
    snowGrad.addColorStop(0.35, "#eef5fb");
    snowGrad.addColorStop(0.7, "#e2ecf5");
    snowGrad.addColorStop(1, "#d4e0ec");
    cx.fillStyle = snowGrad; cx.beginPath(); cx.moveTo(viewL, snowBottom);
    for (let gx = viewL; gx <= viewR; gx += 8) cx.lineTo(gx, gY(gx));
    cx.lineTo(viewR, snowBottom); cx.fill();
    // Soft vertical shade only — no corduroy grid, ruled lines, or ovals/dots.
    const shade = cx.createLinearGradient(0, crestY, 0, crestY + 160);
    shade.addColorStop(0, "rgba(130,160,190,0.07)");
    shade.addColorStop(1, "rgba(130,160,190,0)");
    cx.fillStyle = shade;
    cx.fillRect(viewL, crestY - 4, viewR - viewL, 180);
    // Soft crest lip only (no groomer ruled strokes).
    cx.strokeStyle = "rgba(190,210,225,0.32)"; cx.lineWidth = 1.2; cx.beginPath();
    for (let gx = viewL; gx <= viewR; gx += 8) { const gy = gY(gx); gx === viewL ? cx.moveTo(gx, gy) : cx.lineTo(gx, gy); }
    cx.stroke();
    // Soft foreground depth band (white/blue-white). No rocks, ovals, or dense ripples.
    if (!overviewCam) {
      const wantH = tallPhone
        ? Math.min(220, Math.max(140, (snowBottom - (S.p?.y || GROUND)) * 0.55))
        : landscape
          ? Math.min(40, worldH * 0.12)
          : Math.min(52, worldH * 0.1);
      const minBelowRider = (S.p?.y || GROUND) + 48;
      const ridgeTop = Math.max(minBelowRider, snowBottom - wantH);
      const ridgeH = snowBottom - ridgeTop;
      if (ridgeH > 18) {
        const fgGrad = cx.createLinearGradient(0, ridgeTop, 0, snowBottom);
        fgGrad.addColorStop(0, "#e8f0f7");
        fgGrad.addColorStop(0.45, "#d9e5f0");
        fgGrad.addColorStop(1, "#c8d6e4");
        cx.fillStyle = fgGrad;
        cx.beginPath();
        cx.moveTo(viewL, snowBottom);
        for (let gx = viewL; gx <= viewR; gx += 10) {
          const bump = Math.sin(gx * 0.022 + S.dist * 0.01) * 5 + Math.sin(gx * 0.06 + 1.1) * 2;
          cx.lineTo(gx, ridgeTop + bump);
        }
        cx.lineTo(viewR, snowBottom);
        cx.closePath();
        cx.fill();
        cx.strokeStyle = "rgba(150,175,200,0.28)";
        cx.lineWidth = 1.5;
        cx.beginPath();
        for (let gx = viewL; gx <= viewR; gx += 8) {
          const bump = Math.sin(gx * 0.022 + S.dist * 0.01) * 5;
          gx === viewL ? cx.moveTo(gx, ridgeTop + bump) : cx.lineTo(gx, ridgeTop + bump);
        }
        cx.stroke();
        fgDbg.push({ x: viewL, y: ridgeTop, w: Math.min(80, viewR - viewL), h: ridgeH, k: "bank" });
      }
    }
    // Features always ABOVE mid trees and any foreground bank.
    for (const f of S.feats) drawFeat(f);
    if (Number.isFinite(LV.len)) {
      const fx = S.p.x + (lenNow() - S.dist);
      if (fx < viewR + 40 && fx > viewL - 40) {
        const fgy = gY(fx + 8);
        for (let j = 0; j < 8; j++) { cx.fillStyle = j % 2 ? "#111" : "#fff"; cx.fillRect(fx, fgy - 8 - j * 8, 8, 8); cx.fillStyle = j % 2 ? "#fff" : "#111"; cx.fillRect(fx + 8, fgy - 8 - j * 8, 8, 8); }
        if (captions()) { cx.fillStyle = "#3ecf9a"; cx.font = "bold 14px system-ui, sans-serif"; cx.textAlign = "center"; cx.fillText("FINISH", fx + 8, fgy - 74); }
      }
    }
    for (const u of S.pickups) {
      cx.save(); cx.translate(u.x, u.y); cx.rotate(Math.sin(u.a) * 0.25);
      cx.fillStyle = "#ff2d55";
      cx.beginPath(); cx.arc(-5, -3, 5.5, 0, 7); cx.arc(5, -3, 5.5, 0, 7); cx.lineTo(0, 12); cx.fill();
      cx.restore();
    }
    // Falling snow — soft round dots, 2–4 CSS px diameter, varied alpha (no squares).
    {
      cx.save();
      for (const fl of S.flakes) {
        const diamCss = 2 + fl.z * 2; // 2–4 CSS px
        const radWu = Math.max(0.8, (diamCss * 0.5 * dpr) / Math.max(1e-6, scale));
        cx.globalAlpha = 0.28 + fl.z * 0.45;
        cx.fillStyle = "#ffffff";
        cx.beginPath();
        cx.arc(fl.x, fl.y, radWu, 0, Math.PI * 2);
        cx.fill();
      }
      cx.restore();
    }
    drawRider();
    for (const P of S.parts) {
      cx.globalAlpha = Math.min(1, P.l * 2.5);
      cx.fillStyle = P.c;
      // Soft round spray for snow-colored puffs; keep rects for other FX.
      const snowy = typeof P.c === "string" && (P.c[0] === "#" ? parseInt(P.c.slice(1, 3), 16) > 200 : /f[0-9a-f]|white|rgb\(24/i.test(P.c));
      if (snowy) {
        cx.beginPath();
        cx.arc(P.x, P.y, Math.max(0.9, P.s * 0.55), 0, Math.PI * 2);
        cx.fill();
      } else {
        cx.fillRect(P.x, P.y, P.s, P.s);
      }
    }
    cx.globalAlpha = 1;
    if (S.flash > 0 && !reduce) { cx.fillStyle = "rgba(255,230,120," + S.flash * 1.5 + ")"; cx.fillRect(viewL, -OY, viewR - viewL, worldH); }
    if (S.flash < 0) { cx.fillStyle = "rgba(190,225,255," + -S.flash + ")"; cx.fillRect(viewL, -OY, viewR - viewL, worldH); S.flash = Math.min(0, S.flash + 0.012); }
    cx.restore();

    // HUD stays camera-locked to the screen (no camX / no OY). Soft top inset when the park is tall.
    const hy = tallPhone || OY > 20 ? 36 : 8;
    const scNow = score();
    const stNow = starsFor(scNow, gatesOf(LV));
    let starStr = "";
    for (let i = 0; i < 3; i++) starStr += i < stNow ? "★" : "☆";
    cx.textAlign = "left"; cx.fillStyle = "#fff"; cx.font = "700 18px system-ui, sans-serif";
    const scLab = "Score " + scNow;
    cx.fillText(scLab, 12, 22 + hy);
    let hx = 18 + cx.measureText(scLab).width;
    cx.font = "700 16px system-ui, sans-serif";
    for (let i = 0; i < LIVES_MAX; i++) { cx.fillStyle = i < lives ? "#ff5a7a" : "#ffffff55"; cx.fillText(i < lives ? "♥" : "♡", hx + i * 16, 22 + hy); }
    cx.fillStyle = "#ffb84a"; cx.fillText(starStr, hx + LIVES_MAX * 16 + 8, 22 + hy);
    const tg = trickGoal();
    const prog = Math.min(1, scNow / Math.max(1, LV.s3));
    const barW = Math.min(280, W - 24);
    cx.fillStyle = "#0007"; cx.fillRect(12, 30 + hy, barW, 8);
    cx.fillStyle = stNow >= 3 ? "#ffb84a" : S.trickDone ? "#3ecf9a" : "#7fe0d0";
    cx.fillRect(12, 30 + hy, barW * prog, 8);
    // Hide goal/board subtitle while wipeout/clear card is up so it doesn't collide.
    if (S.mode !== "over" && S.mode !== "clear") {
      cx.fillStyle = "#fff"; cx.font = "600 11px system-ui, sans-serif";
      const barTxt = (tg ? tg.lab + (S.trickDone ? " ✓" : "") : "Line") + "  ·  " + board().name + "  ·  " + scNow + "/" + LV.s3;
      cx.fillText(barTxt, 12, 52 + hy);
    }
    if (S.achT > 0) { cx.fillStyle = "#ffb84a"; cx.font = "700 12px system-ui, sans-serif"; cx.fillText(S.achToast, 12, 66 + hy); }

    // Trick pops in CSS-pixel space — stacked vertically so GOAL never overlaps trick names.
    {
      const dpr = window.devicePixelRatio || 1;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cssW = canvas.width / dpr;
      const cssH = canvas.height / dpr;
      const padX = 20;
      const strokePad = 5;
      const hudBottomCss = ((58 + hy) * scale) / dpr;
      const minX = padX;
      const maxX = cssW - padX;
      const minY = hudBottomCss + 14;
      const maxY = cssH - 20;
      const toCssX = (wx: number) => ((camX + wx) * scale) / dpr;
      const toCssY = (wy: number) => ((OY + wy) * scale) / dpr;
      const visible = S.pops.filter((q) => !/^(ON )?(RAIL|BOX|LOG|KICKER|FLAT|HIT)$/i.test(q.txt));
      // Newest on top of stack visually (higher on screen = smaller y).
      const ordered = visible.slice().sort((a, b) => b.l - a.l);
      let stackY = -1;
      for (let qi = 0; qi < ordered.length; qi++) {
        const q = ordered[qi]!;
        const riderCssX = toCssX(S.p.x);
        const riderCssY = toCssY(S.p.y);
        let sx = toCssX(q.x);
        let sy = toCssY(Math.min(q.y, S.p.y - 88));
        let fontPx = 13;
        cx.textAlign = "left";
        cx.lineJoin = "round";
        cx.lineCap = "round";
        let tw = 0;
        for (let n = 0; n < 10; n++) {
          cx.font = "bold " + fontPx + "px system-ui, sans-serif";
          tw = cx.measureText(q.txt).width + strokePad;
          if (tw > maxX - minX && fontPx > 8) { fontPx -= 1; continue; }
          break;
        }
        cx.font = "bold " + fontPx + "px system-ui, sans-serif";
        tw = cx.measureText(q.txt).width + strokePad;
        const prefer = Math.max(riderCssX + 18, sx);
        if (prefer + tw <= maxX) sx = prefer;
        else sx = maxX - tw;
        if (sx < minX) sx = minX;
        if (sx + tw > maxX) {
          sx = minX;
          while (fontPx > 8 && cx.measureText(q.txt).width + strokePad > maxX - minX) {
            fontPx -= 1;
            cx.font = "bold " + fontPx + "px system-ui, sans-serif";
          }
          tw = cx.measureText(q.txt).width + strokePad;
        }
        if (sy < minY) sy = minY;
        if (sy > maxY) sy = maxY;
        if (sy > riderCssY - 56 && minY < riderCssY - 56) sy = Math.max(minY, riderCssY - 84);
        // Queue: each subsequent popup sits clearly below the previous (no GOAL/trick overlap).
        const line = fontPx + 18;
        if (stackY < 0) stackY = sy;
        else {
          sy = Math.max(sy, stackY + line);
          if (sy > maxY) sy = maxY;
        }
        stackY = sy;
        cx.globalAlpha = Math.min(1, q.l * 2);
        cx.fillStyle = "#fff";
        cx.strokeStyle = "#1d3b66";
        cx.lineWidth = 3;
        cx.strokeText(q.txt, sx, sy);
        cx.fillText(q.txt, sx, sy);
      }
      cx.globalAlpha = 1;
    }
    cx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function tick(d: number) {
    if (S.mode === "play") {
      acc += Math.min(0.05, d);
      while (acc >= DT && S.mode === "play") { step(DT); acc -= DT; }
    } else acc = 0;
    if (S.mode === "over" && S.autoRetry && !S.gameOver && performance.now() - overAt >= LIFE_PAUSE * 1000) {
      S.autoRetry = false; S.heartFlashT = 0;
      reset(null, LV); S.mode = "play"; S.playAt = performance.now();
      emit(true);
    }
  }
  function frame(ts: number) {
    if (!alive) return;
    const d = (ts - last) / 1000 || 0; last = ts;
    try { tick(d); scrapeTick(); draw(); }
    catch (err) {
      /* Boulder Dodge's loop died here and the mountain never came back. */
      cx.setTransform(1, 0, 0, 1, 0, 0);
      cx.fillStyle = "#140828"; cx.fillRect(0, 0, canvas.width, canvas.height);
      cx.fillStyle = "#ffb84a"; cx.font = "700 16px system-ui, sans-serif";
      cx.fillText("Frame recovered", 24, 48);
      console.error(err);
    }
    raf = requestAnimationFrame(frame);
  }

  function getSnap(): Snap {
    const m = S.mode;
    const menu = m === "menu";
    const leg = m === "legend";
    const tg = trickGoal();
    const runScore = score();
    const runStars = starsFor(runScore, gatesOf(LV));
    const bestStars = starsFor(PR.best[LV.n] || 0, gatesOf(LV));
    const nextBoard = BOARDS[BOARDS.findIndex((b) => b.id === board().id) + 1];
    return {
      mode: m, muted, levelName: LV.name, levelN: LV.n, endless: !!LV.endless, lives,
      primary: m === "ready" ? "PLAY" : m === "play" ? "JUMP" : "RETRY",
      showJump: m === "play",
      showPlay: m === "ready",
      showReplay: m === "over" || m === "clear",
      showNext: m === "clear" && !LV.endless,
      showResume: !menu && !leg && m === "pause",
      hint: m === "ready" && !hintSeen
        ? "Riding " + board().name + ". Hold to flip, tap in the air to spin. Swipe for grabs & rail tricks. " + (tg?.lab || "") + "."
        : null,
      showLegend: leg, pb, careerStars: careerFromBest(), diffId: diff().id,
      diffs: Object.values(DIFFS),
      levels: [...LEVELS, ENDLESS].map((L) => ({
        n: L.n, name: L.endless ? "Endless" : L.n + ". " + L.name, sub: L.sub,
        unlocked: unlocked(L.n), done: PR.done.includes(L.n), best: PR.best[L.n] || 0,
        stars: starsFor(PR.best[L.n] || 0, gatesOf(L)), goal: L.trick.lab, endless: !!L.endless,
      })),
      boards: BOARDS.map((b) => ({ id: b.id, name: b.name, spd: b.spd, open: boardOpen(b), selected: board().id === b.id, how: b.how, tag: boardTag(b), c: b.c, s: b.s })),
      nowName: board().name, nowTag: boardTag(board()),
      nextName: nextBoard?.name || null,
      nextHow: nextBoard?.how || "",
      nextTag: nextBoard ? boardTag(nextBoard) : "",
      runStars, bestStars, starGoal: LV.s3, runScore, goalDone: !!S.trickDone,
      confirmReset: resetArm,
    };
  }
  function emit(force = false) {
    const snap = getSnap();
    const next = JSON.stringify(snap);
    if (force || next !== sig) { sig = next; onSnap(snap); }
  }

  function press() {
    ensureAC();
    if (S.mode === "legend") { dismissLegend(); return; }
    if (S.mode === "ready") {
      if (!hintSeen) { hintSeen = true; store("terrainPark.hint", "1"); }
      S.mode = "play"; S.playAt = performance.now(); emit(true); return;
    }
    if (S.mode === "play") {
      if (performance.now() - (S.playAt || 0) < 160) return;
      pressAt = performance.now();
      pressArmed = true;
      pressJumped = false;
      // Ground/grind takeoff immediately. Air actions resolve on release (tap) or after TAP_MS (hold flip).
      if (S.p.on || S.grindOn) {
        jump();
        pressJumped = true;
      }
      return;
    }
    if (S.mode === "pause") { S.mode = "play"; emit(true); return; }
  }
  function replayLine() {
    if (lives <= 0 || S.mode === "clear") lives = LIVES_MAX;
    reset(null, LV);
    S.mode = "play";
    S.playAt = performance.now();
    emit(true);
  }
  function goNext() {
    if (S.mode !== "clear") return;
    if (LV.n < STORY) startLevel(LV.n + 1);
    else if (endlessOpen()) startLevel(STORY + 1);
    else openMenu();
  }
  function hold(v: boolean) {
    if (v) {
      // Finger down — flip only engages after TAP_MS (see step). UI may call hold(true) before press().
      pressArmed = true;
      if (!pressAt) pressAt = performance.now();
      return;
    }
    // Finger up: short air press = tap (boost / half-turn). Long press = hold flip release.
    const dur = performance.now() - pressAt;
    const wasHold = S.holding || dur > TAP_MS;
    S.holding = false;
    pressArmed = false;
    if (!wasHold && !pressJumped && !S.p.on && !S.grindOn) airTap();
    pressJumped = false;
    pressAt = 0;
    // Release grab before landing — ease-out starts when the finger lifts.
    if (S.grab) S.grabHeld = false;
  }
  function togglePause() {
    if (S.mode === "play") { S.mode = "pause"; scrapeStop(); }
    else if (S.mode === "pause") S.mode = "play";
    emit(true);
  }
  function toggleMute() {
    muted = !muted; store("terrainPark.mute", muted ? "1" : "0");
    if (muted) scrapeStop();
    emit(true);
  }
  function openMenu() {
    if (S.mode === "play") { S.mode = "pause"; scrapeStop(); }
    S.prevMode = S.mode === "menu" ? S.prevMode : S.mode;
    S.mode = "menu"; resetArm = false; emit(true);
  }
  function closeMenu() {
    S.mode = S.prevMode === "play" ? "pause" : (S.prevMode || "ready");
    if (S.mode === "menu") S.mode = "ready";
    emit(true);
  }
  function dismissLegend() {
    legendSeen = true; store("terrainPark.legend2", "1");
    const back = legendFrom || "ready";
    legendFrom = null;
    S.mode = back === "play" ? "pause" : back;
    emit(true);
  }
  function openLegend() {
    if (S.mode === "play") { S.mode = "pause"; scrapeStop(); }
    if (S.mode !== "legend") legendFrom = S.mode;
    S.mode = "legend"; emit(true);
  }
  function startLevel(n: number, keep = false) {
    const L = n === STORY + 1 ? ENDLESS : LEVELS[n - 1];
    if (!L || !unlocked(n)) return;
    if (!keep) lives = LIVES_MAX;
    reset(null, L); S.mode = "ready";
    void ensureBackdrop(art, backdropForLevel(L.n)).then(() => draw());
    emit(true);
  }
  function setDiff(id: string) { if (!DIFFS[id]) return; PR.diff = id; saveP(); emit(true); }
  function selectBoard(id: string) {
    const b = BOARDS.find((x) => x.id === id);
    if (!b || !boardOpen(b)) return;
    PR.board = id; saveP(); emit(true);
  }
  function resetProgress() {
    if (!resetArm) { resetArm = true; return; }
    const keep = PR.diff;
    PR = { done: [], best: {}, stars: 0, diff: keep, board: "grom" };
    saveP(); pb = 0; store("terrainPark.pb", "0");
    lives = LIVES_MAX; reset(null, LEVELS[0]); S.mode = "menu"; S.prevMode = "ready";
    resetArm = false; emit(true);
  }

  function onKey(e: KeyboardEvent) {
    const k = e.key;
    if (S.mode === "menu") { if (k === "Escape") closeMenu(); return; }
    if (S.mode === "legend") { if (k === " " || k === "Enter" || k === "Escape") dismissLegend(); return; }
    if (S.mode === "clear" && (k === "n" || k === "N")) { goNext(); return; }
    if ((S.mode === "clear" || S.mode === "over") && (k === " " || k === "Enter")) { e.preventDefault(); replayLine(); return; }
    if (k === " " || k === "ArrowUp" || k === "w" || k === "W") { e.preventDefault(); if (!e.repeat) press(); hold(true); }
    else if (k === "p" || k === "P" || k === "Escape") togglePause();
    else if (k === "m" || k === "M") toggleMute();
    else if (k === "r" || k === "R") { reset(null, LV); S.mode = "play"; S.playAt = performance.now(); emit(true); }
  }
  function onKeyUp(e: KeyboardEvent) { if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") hold(false); }
  function onHide() { if (document.hidden && S.mode === "play") { S.mode = "pause"; emit(true); } }
  function onOrient() { setTimeout(resize, 50); setTimeout(resize, 250); }
  addEventListener("keydown", onKey);
  addEventListener("keyup", onKeyUp);
  addEventListener("resize", resize);
  addEventListener("orientationchange", onOrient);
  try {
    window.visualViewport?.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("scroll", resize);
  } catch { /* ignore */ }
  document.addEventListener("visibilitychange", onHide);

  resize();
  reset(null, LEVELS[0]);
  S.mode = "play";
  S.playAt = performance.now();
  emit(true);
  raf = requestAnimationFrame((ts) => { last = ts; frame(ts); });

  const api = {
    version: VERSION,
    startLevel: (n: number) => startLevel(n),
    setDifficulty: setDiff,
    getSnap,
    state: () => S,
    step,
    jump,
    airTap,
    hold,
    aim,
    setLives: (n: number) => { lives = n; },
    setGod: (g: boolean) => { god = g; },
    consts: {
      AIR, SPIN, LIP_WIN, POST_LIP, GRAVITY, JV, DIFFS, LEN_MUL,
      AIR_BOOST_FRAC, TAP_MS, SPIN_LAND_WIN_DEG, SPIN_NO_DEG, SPIN_TIERS_DEG, SPIN_PTS, TAP_SPIN_HALF, YAW_MAX,
    },
    starsFor,
    lineLength,
    score,
    press,
    debugStart(n: number) {
      const L = n === STORY + 1 ? ENDLESS : LEVELS[n - 1];
      if (!L) return;
      lives = LIVES_MAX;
      reset(null, L);
      S.mode = "play";
      S.playAt = performance.now();
      const id = backdropForLevel(L.n);
      void ensureBackdrop(art, id).then(() => draw());
      emit(true);
    },
    /** Force resort backdrop for evidence (`bluebird` | `night`); null clears. */
    setBackdrop(id: BackdropId | null) {
      bgForce = id;
      if (id) void ensureBackdrop(art, id).then(() => draw());
      else draw();
    },
    getBackdrop: () => activeBackdrop(),
    getView,
    resize,
    /** True when Franz rider+world atlases loaded (else vector fallback). */
    artReady: () => artOk(),
    setOverview(on: boolean) { overviewCam = !!on; resize(); draw(); },
    getTrees: () => { draw(); return treeDbg.slice(); },
    getFgDecor: () => { draw(); return fgDbg.slice(); },
    /** Force wind for Playwright / evidence shots. dir: -1 left, +1 right. */
    setWind(strength: number, dir = -1) {
      S.wind = Math.max(0, Math.min(1, strength));
      S.windDir = dir < 0 ? -1 : 1;
      S.gustT = strength > 0.2 ? 2.4 : 0;
      S.windLabelT = 0;
    },
    getWind: () => ({ wind: S.wind, dir: S.windDir, now: windNow(), gustT: S.gustT, flakes: S.flakes.length }),
    /** Force a named grab / grind style for tests & evidence. */
    setGrab(g: GrabId, held = true) {
      S.grab = g;
      S.grabHeld = !!g && held;
      S.grabEase = g ? (held ? 1 : Math.max(S.grabEase, 0.85)) : 0;
    },
    setGrindStyle(st: GrindStyle) { S.grindStyle = st; },
    setSpinDir(d: number) { S.spinDir = d >= 0 ? 1 : -1; },
    /** Air-spin bookkeeping for Playwright fail-tests / evidence. */
    getSpinState: () => ({
      flip: S.flip,
      flipDeg: Math.abs(S.flip) * (180 / Math.PI),
      yaw: S.yaw,
      yawDeg: Math.abs(S.yaw) * (180 / Math.PI),
      airBoostUsed: S.airBoostUsed,
      flipBucket: spinBucket(Math.abs(S.flip)),
      yawBucket: spinBucket(Math.abs(S.yaw)),
      holding: S.holding,
      pressArmed,
      on: S.p.on,
      mode: S.mode,
      lives,
      flipPts: S.flipPts,
      lastTrickName: S.lastTrickName,
    }),
    /** Force absolute flip / yaw radians (tests). */
    setFlip(rad: number) { S.flip = rad; },
    setYaw(rad: number) { S.yaw = rad; },
    setAirBoostUsed(v: boolean) { S.airBoostUsed = !!v; },
    /** Draw pose QA sheet (grabs / rails / spins) for evidence screenshots. */
    renderPoseSheet() { renderPoseSheet(); },
    /** World AABB → CSS-pixel screen AABB (for Playwright overlap asserts). */
    toScreenBox(b: { x: number; y: number; w: number; h: number }) {
      const dpr = window.devicePixelRatio || 1;
      return {
        x: ((camX + b.x) * scale) / dpr,
        y: ((OY + b.y) * scale) / dpr,
        w: (b.w * scale) / dpr,
        h: (b.h * scale) / dpr,
      };
    },
    getRiderBox: () => {
      draw();
      // Standing AABB from board bottom (~+6) up RIDER_STAND_WU — scale-locked, art unchanged.
      return { x: S.p.x - 36, y: S.p.y - (RIDER_STAND_WU - 6), w: 72, h: RIDER_STAND_WU };
    },
    getFeatBoxes: () => {
      draw();
      return S.feats.filter((f) => {
        const d = FEAT[f.k];
        return !!(d && !d.mob);
      }).map((f) => {
        const sx = f.wx - S.dist + S.p.x;
        const half = featTreeHalf(f);
        // Height stops near the crest (+pad) so downhill camera follow doesn't false-hit foreground fence.
        return { x: sx - half, y: gY(sx) - (f.amp || f.h || 20) - 8, w: half * 2, h: (f.amp || f.h || 20) + 14, k: f.k };
      });
    },
    /** Sample kicker profile for landing-slope asserts (lip → landing end). */
    getKickerProfile() {
      const f = S.feats.find((x) => x.k === "kicker");
      if (!f) return null;
      const lip = f.wx + f.dk;
      const end = f.wx + f.dk + f.ex;
      const samples: { t: number; h: number }[] = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const wx = lip + (end - lip) * t;
        samples.push({ t, h: featH(wx) });
      }
      // featH is most negative at the lip (surface higher on screen) and eases toward 0 at the end.
      // Positive landingDrop = surface descends back toward the slope (real landing, not a vertical face).
      const drop = samples[10]!.h - samples[0]!.h;
      const slope = drop / Math.max(1, f.ex);
      return { ap: f.ap, dk: f.dk, ex: f.ex, amp: f.amp, step: f.step || 0, variant: f.variant || "table", samples, landingDrop: drop, landingSlope: slope };
    },
    /** Spawn census for restore coverage (features + heart pickups). */
    getCensus: () => ({ ...census }),
    /** Steady camera probe — rot always 0; OY vel capped during rollers/air. */
    getCam() {
      return {
        rot: CAM_ROT,
        oy: OY,
        oyVel: camOYVel,
        camX,
        riderWorldX: S.dist,
        scrollX: S.dist - camX,
        spd: S.spd,
        anchorY: camAnchorY,
      };
    },
    /** True if any grom/skier currently overlaps a feature approach/landing/air zone. */
    trafficInLanding() {
      for (const gm of S.feats) {
        const d = FEAT[gm.k];
        if (!d?.mob) continue;
        // Sit groms are allowed on flat/box deck edges + soft runouts.
        if (gm.k === "grom" && gm.pose === "sit") {
          const host = S.feats.find((f) => {
            if (FEAT[f.k]?.mob) return false;
            if (f.k === "flat") return Math.abs(f.wx - gm.wx) < (f.dk || 40) + 40;
            if (f.k === "box" || f.k === "log") return Math.abs(f.wx - gm.wx) < (f.w || 80) * 0.6 + 20;
            return false;
          }) || null;
          if (sitSafe(gm.wx, gm.w || d.w, host)) continue;
          return true;
        }
        if (!trafficSafe(gm.wx, gm.w || d.w)) return true;
      }
      return false;
    },
    landingZones() {
      return S.feats.filter((f) => FEAT[f.k]?.terr).map((f) => {
        const z = featAirClear(f)!;
        return { k: f.k, wx: f.wx, ...z };
      });
    },
    /** Terrain height variance over a run window — must exceed flat-slope threshold. */
    getTerrainVariance(samples = 96, stepX = 48) {
      let min = Infinity, max = -Infinity;
      const vals: number[] = [];
      for (let i = 0; i < samples; i++) {
        const wx = S.dist + i * stepX;
        const y = terr(wx);
        vals.push(y);
        if (y < min) min = y;
        if (y > max) max = y;
      }
      let mean = 0;
      for (const v of vals) mean += v;
      mean /= Math.max(1, vals.length);
      let varSum = 0;
      for (const v of vals) varSum += (v - mean) * (v - mean);
      return { min, max, range: max - min, stdev: Math.sqrt(varSum / Math.max(1, vals.length)), samples: vals.length };
    },
    /**
     * Mean fall-line slope dy/dx of terr() over a run window.
     * Positive = ground descends on screen as you ride right (downhill).
     */
    getTerrainSlope(samples = 120, stepX = 40) {
      let sum = 0;
      let n = 0;
      let y0 = terr(S.dist);
      for (let i = 1; i < samples; i++) {
        const y1 = terr(S.dist + i * stepX);
        sum += (y1 - y0) / stepX;
        y0 = y1;
        n++;
      }
      const meanSlope = sum / Math.max(1, n);
      const drop = terr(S.dist + (samples - 1) * stepX) - terr(S.dist);
      return { meanSlope, drop, grade: FALL_GRADE, samples, stepX };
    },
    /** Snow / ride height samples for overview asserts (world Y; larger = lower on screen). */
    sampleSnowLine(fromWx: number, toWx: number, step = 40) {
      const pts: { wx: number; terr: number; gy: number }[] = [];
      for (let wx = fromWx; wx <= toWx; wx += step) {
        const sx = wx - S.dist + S.p.x;
        pts.push({ wx, terr: terr(wx), gy: gY(sx) });
      }
      const n = pts.length;
      const dropTerr = n > 1 ? pts[n - 1]!.terr - pts[0]!.terr : 0;
      const dropGy = n > 1 ? pts[n - 1]!.gy - pts[0]!.gy : 0;
      return { pts, dropTerr, dropGy, grade: FALL_GRADE };
    },
  };
  (window as unknown as { TerrainPark?: typeof api }).TerrainPark = api;

  return {
    press, hold, aim, togglePause, toggleMute, openMenu, closeMenu, dismissLegend, openLegend, startLevel, setDiff, selectBoard, resetProgress, resize, getSnap,
    replay: replayLine, nextLine: goNext,
    destroy() {
      alive = false; cancelAnimationFrame(raf); scrapeStop();
      removeEventListener("keydown", onKey); removeEventListener("keyup", onKeyUp);
      removeEventListener("resize", resize);
      removeEventListener("orientationchange", onOrient);
      try {
        window.visualViewport?.removeEventListener("resize", resize);
        window.visualViewport?.removeEventListener("scroll", resize);
      } catch { /* ignore */ }
      document.removeEventListener("visibilitychange", onHide);
    },
  };
}
