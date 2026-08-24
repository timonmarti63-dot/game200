import Phaser from 'phaser';
import { ITEMS } from '../systems/Items.js';
import { MAP_INFO } from './IslandScene.js';
import { panel, makeSlot, setSlotItem, qtyBadge, UI_COLORS } from '../systems/UiKit.js';

const MINIMAP_X = 8;
const MINIMAP_Y = 8;
const MINIMAP_W = 84;
const MAX_HEART_SLOTS = 6;
const HOTBAR_SLOT = 28;
const HOTBAR_GAP = 5;

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  init(data) {
    this.islandSceneKey = data?.islandSceneKey ?? 'Island';
  }

  create() {
    const minimapH = Math.round(MINIMAP_W * (MAP_INFO.worldH / MAP_INFO.worldW));
    this.minimapScale = MINIMAP_W / MAP_INFO.worldW;
    this.minimapH = minimapH;

    panel(this, MINIMAP_X - 4, MINIMAP_Y - 4, MINIMAP_W + 8, minimapH + 8, { radius: 7, depth: 98 });
    const mg = this.add.graphics().setScrollFactor(0).setDepth(99);
    mg.fillStyle(0x3a7a45, 1);
    mg.fillRoundedRect(
      MINIMAP_X + MAP_INFO.grass.x * this.minimapScale,
      MINIMAP_Y + MAP_INFO.grass.y * this.minimapScale,
      MAP_INFO.grass.w * this.minimapScale,
      MAP_INFO.grass.h * this.minimapScale,
      2
    );
    mg.fillStyle(0x9aa0ab, 1);
    mg.fillRoundedRect(
      MINIMAP_X + MAP_INFO.castle.x * this.minimapScale,
      MINIMAP_Y + MAP_INFO.castle.y * this.minimapScale,
      MAP_INFO.castle.w * this.minimapScale,
      MAP_INFO.castle.h * this.minimapScale,
      1
    );
    this.minimapDot = this.add.circle(MINIMAP_X, MINIMAP_Y, 2.5, 0xff5a4a, 1).setStrokeStyle(1, 0xffffff, 0.8).setScrollFactor(0).setDepth(101);

    this.hearts = [];
    const heartsY = MINIMAP_Y + minimapH + 15;
    for (let i = 0; i < MAX_HEART_SLOTS; i++) {
      const h = this.add.image(16 + i * 15, heartsY, 'heart_full').setScrollFactor(0).setDepth(100).setDisplaySize(13, 12);
      this.hearts.push(h);
    }

    this.bossBarBg = panel(this, this.scale.width / 2 - 122, 6, 244, 30, { radius: 6, depth: 100, shadow: false }).setVisible(false);
    this.bossBarTrack = this.add.rectangle(this.scale.width / 2, 27, 228, 9, 0x120a0a, 1).setScrollFactor(0).setDepth(101).setVisible(false);
    this.bossBarFill = this.add
      .rectangle(this.scale.width / 2 - 113, 27, 224, 6, UI_COLORS.crimson, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(102)
      .setVisible(false);
    this.bossName = this.add
      .text(this.scale.width / 2, 13, '', { fontFamily: 'Georgia, serif', fontSize: '11px', color: '#e8b93f' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(102)
      .setVisible(false);

    // --- hotbar ---
    const hotbarY = this.scale.height - 22;
    const startX = this.scale.width / 2 - ((4 * HOTBAR_SLOT + 3 * HOTBAR_GAP) / 2) + HOTBAR_SLOT / 2;
    this.hotbarSlots = [];
    for (let i = 0; i < 4; i++) {
      const x = startX + i * (HOTBAR_SLOT + HOTBAR_GAP);
      const slot = makeSlot(this, x, hotbarY, HOTBAR_SLOT, { depth: 100 });
      slot.qty = qtyBadge(this, x - HOTBAR_SLOT / 2, hotbarY - HOTBAR_SLOT / 2, HOTBAR_SLOT, 100);
      const badge = this.add.circle(x - HOTBAR_SLOT / 2 + 1, hotbarY - HOTBAR_SLOT / 2 + 1, 6, UI_COLORS.gold, 1).setScrollFactor(0).setDepth(102);
      this.add
        .text(badge.x, badge.y, String(i + 1), { fontFamily: 'Courier New', fontSize: '8px', color: '#1b2338', fontStyle: 'bold' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(103);
      this.hotbarSlots.push(slot);
    }

    this.hint = this.add
      .text(this.scale.width / 2, this.scale.height - 40, '', {
        fontFamily: 'Courier New',
        fontSize: '11px',
        color: '#cfd8e6',
        stroke: '#0c0f18',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);

    this.toastText = this.add
      .text(this.scale.width / 2, this.scale.height - 66, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: '#fff6d8',
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center',
        wordWrap: { width: this.scale.width - 40 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setAlpha(0);

    const island = this.scene.get(this.islandSceneKey);
    this.island = island;
    island.events.on('hpChanged', this.updateHearts, this);
    island.events.on('inventoryChanged', this.updateHotbar, this);
    island.events.on('bossSpawned', this.showBossBar, this);
    island.events.on('bossHpChanged', this.updateBossBar, this);
    island.events.on('bossDied', this.hideBossBar, this);
    island.events.on('toast', this.showToast, this);
    island.events.on('hint', this.updateHint, this);

    // island.events is IslandScene's own emitter, which outlives this UI
    // scene across restarts - every one of the above must be unhooked by
    // exact reference here, or re-launching UI (which happens every time
    // IslandScene re-enters create()) stacks duplicate handlers on it.
    this.events.once('shutdown', () => {
      island.events.off('hpChanged', this.updateHearts, this);
      island.events.off('inventoryChanged', this.updateHotbar, this);
      island.events.off('bossSpawned', this.showBossBar, this);
      island.events.off('bossHpChanged', this.updateBossBar, this);
      island.events.off('bossDied', this.hideBossBar, this);
      island.events.off('toast', this.showToast, this);
      island.events.off('hint', this.updateHint, this);
    });

    if (island.player) {
      this.updateHearts(island.player.hp, island.player.maxHp);
      this.updateHotbar(island.player.inventory);
    }
  }

  update() {
    const player = this.island?.player;
    if (!player) return;
    this.minimapDot.setPosition(MINIMAP_X + player.x * this.minimapScale, MINIMAP_Y + player.y * this.minimapScale);
  }

  updateHearts(hp, maxHp) {
    const heartCount = Math.ceil(maxHp / 2);
    for (let i = 0; i < this.hearts.length; i++) {
      if (i >= heartCount) {
        this.hearts[i].setVisible(false);
        continue;
      }
      this.hearts[i].setVisible(true);
      const unitVal = hp - i * 2;
      if (unitVal >= 2) this.hearts[i].setTexture('heart_full');
      else if (unitVal === 1) this.hearts[i].setTexture('heart_half');
      else this.hearts[i].setTexture('heart_empty');
    }
  }

  updateHotbar(inventory) {
    this.hotbarSlots.forEach((slot, i) => setSlotItem(slot, inventory.hotbar[i], ITEMS));
  }

  updateBossBar(hp, maxHp) {
    const w = Math.max(0, (hp / maxHp) * 224);
    this.bossBarFill.width = w;
  }

  showBossBar(boss) {
    this.bossBarBg.setVisible(true);
    this.bossBarTrack.setVisible(true);
    this.bossBarFill.setVisible(true);
    this.bossName.setText(boss?.name ?? '').setVisible(true);
  }

  hideBossBar() {
    this.bossBarBg.setVisible(false);
    this.bossBarTrack.setVisible(false);
    this.bossBarFill.setVisible(false);
    this.bossName.setVisible(false);
  }

  updateHint(t) {
    this.hint.setText(t ?? '');
  }

  showToast(text) {
    this.toastText.setText(text);
    this.toastText.setAlpha(1);
    if (this.toastTween) this.toastTween.stop();
    this.toastTween = this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      delay: 1800,
      duration: 500,
    });
  }
}
