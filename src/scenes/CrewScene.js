// ============================================================================
// CrewScene - Übersicht aller 9 Piraten-Crew-Mitglieder mit HD-2D Portraits.
// Native Auflösung: 480×320. Portraits werden klein dargestellt; Detail-Panel
// zeigt volle Infos zum selektierten Crew-Mitglied.
// ============================================================================

import Phaser from 'phaser';
import { CREW_MEMBERS, SKILLS, createBattler } from '../data/CrewRegistry.js';
import { isVillageSafe, VILLAGES } from '../systems/SceneManager.js';

export default class CrewScene extends Phaser.Scene {
  constructor() { super('Crew'); }

  create() {
    const W = this.scale.width;   // 480
    const H = this.scale.height;  // 320

    // Vollflächiger dunkler Overlay-Hintergrund
    this.add.rectangle(0, 0, W, H, 0x0a0f1a, 1).setOrigin(0);

    // Header
    this.add.rectangle(0, 0, W, 22, 0x1a2338, 1).setOrigin(0)
      .setStrokeStyle(1, 0xd5a24a, 1);
    this.add.text(W / 2, 11, 'PIRATEN-CREW', {
      fontFamily: 'monospace', fontSize: '12px', color: '#f5d78e', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Portrait-Grid: 3×3, Karte 46×62
    const ids = Object.keys(CREW_MEMBERS);
    const cardW = 46;
    const cardH = 62;
    const gapX = 6;
    const gapY = 6;
    const gridW = cardW * 3 + gapX * 2;
    const startX = 12 + cardW / 2;
    const startY = 30 + cardH / 2;

    this.selectedIdx = 0;
    this.cards = [];

    ids.forEach((id, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      this.cards.push(this._buildCard(id, x, y, cardW, cardH, i));
    });

    // Detail-Panel: rechte Seite (Portrait-Grid ist links ~180px breit)
    const detailX = 12 + gridW + 10;
    const detailY = 30;
    const detailW = W - detailX - 12;
    const detailH = H - detailY - 30;

    this.add.rectangle(detailX, detailY, detailW, detailH, 0x121a2a, 0.95).setOrigin(0)
      .setStrokeStyle(1, 0xd5a24a, 1);

    this.detailName = this.add.text(detailX + 8, detailY + 6, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#f5d78e', fontStyle: 'bold',
      wordWrap: { width: detailW - 16 },
    });
    this.detailStatus = this.add.text(detailX + 8, detailY + 22, '', {
      fontFamily: 'monospace', fontSize: '9px', color: '#8892a8',
      wordWrap: { width: detailW - 16 },
    });
    this.detailStats = this.add.text(detailX + 8, detailY + 64, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#e8e2c8',
      wordWrap: { width: detailW - 16 },
    });
    this.detailSkills = this.add.text(detailX + 8, detailY + 116, '', {
      fontFamily: 'monospace', fontSize: '9px', color: '#c8e4c8',
      wordWrap: { width: detailW - 16 },
      lineSpacing: 2,
    });

    // Footer-Hinweis
    this.add.rectangle(0, H - 20, W, 20, 0x1a2338, 1).setOrigin(0);
    this.add.text(W / 2, H - 10, '[← → ↑ ↓] Auswahl  [ESC/C] Zurück  [Maus-Klick]', {
      fontFamily: 'monospace', fontSize: '9px', color: '#8892a8',
    }).setOrigin(0.5);

    this._setupKeyboard();
    this._select(0);

    this.cameras.main.fadeIn(220, 0, 0, 0);
  }

  _buildCard(id, x, y, w, h, idx) {
    const tpl = CREW_MEMBERS[id];
    const recruited = this._isRecruited(id);

    const bg = this.add.rectangle(x, y, w, h, recruited ? 0x1a2338 : 0x14192a, 1)
      .setStrokeStyle(1, recruited ? 0x6a7896 : 0x3a4258, 1);

    let portrait;
    if (this.textures.exists(id)) {
      portrait = this.add.image(x, y - 5, id).setDisplaySize(w - 6, h - 18);
      if (!recruited) portrait.setTint(0x5a5a70).setAlpha(0.62);
    } else {
      portrait = this.add.rectangle(x, y - 5, w - 6, h - 18, tpl.placeholderColor, recruited ? 1 : 0.3);
    }

    // Nummer im Rahmen
    this.add.text(x, y + (h / 2) - 7, `#${(idx + 1).toString().padStart(2, '0')}`, {
      fontFamily: 'monospace', fontSize: '9px',
      color: recruited ? '#f5d78e' : '#5a6478', fontStyle: 'bold',
    }).setOrigin(0.5);

    const highlight = this.add.rectangle(x, y, w + 2, h + 2, 0, 0)
      .setStrokeStyle(2, 0xffd45a, 1).setVisible(false);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => this._select(idx));
    bg.on('pointerdown', () => this._select(idx));

    return { bg, portrait, highlight, id, recruited };
  }

  _isRecruited(id) {
    const village = CREW_MEMBERS[id].recruitInVillage;
    return isVillageSafe(this.registry, village);
  }

  _select(idx) {
    if (idx < 0) idx = 0;
    if (idx >= this.cards.length) idx = this.cards.length - 1;
    this.cards.forEach((c, i) => c.highlight.setVisible(i === idx));
    this.selectedIdx = idx;
    this._updateDetail(idx);
  }

  _updateDetail(idx) {
    const card = this.cards[idx];
    const tpl = CREW_MEMBERS[card.id];
    const battler = createBattler(card.id);

    const village = VILLAGES[tpl.recruitInVillage];
    const villageName = village?.name ?? tpl.recruitInVillage;

    this.detailName.setText(tpl.displayName);
    this.detailStatus.setText(
      card.recruited
        ? `+ Rekrutiert (${tpl.role})\nHeimat: ${villageName}`
        : `- Nicht rekrutiert\nBefreie: ${villageName}\nRolle: ${tpl.role}`
    );
    this.detailStatus.setColor(card.recruited ? '#7ed37e' : '#e08a5a');

    this.detailStats.setText(
      `Typ: ${tpl.type}\n` +
      `HP  ${battler.stats.hp}\n` +
      `ATK ${battler.stats.atk}   DEF ${battler.stats.def}\n` +
      `SPD ${battler.stats.spd}`
    );

    const skillLines = tpl.skills.map(sk => {
      const s = SKILLS[sk];
      if (!s) return `- ${sk}`;
      const power = s.power > 0 ? `Pow ${s.power}` : 'Sup';
      return `- ${s.name}\n    (${s.type}, ${power})`;
    }).join('\n');
    this.detailSkills.setText(`Skills:\n${skillLines}`);
  }

  _setupKeyboard() {
    const kb = this.input.keyboard;
    kb.on('keydown-LEFT',  () => this._select(this.selectedIdx - 1));
    kb.on('keydown-A',     () => this._select(this.selectedIdx - 1));
    kb.on('keydown-RIGHT', () => this._select(this.selectedIdx + 1));
    kb.on('keydown-D',     () => this._select(this.selectedIdx + 1));
    kb.on('keydown-UP',    () => this._select(this.selectedIdx - 3));
    kb.on('keydown-W',     () => this._select(this.selectedIdx - 3));
    kb.on('keydown-DOWN',  () => this._select(this.selectedIdx + 3));
    kb.on('keydown-S',     () => this._select(this.selectedIdx + 3));
    kb.on('keydown-ESC',   () => this._close());
    kb.on('keydown-C',     () => this._close());
  }

  _close() {
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('Crew');
      this.scene.resume('Island');
    });
  }
}
