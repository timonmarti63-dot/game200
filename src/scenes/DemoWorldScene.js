import Phaser from 'phaser';
import InputManager from '../systems/InputManager.js';
import GridMovementController from '../systems/GridMovement.js';
import { buildComposedGrid } from '../systems/TileGrid.js';
import { createPlaceholderEntity } from '../systems/PlaceholderRenderer.js';
import { checkTunnels, runFadeIn, consumeSpawnFor } from '../systems/SceneTransition.js';
import { createHud } from '../systems/DebugHud.js';

const TILE_SIZE = 32;

// TODO(map-data): stand-in for "Insel 1: Grasland ➔ Wald ➔ Gebirge" (section
// 2). Real level design will split this into three tunnel-linked sections
// with actual content; for now it's one large open world so the scale and
// camera-follow feel right before that split happens. The forest/mountain
// patches below are a visual nod to where those sections will eventually be.
const WORLD_W = 60;
const WORLD_H = 42;

const SPAWN = { x: 5, y: 36 };
const TUNNEL = { x: 55, y: 5 };

const REGIONS = [
  // Forest patch (north-west) - hints at "Wald".
  { x0: 3, y0: 3, x1: 22, y1: 20, groundColor: 0x4a8a3a, obstacleColor: 0x2f5a24, obstacleDensity: 0.16 },
  // Rocky patch (south-east) - hints at "Gebirge".
  { x0: 38, y0: 24, x1: 57, y1: 39, groundColor: 0x8a8578, obstacleColor: 0x5a5850, obstacleDensity: 0.2 },
  // A small lake - fully impassable water, no scatter needed.
  { x0: 26, y0: 12, x1: 33, y1: 17, groundColor: 0x2e6fae, obstacleColor: 0x2e6fae, obstacleDensity: 1 },
];

export default class DemoWorldScene extends Phaser.Scene {
  constructor() {
    super('DemoWorld');
  }

  create() {
    this.cameras.main.setBackgroundColor('#10131a');

    const tunnels = [{ gridX: TUNNEL.x, gridY: TUNNEL.y, targetSceneKey: 'DemoVillage', targetGridX: 7, targetGridY: 8 }];
    const keepClear = [
      { x: SPAWN.x, y: SPAWN.y }, { x: SPAWN.x + 1, y: SPAWN.y }, { x: SPAWN.x, y: SPAWN.y + 1 },
      { x: TUNNEL.x, y: TUNNEL.y }, { x: TUNNEL.x - 1, y: TUNNEL.y }, { x: TUNNEL.x, y: TUNNEL.y + 1 },
    ];

    const grid = buildComposedGrid(this, {
      width: WORLD_W,
      height: WORLD_H,
      tileSize: TILE_SIZE,
      baseColor: 0x5fa04a,
      regions: REGIONS,
      tunnels,
      keepClear,
    });
    this.tunnels = grid.tunnels;

    const worldPixelW = WORLD_W * TILE_SIZE;
    const worldPixelH = WORLD_H * TILE_SIZE;
    this.cameras.main.setBounds(0, 0, worldPixelW, worldPixelH);

    // consumeSpawnFor's fallback returns its default argument verbatim, so
    // it must already be shaped { gridX, gridY } - not the { x, y } shape
    // SPAWN uses elsewhere in this file for region/keepClear math.
    const spawn = consumeSpawnFor('DemoWorld', { gridX: SPAWN.x, gridY: SPAWN.y });
    const playerEntity = createPlaceholderEntity(this, { color: 0x4a90d9, label: 'Captain' });
    this.movement = new GridMovementController(this, playerEntity, {
      tileSize: TILE_SIZE,
      startGridX: spawn.gridX,
      startGridY: spawn.gridY,
      isWalkable: grid.isWalkable,
    });

    this.cameras.main.startFollow(playerEntity, true, 0.1, 0.1);

    this.input_ = new InputManager(this);
    this.hud = createHud(this);
    this.hud.toast('Insel 1: Grasland - der violette Tunnel liegt weit im Nordosten', 3200);

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
