# Backcountry Climb — concept + mocks

**Mocks only.** No playable build. Does not wire the hub, QR, release, Boulder Dodge, or Terrain Park.

| | |
|---|---|
| Brief | [`CONCEPT.md`](./CONCEPT.md) — TP/BD lessons as BC hard requirements (§0) |
| Mocks | [`index.html`](./index.html) — six 390×844 portrait frames + one 844×390 landscape |
| Scale | Standing human = 10% playfield height; sled / pines / boulders / kickers derived from that ruler |
| Rider | Neat placeholder silhouette (final character is separate) |
| Art | Sled / boulder / snow / ramp polish → `arcade/art-kit/` (shared) |

## Preview

After push, open the commit-pinned raw.githack URL for `index.html` (see PR description).

Query helpers:
- `?shot=title|run|rail|kicker|upgrade|summit|landscape` — single frame
- default — gallery of all seven

## Scope guard

Do **not** promote into `arcade/release/`, `arcade/play/`, or touch BD/TP sources from this folder.
