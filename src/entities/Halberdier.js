import Phaser from 'phaser';
import Enemy from './Enemy.js';
import { BOSS_TELEGRAPH_LINES } from '../systems/Insults.js';

const AGGRO_RANGE = 170;
const ATTACK_RANGE = 60;
const TURN_LERP = 0.045; // slow-turning = comedic overshoot

export default class Halberdier extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'halberdier', { hp: 4, speed: 46, contactDamage: 1 });
    this.setSize(20, 14).setOffset(5, 20);
    this.weapon = scene.add.image(x, y, 'halberd').setOrigin(0.5, 0.85);
    this.attackCooldownUntil = 0;
  }

  die() {
    this.weapon?.destroy();
    super.die();
  }

  updateAI(time, delta, isConfused, speedMul) {
    const player = this.scene.player;
    if (!player || player.dead) {
      this.setVelocity(0, 0);
      this.updateWeapon();
      return;
    }
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (this.state === 'stumble' || this.state === 'fleeing') {
      if (this.state === 'fleeing') this.fleeFrom(player, speedMul);
      if (time > this.stateUntil) this.state = 'chase';
      this.updateWeapon();
      return;
    }

    if (this.state === 'telegraph') {
      this.setVelocity(0, 0);
      if (time > this.stateUntil) this.beginLunge(time, player);
      this.updateWeapon();
      return;
    }

    if (this.state === 'lunge') {
      this.updateWeapon();
      return; // velocity set by the lunge tween
    }

    // idle / chase
    if (dist < AGGRO_RANGE) {
      this.state = 'chase';
      if (dist < ATTACK_RANGE && time > this.attackCooldownUntil) {
        this.startTelegraph(550, time);
        this.scene.events.emit('toast', Phaser.Utils.Array.GetRandom(BOSS_TELEGRAPH_LINES));
        this.updateWeapon();
        return;
      }
      if (!isConfused) {
        const targetDir = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y).normalize();
        // slow, overshoot-y turning instead of snapping straight at the player
        this.facing.x = Phaser.Math.Linear(this.facing.x, targetDir.x, TURN_LERP * delta);
        this.facing.y = Phaser.Math.Linear(this.facing.y, targetDir.y, TURN_LERP * delta);
        if (this.facing.lengthSq() > 0) this.facing.normalize();
      } else {
        // confused by stink fog: wander
        this.facing.rotate(0.02 * delta);
      }
      this.setVelocity(this.facing.x * this.speed * speedMul, this.facing.y * this.speed * speedMul);
    } else {
      this.state = 'idle';
      this.setVelocity(0, 0);
    }

    this.updateWeapon();
  }

  beginLunge(time, player) {
    this.state = 'lunge';
    this.exclaim.setVisible(false);
    const dir = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y).normalize();
    this.facing.copy(dir);
    this.setVelocity(dir.x * 260, dir.y * 260);
    this.attackCooldownUntil = time + 1600;

    this.scene.time.delayedCall(260, () => {
      if (this.dead) return;
      this.setVelocity(0, 0);
      const d = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      const now = this.scene.time.now;
      if (d < 34 && !player.isInvulnerable(now)) {
        player.takeDamage(1, this.x, this.y, now);
        this.state = 'chase';
      } else {
        this.onWhiffed(now); // overcommitted - stumbles over own halberd
        this.scene.events.emit('toast', 'Er stolpert über die eigene Hellebarde!');
      }
    });
  }

  updateWeapon() {
    if (!this.weapon) return;
    const angle = this.facing.angle();
    this.weapon.setPosition(this.x + this.facing.x * 10, this.y + this.facing.y * 10);
    this.weapon.setRotation(angle + Math.PI / 2);
    if (this.state === 'stumble') this.weapon.setRotation(angle + Math.PI);
  }
}
