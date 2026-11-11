# Backcountry Climb — concept brief (mocks only)

**Status:** CONCEPT + MOCKS ONLY. No playable build. No merge intent yet.  
**Folder:** `arcade/backcountry-climb-concept/`  
**Do not touch:** `arcade/release/`, arcade hub / `arcade/play/`, QR codes, Boulder Dodge, Terrain Park.

**Pitch:** An electric snowmobile climbs **UP** the mountain. Boulders, logs, and debris tumble **DOWN** toward you. Uphill kickers launch you over incoming hazards; park rails/boxes become climb features you hop onto with a **nose-lift**. Steady locked side-scroll — no camera tilt, rotation, or swing (motion-sickness safe). Pattern inspiration: Hill Climb Racing physics feel + Geometry Dash fairness/readability. **No copied IP.**

**Rider art:** The redesigned snowboarder character is developed separately. All mocks use a **small neat placeholder silhouette** (dark opaque cutout, no face detail) sized to the sled — never covering HUD, signs, or labels. Final rider lands from a separate redesign.

**Shared art kit:** Visual overhaul of the sled, rider, boulders, ramps, and snow lives in `arcade/art-kit/` — not in this concept folder. These mocks keep layout/lesson fidelity; art quality lands via the kit.

**Sources inventoried:**
- Terrain Park — `arcade/terrain-park/` (+ next work on PR #139 where present)
- Boulder Dodge — `arcade/boulder-dodge/` on `main` (v0.8.5-trees)

---

## 0. Lessons from Terrain Park & Boulder Dodge → BC hard requirements

Every lesson below is a **ship requirement** for Backcountry Climb (not a nice-to-have). Mocks must demonstrate them where applicable.

### Camera & motion (Ted gets motion sick)

| Requirement | Spec |
|---|---|
| **Steady side-scroll** | World scrolls under a locked camera. `CAM_ROT = 0` always. |
| **No rotation / tilt / swing** | Never rotate the canvas or horizon to “match” the sled. |
| **Y movement capped** | Follow Y uses a deadzone + low rate (`CAM_Y_DEAD`, `CAM_Y_RATE`); rollers must not yank the frame. |
| **No crash screen-shake** | Wipe / impact = freeze + life flash only. `shake = 0` always (respect `prefers-reduced-motion` too). |
| **Forward-only** | Run speed ≥ 0. The world **never appears to back up** (no reverse scroll, no rewind camera). |
| **Portrait + landscape** | Both orientations keep the **sled centered** on the play line; the slope **never loses its axis** (same fall-line grade, mirrored uphill). |

### Snow, wind, scenery

| Requirement | Spec |
|---|---|
| **Snow falls from the sky** | Vertical flake fall. **No horizontal streak lines** (those read as motion-blur / sickness). |
| **Rail snow ribbon** | Snow accumulates on rails as a **continuous white ribbon**; sled **scrapes** it (visible scrape wake + sound later). |
| **Wind = blowing snow** | Gusts shown as drifted flakes / ground spindrift — **never a “WIND” text label**. |
| **Soft upright trees** | Soft Alps pines, upright; they **pass behind ramps / kickers / rails** (z-order). |
| **No decorative rope or flag lines** | No park rope corridors, bunting, or meaningless flag strings. Functional markers only: **best-run**, **checkpoint radio**, **summit gate**. |
| **Varied rolling terrain** | Slope is a rolling profile (sine + shelves). **Never a flat straight line.** |

### Scoring & fairness (Geometry Dash benchmark, not IP)

| Requirement | Spec |
|---|---|
| **No useless collectibles** | **No stars** / coin trails / candy pickups. |
| **Score from real actions only** | Tricks, rail distance, clean boulder clears, close calls (+ height meters as progression currency). |
| **Telegraphed hazards** | Every boulder readable ≥ `TELEGRAPH_S` with roll, dust, optional warn. Teach-then-test segments on early climbs. |
| **Run progress %** | HUD shows percent of climb completed. |
| **Best-run marker** | Persistent PB height / distance ghost on the face. |
| **Instant restart** | One-tap / auto-retry at checkpoint; no long death camera. |
| **Per-level music** | Distinct track bed per themed climb (mock: music chip in HUD / title). |
| **Distinct themed levels** | 8 climbs with unique look (see §5). |
| **NPCs stay out of landing zones** | Traffic / patrol never spawn in the clear arc past a kicker lip. |

### UI & engine safety

| Requirement | Spec |
|---|---|
| **Popups clamped** | Score / warn popups sit **below the HUD**, on-screen, and **never cover the rider**. |
| **Large readable HUD** | Big title, meters, lives — no overlapping hit targets. |
| **No pill-hell** | Two solid thumb buttons + chrome only. Secondary buttons are **opaque** (trees must not show through). |
| **Engine safety** | `requestAnimationFrame` tick in `try/catch`; wrapped `localStorage`; **no service worker**; standalone single-file tip. |

---

## 1. Feature map

Every notable system from Terrain Park (TP) and Boulder Dodge (BD) maps to a Backcountry Climb (BC) uphill snowmobile version.

### From Terrain Park → Backcountry Climb

| Terrain Park | Backcountry Climb |
|---|---|
| Rails (down / flat-down / A-frame kink) | **Climb rails** — steel pipes you jump *up onto* and grind while climbing; snow ribbon + scrape; kinked / down-to-up variants face the climb |
| Boxes (short ride-on) | **Climb boxes** — short wooden decks with a snow lip-on; nose-lift hop or small kicker onto |
| Log slides | **Fallen climb logs** — timber ride-ons; also appear as tumbling debris when loose |
| Kickers (table / step-down) | **Uphill kickers** — face uphill like Hill Climb Racing; launch over incoming boulders; clearable with correct speed; trees draw **behind** the ramp |
| Hits / flat tops | **Shelf hits / climb tabletops** — short uphill decks for hop timing and landing practice |
| Named park tricks (grabs, spins, rail styles) | **Sled tricks** — wheelie, nac-nac, superman, heel clicker, can-can, cliffhanger, whip + rail rides; scored with landing grades |
| Landing grades (clean / sloppy / bail) | Same grades on sled landings and rail exits; absorption tied to **suspension** upgrade |
| Grind / pop / lip board stats | **Track / motor / skis / suspension** upgrade axes (see §6) |
| Groms / skiers as traffic | **Climb traffic** — ascending groms on sleds/boards and descending ski patrol; wipe on body hit; **never in landing zones** |
| Wind + falling snow | Soft Alps weather; **falling snow (vertical)** + **blowing snow** for gusts (no WIND label) |
| Soft Alps pines | Same upright Soft Alps trees, composition reads **uphill** (summit ahead, valley behind) |
| Steady cam, forward-only | **Locked** — see §0. Play line ~60–62% down the phone so the hill ahead stays visible |
| Star pickups / star score | **Removed** — BC scores tricks / rail / clears / close calls only |
| 10 story lines + Endless | **8 themed climbs + Summit Rush endless** (see §5) |
| 5 lives + heart pickups late | Same **5 lives**; charge packs double as late-run life gifts (not decorative stars) |
| Easy / Normal / Hard | Same diff mul on pitch, hazard density, reaction windows |
| Teach intros L1–4 | **Garage lesson climbs** — oversized rail, gentle kicker, slow boulder telegraph |
| Finish gate | **Summit flag / ridge gate** with payoff banner (functional, not decorative bunting) |
| Combo chain | Combo from consecutive clearances + tricks → brief motor surge |
| Service worker cache | **BC: no service worker** — standalone single file |

### From Boulder Dodge → Backcountry Climb

| Boulder Dodge | Backcountry Climb |
|---|---|
| Static boulder S/M/L/XL | **Rolling boulders** that tumble **downhill toward the rider**; solid shaded rock; size ladder kept; XL gold outline + label |
| Logs / long logs | **Tumbling logs** + fixed climb logs; telegraph roll spin |
| Ice spikes | **Ice fangs** on steep pitches — hop or rail over |
| Snowmobile NPC hazard | Becomes **player vehicle**; NPC “patrol sled” may still pass as descending traffic (not in landing zones) |
| Snowcat rideable deck | **Snowcat shelf** — rare wide deck to hop onto mid-climb |
| Ski patrol / groms / wildlife | Patrol + groms kept; wildlife (coyote/bear/moose) as rare **ridge events** |
| 5 lives, auto-retry | Same — **instant restart** at checkpoint |
| Board SPD ladder / locker | **Sled garage** — large sled filling the lift; track, suspension, motor, skis hotspots + battery charge theme |
| Chapters + conditions + events | Themed climbs; conditions (clear / powder / fog / dusk / gust) + events kept |
| Near-miss scoring | **Close call** when a boulder passes under an airborne sled |
| Kickers / tabletops / lips (non-lethal) | Become the **climb launch kit** (see TP map) |
| Distance score | **Height gained** + tricks + clears + rail distance + close calls |
| Soft Alps trees / B2 mountains | Reused art language; mountains stacked so summit is ahead/up |
| No mid-run checkpoints (BD) | **BC adds checkpoints** (radio poles / lodge shelves) — respawn height, not full restart |
| Storm / fog overlays | Kept; powder drag also slows track traction on steep pitches |
| Screen shake on wipe | **Forbidden** in BC (motion sickness) |

### BC-native (not in TP/BD)

| Feature | Role |
|---|---|
| **Nose-lift / wheelie / pre-load** | Primary hop control — lift front ski to clear low debris or mount rails without a ramp |
| **Throttle / coast / forward lean** | Two-thumb phone loop (see §2) |
| **Battery / charge** | Run resource (electric sled — no gas theme); drains with throttle + steep pitch; recharges at checkpoints / coasting regen light |
| **Best-height ghost marker** | Persistent PB height flag on the face |
| **Mirrored uphill slope** | Terrain Y rises with travel X; camera locked level; rolling profile |
| **Summit payoff** | Clear the ridge → vista, charge refill flash, unlock next climb |
| **Portrait + landscape** | Same centered sled / slope axis in both orientations |

---

## 2. Controls (one–two thumbs, phone)

Portrait + landscape. Left thumb = lean / nose-lift. Right thumb = throttle. Two **solid opaque** buttons — no translucent chrome that lets scenery show through.

| Input | Ground | Air / Rail |
|---|---|---|
| **Hold THROTTLE** (right) | Drive uphill; drain charge | Hold wheelie / extend air attitude |
| **Release throttle** | **Coast** — regen trickle; keep momentum | Settle attitude toward landing |
| **Hold NOSE-LIFT** (left) | Lean back → front ski up (wheelie / pre-load); hop onto rails & over low debris | Lean back for cliffhanger / whip setup |
| **Tap NOSE-LIFT** | Short hop / preload pop (no ramp needed if speed OK) | Grab / trick commit flash |
| **Forward lean** (swipe down on left, or release nose-lift + slight forward zone) | Plant skis, dig track, recover from wheelie | Nose-down for steep landing match |
| **PAUSE / MUTE** | Chrome only | — |

**Fairness bar (Geometry Dash pattern, not IP):** every boulder is telegraphed ≥ `TELEGRAPH_S` seconds with roll, dust, and optional warn triangle; kickers are readable silhouettes; nose-lift hop windows are consistent per obstacle height class; early climbs teach then test.

---

## 3. Physics model (tunable top-level constants)

Single constants block at the top of a future tip file. Values are **starting guesses** for Hill Climb–like weight/traction feel — tune in playtests, do not ship as dogma.

```js
const PHYS = {
  // World / camera (motion-sickness lock)
  CAM_ROT: 0,              // ALWAYS 0 — no tilt/swing
  CAM_X_RATE: 2.2,         // follow rider
  CAM_Y_DEAD: 22,          // deadzone so rollers don't yank
  CAM_Y_RATE: 2.4,         // capped Y follow
  CAM_Y_MAX: 48,           // hard cap on camera Y offset per frame cluster
  SHAKE: 0,                // ALWAYS 0 — no crash screen-shake
  FORWARD_ONLY: true,      // spd >= 0; world never reverses
  UP_GRADE: 0.16,          // mirrored fall-line (TP FALL_GRADE flipped)
  PLAY_LINE: 0.62,         // fraction of short axis — sled centered here

  // Body
  MASS: 1.0,               // sled+rider normalized
  G: 3600,                 // gravity (match BD/TP family)
  DT: 1 / 120,

  // Drive
  THROTTLE_ACC: 980,       // uphill accel at full throttle on flat-ish
  COAST_DRAG: 420,         // passive slow when throttle released
  TRACK_MU: 1.0,           // base traction (× track upgrade)
  STEEP_LOSS: 0.55,        // accel mul on pitch >= STEEP_PITCH
  STEEP_PITCH: 0.38,       // rad-ish grade where motor fights weight
  POWDER_DRAG: 0.72,       // mul when condition=powder / deep snow zones
  MAX_SPD: 420,            // world units / s cap before upgrades

  // Nose-lift / hop
  NOSE_LIFT_RATE: 4.2,     // rad/s toward wheelie
  NOSE_MAX: 0.85,          // max lean-back angle
  HOP_IMPULSE: 520,        // short hop without ramp (needs speed)
  HOP_MIN_SPD: 110,        // below this, hop is a bunny — won't clear box
  PRELOAD_WIN: 0.18,       // s of loaded suspension before tap hop bonus

  // Jump / air
  JV: -880,                // kicker launch (slightly softer than BD -950)
  AIR_CTRL: 0.55,          // attitude authority in air
  LAND_ABSORB: 1.0,        // × suspension upgrade; softens vy on touchdown
  BAIL_VY: 980,            // hard landing threshold before absorb

  // Hazards
  BOULDER_ROLL: 160,       // base downhill speed toward rider
  BOULDER_SPIN: 3.2,       // visual tumble rad/s
  TELEGRAPH_S: 1.35,       // min readable warn before impact window
  REACT: 0.30,             // player reaction budget (BD family)
  CLEAR_MUL: 1.15,         // jump clear distance vs boulder size must fit

  // Charge (electric)
  CHARGE_MAX: 100,
  CHARGE_DRAIN: 6.5,       // /s at full throttle
  CHARGE_STEEP: 1.45,      // drain mul on steep
  CHARGE_REGEN: 2.2,       // /s while coasting
  CHARGE_CKPT: 28,         // checkpoint refill

  // Lives / feel
  LIVES_MAX: 5,
  LIFE_PAUSE: 1.25,        // brief; then instant restart
  COMBO_NEED: 3,
  COMBO_BOOST: 1.12,

  // Snow / wind presentation
  FLAKE_CAP: 64,
  SNOW_FALL: true,         // vertical fall only — no streak lines
  WIND_AS_SNOW: true,      // gust = blowing snow, never a WIND label
};
```

**Benchmark checklist (feel, not copy):**
- Steep pitches visibly sap speed unless motor upgraded (Hill Climb weight fight).
- Deep powder zones scrub momentum (readable surface change).
- Kickers clear the matching boulder class at posted approach speed — never pixel-perfect unfair.
- Nose-lift onto a box works from flat snow at `HOP_MIN_SPD`+; fails honestly when crawling.
- Landings: suspension upgrade converts sketchy into good; no random bail.
- Camera stays locked; wipe never shakes the frame.

---

## 4. Trick list (sled-appropriate, scored like TP)

| Trick | How | Base pts | Notes |
|---|---|---|---|
| **Wheelie** | Hold nose-lift on snow ≥0.6s | 18 /s after arm | Ground score seed |
| **Nac-nac** | Air: one leg off running board | 36 | Tap left in air |
| **Superman** | Air: body extended off sled | 48 | Hold nose-lift mid-air |
| **Heel clicker** | Air: heels tap over seat | 42 | Double-tap nose-lift |
| **Can-can** | Air: both legs to one side | 40 | Swipe left/right |
| **Cliffhanger** | Air: hang off back of sled | 55 | Max nose-lift + hold |
| **Whip** | Air: sled yaws then returns | 60 | Release→regrab timing |
| **Rail 50-50** | Both skis on climb rail | 62 /s × style | Default rail |
| **Nose press** | Front ski weighted on rail/box | 1.15× | Nose-lift while grinding |
| **Boardslide (sled)** | Sled sideways on box | 1.25× | Swipe on grind |
| **Lip boost** | Clear kicker lip | 35–49 | Feature class |

**Landing grades:** CLEAN ×1.0 · SLOPPY ×0.55 · BAIL (combo reset). Grab/trick multipliers stack like TP (`×1.35` when held through landing window).

**Score sources (only):** tricks · rail distance · clean boulder clears · close calls · height meters (currency). **No stars.**

---

## 5. Level list — 8 themed climbs (+ endless)

Different look + music bed per climb (Geometry Dash pattern: readable theme shift, not copied IP).

| # | Climb | Look | Music bed (mock) | Teach / focus |
|---|---|---|---|---|
| 1 | **Base Lodge** | Warm dusk lodge lights, gentle grade | soft lodge pulse | Throttle, coast, first boulder telegraph |
| 2 | **Corduroy Climb** | Groomed lilac corduroy, Soft Alps pines | mid tempo climb | Nose-lift hop over logs |
| 3 | **Rail Ridge** | Steel park leftovers on the face | metallic grind bed | Climb rails + boxes + scrape |
| 4 | **Powder Throat** | Deep blue powder, high drag | muffled low drone | Charge management + motor fight |
| 5 | **Kicker Spine** | Stacked uphill kickers | punchy launch hits | Launch over rolling M/L boulders |
| 6 | **Ice Needle** | Hardpack + ice fangs, cold fog | sparse crystalline | Precise hops, suspension landings |
| 7 | **Storm Switchback** | Blowing snow gusts (no WIND label) | heavy weather bed | Wind air + event packs |
| 8 | **Summit Gate** | Golden ridge light, vista payoff | wide payoff theme | Full kit — tricks + XL boulder |
| ∞ | **Summit Rush** | Rotating themes | rotating beds | Endless height PB |

**Checkpoints:** radio poles every ~1/3 climb height. **Best-run marker:** ghost at PB meters. **Progress %** on HUD. **Summit payoff:** banner + charge flash + unlock toast. **Instant restart** after wipe.

---

## 6. Progression

| System | Detail |
|---|---|
| **Lives** | 5♥; wipe −1; instant auto-retry at last checkpoint; 0 = garage |
| **Battery** | Charge bar; empty = coast-only limp (not instant death) |
| **Garage upgrades** | Scene garage: **large sled filling the lift** with tappable hotspots — **Track**, **Suspension**, **Motor**, **Skis** — level pips beside the part |
| **Currency** | Height meters + action score banked as **Charge Cells** (no star bank) |
| **Unlocks** | Sequential climbs; Summit Rush after #8; cosmetic sled skins later (out of concept scope) |
| **Difficulty** | Easy / Normal / Hard (pitch, density, telegraph, drain) |
| **Save** | Wrapped `localStorage` `backcountryClimb.*` (future tip) |

---

## 7. Size budget & engine safety

| Target | Cap |
|---|---|
| Concept mocks (this folder) | Soft — keep lean; canvas-only, no image assets |
| Future tip build | **&lt; 350KB** raw single-file HTML |
| Gzip aim | &lt; 110KB gzip |

**Engine safety (hard):**
- `requestAnimationFrame` game loop body in `try/catch`
- All `localStorage` get/set wrapped
- **No service worker**
- Standalone single file (no hub wiring for tip)

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Motion sickness if cam drifts | Hard lock `CAM_ROT=0`; capped Y; forward-only; **no shake**; vertical snow only |
| Uphill read is novel vs BD/TP downhill | Oversize telegraph, kicker silhouettes, teach climbs 1–3 |
| Nose-lift feels mushy or mandatory-ramp | Tunable hop impulse + clear “lift then tap” coach marks in mocks/lessons |
| Feature overload (TP park + BD hazards) | Gate systems by climb theme; not every climb has every toy |
| Electric theme reads as “low stakes” | Steep drain + limp-coast failure mode still costs a life on boulder hit |
| Rider art mismatch | Small neat placeholder silhouette until redesigned character lands |
| Size creep past 350KB | Bound particles (`FLAKE_CAP≤64`), shared Soft Alps draw, no PNG packs |
| Unfair boulder timing | Spawn only if `fits(clearPx)` like BD; min `TELEGRAPH_S` |
| Star / collectible creep from TP | Explicit ban — score real actions only |

---

## 9. Deliverables in this folder

| File | Purpose |
|---|---|
| `CONCEPT.md` | This brief |
| `index.html` | Canvas phone mocks — six **473×1024** portrait frames + one **1024×473** landscape; title, mid-run, rail hop, kicker, garage, summit |
| `README.md` | Preview pointer + scope guard |

**Out of scope:** playable physics, hub link, QR, release freeze, final rider art.
