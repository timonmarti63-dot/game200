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
  potion: {
    id: 'potion',
    name: 'Heiltrank',
    type: 'consumable',
    texture: 'potion',
    heal: 2,
    desc: 'Stellt ein Herz wieder her.',
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
  grapple_hook: {
    id: 'grapple_hook',
    name: 'Der Anstands-Enterhaken',
    type: 'ability',
    texture: 'grapple_hook',
    desc: 'Getarnt als "Zepter höflicher Konversation". [F] zieht Gegner heran oder Rüdiger nach vorn.',
  },
};

export function itemDef(id) {
  return id ? ITEMS[id] : null;
}
