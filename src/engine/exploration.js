import { getZone } from '../data/zones.js';
import { createCreature } from './team.js';

const DANGER_STEP_MIN = 18;
const DANGER_STEP_MAX = 28;
const REST_HEAL_FRACTION = 0.35;
const REST_AMBUSH_CHANCE = 0.15;

const LORE_SNIPPETS = [
  'Ein verwittertes Wegkreuz erinnert an einen Wanderer, der hier vor Jahren rastete.',
  'Ihr findet Spuren im Boden - etwas Großes war hier vor kurzem unterwegs.',
  'Ferner Gesang trägt über die Landschaft, dann verstummt er wieder.',
  'Ein zerbrochenes Hufeisen liegt halb im Boden vergraben.',
  'Die Luft riecht nach Regen, obwohl der Himmel klar ist.',
];

const FOUND_ITEM_TABLE = [
  { itemId: 'heiltrank', weight: 6 },
  { itemId: 'bindesiegel', weight: 3 },
  { itemId: 'edles_bindesiegel', weight: 1 },
];

function weightedPick(entries) {
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * total;
  for (const e of entries) {
    if (roll < e.weight) return e;
    roll -= e.weight;
  }
  return entries[entries.length - 1];
}

export function createZoneState(zoneId) {
  return { zoneId, areaIndex: 0, dangerCounter: 0 };
}

function rollWildCreature(zone) {
  const pick = weightedPick(zone.fauna.map((f) => ({ ...f, weight: f.weight })));
  const [min, max] = pick.levelRange;
  const level = min + Math.floor(Math.random() * (max - min + 1));
  return createCreature(pick.speciesId, level);
}

// Returns { type: 'battle', creature } | { type: 'item', itemId } | { type: 'lore', text }
export function explore(zoneState) {
  const zone = getZone(zoneState.zoneId);
  zoneState.dangerCounter += DANGER_STEP_MIN + Math.floor(Math.random() * (DANGER_STEP_MAX - DANGER_STEP_MIN + 1));

  const forcedBattle = zoneState.dangerCounter >= 100;
  if (forcedBattle) {
    zoneState.dangerCounter = 0;
    return { type: 'battle', creature: rollWildCreature(zone), forced: true };
  }

  const roll = Math.random();
  if (roll < 0.7) {
    zoneState.dangerCounter = 0;
    return { type: 'battle', creature: rollWildCreature(zone) };
  }
  if (roll < 0.9) {
    const item = weightedPick(FOUND_ITEM_TABLE);
    return { type: 'item', itemId: item.itemId };
  }
  return { type: 'lore', text: LORE_SNIPPETS[Math.floor(Math.random() * LORE_SNIPPETS.length)] };
}

// Returns { healedFraction } and optionally { ambush: creature }
export function rest(zoneState) {
  const zone = getZone(zoneState.zoneId);
  const result = { healedFraction: REST_HEAL_FRACTION };
  if (Math.random() < REST_AMBUSH_CHANCE) {
    result.ambush = rollWildCreature(zone);
  }
  return result;
}

// Returns { type: 'area', area } | { type: 'boss' } | { type: 'blocked', reason }
export function advance(zoneState) {
  const zone = getZone(zoneState.zoneId);
  const nextIndex = zoneState.areaIndex + 1;
  if (nextIndex >= zone.areas.length) {
    return { type: 'blocked', reason: 'ende' };
  }
  zoneState.areaIndex = nextIndex;
  zoneState.dangerCounter = 0;
  const area = zone.areas[nextIndex];
  if (area.isBossArea) return { type: 'boss', area };
  return { type: 'area', area };
}

export function currentArea(zoneState) {
  return getZone(zoneState.zoneId).areas[zoneState.areaIndex];
}
