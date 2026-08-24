// Difficulty modifiers applied globally. Selected on the DifficultyScene
// before Sailing and stored in registry.difficulty. Both Player and Enemy
// read from here so gameplay values stay in one place.

const D_KEY = 'difficulty';

export const DIFFICULTIES = {
  easy: {
    id: 'easy',
    label: 'Einfach',
    subtitle: '8 Herzen, weniger Schaden - für gemütliches Erkunden',
    playerMaxHp: 16,      // 8 hearts (2 hp per heart)
    enemyDamageMult: 0.75,
    enemyHpMult: 1.0,
    lootChance: 0.55,     // vs baseline 0.35
    silverMult: 1.5,
  },
  medium: {
    id: 'medium',
    label: 'Mittel',
    subtitle: '5 Herzen - der Standard-Krönungsritt',
    playerMaxHp: 10,      // 5 hearts (current baseline)
    enemyDamageMult: 1.0,
    enemyHpMult: 1.0,
    lootChance: 0.35,
    silverMult: 1.0,
  },
  hard: {
    id: 'hard',
    label: 'Hart',
    subtitle: '3 Herzen, tödliche Gegner - nur für Legenden',
    playerMaxHp: 6,       // 3 hearts
    enemyDamageMult: 1.5,
    enemyHpMult: 1.5,
    lootChance: 0.25,
    silverMult: 0.75,
  },
};

export function setDifficulty(registry, id) {
  const cfg = DIFFICULTIES[id] ?? DIFFICULTIES.medium;
  registry.set(D_KEY, cfg.id);
  return cfg;
}

export function getDifficulty(registry) {
  const id = registry.get(D_KEY) ?? 'medium';
  return DIFFICULTIES[id] ?? DIFFICULTIES.medium;
}
