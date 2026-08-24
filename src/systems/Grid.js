// Zentrales Grid-System (Pokemon-Stil).
//
// Jede Szene, die grid-basierte Bewegung nutzt, erzeugt ein WalkableGrid
// mit den gewünschten Dimensionen (cols x rows, cellSize in Pixeln).
// Kollisionen und Warp-Events werden pro Zelle markiert - kein Physics
// Body auf Wänden mehr; Wände blockieren rein per Grid-Lookup.
//
// Der Player prüft VOR jedem Schritt: darf ich auf (col+dx, row+dy)?
// Wenn nicht, bleibt er stehen (dreht sich nur in die Richtung).

export const GRID = 32; // Zellengrösse in Pixeln - passt zu unseren Tiles.

// Tile-Kennzeichen für walkable[][]. Die Werte müssen unterscheidbar
// sein damit unterschiedliche Interaktionen ausgelöst werden können.
export const CELL = {
  FREE: 0,       // begehbar
  WALL: 1,       // blockiert (Haus, Fels, Baum, Wasser ohne Boot, Karten-Rand)
  DOOR: 2,       // Warp-Trigger: beim Betreten wird Warp ausgelöst
  PICKUP: 3,     // Item liegt hier - wird über Interakt gesammelt
};

export class WalkableGrid {
  constructor(cols, rows, cellSize = GRID) {
    this.cols = cols;
    this.rows = rows;
    this.cell = cellSize;
    // 2D Array: cells[row][col] = CELL.*
    this.cells = [];
    for (let r = 0; r < rows; r++) {
      const row = new Array(cols);
      for (let c = 0; c < cols; c++) row[c] = CELL.FREE;
      this.cells.push(row);
    }
    // Warp-Metadaten pro Tür-Zelle: Map<"c,r", { kind, payload }>.
    this.warps = new Map();
  }

  inBounds(col, row) {
    return col >= 0 && row >= 0 && col < this.cols && row < this.rows;
  }

  get(col, row) {
    if (!this.inBounds(col, row)) return CELL.WALL;
    return this.cells[row][col];
  }

  set(col, row, value) {
    if (!this.inBounds(col, row)) return;
    this.cells[row][col] = value;
  }

  // Rechteckigen Bereich als Wand markieren (z.B. Haus-Fussabdruck).
  fillRect(col, row, w, h, value = CELL.WALL) {
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) {
        this.set(c, r, value);
      }
    }
  }

  isWalkable(col, row) {
    const v = this.get(col, row);
    return v !== CELL.WALL;
  }

  // Umrechnung Zelle <-> Weltkoordinaten (Mittelpunkt der Zelle).
  cellToWorld(col, row) {
    return {
      x: col * this.cell + this.cell / 2,
      y: row * this.cell + this.cell / 2,
    };
  }

  worldToCell(x, y) {
    return {
      col: Math.floor(x / this.cell),
      row: Math.floor(y / this.cell),
    };
  }

  // Warp registrieren. `payload` enthält alles was `triggerWarp` braucht.
  addWarp(col, row, payload) {
    this.set(col, row, CELL.DOOR);
    this.warps.set(`${col},${row}`, payload);
  }

  getWarp(col, row) {
    return this.warps.get(`${col},${row}`);
  }
}
