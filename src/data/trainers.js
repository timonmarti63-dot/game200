// Zone bosses ("Ordensmeister") - single-creature trainer battles gating
// progression to the next zone, per the "gated progression" rule.
export const TRAINERS = {
  bertram: {
    name: 'Ordensmeister Bertram', title: 'Wächter der Wiesenmark',
    creatureId: 'bertrams_widder', level: 12, sprite: 'trainer_bertram',
    greeting: '"Wer die Wiesenmark verlassen will, muss erst an mir vorbei!"',
    defeatText: '"Gut gekämpft! Nehmt den Orden der Wiesenmark - der Weg zum Nebelwald ist frei."',
    rewardOrden: 'orden_wiesenmark',
  },
  sylvana: {
    name: 'Ordensmeisterin Sylvana', title: 'Hüterin des Nebelwalds',
    creatureId: 'sylvanas_gefaehrte', level: 22, sprite: 'trainer_sylvana',
    greeting: '"Der Nebel verrät mir jeden Schritt, den Ihr hier tut, Fremder."',
    defeatText: '"Der Wald erkennt Euch an. Nehmt den Orden des Nebelwalds - die Klamm erwartet Euch."',
    rewardOrden: 'orden_nebelwald',
  },
  grendal: {
    name: 'Ordensmeister Grendal', title: 'Eisenherzog der Klamm',
    creatureId: 'grendals_koloss', level: 32, sprite: 'trainer_grendal',
    greeting: '"Wer WAGT es, meine Klamm zu betreten?! Zeigt, was Ihr könnt!"',
    defeatText: '"...Erstaunlich. Nehmt den Orden der Klamm - Ihr habt Euch das Kaiserreich verdient, Wanderer."',
    rewardOrden: 'orden_klamm',
  },
};

export function getTrainer(id) {
  const t = TRAINERS[id];
  if (!t) throw new Error(`Unbekannter Trainer: ${id}`);
  return { id, ...t };
}
