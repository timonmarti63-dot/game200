import Phaser from 'phaser';
import { ITEMS } from '../systems/Items.js';
import { MAP_INFO } from './IslandScene.js';
import { getSilver, getGold, ensureInitialised } from '../systems/Currency.js';

const MINIMAP_X = 10;
const MINIMAP_Y = 10;
const MINIMAP_W = 96;
const MAX_HEART_SLOTS = 8; // Hard mode uses 3, Medium 5, Easy 8

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

    this.add.rectangle(MINIMAP_X + MINIMAP_W / 2, MINIMAP_Y + minimapH / 2, MINIMAP_W + 4, minimapH + 4, 0x0c1220, 1).setScrollFactor(0).setDepth(99);
    const mg = this.add.graphics().setScrollFactor(0).setDepth(100);
    mg.fillStyle(0x2f6b3a, 1);
    mg.fillRect(
      MINIMAP_X + MAP_INFO.grass.x * this.minimapScale,
      MINIMAP_Y + MAP_INFO.grass.y * this.minimapScale,
      MAP_INFO.grass.w * this.minimapScale,
      MAP_INFO.grass.h * this.minimapScale
    );
    mg.fillStyle(0x8a8f97, 1);
    mg.fillRect(
      MINIMAP_X + MAP_INFO.castle.x * this.minimapScale,
      MINIMAP_Y + MAP_INFO.castle.y * this.minimapScale,
      MAP_INFO.castle.w * this.minimapScale,
      MAP_INFO.castle.h * this.minimapScale
    );
    mg.lineStyle(1, 0xf5cf4a, 0.8);
    mg.strokeRect(MINIMAP_X, MINIMAP_Y, MINIMAP_W, minimapH);
    this.minimapDot = this.add.circle(MINIMAP_X, MINIMAP_Y, 2.5, 0xff5a4a, 1).setScrollFactor(0).setDepth(101);

    this.hearts = [];
    const heartsY = MINIMAP_Y + minimapH + 12;
    for (let i = 0; i < MAX_HEART_SLOTS; i++) {
      const h = this.add.image(18 + i * 18, heartsY, 'heart_full').setScrollFactor(0).setDepth(100).setScale(0.9);
      this.hearts.push(h);
    }

    this.bossBarBg = this.add.rectangle(this.scale.width / 2, 24, 240, 16, 0x000000, 0.5).setScrollFactor(0).setDepth(100).setVisible(false);
    this.bossBarFill = this.add.rectangle(this.scale.width / 2 - 118, 24, 236, 12, 0xb23a2e, 1).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101).setVisible(false);
    this.bossName = this.add
      .text(this.scale.width / 2, 10, '', { fontFamily: 'Georgia, serif', fontSize: '12px', color: '#f5cf4a' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101)
      .setVisible(false);

    // --- hotbar ---
    const slotSize = 34;
    const gap = 6;
    const hotbarY = this.scale.height - 26;
    const startX = this.scale.width / 2 - ((4 * slotSize + 3 * gap) / 2) + slotSize / 2;
    // Hotbar item icons need a constant on-screen size regardless of the
    // texture's native pixel dimensions (a 44px player sprite vs a 12px
    // silver coin would otherwise look wildly inconsistent). We store the
    // target inner size on the scene and re-apply setDisplaySize every
    // time we swap the icon's texture in updateHotbar.
    this.hotbarIconSize = slotSize - 10;
    this.hotbarSlots = [];
    for (let i = 0; i < 4; i++) {
      const x = startX + i * (slotSize + gap);
      const bg = this.add.rectangle(x, hotbarY, slotSize, slotSize, 0x14192a, 1).setStrokeStyle(1, 0x4a5578).setScrollFactor(0).setDepth(100);
      const icon = this.add.image(x, hotbarY, 'whitepx').setVisible(false).setScrollFactor(0).setDepth(101).setDisplaySize(this.hotbarIconSize, this.hotbarIconSize);
      const label = this.add
        .text(x - slotSize / 2 + 3, hotbarY - slotSize / 2 + 1, String(i + 1), { fontFamily: 'Courier New', fontSize: '9px', color: '#8fa0c0' })
        .setScrollFactor(0)
        .setDepth(101);
      const qty = this.add
        .text(x + slotSize / 2 - 2, hotbarY + slotSize / 2 - 2, '', { fontFamily: 'Courier New', fontSize: '9px', color: '#fff6d8', stroke: '#000', strokeThickness: 3 })
        .setOrigin(1, 1)
        .setScrollFactor(0)
        .setDepth(101);
      this.hotbarSlots.push({ bg, icon, label, qty });
    }

    this.hint = this.add
      .text(this.scale.width / 2, this.scale.height - 46, '', {
        fontFamily: 'Courier New',
        fontSize: '11px',
        color: '#cfd8e6',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);

    this.toastText = this.add
      .text(this.scale.width / 2, this.scale.height - 72, '', {
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

    // --- currency HUD (top right) ---
    ensureInitialised(this.registry);
    const cx = this.scale.width - 8;
    const cy = 14;
    this.silverIcon = this.add.image(cx - 62, cy, 'coin_silver').setScrollFactor(0).setDepth(100).setDisplaySize(12, 12);
    this.silverText = this.add
      .text(cx - 54, cy, '0', {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#dfe6f0',
        stroke: '#000',
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(100);
    this.goldIcon = this.add.image(cx - 22, cy, 'coin_gold').setScrollFactor(0).setDepth(100).setDisplaySize(12, 12);
    this.goldText = this.add
      .text(cx - 14, cy, '0', {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#f6d97a',
        stroke: '#000',
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(100);
    this.refreshCurrency();
    // registry emits 'changedata-<key>' when a specific key changes.
    this.registry.events.on('changedata-silver', this.refreshCurrency, this);
    this.registry.events.on('changedata-gold', this.refreshCurrency, this);

    const island = this.scene.get(this.islandSceneKey);
    this.island = island;
    island.events.on('hpChanged', this.updateHearts, this);
    island.events.on('inventoryChanged', this.updateHotbar, this);
    island.events.on('bossSpawned', (boss) => {
      this.bossBarBg.setVisible(true);
      this.bossBarFill.setVisible(true);
      this.bossName.setText(boss?.name ?? '').setVisible(true);
    });
    island.events.on('bossHpChanged', this.updateBossBar, this);
    island.events.on('bossDied', () => {
      this.bossBarBg.setVisible(false);
      this.bossBarFill.setVisible(false);
      this.bossName.setVisible(false);
    });
    island.events.on('toast', this.showToast, this);
    island.events.on('hint', (t) => this.hint.setText(t ?? ''));

    this.events.once('shutdown', () => {
      island.events.off('hpChanged', this.updateHearts, this);
      island.events.off('inventoryChanged', this.updateHotbar, this);
      island.events.off('bossHpChanged', this.updateBossBar, this);
      island.events.off('toast', this.showToast, this);
      this.registry.events.off('changedata-silver', this.refreshCurrency, this);
      this.registry.events.off('changedata-gold', this.refreshCurrency, this);
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
    this.hotbarSlots.forEach((slot, i) => {
      const entry = inventory.hotbar[i];
      const def = entry ? ITEMS[entry.id] : null;
      if (def) {
        // IMPORTANT: setTexture resets the sprite's display size to the
        // texture's native size, so we must re-apply the target size on
        // every swap - otherwise a 12x12 potion icon renders tiny in a
        // 34px hotbar slot, and a 68x68 house icon (edge case) would
        // overflow it.
        slot.icon.setTexture(def.texture).setVisible(true).setDisplaySize(this.hotbarIconSize, this.hotbarIconSize);
        slot.qty.setText(entry.qty > 1 ? String(entry.qty) : '').setVisible(entry.qty > 1);
      } else {
        slot.icon.setVisible(false);
        slot.qty.setVisible(false);
      }
    });
  }

  refreshCurrency() {
    if (!this.silverText) return;
    this.silverText.setText(String(getSilver(this.registry)));
    this.goldText.setText(String(getGold(this.registry)));
  }

  updateBossBar(hp, maxHp) {
    const w = Math.max(0, (hp / maxHp) * 236);
    this.bossBarFill.width = w;
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
