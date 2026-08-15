import Phaser from 'phaser';

const PROJECTILE_SPEED = 260;
const PROJECTILE_LIFE = 650;

export function spawnPickup(scene, type, x, y) {
  const sprite = scene.physics.add.sprite(x, y, type);
  sprite.body.setAllowGravity(false);
  sprite.body.moves = false;
  sprite.itemType = type;
  scene.tweens.add({
    targets: sprite,
    y: y - 4,
    duration: 700,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  return sprite;
}

export function spawnChest(scene, containedItemId, x, y) {
  const sprite = scene.physics.add.sprite(x, y, 'chest');
  sprite.body.setAllowGravity(false);
  sprite.body.moves = false;
  sprite.itemType = 'chest';
  sprite.containedItemId = containedItemId;
  return sprite;
}

export function spawnProjectile(scene, type, x, y, dir) {
  const proj = scene.physics.add.sprite(x, y, type);
  proj.body.setAllowGravity(false);
  proj.itemType = type;
  proj.setVelocity(dir.x * PROJECTILE_SPEED, dir.y * PROJECTILE_SPEED);
  proj.setRotation(dir.angle());
  proj.spawnTime = scene.time.now;
  proj.life = PROJECTILE_LIFE;
  return proj;
}

export function landProjectile(scene, proj) {
  const { x, y, itemType } = proj;
  if (itemType === 'barrel') {
    spawnStinkFog(scene, x, y);
    scene.events.emit('toast', 'Ein Fass voller Heringe... es riecht katastrophal.');
  } else if (itemType === 'melon') {
    scene.events.emit('splash', { x, y });
  } else if (itemType === 'chicken') {
    stampede(scene, x, y);
  }
  proj.destroy();
}

export function resolveProjectileHitEnemy(scene, proj, enemy) {
  if (proj.hit) return;
  proj.hit = true;
  const time = scene.time.now;
  if (proj.itemType === 'chicken') {
    enemy.takeDamage(1, proj.x, proj.y, time);
    stampede(scene, proj.x, proj.y);
  } else if (proj.itemType === 'melon') {
    enemy.takeDamage(2, proj.x, proj.y, time);
    scene.events.emit('splash', { x: proj.x, y: proj.y });
  } else if (proj.itemType === 'barrel') {
    enemy.takeDamage(1, proj.x, proj.y, time);
    spawnStinkFog(scene, proj.x, proj.y);
    scene.events.emit('toast', 'Ein Fass voller Heringe... es riecht katastrophal.');
  }
  proj.destroy();
}

function stampede(scene, x, y) {
  scene.events.emit('toast', 'GACKGACKGACK -- Hühner-Stampede!');
  const flash = scene.add.circle(x, y, 6, 0xf5e6c8, 0.8);
  scene.tweens.add({
    targets: flash,
    radius: 55,
    alpha: 0,
    duration: 400,
    onComplete: () => flash.destroy(),
  });
  scene.enemies.getChildren().forEach((enemy) => {
    if (enemy.dead) return;
    const d = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
    if (d < 60) {
      const away = new Phaser.Math.Vector2(enemy.x - x, enemy.y - y).normalize();
      enemy.setVelocity(away.x * 200, away.y * 200);
    }
  });
}

function spawnStinkFog(scene, x, y) {
  const cloud = scene.add.image(x, y, 'stink_cloud').setAlpha(0.9).setDepth(5);
  scene.time.delayedCall(4000, () => cloud.destroy());
  scene.fogZones = scene.fogZones || [];
  const zone = { x, y, radius: 45, until: scene.time.now + 4000 };
  scene.fogZones.push(zone);
  scene.time.delayedCall(4000, () => {
    const i = scene.fogZones.indexOf(zone);
    if (i >= 0) scene.fogZones.splice(i, 1);
  });
}
