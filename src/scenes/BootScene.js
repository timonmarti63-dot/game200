import Phaser from 'phaser';
import { createAllTextures } from '../assets.js';

const SPRITES = [
  'player',
  'sword',
  'halberdier',
  'halberd',
  'goose',
  'chicken',
  'barrel',
  'melon',
  'grail',
  'boss_rudibert',
  'veggie',
  'boat',
  'tile_grass',
  'tile_path',
  'tile_sand',
  'tile_water',
  'tile_wall',
  'tile_floor',
  'tile_stone',
  'tile_stone_path',
  'house_timber',
  'house_stone',
  'house_inn',
  'island_rubenfeld',
  'island_eisenklamm',
  'island_moewenhort',
  'potion',
  'warhammer',
  'armor_leather',
  'chest',
  'tree',
  'bush',
  'rock',
  'flowers',
  'elite_knight',
  'tower_shield',
  'pickaxe',
  'mine_goblin',
  'sapper',
  'bomb',
  'boss_grendal',
  'pine_tree',
  'mine_entrance',
  'grapple_hook',
];

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    SPRITES.forEach((key) => this.load.image(key, `/sprites/${key}.png`));
  }

  create() {
    createAllTextures(this);
    this.scene.start('Title');
  }
}
