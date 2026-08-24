import Phaser from 'phaser';
import { DIFFICULTIES, setDifficulty } from '../systems/Difficulty.js';
import { Sfx } from '../systems/Sfx.js';

export default class DifficultyScene extends Phaser.Scene {
  constructor() {
    super('Difficulty');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1b2a4a');

    // Backdrop: rolling water strip so it feels like part of the intro flow.
    this.waterTile = this.add.tileSprite(width / 2, height - 30, width, 80, 'tile_water');

    this.add
      .text(width / 2, 30, 'WÄHLE DEINEN MUT', {
        fontFamily: 'Georgia, serif',
        fontSize: '20px',
        color: '#f5cf4a',
        stroke: '#4a2a10',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 52, 'Pfeile ← → wechseln, Leertaste bestätigt', {
        fontFamily: 'Courier New',
        fontSize: '10px',
        color: '#cfd8e6',
      })
      .setOrigin(0.5);

    const order = ['easy', 'medium', 'hard'];
    this.selectedIdx = 1; // Medium by default

    // Card layout: three columns
    const cardW = 132;
    const cardH = 150;
    const gap = 12;
    const totalW = order.length * cardW + (order.length - 1) * gap;
    const startX = (width - totalW) / 2 + cardW / 2;
    const cardY = 152;

    this.cards = order.map((id, i) => {
      const cfg = DIFFICULTIES[id];
      const x = startX + i * (cardW + gap);
      const bg = this.add.rectangle(x, cardY, cardW, cardH, 0x21283a, 0.94).setStrokeStyle(2, 0x4a5578);
      const title = this.add
        .text(x, cardY - cardH / 2 + 14, cfg.label, {
          fontFamily: 'Georgia, serif',
          fontSize: '16px',
          color: '#f5cf4a',
        })
        .setOrigin(0.5);

      // Hearts row: draw playerMaxHp / 2 hearts (small).
      const heartCount = Math.ceil(cfg.playerMaxHp / 2);
      const heartsY = cardY - cardH / 2 + 40;
      const heartsGap = 12;
      const hStartX = x - ((heartCount - 1) * heartsGap) / 2;
      for (let h = 0; h < heartCount; h++) {
        this.add.image(hStartX + h * heartsGap, heartsY, 'heart_full').setScale(0.65);
      }

      const subtitle = this.add
        .text(x, cardY - 6, cfg.subtitle, {
          fontFamily: 'Courier New',
          fontSize: '10px',
          color: '#dce6f5',
          align: 'center',
          wordWrap: { width: cardW - 12 },
        })
        .setOrigin(0.5, 0);

      // Stats block at bottom of card
      const stats = [
        `Gegner-Schaden: ${Math.round(cfg.enemyDamageMult * 100)}%`,
        `Gegner-HP:      ${Math.round(cfg.enemyHpMult * 100)}%`,
        `Loot-Chance:    ${Math.round(cfg.lootChance * 100)}%`,
      ].join('\n');
      const statText = this.add
        .text(x, cardY + cardH / 2 - 32, stats, {
          fontFamily: 'Courier New',
          fontSize: '9px',
          color: '#9fb0c9',
          align: 'left',
        })
        .setOrigin(0.5, 0.5);

      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => {
        this.selectedIdx = i;
        this.updateSelection();
        this.confirm();
      });
      bg.on('pointerover', () => {
        this.selectedIdx = i;
        this.updateSelection();
      });

      return { bg, title, subtitle, statText, id };
    });

    this.hint = this.add
      .text(width / 2, height - 12, 'Leertaste: bestätigen   [Esc] Zurück zum Titel', {
        fontFamily: 'Courier New',
        fontSize: '10px',
        color: '#cfe0ff',
      })
      .setOrigin(0.5);

    this.input.keyboard.on('keydown-LEFT', () => {
      this.selectedIdx = (this.selectedIdx + this.cards.length - 1) % this.cards.length;
      this.updateSelection();
      Sfx.uiToggle();
    });
    this.input.keyboard.on('keydown-A', () => {
      this.selectedIdx = (this.selectedIdx + this.cards.length - 1) % this.cards.length;
      this.updateSelection();
      Sfx.uiToggle();
    });
    this.input.keyboard.on('keydown-RIGHT', () => {
      this.selectedIdx = (this.selectedIdx + 1) % this.cards.length;
      this.updateSelection();
      Sfx.uiToggle();
    });
    this.input.keyboard.on('keydown-D', () => {
      this.selectedIdx = (this.selectedIdx + 1) % this.cards.length;
      this.updateSelection();
      Sfx.uiToggle();
    });
    this.input.keyboard.on('keydown-SPACE', () => this.confirm());
    this.input.keyboard.on('keydown-ENTER', () => this.confirm());
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Title'));

    this.updateSelection();
  }

  updateSelection() {
    this.cards.forEach((card, i) => {
      const sel = i === this.selectedIdx;
      card.bg.setStrokeStyle(sel ? 3 : 2, sel ? 0xf5cf4a : 0x4a5578);
      card.bg.setFillStyle(sel ? 0x2f3850 : 0x21283a, 0.96);
    });
  }

  confirm() {
    const chosen = this.cards[this.selectedIdx].id;
    setDifficulty(this.registry, chosen);
    Sfx.unlock();
    // if tutorial not seen yet, jump into the tutorial. Otherwise sail.
    if (this.registry.get('tutorialSeen')) this.scene.start('Sailing');
    else this.scene.start('Tutorial');
  }

  update(time, delta) {
    if (this.waterTile) this.waterTile.tilePositionX += delta * 0.02;
  }
}
