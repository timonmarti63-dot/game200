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
  'grendal_hammer',
  // Post-processing enhancements (see tools/enhance_pixel_art.py)
  'shadow_blob',
  'tile_water_0',
  'tile_water_1',
  'tile_water_2',
  'tile_water_3',
  'tile_grass_1',
  'tile_grass_2',
  'tile_sand_1',
  'tile_stone_1',
  'beach_edge',
  'slash_vfx',
  'spark',
  // Village + shop overhaul
  'dock',
  'elevation_wall',
  'shopkeeper_potion',
  'shopkeeper_smith',
  'coin_silver',
  'coin_gold',
  'tile_floor_wood',
  'house_apothecary',
  'house_smith',
  'well',
  'arena_gatehouse',
  'potion_medium',
  'potion_large',
  'armor_iron',
  'armor_plate',
  'house_cottage_a',
  'house_cottage_b',
];

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Use a relative path so the built site loads sprites correctly whether
    // it's served from the domain root (Vite dev) or a subpath (S3 proxy /
    // GitHub Pages).
    SPRITES.forEach((key) => this.load.image(key, `sprites/${key}.png`));
  }

  create() {
    createAllTextures(this);
    this.scene.start('Title');
  }
}
