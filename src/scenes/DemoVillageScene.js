import Phaser from 'phaser';
import InputManager from '../systems/InputManager.js';
import GridMovementController from '../systems/GridMovement.js';
import { buildGridFromLayout } from '../systems/TileGrid.js';
import { createPlaceholderEntity } from '../systems/PlaceholderRenderer.js';
import { checkTunnels, runFadeIn, consumeSpawnFor } from '../systems/SceneTransition.js';
import { createHud } from '../systems/DebugHud.js';
import { isVillageSafe, setVillageSafe } from '../systems/GameState.js';

const TILE_SIZE = 32;
const VILLAGE_ID = 'Insel1_Grasland';

// Fixed interaction points for this village screen (section 3 demo). Real
// villages will read these from map data alongside real NPC/shop entities -
// for now they are plain constants so the isSafe toggle logic below is easy
// to follow end to end.
const MINIBOSS_TILE = { x: 7, y: 1 };
const SHOP_TILE = { x: 10, y: 8 };
// Reuses the mini-boss's spot once the village is safe (both are baked into
// the static legend as non-walkable, so the tile can never be walked onto
// regardless of which dynamic entity currently occupies it).
const NPC_TILE = MINIBOSS_TILE;

const LAYOUT = [
  '###############',
  '#......M......#',
  '#.............#',
  '#.....#.......#',
  '#.....#.......#',
  '#.............#',
  '#.....###.....#',
  '#.....#.......#',
  '#..T..#...S...#',
  '###############',
];

const LEGEND = {
  '#': { walkable: false, color: 0x4a3a2a },
  '.': { walkable: true, color: 0xc9a24b, alpha: 0.35 },
  // Not walkable, matching genre convention (NPCs/shops block the tile they
  // stand on) - the player must approach and face them to interact, the same
  // way any future real NPC/shop entity will behave.
  M: { walkable: false, color: 0xc9a24b, alpha: 0.35 },
  S: { walkable: false, color: 0xc9a24b, alpha: 0.35 },
  T: {
    walkable: true,
    color: 0x8a5fd6,
    tunnel: { targetSceneKey: 'DemoWorld', targetGridX: 7, targetGridY: 7 },
  },
};

const DEFAULT_SPAWN = { gridX: 7, gridY: 8 };

export default class DemoVillageScene extends Phaser.Scene {
  constructor() {
    super('DemoVillage');
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a140c');

    const grid = buildGridFromLayout(this, LAYOUT, LEGEND, TILE_SIZE);
    this.tunnels = grid.tunnels;
    this.grid = grid;

    const spawn = consumeSpawnFor('DemoVillage', DEFAULT_SPAWN);
    const playerEntity = createPlaceholderEntity(this, { color: 0x4a90d9, label: 'Captain' });
    this.movement = new GridMovementController(this, playerEntity, {
      tileSize: TILE_SIZE,
      startGridX: spawn.gridX,
      startGridY: spawn.gridY,
      isWalkable: grid.isWalkable,
    });

    this.input_ = new InputManager(this);
    this.hud = createHud(this);

    this.dynamicEntities = []; // enemy/NPC/shop placeholders, rebuilt on isSafe change
    this.refreshVillageEntities();

    runFadeIn(this, this.movement);
  }

  // section 3: "if (!isSafe): ... sichtbare Feinde spawnen. if (isSafe):
  // Feinde verschwinden dauerhaft. NPCs spawnen. Shops werden interaktiv."
  refreshVillageEntities() {
    this.dynamicEntities.forEach((e) => e.destroy());
    this.dynamicEntities = [];

    const safe = isVillageSafe(VILLAGE_ID);
    if (safe) {
      this.dynamicEntities.push(this.spawnMarker(NPC_TILE, 0x5fa04a, 'NPC'));
      this.dynamicEntities.push(this.spawnMarker(SHOP_TILE, 0xd6b25f, 'Schmied'));
      this.hud.toast('Dorf ist sicher - NPCs und Schmied sind da.', 2400);
    } else {
      this.dynamicEntities.push(this.spawnMarker(MINIBOSS_TILE, 0xd64a3a, 'Mini-Boss'));
      this.hud.toast('Dorf unsicher - besiegt den Mini-Boss (Tile anlaufen + [E]).', 2800);
    }
  }

  spawnMarker(tile, color, label) {
    const entity = createPlaceholderEntity(this, { color, label, size: 26 });
    entity.setPosition(tile.x * TILE_SIZE + TILE_SIZE / 2, tile.y * TILE_SIZE + TILE_SIZE / 2);
    return entity;
  }

  update() {
    if (this.movement.inputLocked) return;

    const direction = this.input_.getDirection();
    this.movement.update(direction);
    this.hud.setStatus(
      `Grid: (${this.movement.gridX}, ${this.movement.gridY})  facing: ${this.movement.facing}  ` +
      `Dorf sicher: ${isVillageSafe(VILLAGE_ID)}`
    );

    if (this.input_.justPressedMenu()) {
      this.hud.toast('[Esc] Menü geöffnet (TODO: echtes Menü-System)');
    }

    if (this.input_.justPressedInteract()) {
      this.handleInteract();
    }

    if (!this.movement.isMoving) {
      checkTunnels(this, this.movement, this.tunnels);
    }
  }

  handleInteract() {
    const facing = this.movement.getFacingTile();
    const safe = isVillageSafe(VILLAGE_ID);

    if (!safe && facing.x === MINIBOSS_TILE.x && facing.y === MINIBOSS_TILE.y) {
      // TODO(combat): this is the hook point for section 5's real turn-based
      // CombatScene. Once it exists, this should launch CombatScene with a
      // 'village_miniboss' context and only call setVillageSafe() from that
      // scene's victory branch - the direct call here is a stand-in so the
      // isSafe state machine is demonstrably wired end to end already.
      setVillageSafe(VILLAGE_ID, true);
      this.refreshVillageEntities();
      return;
    }

    if (safe && facing.x === NPC_TILE.x && facing.y === NPC_TILE.y) {
      this.hud.toast('NPC: "Willkommen zurück, Captain!"');
      return;
    }

    if (safe && facing.x === SHOP_TILE.x && facing.y === SHOP_TILE.y) {
      // TODO(ui): open the real Blacksmith UI (section 3) here.
      this.hud.toast('Schmied: "Schaut Euch um!" (TODO: Shop-UI)');
    }
  }
}
