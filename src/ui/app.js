import { SPECIES, getSpecies } from '../data/creatures.js';
import { getMove } from '../data/moves.js';
import { getItem } from '../data/items.js';
import { getZone, ZONES } from '../data/zones.js';
import { getTrainer } from '../data/trainers.js';
import { createCreature, currentStats, isFainted, species as speciesOf } from '../engine/team.js';
import { explore, rest, advance, currentArea } from '../engine/exploration.js';
import { startBattle, resolveTurn } from '../engine/battle.js';
import * as GameState from '../engine/gamestate.js';
import { Sfx } from '../systems/Sfx.js';

const TYPE_COLORS = {
  Normal: '#b9ae8d', Feuer: '#d1592f', Flut: '#3b7fc4', Erde: '#9c7a3c',
  Sturm: '#7fb8d4', Wald: '#4f8f3f', Stahl: '#8892a0', Licht: '#e8c979', Schatten: '#8f7ab5',
};

const STARTER_IDS = ['wurzling', 'flackling', 'tropfling'];

const STATUS_LABEL = { gift: 'Gift', paralyse: 'Paralyse', verbrennung: 'Verbrennung', schlaf: 'Schlaf', frost: 'Frost' };

let state = { screen: 'boot', save: null, battle: null, ui: {} };
let rootEl = null;

export function mount(el) {
  rootEl = el;
  el.addEventListener('click', onClick);
  bootstrap();
}

function bootstrap() {
  const saved = GameState.hasSave() ? GameState.load() : null;
  if (saved) {
    state = { screen: 'zone', save: saved, battle: null, ui: {} };
  } else {
    state = { screen: 'title', save: null, battle: null, ui: {} };
  }
  render();
}

function persist() {
  if (state.save) GameState.save(state.save);
}

function setScreen(screen, uiPatch = {}) {
  state.screen = screen;
  state.ui = { ...uiPatch };
  render();
}

function sprite(id, cls = 'sprite') {
  return `<img class="${cls}" src="/sprites/creatures/${id}.png" alt="" onerror="this.style.visibility='hidden'" />`;
}

function trainerSprite(id, cls = 'sprite') {
  return `<img class="${cls}" src="/sprites/trainers/${id}.png" alt="" onerror="this.style.visibility='hidden'" />`;
}

function typeBadges(types) {
  return types.map((t) => `<span class="type-badge" style="background:${TYPE_COLORS[t]}">${t}</span>`).join(' ');
}

function hpColor(frac) {
  if (frac > 0.5) return 'var(--hp-good)';
  if (frac > 0.2) return 'var(--hp-mid)';
  return 'var(--hp-low)';
}

function hpBar(creature) {
  const max = currentStats(creature).hp;
  const frac = Math.max(0, creature.currentHp / max);
  return `<div class="hp-bar-track"><div class="hp-bar-fill" style="width:${Math.round(frac * 100)}%;background:${hpColor(frac)}"></div></div>
    <div class="hp-text">${Math.max(0, creature.currentHp)} / ${max} KP</div>`;
}

function statusBadge(creature) {
  if (!creature.status || creature.status === 'ko') return '';
  return `<span class="status-badge">${STATUS_LABEL[creature.status] ?? creature.status}</span>`;
}

// ---------- render ----------

function render() {
  if (!rootEl) return;
  rootEl.innerHTML = renderScreen();
}

function renderScreen() {
  switch (state.screen) {
    case 'title': return renderTitle();
    case 'starter': return renderStarter();
    case 'zone': return renderZone();
    case 'trainerIntro': return renderTrainerIntro();
    case 'battle': return renderBattle();
    case 'team': return renderTeam();
    case 'gameover': return renderGameOver();
    case 'victory': return renderVictory();
    default: return '';
  }
}

function renderTitle() {
  const hasSave = GameState.hasSave();
  return `
    <div class="title-screen">
      <h1 class="game-title">Orden der Wildnis</h1>
      <p class="subtitle">Ein Kreaturen-Abenteuer im Reich von Krone &amp; Kettenhemd</p>
      <div class="btn-row">
        <button class="btn primary" data-action="new-game">Neues Abenteuer beginnen</button>
        ${hasSave ? '<button class="btn" data-action="continue">Fortsetzen</button>' : ''}
      </div>
    </div>`;
}

function renderStarter() {
  const cards = STARTER_IDS.map((id) => {
    const sp = getSpecies(id);
    return `<div class="starter-card" data-action="pick-starter" data-arg="${id}" tabindex="0">
      ${sprite(sp.sprite)}
      <div class="name">${sp.name}</div>
      <div>${typeBadges(sp.types)}</div>
    </div>`;
  }).join('');
  return `
    <div class="title-screen">
      <h1 class="game-title" style="font-size:24px">Wählt Euren Gefährten</h1>
      <div class="starter-grid">${cards}</div>
    </div>`;
}

function zoneUnlockStatus(zone) {
  if (!zone.requiresOrden) return true;
  return state.save.ordenIds.includes(zone.requiresOrden);
}

function renderZone() {
  const s = state.save;
  const zone = getZone(s.currentZoneId);
  const zoneState = s.zoneStates[zone.id];
  const area = currentArea(zoneState);
  const isBossArea = area.isBossArea;
  const trainer = zone.bossId ? getTrainer(zone.bossId) : null;
  const bossDefeated = trainer ? s.ordenIds.includes(trainer.rewardOrden) : false;
  const nextZone = ZONES[ZONES.findIndex((z) => z.id === zone.id) + 1];
  const canGoNext = isBossArea && bossDefeated && nextZone && zoneUnlockStatus(nextZone) && !nextZone.comingSoon;
  const nextIsComingSoon = isBossArea && bossDefeated && nextZone && nextZone.comingSoon;

  const message = state.ui.message ? `<p class="area-flavor" style="color:var(--gold-bright)">${state.ui.message}</p>` : '';

  return `
    <div class="panel">
      <div class="zone-header">
        <h2>${zone.name}</h2>
        <span class="zone-meta">${area.name} · Wetter: ${zone.weather}</span>
      </div>
      <p class="area-flavor">${area.flavor}</p>
      ${message}
      ${!isBossArea ? `<div class="danger-track"><div class="danger-fill" style="width:${zoneState.dangerCounter}%"></div></div>` : ''}
      <div class="action-grid">
        ${!isBossArea ? '<button class="btn" data-action="explore">Erkunden</button>' : ''}
        ${!isBossArea ? '<button class="btn" data-action="rest">Rasten</button>' : ''}
        ${isBossArea && trainer && !bossDefeated ? `<button class="btn primary" data-action="challenge-boss" style="grid-column:1/-1">${trainer.name} herausfordern</button>` : ''}
        ${canGoNext ? `<button class="btn primary" data-action="next-zone" style="grid-column:1/-1">Weiter nach ${nextZone.name}</button>` : ''}
        ${nextIsComingSoon ? '<div class="area-flavor" style="grid-column:1/-1">Der Weg nach Möwenhort liegt noch im Nebel - mehr folgt bald!</div>' : ''}
        ${!isBossArea ? '<button class="btn" data-action="advance">Weiterziehen</button>' : ''}
        <button class="btn" data-action="open-team" style="grid-column:1/-1">Team &amp; Beutel</button>
      </div>
    </div>`;
}

function renderTrainerIntro() {
  const trainer = getTrainer(state.ui.trainerId);
  return `
    <div class="panel">
      <div class="trainer-banner">
        ${trainerSprite(trainer.sprite)}
        <div>
          <div class="name">${trainer.name}</div>
          <div class="zone-meta">${trainer.title}</div>
        </div>
      </div>
      <p class="area-flavor">${trainer.greeting}</p>
      <button class="btn primary" data-action="start-boss-battle">Kämpfen</button>
    </div>`;
}

function renderBattle() {
  const b = state.battle;
  const player = b.playerFighter.creature;
  const opp = b.oppFighter.creature;
  const menu = state.ui.battleMenu ?? 'main';

  const logHtml = b.log.map((line) => `<p>${line}</p>`).join('');

  let actionsHtml = '';
  if (b.ended) {
    actionsHtml = `<button class="btn primary" data-action="battle-continue">Weiter</button>`;
  } else if (b.needsSwitch) {
    actionsHtml = renderSwitchList(true);
  } else if (menu === 'moves') {
    actionsHtml = renderMoveGrid(player);
  } else if (menu === 'items') {
    actionsHtml = renderBattleItems();
  } else if (menu === 'switch') {
    actionsHtml = renderSwitchList(false);
  } else {
    actionsHtml = `
      <div class="action-grid">
        <button class="btn" data-action="menu-moves">Kämpfen</button>
        <button class="btn" data-action="menu-items">Beutel</button>
        <button class="btn" data-action="menu-switch">Wechseln</button>
        ${b.canFlee ? '<button class="btn" data-action="flee">Flucht</button>' : '<div></div>'}
      </div>`;
  }

  return `
    <div class="panel">
      <div class="combatants">
        <div class="combatant player">
          ${sprite(speciesOf(player).sprite)}
          <div class="hp-name">${player.nickname} Lv.${player.level} ${statusBadge(player)}</div>
          ${hpBar(player)}
        </div>
        <div class="combatant opponent">
          ${sprite(speciesOf(opp).sprite)}
          <div class="hp-name">${opp.nickname} Lv.${opp.level} ${statusBadge(opp)}</div>
          ${hpBar(opp)}
        </div>
      </div>
      <div class="log-box">${logHtml}</div>
      ${actionsHtml}
    </div>`;
}

function renderMoveGrid(creature) {
  const buttons = creature.moves.map((moveId) => {
    const m = getMove(moveId);
    return `<button class="btn move-btn" data-action="use-move" data-arg="${moveId}">
      ${m.name}<span class="move-type" style="color:${TYPE_COLORS[m.type]}">${m.type} · ${m.category === 'status' ? 'Status' : `Stärke ${m.power}`}</span>
    </button>`;
  }).join('');
  return `<div class="move-grid">${buttons}</div><button class="btn" data-action="menu-main">Zurück</button>`;
}

function renderBattleItems() {
  const s = state.save;
  const canCatch = state.battle.canCatch && !state.battle.ended;
  const rows = Object.entries(s.inventory).map(([itemId, count]) => {
    const item = getItem(itemId);
    if (item.kind === 'ball' && !canCatch) return '';
    if (item.kind === 'heal' && isFainted(state.battle.playerFighter.creature)) return '';
    return `<button class="btn" data-action="use-item" data-arg="${itemId}" style="text-align:left;width:100%;margin-bottom:6px">
      ${item.name} <span style="opacity:0.7">(${count}× ) - ${item.desc}</span>
    </button>`;
  }).join('');
  return `<div>${rows || '<p class="area-flavor">Keine passenden Gegenstände.</p>'}</div><button class="btn" data-action="menu-main">Zurück</button>`;
}

function renderSwitchList(forced) {
  const s = state.save;
  const activeUid = state.battle.playerFighter.creature.uid;
  const rows = s.team.map((c, i) => {
    if (isFainted(c)) return '';
    if (c.uid === activeUid) return '';
    return creatureCardHtml(c, i, 'switch-to');
  }).join('');
  return `<div class="team-list">${rows || '<p class="area-flavor">Keine weitere kampffähige Kreatur.</p>'}</div>
    ${forced ? '' : '<button class="btn" data-action="menu-main">Zurück</button>'}`;
}

function creatureCardHtml(c, index, action) {
  const sp = speciesOf(c);
  const fainted = isFainted(c);
  return `<div class="creature-card ${fainted ? 'fainted' : ''}" data-action="${action}" data-arg="${index}">
    ${sprite(sp.sprite, 'sprite-sm')}
    <div class="info">
      <div class="name-row"><span>${c.nickname} Lv.${c.level}</span>${statusBadge(c)}</div>
      ${hpBar(c)}
    </div>
  </div>`;
}

function renderTeam() {
  const s = state.save;
  const tab = state.ui.teamTab ?? 'team';
  const tabs = `
    <div class="tabs">
      <button class="${tab === 'team' ? 'active' : ''}" data-action="team-tab" data-arg="team">Team</button>
      <button class="${tab === 'items' ? 'active' : ''}" data-action="team-tab" data-arg="items">Beutel</button>
      <button class="${tab === 'box' ? 'active' : ''}" data-action="team-tab" data-arg="box">Kiste</button>
    </div>`;

  let body = '';
  if (tab === 'team') {
    body = `<div class="team-list">${s.team.map((c, i) => creatureCardHtml(c, i, 'noop')).join('')}</div>`;
  } else if (tab === 'items') {
    const rows = Object.entries(s.inventory).map(([itemId, count]) => {
      const item = getItem(itemId);
      return `<div class="item-row"><span>${item.name}</span><span>${count}×</span></div>`;
    }).join('');
    body = `<div class="item-list">${rows || '<p class="area-flavor">Der Beutel ist leer.</p>'}</div>`;
  } else {
    body = `<div class="team-list">${s.box.length ? s.box.map((c, i) => creatureCardHtml(c, i, 'noop')).join('') : '<p class="area-flavor">Die Kiste ist leer.</p>'}</div>`;
  }

  return `
    <div class="panel">
      <div class="zone-header"><h2>Team &amp; Beutel</h2><span class="zone-meta">Orden: ${s.ordenIds.length}</span></div>
      ${tabs}
      ${body}
      <button class="btn" data-action="close-team" style="margin-top:10px">Zurück</button>
    </div>`;
}

function renderGameOver() {
  return `
    <div class="title-screen">
      <h1 class="game-title" style="font-size:24px">Euer Team ist erschöpft...</h1>
      <p class="subtitle">Ihr erwacht wieder in der Wiesenmark.</p>
      <button class="btn primary" data-action="respawn">Weiter</button>
    </div>`;
}

function renderVictory() {
  return `
    <div class="title-screen">
      <h1 class="game-title">Ein neuer Kaiser erhebt sich!</h1>
      <p class="subtitle">Ihr habt alle drei Orden gesammelt - Wiesenmark, Nebelwald und die Eisenklamm erkennen Euch an.<br>Möwenhort und weitere Zonen folgen bald.</p>
      <button class="btn primary" data-action="back-to-zone">Zurück ins Reich</button>
    </div>`;
}

// ---------- actions ----------

function onClick(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  const arg = el.dataset.arg;
  handlers[action]?.(arg);
}

const handlers = {
  'new-game': () => setScreen('starter'),
  'continue': () => { state.save = GameState.load(); setScreen('zone'); },
  'pick-starter': (id) => {
    state.save = GameState.newGame(id);
    persist();
    Sfx.pickup?.();
    setScreen('zone');
  },
  'noop': () => {},
  'open-team': () => setScreen('team', { teamTab: 'team' }),
  'close-team': () => setScreen('zone'),
  'team-tab': (tab) => { state.ui.teamTab = tab; render(); },
  'back-to-zone': () => setScreen('zone'),

  'explore': () => {
    const s = state.save;
    const zone = getZone(s.currentZoneId);
    const zoneState = s.zoneStates[zone.id];
    const result = explore(zoneState);
    persist();
    if (result.type === 'battle') {
      beginWildBattle(result.creature);
    } else if (result.type === 'item') {
      GameState.addItem(s, result.itemId);
      persist();
      setScreen('zone', { message: `Ihr findet: ${getItem(result.itemId).name}!` });
    } else {
      setScreen('zone', { message: result.text });
    }
  },

  'rest': () => {
    const s = state.save;
    const zone = getZone(s.currentZoneId);
    const zoneState = s.zoneStates[zone.id];
    const result = rest(zoneState);
    s.team.forEach((c) => {
      if (isFainted(c)) return;
      const max = currentStats(c).hp;
      c.currentHp = Math.min(max, c.currentHp + Math.floor(max * result.healedFraction));
    });
    persist();
    if (result.ambush) {
      beginWildBattle(result.ambush, 'Ein Hinterhalt! Ihr werdet überrascht!');
    } else {
      setScreen('zone', { message: 'Ihr rastet und erholt Euch etwas.' });
    }
  },

  'advance': () => {
    const s = state.save;
    const zone = getZone(s.currentZoneId);
    const zoneState = s.zoneStates[zone.id];
    const result = advance(zoneState);
    persist();
    if (result.type === 'boss') {
      setScreen('zone', { message: `Ihr erreicht: ${result.area.name}` });
    } else if (result.type === 'area') {
      setScreen('zone', { message: `Ihr zieht weiter zu: ${result.area.name}` });
    } else {
      setScreen('zone', { message: 'Hier geht es nicht weiter.' });
    }
  },

  'challenge-boss': () => {
    const s = state.save;
    const zone = getZone(s.currentZoneId);
    setScreen('trainerIntro', { trainerId: zone.bossId });
  },

  'start-boss-battle': () => {
    const trainer = getTrainer(state.ui.trainerId);
    const bossCreature = createCreature(trainer.creatureId, trainer.level);
    const s = state.save;
    const activeIndex = s.team.findIndex((c) => !isFainted(c));
    if (activeIndex === -1) {
      setScreen('gameover');
      return;
    }
    state.battle = startBattle({
      playerTeam: s.team, activeIndex,
      opponent: { kind: 'trainer', trainer, team: [bossCreature], activeIndex: 0 },
      weather: getZone(s.currentZoneId).weather, canFlee: false, canCatch: false,
    });
    state.ui.battleTrainerId = trainer.id;
    setScreen('battle', { battleMenu: 'main', battleTrainerId: trainer.id });
  },

  'next-zone': () => {
    const s = state.save;
    const zone = getZone(s.currentZoneId);
    const nextZone = ZONES[ZONES.findIndex((z) => z.id === zone.id) + 1];
    s.currentZoneId = nextZone.id;
    persist();
    if (nextZone.id === 'eisenklamm' && s.ordenIds.length >= 2) {
      // no-op flavor hook point
    }
    setScreen('zone');
  },

  'menu-main': () => { state.ui.battleMenu = 'main'; render(); },
  'menu-moves': () => { state.ui.battleMenu = 'moves'; render(); },
  'menu-items': () => { state.ui.battleMenu = 'items'; render(); },
  'menu-switch': () => { state.ui.battleMenu = 'switch'; render(); },

  'use-move': (moveId) => {
    resolveTurn(state.battle, { type: 'move', moveId });
    state.ui.battleMenu = 'main';
    afterTurn();
  },

  'use-item': (itemId) => {
    const item = getItem(itemId);
    const s = state.save;
    if (item.kind === 'heal') {
      GameState.useItem(s, itemId);
      resolveTurn(state.battle, { type: 'item', itemName: item.name, healAmount: item.healAmount, cures: false });
    } else if (item.kind === 'ball') {
      GameState.useItem(s, itemId);
      resolveTurn(state.battle, { type: 'catch', itemId, ballBonus: item.ballBonus });
    }
    persist();
    state.ui.battleMenu = 'main';
    afterTurn();
  },

  'switch-to': (index) => {
    resolveTurn(state.battle, { type: 'switch', index: Number(index) });
    state.ui.battleMenu = 'main';
    afterTurn();
  },

  'flee': () => {
    resolveTurn(state.battle, { type: 'flee' });
    afterTurn();
  },

  'battle-continue': () => {
    const b = state.battle;
    const s = state.save;
    if (b.outcome === 'win' && b.opponent.kind === 'trainer') {
      const trainer = b.opponent.trainer;
      if (!s.ordenIds.includes(trainer.rewardOrden)) s.ordenIds.push(trainer.rewardOrden);
      persist();
      const zone = getZone(s.currentZoneId);
      const nextZone = ZONES[ZONES.findIndex((z) => z.id === zone.id) + 1];
      if (!nextZone || nextZone.comingSoon) {
        setScreen('victory');
        return;
      }
    } else if (b.outcome === 'caught') {
      const where = GameState.addToTeamOrBox(s, b.caughtCreature);
      persist();
      setScreen('zone', { message: `In ${where === 'team' ? 'Euer Team' : 'die Kiste'} aufgenommen!` });
      return;
    } else if (b.outcome === 'lose') {
      setScreen('gameover');
      return;
    }
    persist();
    setScreen('zone');
  },

  'respawn': () => {
    const s = state.save;
    s.team.forEach((c) => { c.currentHp = currentStats(c).hp; c.status = null; c.statusTurns = 0; });
    s.currentZoneId = ZONES[0].id;
    s.zoneStates[ZONES[0].id].areaIndex = 0;
    s.zoneStates[ZONES[0].id].dangerCounter = 0;
    persist();
    setScreen('zone');
  },
};

function beginWildBattle(creature, introMessage) {
  const s = state.save;
  const activeIndex = s.team.findIndex((c) => !isFainted(c));
  if (activeIndex === -1) {
    setScreen('gameover');
    return;
  }
  state.battle = startBattle({
    playerTeam: s.team, activeIndex,
    opponent: { kind: 'wild', creature },
    weather: getZone(s.currentZoneId).weather,
  });
  if (introMessage) state.battle.log.unshift(introMessage);
  setScreen('battle', { battleMenu: 'main' });
}

function afterTurn() {
  persist();
  if (state.battle.needsSwitch) {
    state.ui.battleMenu = 'switch';
  }
  render();
}
