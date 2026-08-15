// Player.Inventory used to be recreated from scratch every time IslandScene
// re-runs create() (new island, or re-landing on one already conquered),
// silently wiping weapon/armor/hotbar/backpack/HP/abilities. This persists
// that state across scenes for the lifetime of the browser tab via the
// Phaser registry (shared game-wide, reset on full page reload - there is
// no server/localStorage save here, only same-session continuity).
const KEY = 'playerState';

export function savePlayerState(player) {
  if (!player || player.dead) return;
  const inv = player.inventory;
  player.scene.registry.set(KEY, {
    hp: player.hp,
    baseMaxHp: player.baseMaxHp,
    weapon: inv.weapon,
    armor: inv.armor,
    hotbar: inv.hotbar.map((e) => (e ? { ...e } : null)),
    backpack: inv.backpack.map((e) => ({ ...e })),
    hasGrapple: player.hasGrapple,
  });
}

export function loadPlayerState(scene) {
  return scene.registry.get(KEY) ?? null;
}

// Applies a saved snapshot onto a freshly-constructed Player. Only items,
// equipment and abilities carry over - HP is deliberately NOT restored and
// always starts full: a new scene load (landing on an island, or a Game
// Over restart) is a natural "patch yourself up" point, and restoring a
// near-death HP value here would turn a Game Over into an unwinnable
// respawn loop.
export function applyPlayerState(player, saved, ITEMS) {
  player.baseMaxHp = saved.baseMaxHp;
  player.inventory.weapon = saved.weapon;
  player.inventory.armor = saved.armor;
  player.inventory.hotbar = saved.hotbar;
  player.inventory.backpack = saved.backpack;
  player.hasGrapple = saved.hasGrapple;

  const armorDef = saved.armor ? ITEMS[saved.armor] : null;
  player.maxHp = player.baseMaxHp + (armorDef?.maxHpBonus ?? 0);
  player.hp = player.maxHp;
}
