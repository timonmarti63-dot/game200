import { ITEMS } from './Items.js';
import { savePlayerState } from './PlayerState.js';

const BACKPACK_SIZE = 12;
const HOTBAR_SIZE = 4;
const STACK_MAX = 9;
const STACKABLE_TYPES = new Set(['consumable', 'throwable']);

export default class Inventory {
  constructor(player) {
    this.player = player;
    this.scene = player.scene;
    this.weapon = 'sword';
    this.armor = null;
    // hotbar/backpack slots hold either null or { id, qty }
    this.hotbar = new Array(HOTBAR_SIZE).fill(null);
    this.backpack = [];
  }

  emitChanged() {
    this.scene.events.emit('inventoryChanged', this);
    savePlayerState(this.player);
  }

  // Try the hotbar first (for consumables/throwables/trinkets), then the
  // backpack. Weapons/armor equip directly if that slot is free. Permanent
  // abilities (e.g. the grapple hook) never occupy a slot. Stackable types
  // merge into an existing same-id stack before opening a new slot. Returns
  // false if there was nowhere to put the item.
  addItem(id) {
    const def = ITEMS[id];
    if (!def) return false;

    if (def.type === 'ability') {
      this.player.unlockAbility(id);
      return true;
    }
    if (def.type === 'weapon' && !this.weapon) {
      this.weapon = id;
      this.emitChanged();
      return true;
    }
    if (def.type === 'armor' && !this.armor) {
      this.armor = id;
      this.player.applyArmorBonus();
      this.emitChanged();
      return true;
    }

    if (STACKABLE_TYPES.has(def.type)) {
      const hotbarStack = this.hotbar.find((e) => e && e.id === id && e.qty < STACK_MAX);
      if (hotbarStack) {
        hotbarStack.qty += 1;
        this.emitChanged();
        return true;
      }
      const backpackStack = this.backpack.find((e) => e.id === id && e.qty < STACK_MAX);
      if (backpackStack) {
        backpackStack.qty += 1;
        this.emitChanged();
        return true;
      }
    }

    const emptyHotbar = this.hotbar.indexOf(null);
    if ((def.type === 'consumable' || def.type === 'throwable' || def.type === 'trinket') && emptyHotbar !== -1) {
      this.hotbar[emptyHotbar] = { id, qty: 1 };
      this.emitChanged();
      return true;
    }

    if (this.backpack.length < BACKPACK_SIZE) {
      this.backpack.push({ id, qty: 1 });
      this.emitChanged();
      return true;
    }
    return false;
  }

  removeFromBackpack(index) {
    const [entry] = this.backpack.splice(index, 1);
    this.emitChanged();
    return entry?.id ?? null;
  }

  moveBackpackToHotbar(backpackIndex, hotbarIndex) {
    const entry = this.backpack[backpackIndex];
    if (!entry) return;
    const displaced = this.hotbar[hotbarIndex];
    this.hotbar[hotbarIndex] = entry;
    this.backpack.splice(backpackIndex, 1);
    if (displaced) this.backpack.push(displaced);
    this.emitChanged();
  }

  moveHotbarToBackpack(hotbarIndex) {
    const entry = this.hotbar[hotbarIndex];
    if (!entry || this.backpack.length >= BACKPACK_SIZE) return;
    this.hotbar[hotbarIndex] = null;
    this.backpack.push(entry);
    this.emitChanged();
  }

  equipFromBackpack(backpackIndex) {
    const entry = this.backpack[backpackIndex];
    const def = entry ? ITEMS[entry.id] : null;
    if (!def || (def.type !== 'weapon' && def.type !== 'armor')) return;
    this.backpack.splice(backpackIndex, 1);
    if (def.type === 'weapon') {
      if (this.weapon) this.backpack.push({ id: this.weapon, qty: 1 });
      this.weapon = entry.id;
    } else {
      if (this.armor) this.backpack.push({ id: this.armor, qty: 1 });
      this.armor = entry.id;
      this.player.applyArmorBonus();
    }
    this.emitChanged();
  }

  unequipWeapon() {
    if (!this.weapon || this.backpack.length >= BACKPACK_SIZE) return;
    this.backpack.push({ id: this.weapon, qty: 1 });
    this.weapon = null;
    this.emitChanged();
  }

  unequipArmor() {
    if (!this.armor || this.backpack.length >= BACKPACK_SIZE) return;
    this.backpack.push({ id: this.armor, qty: 1 });
    this.armor = null;
    this.player.applyArmorBonus();
    this.emitChanged();
  }

  useHotbar(index) {
    const entry = this.hotbar[index];
    if (!entry) return;
    const def = ITEMS[entry.id];
    if (def.type === 'consumable') {
      this.player.consumePotion(def);
      entry.qty -= 1;
      if (entry.qty <= 0) this.hotbar[index] = null;
      this.emitChanged();
    } else if (def.type === 'throwable') {
      this.player.throwItem(def);
      entry.qty -= 1;
      if (entry.qty <= 0) this.hotbar[index] = null;
      this.emitChanged();
    } else if (def.type === 'trinket') {
      this.player.useTrinket(def);
    }
  }
}
