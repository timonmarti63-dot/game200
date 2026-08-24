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

const T = 32;

// The island is built as concentric rings: open water (outer), a walkable
// sand beach (1 tile), then the grass interior. OFFSET is the water+sand
// margin; FX/FY convert the old field-local layout (castle, path, spawns)
// into absolute world coordinates, shifted right to make room for a village.
const OFFSET = 96;
const BEACH_MARGIN = 32;
// Bigger island: village is now a real 20-tile-wide strip and the field
// grows to 48x36 so exploration takes real time. This also makes room
// for the arena-on-hill terrace at the top-right corner.
const VILLAGE_W = 20 * T;
const FIELD_W = 48 * T;
const FIELD_H = 36 * T;
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

// The castle now sits at the far NORTH of the field, on the elevated
// terrace ("arena hill"). Its bottom row is the gatehouse that faces
// south so the player approaches it up the path.
const CASTLE_LOCAL_COL = 16;
const CASTLE_LOCAL_ROW = 3;
const CASTLE_ORIGIN_X = FX(CASTLE_LOCAL_COL * T);
const CASTLE_ORIGIN_Y = FY(CASTLE_LOCAL_ROW * T);
const CASTLE_COLS = 10;
const CASTLE_ROWS = 6;
const GATE_GAP = new Set(['4,5', '5,5']);
const GATE_GAP_COLS = [4, 5];
const GATE_ZONE = { x: CASTLE_ORIGIN_X + 4.5 * T, y: CASTLE_ORIGIN_Y + 5 * T };

// The path spine runs from the harbor at the bottom, past the village,
// through the field, and up the elevation ramp to the gate.
const PATH_COL_A = 22;
const PATH_COL_B = 23;
// The player now spawns on the dock instead of a random path tile, so
// they visibly "disembark" from the boat.
const PLAYER_START = { x: HARBOR_X, y: HARBOR_Y - 8 };

// Elevation terrace: a raised plateau at the north of the field that
// hosts the arena and connects to the field via a single central ramp.
const ELEVATION_ROW = 8; // bottom edge of the terrace in field-local rows
const ELEVATION_RAMP_COLS = [PATH_COL_A - 16, PATH_COL_B - 16]; // ramp gap

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

    // path: village spine + castle approach
    const fieldRows = FIELD_H / T;
    for (let r = 8; r < fieldRows; r++) {
      this.add.image(FX(PATH_COL_A * T + 16), FY(r * T + 16), cfg.pathTile);
      this.add.image(FX(PATH_COL_B * T + 16), FY(r * T + 16), cfg.pathTile);
    }
    const villageRows = GRASS_H / T;
    for (let vr = 0; vr < villageRows; vr++) {
      this.add.image(VX(4 * T + 16), FY(vr * T + 16), cfg.pathTile);
      this.add.image(VX(5 * T + 16), FY(vr * T + 16), cfg.pathTile);
    }

    this.walls = this.physics.add.staticGroup();
    this.buildWallVisuals(CASTLE_ORIGIN_X, CASTLE_ORIGIN_Y, CASTLE_COLS, CASTLE_ROWS, GATE_GAP);
    this.buildWallVisuals(ARENA_X, ARENA_Y, ARENA_COLS, ARENA_ROWS, null);
    this.buildWallRing(CASTLE_ORIGIN_X, CASTLE_ORIGIN_Y, CASTLE_COLS, CASTLE_ROWS, GATE_GAP_COLS);
    this.buildWallRing(ARENA_X, ARENA_Y, ARENA_COLS, ARENA_ROWS, null);

    this.gateZone = this.add.zone(GATE_ZONE.x, GATE_ZONE.y, 70, 34);
    this.physics.add.existing(this.gateZone);
    this.gateZone.body.setAllowGravity(false);
    this.gateZone.body.moves = false;

    const startX = this.returningFromInterior && this.spawnX ? this.spawnX : PLAYER_START.x;
    const startY = this.returningFromInterior && this.spawnY ? this.spawnY : PLAYER_START.y;
    this.player = new Player(this, startX, startY);
    this.attachShadow(this.player, { scaleX: 1, alpha: 0.55 });
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.enemies = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.houses = [];

    if (cfg.hasVillage) this.buildVillage();
    else this.buildMineCamp();
    // Elevation terrace: draws a horizontal ridge of stone-wall tiles
    // across the field so the arena visually sits on higher ground. A
    // single ramp lets the path through - collision is added along the
    // rest of the ridge so the player is forced to go through the ramp.
    this.buildElevationTerrace();
    // Harbor: a wooden dock at the bottom-centre where the boat lands.
    this.buildHarbor();
    this.spawnOutdoorEncounter();
    this.spawnOutdoorPickups();
    this.scatterDecorations();

    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.projectiles, this.walls, (proj) => landProjectile(this, proj));

    this.physics.add.overlap(this.player, this.enemies, (player, enemy) => this.onPlayerEnemyContact(enemy));
    this.physics.add.overlap(this.player, this.pickups, (player, item) => this.onPlayerPickup(item));
    this.physics.add.overlap(this.player, this.gateZone, () => this.onGateOverlap());
    this.physics.add.overlap(this.projectiles, this.enemies, (proj, enemy) => resolveProjectileHitEnemy(this, proj, enemy));

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
  }

  // Village = a proper little cluster: apothecary + smith at the top so
  // the player passes them first coming from the harbor path, four
  // cottages arranged around a central well, and an inn/stone house at
  // the back. Winding paths connect them so it reads as a village, not a
  // random line of buildings. Shop houses get door interaction zones
  // that hand the scene off to InteriorScene when overlapped.
  buildVillage() {
    // Well at the visual centre of the village strip.
    const wellX = VX(VILLAGE_W / 2);
    const wellY = FY(FIELD_H / 2);

    // Paint a spider-web of dirt paths between well, harbor, houses and
    // the exit into the field. This is purely visual - the collision is
    // per-house.
    const cfg = this.cfg;
    const paintPath = (x0, y0, x1, y1) => {
      const steps = Math.max(4, Math.round(Phaser.Math.Distance.Between(x0, y0, x1, y1) / (T / 2)));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = Math.round((x0 + (x1 - x0) * t) / T) * T + T / 2;
        const y = Math.round((y0 + (y1 - y0) * t) / T) * T + T / 2;
        this.add.image(x, y, cfg.pathTile).setDepth(0.5);
      }
    };

    // Layout: coordinates are local to the village strip (VX/FY-wrapped).
    const houses = [
      // Two shops right on the main path so they're findable.
      { key: 'house_apothecary', x: VX(200), y: FY(220), colW: 56, colH: 22, shop: 'apothecary', label: 'Apotheke' },
      { key: 'house_smith',      x: VX(440), y: FY(220), colW: 60, colH: 24, shop: 'smith',      label: 'Schmiede' },
      // Cottages arranged around the well.
      { key: 'house_cottage_a',  x: VX(120), y: FY(500), colW: 48, colH: 20 },
      { key: 'house_cottage_b',  x: VX(240), y: FY(620), colW: 52, colH: 22 },
      { key: 'house_cottage_a',  x: VX(430), y: FY(500), colW: 48, colH: 20 },
      { key: 'house_cottage_b',  x: VX(540), y: FY(620), colW: 52, colH: 22 },
      // Back-of-village landmarks.
      { key: 'house_stone',      x: VX(90),  y: FY(820), colW: 40, colH: 18 },
      { key: 'house_inn',        x: VX(460), y: FY(880), colW: 60, colH: 24 },
    ];

    // Paths: from harbor spine up through village into field.
    paintPath(wellX, wellY, VX(200), FY(240));
    paintPath(wellX, wellY, VX(440), FY(240));
    paintPath(wellX, wellY, VX(240), FY(600));
    paintPath(wellX, wellY, VX(430), FY(500));
    paintPath(wellX, wellY, VX(540), FY(600));
    paintPath(wellX, wellY, VX(460), FY(860));

    // Well decoration + collision.
    const well = this.add.image(wellX, wellY, 'well').setOrigin(0.5, 1).setDepth(wellY - 1);
    this.houses.push(well);
    const wellRect = this.add.rectangle(wellX, wellY - 20, 22, 22, 0, 0);
    this.physics.add.existing(wellRect, true);
    this.walls.add(wellRect);

    // Door interaction zone group. Overlapping + [E] opens InteriorScene.
    this.doorZones = [];

    houses.forEach(({ key, x, y, colW, colH, shop, label }) => {
      const img = this.add.image(x, y, key).setOrigin(0.5, 1);
      img.setDepth(y - 1);
      // Collision on the building's footprint - a wide, shallow rectangle
      // just below the sprite's baseline so the player can walk right up
      // to the door but not through the walls.
      const rect = this.add.rectangle(x, y - colH / 2, colW, colH, 0, 0);
      this.physics.add.existing(rect, true);
      this.walls.add(rect);
      this.houses.push(img);

      if (shop) {
        // Door zone sits just in front of the door - small so the toast
        // triggers only when the player is actually next to it.
        const zone = this.add.zone(x, y + 6, 28, 20);
        this.physics.add.existing(zone, true);
        zone.shopKind = shop;
        zone.homeX = x;
        zone.homeY = y + 20;
        this.doorZones.push(zone);

        // Sign in front of the door.
        this.add
          .text(x, y + 20, label, {
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

    // Overlap: whenever the player stands on a shop door zone, show a
    // little "press E" prompt. Actual entry is handled by a keydown-E
    // listener that checks overlap on demand.
    if (this.doorZones.length) {
      this.doorZones.forEach((zone) => {
        this.physics.add.overlap(this.player, zone, () => this.setNearDoor(zone));
      });
      this.input.keyboard.on('keydown-E', () => this.tryEnterDoor());
    }
  }

  setNearDoor(zone) {
    // Called every frame the player overlaps the zone. We latch the
    // "currently near" pointer and clear it in the next update tick.
    this._nearDoor = zone;
    this._nearDoorFrame = this.time.now;
  }

  tryEnterDoor() {
    // The [E] key is also bound to inventory-open in Player. We only
    // hijack it when the player is actively next to a door AND no
    // modal is open, so opening the shop and opening the inventory
    // don't fight over the same key.
    if (!this._nearDoor) return;
    // Ignore stale overlap (older than 100ms).
    if (this.time.now - (this._nearDoorFrame || 0) > 120) {
      this._nearDoor = null;
      return;
    }
    const zone = this._nearDoor;
    this._nearDoor = null;
    // Fade out then swap to interior.
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.time.delayedCall(200, () => {
      this.scene.stop('UI');
      this.scene.start('Interior', {
        kind: zone.shopKind,
        returnScene: 'Island',
        returnX: zone.homeX,
        returnY: zone.homeY,
      });
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
        const img = this.add.image(worldX, worldY, key);
        if (key === 'flowers') {
          img.setOrigin(0.5, 0.6).setDepth(2);
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
