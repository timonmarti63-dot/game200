// Shared "chunky JRPG bag menu" UI look - rounded panels, a warm gold/parchment
// accent on cool navy-slate panels, used by both the in-world HUD (UIScene)
// and the full inventory screen (InventoryScene) so they read as one system.

export const UI_COLORS = {
  panel: 0x1b2338,
  panelAlpha: 0.94,
  panelEdge: 0x4a5a8c,
  gold: 0xe8b93f,
  goldDim: 0x9c7f2e,
  ink: 0xeee3c8,
  inkDim: 0x93a0c2,
  slot: 0x232c44,
  slotEdge: 0x3a4568,
  crimson: 0xb23a2e,
};

// Rounded panel with a soft drop shadow and a two-tone border (dark outer
// line + a thin bright inner hairline) for a slight "carved plaque" depth.
export function panel(scene, x, y, w, h, opts = {}) {
  const {
    radius = 8,
    fill = UI_COLORS.panel,
    fillAlpha = UI_COLORS.panelAlpha,
    edge = UI_COLORS.panelEdge,
    depth = 100,
    shadow = true,
  } = opts;
  const g = scene.add.graphics().setScrollFactor(0).setDepth(depth);
  if (shadow) {
    g.fillStyle(0x000000, 0.28);
    g.fillRoundedRect(x + 2, y + 3, w, h, radius);
  }
  g.fillStyle(fill, fillAlpha);
  g.fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(2, edge, 1);
  g.strokeRoundedRect(x, y, w, h, radius);
  g.lineStyle(1, 0xffffff, 0.06);
  g.strokeRoundedRect(x + 1.5, y + 1.5, w - 3, h - 3, Math.max(1, radius - 2));
  return g;
}

// One item slot: rounded frame + a correctly re-fitted icon (the historical
// bug here was textures being swapped without re-applying display size).
export function makeSlot(scene, x, y, size, { depth = 100, onClick } = {}) {
  const g = scene.add.graphics().setScrollFactor(0).setDepth(depth);
  drawSlotFrame(g, x, y, size, false);
  const iconPad = Math.round(size * 0.22);
  const icon = scene.add
    .image(x, y, 'whitepx')
    .setVisible(false)
    .setScrollFactor(0)
    .setDepth(depth + 1)
    .setDisplaySize(size - iconPad, size - iconPad);
  const hit = scene.add.rectangle(x, y, size, size, 0x000000, 0).setScrollFactor(0).setDepth(depth + 2);
  if (onClick) {
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', onClick);
    hit.on('pointerover', () => drawSlotFrame(g, x, y, size, true));
    hit.on('pointerout', () => drawSlotFrame(g, x, y, size, false));
  }
  return { g, icon, hit, x, y, size, iconPad };
}

function drawSlotFrame(g, x, y, size, hovered) {
  const r = Math.round(size * 0.2);
  g.clear();
  g.fillStyle(0x000000, 0.25);
  g.fillRoundedRect(x - size / 2 + 1, y - size / 2 + 2, size, size, r);
  g.fillStyle(UI_COLORS.slot, 1);
  g.fillRoundedRect(x - size / 2, y - size / 2, size, size, r);
  g.lineStyle(hovered ? 2 : 1.5, hovered ? UI_COLORS.gold : UI_COLORS.slotEdge, 1);
  g.strokeRoundedRect(x - size / 2, y - size / 2, size, size, r);
}

// Sets a slot's item texture + quantity badge, always re-fitting the icon
// to the slot (this is the fix: never trust a leftover scale after
// setTexture() swaps in a differently-sized source image).
export function setSlotItem(slot, entry, ITEMS) {
  const id = typeof entry === 'string' ? entry : entry?.id;
  const qty = typeof entry === 'string' ? 1 : entry?.qty ?? 1;
  const def = id ? ITEMS[id] : null;
  if (def) {
    slot.icon.setTexture(def.texture).setDisplaySize(slot.size - slot.iconPad, slot.size - slot.iconPad).setVisible(true);
    slot.icon.itemId = id;
    if (slot.qty) slot.qty.setText(qty > 1 ? String(qty) : '').setVisible(qty > 1);
  } else {
    slot.icon.setVisible(false);
    slot.icon.itemId = null;
    if (slot.qty) slot.qty.setVisible(false);
  }
}

export function qtyBadge(scene, x, y, size, depth = 100) {
  return scene.add
    .text(x + size / 2 - 3, y + size / 2 - 2, '', {
      fontFamily: 'Courier New',
      fontSize: '10px',
      color: '#eee3c8',
      stroke: '#0c0f18',
      strokeThickness: 3,
    })
    .setOrigin(1, 1)
    .setScrollFactor(0)
    .setDepth(depth + 1);
}
