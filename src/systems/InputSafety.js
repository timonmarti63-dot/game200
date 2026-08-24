// A held movement key never gets its keyup event if the browser tab/window
// loses focus while it's down (alt-tab, a devtools/OS dialog stealing
// focus, clicking outside the game, etc.) - the browser simply has nowhere
// to send that keyup to. Phaser's Key objects then believe the key is still
// held forever, so on refocus the character/boat keeps moving in that
// direction with no way to stop short of tapping the exact same key again.
// This is especially easy to trigger right after bumping into something,
// since that's often the moment a player's attention (and cursor) drifts
// elsewhere. Call this once per `keys` map and clean it up when the owner
// is destroyed/shut down.
export function resetKeysOnBlur(keysObject, cleanupEmitter) {
  const handleBlur = () => {
    Object.values(keysObject).forEach((key) => key?.reset?.());
  };
  window.addEventListener('blur', handleBlur);
  cleanupEmitter.once('destroy', () => window.removeEventListener('blur', handleBlur));
  cleanupEmitter.once('shutdown', () => window.removeEventListener('blur', handleBlur));
}
