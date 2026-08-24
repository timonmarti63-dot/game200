import Phaser from 'phaser';
import GameState from './GameState.js';

// ---------------------------------------------------------------------------
// Tunnel-object transitions (section 2): "Eine Kollision mit einem
// Tunnel-Eingang friert die Spieler-Eingabe ein, blendet schwarz ab, lädt
// die nächste Szene und blendet wieder auf." Generic across every scene
// type (overworld section, village, dungeon, ship) - a scene just declares
// its own list of tunnel tiles and calls checkTunnels() once per frame
// after movement, so this module never needs to know about tilemaps.
// ---------------------------------------------------------------------------

const DEFAULT_FADE_MS = 350;

/**
 * A tunnel definition, as declared by a scene:
 * { gridX, gridY, targetSceneKey, targetGridX, targetGridY }
 *
 * Returns the matching tunnel for the given tile, or null.
 */
export function findTunnelAt(tunnels, gridX, gridY) {
  return tunnels.find((t) => t.gridX === gridX && t.gridY === gridY) ?? null;
}

/**
 * Call from a scene's update() once movement has settled on a tile
 * (`!movementController.isMoving`). If the player is standing on a tunnel
 * tile, kicks off the full fade-out -> scene swap -> fade-in sequence and
 * returns true (so the caller can e.g. skip further input processing that
 * frame); otherwise returns false and does nothing.
 */
export function checkTunnels(scene, movementController, tunnels, fadeMs = DEFAULT_FADE_MS) {
  const tunnel = findTunnelAt(tunnels, movementController.gridX, movementController.gridY);
  if (!tunnel) return false;
  transitionThroughTunnel(scene, movementController, tunnel, fadeMs);
  return true;
}

export function transitionThroughTunnel(scene, movementController, tunnel, fadeMs = DEFAULT_FADE_MS) {
  // Freeze input immediately - the player must not be able to queue a move
  // (via GridMovementController's own buffering) while the world fades.
  movementController.setInputLocked(true);

  GameState.pendingSpawn = {
    sceneKey: tunnel.targetSceneKey,
    gridX: tunnel.targetGridX,
    gridY: tunnel.targetGridY,
  };

  scene.cameras.main.fadeOut(fadeMs, 0, 0, 0);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    scene.scene.start(tunnel.targetSceneKey);
  });
}

/**
 * Call at the end of a scene's create(), after its GridMovementController
 * exists, to fade in from black and release input once the fade completes.
 * Reads/consumes GameState.pendingSpawn for the *spawn position* - the
 * scene itself is responsible for constructing its movementController at
 * that spawn (this function only handles the visual fade + input unlock).
 */
export function runFadeIn(scene, movementController, fadeMs = DEFAULT_FADE_MS) {
  movementController.setInputLocked(true);
  scene.cameras.main.fadeIn(fadeMs, 0, 0, 0);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
    movementController.setInputLocked(false);
  });
}

/**
 * Convenience for a scene's create(): pops GameState.pendingSpawn if it
 * targets THIS scene, falling back to the given default spawn otherwise
 * (e.g. when a scene is entered directly rather than via a tunnel, such as
 * the very first scene on boot).
 */
export function consumeSpawnFor(sceneKey, defaultSpawn) {
  const pending = GameState.pendingSpawn;
  GameState.pendingSpawn = null;
  if (pending && pending.sceneKey === sceneKey) {
    return { gridX: pending.gridX, gridY: pending.gridY };
  }
  return defaultSpawn;
}
