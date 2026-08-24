// Central place for every number the battle/exploration engines produce, so
// balance can be tuned from one file. No IVs/EVs - base stats + level alone
// decide everything, kept deterministic on purpose for a text/UI-driven game.

export function statAt(base, level, isHp) {
  if (isHp) return Math.floor((base * level) / 50) + level + 10;
  return Math.floor((base * level) / 50) + 5;
}

export function statsAtLevel(baseStats, level) {
  return {
    hp: statAt(baseStats.hp, level, true),
    angriff: statAt(baseStats.angriff, level, false),
    verteidigung: statAt(baseStats.verteidigung, level, false),
    spAngriff: statAt(baseStats.spAngriff, level, false),
    spVerteidigung: statAt(baseStats.spVerteidigung, level, false),
    tempo: statAt(baseStats.tempo, level, false),
  };
}

// EXP needed to reach a given level (medium-fast cubic curve).
export function expForLevel(level) {
  return Math.floor(level ** 3);
}

export function expYield(defeated) {
  return Math.max(1, Math.floor((defeated.baseExpYield * defeated.level) / 7));
}

// Classic-inspired but simplified: no IVs/EVs, single random factor, flat
// 1.5x crit instead of stacking crit stages.
export function calcDamage({ attackerLevel, power, attackStat, defenseStat, typeMult, stab, isCrit, rng = Math.random }) {
  if (typeMult === 0) return { damage: 0, typeMult };
  const base = ((2 * attackerLevel) / 5 + 2) * power * (attackStat / Math.max(1, defenseStat)) / 50 + 2;
  const randomFactor = 0.85 + rng() * 0.15;
  const critMult = isCrit ? 1.5 : 1;
  const dmg = Math.max(1, Math.floor(base * typeMult * stab * randomFactor * critMult));
  return { damage: dmg, typeMult };
}

export const STATUS_CATCH_BONUS = {
  schlaf: 2.0,
  frost: 2.0,
  gift: 1.5,
  paralyse: 1.5,
  verbrennung: 1.5,
};

// Exact formula from the spec: P = ((MaxKP*3 - AktKP*2) / (MaxKP*3)) * BallBonus * StatusBonus
export function catchChance({ maxHp, curHp, ballBonus, status }) {
  const base = (maxHp * 3 - curHp * 2) / (maxHp * 3);
  const statusBonus = STATUS_CATCH_BONUS[status] ?? 1.0;
  return Math.max(0.02, Math.min(1, base * ballBonus * statusBonus));
}
