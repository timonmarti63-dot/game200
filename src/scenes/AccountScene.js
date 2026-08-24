import Phaser from 'phaser';
import * as Cloud from '../systems/CloudSave.js';

// A small login/signup overlay for the optional cross-device cloud save.
// Uses a Phaser DOM Element (real HTML form inputs) rather than trying to
// build text fields out of canvas primitives - see CloudSave.js for why
// this only actually works on a real deployment, not the sandboxed
// Artifact preview.
export default class AccountScene extends Phaser.Scene {
  constructor() {
    super('Account');
  }

  init(data) {
    this.returnSceneKey = data?.returnSceneKey ?? 'Sailing';
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);

    const configured = Cloud.isConfigured();
    const html = `
      <style>
        .ks-panel { width:250px; background:#1b2338; border:2px solid #e8b93f; border-radius:10px;
                    padding:14px; font-family:'Courier New',monospace; color:#eee3c8; position:relative;
                    box-shadow:0 8px 24px rgba(0,0,0,.5); }
        .ks-panel h3 { margin:0 0 10px; font-family:Georgia,serif; color:#e8b93f; font-size:15px; text-align:center; }
        .ks-panel input { width:100%; box-sizing:border-box; margin-bottom:6px; padding:6px 8px;
                           border-radius:5px; border:1px solid #4a5a8c; background:#232c44; color:#eee3c8;
                           font-family:inherit; font-size:12px; }
        .ks-row { display:flex; gap:6px; margin-bottom:6px; }
        .ks-panel button { flex:1; padding:6px 4px; border-radius:5px; border:1px solid #4a5a8c;
                            background:#2f3850; color:#eee3c8; font-family:inherit; font-size:11px; cursor:pointer; }
        .ks-panel button:hover { border-color:#e8b93f; }
        .ks-signout { width:100%; }
        .ks-status { font-size:10px; min-height:28px; text-align:center; color:#93a0c2; margin-top:4px; line-height:1.4; }
        .ks-close { position:absolute; top:6px; right:9px; cursor:pointer; color:#93a0c2; font-size:11px; }
      </style>
      <div class="ks-panel">
        <span class="ks-close" id="ks-close">[X] schließen</span>
        <h3>&#9729; Cloud-Speicher</h3>
        ${
          configured
            ? `
          <input type="email" id="ks-email" placeholder="E-Mail" autocomplete="email" />
          <input type="password" id="ks-password" placeholder="Passwort" autocomplete="current-password" />
          <div class="ks-row">
            <button id="ks-signup" type="button">Registrieren</button>
            <button id="ks-signin" type="button">Anmelden</button>
          </div>
          <button id="ks-signout" class="ks-signout" type="button">Abmelden</button>
          <div class="ks-status" id="ks-status"></div>
        `
            : `<div class="ks-status">Cloud-Speicher ist noch nicht eingerichtet.<br/>Fortschritt bleibt lokal in dieser Sitzung erhalten.</div>`
        }
      </div>
    `;

    const el = this.add.dom(width / 2, height / 2).createFromHTML(html);
    el.getChildByID('ks-close').addEventListener('click', () => this.close());
    if (!configured) return;

    const status = (msg) => {
      el.getChildByID('ks-status').textContent = msg;
    };
    const emailValue = () => el.getChildByID('ks-email').value.trim();
    const passwordValue = () => el.getChildByID('ks-password').value;

    el.getChildByID('ks-signup').addEventListener('click', async () => {
      status('Registriere...');
      try {
        await Cloud.signUp(emailValue(), passwordValue());
        status('Konto erstellt! Bestätigungs-E-Mail prüfen, dann anmelden.');
      } catch (err) {
        status(err.message || 'Registrierung fehlgeschlagen.');
      }
    });

    el.getChildByID('ks-signin').addEventListener('click', async () => {
      status('Melde an...');
      try {
        await Cloud.signIn(emailValue(), passwordValue());
        status('Angemeldet - lade Spielstand...');
        const remote = await Cloud.loadCloud();
        if (remote) {
          Cloud.applyRegistrySnapshot(this.registry, remote);
          status('Spielstand geladen!');
        } else {
          await Cloud.saveCloud(this.registry);
          status('Neues Konto - aktueller Fortschritt gesichert.');
        }
        this.time.delayedCall(1200, () => this.close());
      } catch (err) {
        status(err.message || 'Anmeldung fehlgeschlagen.');
      }
    });

    el.getChildByID('ks-signout').addEventListener('click', async () => {
      await Cloud.signOut();
      status('Abgemeldet.');
    });
  }

  close() {
    this.scene.stop();
    this.scene.resume(this.returnSceneKey);
  }
}
