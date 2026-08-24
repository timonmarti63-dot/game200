import Phaser from 'phaser';

// TODO(art): swap the colored icon squares for real illustrations once art
// exists - PAGES stays the single place tutorial content lives either way.
const PAGES = [
  {
    title: 'Willkommen, Captain!',
    body: 'Ihr seid Kapitän einer kleinen Crew, unterwegs zu drei großen\nInseln. Rekrutiert Gefährten in jedem Dorf und stellt Euch\nden Wächtern der Inselarenen, um Euch das Kaiserreich zu verdienen.',
    iconColor: 0xf5cf4a,
  },
  {
    title: 'Die Welt erkunden',
    body: 'Bewegt Euch mit WASD oder den Pfeiltasten über das Raster.\nHaltet eine Taste gedrückt, um flüssig weiterzulaufen -\ndie Welt ist groß, also nehmt Euch Zeit.',
    iconColor: 0x5fa04a,
  },
  {
    title: 'Interagieren',
    body: '[E] oder [Enter] spricht mit dem an, dem Ihr gerade zugewandt seid -\nDorfbewohner, Händler oder Gegner, die sich Euch in den Weg stellen.',
    iconColor: 0x4a90d9,
  },
  {
    title: 'Bereit zum Auslaufen',
    body: '[Esc] öffnet später das Menü. Unsichere Dörfer erkennt Ihr an\nstreunenden Gegnern statt Händlern - räumt sie, und die Dorfbewohner\nkehren zurück.\n\nViel Erfolg, Captain!',
    iconColor: 0xd64a3a,
  },
];

export default class TutorialScene extends Phaser.Scene {
  constructor() {
    super('Tutorial');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0e1420');
    this.page = 0;
    this.finished = false;

    this.panel = this.add.rectangle(width / 2, height / 2 - 4, width - 40, height - 70, 0x1c2436, 0.92);
    this.panel.setStrokeStyle(2, 0xf5cf4a, 0.5);

    this.icon = this.add.rectangle(width / 2, 78, 28, 28, PAGES[0].iconColor).setStrokeStyle(2, 0x000000, 0.5);
    this.titleText = this.add
      .text(width / 2, 112, '', { fontFamily: 'Courier New', fontSize: '15px', color: '#f5cf4a', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.bodyText = this.add
      .text(width / 2, 140, '', {
        fontFamily: 'Courier New',
        fontSize: '11px',
        color: '#dce6f5',
        align: 'center',
        lineSpacing: 5,
      })
      .setOrigin(0.5, 0);

    this.dots = [];
    const dotsY = height - 40;
    const startX = width / 2 - ((PAGES.length - 1) * 14) / 2;
    for (let i = 0; i < PAGES.length; i++) {
      this.dots.push(this.add.circle(startX + i * 14, dotsY, 3, 0xffffff, 0.35));
    }

    this.prompt = this.add
      .text(width / 2, height - 18, 'Leertaste / Klick: weiter', { fontFamily: 'Courier New', fontSize: '11px', color: '#ffffff' })
      .setOrigin(0.5);
    this.tweens.add({ targets: this.prompt, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });

    this.add
      .text(width - 10, 10, 'Esc: überspringen', { fontFamily: 'Courier New', fontSize: '10px', color: '#9fb0c9' })
      .setOrigin(1, 0);

    this.input.keyboard.on('keydown-SPACE', () => this.next());
    this.input.keyboard.on('keydown-ESC', () => this.finish());
    this.input.on('pointerdown', () => this.next());

    this.renderPage();
  }

  renderPage() {
    const p = PAGES[this.page];
    this.titleText.setText(p.title);
    this.bodyText.setText(p.body);
    this.icon.setFillStyle(p.iconColor);
    this.dots.forEach((dot, i) => dot.setFillStyle(0xffffff, i === this.page ? 0.95 : 0.3));
    this.prompt.setText(this.page === PAGES.length - 1 ? 'Leertaste: Loslegen!' : 'Leertaste / Klick: weiter');
  }

  next() {
    if (this.page < PAGES.length - 1) {
      this.page += 1;
      this.renderPage();
    } else {
      this.finish();
    }
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.scene.start('DemoWorld');
  }
}
