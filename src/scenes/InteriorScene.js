import Phaser from 'phaser';
import Player from '../entities/Player.js';
import { Sfx } from '../systems/Sfx.js';
import { WalkableGrid, CELL } from '../systems/Grid.js';

const T = 32;
const ROOM_W = 15 * T; // 480
const ROOM_H = 10 * T; // 320

// A single Pokemon-style interior template. The shop kind decides which
// shopkeeper stands behind the counter, which title reads on the sign,
// and which stock the ShopScene shows when we open it.
const INTERIOR_CONFIG = {
  apothecary: {
    displayName: 'Apotheke der Alchemistin Ilse',
    sign: 'Apotheke',
    shopkeeper: 'shopkeeper_potion',
    counterColor: 0x6f4a25,
    wallColor: 0x8f5c33,
    shopKind: 'apothecary',
    greeting: '"Willkommen! Ein Fläschchen Mut gefällig?"',
  },
  smith: {
    displayName: 'Waffen- und Rüstungsschmied Bartolo',
    sign: 'Schmiede',
    shopkeeper: 'shopkeeper_smith',
    counterColor: 0x4a4a4a,
    wallColor: 0x5c5148,
    shopKind: 'smith',
    greeting: '"Härtestes Eisen, faireste Preise. Was darf\'s sein?"',
  },
};

// Scenes track their own instance so IslandScene can query it via key.
// The InteriorScene is single-instance and reused across shops - it
// rebuilds itself in create() from init() data.
export default class InteriorScene extends Phaser.Scene {
  constructor() {
    super('Interior');
  }

  init(data) {
    this.interiorKind = data?.kind ?? 'apothecary';
    // returnScene tells the door where to send the player back.
    this.returnScene = data?.returnScene ?? 'Island';
    this.returnX = data?.returnX ?? 240;
    this.returnY = data?.returnY ?? 160;
  }

  create() {
    const cfg = INTERIOR_CONFIG[this.interiorKind] ?? INTERIOR_CONFIG.apothecary;
    this.cfg = cfg;

    this.cameras.main.setBackgroundColor('#1b1210');
    this.physics.world.setBounds(0, 0, ROOM_W, ROOM_H);

    // Grid für Innenraum (Pokemon-Stil): 15x10 Kacheln. Alle Wandkacheln
    // äusserlich sind WALL, die Türkachel unten mittig ist DOOR (Warp
    // zurück zur Insel).
    const cols = Math.ceil(ROOM_W / T);
    const rows = Math.ceil(ROOM_H / T);
    this.walkableGrid = new WalkableGrid(cols, rows, T);
    // Äussere Wände als WALL. Oben (Reihen 0,1) sind Wand+Fenster,
    // unten (Reihe rows-1) auch Wand ausser Türkachel.
    for (let c = 0; c < cols; c++) {
      this.walkableGrid.set(c, 0, CELL.WALL);
      this.walkableGrid.set(c, 1, CELL.WALL); // Wand mit Bildern/Fenstern
      this.walkableGrid.set(c, rows - 1, CELL.WALL);
    }
    for (let r = 0; r < rows; r++) {
      this.walkableGrid.set(0, r, CELL.WALL);
      this.walkableGrid.set(cols - 1, r, CELL.WALL);
    }
    // Türkachel: unten mittig - Warp zurück zur Insel.
    const doorCol = Math.floor(cols / 2);
    const doorRow = rows - 1;
    this.walkableGrid.addWarp(doorCol, doorRow, {
      kind: 'exit',
      returnScene: this.returnScene,
      returnX: this.returnX,
      returnY: this.returnY,
    });
    // Ladentheke (Zeile 4-5) als WALL - blockiert.
    const counterRow = 4;
    for (let c = 2; c < cols - 2; c++) {
      this.walkableGrid.set(c, counterRow, CELL.WALL);
    }

    // Wooden floor - tiled 32x32.
    this.add.tileSprite(ROOM_W / 2, ROOM_H / 2, ROOM_W, ROOM_H, 'tile_floor_wood').setDepth(0);

    // Warm floor rug down the middle for a Pokemon-style focal walkway.
    this.add.image(ROOM_W / 2, ROOM_H - 90, 'furn_rug').setDepth(0.5);

    // Wooden walls framing the room. Top strip is thicker; the trim
    // lines give the classic Pokemon interior "deep back wall" look.
    this.add.rectangle(ROOM_W / 2, T, ROOM_W, 2 * T, cfg.wallColor, 1).setDepth(1);
    this.add.rectangle(ROOM_W / 2, T, ROOM_W, 2, 0x2a1a10, 1).setDepth(1);
    this.add.rectangle(ROOM_W / 2, 2 * T + 1, ROOM_W, 2, 0x2a1a10, 1).setDepth(1);

    // Framed painting hangs above the counter as a wall decoration.
    this.add.image(ROOM_W / 2, 20, 'furn_painting').setDepth(1.1);

    // Furniture along the walls creates a lived-in Pokemon-style room.
    // Left wall: bookshelf + potted plant.
    this.add.image(60, 62, 'furn_bookshelf').setOrigin(0.5, 0.5).setDepth(1.5);
    this.add.image(60, ROOM_H - 100, 'furn_plant_pot').setOrigin(0.5, 0.5).setDepth(ROOM_H - 100 + 0.5);
    // Right wall: kitchen bench (only in apothecary) or crate stack (smith).
    if (cfg.shopKind === 'apothecary') {
      this.add.image(ROOM_W - 80, 58, 'furn_kitchen').setOrigin(0.5, 0.5).setDepth(1.5);
      this.add.image(ROOM_W - 60, ROOM_H - 110, 'furn_plant_pot').setOrigin(0.5, 0.5).setDepth(ROOM_H - 110 + 0.5);
    } else {
      // Smith - stack a few crates + an anvil-suggesting square
      this.add.image(ROOM_W - 50, 60, 'furn_crate').setDepth(1.5);
      this.add.image(ROOM_W - 90, 68, 'furn_crate').setDepth(1.6);
      this.add.image(ROOM_W - 65, ROOM_H - 110, 'furn_crate').setDepth(ROOM_H - 110 + 0.5);
    }
    // A round table with an item sits in a front corner for warmth.
    this.add.image(80, ROOM_H - 70, 'furn_table_round').setOrigin(0.5, 0.5).setDepth(ROOM_H - 70 + 0.5);
    // An armchair opposite the table.
    this.add.image(ROOM_W - 90, ROOM_H - 68, 'furn_armchair').setOrigin(0.5, 0.5).setDepth(ROOM_H - 68 + 0.5);

    // A trio of decorative shelves along the back wall (potions or weapons).
    const shelfTexture = cfg.shopKind === 'apothecary' ? 'potion' : 'sword';
    const shelfAlt = cfg.shopKind === 'apothecary' ? 'potion_medium' : 'warhammer';
    for (let i = 0; i < 3; i++) {
      const sx = 130 + i * 75;
      const sy = 40;
      this.add.rectangle(sx, sy, 60, 5, 0x3a2818, 1).setDepth(2);
      this.add.image(sx - 14, sy - 11, shelfTexture).setDepth(3);
      this.add.image(sx + 14, sy - 13, shelfAlt).setDepth(3);
    }

    // Counter running horizontally at 60% height.
    const counterY = ROOM_H * 0.55;
    // Compact Pokemon-style counter with a warm top and darker front.
    this.counter = this.add.rectangle(ROOM_W / 2, counterY, ROOM_W - 240, 14, cfg.counterColor, 1).setStrokeStyle(2, 0x1a0f08).setDepth(2);
    // Counter front (darker strip) sold as a 3D-ish base.
    this.add.rectangle(ROOM_W / 2, counterY + 8, ROOM_W - 240, 4, 0x2a1810, 1).setDepth(2.1);

    // Shopkeeper standing behind the counter.
    this.shopkeeper = this.add.image(ROOM_W / 2, counterY - 22, cfg.shopkeeper).setDepth(3);
    // Gentle idle bob so the NPC doesn't look frozen.
    this.tweens.add({
      targets: this.shopkeeper,
      y: counterY - 24,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Sign above the shopkeeper naming the shop.
    this.add
      .text(ROOM_W / 2, 12, cfg.sign, {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: '#f5cf4a',
        stroke: '#2a1a08',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(4);

    // Greeting line just below the counter for atmosphere.
    this.add
      .text(ROOM_W / 2, counterY + 22, cfg.greeting, {
        fontFamily: 'Georgia, serif',
        fontSize: '11px',
        color: '#f2e6c8',
        stroke: '#000',
        strokeThickness: 3,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(4);

    // Door back to the island: a rectangle at the bottom centre. Stepping
    // on it launches the exit routine. A visible door frame draws over it.
    const doorX = ROOM_W / 2;
    const doorY = ROOM_H - 12;
    this.add.rectangle(doorX, doorY, 40, 24, 0x2a1810, 1).setStrokeStyle(2, 0x0f0805).setDepth(2);
    this.add
      .text(doorX, doorY - 34, '↓ Ausgang', {
        fontFamily: 'Courier New',
        fontSize: '10px',
        color: '#cfd8e6',
      })
      .setOrigin(0.5)
      .setDepth(4);
    this.exitZone = this.add.zone(doorX, doorY, 40, 28);
    this.physics.add.existing(this.exitZone, true);

    // Interact zone on the counter - overlapping and pressing E opens the shop.
    this.interactZone = this.add.zone(ROOM_W / 2, counterY + 6, ROOM_W - 140, 40);
    this.physics.add.existing(this.interactZone, true);

    // Spawn the player just below the counter (Grid-Mitte) so they don't
    // spawn on the exit door and immediately re-trigger the island warp.
    const spawn = this.walkableGrid.cellToWorld(doorCol, doorRow - 2);
    this.player = new Player(this, spawn.x, spawn.y);
    this._warpGraceUntil = this.time.now + 700;
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setBounds(0, 0, ROOM_W, ROOM_H);
    this.cameras.main.setZoom(1);

    this.physics.add.overlap(this.player, this.exitZone, () => this.returnToIsland());

    // E to interact - only fires if the player stands in the counter zone.
    // Guarded by a small cooldown so re-entering the shop doesn't spam it.
    this.interactCooldownUntil = 0;
    this.input.keyboard.on('keydown-E', () => {
      if (this.time.now < this.interactCooldownUntil) return;
      if (this.scene.isActive('Shop')) return;
      if (!this.physics.overlap(this.player, this.interactZone)) return;
      this.interactCooldownUntil = this.time.now + 400;
      this.scene.launch('Shop', {
        kind: cfg.shopKind,
        title: cfg.displayName,
      });
      this.scene.pause();
    });

    // Inventar-Toggle auch in den Läden. Player emittiert das Event
    // beim Drücken von I; hier hängen wir den Handler ein.
    this.events.on('toggleInventory', this.openInventory, this);

    // Reveal the hint bar.
    this.events.emit('hint', '[E] Kaufen   [I] Inventar   [\u2193] Ausgang');

    // The UIScene needs to know which scene events to listen to; interior
    // shops share the same UI HUD.
    this.scene.launch('UI', { islandSceneKey: 'Interior' });
    this.scene.bringToTop('UI');

    // Greeting is already rendered as a fixed label above the counter -
    // no need to also toast it, which used to double-print.
  }

  openInventory() {
    if (this.scene.isActive('Inventory')) return;
    if (this.scene.isActive('Shop')) return;
    this.scene.launch('Inventory', { islandSceneKey: 'Interior' });
    this.scene.pause();
  }

  // Grid-Warp Dispatcher: der Player ruft triggerWarp(payload) auf,
  // sobald er auf einer DOOR-Zelle landet. Wir bauen ab hier auf
  // returnToIsland, das die eigentliche Scene-Umschaltung macht.
  triggerWarp(warp) {
    if (this._warping) return;
    if (this.time.now < (this._warpGraceUntil || 0)) return;
    if (warp.kind !== 'exit') return;
    this._warping = true;
    this.returnToIsland();
  }

  returnToIsland() {
    if (this.returning) return;
    this.returning = true;
    Sfx.uiToggle();
    // Fade-out first, then hard-cleanup ALLE Nebenszenen und wechseln.
    // Ohne Fade+Delay crashten wir manchmal weil Player.preUpdate noch
    // gegen ein bereits zerstörtes UI zeichnete.
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.time.delayedCall(200, () => {
      try { this.scene.stop('Shop'); } catch (e) {}
      try { this.scene.stop('Inventory'); } catch (e) {}
      try { this.scene.stop('UI'); } catch (e) {}
      // Player-Physik/Events zuerst zerstören, dann Szene neu starten.
      try { this.player?.destroy(); } catch (e) {}
      this.scene.start(this.returnScene, {
        returningFromInterior: true,
        returnX: this.returnX,
        returnY: this.returnY,
      });
    });
  }
}
