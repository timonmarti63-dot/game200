// Simple currency store backed by the Phaser registry so it persists
// across scenes (Sailing <-> Island <-> Interior/Shop).
//
// Rules: enemies drop 1-5 silver, bosses drop 1 gold. Prices:
//   - Potions:  small 5, medium 10, large 20 silver
//   - Weapons:  iron sword 50, warhammer 120, halberd 200 silver
//   - Armors:   leather 30 silver, chainmail 1 gold, plate 3 gold
//
// The registry emits 'changedata' when a key changes, which the HUD
// listens for. Silver and gold are stored separately (no conversion) so
// the game can meaningfully distinguish "cheap grind" vs "boss reward".

const S_KEY = 'silver';
const G_KEY = 'gold';

export function ensureInitialised(registry) {
  if (registry.get(S_KEY) == null) registry.set(S_KEY, 0);
  if (registry.get(G_KEY) == null) registry.set(G_KEY, 0);
}

export function getSilver(registry) {
  return registry.get(S_KEY) ?? 0;
}

export function getGold(registry) {
  return registry.get(G_KEY) ?? 0;
}

export function addSilver(registry, n) {
  registry.set(S_KEY, getSilver(registry) + n);
}

export function addGold(registry, n) {
  registry.set(G_KEY, getGold(registry) + n);
}

// Attempt to spend a given (silver, gold) cost. Returns true if the
// player had enough and the money was deducted, false otherwise.
export function trySpend(registry, { silver = 0, gold = 0 }) {
  if (getSilver(registry) < silver) return false;
  if (getGold(registry) < gold) return false;
  if (silver > 0) registry.set(S_KEY, getSilver(registry) - silver);
  if (gold > 0) registry.set(G_KEY, getGold(registry) - gold);
  return true;
}

export function resetCurrency(registry) {
  registry.set(S_KEY, 0);
  registry.set(G_KEY, 0);
}
