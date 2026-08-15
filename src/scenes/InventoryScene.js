import Phaser from 'phaser';
import { ITEMS } from '../systems/Items.js';

const SLOT = 40;
const GAP = 8;

export default class InventoryScene extends Phaser.Scene {
  constructor() {
    super('Inventory');
  }

  init(data) {
    this.islandSceneKey = data?.islandSceneKey ?? 'Island';
  }

  create() {
    const { width, height } = this.scale;
    const island = this.scene.get(this.islandSceneKey);
    this.player = island.player;
    this.inventory = this.player.inventory;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55);
    this.panel = this.add.rectangle(width / 2, height / 2, width - 40, height - 30, 0x21283a, 0.96);
    this.panel.setStrokeStyle(2, 0xf5cf4a, 0.6);

    this.add
      .text(width / 2, 22, 'Inventar', { fontFamily: 'Georgia, serif', fontSize: '18px', color: '#f5cf4a' })
      .setOrigin(0.5);

    // --- equipment slots ---
    this.weaponSlot = this.makeSlot(width / 2 - 60, 58, () => this.onEquipClick('weapon'));
    this.armorSlot = this.makeSlot(width / 2 + 60, 58, () => this.onEquipClick('armor'));
    this.add.text(width / 2 - 60, 80, 'Waffe', this.labelStyle()).setOrigin(0.5);
    this.add.text(width / 2 + 60, 80, 'Rüstung', this.labelStyle()).setOrigin(0.5);

    // --- hotbar ---
    this.add.text(30, 100, 'Hotbar [1-4]', this.labelStyle()).setOrigin(0, 0.5);
    this.hotbarSlots = [];
    const hotbarStartX = width / 2 - ((4 * SLOT + 3 * GAP) / 2) + SLOT / 2;
    for (let i = 0; i < 4; i++) {
      const x = hotbarStartX + i * (SLOT + GAP);
      this.hotbarSlots.push(this.makeSlot(x, 122, () => this.onHotbarClick(i)));
    }

    // --- backpack ---
    this.add.text(30, 150, 'Rucksack', this.labelStyle()).setOrigin(0, 0.5);
    this.backpackSlots = [];
    const cols = 6;
    const rows = 2;
    const startX = width / 2 - ((cols * SLOT + (cols - 1) * GAP) / 2) + SLOT / 2;
    const startY = 172;
    for (let i = 0; i < cols * rows; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (SLOT + GAP);
      const y = startY + row * (SLOT + GAP);
      this.backpackSlots.push(this.makeSlot(x, y, () => this.onBackpackClick(i)));
    }

    this.detailText = this.add
      .text(width / 2, height - 44, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '12px',
        color: '#dce6f5',
        align: 'center',
        wordWrap: { width: width - 80 },
      })
      .setOrigin(0.5, 0);

    this.add
      .text(width / 2, height - 14, 'Klick: ausrüsten / in Hotbar legen     [E] oder [Esc]: schließen', {
        fontFamily: 'Courier New',
        fontSize: '10px',
        color: '#9fb0c9',
      })
      .setOrigin(0.5);

    this.input.keyboard.on('keydown-E', () => this.close());
    this.input.keyboard.on('keydown-ESC', () => this.close());

    this.render();
  }

  labelStyle() {
    return { fontFamily: 'Courier New', fontSize: '10px', color: '#9fb0c9' };
  }

  makeSlot(x, y, onClick) {
    const bg = this.add.rectangle(x, y, SLOT, SLOT, 0x2f3850, 1).setStrokeStyle(1, 0x4a5578);
    const icon = this.add.image(x, y, 'whitepx').setVisible(false).setDisplaySize(SLOT - 10, SLOT - 10);
    const qty = this.add
      .text(x + SLOT / 2 - 3, y + SLOT / 2 - 3, '', { fontFamily: 'Courier New', fontSize: '10px', color: '#fff6d8', stroke: '#000', strokeThickness: 3 })
      .setOrigin(1, 1)
      .setVisible(false);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', onClick);
    bg.on('pointerover', () => {
      bg.setStrokeStyle(2, 0xf5cf4a);
      this.showDetailFor(icon.itemId);
    });
    bg.on('pointerout', () => bg.setStrokeStyle(1, 0x4a5578));
    return { bg, icon, qty };
  }

  showDetailFor(id) {
    const def = ITEMS[id];
    this.detailText.setText(def ? `${def.name} - ${def.desc}` : '');
  }

  setSlotItem(slot, entry) {
    const id = typeof entry === 'string' ? entry : entry?.id;
    const qty = typeof entry === 'string' ? 1 : entry?.qty ?? 1;
    if (id && ITEMS[id]) {
      slot.icon.setTexture(ITEMS[id].texture).setVisible(true).setDisplaySize(SLOT - 12, SLOT - 12);
      slot.icon.itemId = id;
      slot.qty.setText(qty > 1 ? String(qty) : '').setVisible(qty > 1);
    } else {
      slot.icon.setVisible(false);
      slot.icon.itemId = null;
      slot.qty.setVisible(false);
    }
  }

  render() {
    this.setSlotItem(this.weaponSlot, this.inventory.weapon);
    this.setSlotItem(this.armorSlot, this.inventory.armor);
    this.hotbarSlots.forEach((slot, i) => this.setSlotItem(slot, this.inventory.hotbar[i]));
    this.backpackSlots.forEach((slot, i) => this.setSlotItem(slot, this.inventory.backpack[i] ?? null));
  }

  onEquipClick(kind) {
    if (kind === 'weapon' && this.inventory.weapon) {
      this.inventory.unequipWeapon();
    } else if (kind === 'armor' && this.inventory.armor) {
      this.inventory.unequipArmor();
    }
    this.render();
  }

  onHotbarClick(index) {
    if (this.inventory.hotbar[index]) {
      this.inventory.moveHotbarToBackpack(index);
      this.render();
    }
  }

  onBackpackClick(index) {
    const entry = this.inventory.backpack[index];
    if (!entry) return;
    const id = entry.id;
    const def = ITEMS[id];
    if (def.type === 'weapon' || def.type === 'armor') {
      this.inventory.equipFromBackpack(index);
    } else {
      const emptyHotbar = this.inventory.hotbar.indexOf(null);
      if (emptyHotbar === -1) {
        this.player.toast('Hotbar ist voll!');
        return;
      }
      this.inventory.moveBackpackToHotbar(index, emptyHotbar);
    }
    this.render();
  }

  close() {
    this.scene.stop();
    this.scene.resume(this.islandSceneKey);
    // the island's own [E] key never got to consume its "just down" state
    // while paused, so without this reset it fires again on resume and
    // immediately reopens the inventory.
    this.player.keys.inventory.reset();
  }
}
