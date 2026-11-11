# Franz 3D art — BC cropped atlases + resort backdrop styles

## Source zips
| Zip | SHA-256 |
|-----|---------|
| `STOMP-arcade-3d-art-v1.zip` | `400e36a0efa04619fe4f09e94ad5fcbbb4314b94f0c9d12b4b6dfda7d602d51d` |
| `STOMP-arcade-3d-art-v1-lite-b.zip` | `e3b10c9aa395f0520c5847daad6a8263e634c47698ec9caadb74712a02e5ca43` (superseded for BG) |
| `STOMP-bg-styles-v1b.zip` | `6fc0643cd423a1ae2c49c9aa74ee9c87026a2373df400b47aa5960c6d2a1f612` |

See `SOURCE.sha256`. Lite-b `bg-lite/` tiles are **removed** — resort styles replace them.

## Shipped assets

| File | Role |
|------|------|
| `rider-atlas@2x.webp` + `.json` | Cropped to **`ride`, `air`** only |
| `world-atlas@2x.webp` + `.json` | coyote, bear, moose, patrol, skier, kicker, rail, pine_tall, pine_small, boulder, sled |
| `bg-styles/bg-storm.webp` | Foggy powder forest (780×520, opaque, tileable L/R) — primary, eager-loaded |
| `bg-styles/bg-alpenglow.webp` | Sunset bowl + summit lodge (780×520) — lazy-loaded; alternates by run |

Bluebird / night from the zip are not shipped (BC uses storm + alpenglow only).

Backdrops are the slow far parallax layer: **bottom-anchored**, scaled to cover playfield height (no distortion), tiled horizontally. Live flake overlay stays on top. At most **1–2** full-detail atlas pines per screen.

**Scale:** 2× DPR atlases. On-screen = `(atlas_px ÷ 2) × ART_SCALE` with ride = 0.10× playfield height. Bottom-aligned. Vector fallback if art fails (`?failArt=1`). Override backdrop with `?bg=storm` or `?bg=alpenglow`.
