export const ITEMS = {
  bindesiegel: { name: 'Bindesiegel', kind: 'ball', ballBonus: 1.0, sprite: 'bindesiegel',
    desc: 'Ein einfaches, runenverziertes Siegel zum Binden wilder Kreaturen.' },
  edles_bindesiegel: { name: 'Edles Bindesiegel', kind: 'ball', ballBonus: 2.0, sprite: 'edles_bindesiegel',
    desc: 'Fein gearbeitetes Siegel - deutlich zuverlässiger als das einfache.' },
  heiltrank: { name: 'Heiltrank', kind: 'heal', healAmount: 25, sprite: 'heiltrank',
    desc: 'Heilt eine Kreatur um 25 KP.' },
  oberer_heiltrank: { name: 'Oberer Heiltrank', kind: 'heal', healAmount: 9999, sprite: 'heiltrank',
    desc: 'Heilt eine Kreatur vollständig.' },
};

export function getItem(id) {
  const it = ITEMS[id];
  if (!it) throw new Error(`Unbekannter Gegenstand: ${id}`);
  return { id, ...it };
}

export const STARTING_INVENTORY = {
  bindesiegel: 5,
  edles_bindesiegel: 1,
  heiltrank: 3,
  oberer_heiltrank: 1,
};
