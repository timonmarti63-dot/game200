// ============================================================================
// SceneManager - zentraler Übergangs-Handler für Zonen-Wechsel und
// Dorf-State (isSafe). Löst Punkt 2 und 3 des Master-Skripts.
//
// Kein globaler Singleton-Zustand: alles liegt im Phaser-Registry (registry).
// So bleiben Scene-Transitions save/load-kompatibel und determistisch.
// ============================================================================

/**
 * Standard-FadeOut/FadeIn Übergang zwischen zwei Szenen.
 * - Friert Player-Input während der Blende ein
 * - Blendet schwarz ab
 * - Started die Ziel-Szene mit Payload
 *
 * @param {Phaser.Scene} fromScene - Ausgangs-Szene
 * @param {string} toKey - Ziel-Szene-Key (z.B. 'Island', 'Interior')
 * @param {object} payload - wird als Scene-Data an die Ziel-Szene übergeben
 * @param {object} opts - { duration, color, freezeInput }
 */
export function tunnelTransition(fromScene, toKey, payload = {}, opts = {}) {
  const duration = opts.duration ?? 400;
  const color = opts.color ?? 0x000000;
  const cam = fromScene.cameras.main;

  // Input einfrieren (falls Player-Ref auf der Szene vorhanden).
  if (opts.freezeInput !== false && fromScene.player) {
    fromScene.player.setVelocity?.(0, 0);
    fromScene.player._moving = false;
    fromScene.player._bufferedDir = null;
    fromScene.input.keyboard.enabled = false;
  }

  cam.fadeOut(duration, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
  cam.once('camerafadeoutcomplete', () => {
    fromScene.scene.start(toKey, payload);
  });
}

/**
 * Wird als Erstes in der neuen Szene nach create() aufgerufen.
 * Blendet vom Schwarz auf das Spielbild ein.
 */
export function tunnelReveal(scene, opts = {}) {
  const duration = opts.duration ?? 350;
  const color = opts.color ?? 0x000000;
  const cam = scene.cameras.main;
  cam.fadeIn(duration, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
  scene.input.keyboard.enabled = true;
}

// ---------------------------------------------------------------------------
// Village-State (isSafe)
// ---------------------------------------------------------------------------

/**
 * Gibt zurück ob ein Dorf bereits befreit wurde.
 * Registry-Key: `village_safe_<villageId>` -> bool
 */
export function isVillageSafe(registry, villageId) {
  return registry.get(`village_safe_${villageId}`) === true;
}

/**
 * Markiert ein Dorf als "safe" (nach Mini-Boss-Sieg im Dorf).
 * Effekte:
 *  - Feinde despawnen dauerhaft in dieser Szene
 *  - NPCs spawnen
 *  - Shops werden interaktiv
 */
export function markVillageSafe(registry, villageId) {
  registry.set(`village_safe_${villageId}`, true);
  registry.events.emit(`villageSafe:${villageId}`);
}

/**
 * Liste ALLER bekannten Dörfer im Spiel (data-driven).
 * Reihenfolge folgt Master-Skript: 3 große Inseln × 3 Zonen = 9 Dörfer.
 * Zusätzlich die Endgame-Dörfer der 12 kleinen Inseln (später ergänzt).
 */
export const VILLAGES = {
  rubenfeld:      { name: 'Rübenfeld',       island: 1, zone: 1, biome: 'grasland' },
  waldhain:       { name: 'Waldhain',        island: 1, zone: 2, biome: 'wald' },
  eisenklamm:     { name: 'Eisenklamm',      island: 1, zone: 3, biome: 'gebirge' },
  canyon_camp:    { name: 'Canyon-Lager',    island: 2, zone: 1, biome: 'canyon' },
  kristallmine:   { name: 'Kristallmine',    island: 2, zone: 2, biome: 'kristallhoehle' },
  ascheposten:    { name: 'Ascheposten',     island: 2, zone: 3, biome: 'vulkan' },
  mooranger:      { name: 'Mooranger',       island: 3, zone: 1, biome: 'sumpf' },
  tempelhof:      { name: 'Tempelhof',       island: 3, zone: 2, biome: 'tempelruine' },
  donnerhorst:    { name: 'Donnerhorst',     island: 3, zone: 3, biome: 'donnerklippen' },
};
