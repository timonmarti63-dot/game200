import { createPlaceholderTile } from './PlaceholderRenderer.js';

// ---------------------------------------------------------------------------
// TODO(map-data): This ASCII-layout approach is a placeholder for real map
// data. Once actual level design starts, swap buildGridFromLayout()'s input
// for a Tiled JSON export (Phaser has first-class Tilemap support) - every
// call site only needs `{ isWalkable(x, y), tunnels }` back, so the caller
// contract does not need to change when that swap happens.
//
// A `layout` is an array of equal-length strings (rows). Each character is
// looked up in `legend`:
//   { char: { walkable: boolean, color: number, tunnel?: { targetSceneKey, targetGridX, targetGridY } } }
// ---------------------------------------------------------------------------

export function buildGridFromLayout(scene, layout, legend, tileSize) {
  const walkable = [];
  const tunnels = [];

  layout.forEach((row, gridY) => {
    walkable[gridY] = [];
    for (let gridX = 0; gridX < row.length; gridX++) {
      const char = row[gridX];
      const def = legend[char];
      if (!def) throw new Error(`TileGrid: kein Legenden-Eintrag für Zeichen "${char}"`);

      walkable[gridY][gridX] = def.walkable;
      const worldX = gridX * tileSize + tileSize / 2;
      const worldY = gridY * tileSize + tileSize / 2;
      createPlaceholderTile(scene, worldX, worldY, tileSize, def.color, def.alpha ?? 1);

      if (def.tunnel) {
        tunnels.push({ gridX, gridY, ...def.tunnel });
      }
    }
  });

  const height = walkable.length;
  const width = walkable[0]?.length ?? 0;

  return {
    width,
    height,
    tunnels,
    isWalkable(gridX, gridY) {
      if (gridX < 0 || gridY < 0 || gridX >= width || gridY >= height) return false;
      return walkable[gridY][gridX] === true;
    },
  };
}
