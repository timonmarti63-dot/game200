import Phaser from 'phaser';

// ---------------------------------------------------------------------------
// Centralises every PC input binding (section 1). Nothing in the rest of the
// codebase should read `scene.input.keyboard` directly - going through this
// class means the bindings only ever live in one place, and world scenes /
// menu scenes agree on what "interact" or "menu" means.
//
// Movement is exposed as a single `getDirection()` call rather than four
// separate isDown booleans - GridMovementController wants "the one direction
// the player currently intends", and resolving priority (e.g. two keys held
// at once) belongs here, not scattered through movement code.
// ---------------------------------------------------------------------------
export default class InputManager {
  constructor(scene) {
    this.scene = scene;
    this.keys = scene.input.keyboard.addKeys({
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D',
      up2: 'UP',
      down2: 'DOWN',
      left2: 'LEFT',
      right2: 'RIGHT',
      interact: 'E',
      interact2: 'ENTER',
      menu: 'ESC',
    });

    // A window/tab focus loss while a key is held never delivers its keyup -
    // without this the browser leaves that key "stuck down" forever from
    // Phaser's point of view. Reset every tracked key on blur.
    const resetKeys = () => Object.values(this.keys).forEach((k) => k.reset());
    window.addEventListener('blur', resetKeys);
    scene.events.once('shutdown', () => window.removeEventListener('blur', resetKeys));
    scene.events.once('destroy', () => window.removeEventListener('blur', resetKeys));
  }

  // Returns 'up' | 'down' | 'left' | 'right' | null. Grid movement is
  // 4-directional only (no diagonals) - when two keys are held at once we
  // deterministically prefer the most recently-pressed one so the player
  // can "steer" while holding a key by tapping a second direction, which
  // reads as natural on a keyboard.
  getDirection() {
    const k = this.keys;
    const candidates = [
      { dir: 'up', key: k.up, key2: k.up2 },
      { dir: 'down', key: k.down, key2: k.down2 },
      { dir: 'left', key: k.left, key2: k.left2 },
      { dir: 'right', key: k.right, key2: k.right2 },
    ].filter((c) => c.key.isDown || c.key2.isDown);

    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0].dir;

    // Tie-break: whichever underlying key was pressed most recently wins.
    candidates.sort((a, b) => {
      const aTime = Math.max(a.key.timeDown || 0, a.key2.timeDown || 0);
      const bTime = Math.max(b.key.timeDown || 0, b.key2.timeDown || 0);
      return bTime - aTime;
    });
    return candidates[0].dir;
  }

  justPressedInteract() {
    return (
      Phaser.Input.Keyboard.JustDown(this.keys.interact) ||
      Phaser.Input.Keyboard.JustDown(this.keys.interact2)
    );
  }

  justPressedMenu() {
    return Phaser.Input.Keyboard.JustDown(this.keys.menu);
  }
}
