Terrain Park kicker snow v1 — GAME FILES ONLY (Ted approved).
SHA-256 of source zip STOMP-tp-kicker-snow-v1.zip:
afdda4a449ddf50bedba114594ebe6846a598e1bb719faae72d772f6b573d6c1

Files:
- kicker@2x.webp (preferred), kicker@2x.png fallback
- kicker.json — frame kicker at 424×135, scale 2x

Seating (follow exactly — this is what made the old one a prop):
1. This sprite IS the visible jump. Seat its bottom on the BASE slope (snowY), slightly buried (~6–10 CSS px).
2. Do not seat it on featured terrain (gY). Do not also draw the old white wedge, and do not also draw a second snow mound under it (skip drawTerrFeature mound fill/highlight for this feature; lip spray is fine).
3. Keep existing featH physics. Height at 2x is still 135, so amp stays 67.5. Do not auto-scale amp from the new width (424 vs old 215) — the extra width is the approach and landing.
4. Facing right, no flip. Terrain Park only — leave the Backcountry Climb world-atlas kicker alone. Do not change rider art.

Do not commit studio shots, master PNG, or any files outside these game files.
