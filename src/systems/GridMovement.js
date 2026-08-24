import Phaser from 'phaser';

// ---------------------------------------------------------------------------
// Reusable tile-by-tile movement controller (section 1 - "Grid-Movement
// Logik (Pokémon-Stil)"). One instance per moving entity (the player today;
// NPCs/patrols later can reuse the same class by feeding it a direction from
// AI instead of InputManager). Movement is strictly 4-directional and
// strictly one tile at a time - there is no such thing as a "half step" or
// an overlapping position, by construction.
//
// Input buffering: a direction pressed while the current tile-move is still
// finishing is captured a little before completion (see BUFFER_WINDOW below)
// and immediately chained into the next tween on completion, so holding a
// key down glides smoothly across tiles instead of stuttering between
// "moving" and "idle" every single tile.
//
// Collision is intentionally just a callback (`isWalkable`) rather than this
// class owning a tilemap - keeps this class reusable across the overworld,
// villages, dungeons and the ship's ocean grid, all of which have different
// walkability rules but identical movement *feel*.
// ---------------------------------------------------------------------------

const DIRECTION_VECTORS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

// Fraction of the current move's duration after which a freshly-held
// direction is captured for buffering. 0.6 means "in the last 40% of the
// tween" - late enough that a single tap right at tile-start isn't
// mistakenly queued twice, early enough that holding a key never has a
// visible gap between tiles.
const BUFFER_WINDOW = 0.6;

export default class GridMovementController {
  /**
   * @param {Phaser.Scene} scene
   * @param {Phaser.GameObjects.Sprite} sprite - visual entity to move. Its
   *   position is fully owned by this controller once attached.
   * @param {object} opts
   * @param {number} opts.tileSize - pixels per grid tile.
   * @param {number} opts.startGridX
   * @param {number} opts.startGridY
   * @param {number} [opts.moveDurationMs=160] - time to glide one tile.
   *   Lower this for Obj_Player_Ship once Upgrade_Sails is purchased.
   * @param {(gridX: number, gridY: number) => boolean} opts.isWalkable
   */
  constructor(scene, sprite, opts) {
    this.scene = scene;
    this.sprite = sprite;
    this.tileSize = opts.tileSize;
    this.moveDurationMs = opts.moveDurationMs ?? 160;
    this.isWalkable = opts.isWalkable;

    if (!Number.isFinite(opts.startGridX) || !Number.isFinite(opts.startGridY)) {
      // A silent NaN here only shows up much later as an unrelated-looking
      // crash once a tween/camera tries to use it - fail loudly right at
      // the source instead (this exact mistake - a spawn object shaped
      // {x,y} instead of {gridX,gridY} - has actually happened once).
      throw new Error(
        `GridMovementController: startGridX/startGridY müssen Zahlen sein, bekam (${opts.startGridX}, ${opts.startGridY}).`
      );
    }
    this.gridX = opts.startGridX;
    this.gridY = opts.startGridY;
    this.facing = 'down';

    this.isMoving = false;
    this.activeTween = null;
    this.queuedDirection = null;
    this.inputLocked = false; // set true during fades/menus/cutscenes

    this.sprite.setPosition(...this.tileToWorld(this.gridX, this.gridY));
  }

  tileToWorld(gridX, gridY) {
    return [gridX * this.tileSize + this.tileSize / 2, gridY * this.tileSize + this.tileSize / 2];
  }

  setInputLocked(locked) {
    this.inputLocked = locked;
    if (locked) this.queuedDirection = null;
  }

  // The tile this entity would step onto next if it moved in its current
  // facing direction - used by the interact key (E/Enter) to know which
  // NPC/door/chest tile to check, without needing a second "facing sprite".
  getFacingTile() {
    const { dx, dy } = DIRECTION_VECTORS[this.facing];
    return { x: this.gridX + dx, y: this.gridY + dy };
  }

  /**
   * Call once per frame from the owning scene's update(). `direction` is
   * whatever the input source (InputManager.getDirection(), or later an AI)
   * currently wants; null means "no input right now".
   */
  update(direction) {
    if (this.inputLocked) return;

    if (!this.isMoving) {
      if (direction) this.tryStartMove(direction);
      return;
    }

    // Already gliding to a tile - only capture buffered input in the tail
    // end of the tween, and always keep the LATEST held direction (a player
    // changing their mind mid-buffer-window should get the newer input).
    if (direction && this.activeTween && this.activeTween.progress >= BUFFER_WINDOW) {
      this.queuedDirection = direction;
    }
  }

  tryStartMove(direction) {
    this.facing = direction;
    const { dx, dy } = DIRECTION_VECTORS[direction];
    const targetX = this.gridX + dx;
    const targetY = this.gridY + dy;

    if (!this.isWalkable(targetX, targetY)) {
      // TODO(sfx): play a short "bump into wall" sound here once audio
      // exists - silently refusing the move is correct for now.
      return;
    }

    this.isMoving = true;
    this.gridX = targetX;
    this.gridY = targetY;
    const [worldX, worldY] = this.tileToWorld(targetX, targetY);

    this.activeTween = this.scene.tweens.add({
      targets: this.sprite,
      x: worldX,
      y: worldY,
      duration: this.moveDurationMs,
      ease: 'Linear',
      onComplete: () => this.onMoveComplete(),
    });
  }

  onMoveComplete() {
    this.isMoving = false;
    this.activeTween = null;

    const next = this.queuedDirection;
    this.queuedDirection = null;
    if (this.inputLocked) return;
    if (next) this.tryStartMove(next);
  }
}
