import Phaser from 'phaser';
import { INSULTS } from '../systems/Insults.js';
import { ITEMS } from '../systems/Items.js';
import Inventory from '../systems/Inventory.js';
import { Sfx } from '../systems/Sfx.js';
import { getDifficulty } from '../systems/Difficulty.js';

const SPEED = 118;
const GRAIL_SPEED = 210;
const DODGE_SPEED = 340;
const DODGE_TIME = 220;
const DODGE_COOLDOWN = 650;
const BASE_MAX_HP = 10; // half-hearts (5 hearts)
const TRINKET_COOLDOWN = 10000;
const TRINKET_DURATION = 4000;
const GRAPPLE_RANGE = 150;
const GRAPPLE_CONE = 0.5; // min dot(facing, toTarget) to count as "in front"
const GRAPPLE_COOLDOWN = 2800;
const GRAPPLE_PULL_SPEED = 480;
const GRAPPLE_DASH_SPEED = 400;
const GRAPPLE_ACTIVE_TIME = 180;

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setSize(18, 13).setOffset(4, 18);

    this.sword = scene.add.image(x, y, 'sword').setOrigin(0.5, 1);
    this.sword.setVisible(false);

    this.inventory = new Inventory(this);
    // Difficulty picks the base HP pool. Falls back to the historical
    // Medium value if no difficulty has been chosen yet.
    const diff = getDifficulty(scene.registry);
    this.baseMaxHp = diff.playerMaxHp ?? BASE_MAX_HP;
    this.maxHp = this.baseMaxHp;
    this.hp = this.maxHp;
    this.facing = new Phaser.Math.Vector2(0, 1);
    this.facingName = 'down';
    this.grailActiveUntil = 0;
    this.grailCooldownUntil = 0;
    this.invulnerableUntil = 0;
    this.dodging = false;
    this.dodgeReadyAt = 0;
    this.attackReadyAt = 0;
    this.dead = false;
    this.insultCount = 0;
    this.walkPhase = 0;
    this.hasGrapple = false;
    this.grappleReadyAt = 0;
    this.grappling = false;

    this.keys = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up2: Phaser.Input.Keyboard.KeyCodes.UP,
      down2: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left2: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right2: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      attack: Phaser.Input.Keyboard.KeyCodes.SPACE,
      attack2: Phaser.Input.Keyboard.KeyCodes.J,
      dodge: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      dodge2: Phaser.Input.Keyboard.KeyCodes.K,
      parry: Phaser.Input.Keyboard.KeyCodes.Q,
      parry2: Phaser.Input.Keyboard.KeyCodes.L,
      // Inventory moved from E to I so E is free for door / shop
      // interaction (Pokemon-style). I is standard for inventories.
      inventory: Phaser.Input.Keyboard.KeyCodes.I,
      grapple: Phaser.Input.Keyboard.KeyCodes.F,
      hot1: Phaser.Input.Keyboard.KeyCodes.ONE,
      hot2: Phaser.Input.Keyboard.KeyCodes.TWO,
      hot3: Phaser.Input.Keyboard.KeyCodes.THREE,
      hot4: Phaser.Input.Keyboard.KeyCodes.FOUR,
    });
  }

  isInvulnerable(time) {
    return time < this.invulnerableUntil;
  }

  toast(text) {
    this.scene.events.emit('toast', text);
  }

  applyArmorBonus() {
    const def = ITEMS[this.inventory.armor];
    const bonus = def?.maxHpBonus ?? 0;
    const prevMax = this.maxHp;
    this.maxHp = this.baseMaxHp + bonus;
    this.hp = Math.min(this.maxHp, this.hp + Math.max(0, this.maxHp - prevMax));
    this.scene.events.emit('hpChanged', this.hp, this.maxHp);
  }

  consumePotion(def) {
    this.heal(def.heal ?? 2);
    this.toast(`${def.name} getrunken - Wunden geheilt!`);
    Sfx.heal();
  }

  throwItem(def) {
    this.scene.events.emit('playerThrow', {
      type: def.texture,
      x: this.x,
      y: this.y,
      dir: this.facing.clone(),
    });
    Sfx.throwItem();
  }

  unlockAbility(id) {
    if (id === 'grapple_hook' && !this.hasGrapple) {
      this.hasGrapple = true;
      this.toast('Der Anstands-Enterhaken ist einsatzbereit! [F] zum Anwenden.');
      Sfx.pickup();
    }
  }

  useTrinket(def) {
    const time = this.scene.time.now;
    if (time < this.grailCooldownUntil) {
      this.toast(`${def.name} braucht noch eine Pause...`);
      return;
    }
    this.grailCooldownUntil = time + TRINKET_COOLDOWN;
    this.grailActiveUntil = time + TRINKET_DURATION;
    this.toast('ESPRESSO RUSCH!! *zitter*');
    this.scene.cameras.main.flash(150, 200, 160, 40);
    this.scene.events.emit('grailUsed');
  }

  pickUp(id, def) {
    const added = this.inventory.addItem(id);
    if (added) {
      this.toast(`${def.name} gefunden!`);
    } else {
      this.toast('Rucksack ist voll!');
    }
    return added;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.dead) return;

    this.handleMovement(time);
    this.handleAttack(time);
    this.handleDodge(time);
    this.handleParry(time);
    this.handleGrapple(time);
    this.handleHotbarKeys(time);
    this.handleInventoryKey(time);
    this.updateWalkBob(delta);
    // Y-sort: player renders in front of anything whose baseline is
    // above the player's feet and behind anything below.
    this.setDepth(this.y);

    // Keep the sword anchored in front of the player while a swing is
    // running. When not attacking, hide the sword so idle Rüdiger doesn't
    // carry a stray sprite pinned to him.
    if (this._swingActiveUntil && time < this._swingActiveUntil) {
      const offset = this._swingPivotOffset ?? 12;
      this.sword.setPosition(this.x + this.facing.x * offset, this.y + this.facing.y * offset);
    }
    this.setFlipX(this.facing.x < 0);
  }

  // No frame-by-frame walk cycle art - a light squash/stretch bob synced to
  // movement speed reads as "walking" without needing extra sprite frames.
  updateWalkBob(delta) {
    const speed = this.body.velocity.length();
    if (speed > 8 && !this.dodging) {
      this.walkPhase += delta * 0.017 * (speed / SPEED);
      const s = Math.sin(this.walkPhase);
      this.setScale(1 + s * 0.05, 1 - s * 0.06);
    } else {
      this.walkPhase = 0;
      this.setScale(1, 1);
    }
  }

  // GRID-Movement (Pokemon-Stil):
  // - Der Player rastert immer auf 32px-Zellen.
  // - Bei Tastendruck wird eine Bewegung zur Nachbar-Zelle initialisiert;
  //   während die Bewegung läuft ist der Player "in transit" und die
  //   Position wird linear zum Zielpunkt interpoliert.
  // - Wenn eine Richtungstaste weiterhin gehalten wird UND die Zielzelle
  //   frei ist, wird direkt der nächste Schritt eingeleitet - so entsteht
  //   flüssiges Laufen ohne Micro-Stops.
  // - Ist die Zielzelle blockiert, dreht sich der Player nur (facing) und
  //   bleibt stehen. Genau wie in klassischen Pokemon-Spielen.
  handleMovement(time) {
    if (this.dodging || this.grappling) return;
    const scene = this.scene;
    const grid = scene.walkableGrid;
    if (!grid) {
      // Fallback: freies Movement wenn keine Grid vorhanden ist.
      this.setVelocity(0, 0);
      return;
    }

    const k = this.keys;
    // Prioritäts-Reihenfolge: die ZULETZT gedrückte Richtung gewinnt.
    // Das ist die klassische Pokemon-Regel und verhindert Diagonal-Stotter.
    const wantLeft = k.left.isDown || k.left2.isDown;
    const wantRight = k.right.isDown || k.right2.isDown;
    const wantUp = k.up.isDown || k.up2.isDown;
    const wantDown = k.down.isDown || k.down2.isDown;

    // Wenn wir gerade zwischen zwei Zellen sind: weiterinterpolieren.
    if (this._moving) {
      const dx = this._targetX - this.x;
      const dy = this._targetY - this.y;
      const dist2 = dx * dx + dy * dy;
      const grailActive = time < this.grailActiveUntil;
      const speed = grailActive ? GRAIL_SPEED : SPEED;
      if (dist2 < 4) {
        // Angekommen - snap auf Zelle.
        this.setPosition(this._targetX, this._targetY);
        this.setVelocity(0, 0);
        this._moving = false;
        // Pickup-Zellen einsammeln (Truhen, Items).
        this._collectAtCurrentCell();
        // Warp-Zellen auslösen.
        this._checkWarpAtCurrentCell();
      } else {
        // Linear zum Ziel.
        const len = Math.sqrt(dist2);
        const vx = (dx / len) * speed;
        const vy = (dy / len) * speed;
        this.setVelocity(vx, vy);
      }
    }

    if (this._moving) return;

    // Nicht in Bewegung: neue Richtung wählen (falls Taste gedrückt).
    let dcol = 0;
    let drow = 0;
    // Reihenfolge: horizontale Präferenz wenn beide gedrückt.
    if (wantLeft) { dcol = -1; drow = 0; }
    else if (wantRight) { dcol = 1; drow = 0; }
    else if (wantUp) { dcol = 0; drow = -1; }
    else if (wantDown) { dcol = 0; drow = 1; }

    if (dcol === 0 && drow === 0) {
      this.setVelocity(0, 0);
      return;
    }

    // Facing sofort setzen (auch wenn Zelle blockiert - man dreht sich).
    this.facing.set(dcol, drow);
    this.facingName = dirName(this.facing);

    // Zielzelle bestimmen.
    const here = grid.worldToCell(this.x, this.y);
    const tcol = here.col + dcol;
    const trow = here.row + drow;

    if (!grid.isWalkable(tcol, trow)) {
      // Wand - stehen bleiben, aber facing zeigt in die Richtung.
      this.setVelocity(0, 0);
      return;
    }

    // Bewegung einleiten.
    const target = grid.cellToWorld(tcol, trow);
    this._moving = true;
    this._targetX = target.x;
    this._targetY = target.y;
  }

  // Sammelt Items/Truhen auf der aktuellen Kachel automatisch ein
  // (klassisches Pokemon-Verhalten: Item liegt am Boden, wird beim
  // Drüber-Laufen aufgehoben). Chests brauchen keine E-Taste mehr.
  _collectAtCurrentCell() {
    const scene = this.scene;
    if (!scene.pickups) return;
    // Alle Pickups durchgehen und den räumlich nächsten unter uns finden.
    const arr = scene.pickups.getChildren();
    for (const p of arr) {
      if (!p.active) continue;
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      if (dx * dx + dy * dy < 400) { // ~1 Zelle Radius
        if (typeof scene.onPlayerPickup === 'function') {
          scene.onPlayerPickup(p);
        }
      }
    }
  }

  // Wenn die aktuelle Zelle eine Warp-Zelle ist, löse den Warp aus.
  _checkWarpAtCurrentCell() {
    const scene = this.scene;
    const grid = scene.walkableGrid;
    if (!grid) return;
    const here = grid.worldToCell(this.x, this.y);
    if (grid.get(here.col, here.row) === 2 /* CELL.DOOR */) {
      const warp = grid.getWarp(here.col, here.row);
      if (warp && typeof scene.triggerWarp === 'function') {
        scene.triggerWarp(warp);
      }
    }
  }

  handleAttack(time) {
    const k = this.keys;
    const pressed = Phaser.Input.Keyboard.JustDown(k.attack) || Phaser.Input.Keyboard.JustDown(k.attack2);
    if (!pressed || time < this.attackReadyAt || this.dodging) return;

    const weapon = ITEMS[this.inventory.weapon] ?? ITEMS.sword;
    const grailActive = time < this.grailActiveUntil;
    this.attackReadyAt = time + (grailActive ? weapon.cooldown * 0.55 : weapon.cooldown);

    // Real weapon SWING: the sword sweeps ~120° across the player's facing
    // direction, tip trailing behind then whipping forward, then quickly
    // fades. The reach is offset from the player so the sprite doesn't just
    // sit on top of Rüdiger. Origin (0.5, 1) means the pivot is at the
    // handle so rotation looks like a real hand-held swing, not a spin.
    const baseAngle = this.facing.angle() + Math.PI / 2; // texture-up along facing
    const arc = Math.PI * 0.66; // ~120° arc
    const startAngle = baseAngle - arc / 2;
    const endAngle = baseAngle + arc / 2;
    const offset = 12;
    const pivotX = this.x + this.facing.x * offset;
    const pivotY = this.y + this.facing.y * offset;

    this.sword.setTexture(weapon.texture);
    this.sword.setPosition(pivotX, pivotY);
    this.sword.setRotation(startAngle);
    this.sword.setAlpha(1);
    this.sword.setScale(1.6);
    this.sword.setVisible(true);
    // Ensure sword always renders above player and props during a swing.
    this.sword.setDepth(1e6);

    // Bright slash arc that sweeps behind the sword tip for readability.
    if (this.scene.textures.exists('slash_vfx')) {
      const slash = this.scene.add.image(pivotX, pivotY, 'slash_vfx')
        .setOrigin(0.5, 1)
        .setRotation(baseAngle)
        .setScale(1.6)
        .setAlpha(0.9)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(1e6 - 1);
      this.scene.tweens.add({
        targets: slash,
        scale: 2.2,
        alpha: 0,
        duration: 220,
        onComplete: () => slash.destroy(),
      });
    }

    // A single tween drives the whole swing; the follow-in updater keeps
    // the sword anchored in front of the player as they move.
    if (this._swingTween) this._swingTween.stop();
    this._swingActiveUntil = time + 220;
    this._swingPivotOffset = offset;
    this._swingTween = this.scene.tweens.add({
      targets: this.sword,
      rotation: endAngle,
      scale: { from: 1.4, to: 1.8 },
      duration: 180,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.sword,
          alpha: 0,
          scale: 1.6,
          duration: 90,
          onComplete: () => this.sword.setVisible(false),
        });
      },
    });

    this.scene.events.emit('playerAttack', {
      x: this.x + this.facing.x * 18,
      y: this.y + this.facing.y * 18,
      angle: baseAngle,
      range: weapon.range,
      damage: grailActive ? weapon.damage * 2 : weapon.damage,
    });
    Sfx.swing();
  }

  handleDodge(time) {
    const k = this.keys;
    const pressed = Phaser.Input.Keyboard.JustDown(k.dodge) || Phaser.Input.Keyboard.JustDown(k.dodge2);
    if (this.dodging) {
      if (time > this.dodgeEndAt) {
        this.dodging = false;
      } else {
        this.setVelocity(this.facing.x * DODGE_SPEED, this.facing.y * DODGE_SPEED);
      }
      return;
    }
    if (!pressed || time < this.dodgeReadyAt) return;

    this.dodging = true;
    this.dodgeEndAt = time + DODGE_TIME;
    this.dodgeReadyAt = time + DODGE_COOLDOWN;
    this.invulnerableUntil = time + DODGE_TIME + 60;
    this.scene.events.emit('playerDodged', { x: this.x, y: this.y });
    this.setAlpha(0.55);
    this.scene.time.delayedCall(DODGE_TIME, () => this.setAlpha(1));
    Sfx.dodge();
  }

  handleParry(time) {
    const k = this.keys;
    const pressed = Phaser.Input.Keyboard.JustDown(k.parry) || Phaser.Input.Keyboard.JustDown(k.parry2);
    if (!pressed) return;
    this.scene.events.emit('playerParry', { x: this.x, y: this.y, range: 60 });
  }

  handleGrapple(time) {
    if (!this.hasGrapple) return;
    const k = this.keys;
    if (!Phaser.Input.Keyboard.JustDown(k.grapple) || time < this.grappleReadyAt || this.dodging) return;
    this.grappleReadyAt = time + GRAPPLE_COOLDOWN;

    const target = this.findGrappleTarget();
    Sfx.grapple();
    this.scene.events.emit('playerGrapple', { x: this.x, y: this.y, dir: this.facing.clone(), target });

    if (target) {
      target.onWhiffed(time); // stumble state = briefly vulnerable + AI stops overriding velocity
      const dir = new Phaser.Math.Vector2(this.x - target.x, this.y - target.y).normalize();
      target.setVelocity(dir.x * -GRAPPLE_PULL_SPEED, dir.y * -GRAPPLE_PULL_SPEED);
      this.scene.time.delayedCall(GRAPPLE_ACTIVE_TIME, () => target.body && target.setVelocity(0, 0));
      this.toast('"Komm her, das müssen wir persönlich klären!"');
    } else {
      this.grappling = true;
      this.invulnerableUntil = Math.max(this.invulnerableUntil, time + GRAPPLE_ACTIVE_TIME);
      this.setVelocity(this.facing.x * GRAPPLE_DASH_SPEED, this.facing.y * GRAPPLE_DASH_SPEED);
      this.scene.time.delayedCall(GRAPPLE_ACTIVE_TIME, () => {
        this.grappling = false;
      });
    }
  }

  findGrappleTarget() {
    const enemies = this.scene.enemies?.getChildren() ?? [];
    let best = null;
    let bestDist = GRAPPLE_RANGE;
    enemies.forEach((enemy) => {
      if (enemy.dead) return;
      const toEnemy = new Phaser.Math.Vector2(enemy.x - this.x, enemy.y - this.y);
      const dist = toEnemy.length();
      if (dist > GRAPPLE_RANGE || dist < 1) return;
      toEnemy.normalize();
      if (this.facing.dot(toEnemy) < GRAPPLE_CONE) return;
      if (dist < bestDist) {
        best = enemy;
        bestDist = dist;
      }
    });
    return best;
  }

  handleHotbarKeys(time) {
    const k = this.keys;
    if (Phaser.Input.Keyboard.JustDown(k.hot1)) this.inventory.useHotbar(0);
    else if (Phaser.Input.Keyboard.JustDown(k.hot2)) this.inventory.useHotbar(1);
    else if (Phaser.Input.Keyboard.JustDown(k.hot3)) this.inventory.useHotbar(2);
    else if (Phaser.Input.Keyboard.JustDown(k.hot4)) this.inventory.useHotbar(3);
  }

  handleInventoryKey(time) {
    const k = this.keys;
    if (Phaser.Input.Keyboard.JustDown(k.inventory)) {
      this.scene.events.emit('toggleInventory');
    }
  }

  onSuccessfulParry() {
    this.insultCount += 1;
    const line = Phaser.Utils.Array.GetRandom(INSULTS);
    this.toast(`"${line}"`);
    Sfx.parrySuccess();
  }

  takeDamage(amount, sourceX, sourceY, time) {
    if (this.dead || this.isInvulnerable(time)) return;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableUntil = time + 900;
    this.scene.events.emit('hpChanged', this.hp, this.maxHp);

    // Bright white flash for hit impact, then i-frame blink for the remainder.
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => {
      this.clearTint();
      this.startIFrameBlink(time + 900);
    });

    // Stronger, snappier knockback than before.
    const away = new Phaser.Math.Vector2(this.x - sourceX, this.y - sourceY).normalize();
    this.setVelocity(away.x * 280, away.y * 280);

    // Impact camera shake scales with damage.
    this.scene.cameras.main.shake(120, 0.005 + Math.min(0.01, amount * 0.003));

    if (this.hp <= 0) {
      this.dead = true;
      this.scene.events.emit('playerDied');
      Sfx.playerDeath();
    } else {
      Sfx.playerHurt();
    }
  }

  startIFrameBlink(until) {
    // Alpha blink until i-frames end - clear visual signal that i-frames are active.
    const tick = () => {
      if (this.dead) return;
      const now = this.scene.time.now;
      if (now >= until) {
        this.setAlpha(1);
        return;
      }
      this.setAlpha(this.alpha > 0.7 ? 0.4 : 1);
      this.scene.time.delayedCall(80, tick);
    };
    tick();
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.scene.events.emit('hpChanged', this.hp, this.maxHp);
  }
}

function dirName(v) {
  if (Math.abs(v.x) > Math.abs(v.y)) return v.x > 0 ? 'right' : 'left';
  return v.y > 0 ? 'down' : 'up';
}
