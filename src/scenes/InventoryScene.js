import Phaser from 'phaser';
import { ITEMS } from '../systems/Items.js';
import { panel, makeSlot, setSlotItem, qtyBadge } from '../systems/UiKit.js';

const SLOT = 34;
const GAP = 7;

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

    this.add.rectangle(width / 2, height / 2, width, height, 0x05070c, 0.6);
    panel(this, 24, 14, width - 48, height - 28, { radius: 10, depth: 10, shadow: false });

    this.add
      .text(width / 2, 26, 'Rüdigers Rucksack', { fontFamily: 'Georgia, serif', fontSize: '16px', color: '#e8b93f' })
      .setOrigin(0.5)
      .setDepth(11);

    // --- equipment slots ---
    this.weaponSlot = this.makeInventorySlot(width / 2 - 56, 58, () => this.onEquipClick('weapon'));
    this.armorSlot = this.makeInventorySlot(width / 2 + 56, 58, () => this.onEquipClick('armor'));
    this.label(width / 2 - 56, 78, 'Waffe');
    this.label(width / 2 + 56, 78, 'Rüstung');

    // --- hotbar ---
    this.label(38, 98, 'HOTBAR', 'left');
    this.hotbarSlots = [];
    const hotbarStartX = width / 2 - ((4 * SLOT + 3 * GAP) / 2) + SLOT / 2;
    for (let i = 0; i < 4; i++) {
      const x = hotbarStartX + i * (SLOT + GAP);
      this.hotbarSlots.push(this.makeInventorySlot(x, 118, () => this.onHotbarClick(i)));
    }

    // --- backpack ---
    this.label(38, 145, 'RUCKSACK', 'left');
    this.backpackSlots = [];
    const cols = 6;
    const rows = 2;
    const startX = width / 2 - ((cols * SLOT + (cols - 1) * GAP) / 2) + SLOT / 2;
    const startY = 166;
    for (let i = 0; i < cols * rows; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (SLOT + GAP);
      const y = startY + row * (SLOT + GAP);
      this.backpackSlots.push(this.makeInventorySlot(x, y, () => this.onBackpackClick(i)));
    }

    panel(this, 34, height - 56, width - 68, 26, { radius: 6, depth: 10, shadow: false, fillAlpha: 0.7 });
    this.detailText = this.add
      .text(width / 2, height - 43, 'Fahr mit der Maus über einen Gegenstand für Details.', {
        fontFamily: 'Georgia, serif',
        fontSize: '11px',
        color: '#dce6f5',
        align: 'center',
        wordWrap: { width: width - 90 },
      })
      .setOrigin(0.5)
      .setDepth(11);

    this.add
      .text(width / 2, height - 16, 'Klick: ausrüsten / in Hotbar legen     [E] oder [Esc]: schließen', {
        fontFamily: 'Courier New',
        fontSize: '9px',
        color: '#93a0c2',
      })
      .setOrigin(0.5)
      .setDepth(11);

    this.input.keyboard.on('keydown-E', () => this.close());
    this.input.keyboard.on('keydown-ESC', () => this.close());

    this.render();
  }

  label(x, y, text, align = 'center') {
    return this.add
      .text(x, y, text, { fontFamily: 'Courier New', fontSize: '9px', color: '#93a0c2', letterSpacing: 1 })
      .setOrigin(align === 'left' ? 0 : 0.5, 0.5)
      .setDepth(11);
  }

  makeInventorySlot(x, y, onClick) {
    const slot = makeSlot(this, x, y, SLOT, { depth: 10, onClick });
    slot.qty = qtyBadge(this, x - SLOT / 2, y - SLOT / 2, SLOT, 10);
    slot.hit.on('pointerover', () => this.showDetailFor(slot.icon.itemId));
    slot.hit.on('pointerout', () => this.detailText.setText(''));
    return slot;
  }

  showDetailFor(id) {
    const def = ITEMS[id];
    this.detailText.setText(def ? `${def.name} — ${def.desc}` : '');
  }

  render() {
    setSlotItem(this.weaponSlot, this.inventory.weapon, ITEMS);
    setSlotItem(this.armorSlot, this.inventory.armor, ITEMS);
    this.hotbarSlots.forEach((slot, i) => setSlotItem(slot, this.inventory.hotbar[i], ITEMS));
    this.backpackSlots.forEach((slot, i) => setSlotItem(slot, this.inventory.backpack[i] ?? null, ITEMS));
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
