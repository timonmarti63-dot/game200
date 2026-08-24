// Nine elemental types, medieval-themed. Kept to 9 (not 18) so the full
// effectiveness chart stays hand-tunable and legible - every entry below
// was chosen deliberately, not generated.
export const TYPES = [
  'Normal', // mundane, no strong matchups either way
  'Feuer', // fire
  'Flut', // water/flood
  'Erde', // earth/rock
  'Sturm', // wind/lightning
  'Wald', // plant/nature
  'Stahl', // metal/construct
  'Licht', // holy/radiant
  'Schatten', // dark/unholy
];

const S = 2.0; // super effective
const W = 0.5; // not very effective
const DEFAULT_MULT = 1.0; // neutral - any pair not listed in CHART falls back to this

// CHART[attackType][defendType] = multiplier. Any pair not listed is neutral (1.0).
// Designed as a rock-paper-scissors medieval elemental wheel:
//   Feuer > Wald > Erde > Sturm > Stahl > Flut > Feuer (the core loop)
//   Licht <> Schatten (mutual 2x), Stahl resists Normal, Erde resists Sturm/Feuer.
export const CHART = {
  Normal: { Stahl: W, Schatten: W },
  Feuer: { Wald: S, Stahl: S, Feuer: W, Flut: W, Erde: W },
  Flut: { Feuer: S, Erde: S, Flut: W, Wald: W, Sturm: W },
  Erde: { Sturm: S, Stahl: S, Feuer: S, Wald: W, Flut: W },
  Sturm: { Stahl: S, Wald: S, Erde: W },
  Wald: { Erde: S, Flut: S, Feuer: W, Sturm: W, Stahl: W },
  Stahl: { Flut: S, Licht: S, Schatten: S, Feuer: W, Erde: W, Sturm: W, Stahl: W },
  Licht: { Schatten: S, Licht: W },
  Schatten: { Licht: S, Normal: S, Schatten: W },
};

export function typeMultiplier(attackType, defendTypes) {
  let mult = 1;
  for (const defType of defendTypes) {
    const row = CHART[attackType];
    const m = row && row[defType] !== undefined ? row[defType] : DEFAULT_MULT;
    mult *= m;
  }
  return mult;
}
