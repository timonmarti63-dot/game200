// ============================================================================
// CrewRegistry - Zentrales Data-Dictionary der 9 Piraten-Crew-Mitglieder.
// Folgt strikt dem Master-Skript. Alle Klassennamen sind exakt wie
// spezifiziert. Rein data-driven (keine Logik hier drin) - die eigentliche
// Turn-Based-Combat-Engine liest nur diese Definitionen.
//
// TODO(art): Pixel-Art-Sprites (48x64 Battler + 16x24 Overworld) unter
//   `assets/crew/<id>.png`. Aktuell werden Platzhalter-Farben verwendet.
// TODO(audio): SFX-Keys pro Skill in Sfx.js registrieren.
// ============================================================================

/** @typedef {'normal'|'poison'|'stone'|'wind'|'crystal'|'fire'|'water'|'ghost'|'electric'} ElementType */

/**
 * Elementar-Matrix: multiplier = ELEMENT_MATRIX[attackerType]?.[defenderType] ?? 1.0
 * Nur die interessanten Interaktionen sind eingetragen; alles andere ist 1.0.
 */
export const ELEMENT_MATRIX = {
  fire:     { stone: 0.5, water: 0.5, ghost: 1.0, crystal: 1.5 },
  water:    { fire: 2.0, electric: 0.5, stone: 1.5 },
  electric: { water: 2.0, wind: 1.5, stone: 0.5 },
  stone:    { wind: 0.5, fire: 1.5, electric: 2.0 },
  wind:     { poison: 1.5, stone: 2.0, electric: 0.5 },
  poison:   { water: 1.5, ghost: 0.5 },
  crystal:  { fire: 0.5, ghost: 2.0 },
  ghost:    { normal: 1.5, crystal: 0.5 },
  normal:   {},
};

/**
 * Skill-Definitionen (data-only). Die Combat-Scene interpretiert die
 * `effect`-Felder. Neue Effekte einfach ergänzen.
 */
export const SKILLS = {
  // --- Crew_01 Gras Brawler ---
  tackle:         { name: 'Tackle',          power: 40, type: 'normal',   accuracy: 100 },
  warcry:         { name: 'Warcry',          power: 0,  type: 'normal',   accuracy: 100, effect: 'buffSelfAtk', magnitude: 1 },
  // --- Crew_02 Wald Rogue ---
  poison_dagger:  { name: 'Giftdolch',       power: 25, type: 'poison',   accuracy: 100, effect: 'dot', magnitude: 3, duration: 3 },
  hide:           { name: 'Verstecken',      power: 0,  type: 'poison',   accuracy: 100, effect: 'evadeNext' },
  // --- Crew_03 Berg Tank ---
  rock_smash:     { name: 'Steinschlag',     power: 45, type: 'stone',    accuracy: 95 },
  stone_shield:   { name: 'Steinschild',     power: 0,  type: 'stone',    accuracy: 100, effect: 'buffSelfDef', magnitude: 2 },
  // --- Crew_04 Canyon Sniper ---
  piercing_shot:  { name: 'Durchdringer',    power: 50, type: 'wind',     accuracy: 90, effect: 'halveDef' },
  sand_attack:    { name: 'Sandwurf',        power: 0,  type: 'wind',     accuracy: 100, effect: 'debuffAccuracy', magnitude: 1 },
  // --- Crew_05 Höhle Defender ---
  crystal_beam:   { name: 'Kristallstrahl',  power: 55, type: 'crystal',  accuracy: 100 },
  reflect:        { name: 'Reflektion',      power: 0,  type: 'crystal',  accuracy: 100, effect: 'reflectNext' },
  // --- Crew_06 Vulkan Berserk ---
  flame_strike:   { name: 'Flammenhieb',     power: 60, type: 'fire',     accuracy: 95 },
  reckless_charge:{ name: 'Rasender Ansturm',power: 90, type: 'fire',     accuracy: 90, effect: 'recoil', magnitude: 0.25 },
  // --- Crew_07 Sumpf Healer ---
  water_gun:      { name: 'Wasserpistole',   power: 40, type: 'water',    accuracy: 100 },
  voodoo_heal:    { name: 'Voodoo-Heilung',  power: 0,  type: 'water',    accuracy: 100, effect: 'healAlly', magnitude: 40 },
  // --- Crew_08 Ruine Mage ---
  spirit_ball:    { name: 'Geisterball',     power: 55, type: 'ghost',    accuracy: 100 },
  curse:          { name: 'Fluch',           power: 0,  type: 'ghost',    accuracy: 90, effect: 'debuffAll', magnitude: 1 },
  // --- Crew_09 Klippe Specialist ---
  lightning_strike:{name: 'Blitzschlag',     power: 50, type: 'electric', accuracy: 95, effect: 'paralysis', chance: 0.3 },
  storm_speed:    { name: 'Sturmtempo',      power: 35, type: 'electric', accuracy: 100, effect: 'doubleHit' },
};

/**
 * Die 9 Crew-Mitglieder. Namen sind EXAKT wie im Master-Skript spezifiziert.
 * `recruitInVillage` markiert, in welchem Dorf sich das Mitglied befreien lässt.
 * `spriteKey` referenziert einen aktuell nicht existierenden Asset-Key -
 * Fallback ist die `placeholderColor` als farbiges Quadrat mit Namens-Tag.
 */
export const CREW_MEMBERS = {
  Crew_01_Gras_Brawler: {
    id: 'Crew_01_Gras_Brawler',
    displayName: 'Grim, der Grasrempler',
    type: 'normal',
    baseStats: { hp: 120, atk: 45, def: 30, spd: 25 },
    skills: ['tackle', 'warcry'],
    recruitInVillage: 'rubenfeld',
    spriteKey: 'crew_gras_brawler',
    placeholderColor: 0x7fa03f,
    role: 'Frontline Bruiser',
  },
  Crew_02_Wald_Rogue: {
    id: 'Crew_02_Wald_Rogue',
    displayName: 'Vex, die Waldratte',
    type: 'poison',
    baseStats: { hp: 80, atk: 40, def: 20, spd: 60 },
    skills: ['poison_dagger', 'hide'],
    recruitInVillage: 'waldhain',
    spriteKey: 'crew_wald_rogue',
    placeholderColor: 0x5b7d3c,
    role: 'Speedster / Assassin',
  },
  Crew_03_Berg_Tank: {
    id: 'Crew_03_Berg_Tank',
    displayName: 'Bors, der Bergblock',
    type: 'stone',
    baseStats: { hp: 150, atk: 35, def: 55, spd: 15 },
    skills: ['rock_smash', 'stone_shield'],
    recruitInVillage: 'eisenklamm',
    spriteKey: 'crew_berg_tank',
    placeholderColor: 0x7a6a55,
    role: 'Wall / Guardian',
  },
  Crew_04_Canyon_Sniper: {
    id: 'Crew_04_Canyon_Sniper',
    displayName: 'Lira, die Windschützin',
    type: 'wind',
    baseStats: { hp: 90, atk: 55, def: 25, spd: 45 },
    skills: ['piercing_shot', 'sand_attack'],
    recruitInVillage: 'canyon_camp',
    spriteKey: 'crew_canyon_sniper',
    placeholderColor: 0xc9a26b,
    role: 'Long Range DPS',
  },
  Crew_05_Hoehle_Defender: {
    id: 'Crew_05_Hoehle_Defender',
    displayName: 'Kryst, die Kristallwache',
    type: 'crystal',
    baseStats: { hp: 110, atk: 40, def: 45, spd: 30 },
    skills: ['crystal_beam', 'reflect'],
    recruitInVillage: 'kristallmine',
    spriteKey: 'crew_hoehle_defender',
    placeholderColor: 0x6ab7d1,
    role: 'Magic Defender',
  },
  Crew_06_Vulkan_Berserk: {
    id: 'Crew_06_Vulkan_Berserk',
    displayName: 'Ragnor, der Vulkanberserker',
    type: 'fire',
    baseStats: { hp: 95, atk: 65, def: 20, spd: 40 },
    skills: ['flame_strike', 'reckless_charge'],
    recruitInVillage: 'ascheposten',
    spriteKey: 'crew_vulkan_berserk',
    placeholderColor: 0xd15c2e,
    role: 'Glass Cannon',
  },
  Crew_07_Sumpf_Healer: {
    id: 'Crew_07_Sumpf_Healer',
    displayName: 'Mora, die Sumpfheilerin',
    type: 'water',
    baseStats: { hp: 100, atk: 30, def: 35, spd: 35 },
    skills: ['water_gun', 'voodoo_heal'],
    recruitInVillage: 'mooranger',
    spriteKey: 'crew_sumpf_healer',
    placeholderColor: 0x4a8a7a,
    role: 'Support / Healer',
  },
  Crew_08_Ruine_Mage: {
    id: 'Crew_08_Ruine_Mage',
    displayName: 'Silas, der Ruinenmagier',
    type: 'ghost',
    baseStats: { hp: 85, atk: 60, def: 25, spd: 40 },
    skills: ['spirit_ball', 'curse'],
    recruitInVillage: 'tempelhof',
    spriteKey: 'crew_ruine_mage',
    placeholderColor: 0x8a6dbf,
    role: 'Magic DPS / Debuffer',
  },
  Crew_09_Klippe_Specialist: {
    id: 'Crew_09_Klippe_Specialist',
    displayName: 'Zeta, die Sturmspezialistin',
    type: 'electric',
    baseStats: { hp: 90, atk: 55, def: 25, spd: 65 },
    skills: ['lightning_strike', 'storm_speed'],
    recruitInVillage: 'donnerhorst',
    spriteKey: 'crew_klippe_specialist',
    placeholderColor: 0xe6c74a,
    role: 'Fast Striker',
  },
};

/**
 * Factory - erstellt eine Battler-Instanz aus einem Crew-Template.
 * Battler = mutable Kampf-State (aktuelle HP, Buffs, ...) + immutable Template-Ref.
 */
export function createBattler(crewId) {
  const template = CREW_MEMBERS[crewId];
  if (!template) throw new Error(`Unknown crew id: ${crewId}`);
  return {
    id: crewId,
    template,
    stats: { ...template.baseStats },
    permanentUpgrades: { hp: 0, atk: 0, def: 0, spd: 0 },
    hp: template.baseStats.hp,
    buffs: [],
    debuffs: [],
    statusEffects: [],
    alive: true,
  };
}

/** Liest den effektiven Stat inklusive permanenter Upgrades (Apotheken-Klinik). */
export function getEffectiveStat(battler, key) {
  return (battler.stats[key] ?? 0) + (battler.permanentUpgrades[key] ?? 0);
}

/**
 * Master-Skript Schadensformel:
 *   Damage = ((Atk / Def) * SkillPower * ElementMult) * RNG(0.85, 1.0)
 */
export function calculateDamage(attacker, defender, skill, rngFn = Math.random) {
  const atk = getEffectiveStat(attacker, 'atk');
  let def = getEffectiveStat(defender, 'def');
  if (skill.effect === 'halveDef') def = Math.max(1, def / 2);
  const mult = ELEMENT_MATRIX[skill.type]?.[defender.template.type] ?? 1.0;
  const rng = 0.85 + rngFn() * 0.15;
  const raw = (atk / Math.max(1, def)) * skill.power * mult * rng;
  return Math.max(1, Math.floor(raw));
}
