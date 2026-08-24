// category: 'phys' (Angriff/Verteidigung), 'spec' (SpAngriff/SpVerteidigung),
// or 'status' (no damage, power is null). effect is optional:
//   { status, chance } - may inflict a status condition on the target
//   { statChange: { stat, stages, target } } - target 'gegner' or 'selbst'
//   { heal: fraction } - heals the user for a fraction of its max HP
export const MOVES = {
  stoss: { name: 'Stoß', type: 'Normal', category: 'phys', power: 40, accuracy: 100, pp: 35 },
  kratzer: { name: 'Kratzer', type: 'Normal', category: 'phys', power: 35, accuracy: 100, pp: 35 },
  gebruell: { name: 'Gebrüll', type: 'Normal', category: 'status', power: null, accuracy: 100, pp: 20,
    effect: { statChange: { stat: 'angriff', stages: -1, target: 'gegner' } } },
  vollttreffer: { name: 'Wuchtschlag', type: 'Normal', category: 'phys', power: 75, accuracy: 90, pp: 15 },

  funkenschlag: { name: 'Funkenschlag', type: 'Feuer', category: 'phys', power: 40, accuracy: 100, pp: 30,
    effect: { status: 'verbrennung', chance: 0.1 } },
  feuerodem: { name: 'Feuerodem', type: 'Feuer', category: 'spec', power: 65, accuracy: 95, pp: 20,
    effect: { status: 'verbrennung', chance: 0.15 } },
  flammenwurf: { name: 'Flammenwurf', type: 'Feuer', category: 'spec', power: 90, accuracy: 90, pp: 10,
    effect: { status: 'verbrennung', chance: 0.2 } },

  wasserstrahl: { name: 'Wasserstrahl', type: 'Flut', category: 'spec', power: 45, accuracy: 100, pp: 25 },
  flutwelle: { name: 'Flutwelle', type: 'Flut', category: 'spec', power: 70, accuracy: 95, pp: 15 },
  gischtschlag: { name: 'Gischtschlag', type: 'Flut', category: 'phys', power: 85, accuracy: 90, pp: 10 },

  steinwurf: { name: 'Steinwurf', type: 'Erde', category: 'phys', power: 50, accuracy: 95, pp: 20 },
  erdstoss: { name: 'Erdstoß', type: 'Erde', category: 'phys', power: 75, accuracy: 90, pp: 15 },
  gesteinshagel: { name: 'Gesteinshagel', type: 'Erde', category: 'phys', power: 60, accuracy: 85, pp: 15 },

  windschnitt: { name: 'Windschnitt', type: 'Sturm', category: 'spec', power: 45, accuracy: 100, pp: 25 },
  blitzschlag: { name: 'Blitzschlag', type: 'Sturm', category: 'spec', power: 70, accuracy: 95, pp: 15,
    effect: { status: 'paralyse', chance: 0.15 } },
  sturmboe: { name: 'Sturmböe', type: 'Sturm', category: 'spec', power: 90, accuracy: 85, pp: 10 },

  ranken: { name: 'Ranken', type: 'Wald', category: 'phys', power: 40, accuracy: 100, pp: 25 },
  dornenwurf: { name: 'Dornenwurf', type: 'Wald', category: 'phys', power: 55, accuracy: 95, pp: 20,
    effect: { status: 'gift', chance: 0.2 } },
  wurzelgriff: { name: 'Wurzelgriff', type: 'Wald', category: 'phys', power: 70, accuracy: 90, pp: 15,
    effect: { heal: 0.5 } },
  sporenwolke: { name: 'Sporenwolke', type: 'Wald', category: 'status', power: null, accuracy: 75, pp: 15,
    effect: { status: 'schlaf', chance: 1.0 } },

  klingenhieb: { name: 'Klingenhieb', type: 'Stahl', category: 'phys', power: 55, accuracy: 100, pp: 25 },
  schildstoss: { name: 'Schildstoß', type: 'Stahl', category: 'phys', power: 70, accuracy: 95, pp: 15 },
  rammbock: { name: 'Rammbock', type: 'Stahl', category: 'phys', power: 90, accuracy: 85, pp: 10 },

  segensschein: { name: 'Segensschein', type: 'Licht', category: 'spec', power: 50, accuracy: 100, pp: 20 },
  reinigenderStrahl: { name: 'Reinigender Strahl', type: 'Licht', category: 'spec', power: 75, accuracy: 90, pp: 15 },
  weihe: { name: 'Weihe', type: 'Licht', category: 'status', power: null, accuracy: 100, pp: 10,
    effect: { statChange: { stat: 'verteidigung', stages: 1, target: 'selbst' } } },

  schattenhieb: { name: 'Schattenhieb', type: 'Schatten', category: 'phys', power: 45, accuracy: 100, pp: 25 },
  fluchgriff: { name: 'Fluchgriff', type: 'Schatten', category: 'spec', power: 65, accuracy: 95, pp: 15,
    effect: { status: 'gift', chance: 0.25 } },
  albtraum: { name: 'Albtraum', type: 'Schatten', category: 'spec', power: 85, accuracy: 90, pp: 10 },

  einschuechtern: { name: 'Einschüchtern', type: 'Normal', category: 'status', power: null, accuracy: 100, pp: 15,
    effect: { statChange: { stat: 'verteidigung', stages: -1, target: 'gegner' } } },
  ruestungsbrecher: { name: 'Rüstungsbrecher', type: 'Erde', category: 'status', power: null, accuracy: 100, pp: 15,
    effect: { statChange: { stat: 'verteidigung', stages: -2, target: 'gegner' } } },
};

export function getMove(id) {
  const m = MOVES[id];
  if (!m) throw new Error(`Unbekannte Attacke: ${id}`);
  return { id, ...m };
}
