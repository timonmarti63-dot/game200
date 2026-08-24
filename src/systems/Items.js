export const ITEMS = {
  sword: {
    id: 'sword',
    name: 'Schwert',
    type: 'weapon',
    texture: 'sword',
    damage: 1,
    range: 34,
    cooldown: 380,
    desc: 'Das treue Erbstück-Schwert. Schnell und zuverlässig.',
  },
  warhammer: {
    id: 'warhammer',
    name: 'Kriegshammer',
    type: 'weapon',
    texture: 'warhammer',
    damage: 2,
    range: 30,
    cooldown: 560,
    desc: 'Langsam, aber es tut richtig weh.',
  },
  halberd: {
    id: 'halberd',
    name: 'Hellebarde',
    type: 'weapon',
    texture: 'halberd',
    damage: 2,
    range: 46,
    cooldown: 500,
    desc: 'Lange Reichweite, ordentlicher Schaden. Adelig.',
  },
  potion: {
    id: 'potion',
    name: 'Kleiner Heiltrank',
    type: 'consumable',
    texture: 'potion',
    heal: 2,
    desc: 'Stellt ein Herz wieder her.',
  },
  potion_medium: {
    id: 'potion_medium',
    name: 'Mittlerer Heiltrank',
    type: 'consumable',
    texture: 'potion_medium',
    heal: 4,
    desc: 'Zwei Herzen. Deutlich wirksamer.',
  },
  potion_large: {
    id: 'potion_large',
    name: 'Grosser Heiltrank',
    type: 'consumable',
    texture: 'potion_large',
    heal: 8,
    desc: 'Vier Herzen. Die Notration für böse Bosskämpfe.',
  },
  chicken: {
    id: 'chicken',
    name: 'Huhn',
    type: 'throwable',
    texture: 'chicken',
    desc: 'Wurfgeschoss - löst eine Hühner-Stampede aus.',
  },
  barrel: {
    id: 'barrel',
    name: 'Heringsfass',
    type: 'throwable',
    texture: 'barrel',
    desc: 'Wurfgeschoss - hinterlässt einen stinkenden Nebel.',
  },
  melon: {
    id: 'melon',
    name: 'Melone',
    type: 'throwable',
    texture: 'melon',
    desc: 'Wurfgeschoss - solider Flächenschaden.',
  },
  grail: {
    id: 'grail',
    name: 'Heiliger Gral',
    type: 'trinket',
    texture: 'grail',
    desc: 'Riecht verdächtig nach Kaffee. Espresso-Rausch auf Abruf, lange Abklingzeit.',
  },
  armor_leather: {
    id: 'armor_leather',
    name: 'Lederrüstung',
    type: 'armor',
    texture: 'armor_leather',
    maxHpBonus: 2,
    desc: 'Abgewetzt, aber sie hält. Ein zusätzliches Herz.',
  },
  armor_iron: {
    id: 'armor_iron',
    name: 'Kettenrüstung',
    type: 'armor',
    texture: 'armor_iron',
    maxHpBonus: 4,
    desc: 'Solides Eisen. Zwei zusätzliche Herzen.',
  },
  armor_plate: {
    id: 'armor_plate',
    name: 'Plattenrüstung',
    type: 'armor',
    texture: 'armor_plate',
    maxHpBonus: 6,
    desc: 'Königliche Plattenrüstung. Drei zusätzliche Herzen.',
  },
  grapple_hook: {
    id: 'grapple_hook',
    name: 'Der Anstands-Enterhaken',
    type: 'ability',
    texture: 'grapple_hook',
    desc: 'Getarnt als "Zepter höflicher Konversation". [F] zieht Gegner heran oder Rüdiger nach vorn.',
  },
};

// Shop stock: item id + price ({silver} or {gold}). Kept separate from
// ITEMS so ITEM data (stats, texture) stays the source of truth.
export const APOTHECARY_STOCK = [
  { id: 'potion',        price: { silver: 5 } },
  { id: 'potion_medium', price: { silver: 10 } },
  { id: 'potion_large',  price: { silver: 20 } },
];

export const SMITH_STOCK = [
  { id: 'sword',         price: { silver: 50 } },
  { id: 'warhammer',     price: { silver: 120 } },
  { id: 'halberd',       price: { silver: 200 } },
  { id: 'armor_leather', price: { silver: 30 } },
  { id: 'armor_iron',    price: { gold: 1 } },
  { id: 'armor_plate',   price: { gold: 3 } },
];

export function itemDef(id) {
  return id ? ITEMS[id] : null;
}

export function formatPrice(price) {
  const parts = [];
  if (price.silver) parts.push(`${price.silver} Silber`);
  if (price.gold) parts.push(`${price.gold} Gold`);
  return parts.join(' + ') || 'gratis';
}
