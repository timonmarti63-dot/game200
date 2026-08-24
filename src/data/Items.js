// ---------------------------------------------------------------------------
// Item data dictionary (section 3 - Apotheke, and general inventory items).
// kind distinguishes how UseItem() in the future combat/menu system should
// route it: 'consumable_battle' items apply combat effects, 'clinic_upgrade'
// items are one-time permanent stat purchases (not carried in the inventory
// array at all - the clinic buys them and applies the effect immediately).
// ---------------------------------------------------------------------------

export const ITEM_KIND = Object.freeze({
  CONSUMABLE_BATTLE: 'consumable_battle',
  CLINIC_UPGRADE: 'clinic_upgrade',
  WEAPON: 'weapon',
});

export const ITEMS = Object.freeze({
  Health_Potion: {
    id: 'Health_Potion',
    displayName: 'Heiltrank',
    kind: ITEM_KIND.CONSUMABLE_BATTLE,
    cost_gold: 20,
    effect: { type: 'heal', amount: 30 },
    base_sprite: 'placeholder_item_potion',
  },
  Strength_Potion: {
    id: 'Strength_Potion',
    displayName: 'Kraft-Elixier',
    kind: ITEM_KIND.CONSUMABLE_BATTLE,
    cost_gold: 35,
    // Buff lasts exactly one combat encounter, matching the design doc.
    effect: { type: 'buff', stat: 'baseAttack', amount: 5, duration: 'single_combat' },
    base_sprite: 'placeholder_item_strength',
  },

  // --- Klinik: permanent, one-time attribute upgrades (paid in gold+EXP) ---
  Clinic_Upgrade_MaxHP: {
    id: 'Clinic_Upgrade_MaxHP',
    displayName: 'Klinik: Max. KP +10',
    kind: ITEM_KIND.CLINIC_UPGRADE,
    cost_gold: 150,
    cost_exp: 50,
    effect: { type: 'permanent_stat', stat: 'maxHp', amount: 10 },
  },
  Clinic_Upgrade_Attack: {
    id: 'Clinic_Upgrade_Attack',
    displayName: 'Klinik: Angriff +3',
    kind: ITEM_KIND.CLINIC_UPGRADE,
    cost_gold: 150,
    cost_exp: 50,
    effect: { type: 'permanent_stat', stat: 'baseAttack', amount: 3 },
  },
  Clinic_Upgrade_Defense: {
    id: 'Clinic_Upgrade_Defense',
    displayName: 'Klinik: Verteidigung +3',
    kind: ITEM_KIND.CLINIC_UPGRADE,
    cost_gold: 150,
    cost_exp: 50,
    effect: { type: 'permanent_stat', stat: 'baseDefense', amount: 3 },
  },

  // --- Schmied: weapons, equippable on one crew member ---
  Weapon_Rusty_Cutlass: {
    id: 'Weapon_Rusty_Cutlass',
    displayName: 'Rostiger Entermesser',
    kind: ITEM_KIND.WEAPON,
    cost_gold: 60,
    effect: { type: 'weapon_bonus', stat: 'baseAttack', amount: 4, elementTag: null },
    base_sprite: 'placeholder_weapon_cutlass',
  },
  Weapon_Flintlock_Pistol: {
    id: 'Weapon_Flintlock_Pistol',
    displayName: 'Steinschlosspistole',
    kind: ITEM_KIND.WEAPON,
    cost_gold: 90,
    effect: { type: 'weapon_bonus', stat: 'baseAttack', amount: 6, elementTag: null },
    base_sprite: 'placeholder_weapon_pistol',
  },
});

export function getItem(itemId) {
  const item = ITEMS[itemId];
  if (!item) throw new Error(`Unbekannter Gegenstand: ${itemId}`);
  return item;
}

// Applies a CLINIC_UPGRADE or WEAPON item's effect directly onto a crew
// runtime instance (see Crew.createCrewInstance). Battle consumables are
// intentionally NOT handled here - those apply inside the future combat
// scene where "single_combat" duration and turn consumption make sense.
export function applyPermanentItemEffect(crewInstance, itemId) {
  const item = getItem(itemId);
  if (item.kind === ITEM_KIND.CLINIC_UPGRADE) {
    const { stat, amount } = item.effect;
    crewInstance.stats[stat] += amount;
    if (stat === 'maxHp') crewInstance.currentHp += amount;
    return crewInstance;
  }
  if (item.kind === ITEM_KIND.WEAPON) {
    crewInstance.equippedWeapon = itemId;
    return crewInstance;
  }
  throw new Error(`${itemId} ist kein permanent anwendbarer Gegenstand.`);
}
