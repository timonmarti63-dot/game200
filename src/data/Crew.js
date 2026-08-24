// ---------------------------------------------------------------------------
// Central data dictionary for every recruitable crew member (section 6 of
// the design doc). This is pure data - no behaviour - so combat/recruitment
// logic can stay generic and simply read from these records. Stats are
// early-game placeholder numbers; tune freely once real balancing starts.
//
// skills reference IDs that will be resolved against a future Skills data
// dictionary (Damage = (Atk/Def) * Skill_Power * Element_Multiplier * RNG).
// Keeping skills as plain ID strings here (not full skill objects) keeps
// this file a pure roster definition and avoids duplicating skill data in
// two places once Skills.js exists.
//
// TODO(art): base_sprite is a placeholder key resolved by the renderer to a
// coloured rectangle + name tag (see systems/PlaceholderRenderer.js) until
// real pixel art exists.
// ---------------------------------------------------------------------------

export const ELEMENTS = Object.freeze({
  NORMAL: 'Normal',
  GIFT: 'Gift',
  STEIN: 'Stein',
  WIND: 'Wind',
  KRISTALL: 'Kristall',
  FEUER: 'Feuer',
  WASSER: 'Wasser',
  GEIST: 'Geist',
  ELEKTRO: 'Elektro',
});

// Simple rock-paper-scissors-style multiplier table, mirroring the
// `Element_Multiplier` term in the damage formula. Any pair not listed
// resolves to the DEFAULT export below (neutral). Fill in further matchups
// here as content grows - keeping it in one table avoids scattering
// type-effectiveness rules across combat code.
export const ELEMENT_CHART = {
  DEFAULT: 1.0,
  SUPER_EFFECTIVE: 2.0,
  NOT_VERY_EFFECTIVE: 0.5,
};

export const CREW_ROSTER = Object.freeze({
  Crew_01_Gras_Brawler: {
    id: 'Crew_01_Gras_Brawler',
    displayName: 'Gras-Raufbold',
    element: ELEMENTS.NORMAL,
    recruitedAtVillage: 'Insel1_Grasland',
    baseStats: { maxHp: 46, baseAttack: 12, baseDefense: 9, speed: 8 },
    skills: ['Skill_Tackle', 'Skill_Warcry'],
    base_sprite: 'placeholder_crew_01',
  },
  Crew_02_Wald_Rogue: {
    id: 'Crew_02_Wald_Rogue',
    displayName: 'Wald-Schurke',
    element: ELEMENTS.GIFT,
    recruitedAtVillage: 'Insel1_Wald',
    baseStats: { maxHp: 34, baseAttack: 11, baseDefense: 6, speed: 16 },
    skills: ['Skill_PoisonDagger', 'Skill_Hide'],
    base_sprite: 'placeholder_crew_02',
  },
  Crew_03_Berg_Tank: {
    id: 'Crew_03_Berg_Tank',
    displayName: 'Berg-Bollwerk',
    element: ELEMENTS.STEIN,
    recruitedAtVillage: 'Insel1_Gebirge',
    baseStats: { maxHp: 60, baseAttack: 9, baseDefense: 18, speed: 4 },
    skills: ['Skill_RockSmash', 'Skill_StoneShield'],
    base_sprite: 'placeholder_crew_03',
  },
  Crew_04_Canyon_Sniper: {
    id: 'Crew_04_Canyon_Sniper',
    displayName: 'Canyon-Scharfschütze',
    element: ELEMENTS.WIND,
    recruitedAtVillage: 'Insel2_Canyon',
    baseStats: { maxHp: 38, baseAttack: 15, baseDefense: 7, speed: 12 },
    skills: ['Skill_PiercingShot', 'Skill_SandAttack'],
    base_sprite: 'placeholder_crew_04',
  },
  Crew_05_Hoehle_Defender: {
    id: 'Crew_05_Hoehle_Defender',
    displayName: 'Höhlen-Wächter',
    element: ELEMENTS.KRISTALL,
    recruitedAtVillage: 'Insel2_Kristallhoehle',
    baseStats: { maxHp: 50, baseAttack: 10, baseDefense: 15, speed: 7 },
    skills: ['Skill_CrystalBeam', 'Skill_Reflect'],
    base_sprite: 'placeholder_crew_05',
  },
  Crew_06_Vulkan_Berserk: {
    id: 'Crew_06_Vulkan_Berserk',
    displayName: 'Vulkan-Berserker',
    element: ELEMENTS.FEUER,
    recruitedAtVillage: 'Insel2_Vulkan',
    baseStats: { maxHp: 40, baseAttack: 19, baseDefense: 6, speed: 10 },
    skills: ['Skill_FlameStrike', 'Skill_RecklessCharge'],
    base_sprite: 'placeholder_crew_06',
  },
  Crew_07_Sumpf_Healer: {
    id: 'Crew_07_Sumpf_Healer',
    displayName: 'Sumpf-Heiler',
    element: ELEMENTS.WASSER,
    recruitedAtVillage: 'Insel3_Sumpf',
    baseStats: { maxHp: 54, baseAttack: 8, baseDefense: 10, speed: 9 },
    skills: ['Skill_WaterGun', 'Skill_VoodooHeal'],
    base_sprite: 'placeholder_crew_07',
  },
  Crew_08_Ruine_Mage: {
    id: 'Crew_08_Ruine_Mage',
    displayName: 'Ruinen-Magier',
    element: ELEMENTS.GEIST,
    recruitedAtVillage: 'Insel3_Tempelruinen',
    baseStats: { maxHp: 36, baseAttack: 17, baseDefense: 8, speed: 11 },
    skills: ['Skill_SpiritBall', 'Skill_Curse'],
    base_sprite: 'placeholder_crew_08',
  },
  Crew_09_Klippe_Specialist: {
    id: 'Crew_09_Klippe_Specialist',
    displayName: 'Klippen-Spezialist',
    element: ELEMENTS.ELEKTRO,
    recruitedAtVillage: 'Insel3_Donnerklippen',
    baseStats: { maxHp: 40, baseAttack: 15, baseDefense: 8, speed: 17 },
    skills: ['Skill_LightningStrike', 'Skill_StormSpeed'],
    base_sprite: 'placeholder_crew_09',
  },
});

// Runtime instance factory - the roster above is the immutable template,
// this is what actually lives in the player's crew array (mutable HP,
// level, equipped weapon, permanent clinic upgrades applied on top of base).
export function createCrewInstance(crewId) {
  const template = CREW_ROSTER[crewId];
  if (!template) throw new Error(`Unbekanntes Crew-Mitglied: ${crewId}`);
  return {
    id: template.id,
    displayName: template.displayName,
    element: template.element,
    level: 1,
    exp: 0,
    // Mutable copy - clinic upgrades (Max_HP+X etc.) and equipped weapons
    // modify THIS, never the frozen CREW_ROSTER template.
    stats: { ...template.baseStats },
    currentHp: template.baseStats.maxHp,
    skills: [...template.skills],
    equippedWeapon: null, // Item id from Items.js, or null
    base_sprite: template.base_sprite,
  };
}

// The player's on-screen avatar on the overworld grid - not a combat unit,
// distinct from the crew roster.
export const PLAYER_CAPTAIN = Object.freeze({
  id: 'Obj_Player_Captain',
  base_sprite: 'placeholder_captain',
});
