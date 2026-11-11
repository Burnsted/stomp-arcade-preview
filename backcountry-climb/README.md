# Backcountry Climb — concept + playable tip

Playable climb tip + art mocks. Does **not** wire the hub, QR, release, Boulder Dodge, or Terrain Park.

| | |
|---|---|
| Brief | [`CONCEPT.md`](./CONCEPT.md) — TP/BD lessons as BC hard requirements (§0) |
| Play | [`play.html`](./play.html) — Corduroy Climb · Look7 sled · jumps / air tricks / boulders |
| Mocks | [`index.html`](./index.html)`?gallery=1` — seven concept frames |
| Scale | Standing human = 10% playfield height; CAM_ROT = 0 |
| Art | Look7 sled · bg-styles Storm / Alpenglow · sparse scenery |

## Preview

- Default `index.html` → redirects to **play.html**
- Art gallery: `index.html?gallery=1`
- Single mock: `index.html?shot=title|run|rail|kicker|upgrade|summit|landscape`

### Play query helpers

- `?autoTest=1` — batch: clear level 1 with jumps + tricks; writes `window.__BC_TEST`
- `?shot=controls|air|land` — freeze frame for artifacts
- `?bg=storm|alpenglow` — force backdrop

### Controls (Ted)

Dual translucent thumb pads, raised above the home-indicator / bottom edge via `env(safe-area-inset-*)`. Usable in portrait **390×844** and landscape **844×390**. Left = nose-lift / air tricks · Right = throttle.

### Fun loop

Natural kickers / wind lips on the uphill route, real airtime, scored tricks (heel-clicker, no-hander, Superman, barrel roll, hold-backflip) with combo multipliers, bad-rotation crash, rollers + descending boulders for rhythm.

## Scope guard

Do **not** promote into `arcade/release/`, `arcade/play/`, or touch BD/TP sources from this folder.
