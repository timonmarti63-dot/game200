import Phaser from 'phaser';
import Enemy from './Enemy.js';

const AGGRO_RANGE = 130;

export default class Goose extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'goose', { hp: 2, speed: 95, contactDamage: 1 });
    this.setSize(15, 10).setOffset(4, 6);
    this.burstUntil = 0;
    this.burstDir = new Phaser.Math.Vector2(0, 0);
  }

  updateAI(time, delta, isConfused, speedMul) {
    const player = this.scene.player;
    if (!player || player.dead) {
      this.setVelocity(0, 0);
      return;
    }

    if (this.state === 'fleeing') {
      this.fleeFrom(player, speedMul);
      if (time > this.stateUntil) this.state = 'chase';
      return;
    }
    if (this.state === 'stumble') {
      if (time > this.stateUntil) this.state = 'chase';
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (dist > AGGRO_RANGE && this.state === 'idle') {
      this.setVelocity(0, 0);
      return;
    }
    this.state = 'chase';

    if (time > this.burstUntil) {
      // dart in short erratic bursts rather than a smooth beeline
      const toPlayer = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y).normalize();
      const jitter = Phaser.Math.FloatBetween(-0.6, 0.6);
      this.burstDir = toPlayer.clone().rotate(jitter);
      this.burstUntil = time + Phaser.Math.Between(220, 420);
    }

    if (isConfused) {
      this.setVelocity(this.burstDir.x * 30, this.burstDir.y * 30);
      return;
    }

    this.facing.copy(this.burstDir);
    this.setVelocity(this.burstDir.x * this.speed * speedMul, this.burstDir.y * this.speed * speedMul);

    if (dist < 20 && time > this.hitCooldownUntil) {
      const now = this.scene.time.now;
      if (!player.isInvulnerable(now)) {
        player.takeDamage(1, this.x, this.y, now);
        this.hitCooldownUntil = time + 900;
      }
    }
  }
}
