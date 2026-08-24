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
import { scheduleCloudSave } from '../systems/CloudSave.js';

const T = 32;

// The island is built as concentric rings: open water (outer), a walkable
// sand beach (1 tile), then the grass interior. OFFSET is the water+sand
// margin; FX/FY convert the old field-local layout (castle, path, spawns)
// into absolute world coordinates, shifted right to make room for a village.
const OFFSET = 96;
const BEACH_MARGIN = 32;
const VILLAGE_W = 10 * T;
const FIELD_W = 36 * T;
const FIELD_H = 27 * T;
const GRASS_W = VILLAGE_W + FIELD_W;
const GRASS_H = FIELD_H;
const OUTDOOR_W = GRASS_W + OFFSET * 2;
const OUTDOOR_H = GRASS_H + OFFSET * 2;

const FX = (x) => OFFSET + VILLAGE_W + x;
const FY = (y) => OFFSET + y;
const VX = (x) => OFFSET + x; // village-strip local -> absolute (shares the y axis with FY)

const CASTLE_LOCAL_COL = 11;
const CASTLE_LOCAL_ROW = 3;
const CASTLE_ORIGIN_X = FX(CASTLE_LOCAL_COL * T);
const CASTLE_ORIGIN_Y = FY(CASTLE_LOCAL_ROW * T);
const CASTLE_COLS = 8;
const CASTLE_ROWS = 5;
const GATE_GAP = new Set(['3,4', '4,4']);
const GATE_GAP_COLS = [3, 4];
const GATE_ZONE = { x: CASTLE_ORIGIN_X + 3.5 * T, y: CASTLE_ORIGIN_Y + 4 * T };

const PATH_COL_A = 14;
const PATH_COL_B = 15;
const PLAYER_START = { x: FX(PATH_COL_A * T + 32), y: FY(FIELD_H - 32) };

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
    decorations: [
      'tree', 'tree', 'tree', 'bush', 'bush', 'bush', 'rock', 'rock',
      'flowers', 'flowers', 'flowers', 'flowers', 'mushroom', 'reeds', 'butterfly',
    ],
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
    hintText: 'Rübenfeld: räum das Feld, dann durchs Tor zu Baron Rudibert. [E] Inventar',
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
    decorations: ['pine_tree', 'pine_tree', 'pine_tree', 'rock', 'rock', 'rock', 'pine_tree', 'rock', 'mushroom', 'tidepool'],
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
    hintText: 'Eisenklamm: räum die Minenwachen, dann durchs Tor zu Eisenherzog Grendal. [E] Inventar',
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
  }

  create() {
    const cfg = this.cfg;
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

    this.waterBase = this.add.tileSprite(0, 0, OUTDOOR_W, OUTDOOR_H, 'tile_water').setOrigin(0, 0);
    this.waterShimmer = this.add
      .tileSprite(0, 0, OUTDOOR_W, OUTDOOR_H, 'tile_water')
      .setOrigin(0, 0)
      .setAlpha(0.3)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.add
      .tileSprite(
        OFFSET - BEACH_MARGIN,
        OFFSET - BEACH_MARGIN,
        GRASS_W + BEACH_MARGIN * 2,
        GRASS_H + BEACH_MARGIN * 2,
        cfg.beachTile
      )
      .setOrigin(0, 0);
    this.buildCoastFoam();
    this.add.tileSprite(OFFSET, OFFSET, GRASS_W, GRASS_H, cfg.groundTile).setOrigin(0, 0);

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

    this.player = new Player(this, PLAYER_START.x, PLAYER_START.y);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.enemies = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.houses = [];

    if (cfg.hasVillage) this.buildVillage();
    else this.buildMineCamp();
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

  buildVillage() {
    const houses = [
      { key: 'house_stone', x: VX(60), y: FY(140), colW: 34, colH: 18 },
      { key: 'house_timber', x: VX(220), y: FY(340), colW: 42, colH: 20 },
      { key: 'house_inn', x: VX(70), y: FY(560), colW: 56, colH: 22 },
    ];
    houses.forEach(({ key, x, y, colW, colH }) => {
      const img = this.add.image(x, y, key).setOrigin(0.5, 1);
      img.setDepth(y - 1);
      const rect = this.add.rectangle(x, y - colH / 2, colW, colH, 0x000000, 0);
      this.physics.add.existing(rect, true);
      this.walls.add(rect);
      this.houses.push(img);
    });
  }

  // A lapping-tide foam ring around the whole coastline (where sand meets
  // open water), built from 4 rotated strips of the same tileable texture
  // and scrolled in update() for motion instead of a static line.
  buildCoastFoam() {
    const x0 = OFFSET - BEACH_MARGIN;
    const y0 = OFFSET - BEACH_MARGIN;
    const w = GRASS_W + BEACH_MARGIN * 2;
    const h = GRASS_H + BEACH_MARGIN * 2;
    const strip = (cx, cy, length, angle) =>
      this.add.tileSprite(cx, cy, length, 14, 'tile_foam').setAngle(angle).setDepth(3).setAlpha(0.85);
    this.foamStrips = [
      strip(x0 + w / 2, y0, w, 0),
      strip(x0 + w / 2, y0 + h, w, 0),
      strip(x0, y0 + h / 2, h, 90),
      strip(x0 + w, y0 + h / 2, h, 90),
    ];
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
        if (key === 'flowers' || key === 'tidepool') {
          img.setOrigin(0.5, 0.6).setDepth(2);
        } else if (key === 'butterfly') {
          img.setOrigin(0.5, 0.5).setDepth(2);
          this.tweens.add({ targets: img, y: worldY - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
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
        this.outdoorEnemyCount++;
      });
    });
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
    const dirVec = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
    this.enemies.getChildren().forEach((enemy) => {
      if (enemy.dead) return;
      const toEnemy = new Phaser.Math.Vector2(enemy.x - this.player.x, enemy.y - this.player.y);
      const dist = toEnemy.length();
      if (dist > range + 18) return;
      toEnemy.normalize();
      if (dirVec.dot(toEnemy) > 0.3) {
        enemy.takeDamage(damage, this.player.x, this.player.y, this.time.now);
      }
    });
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
      this.cameras.main.fadeIn(250, 0, 0, 0);
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
    if (Math.random() > 0.35) return;
    const id = Phaser.Utils.Array.GetRandom(this.cfg.lootTable);
    const sprite = spawnPickup(this, id, enemy.x, enemy.y);
    this.pickups.add(sprite);
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
    scheduleCloudSave(this.registry);
    this.events.emit('toast', this.cfg.victoryText);
    Sfx.bossDefeat();
    const potion = spawnPickup(this, 'potion', this.boss.x, this.boss.y);
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
    this.waterBase.tilePositionX += delta * 0.012;
    this.waterBase.tilePositionY += delta * 0.008;
    this.waterShimmer.tilePositionX -= delta * 0.02;
    this.waterShimmer.tilePositionY += delta * 0.015;
    this.foamStrips.forEach((s, i) => {
      s.tilePositionX += delta * 0.02 * (i % 2 === 0 ? 1 : -1);
    });

    this.player.setDepth(this.player.y);
    this.player.sword.setDepth(this.player.y + 1);
    this.enemies.getChildren().forEach((enemy) => {
      enemy.setDepth(enemy.y);
      if (enemy.weapon) enemy.weapon.setDepth(enemy.y + 1);
      if (enemy.shield) enemy.shield.setDepth(enemy.y + 1);
      if (enemy.exclaim) enemy.exclaim.setDepth(enemy.y + 2);
    });

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
