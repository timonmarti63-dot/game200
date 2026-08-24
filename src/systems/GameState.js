import { createCrewInstance } from '../data/Crew.js';

// ---------------------------------------------------------------------------
// The single source of truth that survives scene loads (section 2 -
// "SceneManager, der den globalen Zustand zwischen den Ladebildschirmen
// speichert"). Deliberately a plain ES module singleton rather than
// something bolted onto a specific Phaser Scene - every Scene instance in
// this app runs in the same JS module graph, so a module-level object is
// already global and needs no extra plumbing (no registry indirection, no
// "which scene owns this" ambiguity). This also keeps GameState trivially
// unit-testable without booting Phaser at all.
//
// Nothing in here renders anything or touches Phaser - strict data/logic
// separation, per the brief. Scenes read/write this object; they never
// duplicate its data locally.
// ---------------------------------------------------------------------------

function createInitialState() {
  return {
    // --- Crew / party ---
    crew: [], // array of runtime crew instances (data/Crew.js#createCrewInstance)
    activeCrewIndex: 0, // which crew member leads combat first

    // --- Economy ---
    gold: 50,
    inventory: {}, // { [itemId]: count } - see data/Items.js

    // --- World progression ---
    // Keyed by village id (matches Crew.recruitedAtVillage / future map data).
    // { [villageId]: { isSafe: boolean } } - section 3 state machine.
    villages: {},
    // Keyed by boss id, e.g. 'Boss_Insel1_Arena'. All 3 must be true before
    // the 12 small endgame islands unlock (section 2).
    bossesDefeated: {},

    // --- Ship (section 4) ---
    ship: {
      hullLevel: 0,
      sailsLevel: 0, // higher = lower Obj_Player_Ship moveDurationMs
      cannonsLevel: 0, // >0 = can destroy obstacle rocks blocking endgame zones
    },

    // --- Resume point ---
    // Where to spawn the player when a scene loads mid-game (set by
    // SceneTransition before every scene.start()).
    pendingSpawn: null, // { sceneKey, gridX, gridY }
  };
}

// Exported as a mutable singleton object (not a class) - callers do
// `GameState.gold += 10`, not `GameState.getInstance().gold += 10`. Keeping
// it a plain object is deliberate simplicity for a single-player game with
// exactly one save slot in memory at a time.
const GameState = createInitialState();

export default GameState;

// --- Crew helpers -----------------------------------------------------

export function recruitCrewMember(crewId) {
  if (GameState.crew.some((c) => c.id === crewId)) return; // already recruited
  GameState.crew.push(createCrewInstance(crewId));
}

export function getActiveCrewMember() {
  return GameState.crew[GameState.activeCrewIndex] ?? null;
}

// --- Village isSafe state machine (section 3) --------------------------

export function isVillageSafe(villageId) {
  return GameState.villages[villageId]?.isSafe ?? false;
}

// Called once the village's mini-boss is defeated (hook point for the
// future combat system - CombatScene should call this on victory when
// `combatContext.type === 'village_miniboss'`).
export function setVillageSafe(villageId, isSafe = true) {
  GameState.villages[villageId] = { ...GameState.villages[villageId], isSafe };
}

// --- Boss / endgame unlock (section 2) ---------------------------------

export function setBossDefeated(bossId) {
  GameState.bossesDefeated[bossId] = true;
}

export function allMainBossesDefeated(mainBossIds) {
  return mainBossIds.every((id) => GameState.bossesDefeated[id]);
}

// --- Debug/dev reset (never called from gameplay code) ------------------

export function resetGameState() {
  Object.assign(GameState, createInitialState());
}
