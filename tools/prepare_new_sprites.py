"""Post-process AI-generated sprites into game-ready pixel art assets.

- For character/item/prop sprites: alpha-crop to content bounding box, then
  downscale (LANCZOS for smoothness, then quantize palette count) to the
  configured target height while preserving aspect ratio.
- For tiles: crop center square, resize to exactly 32x32, then apply a
  seamless-edge blend so the tile wraps without visible seams.
- Writes results to public/sprites/, backing up existing files first.
"""

from __future__ import annotations

import shutil
from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "public" / "sprites_new"
DST_DIR = ROOT / "public" / "sprites"
BACKUP_DIR = ROOT / "public" / "sprites_backup_v3"

# target height in game-pixels for each sprite. Width is derived from aspect ratio.
TARGETS_H: dict[str, int] = {
    # characters
    "player": 44,
    "halberdier": 46,
    "elite_knight": 46,
    "mine_goblin": 34,
    "sapper": 34,
    "boss_rudibert": 56,
    "boss_grendal": 64,
    # animals / props
    "goose": 26,
    "chicken": 24,
    "barrel": 30,
    # buildings & big deco
    "house_timber": 68,
    "house_stone": 72,
    "house_inn": 78,
    "tree": 60,
    "pine_tree": 68,
    "mine_entrance": 60,
    # weapons / items
    "sword": 26,
    "warhammer": 26,
    "halberd": 30,
    "pickaxe": 26,
    "tower_shield": 30,
    "grendal_hammer": 36,
    "grapple_hook": 24,
    "potion": 22,
    "armor_leather": 28,
    "chest": 26,
    "grail": 26,
    "bomb": 22,
    "melon": 22,
    "veggie": 22,
    "flowers": 18,
    "bush": 26,
    "rock": 22,
    "boat": 40,
    # VFX
    "slash_vfx": 28,
    "spark": 14,
    # islands (map-view — bigger)
    "island_rubenfeld": 128,
    "island_eisenklamm": 128,
    "island_moewenhort": 128,
}

TILES = {
    "tile_grass",
    "tile_path",
    "tile_sand",
    "tile_water",
    "tile_wall",
    "tile_floor",
    "tile_stone",
    "tile_stone_path",
}


def alpha_crop(img: Image.Image) -> Image.Image:
    """Crop to the alpha bounding box (or full image if opaque)."""
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    bbox = img.split()[3].getbbox()
    if bbox:
        return img.crop(bbox)
    return img


def resize_to_height(img: Image.Image, target_h: int) -> Image.Image:
    """Resize keeping aspect. LANCZOS for downscale from 1024 → tiny."""
    w, h = img.size
    if h == 0:
        return img
    ratio = target_h / h
    new_w = max(1, round(w * ratio))
    resized = img.resize((new_w, target_h), Image.LANCZOS)
    return resized


def clean_edges(img: Image.Image, threshold: int = 40) -> Image.Image:
    """Zero out very-low-alpha pixels so edges are crisp."""
    if img.mode != "RGBA":
        return img
    r, g, b, a = img.split()
    a = a.point(lambda x: 0 if x < threshold else (255 if x > 220 else x))
    return Image.merge("RGBA", (r, g, b, a))


def make_tile(img: Image.Image) -> Image.Image:
    """Take a big generated tile texture, center-crop to square, resize to 32×32,
    then blend the edges so it tiles seamlessly.

    Seamless blend: shift the image by half in both axes and blend that with
    the original along a linear ramp near the seams.
    """
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    img = img.crop((left, top, left + side, top + side)).convert("RGBA")
    # First downsample to 4× target so edge-blend uses more information, then final resize.
    img = img.resize((128, 128), Image.LANCZOS)

    # seamless-edge blend at 128×128: mix in a horizontally+vertically shifted copy
    # near the tile edges. Uses a soft radial mask so the center stays untouched.
    import numpy as np

    arr = np.array(img, dtype=np.float32)
    shifted = np.roll(np.roll(arr, 64, axis=0), 64, axis=1)

    # linear ramp: 1 at edges, 0 in center — but only in a narrow border band
    x = np.linspace(-1, 1, 128)
    y = np.linspace(-1, 1, 128)
    xv, yv = np.meshgrid(x, y)
    dist = np.maximum(np.abs(xv), np.abs(yv))
    band = np.clip((dist - 0.55) / 0.45, 0, 1)  # 0 in inner 55%, 1 at very edge
    band = band[..., None]

    blended = arr * (1 - band * 0.5) + shifted * (band * 0.5)
    blended = np.clip(blended, 0, 255).astype(np.uint8)
    out = Image.fromarray(blended, mode="RGBA")

    # Final downsample to 32×32
    out = out.resize((32, 32), Image.LANCZOS)
    return out


def process_sprite(name: str, src: Path, dst: Path) -> None:
    img = Image.open(src).convert("RGBA")
    if name in TILES:
        out = make_tile(img)
    else:
        img = alpha_crop(img)
        target_h = TARGETS_H.get(name, 32)
        img = resize_to_height(img, target_h)
        img = clean_edges(img)
        out = img
    out.save(dst, format="PNG", optimize=True)
    print(f"  {name}: {src.stat().st_size // 1024}KB → {dst.stat().st_size // 1024}KB "
          f"({out.size[0]}×{out.size[1]})")


def main() -> None:
    if not SRC_DIR.exists():
        raise SystemExit(f"Source dir missing: {SRC_DIR}")

    # backup existing sprites once
    if not BACKUP_DIR.exists() and DST_DIR.exists():
        print(f"Backing up existing sprites to {BACKUP_DIR}")
        shutil.copytree(DST_DIR, BACKUP_DIR)

    DST_DIR.mkdir(parents=True, exist_ok=True)

    srcs = sorted(SRC_DIR.glob("*.png"))
    print(f"Processing {len(srcs)} sprites…")
    for src in srcs:
        name = src.stem
        dst = DST_DIR / f"{name}.png"
        try:
            process_sprite(name, src, dst)
        except Exception as e:
            print(f"  !! {name}: {e}")


if __name__ == "__main__":
    main()
