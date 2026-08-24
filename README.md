# Piratenzug — Foundation

PC-first, grid-based pirate RPG (Pokémon-style overworld + turn-based combat, per the master design doc). This is the **first deliverable**: the core architecture requested explicitly - PC input handling, grid movement with input buffering, the Crew/Item data model, and the scene-transition + village-state systems - proven end to end on two small demo scenes. No final art yet (colored-rectangle placeholders throughout, by design), no combat/shop UI yet.

## Running it

```bash
npm install
npm run dev
```

## Controls

| Action | Key |
|---|---|
| Move | WASD or arrow keys |
| Interact (NPCs, doors, mini-boss) | E or Enter |
| Menu (binding only - no UI yet) | Esc |

## What's implemented

- **`src/systems/InputManager.js`** — every keyboard binding lives here (movement, interact, menu). Blur-safe (a key held during an alt-tab won't get stuck down).
- **`src/systems/GridMovement.js`** — `GridMovementController`, a reusable tile-by-tile mover. Binary walkability via callback, strictly 4-directional, and **input buffering**: a direction pressed in the last 40% of the current tile's glide is captured and chained immediately into the next tile on completion, so holding a key produces smooth continuous movement with no stutter between tiles.
- **`src/systems/GameState.js`** — the single global state object that survives scene loads (crew, gold, inventory, village `isSafe` flags, boss-defeated flags, ship upgrade levels). Plain data, no Phaser dependency, importable/testable on its own.
- **`src/systems/SceneTransition.js`** — tunnel-object transitions: freeze input → fade to black → swap scene → fade in → unlock input, plus spawn-point handoff via `GameState.pendingSpawn`.
- **`src/systems/TileGrid.js`** — builds a walkable/tunnel grid from a small ASCII layout + legend (placeholder for real Tiled map data later - same `{ isWalkable(x,y), tunnels }` contract either way).
- **`src/systems/PlaceholderRenderer.js`** — the *only* place that draws a visual: colored square + name-tag `Text`, per the "no final art yet" instruction. Swapping in real sprites later touches this one file.
- **`src/data/Crew.js`** — the 9 recruitable crew members and `Obj_Player_Captain`, exactly as specified, plus `createCrewInstance()` for runtime (mutable) copies.
- **`src/data/Items.js`** — potions, clinic permanent-upgrade items, weapons, with `applyPermanentItemEffect()` for the clinic/blacksmith flow.
- **`src/scenes/DemoWorldScene.js` + `DemoVillageScene.js`** — a small hand-built map proving every system above works together: walk around, hit a wall, walk into a tunnel (fades to the village), fight-by-proxy a mini-boss placeholder with `[E]` (flips the village's `isSafe` flag, which swaps the enemy placeholder for an NPC + a Blacksmith marker), walk back through the return tunnel.

Verified via a real Playwright run (see task history) with **zero console/page errors**: continuous buffered movement, wall collision, both tunnel directions, and the `isSafe` toggle all work correctly.

## Explicitly NOT built yet (next steps, per the master doc)

- Real tilemaps/pixel art (sections stay on placeholders until an artist pass)
- The 3 large islands' full section chains + arena boss fights
- The 12 endgame islands + `enemy_stats_multiplier = 2.0` gate
- `Obj_Player_Ship` overworld + `Upgrade_Hull` / `Upgrade_Sails` / `Upgrade_Cannons`
- Blacksmith/Apotheke UI (data model exists in `Items.js`, no screen yet)
- Turn-based `CombatScene` (initiative, 4 skills, item/switch/flee, the damage formula) - `DemoVillageScene`'s mini-boss interaction has a clearly marked `TODO(combat)` hook where this plugs in
- Skills data dictionary (crew currently reference skill ID strings like `Skill_Tackle` with no resolved definitions yet)
