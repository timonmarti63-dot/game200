import { getSpecies } from '../data/creatures.js';
import { statsAtLevel, expForLevel } from '../data/formulas.js';

let uidCounter = 1;

function movesForLevel(species, level) {
  const learned = species.learnset.filter((l) => l.level <= level).map((l) => l.moveId);
  const unique = [...new Set(learned)];
  return unique.slice(-4);
}

export function createCreature(speciesId, level) {
  const species = getSpecies(speciesId);
  const stats = statsAtLevel(species.baseStats, level);
  return {
    uid: uidCounter++,
    speciesId,
    nickname: species.name,
    level,
    exp: expForLevel(level),
    currentHp: stats.hp,
    status: null,
    statusTurns: 0,
    moves: movesForLevel(species, level),
  };
}

export function species(creature) {
  return getSpecies(creature.speciesId);
}

export function currentStats(creature) {
  return statsAtLevel(species(creature).baseStats, creature.level);
}

export function isFainted(creature) {
  return creature.currentHp <= 0;
}

// Applies EXP, resolves any number of level-ups and an evolution if the new
// level crosses evolvesAt. Returns { leveledUp, newLevel, evolvedTo } so the
// UI can narrate what happened.
export function gainExp(creature, amount) {
  const startLevel = creature.level;
  creature.exp += amount;
  let sp = species(creature);
  while (creature.level < 100 && creature.exp >= expForLevel(creature.level + 1)) {
    creature.level += 1;
  }
  const leveledUp = creature.level > startLevel;
  if (leveledUp) {
    const newMax = statsAtLevel(sp.baseStats, creature.level).hp;
    const oldMax = statsAtLevel(sp.baseStats, startLevel).hp;
    creature.currentHp = Math.min(newMax, creature.currentHp + (newMax - oldMax));
    creature.moves = movesForLevel(sp, creature.level);
  }
  let evolvedTo = null;
  if (sp.evolvesAt && creature.level >= sp.evolvesAt && sp.evolveTo) {
    creature.speciesId = sp.evolveTo;
    sp = species(creature);
    creature.moves = movesForLevel(sp, creature.level);
    evolvedTo = sp.name;
  }
  return { leveledUp, newLevel: creature.level, evolvedTo };
}

export function healFull(creature) {
  creature.currentHp = currentStats(creature).hp;
  creature.status = null;
  creature.statusTurns = 0;
}

export function healAmount(creature, amount) {
  const max = currentStats(creature).hp;
  creature.currentHp = Math.min(max, creature.currentHp + amount);
}
