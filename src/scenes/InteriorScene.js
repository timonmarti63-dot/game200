import Phaser from 'phaser';
import Player from '../entities/Player.js';
import { Sfx } from '../systems/Sfx.js';

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

    // Wooden floor - tiled 32x32.
    this.add.tileSprite(ROOM_W / 2, ROOM_H / 2, ROOM_W, ROOM_H, 'tile_floor_wood').setDepth(0);

    // Wooden walls (stone-tile as a fallback base) framing the room -
    // a top strip and thin side/bottom strips give the Pokemon-style
    // "interior box" feel.
    this.add.rectangle(ROOM_W / 2, T, ROOM_W, 2 * T, cfg.wallColor, 1).setDepth(1);
    this.add.rectangle(ROOM_W / 2, T, ROOM_W, 2, 0x2a1a10, 1).setDepth(1);
    this.add.rectangle(ROOM_W / 2, 2 * T + 1, ROOM_W, 2, 0x2a1a10, 1).setDepth(1);

    // A trio of decorative shelves along the back wall (potions or weapons).
    const shelfTexture = cfg.shopKind === 'apothecary' ? 'potion' : 'sword';
    const shelfAlt = cfg.shopKind === 'apothecary' ? 'potion_medium' : 'warhammer';
    for (let i = 0; i < 4; i++) {
      const sx = 60 + i * 90;
      const sy = 42;
      this.add.rectangle(sx, sy, 70, 6, 0x3a2818, 1).setDepth(2);
      this.add.image(sx - 18, sy - 12, shelfTexture).setDepth(3);
      this.add.image(sx + 18, sy - 14, shelfAlt).setDepth(3);
    }

    // Counter running horizontally at 60% height.
    const counterY = ROOM_H * 0.55;
    this.counter = this.add.rectangle(ROOM_W / 2, counterY, ROOM_W - 120, 20, cfg.counterColor, 1).setStrokeStyle(2, 0x1a0f08).setDepth(2);

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

    // Spawn the player just below the counter so they don't spawn on the
    // exit door and immediately re-trigger the island transition.
    this.player = new Player(this, ROOM_W / 2, ROOM_H - 60);
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

    // Reveal the hint bar.
    this.events.emit('hint', '[E] Kaufen   [↓] Ausgang');

    // The UIScene needs to know which scene events to listen to; interior
    // shops share the same UI HUD.
    this.scene.launch('UI', { islandSceneKey: 'Interior' });
    this.scene.bringToTop('UI');

    // Greeting is already rendered as a fixed label above the counter -
    // no need to also toast it, which used to double-print.
  }

  returnToIsland() {
    if (this.returning) return;
    this.returning = true;
    Sfx.uiToggle();
    // Stop the UI cleanly, then swap scenes back to the island.
    this.scene.stop('UI');
    this.scene.start(this.returnScene, {
      returningFromInterior: true,
      returnX: this.returnX,
      returnY: this.returnY,
    });
  }
}
