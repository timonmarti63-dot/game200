import Phaser from 'phaser';
import { Sfx } from '../systems/Sfx.js';

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, opts = {}) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);

    this.maxHp = opts.hp ?? 3;
    this.hp = this.maxHp;
    this.speed = opts.speed ?? 40;
    this.contactDamage = opts.contactDamage ?? 1;
    this.xpValue = opts.xpValue ?? 1;
    this.state = 'idle';
    this.dead = false;
    this.stateUntil = 0;
    this.facing = new Phaser.Math.Vector2(0, 1);
    this.hitCooldownUntil = 0;
    this.confusedUntil = 0;
    this.slowUntil = 0;
    this.walkPhase = 0;

    this.exclaim = scene.add.image(x, y - 26, 'exclaim').setVisible(false);
  }

  get isVulnerableBonus() {
    return this.state === 'stumble';
  }

  canAct(time) {
    return !this.dead && this.state !== 'stumble' && this.state !== 'fleeing';
  }

  takeDamage(amount, sourceX, sourceY, time) {
    if (this.dead) return;
    const bonus = this.isVulnerableBonus ? 2 : 1;
    this.hp -= amount * bonus;

    // setTintFill overrides ALL sprite pixels with white -> a real hit flash
    // (plain setTint just multiplies and barely reads on light sprites).
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.clearTint());

    // Suppress the walk-bob squash for a moment so the hit punch reads clearly.
    this.punchUntil = (this.scene.time.now || 0) + 140;
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.3,
      scaleY: 0.75,
      duration: 55,
      yoyo: true,
    });

    const away = new Phaser.Math.Vector2(this.x - sourceX, this.y - sourceY).normalize();
    // Stronger knockback for crits so parry-punished enemies really fly.
    const kb = bonus > 1 ? 260 : 180;
    this.setVelocity(away.x * kb, away.y * kb);

    if (this.hp <= 0) {
      this.die();
    } else if (bonus > 1) {
      Sfx.critHit();
    } else {
      Sfx.hit();
    }
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.state = 'dead';
    this.exclaim.destroy();
    this.body.enable = false;
    this.scene.events.emit('enemyDied', this);
    Sfx.enemyDeath();
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      angle: 90,
      duration: 350,
      onComplete: () => this.destroy(),
    });
  }

  startTelegraph(duration, time) {
    this.state = 'telegraph';
    this.stateUntil = time + duration;
    this.exclaim.setVisible(true);
    this.setVelocity(0, 0);
  }

  onParried() {
    this.state = 'fleeing';
    this.stateUntil = this.scene.time.now + 2400;
    this.exclaim.setVisible(false);
  }

  onWhiffed(time) {
    this.state = 'stumble';
    this.stateUntil = time + 1200;
    this.exclaim.setVisible(false);
    this.setVelocity(0, 0);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.dead) return;
    if (this.exclaim) this.exclaim.setPosition(this.x, this.y - 26);

    const isConfused = time < this.confusedUntil;
    const speedMul = time < this.slowUntil ? 0.35 : 1;

    this.updateAI(time, delta, isConfused, speedMul);
    this.setFlipX(this.facing.x < 0);
    this.updateWalkBob(delta);
  }

  // No frame-by-frame walk cycle art - a light squash/stretch bob synced to
  // movement speed reads as "walking" without needing extra sprite frames.
  updateWalkBob(delta) {
    // Yield to the hit-punch tween so it isn't clobbered every frame.
    if (this.punchUntil && this.scene.time.now < this.punchUntil) return;
    const speed = this.body.velocity.length();
    if (speed > 8 && this.state !== 'stumble') {
      this.walkPhase += delta * 0.017 * Math.min(1.6, speed / Math.max(1, this.speed));
      const s = Math.sin(this.walkPhase);
      this.setScale(1 + s * 0.05, 1 - s * 0.06);
    } else {
      this.walkPhase = 0;
      this.setScale(1, 1);
    }
  }

  // overridden by subclasses
  updateAI() {}

  fleeFrom(target, speedMul) {
    const away = new Phaser.Math.Vector2(this.x - target.x, this.y - target.y).normalize();
    this.facing.copy(away);
    this.setVelocity(away.x * this.speed * 1.4 * speedMul, away.y * this.speed * 1.4 * speedMul);
  }
}
