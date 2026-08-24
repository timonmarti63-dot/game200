import { createCreature } from './team.js';
import { STARTING_INVENTORY } from '../data/items.js';
import { ZONES } from '../data/zones.js';
import { createZoneState } from './exploration.js';

const SAVE_KEY = 'game200_save_v1';
const TEAM_CAP = 6;

export function hasSave() {
  return !!localStorage.getItem(SAVE_KEY);
}

export function newGame(starterId) {
  const zoneStates = {};
  ZONES.forEach((z) => { zoneStates[z.id] = createZoneState(z.id); });
  return {
    team: [createCreature(starterId, 5)],
    box: [],
    inventory: { ...STARTING_INVENTORY },
    ordenIds: [],
    currentZoneId: ZONES[0].id,
    zoneStates,
  };
}

export function save(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Speichern fehlgeschlagen', err);
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Laden fehlgeschlagen', err);
    return null;
  }
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

export function addToTeamOrBox(state, creature) {
  if (state.team.length < TEAM_CAP) {
    state.team.push(creature);
    return 'team';
  }
  state.box.push(creature);
  return 'box';
}

export function addItem(state, itemId, count = 1) {
  state.inventory[itemId] = (state.inventory[itemId] ?? 0) + count;
}

export function useItem(state, itemId) {
  if (!state.inventory[itemId]) return false;
  state.inventory[itemId] -= 1;
  if (state.inventory[itemId] <= 0) delete state.inventory[itemId];
  return true;
}

export { TEAM_CAP };
