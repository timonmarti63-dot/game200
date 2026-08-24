// ============================================================================
// Shop-Katalog-Definitionen für Schmied, Apotheke und Schiffsbauer.
// Punkte 3 (Apotheken-Klinik) und 4 (Ship-Upgrades) des Master-Skripts.
//
// Alle Preise data-only - Balancing lässt sich hier zentral tunen ohne
// Scene-Code anzufassen.
// ============================================================================

/** Schmied - Waffen die Base_Attack erhöhen oder Elementar-Effekte hinzufügen. */
export const BLACKSMITH_CATALOG = [
  { id: 'iron_blade',    name: 'Eisenklinge',        priceGold: 120,  atkBonus: 8,  element: null,       description: '+8 Angriff. Solide Basis-Waffe.' },
  { id: 'flame_edge',    name: 'Flammenkante',       priceGold: 380,  atkBonus: 12, element: 'fire',     description: '+12 Angriff, Feuerschaden. Effektiv gegen Kristall.' },
  { id: 'frost_saber',   name: 'Frostsäbel',         priceGold: 380,  atkBonus: 12, element: 'water',    description: '+12 Angriff, Wasserschaden. Effektiv gegen Feuer.' },
  { id: 'storm_lance',   name: 'Sturmlanze',         priceGold: 650,  atkBonus: 18, element: 'electric', description: '+18 Angriff, Blitzschaden. Effektiv gegen Wasser.' },
  { id: 'kraken_maw',    name: 'Krakenmaul',         priceGold: 1200, atkBonus: 26, element: 'poison',   description: '+26 Angriff, Giftschaden. Endgame-Waffe.' },
];

/** Apotheke Tab 1 - Verbrauchsitems. */
export const APOTHECARY_ITEMS = [
  { id: 'health_potion',   name: 'Heiltrank',        priceGold: 25,  effect: 'heal',        magnitude: 40,  description: 'Stellt 40 HP wieder her.' },
  { id: 'strength_potion', name: 'Kraft-Elixier',    priceGold: 60,  effect: 'buffAtk',     magnitude: 5,   description: '+5 Angriff für 1 Kampf.' },
  { id: 'guard_potion',    name: 'Schutztrank',      priceGold: 60,  effect: 'buffDef',     magnitude: 5,   description: '+5 Verteidigung für 1 Kampf.' },
  { id: 'swift_potion',    name: 'Windtrank',        priceGold: 80,  effect: 'buffSpd',     magnitude: 8,   description: '+8 Speed für 1 Kampf.' },
  { id: 'revive',          name: 'Wiederbelebung',   priceGold: 250, effect: 'revive',      magnitude: 50,  description: 'Weckt gefallenes Crew-Mitglied mit 50% HP.' },
];

/**
 * Apotheke Tab 2 - "Klinik".
 * Permanente Attributs-Upgrades. Kosten steigen mit jedem Kauf.
 * Formel: cost(n) = baseGold * (1 + n * scale)  where n = # bisheriger Upgrades
 */
export const APOTHECARY_CLINIC = [
  { id: 'upgrade_hp',  name: 'Max HP +20',      stat: 'hp',  amount: 20, baseGold: 200, scaleGold: 0.8, xpCost: 50,  description: 'Permanent: +20 Max HP für gewähltes Crew-Mitglied.' },
  { id: 'upgrade_atk', name: 'Base_Attack +3',  stat: 'atk', amount: 3,  baseGold: 250, scaleGold: 1.0, xpCost: 60,  description: 'Permanent: +3 Angriff für gewähltes Crew-Mitglied.' },
  { id: 'upgrade_def', name: 'Base_Defense +3', stat: 'def', amount: 3,  baseGold: 250, scaleGold: 1.0, xpCost: 60,  description: 'Permanent: +3 Verteidigung für gewähltes Crew-Mitglied.' },
  { id: 'upgrade_spd', name: 'Speed +2',        stat: 'spd', amount: 2,  baseGold: 300, scaleGold: 1.2, xpCost: 80,  description: 'Permanent: +2 Speed für gewähltes Crew-Mitglied.' },
];

/**
 * Kosten für den n-ten Kauf eines Klinik-Upgrades.
 * n = wie viele des selben Stats das Crew-Mitglied schon hat (permanentUpgrades[stat] / amount).
 */
export function clinicCost(entry, n) {
  return Math.floor(entry.baseGold * (1 + n * entry.scaleGold));
}

// ---------------------------------------------------------------------------
// Schiffsbauer - Punkt 4 des Master-Skripts.
// ---------------------------------------------------------------------------
export const SHIP_UPGRADES = {
  hull: [
    { level: 1, name: 'Rumpf: Verstärkte Planken',  priceGold: 300,  maxHp: 60,  description: '+30 Schiffs-HP gegen See-Events und feindliche Schiffe.' },
    { level: 2, name: 'Rumpf: Eisenbeschlag',        priceGold: 800,  maxHp: 100, description: 'Zusätzlicher Schutz vor Kanonenfeuer.' },
    { level: 3, name: 'Rumpf: Kraken-Panzerung',     priceGold: 1800, maxHp: 160, description: 'Legendärer Schiffsrumpf. Praktisch unsinkbar.' },
  ],
  sails: [
    { level: 1, name: 'Segel: Leinenverstärkung',    priceGold: 250,  moveDelayMs: 220, description: 'Schiff bewegt sich merklich schneller (220ms/Feld).' },
    { level: 2, name: 'Segel: Sturmsegel',           priceGold: 700,  moveDelayMs: 160, description: 'Deutlich flotter (160ms/Feld). Hält auch bei Sturm.' },
    { level: 3, name: 'Segel: Windgeister-Tuch',     priceGold: 1600, moveDelayMs: 110, description: 'Fast Instant-Move (110ms/Feld).' },
  ],
  cannons: [
    { level: 1, name: 'Kanonen: Bronze-Geschütze',   priceGold: 400,  power: 20, canDestroy: ['rock_small'],                    description: 'Zerstört kleine Felsen auf dem Wasser.' },
    { level: 2, name: 'Kanonen: Stahl-Geschütze',    priceGold: 1000, power: 40, canDestroy: ['rock_small', 'rock_medium'],     description: 'Zerstört auch mittlere Felsen und Piraten-Barrieren.' },
    { level: 3, name: 'Kanonen: Drachenmaul-Batterie', priceGold: 2200, power: 75, canDestroy: ['rock_small', 'rock_medium', 'rock_large', 'endgame_barrier'], description: 'Zerstört alles, inklusive der Endgame-Blockaden.' },
  ],
};

/**
 * Ermittelt das aktuell installierte Upgrade-Level für eine Kategorie.
 * Registry-Key: `ship_upgrade_<category>` -> number (0 = keins)
 */
export function getShipUpgradeLevel(registry, category) {
  return registry.get(`ship_upgrade_${category}`) ?? 0;
}

export function setShipUpgradeLevel(registry, category, level) {
  registry.set(`ship_upgrade_${category}`, level);
  registry.events.emit(`shipUpgrade:${category}`, level);
}

/** Effektive Ship-Stats basierend auf installierten Upgrades. */
export function getShipStats(registry) {
  const hullLv = getShipUpgradeLevel(registry, 'hull');
  const sailsLv = getShipUpgradeLevel(registry, 'sails');
  const cannonsLv = getShipUpgradeLevel(registry, 'cannons');
  return {
    maxHp: hullLv > 0 ? SHIP_UPGRADES.hull[hullLv - 1].maxHp : 40,
    moveDelayMs: sailsLv > 0 ? SHIP_UPGRADES.sails[sailsLv - 1].moveDelayMs : 320,
    cannonPower: cannonsLv > 0 ? SHIP_UPGRADES.cannons[cannonsLv - 1].power : 0,
    canDestroy: cannonsLv > 0 ? SHIP_UPGRADES.cannons[cannonsLv - 1].canDestroy : [],
    hullLv, sailsLv, cannonsLv,
  };
}
