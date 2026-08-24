"""Process the newly generated HD-2D sprites for the big overhaul.

Reads from /home/user/workspace/*.png (the raw AI outputs), alpha-crops,
resizes to the target height, and writes to game200/public/sprites/.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image

WORKSPACE = Path("/home/user/workspace")
DST_DIR = WORKSPACE / "game200" / "public" / "sprites"

# (source basename without .png, dst basename, target height in game-pixels)
SPRITES = [
    ("dock_horizontal",   "dock",             28),
    ("elevation_wall",    "elevation_wall",   28),
    ("shopkeeper_potion", "shopkeeper_potion", 44),
    ("shopkeeper_smith",  "shopkeeper_smith",  44),
    ("coin_silver",       "coin_silver",       10),
    ("coin_gold",         "coin_gold",         10),
    ("tile_floor_wood",   "tile_floor_wood",   32),
    ("house_apothecary",  "house_apothecary",  82),
    ("house_smith",       "house_smith",       88),
    ("well",              "well",              46),
    ("arena_gatehouse",   "arena_gatehouse",   110),
    ("potion_medium",     "potion_medium",     24),
    ("potion_large",      "potion_large",      28),
    ("armor_iron",        "armor_iron",        28),
    ("armor_plate",       "armor_plate",       30),
    ("house_cottage_a",   "house_cottage_a",   68),
    ("house_cottage_b",   "house_cottage_b",   72),
]

# Tiles are treated differently: crop center square then resize to 32x32
TILES = {"tile_floor_wood"}


def alpha_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    """Crop to the tight bounding box of non-transparent pixels."""
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    bbox = img.getbbox()
    if bbox is None:
        return (0, 0, img.width, img.height)
    return bbox


def process_sprite(src: Path, dst: Path, target_h: int) -> None:
    img = Image.open(src).convert("RGBA")
    bbox = alpha_bbox(img)
    img = img.crop(bbox)
    scale = target_h / img.height
    target_w = max(1, round(img.width * scale))
    # Downsample with LANCZOS for smoothness, then quantize by re-opening.
    img = img.resize((target_w, target_h), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, optimize=True)
    print(f"  {dst.name}: {target_w}x{target_h}")


def process_tile(src: Path, dst: Path, target: int = 32) -> None:
    img = Image.open(src).convert("RGBA")
    # crop center square
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    img = img.crop((left, top, left + side, top + side))
    img = img.resize((target, target), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, optimize=True)
    print(f"  {dst.name}: {target}x{target} (tile)")


def main() -> None:
    print(f"Writing to {DST_DIR}")
    for src_stem, dst_stem, target_h in SPRITES:
        src = WORKSPACE / f"{src_stem}.png"
        if not src.exists():
            print(f"  SKIP {src_stem} (missing)")
            continue
        dst = DST_DIR / f"{dst_stem}.png"
        if dst_stem in TILES:
            process_tile(src, dst, 32)
        else:
            process_sprite(src, dst, target_h)


if __name__ == "__main__":
    main()
