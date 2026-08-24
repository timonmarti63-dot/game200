// ---------------------------------------------------------------------------
// "Generiere keine finalen Grafiken. Verwende für alle visuellen
// Repräsentationen einfache Platzhalter (farbige Quadrate mit klaren
// Namens-Tags)." This is the ONLY place that draws anything - once real
// pixel art exists, an artist (or a future pass) swaps this module's guts
// for a sprite/atlas loader and every scene using it is unaffected, since
// they only ever call createPlaceholderEntity()/createPlaceholderTile().
// ---------------------------------------------------------------------------

const LABEL_STYLE = {
  fontFamily: 'Courier New',
  fontSize: '9px',
  color: '#ffffff',
  align: 'center',
};

/**
 * A moving, labelled entity (player, NPC, enemy...) as a colored square with
 * a name tag underneath. Returned as a Container so it has a single x/y for
 * GridMovementController to own, and so swapping in a real sprite later is a
 * matter of changing what's inside the container, not every call site.
 */
export function createPlaceholderEntity(scene, { size = 28, color = 0x4a90d9, label = '' } = {}) {
  const square = scene.add.rectangle(0, 0, size, size, color).setStrokeStyle(2, 0x000000, 0.6);
  const container = scene.add.container(0, 0, [square]);

  if (label) {
    const text = scene.add.text(0, size / 2 + 3, label, LABEL_STYLE).setOrigin(0.5, 0);
    container.add(text);
  }

  container.setSize(size, size);
  return container;
}

/**
 * A static, non-moving tile decoration (ground, obstacle, tunnel marker...).
 * Deliberately separate from createPlaceholderEntity - tiles never need a
 * GridMovementController and are cheaper without a Container wrapper.
 */
export function createPlaceholderTile(scene, worldX, worldY, size, color, alpha = 1) {
  return scene.add.rectangle(worldX, worldY, size - 1, size - 1, color, alpha);
}
