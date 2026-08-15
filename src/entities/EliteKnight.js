import Phaser from 'phaser';
import Enemy from './Enemy.js';
import { BOSS_TELEGRAPH_LINES } from '../systems/Insults.js';

const AGGRO_RANGE = 190;
const ATTACK_RANGE = 54;
const TURN_LERP = 0.02; // even slower/heavier turning than the Halberdier
const BLOCK_DOT = 0.25; // attacks arriving roughly from the front are blocked

// "Fast unbesiegbar von vorne, aber so langsam, dass man sie mühelos
// umrundet" - the tower shield blocks almost all damage taken from the
// direction the knight is currently facing, so the player has to circle
// around to the back/side to actually hurt it.
export default class EliteKnight extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'elite_knight', { hp: 11, speed: 24, contactDamage: 1 });
    this.setSize(22, 16).setOffset(6, 22);
    this.shield = scene.add.image(x, y, 'tower_shield').setOrigin(0.5, 0.8);
    this.attackCooldownUntil = 0;
    this.lastBlockToastAt = 0;
  }

  die() {
    this.shield?.destroy();
    super.die();
  }

  takeDamage(amount, sourceX, sourceY, time) {
    const toSource = new Phaser.Math.Vector2(sourceX - this.x, sourceY - this.y).normalize();
    const blocked = this.state !== 'stumble' && this.facing.dot(toSource) > BLOCK_DOT;
    const finalAmount = blocked ? Math.max(1, Math.round(amount * 0.15)) : amount;
    if (blocked && this.scene.time.now - this.lastBlockToastAt > 1400) {
      this.lastBlockToastAt = this.scene.time.now;
      this.scene.events.emit('toast', 'KLONG! Der Turmschild hält - von vorn kommst du hier nicht durch.');
    }
    super.takeDamage(finalAmount, sourceX, sourceY, time);
  }

  updateAI(time, delta, isConfused, speedMul) {
    const player = this.scene.player;
    if (!player || player.dead) {
      this.setVelocity(0, 0);
      this.updateShield();
      return;
    }
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (this.state === 'stumble' || this.state === 'fleeing') {
      if (this.state === 'fleeing') this.fleeFrom(player, speedMul);
      if (time > this.stateUntil) this.state = 'chase';
      this.updateShield();
      return;
    }

    if (this.state === 'telegraph') {
      this.setVelocity(0, 0);
      if (time > this.stateUntil) this.beginLunge(time, player);
      this.updateShield();
      return;
    }

    if (this.state === 'lunge') {
      this.updateShield();
      return;
    }

    if (dist < AGGRO_RANGE) {
      this.state = 'chase';
      if (dist < ATTACK_RANGE && time > this.attackCooldownUntil) {
        this.startTelegraph(700, time);
        this.scene.events.emit('toast', Phaser.Utils.Array.GetRandom(BOSS_TELEGRAPH_LINES));
        this.updateShield();
        return;
      }
      if (!isConfused) {
        const targetDir = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y).normalize();
        this.facing.x = Phaser.Math.Linear(this.facing.x, targetDir.x, TURN_LERP * delta);
        this.facing.y = Phaser.Math.Linear(this.facing.y, targetDir.y, TURN_LERP * delta);
        if (this.facing.lengthSq() > 0) this.facing.normalize();
      } else {
        this.facing.rotate(0.015 * delta);
      }
      this.setVelocity(this.facing.x * this.speed * speedMul, this.facing.y * this.speed * speedMul);
    } else {
      this.state = 'idle';
      this.setVelocity(0, 0);
    }

    this.updateShield();
  }

  beginLunge(time, player) {
    this.state = 'lunge';
    this.exclaim.setVisible(false);
    const dir = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y).normalize();
    this.facing.copy(dir);
    this.setVelocity(dir.x * 200, dir.y * 200);
    this.attackCooldownUntil = time + 2200;

    this.scene.time.delayedCall(300, () => {
      if (this.dead) return;
      this.setVelocity(0, 0);
      const d = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      const now = this.scene.time.now;
      if (d < 38 && !player.isInvulnerable(now)) {
        player.takeDamage(2, this.x, this.y, now);
        this.state = 'chase';
      } else {
        this.onWhiffed(now);
        this.scene.events.emit('toast', 'Zu schwer gepanzert - er kippt fast nach vorn über.');
      }
    });
  }

  updateShield() {
    if (!this.shield) return;
    const angle = this.facing.angle();
    this.shield.setPosition(this.x - this.facing.x * 12, this.y - this.facing.y * 12 + 4);
    this.shield.setRotation(angle + Math.PI / 2);
  }
}
