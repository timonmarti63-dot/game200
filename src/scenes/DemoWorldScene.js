import Phaser from 'phaser';
import InputManager from '../systems/InputManager.js';
import GridMovementController from '../systems/GridMovement.js';
import { buildGridFromLayout } from '../systems/TileGrid.js';
import { createPlaceholderEntity } from '../systems/PlaceholderRenderer.js';
import { checkTunnels, runFadeIn, consumeSpawnFor } from '../systems/SceneTransition.js';
import { createHud } from '../systems/DebugHud.js';

const TILE_SIZE = 32;

// TODO(map-data): stand-in for "Insel 1: Grasland" (section 2). Real level
// data (Tiled JSON, multiple connected sections, actual NPCs/enemies) comes
// later - this proves the movement/tunnel/collision architecture end to end
// on one hand-authored screen.
const LAYOUT = [
  '###############',
  '#.............#',
  '#.....#.......#',
  '#.....#.......#',
  '#.............#',
  '#.....###.....#',
  '#.....#.......#',
  '#.....#.......#',
  '#......T......#',
  '###############',
];

const LEGEND = {
  '#': { walkable: false, color: 0x3a4a30 },
  '.': { walkable: true, color: 0x5fa04a },
  T: {
    walkable: true,
    color: 0x8a5fd6,
    tunnel: { targetSceneKey: 'DemoVillage', targetGridX: 7, targetGridY: 8 },
  },
};

const DEFAULT_SPAWN = { gridX: 7, gridY: 1 };

export default class DemoWorldScene extends Phaser.Scene {
  constructor() {
    super('DemoWorld');
  }

  create() {
    this.cameras.main.setBackgroundColor('#10131a');

    const grid = buildGridFromLayout(this, LAYOUT, LEGEND, TILE_SIZE);
    this.tunnels = grid.tunnels;

    const spawn = consumeSpawnFor('DemoWorld', DEFAULT_SPAWN);
    const playerEntity = createPlaceholderEntity(this, { color: 0x4a90d9, label: 'Captain' });
    this.movement = new GridMovementController(this, playerEntity, {
      tileSize: TILE_SIZE,
      startGridX: spawn.gridX,
      startGridY: spawn.gridY,
      isWalkable: grid.isWalkable,
    });

    this.input_ = new InputManager(this);
    this.hud = createHud(this);
    this.hud.toast('Insel 1: Grasland - lauft zum violetten Tunnel-Tile', 2600);

    runFadeIn(this, this.movement);
  }

  update() {
    if (this.movement.inputLocked) return;

    const direction = this.input_.getDirection();
    this.movement.update(direction);
    this.hud.setStatus(
      `Grid: (${this.movement.gridX}, ${this.movement.gridY})  facing: ${this.movement.facing}  moving: ${this.movement.isMoving}`
    );

    if (this.input_.justPressedMenu()) {
      this.hud.toast('[Esc] Menü geöffnet (TODO: echtes Menü-System)');
    }

    if (!this.movement.isMoving) {
      checkTunnels(this, this.movement, this.tunnels);
    }
  }
}
