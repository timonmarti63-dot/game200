import { getMove } from '../data/moves.js';
import { typeMultiplier } from '../data/types.js';
import { calcDamage, catchChance, expYield } from '../data/formulas.js';
import { species, currentStats, isFainted, gainExp, healAmount } from './team.js';

const STAGE_MULT = { '-6': 0.25, '-5': 0.29, '-4': 0.33, '-3': 0.4, '-2': 0.5, '-1': 0.67,
  0: 1, 1: 1.5, 2: 2, 3: 2.5, 4: 3, 5: 3.5, 6: 4 };

function freshStages() {
  return { angriff: 0, verteidigung: 0, spAngriff: 0, spVerteidigung: 0, tempo: 0 };
}

// A "fighter" wraps a creature instance with battle-only state (stat stages)
// so team creatures never carry battle state between fights.
function makeFighter(creature, isPlayer) {
  return { creature, isPlayer, stages: freshStages() };
}

export function startBattle({ playerTeam, activeIndex, opponent, weather = 'Klar', canFlee = true, canCatch }) {
  if (opponent.kind === 'trainer' && opponent.activeIndex === undefined) opponent.activeIndex = 0;
  const playerActive = playerTeam[activeIndex];
  const state = {
    playerTeam,
    playerActiveIndex: activeIndex,
    opponent, // { kind: 'wild', creature } | { kind: 'trainer', trainer, team, activeIndex }
    weather,
    canFlee,
    canCatch: canCatch ?? opponent.kind === 'wild',
    playerFighter: makeFighter(playerActive, true),
    oppFighter: makeFighter(opponentActive(opponent), false),
    log: [`${opponent.kind === 'wild' ? `Ein wildes ${species(opponentActive(opponent)).name}` : opponent.trainer.name} erscheint!`],
    ended: false,
    outcome: null,
  };
  return state;
}

function opponentActive(opponent) {
  return opponent.kind === 'wild' ? opponent.creature : opponent.team[opponent.activeIndex];
}

function statValue(fighter, statKey) {
  const base = currentStats(fighter.creature)[statKey];
  const stage = fighter.stages[statKey] ?? 0;
  let mult = STAGE_MULT[String(Math.max(-6, Math.min(6, stage)))];
  if (statKey === 'tempo' && fighter.creature.status === 'paralyse') mult *= 0.5;
  return Math.max(1, Math.floor(base * mult));
}

function pickOpponentMove(fighter) {
  const known = species(fighter.creature).learnset
    .filter((l) => l.level <= fighter.creature.level)
    .map((l) => l.moveId);
  const pool = fighter.creature.moves.length ? fighter.creature.moves : known.slice(-4);
  return pool[Math.floor(Math.random() * pool.length)];
}

function weatherMult(moveType, weather) {
  if (weather === 'Sturm' && moveType === 'Sturm') return 1.2;
  if (weather === 'Nebel' && (moveType === 'Sturm' || moveType === 'Licht')) return 0.85;
  return 1;
}

function applyStatus(target, status, chance, log) {
  if (target.creature.status || Math.random() > chance) return;
  target.creature.status = status;
  target.creature.statusTurns = status === 'schlaf' ? 1 + Math.floor(Math.random() * 3) : 0;
  const names = { gift: 'vergiftet', paralyse: 'paralysiert', verbrennung: 'verbrannt', schlaf: 'eingeschlafen', frost: 'erstarrt' };
  log.push(`${target.creature.nickname} ist jetzt ${names[status]}!`);
}

function canAct(fighter, log) {
  const c = fighter.creature;
  if (isFainted(c)) return false;
  if (c.status === 'schlaf') {
    c.statusTurns -= 1;
    if (c.statusTurns <= 0) {
      c.status = null;
      log.push(`${c.nickname} wacht auf!`);
      return true;
    }
    log.push(`${c.nickname} schläft fest.`);
    return false;
  }
  if (c.status === 'frost') {
    if (Math.random() < 0.2) {
      c.status = null;
      log.push(`${c.nickname} taut auf!`);
      return true;
    }
    log.push(`${c.nickname} ist erstarrt und kann sich nicht bewegen.`);
    return false;
  }
  if (c.status === 'paralyse' && Math.random() < 0.25) {
    log.push(`${c.nickname} ist paralysiert und kann sich nicht bewegen!`);
    return false;
  }
  return true;
}

function executeMove(attacker, defender, moveId, state) {
  const move = getMove(moveId);
  const log = state.log;
  if (Math.random() * 100 > move.accuracy) {
    log.push(`${attacker.creature.nickname} setzt ${move.name} ein... Daneben!`);
    return;
  }
  log.push(`${attacker.creature.nickname} setzt ${move.name} ein!`);

  if (move.category !== 'status') {
    const atkStat = statValue(attacker, move.category === 'phys' ? 'angriff' : 'spAngriff');
    const defStat = statValue(defender, move.category === 'phys' ? 'verteidigung' : 'spVerteidigung');
    const defTypes = species(defender.creature).types;
    const atkTypes = species(attacker.creature).types;
    const typeMult = typeMultiplier(move.type, defTypes) * weatherMult(move.type, state.weather);
    const stab = atkTypes.includes(move.type) ? 1.5 : 1.0;
    const isCrit = Math.random() < 1 / 16;
    const { damage } = calcDamage({
      attackerLevel: attacker.creature.level, power: move.power, attackStat: atkStat,
      defenseStat: defStat, typeMult, stab, isCrit,
    });
    if (typeMult === 0) {
      log.push(`Hat keine Wirkung auf ${defender.creature.nickname}...`);
    } else {
      defender.creature.currentHp = Math.max(0, defender.creature.currentHp - damage);
      if (isCrit) log.push('Volltreffer!');
      if (typeMult > 1) log.push('Das ist sehr effektiv!');
      else if (typeMult < 1) log.push('Ist nicht sehr effektiv...');
    }
  }

  if (move.effect?.heal) {
    healAmount(attacker.creature, Math.floor(currentStats(attacker.creature).hp * move.effect.heal));
  }
  if (move.effect?.status && !isFainted(defender.creature)) {
    applyStatus(defender, move.effect.status, move.effect.chance, log);
  }
  if (move.effect?.statChange) {
    const { stat, stages, target } = move.effect.statChange;
    const who = target === 'selbst' ? attacker : defender;
    who.stages[stat] = Math.max(-6, Math.min(6, (who.stages[stat] ?? 0) + stages));
    log.push(`${who.creature.nickname}s ${stat} ${stages > 0 ? 'steigt' : 'sinkt'}!`);
  }
}

function endOfTurnStatus(fighter, log) {
  const c = fighter.creature;
  if (isFainted(c)) return;
  const max = currentStats(c).hp;
  if (c.status === 'gift') {
    c.currentHp = Math.max(0, c.currentHp - Math.max(1, Math.floor(max / 8)));
    log.push(`${c.nickname} leidet unter dem Gift.`);
  } else if (c.status === 'verbrennung') {
    c.currentHp = Math.max(0, c.currentHp - Math.max(1, Math.floor(max / 16)));
    log.push(`${c.nickname} leidet unter der Verbrennung.`);
  }
}

function checkFaint(fighter, log) {
  if (isFainted(fighter.creature) && fighter.creature.status !== 'ko') {
    fighter.creature.status = 'ko';
    log.push(`${fighter.creature.nickname} wurde besiegt!`);
    return true;
  }
  return false;
}

// action: { type: 'move', moveId } | { type: 'item', itemId } | { type: 'catch', itemId } | { type: 'flee' } | { type: 'switch', creature }
export function resolveTurn(state, action) {
  if (state.ended) return state;
  const log = (state.log = []);
  const player = state.playerFighter;
  const opp = state.oppFighter;

  if (action.type === 'flee') {
    if (Math.random() < 0.85) {
      log.push('Ihr entkommt sicher!');
      state.ended = true;
      state.outcome = 'flee';
    } else {
      log.push('Die Flucht ist fehlgeschlagen!');
      resolveOpponentTurn(state);
    }
    return state;
  }

  if (action.type === 'catch') {
    const target = opp.creature;
    const p = catchChance({ maxHp: currentStats(target).hp, curHp: target.currentHp, ballBonus: action.ballBonus, status: target.status });
    log.push(`Fangchance: ${Math.round(p * 100)}%`);
    if (Math.random() < p) {
      log.push(`${target.nickname} wurde gefangen!`);
      state.ended = true;
      state.outcome = 'caught';
      state.caughtCreature = target;
    } else {
      log.push(`${target.nickname} hat sich losgerissen!`);
      resolveOpponentTurn(state);
    }
    return state;
  }

  if (action.type === 'switch') {
    state.playerActiveIndex = action.index;
    player.creature = state.playerTeam[action.index];
    player.stages = freshStages();
    log.push(`Los, ${player.creature.nickname}!`);
    resolveOpponentTurn(state);
    return state;
  }

  if (action.type === 'item') {
    log.push(`${player.creature.nickname} wird mit ${action.itemName} behandelt.`);
    healAmount(player.creature, action.healAmount);
    player.creature.status = action.cures ? null : player.creature.status;
    resolveOpponentTurn(state);
    return state;
  }

  // action.type === 'move'
  const playerFirst = statValue(player, 'tempo') >= statValue(opp, 'tempo');
  const first = playerFirst ? player : opp;
  const second = playerFirst ? opp : player;
  const firstMove = playerFirst ? action.moveId : pickOpponentMove(opp);
  const secondMove = playerFirst ? pickOpponentMove(opp) : action.moveId;

  if (canAct(first, log)) executeMove(first, second, firstMove, state);
  checkFaint(second, log);
  if (checkEnd(state)) return state;
  if (canAct(second, log)) executeMove(second, first, secondMove, state);
  checkFaint(first, log);
  if (checkEnd(state)) return state;

  endOfTurnStatus(player, log);
  endOfTurnStatus(opp, log);
  checkFaint(player, log);
  checkFaint(opp, log);
  checkEnd(state);
  return state;
}

function resolveOpponentTurn(state) {
  const log = state.log;
  const opp = state.oppFighter;
  const player = state.playerFighter;
  if (canAct(opp, log)) executeMove(opp, player, pickOpponentMove(opp), state);
  checkFaint(player, log);
  if (checkEnd(state)) return;
  endOfTurnStatus(opp, log);
  endOfTurnStatus(player, log);
  checkFaint(opp, log);
  checkFaint(player, log);
  checkEnd(state);
}

function checkEnd(state) {
  const log = state.log;
  if (isFainted(state.oppFighter.creature)) {
    if (state.opponent.kind === 'wild') {
      log.push('Der Sieg ist Euer!');
      const exp = expYield({ baseExpYield: species(state.oppFighter.creature).baseExpYield, level: state.oppFighter.creature.level });
      const result = gainExp(state.playerFighter.creature, exp);
      log.push(`${state.playerFighter.creature.nickname} erhält ${exp} EP!`);
      if (result.leveledUp) log.push(`${state.playerFighter.creature.nickname} erreicht Level ${result.newLevel}!`);
      if (result.evolvedTo) log.push(`${state.playerFighter.creature.nickname} entwickelt sich zu ${result.evolvedTo}!`);
      state.ended = true;
      state.outcome = 'win';
      return true;
    }
    const nextIndex = state.opponent.team.findIndex((c, i) => i > state.opponent.activeIndex && !isFainted(c));
    if (nextIndex === -1) {
      const exp = expYield({ baseExpYield: species(state.oppFighter.creature).baseExpYield, level: state.oppFighter.creature.level });
      const result = gainExp(state.playerFighter.creature, exp);
      log.push(`${state.playerFighter.creature.nickname} erhält ${exp} EP!`);
      if (result.leveledUp) log.push(`${state.playerFighter.creature.nickname} erreicht Level ${result.newLevel}!`);
      if (result.evolvedTo) log.push(`${state.playerFighter.creature.nickname} entwickelt sich zu ${result.evolvedTo}!`);
      log.push(state.opponent.trainer.defeatText);
      state.ended = true;
      state.outcome = 'win';
      return true;
    }
    const exp = expYield({ baseExpYield: species(state.oppFighter.creature).baseExpYield, level: state.oppFighter.creature.level });
    gainExp(state.playerFighter.creature, exp);
    log.push(`${state.playerFighter.creature.nickname} erhält ${exp} EP!`);
    state.opponent.activeIndex = nextIndex;
    state.oppFighter = makeFighter(state.opponent.team[nextIndex], false);
    log.push(`${state.opponent.trainer.name} schickt ${state.oppFighter.creature.nickname}!`);
    return false;
  }
  if (isFainted(state.playerFighter.creature)) {
    const hasMore = state.playerTeam.some((c) => !isFainted(c));
    if (!hasMore) {
      log.push('Euer gesamtes Team ist kampfunfähig...');
      state.ended = true;
      state.outcome = 'lose';
      return true;
    }
    log.push(`${state.playerFighter.creature.nickname} kann nicht mehr kämpfen. Wählt eine andere Kreatur!`);
    state.needsSwitch = true;
    return false;
  }
  return false;
}
