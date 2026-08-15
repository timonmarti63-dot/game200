import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import TutorialScene from './scenes/TutorialScene.js';
import SailingScene from './scenes/SailingScene.js';
import IslandScene from './scenes/IslandScene.js';
import UIScene from './scenes/UIScene.js';
import InventoryScene from './scenes/InventoryScene.js';

const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 320,
  parent: 'game',
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#1b1f2a',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 480,
    height: 320,
  },
  scene: [BootScene, TitleScene, TutorialScene, SailingScene, IslandScene, UIScene, InventoryScene],
};

window.game = new Phaser.Game(config);
