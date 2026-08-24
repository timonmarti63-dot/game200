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

// ---------------------------------------------------------------------------
// Hand-authoring a large map tile-by-tile as an ASCII grid stops being
// practical past a screen or two, so big open areas (the overworld sections
// from section 2) are described declaratively instead: a base ground color
// plus a list of rectangular `regions` (a forest patch, a rocky patch, a
// lake...), each optionally scattering individual obstacle tiles within
// itself rather than blocking the whole rectangle. Border tiles are always
// walls. `keepClear` tiles (spawn point, tunnel point, ...) are guaranteed
// to never become obstacles.
//
// TODO(map-data): same swap-out note as buildGridFromLayout - once real
// Tiled maps exist this becomes level-design tooling rather than the
// shipped map source, but the `{ isWalkable(x,y), tunnels }` contract this
// returns does not need to change for callers.
// ---------------------------------------------------------------------------

export function buildComposedGrid(scene, opts) {
  const {
    width,
    height,
    tileSize,
    baseColor,
    borderColor = 0x1c2418,
    regions = [],
    tunnels = [],
    keepClear = [],
  } = opts;

  const walkable = [];
  const keepClearSet = new Set(keepClear.map((p) => `${p.x},${p.y}`));
  const tunnelByTile = new Map(tunnels.map((t) => [`${t.gridX},${t.gridY}`, t]));

  for (let y = 0; y < height; y++) {
    walkable[y] = [];
    for (let x = 0; x < width; x++) {
      const isBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      let color = baseColor;
      let tileWalkable = true;

      if (isBorder) {
        color = borderColor;
        tileWalkable = false;
      } else {
        const region = regions.find((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
        if (region) {
          color = region.groundColor;
          const canBeObstacle = !keepClearSet.has(`${x},${y}`);
          if (canBeObstacle && Math.random() < (region.obstacleDensity ?? 0)) {
            color = region.obstacleColor;
            tileWalkable = false;
          }
        }
      }

      const tunnel = tunnelByTile.get(`${x},${y}`);
      if (tunnel) {
        color = tunnel.color ?? 0x8a5fd6;
        tileWalkable = true;
      }

      walkable[y][x] = tileWalkable;
      createPlaceholderTile(scene, x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, tileSize, color);
    }
  }

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
