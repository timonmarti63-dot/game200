import Phaser from 'phaser';
import Player from '../entities/Player.js';
import { Sfx } from '../systems/Sfx.js';
import { WalkableGrid, CELL } from '../systems/Grid.js';

const T = 32;
const ROOM_W = 15 * T; // 480
const ROOM_H = 10 * T; // 320

// Pokemon-Style Innenraum-Templates.
// - shop-Typen (apothecary/smith): Verkäufer hinter Theke, [E] öffnet Shop.
// - talker-Typen (cottage/tavern/farm/scholar/guard): kein Shop, sondern
//   ein NPC mit einem Gerücht (Kaiser-Klatsch, versteckter Schatz-Tipp)
//   oder einer kleinen Belohnung. "Jedes Haus lohnt sich" - Pokemon-Regel.
const INTERIOR_CONFIG = {
  apothecary: {
    displayName: 'Apotheke der Alchemistin Ilse',
    sign: 'Apotheke',
    shopkeeper: 'shopkeeper_potion',
    counterColor: 0x6f4a25,
    wallColor: 0x8f5c33,
    shopKind: 'apothecary',
    kind: 'shop',
    greeting: '"Willkommen! Ein Fläschchen Mut gefällig?"',
  },
  smith: {
    displayName: 'Waffen- und Rüstungsschmied Bartolo',
    sign: 'Schmiede',
    shopkeeper: 'shopkeeper_smith',
    counterColor: 0x4a4a4a,
    wallColor: 0x5c5148,
    shopKind: 'smith',
    kind: 'shop',
    greeting: '"Härtestes Eisen, faireste Preise. Was darf\'s sein?"',
  },
  cottage: {
    displayName: 'Häuschen der alten Grete',
    sign: 'Häuschen',
    shopkeeper: 'shopkeeper_potion',
    counterColor: 0x6a4a2e,
    wallColor: 0x8a6a44,
    kind: 'talker',
    greeting: '"Setz dich, Ritter. Ich hab was gehört..."',
    // Rotierende Gerüchte - jeder Besuch würfelt eins.
    rumors: [
      '"Der Kaiser? Der ist ein müder Mann. Wer die drei Adelsränge sammelt,\ndarf ihn im Kaisersaal fordern."',
      '"Auf Eisenklamm sperrt ein Wachposten den Weg zur Mine. Er lässt nur\ngeprüfte Ritter passieren - sag ihm dein Wappen."',
      '"Es heisst, unter den Rübenfeldern liegt eine Truhe. Ein Bauer sah\netwas glänzen, wo die drei Bäume sich im Kreis neigen."',
    ],
    reward: null,
  },
  tavern: {
    displayName: 'Zum Krummen Anker - Wirtshaus',
    sign: 'Wirtshaus',
    shopkeeper: 'shopkeeper_smith',
    counterColor: 0x5a3a20,
    wallColor: 0x704a2a,
    kind: 'talker',
    greeting: '"Erster Krug geht aufs Haus, Ritter. Klatsch gibts gratis dazu."',
    rumors: [
      '"Der Kaiser hat drei Söhne und keinen davon zum Nachfolger gemacht.\nDer Thron wartet auf jemanden mit Rückgrat."',
      '"Ein Kapitän im Hafen sucht einen Ritter mit hohem Rang - er kennt\neine Insel, die keine Karte zeigt."',
      '"Die Wachen am Torhaus lachen nur über niedrige Ränge. Werd erst zum\nBaron, dann öffnen sie das Tor."',
    ],
    reward: null,
  },
  farm: {
    displayName: 'Hof des Bauern Klaus',
    sign: 'Bauernhof',
    shopkeeper: 'chicken',
    counterColor: 0x4a3a20,
    wallColor: 0x6a4a2a,
    kind: 'talker',
    greeting: '"Willkommen! Vorsicht mit dem Huhn - das beisst."',
    rumors: [
      '"Wirf ein Huhn auf einen Feind und der zuckt zusammen wie vom Blitz.\nAlter Ritter-Trick, glaub mir."',
      '"Meine Rüben wachsen dieses Jahr grösser als sonst. Vielleicht hilft\ndir eine gegen den Hunger auf Reisen."',
    ],
    // Bauer gibt beim ersten Besuch eine Rübe.
    reward: { item: 'veggie', qty: 1, oneShot: true, msg: 'Klaus drückt dir eine dicke Rübe in die Hand.' },
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
    this.isShop = cfg.kind === 'shop';

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

    // Furniture-Layout je nach Innenraum-Typ - jedes Höchstwahrscheinlich
    // fühlt sich anders an (Pokemon-Prinzip: kompakte belohnende Räume).
    this.layoutFurniture(cfg);

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

    // Interact zone: bei Shops nur direkt am Tresen, bei Talker-Räumen
    // wesentlich grösser damit man den NPC immer erwischt.
    const izH = this.isShop ? 40 : 130;
    const izY = this.isShop ? counterY + 6 : counterY + 40;
    this.interactZone = this.add.zone(ROOM_W / 2, izY, ROOM_W - 140, izH);
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
    // Guarded by a small cooldown so re-entering doesn't spam it.
    this.interactCooldownUntil = 0;
    this.rumorTextObj = null;
    this.input.keyboard.on('keydown-E', () => {
      if (this.time.now < this.interactCooldownUntil) return;
      if (this.scene.isActive('Shop')) return;
      if (!this.physics.overlap(this.player, this.interactZone)) return;
      this.interactCooldownUntil = this.time.now + 400;
      if (this.isShop) {
        this.scene.launch('Shop', {
          kind: cfg.shopKind,
          title: cfg.displayName,
        });
        this.scene.pause();
      } else {
        this.showRumor();
      }
    });

    // Inventar-Toggle auch in den Läden. Player emittiert das Event
    // beim Drücken von I; hier hängen wir den Handler ein.
    this.events.on('toggleInventory', this.openInventory, this);

    // Reveal the hint bar - andere Aktion je nach Innenraumtyp.
    const eLabel = this.isShop ? 'Kaufen' : 'Sprechen';
    this.events.emit('hint', `[E] ${eLabel}   [I] Inventar   [\u2193] Ausgang`);

    // Talker-Innenräume: einmalige Belohnung beim ersten Besuch.
    if (!this.isShop && cfg.reward && !cfg.reward._given) {
      const key = `visited_${this.interiorKind}`;
      const already = this.registry.get(key);
      if (!already && cfg.reward.oneShot) {
        this.time.delayedCall(400, () => {
          try {
            const inv = this.registry.get('inventory') ?? [];
            const existing = inv.find(e => e.id === cfg.reward.item);
            if (existing) existing.qty += cfg.reward.qty;
            else inv.push({ id: cfg.reward.item, qty: cfg.reward.qty });
            this.registry.set('inventory', inv);
            this.registry.events.emit('inventoryChanged');
            this.events.emit('toast', cfg.reward.msg);
            this.registry.set(key, true);
          } catch (e) {}
        });
      }
    }

    // The UIScene needs to know which scene events to listen to; interior
    // shops share the same UI HUD.
    this.scene.launch('UI', { islandSceneKey: 'Interior' });
    this.scene.bringToTop('UI');

    // Greeting is already rendered as a fixed label above the counter -
    // no need to also toast it, which used to double-print.
  }

  // Bestimmt Wand-Deko, Regale und Möbel je nach Interior-Typ.
  // Alle Räume nutzen dieselbe Grundstruktur (Boden+Wände), aber Inhalt
  // variiert stark - Pokemon-Feeling: jedes Haus fühlt sich einzigartig an.
  layoutFurniture(cfg) {
    const kind = this.interiorKind;

    // Gemeinsame Deko: Pflanze links vorne bringt Wohnlichkeit.
    this.add.image(60, ROOM_H - 100, 'furn_plant_pot')
      .setOrigin(0.5, 0.5).setDepth(ROOM_H - 100 + 0.5);

    if (kind === 'apothecary') {
      // Apotheke: Bücher, Küche, Trank-Regale
      this.add.image(60, 62, 'furn_bookshelf').setDepth(1.5);
      this.add.image(ROOM_W - 80, 58, 'furn_kitchen').setDepth(1.5);
      this.add.image(ROOM_W - 60, ROOM_H - 110, 'furn_plant_pot')
        .setDepth(ROOM_H - 110 + 0.5);
      this.add.image(80, ROOM_H - 70, 'furn_table_round')
        .setDepth(ROOM_H - 70 + 0.5);
      this.add.image(ROOM_W - 90, ROOM_H - 68, 'furn_armchair')
        .setDepth(ROOM_H - 68 + 0.5);
      this.paintShelves('potion', 'potion_medium');

    } else if (kind === 'smith') {
      // Schmiede: Kisten, Waffen, dunkle Metalloptik
      this.add.image(60, 62, 'furn_bookshelf').setDepth(1.5);
      this.add.image(ROOM_W - 50, 60, 'furn_crate').setDepth(1.5);
      this.add.image(ROOM_W - 90, 68, 'furn_crate').setDepth(1.6);
      this.add.image(ROOM_W - 65, ROOM_H - 110, 'furn_crate')
        .setDepth(ROOM_H - 110 + 0.5);
      this.add.image(80, ROOM_H - 70, 'furn_table_round')
        .setDepth(ROOM_H - 70 + 0.5);
      this.add.image(ROOM_W - 90, ROOM_H - 68, 'furn_armchair')
        .setDepth(ROOM_H - 68 + 0.5);
      this.paintShelves('sword', 'warhammer');

    } else if (kind === 'cottage') {
      // Häuschen: Kamin, Bett, Bücher, gemütlich
      // Kamin an linker Wand
      this.add.rectangle(70, 60, 50, 44, 0x4a2a10)
        .setStrokeStyle(2, 0x1a0f08).setDepth(1.5);
      this.add.rectangle(70, 62, 30, 26, 0x2a1a08).setDepth(1.6);
      // Feuer-Effekt im Kamin
      this.add.rectangle(70, 68, 20, 12, 0xff8a2a, 0.9).setDepth(1.7);
      this.add.rectangle(70, 68, 12, 8, 0xffcf6a, 0.9).setDepth(1.71);
      this.tweens.add({
        targets: this.add.circle(70, 62, 4, 0xffcf6a, 0.6).setDepth(1.72),
        scale: { from: 0.8, to: 1.3 }, alpha: { from: 0.5, to: 0.8 },
        duration: 500, yoyo: true, repeat: -1,
      });
      // Bett rechts hinten
      this.add.image(ROOM_W - 70, 65, 'furn_bookshelf').setDepth(1.5);
      // Runder Tisch vorne
      this.add.image(80, ROOM_H - 70, 'furn_table_round')
        .setDepth(ROOM_H - 70 + 0.5);
      this.add.image(ROOM_W - 90, ROOM_H - 68, 'furn_armchair')
        .setDepth(ROOM_H - 68 + 0.5);
      // Regale mit Kräutern/Blumen
      this.paintShelves('flowers', 'potion');

    } else if (kind === 'farm') {
      // Bauernhof: Strohsack, Rübenkisten, Hupf-Hühner
      // Strohballen als "Bett"
      this.add.rectangle(70, 65, 44, 30, 0xd4a45a)
        .setStrokeStyle(2, 0x8a6a2a).setDepth(1.5);
      this.add.rectangle(70, 65, 44, 4, 0xf5cf6a).setDepth(1.51);
      this.add.rectangle(70, 71, 44, 4, 0xa88a3a).setDepth(1.52);
      // Rüben-Kisten rechts hinten
      this.add.image(ROOM_W - 50, 60, 'furn_crate').setDepth(1.5);
      this.add.image(ROOM_W - 90, 68, 'furn_crate').setDepth(1.6);
      // Rüben oben drauf
      this.add.image(ROOM_W - 50, 50, 'veggie').setDepth(1.7);
      this.add.image(ROOM_W - 90, 58, 'veggie').setDepth(1.71);
      // Runder Tisch
      this.add.image(80, ROOM_H - 70, 'furn_table_round')
        .setDepth(ROOM_H - 70 + 0.5);
      this.add.image(80, ROOM_H - 74, 'veggie').setDepth(ROOM_H - 70 + 0.6);
      // Zweites Huhn im Raum
      const chick2 = this.add.image(ROOM_W - 90, ROOM_H - 90, 'chicken')
        .setDepth(ROOM_H - 90 + 0.5);
      this.tweens.add({
        targets: chick2, y: ROOM_H - 94, duration: 500, yoyo: true, repeat: -1,
      });
      // Regale mit Rüben
      this.paintShelves('veggie', 'veggie');

    } else if (kind === 'tavern') {
      // Wirtshaus: Fässer, mehrere Tische, dunklere Atmosphäre
      // Fässer hinten links
      this.add.image(50, 62, 'furn_crate').setDepth(1.5);
      this.add.image(80, 60, 'furn_crate').setDepth(1.51);
      // Bar-Regal mit Krügen
      this.paintShelves('potion_medium', 'potion');
      // Tisch mit Stuhl vorne links
      this.add.image(90, ROOM_H - 75, 'furn_table_round')
        .setDepth(ROOM_H - 75 + 0.5);
      this.add.image(90, ROOM_H - 80, 'potion_medium')
        .setDepth(ROOM_H - 75 + 0.6);
      // Sessel vorne rechts
      this.add.image(ROOM_W - 80, ROOM_H - 68, 'furn_armchair')
        .setDepth(ROOM_H - 68 + 0.5);
      // Weitere Fässer rechts hinten
      this.add.image(ROOM_W - 55, 65, 'furn_crate').setDepth(1.5);
      // Kerze/Fackel-Effekt an der Wand
      this.add.circle(ROOM_W / 2, 30, 5, 0xff8a2a, 0.7).setDepth(1.9);

    } else {
      // Fallback
      this.add.image(60, 62, 'furn_bookshelf').setDepth(1.5);
      this.add.image(80, ROOM_H - 70, 'furn_table_round')
        .setDepth(ROOM_H - 70 + 0.5);
    }
  }

  // Drei kleine Regale an der Hinterwand mit zwei Items pro Brett.
  paintShelves(itemA, itemB) {
    for (let i = 0; i < 3; i++) {
      const sx = 130 + i * 75;
      const sy = 40;
      this.add.rectangle(sx, sy, 60, 5, 0x3a2818, 1).setDepth(2);
      this.add.image(sx - 14, sy - 11, itemA).setDepth(3);
      this.add.image(sx + 14, sy - 13, itemB).setDepth(3);
    }
  }

  showRumor() {
    // Zeigt ein zufälliges Gerücht als grosse Sprechblase, mit Space/E
    // zum Schliessen. Klassisch Pokemon-Dialog-Feel.
    if (this.rumorTextObj) return;
    const cfg = this.cfg;
    const rumors = cfg.rumors ?? [cfg.greeting];
    const text = rumors[Math.floor(Math.random() * rumors.length)];
    const boxY = ROOM_H - 90;
    const bg = this.add.rectangle(ROOM_W / 2, boxY, ROOM_W - 60, 90, 0x1a1008, 0.94)
      .setStrokeStyle(3, 0xc9a24a).setDepth(20);
    const t = this.add.text(ROOM_W / 2, boxY - 6, text, {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#f2e6c8',
      align: 'center',
      wordWrap: { width: ROOM_W - 90 },
    }).setOrigin(0.5).setDepth(21);
    const hint = this.add.text(ROOM_W / 2, boxY + 32, '[E] weiter', {
      fontFamily: 'Courier New', fontSize: '9px', color: '#c9a24a',
    }).setOrigin(0.5).setDepth(21);
    this.rumorTextObj = { bg, t, hint };
    const close = () => {
      if (!this.rumorTextObj) return;
      this.rumorTextObj.bg.destroy();
      this.rumorTextObj.t.destroy();
      this.rumorTextObj.hint.destroy();
      this.rumorTextObj = null;
      this.input.keyboard.off('keydown-E', close);
      this.input.keyboard.off('keydown-SPACE', close);
    };
    // Delay so the same E press that opened it doesn't close it.
    this.time.delayedCall(150, () => {
      this.input.keyboard.on('keydown-E', close);
      this.input.keyboard.on('keydown-SPACE', close);
    });
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
