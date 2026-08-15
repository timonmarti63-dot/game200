import Phaser from 'phaser';

const PAGES = [
  {
    title: 'Die Geschichte',
    body: 'Ser Rüdiger von Hühnerstein ist ein Ritter aus kleinen Verhältnissen -\nmit einem großen Traum: Er will der neue Kaiser werden.\nDazu muss er über die Inseln des Archipels segeln,\nrivalisierende Fürsten besiegen und Verbündete sammeln.',
    art: 'player',
    artScale: 2.2,
  },
  {
    title: 'Segeln',
    body: 'Auf offener See steuerst du dein Boot mit WASD oder den Pfeiltasten.\nSteure auf eine Insel zu und drücke [Leertaste],\num an Land zu gehen.',
    art: 'boat',
    artScale: 1.6,
  },
  {
    title: 'Erkunden',
    body: 'Zu Fuß erkundest du Dörfer und Felder, sammelst Gegenstände\nund triffst auf Gegner. Räum das Umland, um Zugang\nzur Burg des Fürsten zu bekommen.',
    art: 'house_timber',
    artScale: 1.3,
  },
  {
    title: 'Kämpfen',
    body: 'Angriff: [Leertaste]      Ausweichrolle: [Shift]\nBeleidigungs-Parieren: [Q] - kontert einen telegraphierten\nAngriff, der Gegner flieht heulend!',
    art: 'halberdier',
    artScale: 1.4,
  },
  {
    title: 'Ausrüstung & Hotbar',
    body: 'Auf Inseln findest du Waffen, Rüstung, Tränke und\nWurfgeschosse - manche liegen einfach herum, manche\nstecken in Truhen oder fallen von besiegten Gegnern.\nHotbar-Slots [1]-[4] benutzen. Inventar öffnen: [E].',
    art: 'chest',
    artScale: 1.6,
  },
  {
    title: 'Auf zum Thron!',
    body: 'Erobere Insel für Insel, besiege die Fürsten -\nund werde der neue Kaiser.\n\nViel Erfolg, Ser Rüdiger!',
    art: 'boss_rudibert',
    artScale: 1.3,
  },
];

export default class TutorialScene extends Phaser.Scene {
  constructor() {
    super('Tutorial');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1b2a4a');
    this.page = 0;

    this.panel = this.add.rectangle(width / 2, height / 2 - 6, width - 40, height - 74, 0x21283a, 0.92);
    this.panel.setStrokeStyle(2, 0xf5cf4a, 0.5);

    this.titleText = this.add
      .text(width / 2, 36, '', { fontFamily: 'Georgia, serif', fontSize: '21px', color: '#f5cf4a' })
      .setOrigin(0.5);

    this.artImage = this.add.image(width / 2, 96, 'player').setOrigin(0.5);

    this.bodyText = this.add
      .text(width / 2, 172, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: '#f0ead8',
        align: 'center',
        lineSpacing: 5,
      })
      .setOrigin(0.5, 0);

    this.dots = [];
    const dotsY = height - 40;
    const startX = width / 2 - ((PAGES.length - 1) * 14) / 2;
    for (let i = 0; i < PAGES.length; i++) {
      const dot = this.add.circle(startX + i * 14, dotsY, 3, 0xffffff, 0.35);
      this.dots.push(dot);
    }

    this.prompt = this.add
      .text(width / 2, height - 18, '', { fontFamily: 'Courier New', fontSize: '13px', color: '#ffffff' })
      .setOrigin(0.5);
    this.tweens.add({ targets: this.prompt, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });

    this.add
      .text(width - 14, 14, 'Esc: überspringen', { fontFamily: 'Courier New', fontSize: '11px', color: '#9fb0c9' })
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
    this.artImage.setTexture(p.art).setScale(p.artScale ?? 1.5);
    this.dots.forEach((dot, i) => dot.setFillStyle(0xffffff, i === this.page ? 0.95 : 0.3));
    this.prompt.setText(
      this.page === PAGES.length - 1 ? 'Leertaste: Auslaufen!' : 'Leertaste / Klick: weiter'
    );
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
    this.registry.set('tutorialSeen', true);
    this.scene.start('Sailing');
  }
}
