// Hand-drawn pixel art (player, enemies, boss, items, boat, tiles) ships as
// PNGs under public/sprites/ and is loaded by BootScene.preload(). This file
// only procedurally draws the small flat UI glyphs (hearts, icons, VFX)
// where simple shapes read fine at their tiny display size.

function tex(scene, key, w, h, draw) {
  const g = scene.add.graphics();
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

export function createAllTextures(scene) {
  // ---------- ICONS ----------
  tex(scene, 'heart_full', 16, 14, (g) => {
    g.fillStyle(0xd1362a, 1);
    g.fillCircle(5, 5, 5);
    g.fillCircle(11, 5, 5);
    g.fillTriangle(0, 6, 16, 6, 8, 14);
  });
  tex(scene, 'heart_half', 16, 14, (g) => {
    g.fillStyle(0x4a2020, 1);
    g.fillCircle(5, 5, 5);
    g.fillCircle(11, 5, 5);
    g.fillTriangle(0, 6, 16, 6, 8, 14);
    g.fillStyle(0xd1362a, 1);
    g.fillCircle(5, 5, 5);
    g.fillTriangle(0, 6, 8, 6, 8, 14);
  });
  tex(scene, 'heart_empty', 16, 14, (g) => {
    g.fillStyle(0x4a2020, 1);
    g.fillCircle(5, 5, 5);
    g.fillCircle(11, 5, 5);
    g.fillTriangle(0, 6, 16, 6, 8, 14);
  });

  tex(scene, 'exclaim', 14, 20, (g) => {
    g.fillStyle(0xfff23c, 1).fillRoundedRect(4, 0, 6, 12, 2);
    g.fillStyle(0xfff23c, 1).fillCircle(7, 16, 3);
  });

  tex(scene, 'castle_icon', 26, 24, (g) => {
    g.fillStyle(0x9aa0a8, 1).fillRect(2, 8, 22, 16);
    g.fillStyle(0x7a7f8a, 1).fillRect(2, 2, 5, 8);
    g.fillStyle(0x7a7f8a, 1).fillRect(10, 0, 5, 10);
    g.fillStyle(0x7a7f8a, 1).fillRect(18, 2, 5, 8);
    g.fillStyle(0x3a3f47, 1).fillRect(10, 14, 6, 10);
  });

  tex(scene, 'lock_icon', 26, 24, (g) => {
    g.fillStyle(0x555555, 1).fillCircle(13, 20, 10);
    g.fillStyle(0x333333, 1).fillRoundedRect(5, 8, 16, 12, 3);
    g.lineStyle(3, 0x333333, 1).strokeRoundedRect(8, 0, 10, 10, 5);
  });

  tex(scene, 'shadow_blob', 20, 8, (g) => {
    g.fillStyle(0x000000, 0.25).fillEllipse(10, 4, 10, 4);
  });

  tex(scene, 'whitepx', 4, 4, (g) => {
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 4, 4);
  });

  tex(scene, 'stink_cloud', 90, 90, (g) => {
    g.fillStyle(0x6b8f3a, 0.35).fillCircle(45, 45, 45);
    g.fillStyle(0x8fae4f, 0.3).fillCircle(30, 35, 20);
    g.fillStyle(0x8fae4f, 0.3).fillCircle(58, 50, 22);
  });
}
