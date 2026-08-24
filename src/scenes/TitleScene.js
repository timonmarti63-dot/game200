import Phaser from 'phaser';

// TODO(art): title art/logo/background go here once real assets exist -
// plain text + a placeholder rectangle for now, per the "no final art yet"
// instruction.
export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0e1420');

    this.add
      .text(width / 2, height / 2 - 70, 'PIRATENZUG', {
        fontFamily: 'Courier New',
        fontSize: '30px',
        color: '#f5cf4a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 38, 'Eine Crew. Drei Inseln. Ein Kaiserreich.', {
        fontFamily: 'Courier New',
        fontSize: '11px',
        color: '#cfd8e6',
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(width / 2, height / 2 + 60, '[Leertaste] um zu beginnen', {
        fontFamily: 'Courier New',
        fontSize: '13px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });

    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      this.scene.start('Tutorial');
    };
    this.input.keyboard.once('keydown-SPACE', start);
    this.input.once('pointerdown', start);
  }
}
