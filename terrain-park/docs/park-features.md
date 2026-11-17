# Terrain Park Features & Trick Families

Research for `arcade/terrain-park-next` (v0.5.1-next). Lists real freestyle-park features and trick names used to drive course packing and score labels. In-game labels stay generic (no resort trademarks).

## Sources

| Source | URL | Used for |
|---|---|---|
| Snowplayground — Snowparks Basics | https://www.snowplayground.net/school | Kickers (tabletop, step-up/down, roller, corner/hip, drop); jibs (rails/tubes, boxes, wallrides, bonks) |
| World Snowboard Federation glossary | https://www.worldsnowboardfederation.org/glossary/ | Tabletop, step-up, hip/corner, spine, quarterpipe; rail shapes; spins; cork/rodeo; rail tricks |
| NZSIA Snowboard Interactive Manual — Terrain Park Riding | https://learning.nzsia.org/snowboard-interactive-manual/section-b/terrain-environment/terrain-park-riding/ | S/M/L sizing; box/rail plan & side profiles (flat, rainbow, flat-down-flat, kinked, C) |
| NZSIA Tricktionary | https://learning.nzsia.org/snowboard-interactive-manual/section-f/glossary-appendix/tricktionary/ | Grabs, presses, 50-50 / boardslide / lipslide, ollie / nollie, wildcat / tamedog |
| Shred Test — snowboarding terms | https://www.shredtest.com/resources/snowboarding-terms | Tabletop / hip / rail / box / wallride / 50-50 / boardslide |
| Snow-Online — Terrain Park Dictionary | https://www.snow-online.com/skimag/terrain-park-dictionary-the-most-important-elements-for-freestylers.htm | Rails vs boxes vs tubes (mailboxes) |
| Trickonomicon — Grabs | https://trickonomicon.com/grabs | Indy, melon, mute, nose/tail, stalefish, method |
| Resort layout notes (Breck / Keystone / Mammoth / Copper) | See `docs/terrain-park-layouts/PARK-LAYOUT-RESEARCH.md` | Progression pods, jump packs, rail gardens |

---

## 1. Park features (snow + jib)

### Jump / snow features

| Feature | What it is | In-game key |
|---|---|---|
| **Kicker (S / M / L)** | Takeoff ramp → air → landing. Size bands by lip height / table length (NZSIA S≈2–3 m table, then M/L). | `kicker` (+ size scale by level) |
| **Tabletop** | Takeoff and landing linked by a flat deck/knuckle you can clear or ride. | `flat` / `kicker` + `variant: "table"` |
| **Step-up** | Landing higher than the takeoff lip. | `kicker` + `variant: "stepup"` |
| **Step-down** | Landing lower than the takeoff (extra drop). | `kicker` / `flat` + `variant: "step"` |
| **Hip / corner** | Landing angled ~90° to the takeoff. | `hip` |
| **Spine** | Two quarterpipe faces back-to-back. | `spine` |
| **Roller** | Smooth undulation / soft launch matching flight path. | `hit` / `roller` |
| **Wallride** | Steep almost-vertical wall you ride up/along. | `wallride` |
| **Quarterpipe** | Single transition + vert for one big air. | `quarter` |

### Jib features

| Feature | What it is | In-game key |
|---|---|---|
| **Flat rail** | Straight metal bar, constant height. | `rail` + `shape: "flat"` |
| **Down rail** | Descending pitch. | `rail` + `shape: "down"` |
| **Kinked rail** | Angle change mid-feature (A-frame / elbow). | `rail` + `shape: "kinked"` |
| **Rainbow rail** | Arched up-then-down. | `rail` + `shape: "rainbow"` |
| **C-rail** | Plan-view curve. | `rail` + `shape: "c"` |
| **Flat-down-flat (FDF)** | Flat → down → flat profile. | `rail` + `shape: "fdf"` |
| **Tube** | Larger-diameter round pipe. | `tube` |
| **Box** | Wide flat plastic/metal deck (beginner-friendly jib). | `box` |
| **Butter pad / jib** | Low ride-on pad for presses / butters. | `butter` |
| **Log** | Wood slide / ride-on. | `log` |
| **Gap-to-rail** | Air gap into a rail (transfer on). | Scripted `kicker`/`hit` → short gap → `rail` |
| **Rail-to-rail transfer** | Exit one rail / box into another with little or no flat. | Dense `rail`/`tube`/`box` pairs in `LINE_SEQ` |

---

## 2. Trick names by family

### Air spins (frontside / backside)

180 · 360 · 540 · 720 · 900 · 1080 — prefix **Frontside** or **Backside** (WSF / NZSIA).  
**In game (Ted):** air taps add 180° yaw up to 1080 on big air; hold = backflip axis; both combinable. Small kickers cap at one flip + 360 yaw.

### Grabs

| Name | Definition (NZSIA / Trickonomicon) |
|---|---|
| **Indy** | Trailing hand, toe edge between bindings |
| **Melon** | Leading hand, heel edge between bindings |
| **Mute** (Weddle) | Leading hand, toe edge between bindings |
| **Stalefish** | Trailing hand, heel edge behind rear leg |
| **Method** | Leading-hand heel grab with knees tucked, board pulled up |
| **Tail** | Trailing hand grabs the tail |
| **Nose** | Leading hand grabs the nose |

**In game:** swipe aims grab; brief hold near apex arms Indy before full flip hold.

### Inverts / off-axis

| Name | Notes |
|---|---|
| **Backflip** (wildcat) | Invert toward the tail |
| **Frontflip** (tamedog) | Invert toward the nose |
| **Rodeo** | Flip + rotation (often backside flip with spin) |
| **Cork** | Off-axis rotation; not fully inverted |

**In game:** hold backflip is the invert axis; named flips combine with yaw/grab on land.

### Rail / box

| Name | Notes |
|---|---|
| **50-50** | Board parallel to feature |
| **Boardslide** | Board perpendicular; nose passes over to enter |
| **Lipslide** | Tail passes over to enter |
| **Nose press / Tail press** | Weight on nose or tail |
| **270-on / 270-off** | 270° onto / off the feature |
| **Frontside / Backside** swap | Side label from approach / spin dir |
| **Transfer** | Exit one feature onto another |

**In game:** on a rail, tap cycles 50-50 → boardslide → lipslide → nose/tail press; approach swipe/tap sets 270-on; tap near the end / pop scores 270-off.

### Ground

| Name | Notes |
|---|---|
| **Ollie** | Pop off the tail |
| **Nollie** | Pop off the nose |
| **Butter** | Press / carve with board flexed on snow or a pad |

---

## 3. Course design rules (this build)

1. **Trick after trick** — short run-ins; rail→rail transfers, box→kicker, tabletop packs, step-down, hip, jib garden.
2. **Variety** — never the same feature kind 3× in a row.
3. **Progression** — early lines: rollers + boxes + flat rails; mid: kickers + kinked/down rails; late: hips, step-downs, transfers, tubes, wallride / quarter.
4. **Combo** — chaining features without long flat-snow gaps multiplies named trick popups.

Landing windows (`SPIN_LAND_WIN_DEG = 52`), Woman3 cutout rider (`602080d`), and world-fixed pines stay locked.
