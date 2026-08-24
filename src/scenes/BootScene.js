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
  'house_farm',
  // Pokemon-style interior furniture
  'furn_bed',
  'furn_table_round',
  'furn_bookshelf',
  'furn_plant_pot',
  'furn_crate',
  'furn_kitchen',
  'furn_painting',
  'furn_armchair',
  'furn_rug',
  // HD-2D Crew-Battler-Portraits (Master-Skript-Klassennamen 1:1)
  'Crew_01_Gras_Brawler',
  'Crew_02_Wald_Rogue',
  'Crew_03_Berg_Tank',
  'Crew_04_Canyon_Sniper',
  'Crew_05_Hoehle_Defender',
  'Crew_06_Vulkan_Berserk',
  'Crew_07_Sumpf_Healer',
  'Crew_08_Ruine_Mage',
  'Crew_09_Klippe_Specialist',
];

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Use a relative path so the built site loads sprites correctly whether
    // it's served from the domain root (Vite dev) or a subpath (S3 proxy /
    // GitHub Pages).
    // Cache-Bust via Version-Query, sonst zeigt Browser alte Haus-Sprites.
    const CACHE_VER = 'v3';
    SPRITES.forEach((key) => this.load.image(key, `sprites/${key}.png?${CACHE_VER}`));
  }

  create() {
    createAllTextures(this);
    this.scene.start('Title');
  }
}
