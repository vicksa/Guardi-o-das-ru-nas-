# Guardião das Ruínas

Read .agents/skills/art-direction/SKILL.md before visual changes. Read .agents/skills/visual-review/SKILL.md to review final screenshots. Keep UI in Brazilian Portuguese. Camera frames remain local. Never claim physical camera validation from synthetic or photo fixtures. Run unit tests, build and browser checks for gameplay changes. Preserve the webcam across death/retry, clear input on blur/loss, and keep movement plus jumping independent. Do not spawn agents unless the user asks.

For Three.js work, consult the imported .agents/skills/threejs-* skills and docs/3D-SKILLS.md. They target r186 while the game is pinned to r180 by package-lock.json: verify API support before copying examples, do not introduce unsupported APIs. Keep asset attribution and license records. Validate GLB assets, preserve skinned animations, and inspect renderer.info with full-frame counts when changing graphics.
