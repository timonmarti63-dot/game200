import Phaser from 'phaser';
import { ITEMS, APOTHECARY_STOCK, SMITH_STOCK, formatPrice } from '../systems/Items.js';
import { getSilver, getGold, trySpend } from '../systems/Currency.js';
import { Sfx } from '../systems/Sfx.js';

// Modal shop panel launched on top of InteriorScene. Reads currency from
// the registry, spawns purchased items directly into the player's
// inventory via the interior's scene reference.
export default class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  init(data) {
    this.shopKind = data?.kind ?? 'apothecary';
    this.shopTitle = data?.title ?? 'Handelsposten';
  }

  create() {
    const { width, height } = this.scale;
    // Dim backdrop so the interior scene still peeks through.
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55);

    // Panel
    const panelW = 380;
    const panelH = 240;
    const panel = this.add
      .rectangle(width / 2, height / 2, panelW, panelH, 0x1b2032, 0.98)
      .setStrokeStyle(2, 0xf5cf4a);

    const panelX = panel.x - panelW / 2;
    const panelY = panel.y - panelH / 2;

    this.add
      .text(width / 2, panelY + 16, this.shopTitle, {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: '#f5cf4a',
      })
      .setOrigin(0.5);

    // Player wallet display at the top right of the panel.
    this.walletText = this.add
      .text(panelX + panelW - 12, panelY + 16, '', {
        fontFamily: 'Courier New',
        fontSize: '11px',
        color: '#f2e6c8',
      })
      .setOrigin(1, 0.5);

    // Build stock rows. Each row has an icon, name, price, and buy button.
    const stock = this.shopKind === 'apothecary' ? APOTHECARY_STOCK : SMITH_STOCK;
    const rowH = 30;
    const startY = panelY + 42;

    this.rows = stock.map((entry, i) => {
      const def = ITEMS[entry.id];
      const y = startY + i * rowH;

      // Row background stripes for readability.
      this.add
        .rectangle(width / 2, y + rowH / 2 - 4, panelW - 28, rowH - 6, i % 2 === 0 ? 0x232a3f : 0x1e2436, 1)
        .setStrokeStyle(1, 0x2f3850);

      // Icon
      this.add.image(panelX + 30, y + 8, def.texture).setDisplaySize(20, 20);
      // Name + tiny desc
      this.add
        .text(panelX + 50, y + 2, def.name, {
          fontFamily: 'Georgia, serif',
          fontSize: '11px',
          color: '#e6ecf5',
        });
      this.add
        .text(panelX + 50, y + 14, def.desc ?? '', {
          fontFamily: 'Courier New',
          fontSize: '9px',
          color: '#9fb0c9',
        });

      // Price
      const priceText = this.add
        .text(panelX + panelW - 100, y + 8, formatPrice(entry.price), {
          fontFamily: 'Courier New',
          fontSize: '11px',
          color: entry.price.gold ? '#f6d97a' : '#dfe6f0',
        })
        .setOrigin(0, 0.5);

      // Buy button
      const btnX = panelX + panelW - 34;
      const btnY = y + 8;
      const btnBg = this.add
        .rectangle(btnX, btnY, 42, 20, 0x2f6b3a, 1)
        .setStrokeStyle(1, 0x4fa04a)
        .setInteractive({ useHandCursor: true });
      const btnLabel = this.add
        .text(btnX, btnY, 'Kauf', { fontFamily: 'Courier New', fontSize: '10px', color: '#fff' })
        .setOrigin(0.5);

      btnBg.on('pointerdown', () => this.attemptPurchase(entry, def, btnBg, btnLabel));
      btnBg.on('pointerover', () => btnBg.setFillStyle(0x3d8a4c));
      btnBg.on('pointerout', () => btnBg.setFillStyle(0x2f6b3a));

      return { entry, def, btnBg, btnLabel };
    });

    // Close hint
    this.add
      .text(width / 2, panelY + panelH - 14, '[Esc] oder [Q] schliessen', {
        fontFamily: 'Courier New',
        fontSize: '10px',
        color: '#cfd8e6',
      })
      .setOrigin(0.5);

    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.input.keyboard.on('keydown-Q', () => this.close());

    this.refreshWallet();
    this.registry.events.on('changedata-silver', this.refreshWallet, this);
    this.registry.events.on('changedata-gold', this.refreshWallet, this);
    this.events.once('shutdown', () => {
      this.registry.events.off('changedata-silver', this.refreshWallet, this);
      this.registry.events.off('changedata-gold', this.refreshWallet, this);
    });
  }

  refreshWallet() {
    if (!this.walletText) return;
    this.walletText.setText(`${getSilver(this.registry)} Silber   ${getGold(this.registry)} Gold`);
  }

  attemptPurchase(entry, def, btnBg, btnLabel) {
    if (!trySpend(this.registry, entry.price)) {
      // Flash the button red so the failure reads visually.
      btnBg.setFillStyle(0xb23a2e);
      this.time.delayedCall(300, () => btnBg.setFillStyle(0x2f6b3a));
      // Also toast the interior scene so the player sees why.
      const interior = this.scene.get('Interior');
      interior?.events.emit('toast', 'Nicht genug Münzen!');
      Sfx.uiToggle();
      return;
    }

    // Grant the item. Interior scene owns the player instance.
    const interior = this.scene.get('Interior');
    const player = interior?.player;
    if (player) {
      const ok = player.inventory.add(def.id, 1);
      if (!ok) {
        // Rare case: fully stocked backpack. Refund and warn.
        // (trySpend already deducted, so we manually restore.)
        if (entry.price.silver) this.registry.set('silver', getSilver(this.registry) + entry.price.silver);
        if (entry.price.gold) this.registry.set('gold', getGold(this.registry) + entry.price.gold);
        interior?.events.emit('toast', 'Rucksack voll - Kauf storniert!');
        return;
      }
      // If it's armor and player had no armor yet, applyArmorBonus is
      // triggered by Inventory.add's equip path already. Call heal-check
      // in case max HP grew.
      if (def.type === 'armor' && player.applyArmorBonus) player.applyArmorBonus();
      interior?.events.emit('toast', `${def.name} gekauft!`);
      interior?.events.emit('inventoryChanged', player.inventory);
      Sfx.heal();
    }
  }

  close() {
    Sfx.uiToggle();
    this.scene.resume('Interior');
    this.scene.stop();
  }
}
