// Each zone has a short linear chain of areas. [Weiterziehen] advances
// through them; the last area is the boss's clearing. Wild encounters only
// happen in non-boss areas. requiresOrden gates entry from the previous zone.
export const ZONES = [
  {
    id: 'wiesenmark', name: 'Wiesenmark', threatLevel: [2, 8], weather: 'Klar',
    requiresOrden: null, bossId: 'bertram',
    intro: 'Sanfte Hügel, Bauernhecken und der Duft von frischem Heu - hier beginnt jede Reise.',
    areas: [
      { name: 'Dorfanger', flavor: 'Hühner gackern zwischen den Hütten.' },
      { name: 'Offene Wiese', flavor: 'Hohes Gras raschelt im Wind.' },
      { name: 'Bertrams Übungsplatz', flavor: 'Ein alter Fechtpfahl steht am Wegesrand.', isBossArea: true },
    ],
    fauna: [
      { speciesId: 'wieselratz', weight: 6, levelRange: [2, 6] },
      { speciesId: 'mottling', weight: 4, levelRange: [3, 7] },
    ],
  },
  {
    id: 'nebelwald', name: 'Nebelwald', threatLevel: [10, 18], weather: 'Nebel',
    requiresOrden: 'orden_wiesenmark', bossId: 'sylvana',
    intro: 'Dichter Nebel verschluckt jeden Laut. Zwischen den Bäumen bewegt sich etwas.',
    areas: [
      { name: 'Waldsaum', flavor: 'Moos dämpft jeden Schritt.' },
      { name: 'Nebellichtung', flavor: 'Der Nebel wird dichter, die Sicht kürzer.' },
      { name: 'Sylvanas Baumkreis', flavor: 'Uralte Bäume bilden einen stillen Ring.', isBossArea: true },
    ],
    fauna: [
      { speciesId: 'moosschleicher', weight: 5, levelRange: [10, 15] },
      { speciesId: 'nebelhusch', weight: 5, levelRange: [11, 16] },
    ],
  },
  {
    id: 'eisenklamm', name: 'Eisenklamm', threatLevel: [20, 30], weather: 'Klar',
    requiresOrden: 'orden_nebelwald', bossId: 'grendal',
    intro: 'Kalter Wind pfeift durch die Schlucht. Erz glitzert im Fels, und irgendwo hämmert es.',
    areas: [
      { name: 'Klammeingang', flavor: 'Grobe Steinstufen führen tiefer hinein.' },
      { name: 'Erzstollen', flavor: 'Rostige Werkzeuge liegen verlassen herum.' },
      { name: 'Grendals Schmiede', flavor: 'Glühende Kohlen erhellen eine gewaltige Höhle.', isBossArea: true },
    ],
    fauna: [
      { speciesId: 'klippenkrabbe', weight: 5, levelRange: [20, 26] },
      { speciesId: 'ambosskaefer', weight: 5, levelRange: [21, 27] },
    ],
  },
  {
    id: 'moewenhort', name: 'Möwenhort', threatLevel: [32, 40], weather: 'Sturm',
    requiresOrden: 'orden_klamm', bossId: null, comingSoon: true,
    intro: 'Salzige Gischt und schreiende Möwen - die Küstenfeste liegt noch hinter dem Horizont.',
    areas: [], fauna: [],
  },
];

export function getZone(id) {
  const z = ZONES.find((zone) => zone.id === id);
  if (!z) throw new Error(`Unbekannte Zone: ${id}`);
  return z;
}
