import Phaser from 'phaser';

const ISLANDS = [
  { key: 'rubenfeld', name: 'Rübenfeld', art: 'island_rubenfeld', x: 700, y: 420, scale: 0.95 },
  { key: 'eisenklamm', name: 'Eisenklamm', art: 'island_eisenklamm', x: 1180, y: 240, requires: 'rubenfeld', scale: 0.95 },
  { key: 'moewenhort', name: 'Möwenhort', art: 'island_moewenhort', x: 1400, y: 580, requires: 'eisenklamm', comingSoon: true, scale: 0.95 },
];

export default class SailingScene extends Phaser.Scene {
  constructor() {
    super('Sailing');
  }

  create() {
    const worldW = 1600;
    const worldH = 900;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    this.water = this.add.tileSprite(0, 0, worldW, worldH, 'tile_water').setOrigin(0, 0);

    this.boat = this.physics.add.sprite(160, 160, 'boat').setScale(1.15);
    this.boat.setDamping(true);
    this.boat.setDrag(0.78);
    this.boat.setMaxVelocity(130);
    this.boat.body.setCircle(14, 6, 20);

    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.boat, true, 0.08, 0.08);

    // Island bodies are static circles so the boat cannot sail through
    // land. Each island also gets a dock sprite at its south edge and a
    // "harbor zone" that the boat has to actually touch (not just get
    // near the island's centre) before landing is allowed. That's why
    // players used to be able to sail "under" the island - there was no
    // collision and the near-check just used the island's centre.
    this.landColliders = this.physics.add.staticGroup();
    this.markers = [];
    ISLANDS.forEach((info) => {
      const conquered = this.registry.get(`conquered_${info.key}`);
      const land = this.add.image(info.x, info.y, info.art).setScale(info.scale ?? 1);
      if (this.isLocked(info)) {
        land.setTint(0x6b7078);
        this.add.image(info.x, info.y, 'lock_icon').setScale(1.3).setDepth(1);
      }
      // Collision: a static rectangle roughly the size of the island
      // sprite so the boat physically bumps into it. Using a rect body
      // (not a circle) keeps the physics predictable across Phaser
      // versions.
      const halfW = Math.max(38, Math.round(land.displayWidth * 0.32));
      const halfH = Math.max(38, Math.round(land.displayHeight * 0.30));
      const bodyRect = this.add.rectangle(info.x, info.y - 6, halfW * 2, halfH * 2, 0, 0);
      this.physics.add.existing(bodyRect, true);
      this.landColliders.add(bodyRect);

      // Dock jutting south from the island. Landing is only allowed when
      // the boat overlaps this dock zone.
      const dockX = info.x;
      const dockY = info.y + Math.round(land.displayHeight / 2) - 4;
      const dockImg = this.add.image(dockX, dockY, 'dock').setDepth(0);
      const dockZone = this.add.zone(dockX, dockY, 60, 28);
      this.physics.add.existing(dockZone, true);

      const labelY = dockY + 22;
      const label = this.add
        .text(info.x, labelY, conquered ? `${info.name} (erobert)` : info.name, {
          fontFamily: 'Georgia, serif',
          fontSize: '13px',
          color: conquered ? '#8fe08f' : '#fff6d8',
          stroke: '#000',
          strokeThickness: 3,
        })
        .setOrigin(0.5);
      this.markers.push({ info, land, label, dockImg, dockZone });
    });

    this.physics.add.collider(this.boat, this.landColliders);

    this.prompt = this.add
      .text(this.scale.width / 2, this.scale.height - 30, '', {
        fontFamily: 'Courier New',
        fontSize: '13px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.keys = this.input.keyboard.addKeys({
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D',
      up2: 'UP',
      down2: 'DOWN',
      left2: 'LEFT',
      right2: 'RIGHT',
    });

    this.nearIsland = null;
    this.input.keyboard.on('keydown-SPACE', () => this.tryInteract());

    this.add
      .text(16, 16, 'Segle mit WASD/Pfeilen. Fahr zu einer Insel und drücke Leertaste.', {
        fontFamily: 'Courier New',
        fontSize: '11px',
        color: '#cfe0ff',
      })
      .setScrollFactor(0);
  }

  update(time, delta) {
    this.water.tilePositionX += delta * 0.015;
    this.water.tilePositionY += delta * 0.01;

    const k = this.keys;
    const accel = 190;
    let ax = 0;
    let ay = 0;
    if (k.left.isDown || k.left2.isDown) ax -= 1;
    if (k.right.isDown || k.right2.isDown) ax += 1;
    if (k.up.isDown || k.up2.isDown) ay -= 1;
    if (k.down.isDown || k.down2.isDown) ay += 1;

    if (ax !== 0 || ay !== 0) {
      const v = new Phaser.Math.Vector2(ax, ay).normalize();
      this.boat.setAcceleration(v.x * accel, v.y * accel);
    } else {
      this.boat.setAcceleration(0, 0);
    }
    // the boat sprite always points north, regardless of travel direction
    this.boat.setRotation(0);

    // Landing only when the boat overlaps the dock zone. This replaces
    // the older "within 100px of centre" check that let players park
    // "underneath" the island through empty water.
    this.nearIsland = null;
    for (const m of this.markers) {
      if (this.physics.overlap(this.boat, m.dockZone)) {
        this.nearIsland = m;
        break;
      }
    }

    if (this.nearIsland) {
      const conquered = this.registry.get(`conquered_${this.nearIsland.info.key}`);
      if (this.isLocked(this.nearIsland.info)) {
        this.prompt.setText(`${this.nearIsland.info.name} - noch nicht erreichbar...`);
      } else {
        this.prompt.setText(
          conquered
            ? `${this.nearIsland.info.name} ist bereits erobert. [Leertaste] zum erneuten Landen`
            : `An Land gehen bei ${this.nearIsland.info.name}? [Leertaste]`
        );
      }
    } else {
      this.prompt.setText('');
    }
  }

  isLocked(info) {
    if (info.comingSoon) return true;
    if (info.requires) return !this.registry.get(`conquered_${info.requires}`);
    return false;
  }

  tryInteract() {
    if (!this.nearIsland) return;
    if (this.isLocked(this.nearIsland.info)) {
      this.showLockedToast();
    } else {
      this.scene.start('Island', { islandKey: this.nearIsland.info.key });
    }
  }

  showLockedToast() {
    if (this._lockToast) return;
    this._lockToast = this.add
      .text(this.boat.x, this.boat.y - 40, 'Diese Insel ist noch nicht erreichbar...', {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        color: '#ffd8d8',
        stroke: '#000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.time.delayedCall(1400, () => {
      this._lockToast?.destroy();
      this._lockToast = null;
    });
  }
}
