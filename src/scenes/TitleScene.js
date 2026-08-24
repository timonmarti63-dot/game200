import Phaser from 'phaser';
import { Sfx } from '../systems/Sfx.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1b2a4a');

    // decorative water strip
    const water = this.add.tileSprite(width / 2, height - 40, width, 100, 'tile_water');
    this.waterTile = water;

    this.add
      .text(width / 2, height / 2 - 70, 'KRONE & KETTENHEMD', {
        fontFamily: 'Georgia, serif',
        fontSize: '34px',
        color: '#f5cf4a',
        stroke: '#4a2a10',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 30, 'Ein sehr ambitionierter Ritter', {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: '#e8dcc0',
      })
      .setOrigin(0.5);

    this.add.image(width / 2, height / 2 + 30, 'boat').setScale(1.2);

    const seen = this.registry.get('tutorialSeen');
    const prompt = this.add
      .text(width / 2, height - 90, seen ? 'Leertaste drücken zum Auslaufen' : 'Leertaste drücken, um zu beginnen', {
        fontFamily: 'Courier New',
        fontSize: '15px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0.3,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    this.add
      .text(
        width / 2,
        height - 20,
        seen
          ? 'Bewegen: WASD/Pfeile   Angriff: Leertaste   Ausweichen: Shift   Kontern: Q   Inventar: E   [T] Anleitung'
          : '[T] Anleitung überspringen und direkt auslaufen',
        { fontFamily: 'Courier New', fontSize: '10px', color: '#9fb0c9' }
      )
      .setOrigin(0.5);

    this.add
      .text(width - 8, 8, '[C] ☁ Cloud-Speicher', { fontFamily: 'Courier New', fontSize: '9px', color: '#7f9cc9' })
      .setOrigin(1, 0);
    this.input.keyboard.on('keydown-C', () => {
      this.scene.pause();
      this.scene.launch('Account', { returnSceneKey: 'Title' });
    });

    Sfx.unlock();
    // startGame is independently wired to both a key and a pointer trigger
    // below; a real click can register as both in quick succession, so this
    // guard makes sure the scene transition only ever fires once.
    let started = false;
    const startGame = () => {
      if (started) return;
      started = true;
      Sfx.unlock();
      if (this.registry.get('tutorialSeen')) this.scene.start('Sailing');
      else this.scene.start('Tutorial');
    };
    const skipToSailing = () => {
      if (started) return;
      started = true;
      Sfx.unlock();
      this.registry.set('tutorialSeen', true);
      this.scene.start('Sailing');
    };
    const replayTutorial = () => {
      if (started) return;
      started = true;
      this.scene.start('Tutorial');
    };
    this.input.keyboard.once('keydown-SPACE', startGame);
    this.input.once('pointerdown', startGame);
    this.input.keyboard.once('keydown-T', seen ? replayTutorial : skipToSailing);
  }

  update(time, delta) {
    if (this.waterTile) this.waterTile.tilePositionX += delta * 0.02;
  }
}
