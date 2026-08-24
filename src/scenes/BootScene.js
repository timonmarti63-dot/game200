import Phaser from 'phaser';

// TODO(assets): once real pixel art/tilesets/audio exist, this.load.* calls
// go here (spritesheets, tilemap JSON, audio). Nothing to preload yet -
// every visual in the current build is a placeholder drawn at runtime by
// systems/PlaceholderRenderer.js, so Boot only needs to hand off to the
// first playable scene.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.scene.start('Title');
  }
}
