import Phaser from 'phaser';
import Enemy from './Enemy.js';
import { Sfx } from '../systems/Sfx.js';

const AGGRO_RANGE = 420;
const MELEE_RANGE = 74;
const ENRAGE_SPEED = 165;
const ENRAGE_DURATION = 2600;
const EXHAUSTED_DURATION = 3000;

const GRENDAL_LINES = [
  'Für das Eiserne Erbe!',
  'Ihr werdet FALLEN!',
  'Kein Durchkommen, Wicht!',
];

// "Man muss ihn zum Rennen provozieren (per Beleidigungs-Parieren), damit
// er sich selbst außer Atem bringt und zusammenklappt." - parrying one of
// his telegraphed smashes doesn't make him flee like a regular enemy; it
// enrages him into a frantic high-speed sprint that burns him out into an
// exhausted (= vulnerable, bonus-damage) stumble a few seconds later.
export default class DukeGrendal extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'boss_grendal', { hp: 26, speed: 30, contactDamage: 1, isBoss: true });
    this.setSize(34, 22).setOffset(8, 30);
    this.name = 'Eisenherzog Grendal';
    this.actionCooldownUntil = 0;
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

  onParried() {
    if (this.state !== 'telegraph') return;
    this.exclaim.setVisible(false);
    this.state = 'enraged';
    this.stateUntil = this.scene.time.now + ENRAGE_DURATION;
    this.scene.events.emit('toast', '"Bleib STEHEN, du Wicht!!" - er rennt wie von der Tarantel gestochen!');
  }

  beginExhausted(time) {
    this.state = 'stumble'; // reuses Enemy's built-in "vulnerable + bonus dmg" handling
    this.stateUntil = time + EXHAUSTED_DURATION;
    this.setVelocity(0, 0);
    this.scene.events.emit('toast', 'Eisenherzog Grendal krümmt sich, japsend nach Luft - JETZT zuschlagen!');
    Sfx.bossExhausted();
  }

  updateAI(time, delta, isConfused, speedMul) {
    const player = this.scene.player;
    if (!player || player.dead || this.dead) {
      this.setVelocity(0, 0);
      return;
    }

    if (this.state === 'stumble') {
      this.setVelocity(0, 0);
      if (time > this.stateUntil) {
        this.state = 'chase';
        this.scene.events.emit('toast', 'Grendal rappelt sich japsend wieder auf.');
      }
      return;
    }

    if (this.state === 'enraged') {
      if (time > this.stateUntil) {
        this.beginExhausted(time);
        return;
      }
      const dir = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y).normalize();
      this.facing.copy(dir);
      this.setVelocity(dir.x * ENRAGE_SPEED, dir.y * ENRAGE_SPEED);
      return;
    }

    if (this.state === 'telegraph' || this.state === 'lunge' || this.state === 'acting') {
      return;
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
      this.chooseAction(time, player);
      return;
    }

    if (dist > MELEE_RANGE) {
      this.setVelocity(dir.x * this.speed * speedMul, dir.y * this.speed * speedMul);
    } else {
      this.setVelocity(0, 0);
    }
  }

  chooseAction(time, player) {
    if (Math.random() < 0.35) this.actionGroundSlam(time, player);
    else this.actionSmash(time, player);
  }

  actionSmash(time, player) {
    this.startTelegraph(750, time);
    this.scene.events.emit('toast', Phaser.Utils.Array.GetRandom(GRENDAL_LINES));
    this.actionCooldownUntil = time + 2800;

    this.scene.time.delayedCall(750, () => {
      if (this.dead || this.state !== 'telegraph') return;
      this.state = 'lunge';
      this.exclaim.setVisible(false);
      const dir = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y).normalize();
      this.facing.copy(dir);
      this.setVelocity(dir.x * 190, dir.y * 190);

      this.scene.time.delayedCall(380, () => {
        if (this.dead) return;
        this.setVelocity(0, 0);
        const d = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const now = this.scene.time.now;
        if (d < 50 && !player.isInvulnerable(now)) {
          player.takeDamage(2, this.x, this.y, now);
          this.state = 'chase';
        } else {
          this.onWhiffed(now);
          this.scene.events.emit('toast', 'Der Kriegshammer schlägt scheppernd ins Gestein.');
        }
      });
    });
  }

  actionGroundSlam(time, player) {
    this.startTelegraph(650, time);
    this.scene.events.emit('toast', 'Er stemmt den Hammer hoch über den Kopf...');
    this.actionCooldownUntil = time + 3200;

    this.scene.time.delayedCall(650, () => {
      if (this.dead || this.state !== 'telegraph') return;
      this.exclaim.setVisible(false);
      this.state = 'chase';
      this.scene.cameras.main.shake(180, 0.006);
      const now = this.scene.time.now;
      const d = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (d < 95 && !player.isInvulnerable(now)) player.takeDamage(1, this.x, this.y, now);
      this.scene.events.emit('bossGroundSlam', { x: this.x, y: this.y });
    });
  }
}
