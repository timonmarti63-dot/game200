import Phaser from 'phaser';
import Enemy from './Enemy.js';

const AGGRO_RANGE = 400;
const MELEE_RANGE = 70;

export default class Boss extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'boss_rudibert', { hp: 22, speed: 32, contactDamage: 1 });
    this.setSize(32, 20).setOffset(8, 27);
    this.name = 'Baron Rudibert';
    this.actionCooldownUntil = 0;
    this.guardsCalled = 0;
    this.maxGuards = 2;
    this.homeX = x;
    this.homeY = y;
    this.scene.events.emit('bossSpawned', this);
  }

  takeDamage(amount, sourceX, sourceY, time) {
    super.takeDamage(amount, sourceX, sourceY, time);
    if (!this.dead) this.scene.events.emit('bossHpChanged', this.hp, this.maxHp);
  }

  die() {
    super.die();
    this.scene.events.emit('bossDied');
  }

  updateAI(time, delta, isConfused, speedMul) {
    const player = this.scene.player;
    if (!player || player.dead || this.dead) {
      this.setVelocity(0, 0);
      return;
    }

    if (this.state === 'stumble' || this.state === 'fleeing') {
      if (time > this.stateUntil) this.state = 'chase';
      this.setVelocity(0, 0);
      return;
    }

    if (this.state === 'telegraph' || this.state === 'lunge' || this.state === 'acting') {
      return; // handled by delayed callbacks below
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (dist > AGGRO_RANGE) {
      this.setVelocity(0, 0);
      return;
    }

    this.state = 'chase';
    const dir = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y).normalize();
    this.facing.copy(dir);

    if (time > this.actionCooldownUntil) {
      this.chooseAction(time, player, dist);
      return;
    }

    if (dist > MELEE_RANGE) {
      this.setVelocity(dir.x * this.speed * speedMul, dir.y * this.speed * speedMul);
    } else {
      this.setVelocity(0, 0);
    }
  }

  chooseAction(time, player, dist) {
    const roll = Math.random();
    if (roll < 0.4) this.actionThrowVeggie(time, player);
    else if (roll < 0.65 && this.guardsCalled < this.maxGuards) this.actionCallGuards(time);
    else this.actionCharge(time, player);
  }

  actionThrowVeggie(time, player) {
    this.state = 'telegraph';
    this.stateUntil = time + 500;
    this.exclaim.setVisible(true);
    this.setVelocity(0, 0);
    this.scene.events.emit('toast', 'Verkostet meinen Zorn-Kohl!');
    this.actionCooldownUntil = time + 2200;

    const targetX = player.x;
    const targetY = player.y;
    this.scene.time.delayedCall(500, () => {
      if (this.dead) return;
      this.exclaim.setVisible(false);
      this.state = 'chase';
      this.scene.events.emit('bossThrowVeggie', { fromX: this.x, fromY: this.y, toX: targetX, toY: targetY });
    });
  }

  actionCallGuards(time) {
    this.state = 'telegraph';
    this.stateUntil = time + 500;
    this.exclaim.setVisible(true);
    this.setVelocity(0, 0);
    this.scene.events.emit('toast', 'Waaachen! Irgendjemand?! HALLOOO?!');
    this.actionCooldownUntil = time + 3000;

    this.scene.time.delayedCall(500, () => {
      if (this.dead) return;
      this.exclaim.setVisible(false);
      this.state = 'chase';
      this.guardsCalled += 1;
      this.scene.events.emit('bossCallGuards', { x: this.x, y: this.y });
    });
  }

  actionCharge(time, player) {
    this.startTelegraph(600, time);
    this.scene.events.emit('toast', 'Für Kaiser Rudibert!');
    this.actionCooldownUntil = time + 2400;

    this.scene.time.delayedCall(600, () => {
      if (this.dead) return;
      this.state = 'lunge';
      this.exclaim.setVisible(false);
      const dir = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y).normalize();
      this.facing.copy(dir);
      this.setVelocity(dir.x * 210, dir.y * 210);

      this.scene.time.delayedCall(320, () => {
        if (this.dead) return;
        this.setVelocity(0, 0);
        const d = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const now = this.scene.time.now;
        if (d < 46 && !player.isInvulnerable(now)) {
          player.takeDamage(1, this.x, this.y, now);
          this.state = 'chase';
        } else {
          this.onWhiffed(now);
          this.scene.events.emit('toast', 'Er verheddert sich im eigenen Kohlkragen!');
        }
      });
    });
  }
}
