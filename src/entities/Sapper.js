import Phaser from 'phaser';
import Enemy from './Enemy.js';

const AGGRO_RANGE = 200;
const KITE_RANGE = 90; // too close -> backs off
const CHASE_RANGE = 150; // too far -> closes in
const BOMB_COOLDOWN = 3400;

// Keeps its distance and drops bombs from its satchel instead of fighting
// in melee. Doesn't reliably back off in time, so - true to the GDD - it
// quite often catches itself in its own blast radius.
export default class Sapper extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'sapper', { hp: 3, speed: 52, contactDamage: 1 });
    this.setSize(15, 11).setOffset(6, 18);
    this.bombCooldownUntil = 0;
  }

  updateAI(time, delta, isConfused, speedMul) {
    const player = this.scene.player;
    if (!player || player.dead) {
      this.setVelocity(0, 0);
      return;
    }

    if (this.state === 'stumble' || this.state === 'fleeing') {
      if (this.state === 'fleeing') this.fleeFrom(player, speedMul);
      if (time > this.stateUntil) this.state = 'chase';
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (dist > AGGRO_RANGE && this.state === 'idle') {
      this.setVelocity(0, 0);
      return;
    }
    this.state = 'chase';

    const toPlayer = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y).normalize();
    if (isConfused) {
      this.facing.rotate(0.02 * delta);
      this.setVelocity(this.facing.x * this.speed * 0.4, this.facing.y * this.speed * 0.4);
      return;
    }

    if (dist < KITE_RANGE) {
      this.facing.copy(toPlayer);
      this.setVelocity(-toPlayer.x * this.speed * speedMul, -toPlayer.y * this.speed * speedMul);
    } else if (dist > CHASE_RANGE) {
      this.facing.copy(toPlayer);
      this.setVelocity(toPlayer.x * this.speed * speedMul, toPlayer.y * this.speed * speedMul);
    } else {
      this.facing.copy(toPlayer);
      this.setVelocity(0, 0);
      if (time > this.bombCooldownUntil) this.placeBomb(time);
    }
  }

  placeBomb(time) {
    this.bombCooldownUntil = time + BOMB_COOLDOWN;
    this.scene.events.emit('toast', 'Ähm... VORSICHT, brennende Lunte!');
    this.scene.events.emit('sapperBomb', { x: this.x, y: this.y });
  }
}
