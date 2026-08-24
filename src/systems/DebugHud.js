// ---------------------------------------------------------------------------
// Minimal always-on-screen debug readout + toast line, shared by every
// world-type scene while real UI doesn't exist yet. TODO(ui): replace with
// the real HUD/menu scene once section 5's combat UI and section 3's
// shop/clinic UI are built - every call site here only needs
// setStatus()/toast(), so swapping the implementation is contained to this
// one file.
// ---------------------------------------------------------------------------
export function createHud(scene) {
  const statusText = scene.add
    .text(6, 6, '', { fontFamily: 'Courier New', fontSize: '11px', color: '#cfe0ff' })
    .setScrollFactor(0)
    .setDepth(1000);

  const toastText = scene.add
    .text(scene.scale.width / 2, scene.scale.height - 20, '', {
      fontFamily: 'Courier New',
      fontSize: '12px',
      color: '#ffe9a8',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 3 },
    })
    .setOrigin(0.5, 1)
    .setScrollFactor(0)
    .setDepth(1000);

  let toastTimer = null;

  return {
    setStatus(text) {
      statusText.setText(text);
    },
    toast(text, ms = 1800) {
      toastText.setText(text);
      if (toastTimer) toastTimer.remove();
      toastTimer = scene.time.delayedCall(ms, () => toastText.setText(''));
    },
  };
}
