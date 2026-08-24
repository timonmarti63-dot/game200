import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Halberdier from '../entities/Halberdier.js';
import Goose from '../entities/Goose.js';
import Boss from '../entities/Boss.js';
import EliteKnight from '../entities/EliteKnight.js';
import MineGoblin from '../entities/MineGoblin.js';
import Sapper from '../entities/Sapper.js';
import DukeGrendal from '../entities/DukeGrendal.js';
import { spawnPickup, spawnChest, spawnProjectile, resolveProjectileHitEnemy, landProjectile } from '../entities/Pickup.js';
import { ITEMS } from '../systems/Items.js';
import { Sfx } from '../systems/Sfx.js';
import { addSilver, addGold, ensureInitialised as ensureCurrency, getSilver } from '../systems/Currency.js';
import { getDifficulty } from '../systems/Difficulty.js';
import { WalkableGrid, CELL, GRID } from '../systems/Grid.js';

const T = 32;

// The island is built as concentric rings: open water (outer), a walkable
// sand beach (1 tile), then the grass interior. OFFSET is the water+sand
// margin; FX/FY convert the old field-local layout (castle, path, spawns)
// into absolute world coordinates, shifted right to make room for a village.
const OFFSET = 96;
const BEACH_MARGIN = 32;
// Bigger, more sprawling island: the village strip stays but the field
// grows to 64x48 so there are real corners to explore, hidden pockets
// tucked behind rock formations, and enough room for the arena-house
// on its elevated terrace at the very north.
const VILLAGE_W = 22 * T;
const FIELD_W = 64 * T;
const FIELD_H = 48 * T;
const GRASS_W = VILLAGE_W + FIELD_W;
const GRASS_H = FIELD_H;
const OUTDOOR_W = GRASS_W + OFFSET * 2;
const OUTDOOR_H = GRASS_H + OFFSET * 2;
// Harbor: the boat parks at the bottom-centre of the island. The dock
// juts out one tile-height into the sand ring so the player can walk
// off the boat directly onto solid ground.
const HARBOR_X = OFFSET + GRASS_W / 2;
const HARBOR_Y = OFFSET + GRASS_H - T; // stays inside the grass bounds

const FX = (x) => OFFSET + VILLAGE_W + x;
const FY = (y) => OFFSET + y;
const VX = (x) => OFFSET + x; // village-strip local -> absolute (shares the y axis with FY)

// The arena-house sits on the elevated terrace at the north. It looks
// like an oversized manor from the outside - the actual boss arena is
// entered by walking into the black doorframe portal at its base.
const CASTLE_LOCAL_COL = 22;
const CASTLE_LOCAL_ROW = 3;
const CASTLE_ORIGIN_X = FX(CASTLE_LOCAL_COL * T);
const CASTLE_ORIGIN_Y = FY(CASTLE_LOCAL_ROW * T);
const CASTLE_COLS = 10;
const CASTLE_ROWS = 6;
const GATE_GAP = new Set(['4,5', '5,5']);
const GATE_GAP_COLS = [4, 5];
const GATE_ZONE = { x: CASTLE_ORIGIN_X + 4.5 * T, y: CASTLE_ORIGIN_Y + 5 * T };

// The path spine runs from the harbor at the bottom, past the village,
// through the field, and up the elevation ramp to the arena-house. It
// no longer draws as two rigid tile columns - see paintNaturalPath.
const PATH_COL_A = 28;
const PATH_COL_B = 29;
// The player now spawns on the dock instead of a random path tile, so
// they visibly "disembark" from the boat.
const PLAYER_START = { x: HARBOR_X, y: HARBOR_Y - 8 };

// Elevation terrace: a raised plateau at the north of the field that
// hosts the arena and connects to the field via a single central ramp.
const ELEVATION_ROW = 10; // bottom edge of the terrace in field-local rows
const ELEVATION_RAMP_COLS = [PATH_COL_A - 22, PATH_COL_B - 22]; // ramp gap

const ARENA_X = OUTDOOR_W + 120;
const ARENA_Y = 0;
const ARENA_COLS = 16; // >= 15 (480px / T) so the camera bounds always fill the 480px-wide viewport
const ARENA_ROWS = 11;
const ARENA_W = ARENA_COLS * T;
const ARENA_H = ARENA_ROWS * T;
const ARENA_ENTRANCE = { x: ARENA_X + 8 * T, y: ARENA_Y + 9 * T + 16 };
const BOSS_SPAWN = { x: ARENA_X + 8 * T, y: ARENA_Y + 3 * T };

export const MAP_INFO = {
  worldW: OUTDOOR_W,
  worldH: OUTDOOR_H,
  grass: { x: OFFSET, y: OFFSET, w: GRASS_W, h: GRASS_H },
  castle: { x: CASTLE_ORIGIN_X, y: CASTLE_ORIGIN_Y, w: CASTLE_COLS * T, h: CASTLE_ROWS * T },
  village: { x: OFFSET, y: OFFSET, w: VILLAGE_W, h: GRASS_H },
};

const DEFAULT_LOOT_TABLE = ['potion', 'potion', 'chicken', 'melon'];

// Both islands share the exact same field/castle/arena geometry (built
// above) - only the visual theme, decoration set, enemy roster, boss, loot
// and flavour text differ per island. That keeps the camera/minimap/gate
// logic identical while still making each island feel distinct.
const ISLAND_CONFIGS = {
  rubenfeld: {
    displayName: 'Rübenfeld',
    groundTile: 'tile_grass',
    beachTile: 'tile_sand',
    pathTile: 'tile_path',
    wallTexture: 'tile_wall',
    wallTint: null,
    floorTile: 'tile_floor',
    hasVillage: true,
    decorations: ['tree', 'tree', 'tree', 'bush', 'bush', 'bush', 'rock', 'rock', 'flowers', 'flowers', 'flowers', 'flowers'],
    spawnTable: [
      {
        Class: Halberdier,
        spots: [
          [FX(150), FY(300)], [FX(750), FY(350)], [FX(300), FY(550)], [FX(650), FY(200)],
          [FX(430), FY(620)], [FX(1000), FY(450)], [FX(850), FY(720)],
        ],
      },
      {
        Class: Goose,
        spots: [[FX(600), FY(500)], [FX(200), FY(450)], [FX(700), FY(600)], [FX(1020), FY(650)]],
      },
    ],
    pickups: [
      ['chicken', FX(800), FY(250)],
      ['barrel', FX(100), FY(220)],
      ['melon', FX(700), FY(450)],
      ['grail', FX(820), FY(550)],
      ['potion', FX(1050), FY(300)],
    ],
    chests: [
      ['warhammer', FX(120), FY(550)],
      ['armor_leather', FX(850), FY(150)],
      ['potion', FX(950), FY(780)],
    ],
    lootTable: DEFAULT_LOOT_TABLE,
    BossClass: Boss,
    hintText: 'Rübenfeld: erkunde das Dorf, räum das Feld, dann durchs Tor. [I] Inventar, [E] Türen',
    gateWarnText: 'Erst die Wachen im Feld vertreiben!',
    arenaGreeting: 'Baron Rudibert: "Wer WAGT es, mein Rübenfeld zu betreten?!"',
    victoryText: 'Baron Rudibert ergibt sich unter Gemüse und Tränen!',
  },
  eisenklamm: {
    displayName: 'Eisenklamm',
    groundTile: 'tile_stone',
    beachTile: 'tile_stone_path',
    pathTile: 'tile_stone_path',
    wallTexture: 'tile_wall',
    wallTint: 0x585d68,
    floorTile: 'tile_stone_path',
    hasVillage: false,
    decorations: ['pine_tree', 'pine_tree', 'pine_tree', 'rock', 'rock', 'rock', 'pine_tree', 'rock'],
    spawnTable: [
      {
        Class: EliteKnight,
        spots: [[FX(200), FY(250)], [FX(700), FY(300)], [FX(950), FY(600)]],
      },
      {
        Class: MineGoblin,
        spots: [[FX(400), FY(500)], [FX(150), FY(600)], [FX(600), FY(200)], [FX(850), FY(150)], [FX(1000), FY(700)]],
      },
      {
        Class: Sapper,
        spots: [[FX(300), FY(650)], [FX(750), FY(500)]],
      },
    ],
    pickups: [
      ['potion', FX(500), FY(200)],
      ['grapple_hook', FX(950), FY(350)],
      ['melon', FX(200), FY(700)],
    ],
    chests: [
      ['warhammer', FX(850), FY(700)],
      ['armor_leather', FX(150), FY(150)],
      ['potion', FX(1000), FY(500)],
    ],
    lootTable: ['potion', 'potion', 'melon'],
    BossClass: DukeGrendal,
    hintText: 'Eisenklamm: räum die Minenwachen, dann durchs Tor zu Eisenherzog Grendal. [I] Inventar',
    gateWarnText: 'Erst die Wachen in der Klamm vertreiben!',
    arenaGreeting: 'Eisenherzog Grendal: "Wer WAGT es, meine Klamm zu betreten?!"',
    victoryText: 'Eisenherzog Grendal kippt erschöpft in die Knie - Eisenklamm ist erobert!',
  },
};

export default class IslandScene extends Phaser.Scene {
  constructor() {
    super('Island');
  }

  init(data) {
    this.islandKey = data?.islandKey && ISLAND_CONFIGS[data.islandKey] ? data.islandKey : 'rubenfeld';
    this.cfg = ISLAND_CONFIGS[this.islandKey];
    this.inBossRoom = false;
    this.outdoorEnemyCount = 0;
    this.fogZones = [];
    // If we're returning from an interior shop, respawn the player at
    // the door they came out of. Otherwise fall back to PLAYER_START.
    this.returningFromInterior = !!data?.returningFromInterior;
    this.spawnX = data?.returnX;
    this.spawnY = data?.returnY;
  }

  create() {
    const cfg = this.cfg;
    ensureCurrency(this.registry);

    // Walkable-Grid für Pokemon-Style-Bewegung. Cover full outdoor incl.
    // water ring so world edges block naturally. Alle wall-Zellen werden
    // über addWallRect / markGridWall automatisch gesetzt.
    const cols = Math.ceil(OUTDOOR_W / T);
    const rows = Math.ceil(OUTDOOR_H / T);
    this.walkableGrid = new WalkableGrid(cols, rows, T);
    // Wasserring & Rand als WALL markieren: alles außerhalb der
    // physics-Bounds ist nicht begehbar.
    const grassLeft = Math.floor((OFFSET - BEACH_MARGIN) / T);
    const grassTop = Math.floor((OFFSET - BEACH_MARGIN) / T);
    const grassRight = Math.ceil((OFFSET - BEACH_MARGIN + GRASS_W + BEACH_MARGIN * 2) / T);
    const grassBottom = Math.ceil((OFFSET - BEACH_MARGIN + GRASS_H + BEACH_MARGIN * 2) / T);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (c < grassLeft || c >= grassRight || r < grassTop || r >= grassBottom) {
          this.walkableGrid.set(c, r, CELL.WALL);
        }
      }
    }
    // physics bounds are inset to the grass+beach (excludes the outer water
    // ring), so the player/enemies simply cannot walk out to sea - no water
    // collision geometry needed. Camera bounds cover the full map including
    // the water ring so the coastline is actually visible while exploring.
    this.physics.world.setBounds(
      OFFSET - BEACH_MARGIN,
      OFFSET - BEACH_MARGIN,
      GRASS_W + BEACH_MARGIN * 2,
      GRASS_H + BEACH_MARGIN * 2
    );
    this.cameras.main.setBounds(0, 0, OUTDOOR_W, OUTDOOR_H);

    // Animated water: swap between 4 water frames every 220ms. tile_water_0..3
    // encode drifting highlight ripples so the sea shimmers instead of sitting
    // flat under everything.
    this.waterFrames = ['tile_water_0', 'tile_water_1', 'tile_water_2', 'tile_water_3'];
    this.waterFrame = 0;
    this.waterSprite = this.add
      .tileSprite(0, 0, OUTDOOR_W, OUTDOOR_H, this.waterFrames[0])
      .setOrigin(0, 0);
    this.time.addEvent({
      delay: 220,
      loop: true,
      callback: () => {
        this.waterFrame = (this.waterFrame + 1) % this.waterFrames.length;
        this.waterSprite.setTexture(this.waterFrames[this.waterFrame]);
      },
    });

    this.add
      .tileSprite(
        OFFSET - BEACH_MARGIN,
        OFFSET - BEACH_MARGIN,
        GRASS_W + BEACH_MARGIN * 2,
        GRASS_H + BEACH_MARGIN * 2,
        cfg.beachTile
      )
      .setOrigin(0, 0);
    this.add.tileSprite(OFFSET, OFFSET, GRASS_W, GRASS_H, cfg.groundTile).setOrigin(0, 0);

    // Sprinkle tile variants (grass tufts, flowers, sand pebbles, stone
    // cracks) as small overlaid patches so the ground stops looking uniform.
    this.scatterGroundVariants();

    // Foam edge along the beach - purely decorative but sells the coastline.
    this.paintBeachFoam();

    // Shadow layer: every actor gets a soft drop-shadow blob rendered from
    // this group so they no longer float above the ground.
    this.shadowLayer = this.add.group();
    this.actorShadows = new Map();

    this.arenaFloor = this.add
      .tileSprite(ARENA_X, ARENA_Y, ARENA_W, ARENA_H, cfg.floorTile)
      .setOrigin(0, 0);

    // Natural, meandering path system. Instead of rigid tile columns, we
    // trace a spine of points from the harbor up through the field to the
    // arena hill, with soft sine-based drift so it feels hand-drawn.
    this.paintNaturalMainPath();

    this.walls = this.physics.add.staticGroup();
    this.warpZones = []; // collected while building village/arena, wired to player after spawn
    this.houses = [];

    if (cfg.hasVillage) this.buildVillage();
    else this.buildMineCamp();
    // Elevation terrace: raised plateau at the north with a single central
    // ramp; rock collision everywhere except the ramp gap.
    this.buildElevationTerrace();
    // Harbor: a wooden dock at the bottom-centre where the boat lands.
    this.buildHarbor();
    // The arena exterior is a manor-style house sitting on the terrace,
    // with a black doorway portal (walk-through warp) at its base.
    this.buildArenaHouse();
    // Player spawn now happens AFTER the world is built (so warp zones
    // exist and can be wired to overlaps). If we're returning from an
    // interior, use the door-return coordinates.
    // Player-Startposition immer auf Grid-Mitte snappen.
    const rawX = this.returningFromInterior && this.spawnX ? this.spawnX : PLAYER_START.x;
    const rawY = this.returningFromInterior && this.spawnY ? this.spawnY : PLAYER_START.y;
    const startCell = this.walkableGrid.worldToCell(rawX, rawY);
    const snap = this.walkableGrid.cellToWorld(startCell.col, startCell.row);
    const startX = snap.x;
    const startY = snap.y;
    this.player = new Player(this, startX, startY);
    this.attachShadow(this.player, { scaleX: 1, alpha: 0.55 });
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.enemies = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.projectiles = this.physics.add.group();

    this.spawnOutdoorEncounter();
    this.spawnOutdoorPickups();
    this.scatterDecorations();
    // Discovery pockets need `this.pickups` to exist (chests join the
    // pickup group), so we build them AFTER player + groups are ready.
    this.buildDiscoveryPockets();

    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.projectiles, this.walls, (proj) => landProjectile(this, proj));

    this.physics.add.overlap(this.player, this.enemies, (player, enemy) => this.onPlayerEnemyContact(enemy));
    this.physics.add.overlap(this.player, this.pickups, (player, item) => this.onPlayerPickup(item));
    this.physics.add.overlap(this.projectiles, this.enemies, (proj, enemy) => resolveProjectileHitEnemy(this, proj, enemy));

    // Pokemon-style warp triggers: walking into any warp zone teleports
    // the player to a different scene / coordinates. Zones are grace-
    // period gated so the player can't instantly re-trigger the zone
    // they just emerged from.
    this.warpZones.forEach((zone) => {
      this.physics.add.overlap(this.player, zone, () => this.triggerWarp(zone));
    });
    // If we just came back from an interior, give a 700ms grace period
    // so the player can walk away from the doorway before re-entering.
    this._warpGraceUntil = this.time.now + 700;

    this.events.on('playerAttack', this.onPlayerAttack, this);
    this.events.on('playerParry', this.onPlayerParry, this);
    this.events.on('playerThrow', this.onPlayerThrow, this);
    this.events.on('enemyDied', this.onEnemyDied, this);
    this.events.on('bossThrowVeggie', this.onBossThrowVeggie, this);
    this.events.on('bossCallGuards', this.onBossCallGuards, this);
    this.events.on('bossGroundSlam', this.onBossGroundSlam, this);
    this.events.on('sapperBomb', this.onSapperBomb, this);
    this.events.on('bossDied', this.onBossDied, this);
    this.events.on('playerDied', this.onPlayerDied, this);
    this.events.on('toggleInventory', this.openInventory, this);
    this.events.on('playerGrapple', this.onPlayerGrapple, this);

    this.scene.launch('UI', { islandSceneKey: 'Island' });
    this.events.emit('hint', cfg.hintText);
    this.time.delayedCall(4500, () => this.events.emit('hint', ''));

    this.events.once('shutdown', () => this.scene.stop('UI'));
  }

  openInventory() {
    this.scene.pause();
    this.scene.launch('Inventory', { islandSceneKey: 'Island' });
    Sfx.uiToggle();
  }

  // Wall TEXTURE only - individual tile images, purely visual.
  buildWallVisuals(originX, originY, colsWide, rowsTall, gapSet) {
    for (let r = 0; r < rowsTall; r++) {
      for (let c = 0; c < colsWide; c++) {
        const isBorder = c === 0 || c === colsWide - 1 || r === 0 || r === rowsTall - 1;
        if (!isBorder) continue;
        if (gapSet && gapSet.has(`${c},${r}`)) continue;
        const img = this.add.image(originX + c * T + 16, originY + r * T + 16, this.cfg.wallTexture);
        if (this.cfg.wallTint) img.setTint(this.cfg.wallTint);
      }
    }
  }

  // Wall COLLISION - a handful of large merged rectangles (one per straight
  // run) instead of one static body per tile. Many small edge-to-edge bodies
  // is what caused the player to catch/stutter on internal tile seams while
  // sliding diagonally along a wall; a single rectangle per run has no
  // internal seams to catch on.
  buildWallRing(originX, originY, cols, rows, gateGapCols) {
    const w = cols * T;
    const h = rows * T;
    this.addWallRect(originX, originY, originX + w, originY + T); // top
    this.addWallRect(originX, originY, originX + T, originY + h); // left
    this.addWallRect(originX + w - T, originY, originX + w, originY + h); // right
    if (gateGapCols) {
      const [g0, g1] = gateGapCols;
      if (g0 > 0) this.addWallRect(originX, originY + h - T, originX + g0 * T, originY + h);
      if (g1 < cols - 1) this.addWallRect(originX + (g1 + 1) * T, originY + h - T, originX + w, originY + h);
    } else {
      this.addWallRect(originX, originY + h - T, originX + w, originY + h); // bottom
    }
  }

  addWallRect(x0, y0, x1, y1) {
    const rect = this.add.rectangle((x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, 0x000000, 0);
    this.physics.add.existing(rect, true);
    this.walls.add(rect);
    // Zusätzlich das Grid markieren: alle Zellen, die die Wand berühren.
    this.markGridWall(x0, y0, x1, y1);
  }

  // Markiert alle Zellen im walkableGrid, deren Zentrum in dem Rechteck
  // liegt, als WALL. So sieht der Player die Wand aus Grid-Sicht.
  markGridWall(x0, y0, x1, y1) {
    const g = this.walkableGrid;
    if (!g) return;
    const c0 = Math.floor(x0 / g.cell);
    const r0 = Math.floor(y0 / g.cell);
    const c1 = Math.floor((x1 - 0.01) / g.cell);
    const r1 = Math.floor((y1 - 0.01) / g.cell);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) g.set(c, r, CELL.WALL);
    }
  }

  // Village: a proper cluster with two shops on the main street, cottages
  // around a central well, and back-of-village landmarks. Doors are drawn
  // as BLACK PORTAL RECTANGLES sunk into the house sprite; walking into
  // them (overlap, no key needed) warps to the InteriorScene.
  buildVillage() {
    const cfg = this.cfg;
    const wellX = VX(VILLAGE_W / 2);
    const wellY = FY(FIELD_H / 2);

    // Village-local winding paths between well, houses, harbor, field exit.
    const paintCurvedPath = (x0, y0, x1, y1, drift = 20) => {
      const dist = Phaser.Math.Distance.Between(x0, y0, x1, y1);
      const steps = Math.max(8, Math.round(dist / (T / 2)));
      // perpendicular unit vector for the sine drift
      const dx = (x1 - x0) / dist;
      const dy = (y1 - y0) / dist;
      const px = -dy;
      const py = dx;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        // ease-in / ease-out drift so ends land on target
        const wave = Math.sin(t * Math.PI) * drift * (Math.sin(t * Math.PI * 2) * 0.4 + 1);
        const rx = x0 + (x1 - x0) * t + px * wave;
        const ry = y0 + (y1 - y0) * t + py * wave;
        const x = Math.round(rx / (T / 2)) * (T / 2);
        const y = Math.round(ry / (T / 2)) * (T / 2);
        this.add.image(x, y, cfg.pathTile).setDepth(0.5);
      }
    };

    // House layout auf Grid-Basis (Pokemon-Stil): jedes Haus deckt ein
    // Tile-Rechteck (footCols x footRows). Anker (col,row) ist die
    // Tür-Kachel des Hauses (unten mittig). Der Sprite wird darauf so
    // positioniert dass die Tür der Grafik genau auf diese Kachel fällt.
    // Pokemon-Regel: kein Haus ohne Zweck. Cottages/Bauernhof/Wirtshaus
    // haben interiorKind + label - beim Betreten öffnet ein Talker-Room
    // mit Gerüchten über Kaiser, Nachbarinseln und versteckte Schätze.
    const houses = [
      { key: 'house_apothecary', col: 8,  row: 10, footCols: 4, footRows: 3, scale: 3.0, shop: 'apothecary', label: 'Apotheke' },
      { key: 'house_smith',      col: 17, row: 10, footCols: 4, footRows: 3, scale: 3.0, shop: 'smith',      label: 'Schmiede' },
      { key: 'house_cottage_a',  col: 5,  row: 20, footCols: 3, footRows: 3, scale: 2.6, interiorKind: 'cottage', label: 'Häuschen' },
      { key: 'house_cottage_b',  col: 11, row: 24, footCols: 3, footRows: 3, scale: 2.6, interiorKind: 'farm',    label: 'Bauernhof' },
      { key: 'house_cottage_a',  col: 17, row: 20, footCols: 3, footRows: 3, scale: 2.6 },
      { key: 'house_cottage_b',  col: 20, row: 24, footCols: 3, footRows: 3, scale: 2.6 },
      { key: 'house_stone',      col: 4,  row: 30, footCols: 3, footRows: 3, scale: 2.6 },
      { key: 'house_inn',        col: 18, row: 32, footCols: 4, footRows: 3, scale: 3.0, interiorKind: 'tavern', label: 'Wirtshaus' },
    ];

    // Curved paths connecting well to key destinations.
    paintCurvedPath(wellX, wellY, VX(220), FY(280), 14);
    paintCurvedPath(wellX, wellY, VX(500), FY(280), 14);
    paintCurvedPath(wellX, wellY, VX(270), FY(680), 18);
    paintCurvedPath(wellX, wellY, VX(470), FY(540), 12);
    paintCurvedPath(wellX, wellY, VX(600), FY(680), 22);
    paintCurvedPath(wellX, wellY, VX(520), FY(980), 24);
    // Spine: field exit down to harbor via well.
    paintCurvedPath(wellX, FY(20), wellX, wellY, 26);
    paintCurvedPath(wellX, wellY, HARBOR_X, HARBOR_Y - 20, 30);

    // Well decoration + collision.
    const well = this.add.image(wellX, wellY, 'well').setOrigin(0.5, 1).setDepth(wellY - 1);
    this.houses.push(well);
    const wellRect = this.add.rectangle(wellX, wellY - 20, 22, 22, 0, 0);
    this.physics.add.existing(wellRect, true);
    this.walls.add(wellRect);

    // Umrechnung Village-lokaler (col,row) -> absolute Weltkoord.
    const vColBase = Math.floor(OFFSET / T);
    const vRowBase = Math.floor(OFFSET / T);

    houses.forEach(({ key, col, row, footCols, footRows, scale = 2.6, shop, interiorKind, label }) => {
      const absCol = vColBase + col;
      const absRow = vRowBase + row;
      // Weltkoords der Türkachel (unten-mittig des Haus-Fussabdrucks).
      const doorWorld = this.walkableGrid.cellToWorld(absCol, absRow);
      // Der Fussabdruck erstreckt sich footCols breit, footRows hoch nach OBEN.
      const footLeftCol = absCol - Math.floor(footCols / 2);
      const footTopRow = absRow - (footRows - 1);

      // Grid-Zellen markieren: gesamter Footprint = WALL, Türkachel = DOOR.
      for (let r = footTopRow; r <= absRow; r++) {
        for (let c = footLeftCol; c < footLeftCol + footCols; c++) {
          this.walkableGrid.set(c, r, CELL.WALL);
        }
      }

      // Sprite so platzieren, dass die Tür genau auf die Türkachel fällt.
      // Origin (0.5, 1) ankert Sprite an seiner Unterkante Mitte, was
      // für unsere Häuser-Sprites (Tür am unteren Rand) genau passt.
      const img = this.add.image(doorWorld.x, doorWorld.y + T / 2, key)
        .setOrigin(0.5, 1)
        .setScale(scale);
      img.setDepth(doorWorld.y + T / 2 - 1);
      this.houses.push(img);

      // Talker- oder Shop-Häuser bekommen Türportal + Warp.
      const hasInterior = !!shop || !!interiorKind;
      if (hasInterior) {
        // Schwarzes Türrechteck IN die gemalte Tür des Haus-Sprites setzen.
        // Bei den grossen Häuser-Sprites (scale ~2.6) sitzt die Tür ca.
        // 10-14% über der Sprite-Unterkante, nicht ganz unten. Wir nehmen
        // den Sprite (bereits erzeugt) und legen das Portal in dessen
        // untere Tür-Zone: portalY liegt ~T*0.9 unter der Sprite-Mitte.
        const spriteBottomY = doorWorld.y + T / 2; // Sprite-Origin (0.5,1)
        const portalX = doorWorld.x;
        const portalY = spriteBottomY - T * 0.55;
        const portalW = T * 0.7;
        const portalH = T * 0.85;
        this.paintDoorwayPortalOnHouse(portalX, portalY, portalW, portalH, spriteBottomY);
        // Warp-Event auf Türkachel registrieren: shop öffnet ShopScene,
        // interior öffnet Talker-Innenraum (kein Kaufen).
        const warpPayload = shop
          ? { kind: 'shop', shopKind: shop, returnX: doorWorld.x, returnY: doorWorld.y + T }
          : { kind: 'interior', interiorKind, returnX: doorWorld.x, returnY: doorWorld.y + T };
        this.walkableGrid.addWarp(absCol, absRow, warpPayload);

        // Sign eine Kachel unter der Tür, damit er sichtbar bleibt.
        const x = doorWorld.x;
        const y = doorWorld.y + T + 2;
        this.add
          .text(x, y + 22, label ?? '', {
            fontFamily: 'Georgia, serif',
            fontSize: '10px',
            color: '#f5cf4a',
            stroke: '#000',
            strokeThickness: 3,
          })
          .setOrigin(0.5, 0)
          .setDepth(y + 2);
      }
    });
  }

  // Paints a black doorway rectangle at (x,y) so each house has a real
  // dark portal you can visibly walk into. Rendered slightly ABOVE the
  // house baseline so it looks recessed into the wall.
  paintDoorwayPortal(x, y, width = 20, height = 28) {
    this.paintDoorwayPortalOnHouse(x, y, width, height, y);
  }

  // Paints the black doorway portal so it sits ON TOP of the house sprite
  // (whose depth is anchored at anchorY-1). We render at anchorY + 0.1 so
  // both the frame and inner black are visible over the wall texture.
  paintDoorwayPortalOnHouse(x, y, width, height, anchorY) {
    const d = anchorY + 0.1;
    // Dark wooden frame (slightly larger than the black opening).
    this.add
      .rectangle(x, y - height / 2, width + 4, height + 3, 0x2a1a0e)
      .setDepth(d);
    // Black interior of the doorway.
    this.add
      .rectangle(x, y - height / 2, width, height, 0x000000)
      .setDepth(d + 0.05);
    // Subtle top gradient hint of receding depth.
    this.add
      .rectangle(x, y - height + 2, Math.max(4, width - 6), 3, 0x0a1420, 0.75)
      .setDepth(d + 0.1);
  }

  // Central warp dispatcher. Zones set their kind + payload; this decides
  // what scene to load. Grace period prevents instant re-entry after
  // returning from an interior.
  triggerWarp(zone) {
    if (this._warping) return;
    if (this.time.now < (this._warpGraceUntil || 0)) return;
    // Support both legacy overlap-zone objects and grid warp payloads.
    const kind = zone.warpKind ?? zone.kind;
    zone.warpKind = kind;
    // Arena warp is guarded by the field-clear rule.
    if (kind === 'arena' && this.outdoorEnemyCount > 0) {
      const now = this.time.now;
      if (!this._gateWarnAt || now - this._gateWarnAt > 1500) {
        this._gateWarnAt = now;
        this.events.emit('toast', this.cfg.gateWarnText);
      }
      return;
    }
    this._warping = true;
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.time.delayedCall(240, () => {
      if (zone.warpKind === 'shop') {
        this.scene.stop('UI');
        this.scene.start('Interior', {
          kind: zone.shopKind,
          returnScene: 'Island',
          returnX: zone.returnX,
          returnY: zone.returnY,
          islandKey: this.islandKey,
        });
      } else if (zone.warpKind === 'interior') {
        // Talker-Haus (Cottage/Tavern/Farm): kein Shop, aber Gerücht-NPC.
        this.scene.stop('UI');
        this.scene.start('Interior', {
          kind: zone.interiorKind,
          returnScene: 'Island',
          returnX: zone.returnX,
          returnY: zone.returnY,
          islandKey: this.islandKey,
        });
      } else if (zone.warpKind === 'arena') {
        this.enterBossArena();
      }
    });
  }

  // Ridge of stone-wall tiles running east-west across the field at
  // ELEVATION_ROW, with a two-tile gap for the path ramp. Collision is
  // applied everywhere except the ramp gap. Purely visual for the ramp
  // itself (path tiles already painted).
  buildElevationTerrace() {
    const y = FY(ELEVATION_ROW * T + T);
    const cols = FIELD_W / T;
    const [g0, g1] = ELEVATION_RAMP_COLS;
    for (let c = 0; c < cols; c++) {
      if (c === g0 || c === g1) continue;
      const x = FX(c * T + T / 2);
      this.add.image(x, y, 'elevation_wall').setDepth(y - 4);
    }
    // Collision: two rectangles flanking the ramp gap.
    if (g0 > 0) this.addWallRect(FX(0), y - T / 2, FX(g0 * T), y + T / 2);
    if (g1 < cols - 1) this.addWallRect(FX((g1 + 1) * T), y - T / 2, FX(cols * T), y + T / 2);
  }

  // Natural, meandering main path from the harbor up through the field to
  // the arena-house entrance. Sine drift + width variation gives it a
  // hand-drawn feel instead of two rigid tile columns.
  paintNaturalMainPath() {
    const cfg = this.cfg;
    const startX = HARBOR_X;
    const startY = HARBOR_Y - 20;
    const endX = CASTLE_ORIGIN_X + CASTLE_COLS * T / 2;
    const endY = CASTLE_ORIGIN_Y + CASTLE_ROWS * T + 10;
    const steps = 90;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      // Two-band sine drift so the path curves smoothly, more toward the middle.
      const drift = Math.sin(t * Math.PI) * 42;
      const wobble = Math.sin(t * Math.PI * 3.2) * 12;
      const cx = startX + (endX - startX) * t + drift + wobble;
      const cy = startY + (endY - startY) * t;
      // Path is 2-tiles wide, softly varying.
      const halfW = 1 + Math.round(Math.sin(t * Math.PI * 5) * 0.5);
      for (let w = -halfW; w <= halfW; w++) {
        const x = Math.round((cx + w * T) / T) * T + T / 2;
        const y = Math.round(cy / T) * T + T / 2;
        this.add.image(x, y, cfg.pathTile).setDepth(0.5);
      }
    }
  }

  // Arena EXTERIOR: a large manor-style building on the terrace, with a
  // black doorway portal at its base. Walking into the portal warps to
  // the boss-arena interior (which is a separate walled room already
  // built at ARENA_X/ARENA_Y). Purely visual on the outside - collision
  // is a big rectangle around the manor so you can't clip through.
  buildArenaHouse() {
    const houseX = CASTLE_ORIGIN_X + (CASTLE_COLS * T) / 2;
    const houseY = CASTLE_ORIGIN_Y + CASTLE_ROWS * T; // baseline
    // Big manor sprite. We reuse arena_gatehouse which was designed for
    // exactly this purpose.
    const scale = 2.0;
    const img = this.add.image(houseX, houseY, 'arena_gatehouse').setOrigin(0.5, 1).setScale(scale);
    img.setDepth(houseY - 1);
    this.houses.push(img);

    // Collision: two rectangles flanking the doorway so you cannot walk
    // THROUGH the manor - only into the doorway portal.
    const footprintW = Math.round(img.width * scale * 0.85);
    const footprintH = 60;
    const doorW = 26;
    this.addWallRect(houseX - footprintW / 2, houseY - footprintH, houseX - doorW / 2, houseY - 6);
    this.addWallRect(houseX + doorW / 2, houseY - footprintH, houseX + footprintW / 2, houseY - 6);

    // Doorway portal painted INTO the manor's ground-floor gate opening.
    this.paintDoorwayPortalOnHouse(houseX, houseY - 4, doorW, 34, houseY);

    // Warp zone in the doorway.
    const zone = this.add.zone(houseX, houseY - 8, doorW, 20);
    this.physics.add.existing(zone, true);
    zone.warpKind = 'arena';
    this.warpZones.push(zone);

    // "Arena" sign above the door.
    this.add
      .text(houseX, houseY - img.height * scale - 6, 'ARENA', {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: '#f5cf4a',
        stroke: '#000',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1)
      .setDepth(houseY + 2);
  }

  // Discovery: three rock circles hiding a bonus chest each, tucked in
  // corners the player has to actively explore to reach. Also spreads a
  // few solitary cottages / mine entrances at the far edges of the field.
  buildDiscoveryPockets() {
    // Corners relative to the field origin (avoid castle + main path).
    const pockets = [
      { x: FX(FIELD_W - 3 * T), y: FY(FIELD_H - 3 * T), loot: 'grail' },
      { x: FX(3 * T),           y: FY(FIELD_H - 6 * T), loot: 'warhammer' },
      { x: FX(FIELD_W - 4 * T), y: FY(14 * T),          loot: 'armor_leather' },
    ];
    pockets.forEach(({ x, y, loot }) => {
      // Ring of 6-8 rocks around the chest.
      const rockCount = 7;
      const ringRadius = 42;
      for (let i = 0; i < rockCount; i++) {
        const a = (i / rockCount) * Math.PI * 2 + Math.random() * 0.4;
        // Leave a small opening on one side so it's approachable.
        if (Math.abs(a - Math.PI / 2) < 0.6) continue;
        const rx = x + Math.cos(a) * ringRadius + Phaser.Math.Between(-4, 4);
        const ry = y + Math.sin(a) * ringRadius + Phaser.Math.Between(-4, 4);
        this.spawnCollidableRock(rx, ry);
      }
      const chest = spawnChest(this, loot, x, y);
      chest.isDiscoveryChest = true;
      this.pickups.add(chest);
    });
  }

  // Places a rock sprite AND its physical collision rectangle. The
  // hitbox is deliberately small - covering only the visible base of
  // the rock, so the player can walk past neighbouring rocks without
  // getting snagged.
  spawnCollidableRock(x, y) {
    const img = this.add.image(x, y, 'rock').setOrigin(0.5, 0.9).setDepth(y - 1);
    // Rock hitbox als 1-Tile-Blocker: exakt die Zelle unter dem Fels ist
    // WALL, der Sprite hängt visuell drüber - klassisches Pokemon.
    const g = this.walkableGrid;
    if (g) {
      const cellPos = g.worldToCell(x, y);
      // Nur die Kachel die der Sprite tatsächlich belegt sperren.
      g.set(cellPos.col, cellPos.row, CELL.WALL);
    }
    // Physics-Body für Kollisionen mit Feinden/Projektilen.
    const rect = this.add.rectangle(x, y - 4, 20, 14, 0, 0);
    this.physics.add.existing(rect, true);
    this.walls.add(rect);
    this.houses.push(img);
    return img;
  }

  // Wooden dock jutting into the beach ring where the boat parks. Purely
  // decorative - the player is spawned on top of it.
  buildHarbor() {
    // Depth kept low so the player and NPCs draw ABOVE the dock plank.
    this.add.image(HARBOR_X, HARBOR_Y, 'dock').setDepth(0);
    this.add
      .text(HARBOR_X, HARBOR_Y - 24, '⚓ Hafen', {
        fontFamily: 'Georgia, serif',
        fontSize: '10px',
        color: '#f5cf4a',
        stroke: '#000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(HARBOR_Y + 2);
  }

  // Eisenklamm has no village - a couple of mine entrances dug into the
  // rock instead, purely decorative like the trees/bushes elsewhere.
  buildMineCamp() {
    const spots = [
      { x: VX(90), y: FY(200) },
      { x: VX(160), y: FY(520) },
    ];
    spots.forEach(({ x, y }) => {
      const img = this.add.image(x, y, 'mine_entrance').setOrigin(0.5, 0.9);
      img.setDepth(y - 1);
      this.houses.push(img);
    });
  }

  scatterDecorations() {
    const weighted = this.cfg.decorations;
    const cell = 96;
    for (let gx = 0; gx < FIELD_W; gx += cell) {
      for (let gy = 0; gy < FIELD_H; gy += cell) {
        if (Math.random() > 0.5) continue;
        const localX = gx + Phaser.Math.Between(10, cell - 10);
        const localY = gy + Phaser.Math.Between(10, cell - 10);
        if (this.isDecorationExcluded(localX, localY)) continue;

        const key = Phaser.Utils.Array.GetRandom(weighted);
        const worldX = FX(localX);
        const worldY = FY(localY);
        if (key === 'rock') {
          // Rocks now have real collision so the player cannot walk under
          // them anymore. spawnCollidableRock handles sprite + hitbox.
          this.spawnCollidableRock(worldX, worldY);
          continue;
        }
        const img = this.add.image(worldX, worldY, key);
        if (key === 'flowers') {
          img.setOrigin(0.5, 0.6).setDepth(2);
        } else if (key === 'tree' || key === 'pine_tree') {
          img.setOrigin(0.5, 0.9).setDepth(worldY - 1);
          // Bäume als 1-Tile-Blocker im Grid (unter dem Stamm),
          // plus tighter physics-Body für Feinde/Projektile.
          const g = this.walkableGrid;
          if (g) {
            const cp = g.worldToCell(worldX, worldY);
            g.set(cp.col, cp.row, CELL.WALL);
          }
          const rect = this.add.rectangle(worldX, worldY - 4, 14, 10, 0, 0);
          this.physics.add.existing(rect, true);
          this.walls.add(rect);
        } else if (key === 'bush') {
          img.setOrigin(0.5, 0.9).setDepth(worldY - 1);
        } else {
          img.setOrigin(0.5, 0.9).setDepth(worldY - 1);
        }
      }
    }
  }

  isDecorationExcluded(localX, localY) {
    const margin = 44;
    const cx0 = CASTLE_LOCAL_COL * T - margin;
    const cx1 = (CASTLE_LOCAL_COL + CASTLE_COLS) * T + margin;
    const cy0 = CASTLE_LOCAL_ROW * T - margin;
    const cy1 = (CASTLE_LOCAL_ROW + CASTLE_ROWS) * T + margin;
    if (localX > cx0 && localX < cx1 && localY > cy0 && localY < cy1) return true;

    const px0 = PATH_COL_A * T - margin;
    const px1 = (PATH_COL_B + 1) * T + margin;
    if (localX > px0 && localX < px1) return true;

    return false;
  }

  spawnOutdoorEncounter() {
    this.cfg.spawnTable.forEach(({ Class, spots }) => {
      spots.forEach(([x, y]) => {
        const e = new Class(this, x, y);
        e.isOutdoor = true;
        this.enemies.add(e);
        this.attachShadow(e, { scaleX: 0.9, alpha: 0.5 });
        this.outdoorEnemyCount++;
      });
    });
  }

  attachShadow(actor, { scaleX = 1, alpha = 0.55, yOffset = 12 } = {}) {
    const shadow = this.add.image(actor.x, actor.y + yOffset, 'shadow_blob');
    shadow.setOrigin(0.5, 0.5).setAlpha(alpha).setScale(scaleX, 1);
    this.shadowLayer.add(shadow);
    // baseAlpha + baseScale so the update loop can restore them after airborne dip.
    this.actorShadows.set(actor, { shadow, yOffset, baseAlpha: alpha, baseScale: scaleX });
  }

  scatterGroundVariants() {
    const cfg = this.cfg;
    const variants = [];
    if (cfg.groundTile === 'tile_grass') variants.push('tile_grass_1', 'tile_grass_2');
    if (cfg.groundTile === 'tile_stone') variants.push('tile_stone_1');
    if (variants.length === 0) return;
    const count = 90;
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(OFFSET, OFFSET + GRASS_W - T);
      const y = Phaser.Math.Between(OFFSET, OFFSET + GRASS_H - T);
      if (this.isDecorationExcluded(x - OFFSET - VILLAGE_W, y - OFFSET)) continue;
      const key = Phaser.Utils.Array.GetRandom(variants);
      this.add.image(x, y, key).setDepth(0.2);
    }

    // Sand variants around the beach ring
    if (cfg.beachTile === 'tile_sand') {
      for (let i = 0; i < 40; i++) {
        const side = Phaser.Math.Between(0, 3);
        let x, y;
        if (side === 0) { x = Phaser.Math.Between(OFFSET - BEACH_MARGIN, OFFSET + GRASS_W + BEACH_MARGIN); y = OFFSET - BEACH_MARGIN + Phaser.Math.Between(0, BEACH_MARGIN); }
        else if (side === 1) { x = Phaser.Math.Between(OFFSET - BEACH_MARGIN, OFFSET + GRASS_W + BEACH_MARGIN); y = OFFSET + GRASS_H + Phaser.Math.Between(-BEACH_MARGIN, BEACH_MARGIN); }
        else if (side === 2) { y = Phaser.Math.Between(OFFSET - BEACH_MARGIN, OFFSET + GRASS_H + BEACH_MARGIN); x = OFFSET - BEACH_MARGIN + Phaser.Math.Between(0, BEACH_MARGIN); }
        else { y = Phaser.Math.Between(OFFSET - BEACH_MARGIN, OFFSET + GRASS_H + BEACH_MARGIN); x = OFFSET + GRASS_W + Phaser.Math.Between(-BEACH_MARGIN, BEACH_MARGIN); }
        this.add.image(x, y, 'tile_sand_1').setDepth(0.2);
      }
    }
  }

  paintBeachFoam() {
    // draw a broken foam line just outside the sand ring on all four sides
    const x0 = OFFSET - BEACH_MARGIN;
    const y0 = OFFSET - BEACH_MARGIN;
    const w = GRASS_W + BEACH_MARGIN * 2;
    const h = GRASS_H + BEACH_MARGIN * 2;
    for (let x = x0; x < x0 + w; x += 32) {
      if (Math.random() < 0.7) this.add.image(x, y0 - 3, 'beach_edge').setOrigin(0, 0.5).setDepth(0.3);
      if (Math.random() < 0.7) this.add.image(x, y0 + h + 3, 'beach_edge').setOrigin(0, 0.5).setDepth(0.3);
    }
    for (let y = y0; y < y0 + h; y += 32) {
      if (Math.random() < 0.7) this.add.image(x0 - 3, y, 'beach_edge').setOrigin(0, 0.5).setDepth(0.3).setRotation(Math.PI / 2);
      if (Math.random() < 0.7) this.add.image(x0 + w + 3, y, 'beach_edge').setOrigin(0, 0.5).setDepth(0.3).setRotation(Math.PI / 2);
    }
  }

  spawnOutdoorPickups() {
    this.cfg.pickups.forEach(([type, x, y]) => {
      const sprite = spawnPickup(this, type, x, y);
      this.pickups.add(sprite);
    });
    this.cfg.chests.forEach(([itemId, x, y]) => {
      const sprite = spawnChest(this, itemId, x, y);
      this.pickups.add(sprite);
    });
  }

  onPlayerAttack({ x, y, angle, range, damage }) {
    // Slash arc VFX in front of the player
    const slash = this.add.image(x, y, 'slash_vfx').setDepth(this.player.y + 2).setAlpha(0.95);
    slash.setRotation(angle + Math.PI / 2);
    slash.setScale(0.7);
    this.tweens.add({
      targets: slash,
      alpha: 0,
      scale: 1.15,
      duration: 180,
      onComplete: () => slash.destroy(),
    });

    const dirVec = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
    let anyHit = false;
    this.enemies.getChildren().forEach((enemy) => {
      if (enemy.dead) return;
      const toEnemy = new Phaser.Math.Vector2(enemy.x - this.player.x, enemy.y - this.player.y);
      const dist = toEnemy.length();
      if (dist > range + 18) return;
      toEnemy.normalize();
      if (dirVec.dot(toEnemy) > 0.3) {
        enemy.takeDamage(damage, this.player.x, this.player.y, this.time.now);
        this.spawnHitSparks(enemy.x, enemy.y);
        anyHit = true;
      }
    });
    if (anyHit) this.cameras.main.shake(70, 0.0035);
  }

  spawnHitSparks(x, y) {
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 80;
      const s = this.add.image(x, y, 'spark').setDepth(y + 5);
      const tx = x + Math.cos(a) * 18;
      const ty = y + Math.sin(a) * 18;
      this.tweens.add({
        targets: s,
        x: tx,
        y: ty,
        alpha: 0,
        scale: 0.4,
        duration: 220,
        onComplete: () => s.destroy(),
      });
    }
  }

  onPlayerParry({ x, y, range }) {
    let any = false;
    this.enemies.getChildren().forEach((enemy) => {
      if (enemy.dead || enemy.state !== 'telegraph') return;
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist < range) {
        enemy.onParried();
        any = true;
      }
    });
    if (any) this.player.onSuccessfulParry();
  }

  onPlayerThrow({ type, x, y, dir }) {
    const proj = spawnProjectile(this, type, x + dir.x * 14, y + dir.y * 14, dir);
    this.projectiles.add(proj);
  }

  onPlayerEnemyContact(enemy) {
    if (enemy.dead || enemy.selfManagedContact) return;
    const now = this.time.now;
    if (now < (enemy.hitCooldownUntil || 0)) return;
    if (this.player.isInvulnerable(now)) return;
    enemy.hitCooldownUntil = now + 700;
    this.player.takeDamage(enemy.contactDamage, enemy.x, enemy.y, now);
  }

  onPlayerPickup(item) {
    const id = item.itemType === 'chest' ? item.containedItemId : item.itemType;
    const def = ITEMS[id];
    if (!def) {
      item.destroy();
      return;
    }
    if (item.itemType === 'chest') Sfx.chestOpen();
    else Sfx.pickup();
    this.player.pickUp(id, def);
    item.destroy();
  }

  onGateOverlap() {
    if (this.inBossRoom) return;
    if (this.outdoorEnemyCount > 0) {
      const now = this.time.now;
      if (!this._gateWarnAt || now - this._gateWarnAt > 1500) {
        this._gateWarnAt = now;
        this.events.emit('toast', this.cfg.gateWarnText);
      }
      return;
    }
    this.enterBossArena();
  }

  enterBossArena() {
    if (this.inBossRoom) return;
    this.inBossRoom = true;
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(210, () => {
      this.player.setPosition(ARENA_ENTRANCE.x, ARENA_ENTRANCE.y);
      this.player.setVelocity(0, 0);
      this.physics.world.setBounds(ARENA_X, ARENA_Y, ARENA_W, ARENA_H);
      this.cameras.main.setBounds(ARENA_X, ARENA_Y, ARENA_W, ARENA_H);
      this.boss = new this.cfg.BossClass(this, BOSS_SPAWN.x, BOSS_SPAWN.y);
      this.enemies.add(this.boss);
      this.attachShadow(this.boss, { scaleX: 1.6, alpha: 0.6, yOffset: 18 });
      this.cameras.main.fadeIn(250, 0, 0, 0);
      this.cameras.main.shake(180, 0.006);
      this.events.emit('toast', this.cfg.arenaGreeting);
      Sfx.gateOpen();
    });
  }

  onEnemyDied(enemy) {
    if (enemy.isOutdoor) {
      this.outdoorEnemyCount -= 1;
      if (this.outdoorEnemyCount <= 0) {
        this.events.emit('toast', 'Die Wachen sind vertrieben! Das Torhaus steht offen.');
      }
    }
    this.tryDropLoot(enemy);
  }

  tryDropLoot(enemy) {
    if (enemy === this.boss) return; // the boss has its own defeat flow
    // Silver drop: always applies for regular enemies. Difficulty scales
    // the raw silverDrop by silverMult so Easy runs feel richer and Hard
    // runs feel scarce.
    const diff = getDifficulty(this.registry);
    if (enemy.silverDrop > 0) {
      const amount = Math.max(1, Math.round(enemy.silverDrop * diff.silverMult));
      addSilver(this.registry, amount);
      this.spawnCoinPop(enemy.x, enemy.y, 'coin_silver', `+${amount}`);
    }
    // Item drop chance also scaled by difficulty (Easy 0.55, Hard 0.25).
    if (Math.random() > diff.lootChance) return;
    const id = Phaser.Utils.Array.GetRandom(this.cfg.lootTable);
    const sprite = spawnPickup(this, id, enemy.x, enemy.y);
    this.pickups.add(sprite);
  }

  // Coin "pop" VFX: a coin icon floats up from the enemy's death spot and
  // fades, with the amount as a floating number next to it. Purely visual,
  // the actual currency is added instantly.
  spawnCoinPop(x, y, textureKey, text) {
    const coin = this.add.image(x, y, textureKey).setDepth(y + 20).setDisplaySize(14, 14);
    const label = this.add
      .text(x + 10, y, text, {
        fontFamily: 'Courier New',
        fontSize: '10px',
        color: textureKey === 'coin_gold' ? '#f6d97a' : '#dfe6f0',
        stroke: '#000',
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5)
      .setDepth(y + 21);
    this.tweens.add({
      targets: [coin, label],
      y: y - 22,
      alpha: 0,
      duration: 800,
      onComplete: () => {
        coin.destroy();
        label.destroy();
      },
    });
  }

  onBossThrowVeggie({ fromX, fromY, toX, toY }) {
    const veg = this.physics.add.sprite(fromX, fromY, 'veggie');
    veg.body.setAllowGravity(false);
    this.tweens.add({
      targets: veg,
      x: toX,
      y: toY,
      duration: 450,
      onComplete: () => {
        const now = this.time.now;
        const d = Phaser.Math.Distance.Between(toX, toY, this.player.x, this.player.y);
        if (d < 26 && !this.player.isInvulnerable(now)) {
          this.player.takeDamage(1, toX, toY, now);
        }
        landProjectile(this, { x: toX, y: toY, itemType: 'barrel', destroy: () => veg.destroy() });
      },
    });
  }

  onBossCallGuards({ x, y }) {
    const spawnX = Phaser.Math.Clamp(x + Phaser.Math.Between(-60, 60), ARENA_X + 40, ARENA_X + ARENA_W - 40);
    const spawnY = Phaser.Math.Clamp(y + Phaser.Math.Between(-40, 40), ARENA_Y + 40, ARENA_Y + ARENA_H - 40);
    const guard = new Halberdier(this, spawnX, spawnY);
    guard.isOutdoor = false;
    this.enemies.add(guard);
    this.events.emit('toast', 'Ein verwirrter Wachposten stolpert in die Arena!');
  }

  onBossGroundSlam({ x, y }) {
    const ring = this.add.circle(x, y, 10, 0xdfe4ea, 0).setStrokeStyle(3, 0xdfe4ea, 0.85).setDepth(50);
    this.tweens.add({
      targets: ring,
      radius: 95,
      alpha: 0,
      duration: 380,
      onComplete: () => ring.destroy(),
    });
  }

  onSapperBomb({ x, y }) {
    const bomb = this.physics.add.sprite(x, y, 'bomb');
    bomb.body.setAllowGravity(false);
    bomb.body.moves = false;
    this.tweens.add({ targets: bomb, scale: { from: 1, to: 1.18 }, duration: 200, yoyo: true, repeat: 5 });
    this.time.delayedCall(1300, () => {
      bomb.destroy();
      this.explodeBomb(x, y);
    });
  }

  explodeBomb(x, y) {
    const flash = this.add.circle(x, y, 8, 0xffb347, 0.85).setDepth(50);
    this.tweens.add({ targets: flash, radius: 70, alpha: 0, duration: 380, onComplete: () => flash.destroy() });
    this.cameras.main.shake(150, 0.004);
    Sfx.hit();

    const now = this.time.now;
    const RADIUS = 62;
    if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < RADIUS && !this.player.isInvulnerable(now)) {
      this.player.takeDamage(1, x, y, now);
    }
    this.enemies.getChildren().forEach((enemy) => {
      if (enemy.dead) return;
      if (Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) < RADIUS) {
        enemy.takeDamage(2, x, y, now);
      }
    });
  }

  onPlayerGrapple({ x, y, dir, target }) {
    const endX = target ? target.x : x + dir.x * 60;
    const endY = target ? target.y : y + dir.y * 60;
    const line = this.add.line(0, 0, x, y, endX, endY, 0xf5cf4a, 0.8).setLineWidth(2).setOrigin(0, 0).setDepth(40);
    this.tweens.add({ targets: line, alpha: 0, duration: 180, onComplete: () => line.destroy() });
  }

  onBossDied() {
    this.registry.set(`conquered_${this.islandKey}`, true);
    this.events.emit('toast', this.cfg.victoryText);
    Sfx.bossDefeat();
    // Gold drop: bosses reward 1 gold coin (before difficulty). Easy adds
    // a bonus so easy runs feel especially generous, Hard trims it.
    const diff = getDifficulty(this.registry);
    const goldAmount = diff.id === 'easy' ? 2 : diff.id === 'hard' ? 1 : 1;
    addGold(this.registry, goldAmount);
    this.spawnCoinPop(this.boss.x, this.boss.y - 12, 'coin_gold', `+${goldAmount}`);
    const potion = spawnPickup(this, 'potion_medium', this.boss.x, this.boss.y);
    this.pickups.add(potion);
    this.time.delayedCall(2200, () => this.showVictoryPrompt());
  }

  showVictoryPrompt() {
    const cam = this.cameras.main;
    const text = this.add
      .text(cam.width / 2, cam.height / 2, `${this.cfg.displayName.toUpperCase()} EROBERT!\n[Leertaste] zurück zum Boot`, {
        fontFamily: 'Georgia, serif',
        fontSize: '20px',
        color: '#fff6d8',
        stroke: '#000',
        strokeThickness: 5,
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(300);
    this.input.keyboard.once('keydown-SPACE', () => {
      text.destroy();
      this.scene.stop('UI');
      this.scene.start('Sailing');
    });
  }

  onPlayerDied() {
    this.events.emit('toast', 'Rüdiger fällt... aber Legenden sterben nicht endgültig.');
    this.time.delayedCall(1500, () => {
      const cam = this.cameras.main;
      const text = this.add
        .text(cam.width / 2, cam.height / 2, 'GAME OVER\n[Leertaste] Neustart', {
          fontFamily: 'Georgia, serif',
          fontSize: '22px',
          color: '#ff9d9d',
          stroke: '#000',
          strokeThickness: 5,
          align: 'center',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(300);
      this.input.keyboard.once('keydown-SPACE', () => {
        text.destroy();
        this.scene.restart();
      });
    });
  }

  update(time, delta) {
    this.player.setDepth(this.player.y);
    this.player.sword.setDepth(this.player.y + 1);
    this.enemies.getChildren().forEach((enemy) => {
      enemy.setDepth(enemy.y);
      if (enemy.weapon) enemy.weapon.setDepth(enemy.y + 1);
      if (enemy.shield) enemy.shield.setDepth(enemy.y + 1);
      if (enemy.exclaim) enemy.exclaim.setDepth(enemy.y + 2);
    });

    // Sync shadows with their actors. Shadow renders just below the sprite in
    // the depth stack (actor.y - 1) so it stays above the ground but under the
    // sprite itself. Shrinks and dims briefly while the actor is airborne
    // (dodge / grapple) so movement reads better.
    if (this.actorShadows) {
      this.actorShadows.forEach((entry, actor) => {
        if (!actor || actor.dead || !actor.active) {
          entry.shadow.destroy();
          this.actorShadows.delete(actor);
          return;
        }
        entry.shadow.setPosition(actor.x, actor.y + entry.yOffset);
        entry.shadow.setDepth(actor.y - 1);
        const airborne = actor.dodging || actor.grappling;
        entry.shadow.setAlpha(airborne ? 0.28 : (entry.baseAlpha ?? 0.55));
        entry.shadow.setScale((entry.baseScale ?? 1) * (airborne ? 0.75 : 1), airborne ? 0.75 : 1);
      });
    }

    this.fogZones.forEach((zone) => {
      this.enemies.getChildren().forEach((enemy) => {
        if (enemy.dead) return;
        if (Phaser.Math.Distance.Between(zone.x, zone.y, enemy.x, enemy.y) < zone.radius) {
          enemy.confusedUntil = time + 300;
        }
      });
    });

    this.projectiles.getChildren().slice().forEach((proj) => {
      if (proj.hit) return;
      proj.life -= delta;
      if (proj.life <= 0) {
        proj.hit = true;
        landProjectile(this, proj);
      }
    });
  }
}
