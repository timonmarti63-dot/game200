import Phaser from 'phaser';
import Enemy from './Enemy.js';

const AGGRO_RANGE = 150;

// Fast, low-HP, short-range - darts at the player in quick erratic bursts
// with a pickaxe, same rhythm as the Goose but hits harder and dies faster.
export default class MineGoblin extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'mine_goblin', { hp: 3, speed: 108, contactDamage: 1 });
    this.setSize(13, 9).setOffset(4, 8);
    this.weapon = scene.add.image(x, y, 'pickaxe').setOrigin(0.5, 0.8).setScale(0.6);
    this.burstUntil = 0;
    this.burstDir = new Phaser.Math.Vector2(0, 0);
  }

  die() {
    this.weapon?.destroy();
    super.die();
  }

  updateAI(time, delta, isConfused, speedMul) {
    this.updateWeapon();
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
      const toPlayer = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y).normalize();
      const jitter = Phaser.Math.FloatBetween(-0.5, 0.5);
      this.burstDir = toPlayer.clone().rotate(jitter);
      this.burstUntil = time + Phaser.Math.Between(260, 480);
    }

    if (isConfused) {
      this.setVelocity(this.burstDir.x * 30, this.burstDir.y * 30);
      return;
    }

    this.facing.copy(this.burstDir);
    this.setVelocity(this.burstDir.x * this.speed * speedMul, this.burstDir.y * this.speed * speedMul);
  }

  updateWeapon() {
    if (!this.weapon) return;
    const angle = this.facing.angle();
    this.weapon.setPosition(this.x + this.facing.x * 7, this.y + this.facing.y * 7);
    this.weapon.setRotation(angle + Math.PI / 2);
  }
}
