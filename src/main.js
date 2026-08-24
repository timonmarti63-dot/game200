import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import TutorialScene from './scenes/TutorialScene.js';
import DemoWorldScene from './scenes/DemoWorldScene.js';
import DemoVillageScene from './scenes/DemoVillageScene.js';

// PC-first config (section 1): no touch input, fixed low-res canvas scaled
// up crisply for a retro-grid look, keyboard focus grabbed immediately.
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#10131a',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 480,
    height: 320,
  },
  scene: [BootScene, TitleScene, TutorialScene, DemoWorldScene, DemoVillageScene],
};

window.game = new Phaser.Game(config);
