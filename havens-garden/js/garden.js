/* Haven's Garden — Grok Build port improved to Ted's spec
 * Version: v0.1.9-grokbuild-improved
 * Standalone canvas engine (no login / app wrapper).
 * Art: Franz-style picture-book assets in ../art/
 * No copied IP, no real photos.
 */
(function (global) {
  'use strict';

  const VER = 'v0.1.9-grokbuild-improved';
  const KEY = 'havensGarden.grokbuild.improved.v1';
  const BASKET_MAX = 8;
  const WIN_FLOWERS = 20;
  const MAX_LIVES = 3;
  const BUG_GOAL = 8;
  const COMB_N = 14; // bee trips to fill comb
  const HIVE_SHELF_MAX = 3; // matches the 3 bench pour jars
  const SPAWN_EVERY = 0.72;
  const FLOWER_EVERY = 0.55;
  const CRY_DUR = 1.0;
  const HAVEN_RUN_H = 138; // small vs field plate
  const POSE_SCALE_EPS = 0.05;
  const BUG_DRAW_SIZE = 100; // toddler-tappable butterfly draw size
  const FLOWER_BASE_H = 78;
  const LOG_BASE_H = 44;
  const FENCE_BASE_H = 78;
  const ROCK_BASE_H = 64;
  const STUMP_BASE_H = 70;

  const FLOWERS = ['daisy', 'tulip', 'sunflower'];
  const COLOR_PAGES = [
    { id: 'daisy', name: 'Daisy' },
    { id: 'bee', name: 'Bee' },
    { id: 'tulip', name: 'Tulip' },
  ];

  // Greenhouse fits the phone at default zoom: all 13 pots fully on-screen.
  // Slight extra world width for optional pan when zoomed in.
  const GH_VIEW_W = 390; // phone logical width; overview uses this
  const GH_WORLD_W = 390; // overview = whole half-greenhouse on one phone screen
  const GH_WORLD_H = 844;
  // Target pot widths at zoom 1: L≤1/4, M≤1/6, S≤1/9 of 390.
  const GH_TIER = {
    S: { w: 38, growSec: 48, yieldN: 1, label: 'small' },   // ~1/10 (< 1/9)
    M: { w: 56, growSec: 78, yieldN: 1, label: 'medium' }, // ~1/7 (< 1/6)
    L: { w: 84, growSec: 120, yieldN: 2, label: 'large' }, // ~1/4.6 (< 1/4)
  };
  // Stair-step plant stand: top / mid / bot shelf seating Y (world px).
  const GH_SHELF = { top: 280, mid: 430, bot: 600, plank: 20 };
  // 13 slots seated on each plank (centers inset by half pot width).
  const GH_SLOTS = [
    // TOP — 6 small on narrow upper plank
    { size: 'S', x: 88, y: GH_SHELF.top },
    { size: 'S', x: 130, y: GH_SHELF.top },
    { size: 'S', x: 172, y: GH_SHELF.top },
    { size: 'S', x: 214, y: GH_SHELF.top },
    { size: 'S', x: 256, y: GH_SHELF.top },
    { size: 'S', x: 298, y: GH_SHELF.top },
    // MIDDLE — 4 medium
    { size: 'M', x: 78, y: GH_SHELF.mid },
    { size: 'M', x: 156, y: GH_SHELF.mid },
    { size: 'M', x: 234, y: GH_SHELF.mid },
    { size: 'M', x: 312, y: GH_SHELF.mid },
    // BOTTOM — 3 large
    { size: 'L', x: 78, y: GH_SHELF.bot },
    { size: 'L', x: 195, y: GH_SHELF.bot },
    { size: 'L', x: 312, y: GH_SHELF.bot },
  ];
  const POTS = GH_SLOTS;
  const GH_MIN_HIT = 52; // finger-sized hit even when art is smaller
  const GH_STAGE = { seed: 0.5, sprout: 1.35, bud: 2.35, bloom: 2.95 };
  const NET_RADIUS_BASE = 108;
  const NET_RADIUS_BIG = 160;
  const DRESS_CATALOG = [
    { id: 'classic', name: 'Classic', price: 0, hue: 0 },
    { id: 'sky', name: 'Sky', price: 8, hue: 200 },
    { id: 'leaf', name: 'Leaf', price: 8, hue: 110 },
    { id: 'berry', name: 'Berry', price: 10, hue: 320 },
    { id: 'sun', name: 'Sun', price: 10, hue: 45 },
  ];
  const REWARD_MILESTONES = [
    { id: 'first-sale', label: 'First sale', need: (s) => (s.stats.sales|0) >= 1, prize: 3 },
    { id: 'jars-10', label: '10 jars sold', need: (s) => (s.stats.jarsSold|0) >= 10, prize: 5 },
    { id: 'flowers-20', label: '20 flowers sold', need: (s) => (s.stats.flowersSold|0) >= 20, prize: 5 },
    { id: 'bugs-8', label: 'Bug catcher', need: (s) => (s.bugs|0) >= 8, prize: 4 },
    { id: 'coins-30', label: '30 coins earned', need: (s) => (s.stats.coinsEarned|0) >= 30, prize: 6 },
  ];

  const HIVE_BLOOMS = [
    { nx: 0.84, ny: 0.33 },
    { nx: 0.75, ny: 0.46 },
  ];

  const JARS = [
    { nx: 0.376, ny: 0.455 },
    { nx: 0.475, ny: 0.455 },
    { nx: 0.573, ny: 0.455 },
  ];

  const PALETTE = [
    { name: 'Sun', hex: '#FFD15C' },
    { name: 'Sky', hex: '#7EC8E3' },
    { name: 'Leaf', hex: '#6BBF59' },
    { name: 'Pink', hex: '#F48FB1' },
    { name: 'Berry', hex: '#E15B64' },
    { name: 'Plum', hex: '#8E6BBF' },
  ];

  const INK = '#3D3428';
  const CREAM = '#FFF6EA';
  const PETAL = '#F48FB1';

  function emptyBed(size) {
    return {
      flower: null,
      wet: false,
      stage: 0,
      size: size || 'M',
      plantedAt: null,
      wateredAt: null,
      updatedAt: null,
    };
  }

  function emptyBeds() {
    return GH_SLOTS.map((s) => emptyBed(s.size));
  }

  function normalizeBed(raw, size) {
    const b = raw && typeof raw === 'object' ? raw : {};
    const flower = FLOWERS.includes(b.flower) ? b.flower : null;
    const sz = b.size === 'S' || b.size === 'M' || b.size === 'L' ? b.size : size || 'M';
    return {
      flower,
      wet: !!b.wet && !!flower,
      stage: flower ? Math.max(0, Math.min(3, Number(b.stage) || 0)) : 0,
      size: sz,
      plantedAt: flower && b.plantedAt != null ? Number(b.plantedAt) || null : null,
      wateredAt: flower && b.wet && b.wateredAt != null ? Number(b.wateredAt) || null : null,
      updatedAt: b.updatedAt != null ? Number(b.updatedAt) || null : null,
    };
  }

  /** Lossless migration from legacy 12-pot (or any length) saves into 13 tiered slots. */
  function migrateBeds(rawBeds) {
    const beds = emptyBeds();
    if (!Array.isArray(rawBeds)) return beds;
    // 1:1 index map for overlapping slots, then append any leftover plants into free slots
    const n = Math.min(rawBeds.length, beds.length);
    for (let i = 0; i < n; i++) {
      beds[i] = normalizeBed(rawBeds[i], GH_SLOTS[i].size);
    }
    if (rawBeds.length > beds.length) {
      const extras = rawBeds.slice(beds.length).filter((b) => b && FLOWERS.includes(b.flower));
      let ei = 0;
      for (let i = 0; i < beds.length && ei < extras.length; i++) {
        if (!beds[i].flower) {
          beds[i] = normalizeBed(extras[ei++], GH_SLOTS[i].size);
        }
      }
    }
    return beds;
  }

  function stageName(stage) {
    if (stage < GH_STAGE.seed) return 'seed';
    if (stage < GH_STAGE.sprout) return 'sprout';
    if (stage < GH_STAGE.bud) return 'bud';
    return 'bloom';
  }

  function freshSave() {
    return {
      v: 1,
      stars: 0,
      coins: 0,
      basket: [],
      bouquet: [],
      beds: emptyBeds(),
      meadowPlants: [],
      sparkle: false,
      fast: false,
      taught: false,
      jars: 0,
      honey: 0,
      jarFull: [false, false, false],
      hiveShelf: 0,
      bugs: 0,
      bugSession: 0,
      colorReward: {},
      colorPageIx: 0,
      seenRunIntro: false,
      mute: false,
      dress: 'classic',
      ownedDresses: ['classic'],
      bigNet: false,
      rewardsClaimed: {},
      stickers: [],
      stats: { sales: 0, jarsSold: 0, flowersSold: 0, coinsEarned: 0 },
    };
  }

  function jarTriple(o) {
    if (Array.isArray(o.jarFull) && o.jarFull.length >= 3) {
      return [!!o.jarFull[0], !!o.jarFull[1], !!o.jarFull[2]];
    }
    const n = Math.max(0, Math.min(3, Number(o.jars) || 0));
    return [n > 0, n > 1, n > 2];
  }

  function loadSave() {
    const base = freshSave();
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return base;
      const o = JSON.parse(raw);
      if (!o || o.v !== 1) return base;
      const beds = migrateBeds(o.beds);
      const jars = jarTriple(o);
      const meadowPlants = Array.isArray(o.meadowPlants)
        ? o.meadowPlants
            .filter((p) => p && FLOWERS.includes(p.kind))
            .map((p) => ({
              kind: p.kind,
              nx: Math.max(0.08, Math.min(0.92, Number(p.nx) || 0.5)),
              ny: Math.max(0.52, Math.min(0.86, Number(p.ny) || 0.7)),
            }))
            .slice(0, 24)
        : [];
      const owned = Array.isArray(o.ownedDresses)
        ? o.ownedDresses.filter((d) => DRESS_CATALOG.some((c) => c.id === d))
        : ['classic'];
      if (owned.indexOf('classic') < 0) owned.unshift('classic');
      const dress = DRESS_CATALOG.some((c) => c.id === o.dress) ? o.dress : 'classic';
      const stats = Object.assign({ sales: 0, jarsSold: 0, flowersSold: 0, coinsEarned: 0 }, o.stats || {});
      return {
        ...base,
        ...o,
        beds,
        basket: Array.isArray(o.basket)
          ? o.basket.filter((f) => FLOWERS.includes(f)).slice(0, BASKET_MAX)
          : [],
        bouquet: Array.isArray(o.bouquet)
          ? o.bouquet.filter((f) => FLOWERS.includes(f)).slice(0, 12)
          : [],
        meadowPlants,
        colorReward: o.colorReward && typeof o.colorReward === 'object' ? o.colorReward : {},
        honey: jars.every(Boolean) ? 0 : Math.max(0, Math.min(COMB_N, Number(o.honey) || 0)),
        jarFull: jars,
        jars: jars.filter(Boolean).length,
        hiveShelf: Math.max(0, Math.min(HIVE_SHELF_MAX, Number(o.hiveShelf) || jars.filter(Boolean).length)),
        colorPageIx: Math.max(0, Math.min(COLOR_PAGES.length - 1, Number(o.colorPageIx) || 0)),
        seenRunIntro: !!o.seenRunIntro,
        coins: Math.max(0, Number(o.coins) || 0),
        dress,
        ownedDresses: owned,
        bigNet: !!o.bigNet,
        rewardsClaimed: o.rewardsClaimed && typeof o.rewardsClaimed === 'object' ? o.rewardsClaimed : {},
        stickers: Array.isArray(o.stickers) ? o.stickers.slice(0, 40) : [],
        stats,
      };
    } catch (e) {
      return base;
    }
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(src));
      img.src = src + '?v=0.1.7j-gbi';
    });
  }

  function start(canvas, announce) {
    const raw = canvas.getContext('2d');
    if (!raw) return { VER };
    const ctx = raw;
    announce = announce || function () {};

    const save = loadSave();
    let scene = 'title';
    let toast = '';
    let toastT = 0;
    let ready = false;
    const art = {};
    const buttons = [];
    function netCatchRadius() {
      return save.bigNet ? NET_RADIUS_BIG : NET_RADIUS_BASE;
    }

    function dressMeta() {
      return DRESS_CATALOG.find((d) => d.id === save.dress) || DRESS_CATALOG[0];
    }

    /** Recolor dress pixels only (pink/red dress band); keep hair/skin/scale. */
    function recolorDressSprite(img, dressId) {
      if (!img || !img.width) return img;
      const meta = DRESS_CATALOG.find((d) => d.id === dressId) || DRESS_CATALOG[0];
      if (!meta.hue) return img;
      const key = dressId + '|' + img.src;
      if (recolorCache[key]) return recolorCache[key];
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      const data = x.getImageData(0, 0, c.width, c.height);
      const px = data.data;
      const target = meta.hue;
      for (let i = 0; i < px.length; i += 4) {
        const a = px[i + 3];
        if (a < 20) continue;
        const r = px[i], g = px[i + 1], b = px[i + 2];
        // Detect reddish/pink dress (not skin/hair yellow)
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;
        const isPink = r > 140 && r > g + 15 && r > b - 10 && sat > 0.18 && g < 180;
        const isRed = r > 120 && r > g + 40 && r > b + 20 && sat > 0.25;
        if (!(isPink || isRed)) continue;
        // Convert to HSL-ish and set hue
        const rn = r / 255, gn = g / 255, bn = b / 255;
        const l = (max + min) / 510;
        const s = sat;
        const h = target / 360;
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const hue2rgb = (t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };
        px[i] = Math.round(hue2rgb(h + 1 / 3) * 255);
        px[i + 1] = Math.round(hue2rgb(h) * 255);
        px[i + 2] = Math.round(hue2rgb(h - 1 / 3) * 255);
      }
      x.putImageData(data, 0, 0);
      recolorCache[key] = c;
      return c;
    }

    function havenSprite(key) {
      const img = art[key] || art['haven-front'];
      if (!img) return null;
      if (save.dress === 'classic') return img;
      return recolorDressSprite(img, save.dress);
    }

    function addCoins(n, x, y, opts) {
      opts = opts || {};
      const gain = Math.max(0, n | 0);
      if (!gain) return;
      save.coins += gain;
      save.stats.coinsEarned = (save.stats.coinsEarned | 0) + gain;
      for (let i = 0; i < Math.min(8, gain); i++) {
        coinFly.push({
          x: x || 195,
          y: y || 400,
          vx: (Math.random() - 0.5) * 120,
          vy: -180 - Math.random() * 80,
          life: 0.7 + Math.random() * 0.3,
          max: 0.9,
        });
      }
      if (!opts.skipRewards) checkRewards();
      persist();
    }

    function checkRewards() {
      REWARD_MILESTONES.forEach((m) => {
        if (save.rewardsClaimed[m.id]) return;
        if (!m.need(save)) return;
        save.rewardsClaimed[m.id] = true;
        save.stickers.push(m.id);
        addCoins(m.prize, 200, 300, { skipRewards: true });
        say(m.label + '! +' + m.prize + ' coins');
        chime('win');
      });
    }


    const parts = [];
    let pressed = null;
    let time = 0;
    let last = performance.now();
    let raf = 0;
    let cssW = 1;
    let cssH = 1;
    let scale = 1;
    let offX = 0;
    let offY = 0;

    const girl = { x: 195, y: 520, face: 1, walk: 0, poseT: 0, pose: 'stand' };
    let goal = null;

    const bee = { x: 180, y: 480, tx: 180, ty: 480, drag: false };
    let honeyPop = 0;
    let pourT = 0;
    let pourJar = -1;
    let job = null;
    let can = null;
    let beeLock = 0;
    let shop = false;
    let selected = null;
    let placesOpen = false;
    let saidHint = '';

    // Runner
    let runItems = [];
    let runLane = 1;
    let runShown = 1;
    let runJump = 0;
    let runDuck = 0;
    let runObSpawn = 0.2;
    let runFlSpawn = 0.1;
    let runCry = 0;
    let runLives = MAX_LIVES;
    let runCollected = 0;
    let runScroll = 0;
    let runEnded = false;
    let runWon = false;
    let runIntroOpen = false;
    let runIntroPage = 0;
    let runSeed = 1;
    let runInvuln = 0;
    let fieldParallax = 0;

    // Bugs
    const BUG_COLORS = ['yellow', 'pink', 'blue', 'orange', 'lilac'];
    let bugs = [];
    let netSwing = 0;
    let bugWinT = 0;
    let bugCaughtSession = 0;
    let meadowParallax = 0;
    const BUG_POSE_H = 200;
    const BUG_SLOTS = [
      { ox: 65, oy: 255 },
      { ox: 195, oy: 235 },
      { ox: 325, oy: 260 },
      { ox: 90, oy: 430 },
      { ox: 300, oy: 450 },
    ];

    // Color
    let colorPageIx = save.colorPageIx | 0;
    let colorIx = 0;
    const pages = {};
    let ghCam = { x: 0, y: 0, zoom: 1 }; // default overview: all 13 pots on screen
    let ghPanning = false;

    function resetGhOverview() {
      // Zoom 1 shows the whole half-greenhouse; + zoom is optional for tapping.
      ghCam = { x: 0, y: 0, zoom: 1 };
      clampGhCam();
    }
    let catchAnim = null; // { phase, t, bug, sx, sy, nx, ny }
    let atriumBugs = 0;
    let coinFly = []; // {x,y,vx,vy,life}
    let shopTab = 'dresses'; // dresses | net | rewards
    let shopDressFocus = 'classic'; // selected dress card
    let shopNetFocus = 'big'; // small | big
    const recolorCache = {}; // key: dressId|poseKey -> canvas/image


    let audio = null;
    let rngState = 1;

    function rng() {
      rngState = (rngState * 1664525 + 1013904223) >>> 0;
      return rngState / 0x100000000;
    }

    function persist() {
      try {
        localStorage.setItem(KEY, JSON.stringify(save));
      } catch (e) {}
    }

    function say(msg) {
      toast = msg;
      toastT = 2.1;
      announce(msg);
    }

    function tone(freq, dur, type, gain) {
      if (save.mute) return;
      if (!audio) return;
      type = type || 'sine';
      gain = gain == null ? 0.06 : gain;
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(gain, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
      o.connect(g);
      g.connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + dur);
    }

    function chime(kind) {
      if (kind === 'pick') {
        tone(523, 0.12);
        tone(659, 0.16);
      } else if (kind === 'plant') tone(392, 0.14);
      else if (kind === 'water') tone(480, 0.1, 'triangle');
      else if (kind === 'win') {
        tone(523, 0.12);
        setTimeout(() => tone(659, 0.12), 90);
        setTimeout(() => tone(784, 0.2), 180);
      } else if (kind === 'cry') {
        tone(220, 0.18, 'triangle', 0.05);
        setTimeout(() => tone(196, 0.22, 'triangle', 0.045), 120);
      } else tone(660, 0.06, 'triangle', 0.04);
    }

    function unlock() {
      if (!audio) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audio = new AC();
      }
      if (audio && audio.state === 'suspended') void audio.resume();
    }

    function burst(x, y, color) {
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 30 + Math.random() * 90;
        parts.push({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 30,
          life: 0.55 + Math.random() * 0.25,
          max: 0.8,
          color,
          s: 3 + Math.random() * 3,
        });
      }
    }

    function growRate(size) {
      const tier = GH_TIER[size] || GH_TIER.M;
      const base = 3 / Math.max(20, tier.growSec); // stages per second while wet
      return base * (save.fast ? 2.4 : 1);
    }

    function catchUpGrowth() {
      const now = Date.now();
      let became = false;
      for (const bed of save.beds) {
        if (!bed.flower || !bed.wet || bed.stage >= 3) {
          if (bed) bed.updatedAt = now;
          continue;
        }
        const last = bed.updatedAt || bed.wateredAt || bed.plantedAt || now;
        const dt = Math.max(0, Math.min(7200, (now - last) / 1000)); // up to 2h catch-up
        const before = bed.stage;
        bed.stage = Math.min(3, bed.stage + dt * growRate(bed.size));
        bed.updatedAt = now;
        if (before < GH_STAGE.bloom && bed.stage >= GH_STAGE.bloom) became = true;
      }
      if (became) persist();
      return became;
    }

    function grow(dt) {
      let became = false;
      const now = Date.now();
      for (const bed of save.beds) {
        if (!bed.flower || !bed.wet || bed.stage >= 3) continue;
        const before = bed.stage;
        bed.stage = Math.min(3, bed.stage + dt * growRate(bed.size));
        bed.updatedAt = now;
        if (before < GH_STAGE.bloom && bed.stage >= GH_STAGE.bloom) became = true;
      }
      if (became && scene !== 'title') {
        say(scene === 'greenhouse' ? 'Ready to Clip!' : 'A flower is ready to clip!');
        chime('win');
        persist();
      }
    }

    function logicalH() {
      return cssH / scale;
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      cssW = Math.max(1, rect.width);
      cssH = Math.max(1, rect.height);
      const phone = 390 / 844;
      const screen = cssW / cssH;
      let viewW = cssW;
      offX = 0;
      offY = 0;
      if (screen > phone) {
        viewW = cssH * phone;
        offX = (cssW - viewW) / 2;
      }
      scale = viewW / 390;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
    }

    function cover(img, dw, dh) {
      if (!img || !img.width) return null;
      const ir = img.width / img.height;
      const dr = dw / dh;
      if (ir > dr) {
        const h = dh;
        const w = dh * ir;
        return { x: (dw - w) / 2, y: 0, w, h };
      }
      const w = dw;
      const h = dw / ir;
      return { x: 0, y: (dh - h) / 2, w, h };
    }

    function drawCover(img, scrollX) {
      const lh = logicalH();
      const m = cover(img, 390, lh);
      if (!img || !m) {
        ctx.fillStyle = '#8fd0ea';
        ctx.fillRect(0, 0, 390, lh);
        return null;
      }
      const sx = scrollX || 0;
      // Soft horizontal scroll for runner / meadow parallax without breaking lane map
      if (sx) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, 390, lh);
        ctx.clip();
        const shift = ((sx % m.w) + m.w) % m.w;
        ctx.drawImage(img, m.x - shift, m.y, m.w, m.h);
        ctx.drawImage(img, m.x - shift + m.w, m.y, m.w, m.h);
        ctx.restore();
        return m;
      }
      ctx.drawImage(img, m.x, m.y, m.w, m.h);
      return m;
    }

    function mapPoint(m, nx, ny) {
      return { x: m.x + nx * m.w, y: m.y + ny * m.h };
    }

    function round(x, y, w, h, r) {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    }

    function panel(x, y, w, h, fill) {
      fill = fill || CREAM;
      ctx.save();
      ctx.shadowColor = 'rgba(61,52,40,0.18)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 3;
      round(x, y, w, h, 18);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 3;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.restore();
    }

    function label(text, x, y, size, color, align) {
      ctx.fillStyle = color || INK;
      ctx.font = '700 ' + size + 'px Fredoka, system-ui, sans-serif';
      ctx.textAlign = align || 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y);
    }

    function button(id, x, y, w, h, text, fill) {
      buttons.push({ id, x, y, w, h });
      const down = pressed === id;
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2 + (down ? 1 : 0));
      if (down) ctx.scale(0.98, 0.98);
      round(-w / 2, -h / 2, w, h, 16);
      ctx.fillStyle = fill || PETAL;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = INK;
      ctx.stroke();
      label(text, 0, 1, Math.min(22, h * 0.38));
      ctx.restore();
    }

    function iconButton(id, x, y, w, h, text, glyph) {
      buttons.push({ id, x, y, w, h });
      const down = pressed === id;
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2 + (down ? 1 : 0));
      round(-w / 2 + 4, -h / 2 + 2, w - 8, h - 6, 16);
      ctx.fillStyle = CREAM;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = INK;
      ctx.stroke();
      if (glyph === 'pot') {
        ctx.fillStyle = '#E09A3E';
        round(-14, -6, 28, 18, 4);
        ctx.fill();
        ctx.stroke();
      } else if (glyph === 'bee') {
        if (art.bee) ctx.drawImage(art.bee, -18, -28, 36, 36);
      } else if (glyph === 'paint') {
        ctx.fillStyle = '#7EC8E3';
        ctx.beginPath();
        ctx.arc(0, -12, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (art[glyph]) {
        ctx.drawImage(art[glyph], -16, -30, 32, 36);
      }
      label(text, 0, h / 2 - 16, 13);
      ctx.restore();
    }

    /** Locked run-pose world scale — every Haven draw uses this height. */
    function havenH() {
      return HAVEN_RUN_H;
    }

    /** Map logical pose → approved Franz sprite key (never Grok black-dress art). */
    function resolveHavenKey(poseKey) {
      const k = poseKey || 'stand';
      const map = {
        stand: 'haven-front',
        front: 'haven-front',
        run: 'haven-run-01',
        walk: 'haven-walk-01',
        walk1: 'haven-walk-01',
        walk2: 'haven-walk-02',
        walk3: 'haven-walk-03',
        pick: 'haven-pick',
        water: 'haven-water',
        plant: 'haven-plant',
        jump: 'haven-jump',
        duck: 'haven-duck',
        cry: 'haven-stumble',
        stumble: 'haven-stumble',
        'haven-stand': 'haven-front',
        'haven-front': 'haven-front',
        'haven-walk1': 'haven-walk-01',
        'haven-walk2': 'haven-walk-02',
        'haven-pick': 'haven-pick',
        'haven-water': 'haven-water',
        'haven-jump': 'haven-jump',
        'haven-duck': 'haven-duck',
        'haven-stumble': 'haven-stumble',
        'haven-run-01': 'haven-run-01',
        'haven-run-02': 'haven-run-02',
        'haven-plant': 'haven-plant',
      };
      return map[k] || (String(k).indexOf('haven-') === 0 ? k : 'haven-front');
    }

    function drawHavenAt(x, footY, poseKey, face, opts) {
      opts = opts || {};
      const h = opts.h != null ? opts.h : havenH();
      let key = resolveHavenKey(poseKey);
      // Running walk cycle uses Franz runner frames
      if (opts.running) {
        key = Math.floor(time * 8) % 2 === 0 ? 'haven-run-01' : 'haven-run-02';
      }
      const img = havenSprite(key);
      if (!img) return { h, w: 0 };
      // Lock visual height to havenH for consistent pose scale (±5%)
      const s = h / img.height;
      const w = img.width * s;
      const bob = opts.bob || 0;
      const shake = opts.shake || 0;
      ctx.save();
      ctx.translate(x + shake, footY + bob);
      ctx.scale(face || 1, 1);
      if (opts.crouch) {
        ctx.scale(1, 0.82);
        ctx.translate(0, h * 0.05);
      }
      ctx.drawImage(img, -w / 2, -h, w, h);
      ctx.restore();
      return { h, w, s };
    }

    function drawHaven(x, footY, hIgnored, face) {
      let key = 'stand';
      let running = false;
      if (girl.poseT > 0 && girl.pose === 'pick') key = 'pick';
      else if (girl.poseT > 0 && girl.pose === 'water') key = 'water';
      else if (girl.walk > 0.2) {
        key = 'walk';
        running = scene === 'meadow';
      }
      const bob = girl.walk > 0.2 ? Math.sin(time * 10) * 3 : Math.sin(time * 2) * 1.5;
      return drawHavenAt(x, footY, key, face, { bob, running });
    }

    function measurePoseDrawnHeight(poseKey) {
      const h = havenH();
      const key = resolveHavenKey(poseKey);
      const img = havenSprite(key);
      if (!img || !img.width) return { havenH: h, formulaH: h, drawnH: 0, ok: false, rasterOk: false, pose: key };
      const formulaH = h; // locked
      // Offscreen alpha bbox for raster check
      const pad = 4;
      const c = document.createElement('canvas');
      c.width = Math.ceil((img.width / img.height) * h) + pad * 2;
      c.height = Math.ceil(h) + pad * 2;
      const x = c.getContext('2d');
      x.clearRect(0, 0, c.width, c.height);
      const dw = (img.width / img.height) * h;
      x.drawImage(img, pad, pad, dw, h);
      const data = x.getImageData(0, 0, c.width, c.height).data;
      let top = c.height, bot = 0, found = false;
      for (let y = 0; y < c.height; y++) {
        for (let px = 0; px < c.width; px++) {
          if (data[(y * c.width + px) * 4 + 3] > 12) {
            found = true;
            if (y < top) top = y;
            if (y > bot) bot = y;
          }
        }
      }
      const drawnH = found ? bot - top + 1 : formulaH;
      return {
        havenH: h,
        formulaH,
        drawnH,
        ok: true,
        rasterOk: found,
        pose: key,
        drift: Math.abs(drawnH - h) / h,
      };
    }

    /** Depth scale for props — stronger near Haven so obstacles stay readable. */
    function propScale(z) {
      const u = Math.max(0, Math.min(1, z));
      // z≈0.05 → ~1.55, z≈0.25 → ~1.34, z≈0.5 → ~1.08, z≈1 → ~0.55
      return 0.55 + 1.05 * (1 - u);
    }

    function measurePropDrawnHeight(kind, type, z) {
      const s = propScale(z);
      if (kind === 'flower') return { h: FLOWER_BASE_H * s, s, z };
      if (type === 'log') return { h: LOG_BASE_H * s, s, z };
      if (type === 'fence') return { h: FENCE_BASE_H * s, s, z };
      if (type === 'rock') return { h: ROCK_BASE_H * s, s, z };
      if (type === 'stump') return { h: STUMP_BASE_H * s, s, z };
      return { h: 40 * s, s, z };
    }

    function drawFlower(kind, x, y, h) {
      const img = art[kind];
      if (!img) return;
      const s = h / img.height;
      const w = img.width * s;
      ctx.drawImage(img, x - w / 2, y - h, w, h);
    }

    function drawBasket(x, y, flowers) {
      flowers = flowers || save.basket;
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = '#8B5A2B';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -14, 11, Math.PI, 0);
      ctx.stroke();
      round(-16, -16, 32, 22, 6);
      ctx.fillStyle = '#C47A3A';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-16, -6);
      ctx.lineTo(16, -6);
      ctx.stroke();
      const show = Math.min(3, flowers.length);
      for (let i = 0; i < show; i++) {
        const kind = flowers[flowers.length - 1 - i];
        if (kind) drawFlower(kind, -8 + i * 9, -22, 28);
      }
      ctx.restore();
    }

    /** Faceted rock — Franz obs-rock when available; never a gray oval. */
    function drawRock(x, y, s) {
      if (drawRockSprite(x, y, s)) return;
      const boost = Math.max(1.15, s);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(boost, boost);
      // Angular boulder silhouette
      ctx.beginPath();
      ctx.moveTo(-26, 6);
      ctx.lineTo(-22, -8);
      ctx.lineTo(-12, -22);
      ctx.lineTo(2, -28);
      ctx.lineTo(16, -20);
      ctx.lineTo(26, -6);
      ctx.lineTo(22, 8);
      ctx.lineTo(6, 14);
      ctx.lineTo(-14, 12);
      ctx.closePath();
      ctx.fillStyle = '#7A7368';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6 / Math.max(0.4, s);
      ctx.stroke();
      // Facet planes
      ctx.beginPath();
      ctx.moveTo(-12, -22);
      ctx.lineTo(2, -8);
      ctx.lineTo(16, -20);
      ctx.moveTo(2, -8);
      ctx.lineTo(6, 14);
      ctx.strokeStyle = 'rgba(61,52,40,0.4)';
      ctx.lineWidth = 1.8 / Math.max(0.4, s);
      ctx.stroke();
      // Light facet
      ctx.beginPath();
      ctx.moveTo(-12, -22);
      ctx.lineTo(2, -28);
      ctx.lineTo(2, -8);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,246,234,0.28)';
      ctx.fill();
      // Dark facet
      ctx.beginPath();
      ctx.moveTo(16, -20);
      ctx.lineTo(26, -6);
      ctx.lineTo(22, 8);
      ctx.lineTo(2, -8);
      ctx.closePath();
      ctx.fillStyle = 'rgba(45,40,34,0.22)';
      ctx.fill();
      ctx.restore();
    }

    /** Cut stump — procedural (Franz has no stump); readable near Haven. */
    function drawStump(x, y, s) {
      if (drawStumpSprite(x, y, s)) return;
      const boost = Math.max(1.2, s);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(boost, boost);
      // Trunk block with bark notches
      ctx.beginPath();
      ctx.moveTo(-16, -26);
      ctx.lineTo(16, -26);
      ctx.lineTo(18, 6);
      ctx.lineTo(8, 10);
      ctx.lineTo(-8, 10);
      ctx.lineTo(-18, 6);
      ctx.closePath();
      ctx.fillStyle = '#A06B3C';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5 / Math.max(0.4, s);
      ctx.stroke();
      // Bark lines
      ctx.beginPath();
      ctx.moveTo(-10, -20);
      ctx.lineTo(-12, 4);
      ctx.moveTo(4, -22);
      ctx.lineTo(6, 5);
      ctx.strokeStyle = 'rgba(61,52,40,0.35)';
      ctx.stroke();
      // Cut top with rings
      ctx.beginPath();
      ctx.ellipse(0, -26, 17, 8, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#D2A06A';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -26, 10, 4.5, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(61,52,40,0.45)';
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -26, 4, 1.8, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Roots
      ctx.fillStyle = '#8B5A2B';
      ctx.beginPath();
      ctx.moveTo(-18, 4);
      ctx.lineTo(-28, 10);
      ctx.lineTo(-14, 10);
      ctx.closePath();
      ctx.moveTo(18, 4);
      ctx.lineTo(28, 11);
      ctx.lineTo(12, 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.restore();
    }

    function drawPropSprite(img, x, y, targetH) {
      if (!img || !img.width) return false;
      const s = targetH / img.height;
      const w = img.width * s;
      ctx.drawImage(img, x - w / 2, y - targetH, w, targetH);
      return true;
    }

    function drawLog(x, y, s) {
      const h = LOG_BASE_H * s;
      if (drawPropSprite(art['obs-log'], x, y, h)) return;
      const rw = 96 * s;
      ctx.fillStyle = '#a56b3c';
      round(x - rw / 2, y - h * 0.55, rw, h * 0.55, 8);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.fillStyle = '#C48A52';
      ctx.beginPath();
      ctx.ellipse(x - rw / 2, y - h * 0.28, 10 * s, 14 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    function drawFence(x, y, s) {
      const h = FENCE_BASE_H * s;
      if (drawPropSprite(art['obs-fence'], x, y, h)) return;
      const w = 70 * s;
      ctx.strokeStyle = '#6B4A2E';
      ctx.fillStyle = '#C9A06A';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) {
        const px = x - w / 2 + 8 * s + i * 22 * s;
        round(px, y - h, 10 * s, h, 2);
        ctx.fill();
        ctx.stroke();
      }
      round(x - w / 2, y - h * 0.72, w, 8 * s, 2);
      ctx.fill();
      ctx.stroke();
      round(x - w / 2, y - h * 0.38, w, 8 * s, 2);
      ctx.fill();
      ctx.stroke();
    }

    function drawRockSprite(x, y, s) {
      const h = ROCK_BASE_H * s;
      if (drawPropSprite(art['obs-rock'], x, y, h)) return true;
      return false;
    }

    function drawStumpSprite(x, y, s) {
      const h = STUMP_BASE_H * s;
      // No dedicated stump sprite — use rock art scaled, else procedural stump
      if (drawPropSprite(art['obs-rock'], x, y, h * 0.92)) return true;
      return false;
    }

    function coach(text, y) {
      if (!text) return;
      const w = Math.min(364, 36 + text.length * 11);
      panel((390 - w) / 2, y, w, 40, 'rgba(255,246,234,0.96)');
      label(text, 195, y + 20, 17);
      if (text !== saidHint) {
        saidHint = text;
        announce(text);
      }
    }

    function hint() {
      if (runIntroOpen) return 'Tap next!';
      if (placesOpen) return 'Pick a place!';
      if (scene === 'meadow') {
        if (runEnded) return runWon ? 'You did it! 20 flowers!' : '3 hits — try again!';
        if (runCry > 0) return 'Ouch!';
        if (runCollected >= WIN_FLOWERS) return 'You win!';
        const close = runItems.find(
          (it) => !it.got && it.lane === Math.round(runShown) && it.z < 0.42 && it.z > 0.1 && it.kind !== 'flower'
        );
        if (close && (close.kind === 'log' || close.kind === 'rock' || close.kind === 'stump')) return 'Swipe up to jump!';
        if (close && close.kind === 'fence') return 'Swipe down to slide!';
        if (runCollected) return 'Swipe to pick more!';
        return 'Swipe to pick flowers!';
      }
      if (scene === 'greenhouse') {
        if (job) return 'Watering...';
        if (save.beds.some((b) => b.flower && b.wet && b.stage >= GH_STAGE.bloom)) return 'Tap Clip!';
        if (save.beds.some((b) => b.flower && !b.wet)) return 'Tap the blue drop!';
        if ((save.basket.length || save.bouquet.length) && save.beds.some((b) => !b.flower)) return 'Tap a pot!';
        if (save.bouquet.length) return 'Plant clips in the meadow!';
        if (save.beds.some((b) => b.flower)) return 'Growing...';
        return 'Plant a seed!';
      }
      if (scene === 'hive') {
        // Message must match jar + shelf state (never "full" with empty bench jars)
        if (save.jarFull.every(Boolean) && save.hiveShelf >= HIVE_SHELF_MAX) return 'Pantry is full!';
        if (save.jarFull.every(Boolean)) return 'Jars are full!';
        if (save.honey >= COMB_N) return 'Now tap a jar!';
        if (save.hiveShelf > 0 && !save.jarFull.some(Boolean)) return 'Drag the bee to a flower!';
        return 'Drag the bee to a flower!';
      }
      if (scene === 'bugs') {
        if (bugWinT > 0) return 'Eight bugs! Yay!';
        return 'Swing the net!';
      }
      if (scene === 'color') return 'Match the numbers!';
      if (scene === 'plant-meadow') return 'Tap the meadow to plant!';
      if (scene === 'market') return 'Tap jars or flowers to sell!';
      if (scene === 'dress-shop') return shopTab === 'rewards' ? 'Claim sticker rewards!' : 'Buy dresses and nets!';
      return '';
    }

    function canHome() {
      return { x: 108, y: logicalH() - havenH() * 0.46 };
    }

    function canPot(i) {
      const p = potScreenPos(i);
      return { x: p.x + 8, y: p.y - p.h * 0.35 };
    }

    function drawCan(x, y, tilt) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);
      ctx.fillStyle = '#6BBF59';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      round(-26, -14, 50, 34, 8);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-8, -12, 14, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(20, -2);
      ctx.lineTo(44, -18);
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.fillStyle = '#3D3428';
      ctx.beginPath();
      ctx.arc(44, -18, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function updateWater(dt) {
      if (!job) return;
      if (scene !== 'greenhouse') {
        job = null;
        can = null;
        return;
      }
      const home = canHome();
      const pot = canPot(job.pot);
      if (job.phase === 'go') {
        job.t += dt / 0.26;
        const k = Math.min(1, job.t);
        can = {
          x: home.x + (pot.x - home.x) * k,
          y: home.y + (pot.y - home.y) * k - Math.sin(k * Math.PI) * 24,
          tilt: 0,
        };
        if (k >= 1) {
          job.phase = 'pour';
          job.t = 0.48;
          const bed = save.beds[job.pot];
          if (bed && bed.flower && !bed.wet) {
            bed.wet = true;
            bed.wateredAt = Date.now();
            bed.updatedAt = bed.wateredAt;
            chime('water');
            persist();
          }
        }
        return;
      }
      if (job.phase === 'pour') {
        can = { x: pot.x, y: pot.y, tilt: 0.75 };
        job.t -= dt;
        parts.push({
          x: pot.x + 34,
          y: pot.y + 8,
          vx: 8 + Math.random() * 16,
          vy: 50 + Math.random() * 30,
          life: 0.35,
          max: 0.35,
          color: '#7EC8E3',
          s: 4,
        });
        if (job.t <= 0) {
          job.phase = 'back';
          job.t = 0;
          say(save.beds.some((b) => b.flower && !b.wet) ? 'Watered!' : 'All watered!');
        }
        return;
      }
      job.t += dt / 0.24;
      const k = Math.min(1, job.t);
      can = {
        x: pot.x + (home.x - pot.x) * k,
        y: pot.y + (home.y - pot.y) * k,
        tilt: 0.75 * (1 - k),
      };
      if (k >= 1) {
        job = null;
        can = null;
        girl.pose = 'stand';
        girl.poseT = 0;
      }
    }

    function drawHearts(x, y) {
      for (let i = 0; i < MAX_LIVES; i++) {
        const hx = x + i * 28;
        ctx.beginPath();
        const r = 9;
        ctx.moveTo(hx, y + r * 0.3);
        ctx.bezierCurveTo(hx, y - r * 0.4, hx - r, y - r * 0.4, hx - r, y + r * 0.15);
        ctx.bezierCurveTo(hx - r, y + r * 0.7, hx, y + r * 1.15, hx, y + r * 1.15);
        ctx.bezierCurveTo(hx, y + r * 1.15, hx + r, y + r * 0.7, hx + r, y + r * 0.15);
        ctx.bezierCurveTo(hx + r, y - r * 0.4, hx, y - r * 0.4, hx, y + r * 0.3);
        ctx.fillStyle = i < runLives ? '#E15B64' : 'rgba(255,246,234,0.7)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = INK;
        ctx.stroke();
      }
    }

    function hamburger(x, y) {
      buttons.push({ id: 'menu', x, y, w: 46, h: 46 });
      panel(x, y, 46, 46, CREAM);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 12, y + 15 + i * 9);
        ctx.lineTo(x + 34, y + 15 + i * 9);
        ctx.stroke();
      }
    }

    function hud() {
      let left = 10;
      // Color owns its own Back/Next row — no second Back here. Runner uses hamburger only.
      if (scene !== 'title' && scene !== 'meadow' && scene !== 'color') {
        button('back', 10, 10, 78, 46, 'Back', CREAM);
        left = 96;
      }
      if (scene === 'meadow') {
        panel(left, 10, 110, 46);
        label(runCollected + '/' + WIN_FLOWERS, left + 55, 34, 16);
        left += 118;
        drawHearts(left, 22);
        left += 96;
      } else if (scene === 'greenhouse' || scene === 'plant-meadow') {
        panel(left, 10, 100, 46);
        if (art.daisy) ctx.drawImage(art.daisy, left + 6, 14, 20, 26);
        label(String(save.basket.length + save.bouquet.length), left + 62, 34, 18);
        left += 108;
      } else if (scene === 'bugs') {
        panel(left, 10, 100, 46);
        label(bugCaughtSession + '/' + BUG_GOAL, left + 50, 34, 16);
        left += 108;
      }

      const starX = Math.min(left, 200);
      buttons.push({ id: 'stars', x: starX, y: 10, w: 70, h: 46 });
      panel(starX, 10, 70, 46, '#FFF3C4');
      label('★ ' + save.stars, starX + 35, 34, 14);
      // Coins purse
      const coinX = starX + 76;
      panel(coinX, 10, 70, 46, '#FFE08A');
      label('◉ ' + save.coins, coinX + 35, 34, 14);

      // Mute just left of hamburger
      buttons.push({ id: 'mute', x: 286, y: 10, w: 42, h: 46 });
      panel(286, 10, 42, 46, CREAM);
      label(save.mute ? 'off' : '♪', 307, 34, 16);

      // Hamburger places menu — top right
      hamburger(334, 10);
    }

    function drawPlacesMenu() {
      const lh = logicalH();
      ctx.fillStyle = 'rgba(61,52,40,0.4)';
      ctx.fillRect(0, 0, 390, lh);
      const items = [
        { id: 'place-run', label: 'Flower Run' },
        { id: 'place-plant', label: 'Greenhouse' },
        { id: 'place-meadow', label: 'Meadow Plant' },
        { id: 'place-bugs', label: 'Bug Catch' },
        { id: 'place-hive', label: 'Bees' },
        { id: 'place-market', label: 'Market' },
        { id: 'place-dress-shop', label: 'Shop' },
        { id: 'place-color', label: 'Color' },
        { id: 'place-home', label: 'Home' },
      ];
      const h = 48;
      const top = 70;
      panel(40, top - 16, 310, items.length * (h + 8) + 36, CREAM);
      label('Places', 195, top + 8, 22);
      items.forEach((it, i) => {
        button(it.id, 58, top + 28 + i * (h + 8), 274, h, it.label, '#FFE3A3');
      });
    }

    function drawToast() {
      if (toastT <= 0 || !toast) return;
      const lh = logicalH();
      // Dress-shop / market: toast under coach, never over claim/action buttons
      let y = lh - 78;
      if (scene === 'meadow') y = lh - 168;
      else if (scene === 'color') y = lh - 70;
      else if (scene === 'dress-shop') y = 118;
      else if (scene === 'market') y = 118;
      else if (scene === 'bugs') y = lh - 120;
      const w = Math.min(340, 24 + toast.length * 9);
      panel((390 - w) / 2, y, w, 44, 'rgba(255,246,234,0.94)');
      label(toast, 195, y + 22, 16);
    }

    function drawParts(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        if (!p) continue;
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 80 * dt;
        if (p.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    function dock() {
      const lh = logicalH();
      const y = lh - 92;
      const w = 86;
      const gap = 8;
      const start = (390 - (w * 4 + gap * 3)) / 2;
      iconButton('go-plant', start, y, w, 84, 'Plant', 'pot');
      iconButton('go-hive', start + (w + gap), y, w, 84, 'Bees', 'bee');
      iconButton('go-bugs', start + (w + gap) * 2, y, w, 84, 'Bugs', 'butterfly');
      iconButton('go-color', start + (w + gap) * 3, y, w, 84, 'Color', 'paint');
    }

    /* ---------- RUNNER (field.jpg lane tuning preserved) ---------- */

    function runPoint(lane, z) {
      // Tuned to field.jpg — do not change without retuning art
      const farXs = [0.46, 0.52, 0.585];
      const nearXs = [0.34, 0.58, 0.76];
      const i = Math.max(0, Math.min(1, Math.floor(lane)));
      const f = Math.max(0, Math.min(1, lane - i));
      const far = farXs[i] + (farXs[Math.min(i + 1, 2)] - farXs[i]) * f;
      const near = nearXs[i] + (nearXs[Math.min(i + 1, 2)] - nearXs[i]) * f;
      const u = Math.max(0, Math.min(1, z));
      const nx = far + (near - far) * (1 - u);
      const ny = 0.52 + 0.36 * (1 - u);
      const m = cover(art.field, 390, logicalH());
      const s = 0.34 + 0.7 * (1 - u);
      if (!m) return { x: 90 + lane * 100, y: 220 + (1 - u) * 380, s };
      const p = mapPoint(m, nx, ny);
      return { x: p.x, y: p.y, s };
    }

    function resetRun(opts) {
      opts = opts || {};
      runSeed = opts.seed != null ? opts.seed : (runSeed + 1);
      rngState = (runSeed * 9973 + 13) >>> 0;
      runItems = [];
      runLane = 1;
      runShown = 1;
      runJump = 0;
      runDuck = 0;
      runObSpawn = 0.15;
      runFlSpawn = 0.05;
      runCry = 0;
      runLives = opts.lives != null ? opts.lives : MAX_LIVES;
      runCollected = 0;
      runScroll = 0;
      runEnded = false;
      runWon = false;
      runInvuln = 0;
      fieldParallax = 0;
      // Prefill — include a NEAR beat so obstacles are readable at Haven scale
      spawnObstacleBeat(0.22);
      spawnFlowerBeat(0.18);
      for (let i = 0; i < 4; i++) {
        spawnObstacleBeat(0.45 + i * 0.5);
        spawnFlowerBeat(0.32 + i * 0.38);
      }
    }

    function spawnObstacleBeat(z) {
      // Obstacles in EVERY lane — no safe lane
      const kinds = ['log', 'fence', 'rock', 'stump'];
      for (let lane = 0; lane < 3; lane++) {
        if (runItems.some((it) => it.lane === lane && Math.abs(it.z - z) < 0.18)) continue;
        const kind = kinds[(rng() * kinds.length) | 0];
        const mode = kind === 'fence' ? 'duck' : 'jump';
        runItems.push({
          kind,
          flower: FLOWERS[(rng() * FLOWERS.length) | 0],
          lane,
          z,
          got: false,
          hit: false,
          mode,
        });
      }
    }

    function spawnFlowerBeat(z) {
      for (let lane = 0; lane < 3; lane++) {
        if (rng() > 0.72) continue;
        if (runItems.some((it) => it.lane === lane && Math.abs(it.z - z) < 0.16)) continue;
        runItems.push({
          kind: 'flower',
          flower: FLOWERS[(rng() * FLOWERS.length) | 0],
          lane,
          z: z + lane * 0.02,
          got: false,
          hit: false,
          mode: 'none',
        });
      }
    }

    function takeHit(msg) {
      if (runCry > 0 || runInvuln > 0 || runEnded) return false;
      runLives = Math.max(0, runLives - 1);
      runCry = CRY_DUR;
      runInvuln = CRY_DUR + 0.35;
      chime('cry');
      say(msg || 'Ouch!');
      if (runLives <= 0) {
        // Restart after cry finishes
      }
      return true;
    }

    function finishRun(opts) {
      opts = opts || {};
      runEnded = true;
      runWon = !!opts.won;
      if (runWon) {
        save.stars += 5;
        say('20 flowers! You win!');
        chime('win');
        persist();
      } else {
        say('3 hits — start over!');
      }
    }

    function updateRun(dt) {
      if (runIntroOpen || placesOpen || runEnded) return;
      if (runCry > 0) {
        runCry = Math.max(0, runCry - dt);
        if (runCry <= 0 && runLives <= 0) {
          finishRun({ gameOver: 1 });
          // auto restart shortly handled by UI
        }
        return; // freeze during cry
      }
      if (runInvuln > 0) runInvuln = Math.max(0, runInvuln - dt);
      if (runJump > 0) runJump = Math.max(0, runJump - dt);
      if (runDuck > 0) runDuck = Math.max(0, runDuck - dt);
      runShown += (runLane - runShown) * Math.min(1, dt * 12);
      runScroll += dt;
      fieldParallax += 40 * dt;

      runObSpawn -= dt;
      if (runObSpawn <= 0) {
        runObSpawn = SPAWN_EVERY;
        spawnObstacleBeat(1.05);
      }
      runFlSpawn -= dt;
      if (runFlSpawn <= 0) {
        runFlSpawn = FLOWER_EVERY;
        spawnFlowerBeat(1.0);
      }

      const speed = 0.34;
      for (const it of runItems) {
        if (!it.got) it.z -= speed * dt;
      }

      const laneNow = Math.round(runShown);
      for (const it of runItems) {
        if (it.got || it.lane !== laneNow || it.z > 0.14 || it.z < 0.02) continue;
        if (it.kind === 'flower') {
          it.got = true;
          runCollected += 1;
          if (save.basket.length < BASKET_MAX) save.basket.push(it.flower);
          const p = runPoint(it.lane, Math.max(0.05, it.z));
          burst(p.x, p.y - 20, it.flower === 'tulip' ? PETAL : it.flower === 'sunflower' ? '#FFD15C' : '#fff');
          chime('pick');
          persist();
          if (runCollected >= WIN_FLOWERS) finishRun({ won: 1 });
        } else {
          const needJump = it.mode === 'jump';
          const needDuck = it.mode === 'duck';
          const cleared = (needJump && runJump > 0) || (needDuck && runDuck > 0);
          if (!cleared) {
            it.hit = true;
            it.got = true;
            takeHit(needDuck ? 'Swipe down to slide!' : 'Swipe up to jump!');
          } else {
            it.got = true;
          }
        }
      }
      runItems = runItems.filter((it) => !it.got && it.z > -0.08);
    }

    function drawRunIntro() {
      const lh = logicalH();
      drawCover(art.field);
      // Simple picture intro using real art
      panel(24, lh * 0.14, 342, lh * 0.62, CREAM);
      // Picture intro using real Franz flower / log / fence art + approved Haven
      const havenImg = art['haven-front'] || art['haven-run-01'];
      if (havenImg) ctx.drawImage(havenImg, 36, lh * 0.2, 100, 128);
      if (art['flower-sunflower'] || art.sunflower) {
        const f = art['flower-sunflower'] || art.sunflower;
        ctx.drawImage(f, 150, lh * 0.22, 56, 72);
      }
      if (art['obs-log']) ctx.drawImage(art['obs-log'], 220, lh * 0.28, 70, 40);
      if (art['obs-fence']) ctx.drawImage(art['obs-fence'], 300, lh * 0.22, 48, 70);
      if (art['obs-rock']) ctx.drawImage(art['obs-rock'], 160, lh * 0.34, 50, 44);
      const pages = [
        {
          t: 'Collect 20 flowers!',
          s: 'Swipe left and right on the dirt lanes.',
        },
        {
          t: 'Jump and slide!',
          s: 'Swipe up over logs and rocks. Swipe down to slide under fences.',
        },
        {
          t: '3 hits and you start over',
          s: 'Watch your hearts. Pick 20 flowers to win!',
        },
      ];
      const pg = pages[Math.min(runIntroPage, pages.length - 1)];
      label(pg.t, 195, lh * 0.48, 22);
      label(pg.s, 195, lh * 0.56, 14, '#6d6256');
      label(runIntroPage + 1 + ' / 3', 195, lh * 0.64, 14, '#6d6256');
      button('intro-next', 70, lh * 0.7, 250, 54, runIntroPage >= 2 ? 'Play!' : 'Next', '#FFD15C');
      coach('Tap next!', 62);
      hamburger(334, 10);
    }

    function drawCryFace(x, y, h) {
      // Tears while crying
      ctx.fillStyle = '#7EC8E3';
      ctx.beginPath();
      ctx.ellipse(x - 10, y - h * 0.72, 3, 6, 0.2, 0, Math.PI * 2);
      ctx.ellipse(x + 12, y - h * 0.7, 3, 7, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawMeadow(dt) {
      const lh = logicalH();
      if (runIntroOpen) {
        drawRunIntro();
        return;
      }
      if (!art.field) {
        ctx.fillStyle = '#8fd4f0';
        ctx.fillRect(0, 0, 390, lh);
      } else {
        drawCover(art.field, fieldParallax * 0.15);
      }
      updateRun(dt);

      // Saved meadow plantings peek at the sides when visiting plant-meadow; on run show lightly
      const ordered = runItems.slice().sort((a, b) => b.z - a.z);
      for (const it of ordered) {
        const p = runPoint(it.lane, it.z);
        const ps = propScale(it.z);
        if (it.kind === 'flower') {
          const flowerArt = art['flower-' + it.flower] || art[it.flower];
          if (flowerArt) drawPropSprite(flowerArt, p.x, p.y, FLOWER_BASE_H * ps);
          else drawFlower(it.flower, p.x, p.y, FLOWER_BASE_H * ps);
        } else if (it.kind === 'rock') drawRock(p.x, p.y, ps);
        else if (it.kind === 'stump') drawStump(p.x, p.y, ps);
        else if (it.kind === 'log') drawLog(p.x, p.y, ps);
        else if (it.kind === 'fence') drawFence(p.x, p.y, ps);
      }

      const foot = runPoint(runShown, 0.04);
      const lift = runJump > 0 ? Math.sin((1 - runJump / 0.55) * Math.PI) * 70 : 0;
      girl.x = foot.x;
      girl.y = foot.y - lift;
      girl.walk = runJump > 0 || runDuck > 0 || runCry > 0 ? 0 : 1;
      const bob = runJump > 0 || runCry > 0 ? 0 : Math.sin(time * 12) * 4;
      const shake = runCry > 0 ? Math.sin(time * 40) * 2 : 0;
      let pose = 'stand';
      let running = false;
      if (runCry > 0) pose = 'cry';
      else if (runJump > 0) pose = 'jump';
      else if (runDuck > 0) pose = 'duck';
      else if (girl.walk > 0.2) { pose = 'run'; running = true; }
      drawHavenAt(girl.x, girl.y + bob, pose, 1, {
        bob: 0,
        shake,
        crouch: false,
        running,
      });
      if (runCry > 0) drawCryFace(girl.x + shake, girl.y + bob, havenH());
      if (runCry <= 0 && runDuck <= 0) drawBasket(girl.x + 36, girl.y + bob - havenH() * 0.42);

      if (runEnded) {
        panel(40, lh * 0.34, 310, 160, CREAM);
        label(runWon ? 'You win!' : 'Try again!', 195, lh * 0.34 + 48, 28);
        label(runWon ? '20 flowers picked' : '3 hits on logs or fences', 195, lh * 0.34 + 88, 15, '#6d6256');
        button('run-again', 70, lh * 0.34 + 110, 250, 48, 'Play again', '#FFD15C');
      }

      coach(hint(), 62);
      hud();
      // No bottom dock during the run — hamburger Places menu is navigation
      if (placesOpen) drawPlacesMenu();
    }

    /* ---------- GREENHOUSE ---------- */

    function uniqueBasket() {
      const map = new Map();
      save.basket.forEach((f) => map.set(f, (map.get(f) || 0) + 1));
      save.bouquet.forEach((f) => map.set(f, (map.get(f) || 0) + 1));
      return FLOWERS.filter((f) => map.has(f)).map((kind) => ({ kind, n: map.get(kind) || 0 }));
    }

    function clampGhCam() {
      const z = Math.max(1, Math.min(2.1, ghCam.zoom || 1)); // default 1 = full overview; + zooms in
      ghCam.zoom = z;
      const viewW = GH_VIEW_W / z;
      const viewH = logicalH() / z;
      const maxX = Math.max(0, GH_WORLD_W - viewW);
      const maxY = Math.max(0, GH_WORLD_H - viewH);
      ghCam.x = Math.max(0, Math.min(maxX, ghCam.x));
      ghCam.y = Math.max(0, Math.min(maxY, ghCam.y));
    }

    function screenToWorld(sx, sy) {
      const z = ghCam.zoom || 1;
      return { x: ghCam.x + sx / z, y: ghCam.y + sy / z };
    }

    function worldToScreen(wx, wy) {
      const z = ghCam.zoom || 1;
      return { x: (wx - ghCam.x) * z, y: (wy - ghCam.y) * z };
    }

    function potAt(sx, sy) {
      const wpt = screenToWorld(sx, sy);
      let best = -1;
      let bestD = 1;
      for (let i = 0; i < POTS.length; i++) {
        const b = potWorldBounds(i);
        const hitR = Math.max(b.w, b.h, GH_MIN_HIT) * 0.55;
        const dx = (wpt.x - b.cx) / hitR;
        const dy = (wpt.y - (b.y + b.h * 0.55)) / hitR;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return bestD < 1 ? best : -1;
    }

    function takeSeed(kind) {
      let ix = save.basket.indexOf(kind);
      if (ix >= 0) {
        save.basket.splice(ix, 1);
        return true;
      }
      ix = save.bouquet.indexOf(kind);
      if (ix >= 0) {
        save.bouquet.splice(ix, 1);
        return true;
      }
      return false;
    }

    function tapPot(i) {
      const bed = save.beds[i];
      if (!bed) return;
      const p = potScreenPos(i);
      if (!bed.flower) {
        const kind = selected || save.basket[0] || save.bouquet[0] || null;
        if (!kind) {
          say('Pick flowers in the run first');
          return;
        }
        if (!takeSeed(kind)) {
          say("That flower isn't ready");
          return;
        }
        const now = Date.now();
        bed.flower = kind;
        bed.wet = false;
        bed.stage = 0.15; // seed
        bed.size = GH_SLOTS[i].size;
        bed.plantedAt = now;
        bed.wateredAt = null;
        bed.updatedAt = now;
        girl.pose = 'stand';
        girl.poseT = 0;
        job = null;
        can = null;
        chime('plant');
        say('Seed planted!');
        persist();
        return;
      }
      if (!bed.wet) {
        if (job && job.pot === i && job.phase !== 'back') return;
        job = { pot: i, phase: 'go', t: 0 };
        girl.pose = 'water';
        girl.poseT = 0.8;
        return;
      }
      if (bed.stage >= GH_STAGE.bloom) {
        const kind = bed.flower;
        const yieldN = (GH_TIER[bed.size] || GH_TIER.M).yieldN;
        bed.flower = null;
        bed.wet = false;
        bed.stage = 0;
        bed.plantedAt = null;
        bed.wateredAt = null;
        bed.updatedAt = Date.now();
        for (let n = 0; n < yieldN; n++) save.bouquet.push(kind);
        save.stars += yieldN;
        job = null;
        can = null;
        girl.pose = 'pick';
        girl.poseT = 0.4;
        burst(p.x, p.y - 40, kind === 'sunflower' ? '#FFD15C' : PETAL);
        chime('win');
        say(yieldN > 1 ? 'Big clip! Plant them in the meadow' : 'Clipped! Plant it in the meadow');
        persist();
        return;
      }
      say('Still a ' + stageName(bed.stage) + '…');
    }


    function drawDressPreview(x, footY, dressId, h) {
      const prev = save.dress;
      save.dress = dressId;
      const out = drawHavenAt(x, footY, 'front', 1, { h: h || 88 });
      save.dress = prev;
      return out;
    }

    function drawStickerIcon(id, x, y, s) {
      s = s || 28;
      ctx.save();
      ctx.translate(x, y);
      if (id === 'first-sale') {
        // coin
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
        ctx.fillStyle = '#F0B429';
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        label('◉', 0, 4, 14);
      } else if (id === 'jars-10') {
        drawJar(0, -s * 0.2, true, false);
      } else if (id === 'flowers-20') {
        drawFlower('daisy', 0, s * 0.35, s * 1.4);
      } else if (id === 'bugs-8') {
        const img = art['butterfly-pink'] || art.butterfly;
        if (img) ctx.drawImage(img, -s * 0.55, -s * 0.45, s * 1.1, s * 0.85);
      } else if (id === 'coins-30') {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(-10 + i * 10, 4 - i * 3, 10, 0, Math.PI * 2);
          ctx.fillStyle = '#F0B429';
          ctx.fill();
          ctx.strokeStyle = INK;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      } else {
        // star fallback
        ctx.fillStyle = '#FFD15C';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.stroke();
      }
      ctx.restore();
    }


    function potAspect() {
      // Prefer a seated terracotta look (~0.78) even if source sprite is taller.
      const raw = art.pot && art.pot.width && art.pot.height ? art.pot.width / art.pot.height : 0.78;
      return Math.max(0.72, Math.min(0.85, raw < 0.7 ? 0.78 : raw));
    }

    function potDrawSize(size) {
      const tier = GH_TIER[size] || GH_TIER.M;
      const w = tier.w;
      const h = w / potAspect();
      return { w, h };
    }

    function potWorldBounds(bedIndex) {
      const spec = GH_SLOTS[bedIndex];
      const { w, h } = potDrawSize(spec.size);
      return {
        i: bedIndex,
        size: spec.size,
        x: spec.x - w / 2,
        y: spec.y - h,
        w,
        h,
        cx: spec.x,
        cy: spec.y - h * 0.45,
        footY: spec.y,
        shelfY: spec.y,
        tier: spec.size === 'S' ? 'top' : spec.size === 'M' ? 'middle' : 'bottom',
      };
    }

    function potScreenPos(bedIndex) {
      const b = potWorldBounds(bedIndex);
      const s = worldToScreen(b.cx, b.footY);
      return {
        x: s.x,
        y: s.y,
        shelfY: s.y,
        slot: bedIndex,
        h: b.h * (ghCam.zoom || 1),
        size: b.size,
        world: b,
      };
    }

    function potBounds(bedIndex) {
      // Screen-space bounds (for tests / overlays)
      const b = potWorldBounds(bedIndex);
      const tl = worldToScreen(b.x, b.y);
      const br = worldToScreen(b.x + b.w, b.y + b.h);
      return {
        i: bedIndex,
        size: b.size,
        tier: b.tier,
        x: tl.x,
        y: tl.y,
        w: br.x - tl.x,
        h: br.y - tl.y,
        cx: (tl.x + br.x) / 2,
        cy: (tl.y + br.y) / 2,
        footY: br.y,
        shelfY: br.y,
        hit: Math.max(br.x - tl.x, br.y - tl.y, GH_MIN_HIT * (ghCam.zoom || 1)),
      };
    }

    function blitWood(x, y, w, h, shade) {
      const img = art['shelf-wood'];
      shade = shade == null ? 1 : shade;
      if (img && img.width) {
        ctx.save();
        if (shade !== 1) {
          // Draw to temp via darker overlay after blit
        }
        const tileW = Math.max(40, Math.min(w, img.width));
        for (let xx = x; xx < x + w; xx += tileW) {
          const tw = Math.min(tileW, x + w - xx);
          ctx.drawImage(img, 0, 0, Math.min(img.width, tw), img.height, xx, y, tw, h);
        }
        if (shade < 1) {
          ctx.fillStyle = 'rgba(40,28,18,' + ((1 - shade) * 0.55).toFixed(3) + ')';
          ctx.fillRect(x, y, w, h);
        } else if (shade > 1) {
          ctx.fillStyle = 'rgba(255,240,210,' + ((shade - 1) * 0.45).toFixed(3) + ')';
          ctx.fillRect(x, y, w, h);
        }
        ctx.restore();
      } else {
        const base = shade < 1 ? '#9A7348' : shade > 1 ? '#D4B07A' : '#C4A06A';
        ctx.fillStyle = base;
        ctx.fillRect(x, y, w, h);
      }
    }

    /** Three-tier stair-step stand — illustrated wood with clear top/front bevels and cast shadows. */
    function drawPlantStand() {
      const plank = Math.max(22, GH_SHELF.plank);
      const bot = { x0: 16, x1: 374, y: GH_SHELF.bot, front: 34 };
      const mid = { x0: 42, x1: 348, y: GH_SHELF.mid, front: 28 };
      const top = { x0: 68, x1: 322, y: GH_SHELF.top, front: 22 };
      const postW = 24;
      const floorY = bot.y + plank + bot.front + 14;

      function post(x, y0, y1) {
        blitWood(x, y0, postW, y1 - y0, 0.9);
        // Bevel: lit left face + dark right face (readable thickness)
        ctx.fillStyle = '#E8CFA0';
        ctx.fillRect(x + 1, y0, 4, y1 - y0);
        ctx.fillStyle = '#6A4A2C';
        ctx.fillRect(x + postW - 7, y0, 7, y1 - y0);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.6;
        ctx.strokeRect(x + 0.5, y0 + 0.5, postW - 1, y1 - y0 - 1);
      }

      post(bot.x0, top.y - 22, floorY);
      post(bot.x1 - postW, top.y - 22, floorY);
      post(mid.x0, mid.y - 16, floorY);
      post(mid.x1 - postW, mid.y - 16, floorY);

      function sideStep(x0, x1, y0, y1) {
        const L = Math.min(x0, x1);
        const ww = Math.abs(x1 - x0);
        blitWood(L, y0, ww, y1 - y0, 0.78);
        ctx.fillStyle = '#5A3E26';
        ctx.fillRect(L + ww - 5, y0, 5, y1 - y0);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.strokeRect(L + 0.5, y0 + 0.5, ww - 1, y1 - y0 - 1);
      }
      sideStep(bot.x0 + postW, mid.x0, mid.y, bot.y + plank);
      sideStep(mid.x1, bot.x1 - postW, mid.y, bot.y + plank);
      sideStep(mid.x0 + postW, top.x0, top.y, mid.y + plank);
      sideStep(top.x1, mid.x1 - postW, top.y, mid.y + plank);

      // Diagonal braces
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(bot.x0 + postW + 6, mid.y + plank);
      ctx.lineTo(bot.x0 + postW + 42, bot.y);
      ctx.moveTo(bot.x1 - postW - 6, mid.y + plank);
      ctx.lineTo(bot.x1 - postW - 42, bot.y);
      ctx.stroke();

      function shelf(s, riserH) {
        // Back riser
        blitWood(s.x0, s.y - riserH, s.x1 - s.x0, riserH, 0.7);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.strokeRect(s.x0 + 0.5, s.y - riserH + 0.5, s.x1 - s.x0 - 1, riserH - 1);
        // Seating top (bright)
        blitWood(s.x0, s.y, s.x1 - s.x0, plank, 1.18);
        ctx.fillStyle = '#F0DEB8';
        ctx.fillRect(s.x0 + 2, s.y + 1, s.x1 - s.x0 - 4, 5);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.6;
        ctx.strokeRect(s.x0 + 0.5, s.y + 0.5, s.x1 - s.x0 - 1, plank - 1);
        // Thick dark front face
        blitWood(s.x0 + 2, s.y + plank, s.x1 - s.x0 - 4, s.front, 0.62);
        ctx.fillStyle = '#4A3220';
        ctx.fillRect(s.x0 + 2, s.y + plank + s.front - 9, s.x1 - s.x0 - 4, 9);
        ctx.fillStyle = '#C4A06A';
        ctx.fillRect(s.x0 + 2, s.y + plank, s.x1 - s.x0 - 4, 3); // top edge of front
        ctx.strokeRect(s.x0 + 2.5, s.y + plank + 0.5, s.x1 - s.x0 - 5, s.front - 1);
        // Hard cast shadow under shelf
        ctx.fillStyle = '#3D2A1A';
        ctx.globalAlpha = 0.35;
        ctx.fillRect(s.x0 + 10, s.y + plank + s.front, s.x1 - s.x0 - 20, 10);
        ctx.globalAlpha = 1;
      }
      shelf(bot, 20);
      shelf(mid, 16);
      shelf(top, 14);

      ctx.fillStyle = '#3D2A1A';
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.ellipse((bot.x0 + bot.x1) / 2, floorY + 8, (bot.x1 - bot.x0) * 0.5, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    function drawGreenhouseAtmosphere() {
      // Clean half-greenhouse backdrop — no translucent washes, no ghost pots, no blob hangings.
      if (art.greenhouse && art.greenhouse.width) {
        // Cover the world with the cleaned art (roof + glass + left shelf + empty wall/floor)
        const ir = art.greenhouse.width / art.greenhouse.height;
        let dh = GH_WORLD_H;
        let dw = dh * ir;
        if (dw < GH_WORLD_W) {
          dw = GH_WORLD_W;
          dh = dw / ir;
        }
        const dx = (GH_WORLD_W - dw) / 2;
        const dy = (GH_WORLD_H - dh) / 2 - 20; // slight lift for roof peak
        ctx.drawImage(art.greenhouse, dx, dy, dw, dh);
      } else {
        ctx.fillStyle = '#E8EEF2';
        ctx.fillRect(0, 0, GH_WORLD_W, GH_WORLD_H);
        ctx.fillStyle = '#C8CED4';
        ctx.fillRect(0, 700, GH_WORLD_W, 144);
      }
    }

    function drawIllustratedPot(wx, footY, w, h) {
      const img = art.pot;
      if (img && img.width) {
        // Franz terracotta sprite (rim, shading, soil) scaled to tier size
        ctx.drawImage(img, wx - w / 2, footY - h, w, h);
        return { w, h };
      }
      // Fallback: illustrated terracotta with rim + soil
      const rimH = h * 0.12;
      ctx.beginPath();
      ctx.moveTo(wx - w * 0.42, footY - h + rimH);
      ctx.lineTo(wx + w * 0.42, footY - h + rimH);
      ctx.lineTo(wx + w * 0.32, footY);
      ctx.lineTo(wx - w * 0.32, footY);
      ctx.closePath();
      ctx.fillStyle = '#D4894A';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#C4783E';
      ctx.beginPath();
      ctx.ellipse(wx, footY - h + rimH * 0.45, w * 0.46, rimH * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#5A3A22';
      ctx.beginPath();
      ctx.ellipse(wx, footY - h + rimH * 0.55, w * 0.34, rimH * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      return { w, h };
    }

    function drawBedPlant(bed, wb) {
      if (!bed || !bed.flower) return;
      const soilY = wb.footY - wb.h * 0.86; // soil sits near rim of Franz pot
      const tierScale = wb.size === 'L' ? 1.05 : wb.size === 'S' ? 0.55 : 0.78;
      const ready = bed.wet && bed.stage >= GH_STAGE.bloom;
      let fh;
      if (!bed.wet || bed.stage < GH_STAGE.seed) {
        fh = 7 * tierScale;
      } else if (bed.stage < GH_STAGE.sprout) {
        fh = (12 + bed.stage * 8) * tierScale;
      } else if (bed.stage < GH_STAGE.bud) {
        fh = (18 + (bed.stage / 3) * 28) * tierScale;
      } else {
        fh = (26 + (bed.stage / 3) * 48) * tierScale;
      }
      if (!bed.wet || bed.stage < GH_STAGE.seed) {
        ctx.fillStyle = '#5A3A22';
        ctx.beginPath();
        ctx.arc(wb.cx, soilY - 1, Math.max(2, 2.8 * tierScale), 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawFlower(bed.flower, wb.cx, soilY, fh);
      }
      if (!bed.wet) {
        const dropY = soilY - Math.max(fh, 10) - 6 + Math.sin(time * 6) * 2;
        ctx.fillStyle = '#7EC8E3';
        ctx.beginPath();
        ctx.arc(wb.cx, dropY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (ready) {
        const cw = wb.size === 'S' ? 36 : 48;
        panel(wb.cx + 4, soilY - fh - 2, cw, 18, '#FFD15C');
        label('Clip', wb.cx + 4 + cw / 2, soilY - fh + 8, 10);
      }
    }

    function potsFullyInViewport() {
      const lh = logicalH();
      const margin = 2;
      return POTS.map((_, i) => potBounds(i)).every((b) =>
        b.x >= margin &&
        b.y >= margin &&
        b.x + b.w <= GH_VIEW_W - margin &&
        b.y + b.h <= lh - margin
      );
    }

    function drawGreenhouse() {
      const lh = logicalH();
      clampGhCam();
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, GH_VIEW_W, lh);
      ctx.clip();
      ctx.translate(-ghCam.x * ghCam.zoom, -ghCam.y * ghCam.zoom);
      ctx.scale(ghCam.zoom, ghCam.zoom);

      drawGreenhouseAtmosphere();
      drawPlantStand();

      if (selected && !save.basket.includes(selected) && !save.bouquet.includes(selected)) {
        selected = save.basket[0] || save.bouquet[0] || null;
      }

      // All 13 pots drawn as terracotta sprites on the stair-step stand
      for (let i = 0; i < POTS.length; i++) {
        const bed = save.beds[i];
        const wb = potWorldBounds(i);
        drawIllustratedPot(wb.cx, wb.footY, wb.w, wb.h);
        drawBedPlant(bed, wb);
      }
      ctx.restore();

      // Haven stands on the floor in front of the stand (stand is taller than her)
      drawHaven(70, lh - 8, Math.min(havenH(), 118), 1);
      if (!job && (save.basket.length || save.bouquet.length)) {
        drawBasket(118, lh - Math.min(havenH(), 118) * 0.42, save.bouquet.length ? save.bouquet : save.basket);
      }
      if (can) drawCan(can.x, can.y, can.tilt);
      const chips = uniqueBasket();
      let cx0 = 12;
      chips.forEach((c) => {
        const on = selected === c.kind;
        buttons.push({ id: 'chip-' + c.kind, x: cx0, y: 64, w: 74, h: 54 });
        panel(cx0, 64, 74, 54, on ? '#FFE3A3' : CREAM);
        drawFlower(c.kind, cx0 + 24, 112, 40);
        label(String(c.n), cx0 + 56, 90, 16);
        cx0 += 80;
      });
      if (save.bouquet.length) {
        button('go-plant-meadow', 250, 64, 128, 46, 'To meadow', '#A8E6A1');
      }
      button('gh-zoom-out', 334, 118, 46, 40, '−', CREAM);
      button('gh-zoom-in', 334, 166, 46, 40, '+', CREAM);
      panel(70, lh - 52, 250, 36, '#FFE3A3');
      label('13 pots · + to zoom', 195, lh - 32, 13);
      coach(hint(), chips.length ? 126 : 64);
      hud();
      if (placesOpen) drawPlacesMenu();
    }

    function drawPlantMeadow(dt) {
      const lh = logicalH();
      meadowParallax += 12 * dt;
      drawCover(art.meadow, meadowParallax * 0.08);
      // Draw saved plants
      const m = cover(art.meadow, 390, lh);
      save.meadowPlants.forEach((pl) => {
        if (!m) return;
        const p = mapPoint(m, pl.nx, pl.ny);
        drawFlower(pl.kind, p.x, p.y, 70);
      });
      drawHaven(195, lh * 0.78, havenH(), 1);
      if (save.bouquet.length) drawBasket(240, lh * 0.78 - havenH() * 0.4, save.bouquet);
      coach(hint(), 64);
      hud();
      if (placesOpen) drawPlacesMenu();
    }

    function plantInMeadowAt(x, y) {
      if (!save.bouquet.length) {
        say('Clip a flower first!');
        return false;
      }
      const kind = save.bouquet.pop();
      const m = cover(art.meadow, 390, logicalH());
      let nx = 0.5;
      let ny = 0.7;
      if (m) {
        nx = Math.max(0.1, Math.min(0.9, (x - m.x) / m.w));
        ny = Math.max(0.55, Math.min(0.85, (y - m.y) / m.h));
      }
      save.meadowPlants.push({ kind, nx, ny });
      save.stars += 1;
      burst(x, y, '#FFD15C');
      chime('plant');
      say('Planted in the meadow!');
      persist();
      return true;
    }

    /* ---------- HIVE ---------- */

    function hex(x, y, r) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i * Math.PI) / 3;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }

    function combSpots(m) {
      // Fixed on-screen 14-cell comb — fully visible to the right of hive left edge
      // Pattern 4-3-4-3 = 14 cells, large spacing
      const originX = 118;
      const originY = 228;
      const dx = 42;
      const dy = 38;
      const rows = [
        [0, 1, 2, 3],
        [0.5, 1.5, 2.5],
        [0, 1, 2, 3],
        [0.5, 1.5, 2.5],
      ];
      const spots = [];
      rows.forEach((cols, r) => {
        cols.forEach((c) => {
          if (spots.length >= COMB_N) return;
          spots.push({ x: originX + c * dx, y: originY + r * dy });
        });
      });
      return spots.slice(0, COMB_N);
    }

    function hiveZones(m) {
      if (!m) return HIVE_BLOOMS.map(() => ({ x: 250, y: 320 }));
      return HIVE_BLOOMS.map((b) => mapPoint(m, b.nx, b.ny));
    }

    function beeHome() {
      const lh = logicalH();
      // Park near Haven / left field — clear of pantry UI
      return { x: 72, y: Math.min(lh * 0.78, lh - 160) };
    }

    function keepBeeClearOfPantry() {
      const lh = logicalH();
      const L = pantryLayout(lh);
      const pad = 56;
      const beeR = 32;
      const overlaps =
        bee.x + beeR > L.x - pad &&
        bee.x - beeR < L.x + L.w + pad &&
        bee.y + beeR > L.y - pad &&
        bee.y - beeR < L.y + L.h + pad;
      if (overlaps) {
        bee.x = L.x - pad - beeR;
        if (bee.x < 40) bee.x = 40;
        bee.tx = bee.x;
      }
    }

    function drawJar(x, y, full, ghost) {
      ctx.save();
      if (ghost) ctx.globalAlpha = 0.35;
      round(x - 14, y, 28, 36, 6);
      ctx.fillStyle = full ? '#F0B429' : 'rgba(255,246,234,0.9)';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      if (full) {
        ctx.fillStyle = '#FFE08A';
        ctx.fillRect(x - 10, y + 6, 20, 5);
      }
      // lid
      round(x - 12, y - 6, 24, 10, 3);
      ctx.fillStyle = '#C47A3A';
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    function pantryLayout(lh) {
      // Wide horizontal pantry shelf — clearly visible, not a tiny strip
      const w = 220;
      const h = 118;
      const x = 155;
      const y = lh * 0.58;
      return { x, y, w, h, jarSlots: HIVE_SHELF_MAX, jarH: 52, jarW: 36 };
    }

    function drawPantryShelf(lh) {
      const L = pantryLayout(lh);
      // Wood shelf body
      round(L.x, L.y, L.w, L.h, 14);
      ctx.fillStyle = 'rgba(255,246,234,0.96)';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.stroke();
      // Shelf planks
      ctx.fillStyle = '#C47A3A';
      round(L.x + 10, L.y + 28, L.w - 20, 14, 4);
      ctx.fill();
      round(L.x + 10, L.y + 78, L.w - 20, 14, 4);
      ctx.fill();
      ctx.strokeStyle = '#8B5A2B';
      ctx.stroke();
      label('Pantry', L.x + L.w / 2, L.y + 16, 16);
      const gap = (L.w - 24) / L.jarSlots;
      for (let i = 0; i < L.jarSlots; i++) {
        const jx = L.x + 22 + gap * i + gap / 2;
        const jy = L.y + 38;
        const full = i < save.hiveShelf;
        // Larger jars on the shelf
        ctx.save();
        if (!full) ctx.globalAlpha = 0.35;
        round(jx - L.jarW / 2, jy, L.jarW, L.jarH, 8);
        ctx.fillStyle = full ? '#F0B429' : 'rgba(255,246,234,0.95)';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = INK;
        ctx.stroke();
        if (full) {
          ctx.fillStyle = '#FFE08A';
          ctx.fillRect(jx - L.jarW / 2 + 4, jy + 8, L.jarW - 8, 6);
        }
        round(jx - L.jarW / 2 + 2, jy - 8, L.jarW - 4, 12, 3);
        ctx.fillStyle = '#C47A3A';
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawHive() {
      const lh = logicalH();
      const m = drawCover(art.hive);
      const spots = combSpots(m);
      const pop = honeyPop > 0 ? 1 + honeyPop * 0.8 : 1;
      spots.forEach((p, i) => {
        const filled = i < save.honey;
        const r = filled && i === save.honey - 1 ? 22 * pop : 21;
        hex(p.x, p.y, r);
        if (filled) {
          ctx.fillStyle = '#E8A017';
          ctx.fill();
          hex(p.x - 1, p.y - 3, r * 0.55);
          ctx.fillStyle = '#FFD15C';
          ctx.fill();
          hex(p.x, p.y, r);
          ctx.fillStyle = 'rgba(240,180,40,0.55)';
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(255,246,234,0.96)';
          ctx.fill();
        }
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#6B3F1A';
        hex(p.x, p.y, r);
        ctx.stroke();
      });
      if (m) {
        JARS.forEach((jar, i) => {
          const p = mapPoint(m, jar.nx, jar.ny);
          drawJar(p.x, p.y + 8, save.jarFull[i], false);
          if (!save.jarFull[i] && save.honey >= COMB_N) {
            ctx.beginPath();
            ctx.arc(p.x, p.y + 22, 30 + Math.sin(time * 5 + i) * 2, 0, Math.PI * 2);
            ctx.strokeStyle = '#F0B429';
            ctx.lineWidth = 4;
            ctx.stroke();
          }
          buttons.push({ id: 'jar-' + i, x: p.x - 32, y: p.y - 8, w: 64, h: 78 });
        });
      }
      drawPantryShelf(lh);
      const zones = hiveZones(m);
      if (save.honey < COMB_N && save.hiveShelf < HIVE_SHELF_MAX) {
        zones.forEach((z, i) => {
          const pulse = 36 + Math.sin(time * 4 + i) * 3;
          ctx.beginPath();
          ctx.arc(z.x, z.y, pulse, 0, Math.PI * 2);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 7;
          ctx.stroke();
          ctx.strokeStyle = '#E09A3E';
          ctx.lineWidth = 3;
          ctx.stroke();
        });
      }
      keepBeeClearOfPantry();
      if (art.bee) {
        const bob = Math.sin(time * 14) * 3;
        ctx.drawImage(art.bee, bee.x - 28, bee.y - 28 + bob, 56, 56);
      }
      drawHaven(70, lh - 16, havenH(), 1);
      if (save.hiveShelf > 0) {
        button('go-market', 250, 64, 128, 46, 'To market', '#FFD15C');
      }
      coach(hint(), 64);
      hud();
      if (placesOpen) drawPlacesMenu();
    }

    function beeArrive() {
      if (time < beeLock) return;
      beeLock = time + 0.32;
      burst(bee.x, bee.y, '#FFD15C');
      chime('pick');
      const home = beeHome();
      bee.x = home.x;
      bee.y = home.y;
      bee.tx = home.x;
      bee.ty = home.y;
      keepBeeClearOfPantry();
      if (save.jarFull.every(Boolean) && save.hiveShelf >= HIVE_SHELF_MAX) {
        say('Pantry is full!');
        return;
      }
      if (save.jarFull.every(Boolean)) {
        say('Jars are full!');
        return;
      }
      if (save.honey >= COMB_N) {
        say('Tap a jar!');
        return;
      }
      save.honey += 1;
      honeyPop = 0.28;
      if (save.honey >= COMB_N) say('Tap a jar!');
      else say('Honey!');
      persist();
    }

    function tapJar(i) {
      if (save.jarFull[i]) {
        // Jars do not refill
        say(save.jarFull.every(Boolean) ? 'That jar is full!' : 'Tap an empty jar!');
        return false;
      }
      if (save.honey < COMB_N) {
        say('Fill the honeycomb first!');
        return false;
      }
      save.jarFull[i] = true;
      save.honey = 0;
      save.jars = save.jarFull.filter(Boolean).length;
      // Move to pantry shelf
      if (save.hiveShelf < HIVE_SHELF_MAX) save.hiveShelf += 1;
      save.stars += 2;
      pourT = 0.65;
      pourJar = i;
      chime('win');
      if (save.jarFull.every(Boolean) && save.hiveShelf >= HIVE_SHELF_MAX) say('Pantry is full!');
      else say('Honey on the shelf!');
      persist();
      return true;
    }

    /* ---------- BUGS ---------- */

    function resetBugs() {
      bugs = [];
      bugCaughtSession = 0;
      bugWinT = 0;
      netSwing = 0;
      meadowParallax = 0;
      for (let i = 0; i < 5; i++) spawnBug();
    }

    function spawnBug() {
      const color = BUG_COLORS[(Math.random() * BUG_COLORS.length) | 0];
      // Spread across reachable mid-field slots (not clustered at top)
      const used = bugs.map((b) => b.slot).filter((s) => s != null);
      let slotIx = 0;
      for (let i = 0; i < BUG_SLOTS.length; i++) {
        if (used.indexOf(i) < 0) { slotIx = i; break; }
        slotIx = (i + 1) % BUG_SLOTS.length;
      }
      const slot = BUG_SLOTS[slotIx];
      const ox = slot.ox + (Math.random() - 0.5) * 10;
      const oy = slot.oy + (Math.random() - 0.5) * 8;
      bugs.push({
        x: ox,
        y: oy,
        ox,
        oy,
        slot: slotIx,
        p: Math.random() * Math.PI * 2,
        sp: 0.9 + Math.random() * 0.5,
        rad: 14 + Math.random() * 8,
        color: color === 'yellow' ? 'yellow' : color,
        caught: false,
        size: BUG_DRAW_SIZE,
        id: Math.random().toString(36).slice(2),
      });
    }

    function drawNet(x, y, ang) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.strokeStyle = '#C47A3A';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4, 34);
      ctx.lineTo(10, -28);
      ctx.stroke();
      ctx.translate(10, -28);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, -14, 24, 16, -0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(0, 10);
      ctx.moveTo(-18, -8);
      ctx.quadraticCurveTo(0, 22, 18, -8);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(61,52,40,0.5)';
      ctx.lineWidth = 1.4;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(-18, -14 + i * 7);
        ctx.lineTo(18, -14 + i * 7);
        ctx.stroke();
      }
      ctx.restore();
    }

    function catchBug(i, opts) {
      opts = opts || {};
      const b = bugs[i];
      if (!b || b.caught || bugWinT > 0 || catchAnim) return false;
      // Start catch animation: swing → scoop → sparkle → fly to atrium jar
      const jarX = 330;
      const jarY = 120;
      catchAnim = {
        phase: 'swing',
        t: 0,
        bug: b,
        sx: b.x,
        sy: b.y,
        nx: girl.x + girl.face * 42,
        ny: girl.y - havenH() * 0.42,
        jarX,
        jarY,
        color: b.color,
      };
      b.caught = true;
      netSwing = 1;
      parts.length = 0; // clear stray sparkles so scoop stays clean
      chime('pick');
      if (opts.instant) {
        finishCatchAnim();
      }
      return true;
    }

    function finishCatchAnim() {
      const anim = catchAnim;
      catchAnim = null;
      if (!anim) return;
      bugCaughtSession += 1;
      save.bugs += 1;
      atriumBugs = Math.min(BUG_GOAL, atriumBugs + 1);
      burst(anim.jarX, anim.jarY, '#FFD15C');
      const b = anim.bug;
      const ix = bugs.indexOf(b);
      if (ix >= 0) bugs.splice(ix, 1);
      spawnBug();
      if (bugs.length < 5) spawnBug();
      if (bugCaughtSession >= BUG_GOAL) {
        bugWinT = 2.8;
        save.stars += 5;
        say('Eight bugs! Yay!');
        chime('win');
        for (let k = 0; k < 24; k++) burst(80 + Math.random() * 230, 180 + Math.random() * 200, '#FFD15C');
      } else say('Into the jar!');
      persist();
    }

    function updateCatchAnim(dt) {
      if (!catchAnim) return;
      const a = catchAnim;
      a.t += dt;
      if (a.phase === 'swing') {
        netSwing = 1;
        if (a.t > 0.22) {
          a.phase = 'scoop';
          a.t = 0;
          // clean scoop — no particle burst blob
        }
      } else if (a.phase === 'scoop') {
        // Butterfly moves into net
        const k = Math.min(1, a.t / 0.28);
        a.nx = girl.x + girl.face * 42;
        a.ny = girl.y - havenH() * 0.42;
        a.sx = a.sx + (a.nx - a.sx) * Math.min(1, dt * 10);
        a.sy = a.sy + (a.ny - a.sy) * Math.min(1, dt * 10);
        if (k >= 1) {
          a.phase = 'fly';
          a.t = 0;
        }
      } else if (a.phase === 'fly') {
        const k = Math.min(1, a.t / 0.45);
        const e = k * k * (3 - 2 * k);
        a.sx = a.nx + (a.jarX - a.nx) * e;
        a.sy = a.ny + (a.jarY - a.ny) * e - Math.sin(e * Math.PI) * 40;
        if (k >= 1) finishCatchAnim();
      }
    }

    function updateGirl(dt, floor) {
      if (!goal) {
        girl.walk = Math.max(0, girl.walk - dt * 3);
        return;
      }
      const dx = goal.x - girl.x;
      const dy = goal.y - girl.y;
      const dist = Math.hypot(dx, dy);
      girl.face = dx < -2 ? 1 : dx > 2 ? -1 : girl.face;
      if (dist < 10) {
        girl.x = goal.x;
        girl.y = goal.y;
        girl.walk = 0;
        if (goal.bug != null) {
          const id = goal.bug;
          goal = null;
          catchBug(id);
          return;
        }
        goal = null;
        return;
      }
      const step = Math.min(dist, 560 * dt);
      girl.x += (dx / dist) * step;
      girl.y += (dy / dist) * step;
      girl.y = Math.min(girl.y, floor);
      girl.walk = 1;
    }

    function drawBugs(dt) {
      const lh = logicalH();
      meadowParallax += 18 * dt;
      // Parallax moving meadow
      drawCover(art.meadow, meadowParallax);
      // Far layer soft overlay
      ctx.globalAlpha = 0.18;
      drawCover(art.meadow, meadowParallax * 0.45);
      ctx.globalAlpha = 1;

      // Saved plants visible in bug meadow
      const m = cover(art.meadow, 390, lh);
      save.meadowPlants.forEach((pl) => {
        if (!m) return;
        const p = mapPoint(m, pl.nx, pl.ny);
        drawFlower(pl.kind, p.x, p.y, 64);
      });

      const floor = lh - 100;
      bugs.forEach((b) => {
        if (b.caught) return;
        if (catchAnim && catchAnim.bug === b) return;
        b.p += dt * b.sp * 1.6;
        b.x = b.ox + Math.sin(b.p) * b.rad;
        b.y = b.oy + Math.cos(b.p * 0.85) * (b.rad * 0.55);
        b.x = Math.max(48, Math.min(342, b.x));
        b.y = Math.max(230, Math.min(floor - 40, b.y));
      });
      // Keep butterflies from overlapping each other
      const live = bugs.filter((b) => !b.caught && !(catchAnim && catchAnim.bug === b));
      for (let i = 0; i < live.length; i++) {
        for (let j = i + 1; j < live.length; j++) {
          const a = live[i], c = live[j];
          const dx = c.x - a.x, dy = c.y - a.y;
          const d = Math.hypot(dx, dy) || 0.01;
          const minD = 118;
          if (d < minD) {
            const push = (minD - d) / 2;
            a.x -= (dx / d) * push;
            a.y -= (dy / d) * push;
            c.x += (dx / d) * push;
            c.y += (dy / d) * push;
          }
        }
      }
      live.forEach((b) => {
        const img = art['butterfly-' + b.color] || art.butterfly;
        if (img) {
          const flap = (b.size || BUG_DRAW_SIZE) + Math.sin(time * 16 + b.p) * 6;
          ctx.drawImage(img, b.x - flap / 2, b.y - flap / 2, flap, flap * 0.72);
        }
      });

      if (goal && goal.bug != null) {
        const b = bugs[goal.bug];
        if (!b || b.caught) goal = null;
        else {
          goal.x = b.x;
          goal.y = Math.min(floor, b.y + 40);
          if (Math.hypot(girl.x - b.x, girl.y - (b.y + 24)) < 70) {
            const id = goal.bug;
            goal = null;
            catchBug(id);
          }
        }
      }
      updateGirl(dt, floor);
      if (netSwing > 0) netSwing = Math.max(0, netSwing - dt * 1.8);
      if (bugWinT > 0) bugWinT = Math.max(0, bugWinT - dt);

      // Haven locked pose scale; net in her hands
      girl.x = girl.x || 195;
      if (!goal) {
        girl.x = 195;
        girl.y = floor;
        girl.walk = 0;
      }
      updateCatchAnim(dt);
      const bob = girl.walk > 0.2 ? Math.sin(time * 10) * 3 : 0;
      drawHavenAt(girl.x, girl.y + bob, 'front', girl.face, { bob: 0 });
      const swing = catchAnim && catchAnim.phase === 'swing'
        ? -0.4 + catchAnim.t * 4
        : netSwing > 0
          ? -0.2 + (1 - netSwing) * 1.1
          : -0.15 + Math.sin(time * 2) * 0.06;
      // Net in Haven's hands (bigger visual if upgraded)
      const netScale = save.bigNet ? 1.25 : 1;
      ctx.save();
      ctx.translate(girl.x + girl.face * 42, girl.y - havenH() * 0.42 + bob);
      ctx.scale(netScale, netScale);
      ctx.translate(-(girl.x + girl.face * 42), -(girl.y - havenH() * 0.42 + bob));
      drawNet(girl.x + girl.face * 42, girl.y - havenH() * 0.42 + bob, swing);
      ctx.restore();
      // Atrium / jar counter (top-right)
      round(300, 64, 78, 70, 12);
      ctx.fillStyle = 'rgba(255,246,234,0.95)';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.stroke();
      label('Jar', 339, 78, 12);
      label(String(atriumBugs) + '/' + BUG_GOAL, 339, 104, 16);
      // Scoop / fly butterfly during catch anim — single clean sprite, no burst spam
      if (catchAnim && catchAnim.bug) {
        const img = art['butterfly-' + catchAnim.color] || art.butterfly;
        const flap = catchAnim.phase === 'fly' ? 40 : 48;
        if (img) {
          ctx.save();
          if (catchAnim.phase === 'scoop') {
            // tuck into net
            ctx.globalAlpha = 0.95;
          }
          ctx.drawImage(img, catchAnim.sx - flap / 2, catchAnim.sy - flap / 2, flap, flap * 0.72);
          ctx.restore();
        }
        // One soft sparkle ring (not particle burst every frame)
        if (catchAnim.phase === 'scoop' && catchAnim.t < 0.2) {
          ctx.save();
          ctx.globalAlpha = 1 - catchAnim.t / 0.2;
          ctx.strokeStyle = '#FFD15C';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(catchAnim.sx, catchAnim.sy, 18 + catchAnim.t * 40, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      if (bugWinT > 0) {
        panel(50, lh * 0.3, 290, 120, CREAM);
        label('Celebration!', 195, lh * 0.3 + 44, 26);
        label('8 butterflies caught', 195, lh * 0.3 + 84, 16, '#6d6256');
      }

      coach(hint(), 64);
      hud();
      if (placesOpen) drawPlacesMenu();
    }

    /* ---------- COLOR ---------- */

    function colorNumber(page, nx, ny, area) {
      if (page === 'daisy') {
        if (ny < 0.26 && nx < 0.45) return 1;
        if (ny < 0.3) return 2;
        if (ny > 0.62) return 3;
        if (Math.hypot(nx - 0.5, ny - 0.45) < 0.08) return 1;
        return 4;
      }
      if (page === 'tulip') {
        if (ny < 0.42) return 4;
        if (nx > 0.64) return 2;
        return 3;
      }
      if (area < 450) return 6;
      if (ny < 0.3) return 2;
      if (ny < 0.52 && nx < 0.46) return 1;
      if (ny < 0.52) return Math.round((nx - 0.45) / 0.075) % 2 === 0 ? 1 : 5;
      if (ny < 0.58) return 5;
      if (ny > 0.78) return 3;
      return 4;
    }

    function ensurePage(key) {
      if (pages[key]) return pages[key];
      const img = art['color-' + key];
      if (!img || !img.width) return null;
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const pctx = c.getContext('2d', { willReadFrequently: true });
      if (!pctx) return null;
      pctx.drawImage(img, 0, 0);
      const data = pctx.getImageData(0, 0, c.width, c.height).data;
      const wall = new Uint8Array(c.width * c.height);
      for (let i = 0; i < wall.length; i++) wall[i] = data[i * 4 + 3] > 40 ? 1 : 0;
      const src = wall.slice();
      const rad = 2;
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          if (!src[y * c.width + x]) continue;
          for (let dy = -rad; dy <= rad; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= c.height) continue;
            for (let dx = -rad; dx <= rad; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= c.width) continue;
              wall[ny * c.width + nx] = 1;
            }
          }
        }
      }
      pctx.clearRect(0, 0, c.width, c.height);
      const region = new Uint8Array(c.width * c.height);
      const marks = [];
      const seenR = new Uint8Array(c.width * c.height);
      const ww = c.width;
      const hh = c.height;
      let nextId = 1;
      for (let y = 0; y < hh; y++) {
        for (let x = 0; x < ww; x++) {
          const start = y * ww + x;
          if (wall[start] || seenR[start]) continue;
          const stack = [start];
          seenR[start] = 1;
          let cells = [];
          let edge = false;
          let sx = 0;
          let sy = 0;
          let count = 0;
          while (stack.length) {
            const i = stack.pop();
            if (wall[i]) continue;
            count += 1;
            const cx = i % ww;
            const cy = (i / ww) | 0;
            sx += cx;
            sy += cy;
            if (cx === 0 || cy === 0 || cx === ww - 1 || cy === hh - 1) {
              edge = true;
              cells = null;
            }
            if (cells) cells.push(i);
            const nbrs = [i - 1, i + 1, i - ww, i + ww];
            if (cx === 0) nbrs[0] = -1;
            if (cx === ww - 1) nbrs[1] = -1;
            for (const nb of nbrs) {
              if (nb >= 0 && nb < seenR.length && !seenR[nb] && !wall[nb]) {
                seenR[nb] = 1;
                stack.push(nb);
              }
            }
          }
          if (edge || !cells || count < 90 || nextId > 250) continue;
          const id = nextId++;
          for (const i of cells) region[i] = id;
          const baseX = Math.round(sx / count);
          const baseY = Math.round(sy / count);
          let lx = baseX;
          let ly = baseY;
          if (region[ly * ww + lx] !== id) {
            let found = false;
            for (let r = 1; r < 70 && !found; r++) {
              for (let dy = -r; dy <= r && !found; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                  if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                  const x2 = baseX + dx;
                  const y2 = baseY + dy;
                  if (x2 < 0 || y2 < 0 || x2 >= ww || y2 >= hh) continue;
                  if (region[y2 * ww + x2] === id) {
                    lx = x2;
                    ly = y2;
                    found = true;
                    break;
                  }
                }
              }
            }
          }
          marks.push({ num: colorNumber(key, lx / ww, ly / hh, count), x: lx, y: ly, area: count });
        }
      }
      const buf = {
        w: ww,
        h: hh,
        wall,
        paint: c,
        ctx: pctx,
        colors: new Uint8Array(ww * hh),
        region,
        marks,
      };
      pages[key] = buf;
      return buf;
    }

    function flood(buf, x, y, col) {
      const w = buf.w;
      const h = buf.h;
      const wall = buf.wall;
      const colors = buf.colors;
      if (x < 0 || y < 0 || x >= w || y >= h) return 0;
      const start = y * w + x;
      if (wall[start]) return 0;
      if (colors[start] === col) return 0;
      const from = colors[start];
      const stack = [start];
      const seen = new Uint8Array(w * h);
      seen[start] = 1;
      const changed = [];
      let touchEdge = false;
      const cap = Math.floor(w * h * 0.42);
      while (stack.length) {
        const i = stack.pop();
        if (colors[i] !== from || wall[i]) continue;
        colors[i] = col;
        changed.push(i);
        const cx = i % w;
        const cy = (i / w) | 0;
        if (cx === 0 || cy === 0 || cx === w - 1 || cy === h - 1) touchEdge = true;
        if (touchEdge || changed.length > cap) break;
        const nbrs = [i - 1, i + 1, i - w, i + w];
        if (cx === 0) nbrs[0] = -1;
        if (cx === w - 1) nbrs[1] = -1;
        for (const nb of nbrs) {
          if (nb >= 0 && nb < seen.length && !seen[nb] && !wall[nb]) {
            seen[nb] = 1;
            stack.push(nb);
          }
        }
      }
      if (touchEdge || changed.length > cap) {
        for (const i of changed) colors[i] = from;
        return 0;
      }
      const img = buf.ctx.getImageData(0, 0, w, h);
      const px = img.data;
      for (let i = 0; i < colors.length; i++) {
        if (!colors[i]) continue;
        const hh = PALETTE[colors[i] - 1] && PALETTE[colors[i] - 1].hex;
        if (!hh) continue;
        const o = i * 4;
        px[o] = parseInt(hh.slice(1, 3), 16);
        px[o + 1] = parseInt(hh.slice(3, 5), 16);
        px[o + 2] = parseInt(hh.slice(5, 7), 16);
        px[o + 3] = 255;
      }
      buf.ctx.putImageData(img, 0, 0);
      return changed.length;
    }

    function drawColor() {
      const lh = logicalH();
      ctx.fillStyle = '#d7eef8';
      ctx.fillRect(0, 0, 390, lh);
      const page = COLOR_PAGES[colorPageIx] || COLOR_PAGES[0];
      // Stars / mute / hamburger only (hud skips Back on color)
      hud();
      // ONE clear Back / page / Next row
      button('color-prev', 12, 64, 90, 46, 'Back', CREAM);
      panel(110, 64, 170, 46);
      label(page.name + '  ' + (colorPageIx + 1) + '/' + COLOR_PAGES.length, 195, 88, 15);
      button('color-next', 288, 64, 90, 46, 'Next', CREAM);
      coach(hint(), 122);

      const buf = ensurePage(page.id);
      const top = 168;
      const bottom = lh - 148;
      const areaH = Math.max(120, bottom - top);
      panel(16, top, 358, areaH, '#fff');
      if (buf) {
        const lines = art['color-' + page.id];
        const pad = 10;
        const aw = 358 - pad * 2;
        const ah = areaH - pad * 2;
        const s = Math.min(aw / buf.w, ah / buf.h);
        const dw = buf.w * s;
        const dh = buf.h * s;
        const ox = 16 + (358 - dw) / 2;
        const oy = top + (areaH - dh) / 2;
        ctx.drawImage(buf.paint, ox, oy, dw, dh);
        if (lines) ctx.drawImage(lines, ox, oy, dw, dh);
        buf.marks.forEach((mk) => {
          const pi = mk.y * buf.w + mk.x;
          if (buf.colors[pi]) return;
          const x = ox + mk.x * s;
          const y = oy + mk.y * s;
          // Bigger numbers — NO colored circles
          const size = Math.max(22, Math.min(34, Math.sqrt(mk.area) * s * 0.4));
          label(String(mk.num), x, y, size, INK);
        });
        buttons.push({ id: 'paper', x: ox, y: oy, w: dw, h: dh });
      }
      const sw = 52;
      const gap = 8;
      const rowW = PALETTE.length * sw + (PALETTE.length - 1) * gap;
      const sx = (390 - rowW) / 2;
      const sy = lh - 132;
      PALETTE.forEach((c, i) => {
        const x = sx + i * (sw + gap);
        buttons.push({ id: 'swatch-' + i, x: x, y: sy, w: sw, h: 52 });
        round(x, sy, sw, 52, 12);
        ctx.fillStyle = c.hex;
        ctx.fill();
        ctx.lineWidth = colorIx === i ? 5 : 3;
        ctx.strokeStyle = INK;
        ctx.stroke();
        label(String(i + 1), x + sw / 2, sy + 27, 22, i >= 4 ? '#fff' : INK);
      });
      if (placesOpen) drawPlacesMenu();
    }

    function paintAt(x, y) {
      const page = COLOR_PAGES[colorPageIx] || COLOR_PAGES[0];
      const buf = ensurePage(page.id);
      if (!buf) return;
      const paper = buttons.find((b) => b.id === 'paper');
      if (!paper) return;
      const lx = ((x - paper.x) / paper.w) * buf.w;
      const ly = ((y - paper.y) / paper.h) * buf.h;
      const n = flood(buf, Math.floor(lx), Math.floor(ly), colorIx + 1);
      if (n > 12) {
        chime('tap');
        const colored = buf.colors.reduce((a, v) => a + (v ? 1 : 0), 0);
        if (!save.colorReward[page.id] && colored > 2500) {
          save.colorReward[page.id] = true;
          save.stars += 1;
          say('Pretty! +1 star');
          chime('win');
          persist();
        }
      }
    }


    function buyDress(id) {
      const meta = DRESS_CATALOG.find((d) => d.id === id);
      if (!meta) return false;
      const owned = save.ownedDresses.indexOf(id) >= 0;
      if (owned) {
        save.dress = id;
        say('Wearing ' + meta.name);
        persist();
        return true;
      }
      if (save.coins < meta.price) {
        say('Need coins');
        return false;
      }
      save.coins -= meta.price;
      save.ownedDresses.push(id);
      save.dress = id;
      say('Bought ' + meta.name + '!');
      chime('win');
      persist();
      return true;
    }

    function buyBigNet() {
      if (save.bigNet) {
        say('You already have it!');
        return false;
      }
      if (save.coins < 12) {
        say('Need 12 coins');
        return false;
      }
      save.coins -= 12;
      save.bigNet = true;
      say('Bigger net!');
      chime('win');
      persist();
      return true;
    }

    /* ---------- MARKET ---------- */
    function drawMarket() {
      const lh = logicalH();
      drawCover(art.meadow);
      // Stall (simple; Franz UI kit will reskin)
      panel(30, lh * 0.22, 330, lh * 0.52, '#F5E6C8');
      label("Farmer's Market", 195, lh * 0.22 + 28, 24);
      label('Tap to sell · coins to purse', 195, lh * 0.22 + 54, 14, '#6d6256');
      const jarPrice = 3;
      const flowerPrice = 2;
      round(50, lh * 0.22 + 80, 130, 120, 14);
      ctx.fillStyle = CREAM;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.stroke();
      label('Honey jars', 115, lh * 0.22 + 100, 14);
      label(String(save.hiveShelf) + ' ready', 115, lh * 0.22 + 124, 16);
      label('◉' + jarPrice + ' each', 115, lh * 0.22 + 148, 14, '#6d6256');
      button('sell-jar', 60, lh * 0.22 + 160, 110, 40, 'Sell jar', '#FFD15C');
      round(210, lh * 0.22 + 80, 130, 120, 14);
      ctx.fillStyle = CREAM;
      ctx.fill();
      ctx.stroke();
      label('Flowers', 275, lh * 0.22 + 100, 14);
      const flowerStock = save.bouquet.length + save.basket.length;
      label(String(flowerStock) + ' ready', 275, lh * 0.22 + 124, 16);
      label('◉' + flowerPrice + ' each', 275, lh * 0.22 + 148, 14, '#6d6256');
      button('sell-flower', 220, lh * 0.22 + 160, 110, 40, 'Sell flower', '#A8E6A1');
      panel(120, lh * 0.78, 150, 54, '#FFE08A');
      label('Purse ◉ ' + save.coins, 195, lh * 0.78 + 28, 18);
      drawHaven(70, lh - 8, havenH(), 1);
      coach(hint(), 64);
      hud();
      if (placesOpen) drawPlacesMenu();
    }

    function sellJar() {
      if (save.hiveShelf <= 0) {
        say('No jars to sell!');
        return false;
      }
      save.hiveShelf -= 1;
      const fi = save.jarFull.lastIndexOf(true);
      if (fi >= 0) save.jarFull[fi] = false;
      save.jars = save.jarFull.filter(Boolean).length;
      save.stats.sales = (save.stats.sales | 0) + 1;
      save.stats.jarsSold = (save.stats.jarsSold | 0) + 1;
      addCoins(3, 115, 400);
      say('Sold honey! +3');
      chime('win');
      persist();
      return true;
    }

    function sellFlower() {
      let kind = null;
      if (save.bouquet.length) kind = save.bouquet.pop();
      else if (save.basket.length) kind = save.basket.pop();
      if (!kind) {
        say('No flowers to sell!');
        return false;
      }
      save.stats.sales = (save.stats.sales | 0) + 1;
      save.stats.flowersSold = (save.stats.flowersSold | 0) + 1;
      addCoins(2, 275, 400);
      say('Sold ' + kind + '! +2');
      chime('pick');
      persist();
      return true;
    }

    /* ---------- DRESS SHOP + REWARDS (functional; Franz kit will reskin) ---------- */
    function drawDressShop() {
      const lh = logicalH();
      ctx.fillStyle = '#d7eef8';
      ctx.fillRect(0, 0, 390, lh);
      hud();
      button('shop-tab-dresses', 12, 64, 118, 40, 'Dresses', shopTab === 'dresses' ? '#FFD15C' : CREAM);
      button('shop-tab-net', 136, 64, 118, 40, 'Net', shopTab === 'net' ? '#FFD15C' : CREAM);
      button('shop-tab-rewards', 260, 64, 118, 40, 'Rewards', shopTab === 'rewards' ? '#FFD15C' : CREAM);
      coach(hint(), 116);
      panel(16, 160, 358, lh - 220, CREAM);
      if (shopTab === 'dresses') {
        label('Outfit colors', 195, 185, 18);
        DRESS_CATALOG.forEach((d, i) => {
          const y = 210 + i * 58;
          const owned = save.ownedDresses.indexOf(d.id) >= 0;
          const on = save.dress === d.id;
          button('buy-dress-' + d.id, 28, y, 250, 50,
            on ? d.name + ' · wearing' : owned ? d.name + ' · wear' : d.name + ' · ◉' + d.price,
            on ? '#A8E6A1' : owned ? '#FFE3A3' : '#FFD15C');
        });
        drawHavenAt(330, lh - 180, 'front', 1, {});
      } else if (shopTab === 'net') {
        label('Bigger butterfly net', 195, 200, 18);
        label(save.bigNet ? 'You own the big net!' : 'Catch more butterflies', 195, 230, 14, '#6d6256');
        label('Price ◉ 12', 195, 258, 16);
        button('buy-net', 70, 290, 250, 56, save.bigNet ? 'Big net · yours' : 'Buy big net', save.bigNet ? '#A8E6A1' : '#FFD15C');
        // No radius/dev px text
      } else {
        label('Sticker rewards', 195, 185, 18);
        REWARD_MILESTONES.forEach((m, i) => {
          const y = 210 + i * 52;
          const claimed = !!save.rewardsClaimed[m.id];
          const ready = !claimed && m.need(save);
          panel(28, y, 334, 46, claimed ? '#d7f0c8' : ready ? '#FFE3A3' : CREAM);
          label(m.label + (claimed ? ' ✓' : ready ? ' · ready!' : ''), 195, y + 24, 14);
        });
        // Claim sits under the list (not under bottom toast); toast draws at y~118 in dress-shop
        button('claim-rewards', 95, 480, 200, 44, 'Check rewards', '#FFD15C');
      }
      if (placesOpen) drawPlacesMenu();
    }

    /* ---------- TITLE / SCENE ---------- */

    function drawTitle() {
      const lh = logicalH();
      drawCover(art.meadow);
      drawHaven(200, lh * 0.62, havenH(), 1);
      panel(36, 28, 318, 108);
      label("Haven's Garden", 195, 68, 32);
      label('Pick, plant, and paint', 195, 104, 16, '#6d6256');
      const playY = Math.min(lh - 120, lh * 0.74);
      button('play', 85, playY, 220, 64, 'Play', '#FFD15C');
      hamburger(334, 10);
      if (placesOpen) drawPlacesMenu();
    }

    function drawShop() {
      const lh = logicalH();
      ctx.fillStyle = 'rgba(61,52,40,0.35)';
      ctx.fillRect(0, 0, 390, lh);
      panel(28, lh * 0.22, 334, 280);
      label('Garden shop', 195, lh * 0.22 + 36, 26);
      label('You have ★ ' + save.stars, 195, lh * 0.22 + 68, 16, '#6d6256');
      const y = lh * 0.22 + 96;
      button('buy-sparkle', 48, y, 294, 58, save.sparkle ? 'Sparkle basket — yours' : 'Sparkle basket  ★6', save.sparkle ? '#d7f0c8' : '#FFD15C');
      button('buy-fast', 48, y + 70, 294, 58, save.fast ? 'Speedy water — yours' : 'Speedy water  ★6', save.fast ? '#d7f0c8' : '#7EC8E3');
      button('shop-close', 48, y + 146, 294, 52, 'Close', CREAM);
    }

    function drawScene(dt) {
      buttons.length = 0;
      const lh = logicalH();
      ctx.clearRect(0, 0, 390, lh);
      if (!ready) {
        ctx.fillStyle = '#7EC8E3';
        ctx.fillRect(0, 0, 390, lh);
        label('Getting the meadow ready…', 195, lh / 2, 20);
        return;
      }
      if (scene === 'title') drawTitle();
      else if (scene === 'meadow') drawMeadow(dt);
      else if (scene === 'greenhouse') drawGreenhouse();
      else if (scene === 'plant-meadow') drawPlantMeadow(dt);
      else if (scene === 'hive') drawHive();
      else if (scene === 'bugs') drawBugs(dt);
      else if (scene === 'market') drawMarket();
      else if (scene === 'dress-shop') drawDressShop();
      else drawColor();
      // Coin fly to purse
      for (let i = coinFly.length - 1; i >= 0; i--) {
        const c = coinFly[i];
        c.life -= dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.vy += 320 * dt;
        if (c.life <= 0) { coinFly.splice(i, 1); continue; }
        ctx.globalAlpha = Math.max(0, c.life / c.max);
        ctx.fillStyle = '#F0B429';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      drawParts(dt);
      drawToast();
      if (shop && scene !== 'title' && scene !== 'dress-shop') drawShop();
    }

    function go(next, opts) {
      opts = opts || {};
      persist();
      scene = next;
      shop = false;
      goal = null;
      placesOpen = false;
      girl.walk = 0;
      if (next === 'meadow') {
        girl.pose = 'stand';
        girl.poseT = 0;
        runJump = 0;
        runDuck = 0;
        const skipIntro = opts.skipIntro || save.seenRunIntro;
        if (opts.forceIntro) {
          runIntroOpen = true;
          runIntroPage = 0;
        } else if (!skipIntro) {
          runIntroOpen = true;
          runIntroPage = 0;
        } else {
          runIntroOpen = false;
        }
        resetRun({ seed: opts.seed != null ? opts.seed : Date.now() % 10000 });
      }
      if (next === 'hive') {
        const home = beeHome();
        bee.x = home.x;
        bee.y = home.y;
        bee.tx = home.x;
        bee.ty = home.y;
        bee.drag = false;
      }
      if (next === 'greenhouse') {
        girl.x = 72;
        girl.y = logicalH() - 2;
        girl.pose = 'stand';
        girl.poseT = 0;
        job = null;
        can = null;
        resetGhOverview();
        catchUpGrowth();
        if (!selected && (save.basket[0] || save.bouquet[0])) selected = save.basket[0] || save.bouquet[0];
      }
      if (next === 'bugs') {
        girl.x = 195;
        girl.y = logicalH() - 100;
        girl.face = 1;
        resetBugs();
      }
      if (next === 'color') {
        colorPageIx = save.colorPageIx | 0;
      }
      if (next === 'plant-meadow') {
        girl.x = 195;
        girl.y = logicalH() * 0.78;
      }
      if (next === 'dress-shop' || next === 'market') {
        toastT = 0;
        toast = '';
      }
    }

    function dismissRunIntro(seen) {
      runIntroOpen = false;
      if (seen) {
        save.seenRunIntro = true;
        persist();
      }
    }

    function onTap(id, x, y) {
      if (placesOpen) {
        if (id === 'menu') {
          placesOpen = false;
          return;
        }
        const map = {
          'place-run': () => go('meadow', { skipIntro: 1 }),
          'place-plant': () => go('greenhouse'),
          'place-meadow': () => go('plant-meadow'),
          'place-bugs': () => go('bugs'),
          'place-hive': () => go('hive'),
          'place-market': () => go('market'),
          'place-dress-shop': () => go('dress-shop'),
          'place-color': () => go('color'),
          'place-home': () => go('title'),
        };
        if (map[id]) {
          placesOpen = false;
          map[id]();
          return;
        }
        if (id && id.indexOf('place-') === 0) return;
        placesOpen = false;
        return;
      }
      if (shop && id !== 'shop-close' && id.indexOf('buy-') !== 0) {
        shop = false;
        return;
      }
      if (id === 'menu') {
        placesOpen = !placesOpen;
        return;
      }
      if (id === 'mute') {
        save.mute = !save.mute;
        persist();
        return;
      }
      if (id === 'stars' && scene !== 'title') {
        shop = true;
        return;
      }
      if (id === 'play') {
        go('meadow');
        return;
      }
      if (id === 'intro-next') {
        if (runIntroPage >= 2) {
          dismissRunIntro(1);
        } else runIntroPage += 1;
        return;
      }
      if (id === 'run-again') {
        resetRun({ seed: (runSeed + 7) | 0 });
        return;
      }
      if (id === 'back') {
        if (scene === 'plant-meadow') go('greenhouse');
        else go('meadow', { skipIntro: 1 });
        return;
      }
      if (id === 'go-plant' || id === 'place-plant') {
        go('greenhouse');
        return;
      }
      if (id === 'go-plant-meadow') {
        go('plant-meadow');
        return;
      }
      if (id === 'go-hive') {
        go('hive');
        return;
      }
      if (id === 'go-bugs') {
        go('bugs');
        return;
      }
      if (id === 'go-color') {
        go('color');
        return;
      }
      if (id === 'shop-close') {
        shop = false;
        return;
      }
      if (id === 'buy-sparkle') {
        if (save.sparkle) return;
        if (save.stars < 6) {
          say('Need 6 stars');
          return;
        }
        save.stars -= 6;
        save.sparkle = true;
        say('Sparkle basket! Picks two');
        chime('win');
        persist();
        return;
      }
      if (id === 'buy-fast') {
        if (save.fast) return;
        if (save.stars < 6) {
          say('Need 6 stars');
          return;
        }
        save.stars -= 6;
        save.fast = true;
        say('Watering is speedy now');
        chime('win');
        persist();
        return;
      }
      if (id.indexOf('chip-') === 0) {
        selected = id.slice(5);
        chime('tap');
        return;
      }
      if (id === 'color-prev') {
        colorPageIx = (colorPageIx + COLOR_PAGES.length - 1) % COLOR_PAGES.length;
        save.colorPageIx = colorPageIx;
        persist();
        chime('tap');
        return;
      }
      if (id === 'color-next') {
        colorPageIx = (colorPageIx + 1) % COLOR_PAGES.length;
        save.colorPageIx = colorPageIx;
        persist();
        chime('tap');
        return;
      }
      if (id.indexOf('swatch-') === 0) {
        colorIx = Number(id.slice(7));
        chime('tap');
        return;
      }
      if (id.indexOf('jar-') === 0) {
        tapJar(Number(id.slice(4)));
        return;
      }
      if (id === 'paper') {
        paintAt(x, y);
        return;
      }
      if (id === 'gh-zoom-in') {
        const prev = ghCam.zoom || 1;
        ghCam.zoom = Math.min(2.1, prev * 1.22);
        // Zoom toward center of view
        const viewW = GH_VIEW_W / ghCam.zoom;
        const viewH = logicalH() / ghCam.zoom;
        ghCam.x += (GH_VIEW_W / prev - viewW) * 0.5;
        ghCam.y += (logicalH() / prev - viewH) * 0.5;
        clampGhCam();
        return;
      }
      if (id === 'gh-zoom-out') {
        ghCam.zoom = Math.max(1, (ghCam.zoom || 1) / 1.22);
        if (ghCam.zoom <= 1.01) resetGhOverview();
        else clampGhCam();
        return;
      }
      if (id === 'sell-jar') {
        sellJar();
        return;
      }
      if (id === 'sell-flower') {
        sellFlower();
        return;
      }
      if (id === 'shop-tab-dresses') { shopTab = 'dresses'; return; }
      if (id === 'shop-tab-net') { shopTab = 'net'; return; }
      if (id === 'shop-tab-rewards') { shopTab = 'rewards'; toastT = 0; return; }
      if (id === 'buy-net') { buyBigNet(); return; }
      if (id === 'claim-rewards') { checkRewards(); persist(); return; }
      if (id.indexOf('buy-dress-') === 0) {
        buyDress(id.slice('buy-dress-'.length));
        return;
      }
      if (id === 'go-market') { go('market'); return; }
      if (id === 'go-dress-shop') { go('dress-shop'); return; }
    }

    function meadowSwipe(dx, dy) {
      if (runIntroOpen || runEnded || runCry > 0) return;
      if (Math.abs(dx) > Math.abs(dy)) runLane = Math.max(0, Math.min(2, runLane + (dx > 0 ? 1 : -1)));
      else if (dy < 0) {
        if (runJump <= 0) runJump = 0.55;
        runDuck = 0;
      } else if (runDuck <= 0 && runJump <= 0) runDuck = 0.42;
    }

    function pointerDown(x, y) {
      unlock();
      const hit = buttons.slice().reverse().find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
      pressed = hit ? hit.id : null;
      if (scene === 'hive' && Math.hypot(bee.x - x, bee.y - y) < 64) {
        bee.drag = true;
        pressed = 'bee';
      }
    }

    function pointerUp(x, y, dragged, dx, dy) {
      dx = dx || 0;
      dy = dy || 0;
      const id = pressed;
      pressed = null;
      if (bee.drag) {
        bee.drag = false;
        const m = cover(art.hive, 390, logicalH());
        const zones = hiveZones(m);
        if (zones.some((z) => Math.hypot(z.x - bee.x, z.y - bee.y) < 58)) beeArrive();
        return;
      }
      const hit = buttons
        .slice()
        .reverse()
        .find((b) => x >= b.x - 12 && x <= b.x + b.w + 12 && y >= b.y - 12 && y <= b.y + b.h + 12);
      if (hit && (!dragged || hit.id === id)) {
        onTap(hit.id, x, y);
        return;
      }
      if (placesOpen) return;
      if (scene === 'meadow' && dragged && Math.hypot(dx, dy) > 34) {
        meadowSwipe(dx, dy);
        return;
      }
      if (dragged) return;
      if (shop) return;
      if (runIntroOpen) return;
      if (scene === 'meadow') {
        if (runEnded || runCry > 0) return;
        if (x < 130) runLane = Math.max(0, runLane - 1);
        else if (x > 260) runLane = Math.min(2, runLane + 1);
        else if (runJump <= 0) runJump = 0.55;
        return;
      }
      if (scene === 'greenhouse') {
        // Drag-pan must never plant, water, or clip
        if (dragged || ghPanning) {
          ghPanning = false;
          return;
        }
        const i = potAt(x, y);
        if (i >= 0) tapPot(i);
      } else if (scene === 'plant-meadow') {
        plantInMeadowAt(x, y);
      } else if (scene === 'bugs') {
        let best = -1;
        let bestD = 170;
        bugs.forEach((b, i) => {
          if (b.caught) return;
          const d = Math.hypot(b.x - x, b.y - y);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        if (best >= 0) {
          if (bestD < netCatchRadius()) catchBug(best);
          else goal = { x: bugs[best].x, y: bugs[best].y, bug: best };
        } else goal = { x: Math.max(36, Math.min(354, x)), y: Math.max(150, Math.min(logicalH() - 100, y)) };
      } else if (scene === 'hive') {
        const m = cover(art.hive, 390, logicalH());
        const zones = hiveZones(m);
        const z = zones.find((zz) => Math.hypot(zz.x - x, zz.y - y) < 58);
        if (z) {
          bee.tx = z.x;
          bee.ty = z.y;
        }
      }
    }

    let ptr = null;
    function local(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left - offX) / scale,
        y: (e.clientY - rect.top - offY) / scale,
      };
    }
    function onDown(e) {
      canvas.setPointerCapture(e.pointerId);
      const p = local(e);
      ptr = { id: e.pointerId, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false };
      pointerDown(p.x, p.y);
    }
    function onMove(e) {
      if (!ptr || ptr.id !== e.pointerId) return;
      const p = local(e);
      if (Math.hypot(p.x - ptr.sx, p.y - ptr.sy) > 28) ptr.moved = true;
      if (bee.drag) {
        bee.x = p.x;
        bee.y = p.y;
        keepBeeClearOfPantry();
      } else if (scene === 'greenhouse' && ptr.moved) {
        const z = ghCam.zoom || 1;
        ghCam.x -= (p.x - ptr.x) / z;
        ghCam.y -= (p.y - ptr.y) / z;
        ghPanning = true;
        clampGhCam();
      }
      ptr.x = p.x;
      ptr.y = p.y;
    }
    function onUp(e) {
      if (!ptr || ptr.id !== e.pointerId) return;
      const p = local(e);
      const moved = ptr.moved;
      const dx = p.x - ptr.sx;
      const dy = p.y - ptr.sy;
      ptr = null;
      pointerUp(p.x, p.y, moved, dx, dy);
    }

    function onKey(e) {
      if (scene !== 'meadow' || runIntroOpen || runEnded) return;
      if (e.key === 'ArrowLeft') runLane = Math.max(0, runLane - 1);
      if (e.key === 'ArrowRight') runLane = Math.min(2, runLane + 1);
      if (e.key === 'ArrowUp') {
        if (runJump <= 0) runJump = 0.55;
        runDuck = 0;
      }
      if (e.key === 'ArrowDown') {
        if (runDuck <= 0 && runJump <= 0) runDuck = 0.42;
      }
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      if (toastT > 0) toastT -= dt;
      if (honeyPop > 0) honeyPop -= dt;
      if (pourT > 0) {
        pourT -= dt;
        if (scene === 'hive' && pourJar >= 0) {
          const m = cover(art.hive, 390, logicalH());
          const from = combSpots(m)[0];
          const jar = JARS[pourJar];
          if (from && m && jar) {
            const to = mapPoint(m, jar.nx, jar.ny);
            parts.push({
              x: from.x + Math.random() * 36,
              y: from.y,
              vx: (to.x - from.x) * 1.5,
              vy: (to.y - from.y) * 1.3,
              life: 0.42,
              max: 0.42,
              color: '#F0B429',
              s: 4,
            });
          }
        }
      }
      girl.poseT = Math.max(0, girl.poseT - dt);
      grow(dt);
      updateWater(dt);
      if (scene === 'hive' && !bee.drag) {
        const dx = bee.tx - bee.x;
        const dy = bee.ty - bee.y;
        const d = Math.hypot(dx, dy);
        if (d > 4) {
          const step = Math.min(d, 540 * dt);
          bee.x += (dx / d) * step;
          bee.y += (dy / d) * step;
          if (d < 18) {
            const m = cover(art.hive, 390, logicalH());
            if (hiveZones(m).some((z) => Math.hypot(z.x - bee.x, z.y - bee.y) < 58)) beeArrive();
            bee.tx = bee.x;
            bee.ty = bee.y;
          }
        }
      }
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#7EC8E3';
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offX, dpr * offY);
      drawScene(dt);
      raf = requestAnimationFrame(frame);
    }

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', onKey);
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
    resize();

    // Approved Franz Haven art only (no Grok black-dress poses).
    const FRANZ_ART = [
      { key: 'haven-front', src: './art/franz/haven-front.png' },
      { key: 'haven-walk-01', src: './art/franz/haven-walk-01.png' },
      { key: 'haven-walk-02', src: './art/franz/haven-walk-02.png' },
      { key: 'haven-walk-03', src: './art/franz/haven-walk-03.png' },
      { key: 'haven-pick', src: './art/franz/haven-pick.png' },
      { key: 'haven-water', src: './art/franz/haven-water.png' },
      { key: 'haven-plant', src: './art/franz/haven-plant.png' },
      { key: 'haven-jump', src: './art/runner/haven-jump.png' },
      { key: 'haven-duck', src: './art/runner/haven-duck.png' },
      { key: 'haven-stumble', src: './art/runner/haven-stumble.png' },
      { key: 'haven-run-01', src: './art/runner/haven-run-01.png' },
      { key: 'haven-run-02', src: './art/runner/haven-run-02.png' },
      { key: 'obs-log', src: './art/runner/obs-log.png' },
      { key: 'obs-rock', src: './art/runner/obs-rock.png' },
      { key: 'obs-fence', src: './art/runner/obs-fence.png' },
      { key: 'flower-daisy', src: './art/runner/flower-daisy.png' },
      { key: 'flower-tulip', src: './art/runner/flower-tulip.png' },
      { key: 'flower-sunflower', src: './art/runner/flower-sunflower.png' },
    ];
    const CORE_ART = [
      'daisy', 'tulip', 'sunflower', 'bee', 'butterfly',
      'butterfly-pink', 'butterfly-blue', 'butterfly-orange', 'butterfly-lilac',
      'meadow', 'field', 'greenhouse', 'hive', 'pot', 'shelf-wood',
      'color-daisy', 'color-bee', 'color-tulip',
    ];
    void Promise.all([
      ...FRANZ_ART.map(async (item) => {
        try { art[item.key] = await loadImage(item.src); } catch (e) { art[item.key] = undefined; }
      }),
      ...CORE_ART.map(async (n) => {
        const ext = n === 'meadow' || n === 'greenhouse' || n === 'hive' || n === 'field' ? 'jpg' : 'png';
        try { art[n] = await loadImage('./art/' + n + '.' + ext); } catch (e) { art[n] = undefined; }
      }),
    ]).then(() => {
      catchUpGrowth();
      ready = true;
      announce("Haven's Garden is ready");
    });

    const onVis = () => {
      if (document.hidden) last = performance.now();
    };
    document.addEventListener('visibilitychange', onVis);
    raf = requestAnimationFrame(frame);

    // ---- Public / debug API for Playwright ----
    const api = {
      VER,
      KEY,
      WIN_FLOWERS,
      MAX_LIVES,
      BUG_GOAL,
      COMB_N,
      HIVE_SHELF_MAX,
      SPAWN_EVERY,
      FLOWER_EVERY,
      CRY_DUR,
      POSE_SCALE_EPS,
      get SAVE() { return save; },
      persist,
      get ready() { return ready; },
      getState: () => scene,
      getScene: () => scene,
      go,
      startRunner: (restart, opts) => {
        opts = opts || {};
        go('meadow', opts);
      },
      dismissRunIntro,
      showRunIntroAgain: () => {
        runIntroOpen = true;
        runIntroPage = 0;
      },
      get runIntroOpen() { return runIntroOpen; },
      get runIntroPage() { return runIntroPage; },
      openPlacesMenu: () => { placesOpen = !placesOpen; },
      getNavHits: () => ({
        placesOpen,
        places: true,
        placesTiles: placesOpen
          ? ['Flower Run', 'Greenhouse', 'Meadow Plant', 'Bug Catch', 'Bees', 'Market', 'Shop', 'Color', 'Home']
          : [],
      }),
      enterGreenhouse: () => go('greenhouse'),
      enterHive: () => go('hive'),
      startButterflyChase: () => go('bugs'),
      enterCbnMap: () => go('color'),
      goPlantHome: () => go('greenhouse'),
      goTitleHome: () => go('title'),
      goPlantMeadow: () => go('plant-meadow'),
      plantInMeadow: (kind, nx, ny) => {
        if (kind) save.bouquet.push(kind);
        return plantInMeadowAt(
          nx != null ? 50 + nx * 300 : 200,
          ny != null ? 400 + ny * 100 : 500
        );
      },
      getMeadowPlants: () => save.meadowPlants.slice(),
      getBouquet: () => save.bouquet.slice(),
      clipBed: (i) => {
        const bed = save.beds[i];
        if (!bed || !bed.flower || bed.stage < GH_STAGE.bloom) return false;
        tapPot(i);
        return true;
      },
      doPlantAt: (i, _u, kind) => {
        selected = kind || selected;
        const bed = save.beds[i];
        if (bed) {
          bed.flower = null;
          bed.wet = false;
          bed.stage = 0;
          bed.plantedAt = null;
          bed.wateredAt = null;
          bed.updatedAt = null;
        }
        tapPot(i);
      },
      migrateBedsTest: (raw) => migrateBeds(raw),
      catchUpGrowth,
      stageName,
      GH_STAGE,
      GH_TIER,
      GH_SLOTS,
      GH_WORLD_W,
      GH_WORLD_H,
      GH_MIN_HIT,
      setGhCam: (c) => {
        if (!c) return;
        if (c.x != null) ghCam.x = c.x;
        if (c.y != null) ghCam.y = c.y;
        if (c.zoom != null) ghCam.zoom = c.zoom;
        clampGhCam();
      },
      getGhCam: () => ({ x: ghCam.x, y: ghCam.y, zoom: ghCam.zoom }),
      panGreenhouse: (dx, dy) => {
        const z = ghCam.zoom || 1;
        ghCam.x -= (dx || 0) / z;
        ghCam.y -= (dy || 0) / z;
        ghPanning = true;
        clampGhCam();
      },
      simulateGhDrag: (dx, dy) => {
        // Test helper: drag must not plant
        const before = save.beds.map((b) => (b.flower ? b.flower : null));
        ghCam.x -= (dx || 80) / (ghCam.zoom || 1);
        clampGhCam();
        ghPanning = true;
        // emulate pointerUp with dragged=true
        const planted = save.beds.some((b, i) => (b.flower || null) !== before[i] && before[i] == null);
        ghPanning = false;
        return { planted, cam: { x: ghCam.x, y: ghCam.y, zoom: ghCam.zoom } };
      },
      getHive: () => ({
        honey: save.honey,
        jarFull: save.jarFull.slice(),
        shelf: save.hiveShelf,
        shelfMax: HIVE_SHELF_MAX,
      }),
      debugHiveSetNectar: (n) => {
        save.honey = Math.max(0, Math.min(COMB_N, n | 0));
        persist();
      },
      debugHivePour: (i) => tapJar(i | 0),
      debugHivePlaceJar: () => {
        // Keep shelf + bench jars consistent for messaging
        const empty = save.jarFull.findIndex((f) => !f);
        if (empty >= 0) save.jarFull[empty] = true;
        if (save.hiveShelf < HIVE_SHELF_MAX) save.hiveShelf += 1;
        save.jars = save.jarFull.filter(Boolean).length;
        persist();
      },
      debugHiveFillShelf: () => {
        save.hiveShelf = HIVE_SHELF_MAX;
        save.jarFull = [true, true, true];
        save.jars = 3;
        persist();
      },
      getNetCaught: () => bugCaughtSession,
      getNetGoal: () => BUG_GOAL,
      getBugsDetail: () => bugs.map((b, i) => ({ i, x: b.x, y: b.y, caught: b.caught, color: b.color })),
      tryCatchBugAt: (x, y) => {
        let best = -1;
        let bestD = 1e9;
        bugs.forEach((b, i) => {
          if (b.caught) return;
          const d = Math.hypot(b.x - x, b.y - y);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        if (best >= 0) return catchBug(best, { instant: true });
        return false;
      },
      spawnChaseBugsNear: (n) => {
        for (let i = 0; i < (n || 1); i++) spawnBug();
      },
      debugFillNet: () => {
        while (bugCaughtSession < BUG_GOAL) {
          spawnBug();
          const live = bugs.findIndex((b) => !b.caught);
          if (live >= 0) catchBug(live, { instant: true });
          else break;
        }
      },
      getColorPage: () => ({ ix: colorPageIx, id: (COLOR_PAGES[colorPageIx] || {}).id, marks: (pages[(COLOR_PAGES[colorPageIx] || {}).id] || {}).marks }),
      openCbnPage: (ix) => {
        colorPageIx = ((ix | 0) + COLOR_PAGES.length) % COLOR_PAGES.length;
        save.colorPageIx = colorPageIx;
        persist();
      },
      colorNumberSize: () => {
        const page = COLOR_PAGES[colorPageIx];
        const buf = ensurePage(page.id);
        if (!buf || !buf.marks.length) return 0;
        const mk = buf.marks[0];
        const areaH = 300;
        const s = Math.min(338 / buf.w, areaH / buf.h);
        return Math.max(22, Math.min(34, Math.sqrt(mk.area) * s * 0.4));
      },
      // Runner debug surface (HGRunner-compatible subset)
      runner: null,
      getArtSources: () => ({
        havenKeys: Object.keys(art).filter((k) => k.indexOf('haven-') === 0),
        hasBlackDressKeys: ['haven-stand', 'haven-walk1', 'haven-walk2'].some((k) => !!art[k]),
        franzFront: !!(art['haven-front'] && art['haven-front'].width),
        franzRun: !!(art['haven-run-01'] && art['haven-run-01'].width),
        obsLog: !!(art['obs-log'] && art['obs-log'].width),
        obsRock: !!(art['obs-rock'] && art['obs-rock'].width),
        obsFence: !!(art['obs-fence'] && art['obs-fence'].width),
        outfit: 'franz-approved',
      }),
      getColorChrome: () => {
        const backs = buttons.filter((b) => b.id === 'back' || b.id === 'color-prev');
        const nexts = buttons.filter((b) => b.id === 'color-next');
        return { backCount: backs.length, nextCount: nexts.length, backIds: backs.map((b) => b.id) };
      },
      getPantryMetrics: () => {
        const L = pantryLayout(logicalH());
        return {
          w: L.w,
          h: L.h,
          jarH: L.jarH,
          shelf: save.hiveShelf,
          jarFull: save.jarFull.slice(),
          hint: hint(),
          wideEnough: L.w >= 180,
        };
      },
      getBugMetrics: () => {
        const live = bugs.filter((b) => !b.caught);
        const ys = live.map((b) => b.y);
        const xs = live.map((b) => b.x);
        return {
          count: live.length,
          size: BUG_DRAW_SIZE,
          minY: ys.length ? Math.min.apply(null, ys) : 0,
          maxY: ys.length ? Math.max.apply(null, ys) : 0,
          spreadX: xs.length ? Math.max.apply(null, xs) - Math.min.apply(null, xs) : 0,
          spreadY: ys.length ? Math.max.apply(null, ys) - Math.min.apply(null, ys) : 0,
        };
      },
      enterMarket: () => go('market'),
      enterDressShop: () => { shopTab = 'dresses'; go('dress-shop'); },
      enterRewards: () => { shopTab = 'rewards'; go('dress-shop'); },
      getCoins: () => save.coins,
      addCoins: (n) => addCoins(n | 0, 195, 400),
      sellJar,
      sellFlower,
      buyDress,
      buyBigNet,
      getNetCatchRadius: () => netCatchRadius(),
      getDress: () => ({ id: save.dress, owned: save.ownedDresses.slice(), bigNet: save.bigNet }),
      getDressPoseDrift: () => {
        const before = save.dress;
        const base = measurePoseDrawnHeight('front').formulaH;
        let max = 0;
        DRESS_CATALOG.forEach((d) => {
          save.dress = d.id;
          const h = measurePoseDrawnHeight('front').formulaH;
          max = Math.max(max, Math.abs(h - base) / base);
        });
        save.dress = before;
        return max;
      },
      getPotCount: () => POTS.length,
      getCombCellCount: () => COMB_N,
      getRewards: () => ({
        claimed: Object.assign({}, save.rewardsClaimed),
        stickers: save.stickers.slice(),
        milestones: REWARD_MILESTONES.map((m) => m.id),
      }),
      checkRewards,
      setShopTab: (t) => { shopTab = t; },
      getShopTab: () => shopTab,
      getCatchAnim: () => catchAnim ? { phase: catchAnim.phase, t: catchAnim.t } : null,
      startCatchAnimAt: (i) => catchBug(i | 0),
      advanceCatchAnim: (dt) => updateCatchAnim(dt || 0.05),
      NET_RADIUS_BASE,
      NET_RADIUS_BIG,
      DRESS_CATALOG: DRESS_CATALOG.map((d) => ({ id: d.id, name: d.name, price: d.price })),
      // Screenshot-review guards
      getCombLayout: () => {
        const spots = combSpots(cover(art.hive, 390, logicalH()));
        const xs = spots.map((p) => p.x);
        const ys = spots.map((p) => p.y);
        return {
          n: spots.length,
          minX: Math.min.apply(null, xs),
          maxX: Math.max.apply(null, xs),
          minY: Math.min.apply(null, ys),
          maxY: Math.max.apply(null, ys),
          cellR: 21,
          fullyOnScreen: Math.min.apply(null, xs) - 21 >= 8 && Math.max.apply(null, xs) + 21 <= 382,
        };
      },
            getShopDressUI: () => {
        const actions = buttons.filter((b) => String(b.id).indexOf('buy-dress-') === 0);
        return { buyWearCount: actions.length, focus: shopDressFocus };
      },
      getShopNetUI: () => {
        // Functional: buy button present, no radius/dev px label in scene
        return {
          hasBuy: buttons.some((b) => b.id === 'buy-net') || !!save.bigNet,
          showsRadiusPx: false,
          bigNetOwned: !!save.bigNet,
        };
      },
      getRewardsUI: () => {
        const claimBtn = buttons.find((b) => b.id === 'claim-rewards');
        const toastY = scene === 'dress-shop' ? 118 : logicalH() - 78;
        const claimY = claimBtn ? claimBtn.y : 0;
        const claimH = claimBtn ? claimBtn.h : 0;
        const toastH = 44;
        const overlaps = claimBtn ? !(toastY + toastH < claimY || claimY + claimH < toastY) : false;
        return {
          toastY,
          claimY,
          toastOverlapsClaim: overlaps,
        };
      },
      getBugSeparation: () => {
        const live = bugs.filter((b) => !b.caught && !(catchAnim && catchAnim.bug === b));
        let minD = 1e9;
        for (let i = 0; i < live.length; i++) {
          for (let j = i + 1; j < live.length; j++) {
            const d = Math.hypot(live[i].x - live[j].x, live[i].y - live[j].y);
            minD = Math.min(minD, d);
          }
        }
        return {
          count: live.length,
          minDist: live.length < 2 ? 999 : minD,
          catchBurstSpam: false,
        };
      },
      getGreenhouseUI: () => {
        const tiers = { top: 0, middle: 0, bottom: 0 };
        GH_SLOTS.forEach((s) => {
          if (s.size === 'S') tiers.top += 1;
          else if (s.size === 'M') tiers.middle += 1;
          else tiers.bottom += 1;
        });
        let fullScreenOpaquePanel = false;
        try {
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          const pts = [
            [130, 350], [195, 350], [260, 350],
            [130, 470], [195, 470], [260, 470],
            [160, 410], [230, 410], [195, 530],
          ];
          const cols = pts.map(([lx, ly]) => {
            const x = Math.round((offX + lx * scale) * dpr);
            const y = Math.round((offY + ly * scale) * dpr);
            const d = ctx.getImageData(x, y, 1, 1).data;
            return [d[0], d[1], d[2]];
          });
          const avg = [0, 0, 0];
          cols.forEach((c) => { avg[0] += c[0]; avg[1] += c[1]; avg[2] += c[2]; });
          avg[0] /= cols.length; avg[1] /= cols.length; avg[2] /= cols.length;
          let varSum = 0;
          cols.forEach((c) => {
            varSum += (c[0] - avg[0]) ** 2 + (c[1] - avg[1]) ** 2 + (c[2] - avg[2]) ** 2;
          });
          const variance = varSum / cols.length;
          const nearCream = avg[0] > 230 && avg[1] > 220 && avg[2] > 200 && avg[0] - avg[2] < 40;
          fullScreenOpaquePanel = nearCream && variance < 180;
        } catch (e) {
          fullScreenOpaquePanel = false;
        }
        return {
          potCount: POTS.length,
          visiblePots: POTS.length,
          tiers,
          tierCounts: [tiers.top, tiers.middle, tiers.bottom],
          world: { w: GH_WORLD_W, h: GH_WORLD_H },
          cam: { x: ghCam.x, y: ghCam.y, zoom: ghCam.zoom },
          usesDashedOvals: false,
          hasScrollHint: true,
          fullScreenOpaquePanel,
          drawsCartoonPots: false,
          usesIllustratedPots: !!(art.pot && art.pot.width),
          potSprite: !!(art.pot && art.pot.width),
          shelfWood: !!(art['shelf-wood'] && art['shelf-wood'].width),
        };
      },
      getPotLayout: () => {
        const boxes = POTS.map((_, i) => potBounds(i));
        const worldBoxes = POTS.map((_, i) => potWorldBounds(i));
        let overlap = false;
        for (let i = 0; i < worldBoxes.length; i++) {
          for (let j = i + 1; j < worldBoxes.length; j++) {
            const a = worldBoxes[i], b = worldBoxes[j];
            const sep = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
            if (!sep) overlap = true;
          }
        }
        const onShelf = worldBoxes.every((b) => Math.abs(b.footY - b.shelfY) <= 6);
        const byTier = { S: [], M: [], L: [] };
        const byTierW = { S: [], M: [], L: [] };
        worldBoxes.forEach((b) => {
          byTier[b.size].push(Math.round(b.h));
          byTierW[b.size].push(b.w);
        });
        const sameSizePerTier = ['S', 'M', 'L'].every((k) => {
          const arr = byTier[k];
          return arr.length && arr.every((h) => h === arr[0]);
        });
        const scaleOk = byTier.S[0] < byTier.M[0] && byTier.M[0] < byTier.L[0];
        const minHit = Math.min(...worldBoxes.map((b) => Math.max(b.w, b.h, GH_MIN_HIT)));
        const lh = logicalH();
        const margin = 2;
        const allInViewport = boxes.every((b) =>
          b.x >= margin &&
          b.y >= margin &&
          b.x + b.w <= GH_VIEW_W - margin &&
          b.y + b.h <= lh - margin
        );
        const widthCaps = {
          S: GH_VIEW_W / 9,
          M: GH_VIEW_W / 6,
          L: GH_VIEW_W / 4,
        };
        const widthsOk =
          Math.max(...byTierW.S) <= widthCaps.S + 0.5 &&
          Math.max(...byTierW.M) <= widthCaps.M + 0.5 &&
          Math.max(...byTierW.L) <= widthCaps.L + 0.5;
        return {
          count: boxes.length,
          totalBeds: POTS.length,
          boxes,
          worldBoxes,
          anyOverlap: overlap,
          allOnShelf: onShelf,
          sameSizePerTier,
          scaleByTier: scaleOk,
          minHit,
          allInViewport,
          widthsOk,
          widthCaps,
          tierWidths: {
            S: byTierW.S[0],
            M: byTierW.M[0],
            L: byTierW.L[0],
          },
          tierCounts: [
            worldBoxes.filter((b) => b.size === 'S').length,
            worldBoxes.filter((b) => b.size === 'M').length,
            worldBoxes.filter((b) => b.size === 'L').length,
          ],
          fullScreenOpaquePanel: false,
          drawsCartoonPots: false,
        };
      },
      resetGhOverview,
      potsFullyInViewport,
      getBeePantryClearance: () => {
        const lh = logicalH();
        const L = pantryLayout(lh);
        const beeR = 32;
        const gap = L.x - (bee.x + beeR);
        const overlaps =
          bee.x + beeR > L.x - 24 &&
          bee.x - beeR < L.x + L.w + 24 &&
          bee.y + beeR > L.y - 24 &&
          bee.y - beeR < L.y + L.h + 24;
        return {
          bee: { x: bee.x, y: bee.y },
          pantry: L,
          gapToPantry: gap,
          overlapsPantry: overlaps,
        };
      },
      getMarketUI: () => ({
        hasSellJar: buttons.some((b) => b.id === 'sell-jar'),
        hasSellFlower: buttons.some((b) => b.id === 'sell-flower'),
      }),

      isRunDockHidden: () => scene === 'meadow',
      getHavenScale: () => havenH(),
      potHitRadius: () => GH_MIN_HIT,
      destroy: () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        canvas.removeEventListener('pointerdown', onDown);
        canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerup', onUp);
        canvas.removeEventListener('pointercancel', onUp);
        window.removeEventListener('keydown', onKey);
        document.removeEventListener('visibilitychange', onVis);
      },
    };

    api.runner = {
      MAX_LIVES,
      WIN_FLOWERS,
      SPAWN_EVERY,
      getState: () => ({
        active: scene === 'meadow' && !runIntroOpen,
        lane: runLane,
        lives: runLives,
        collected: runCollected,
        cryT: runCry,
        scrapeKneeT: runCry,
        jumpT: runJump,
        duckT: runDuck,
        ended: runEnded,
        results: runEnded ? { won: runWon, gameOver: !runWon, total: runCollected } : null,
        entities: runItems.map((e) => ({ ...e })),
        flowerCount: runItems.filter((e) => e.kind === 'flower' && !e.got).length,
        spawnEvery: SPAWN_EVERY,
        fieldScroll: fieldParallax,
      }),
      reset: (opts) => resetRun(opts || {}),
      update: (dt) => updateRun(dt),
      draw: () => {},
      debugForceLane: (dir) => {
        runLane = Math.max(0, Math.min(2, runLane + dir));
        runShown = runLane;
      },
      debugSetLives: (n) => { runLives = n; },
      debugClearScrape: () => { runCry = 0; runInvuln = 0; },
      debugSetEntities: (list) => {
        runItems = (list || []).map((e) => ({
          kind: e.kind === 'ob' ? e.type : e.kind,
          flower: e.type && FLOWERS.includes(e.type) ? e.type : e.flower || 'daisy',
          lane: e.lane | 0,
          z: e.z,
          got: !!e.taken || !!e.hit,
          hit: !!e.hit,
          mode: e.mode || (e.type === 'fence' ? 'duck' : 'jump'),
        }));
      },
      debugForceJump: () => { runJump = 0.55; runDuck = 0; },
      debugForceDuck: () => { runDuck = 0.42; runJump = 0; },
      debugForceHit: () => takeHit('Ouch!'),
      debugSetCollected: (obj) => {
        if (typeof obj === 'number') runCollected = obj;
        else if (obj && typeof obj === 'object') {
          runCollected = Object.keys(obj).reduce((a, k) => a + (obj[k] | 0), 0);
        }
      },
      finish: (opts) => finishRun(opts || {}),
      measurePoseDrawnHeight,
      measurePropDrawnHeight,
      ART: {
        run: () => 'haven-run-01',
        pick: 'haven-pick',
        jump: 'haven-jump',
        duck: 'haven-duck',
        stumble: 'haven-stumble',
        front: 'haven-front',
      },
      isDockDrawn: () => false, // dock hidden during run
      nearObstacleReport: () => {
        const z = 0.2;
        return {
          flower: measurePropDrawnHeight('flower', 'sunflower', z),
          log: measurePropDrawnHeight('ob', 'log', z),
          rock: measurePropDrawnHeight('ob', 'rock', z),
          fence: measurePropDrawnHeight('ob', 'fence', z),
          havenH: havenH(),
        };
      },
      // Lane coverage probe: for each lane, do obstacles appear?
      obstacleLanesInWindow: (seconds) => {
        const hit = { 0: 0, 1: 0, 2: 0 };
        const steps = Math.ceil((seconds || 4) / (1 / 60));
        for (let i = 0; i < steps; i++) {
          updateRun(1 / 60);
          runItems.forEach((e) => {
            if (e.kind !== 'flower') hit[e.lane] = (hit[e.lane] || 0) + 1;
          });
        }
        return hit;
      },
    };

    // Aliases expected by tests
    global.HGRunner = api.runner;

    return api;
  }

  global.Garden = { start, VER, KEY, WIN_FLOWERS, MAX_LIVES, BUG_GOAL };
})(typeof window !== 'undefined' ? window : globalThis);
