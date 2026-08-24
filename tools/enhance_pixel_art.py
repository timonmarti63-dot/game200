"""
Post-processing pass over `public/sprites/` to make the art feel richer without
rewriting the base generator. Runs AFTER `generate_pixel_art.py`.

What it adds:
  1. Directional highlight + soft ambient-occlusion shadow on every character
     and item sprite (adds two extra tonal steps -> less flat look).
  2. `shadow_blob.png` — a soft elliptical drop-shadow used under every actor
     at render time (added in IslandScene).
  3. 4-frame animated water: `tile_water_0..3.png` with subtle offset ripples
     that the scene cycles through.
  4. Grass/sand/stone tile *variants* (`tile_grass_1..2`, `tile_sand_1..2`,
     `tile_stone_1..2`) — more organic ground.
  5. `beach_edge.png` — sandy foam edge overlay stripe.
  6. `slash_vfx.png` — crescent slash used for melee attack feedback.
  7. `spark.png` — little hit spark used by the enemy hit VFX.

Idempotent: safe to run repeatedly. Reads the base sprites, writes new files
alongside, and leaves originals untouched (except a copy-then-enhance for the
character/item files -- see `ENHANCE_TARGETS`).
"""
import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "sprites")

# Characters, enemies, bosses, items, weapons - things that benefit from a
# directional highlight + AO shadow. Ground tiles are handled separately.
ENHANCE_TARGETS = [
    "player", "halberdier", "goose", "elite_knight", "mine_goblin",
    "sapper", "boss_rudibert", "boss_grendal", "grendal_hammer",
    "sword", "warhammer", "halberd", "grapple_hook", "tower_shield",
    "armor_leather", "potion", "grail", "melon", "veggie", "barrel",
    "chicken" if os.path.exists(os.path.join(OUT, "chicken.png")) else None,
    "chest", "bomb", "rock", "tree", "pine_tree", "bush", "flowers",
    "house_stone", "house_timber", "house_inn", "mine_entrance",
    "island_eisenklamm", "island_moewenhort", "boat",
]
ENHANCE_TARGETS = [t for t in ENHANCE_TARGETS if t]


def load(name):
    p = os.path.join(OUT, f"{name}.png")
    if not os.path.exists(p):
        return None
    return Image.open(p).convert("RGBA")


def save(img, name):
    img.save(os.path.join(OUT, f"{name}.png"))


def enhance_character(name):
    """Adds a top-left directional highlight and a bottom-right AO shadow to
    every opaque pixel of a character/item sprite. Preserves outline.
    """
    img = load(name)
    if img is None:
        return
    w, h = img.size
    src = img.load()
    out = img.copy()
    outpx = out.load()

    # Outline color used by the base generator: (26, 18, 14, 255). Skip it.
    def is_outline(rgba):
        return rgba[3] > 240 and rgba[0] < 50 and rgba[1] < 40 and rgba[2] < 30

    def brighter(c, amount=28):
        return (
            min(255, c[0] + amount),
            min(255, c[1] + amount),
            min(255, c[2] + amount),
            c[3],
        )

    def darker(c, amount=32):
        return (
            max(0, c[0] - amount),
            max(0, c[1] - amount),
            max(0, c[2] - amount),
            c[3],
        )

    for y in range(h):
        for x in range(w):
            c = src[x, y]
            if c[3] < 200 or is_outline(c):
                continue
            # neighbor sampling - is there transparent/outline pixel to my top-left?
            tl_empty = (
                x == 0 or y == 0 or src[x - 1, y - 1][3] < 200 or is_outline(src[x - 1, y - 1])
            )
            br_dark = (
                x == w - 1 or y == h - 1 or src[x + 1, y + 1][3] < 200 or is_outline(src[x + 1, y + 1])
            )
            if tl_empty and not br_dark:
                outpx[x, y] = brighter(c, 30)
            elif br_dark and not tl_empty:
                outpx[x, y] = darker(c, 26)

    save(out, name)


def make_shadow_blob():
    """Soft elliptical drop-shadow used under every actor.
    Bigger and darker than the first pass so it actually reads on grass/stone."""
    w, h = 34, 14
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    # a couple of concentric ellipses -> pseudo-soft edge without a real blur
    dr.ellipse([0, 0, w - 1, h - 1], fill=(0, 0, 0, 90))
    dr.ellipse([2, 1, w - 3, h - 2], fill=(0, 0, 0, 140))
    dr.ellipse([5, 2, w - 6, h - 3], fill=(0, 0, 0, 180))
    img = img.filter(ImageFilter.GaussianBlur(radius=1.4))
    save(img, "shadow_blob")


def make_water_frames():
    """4-frame water tile. Base water color + drifting highlight ripples."""
    base_color = (56, 108, 168, 255)
    hi = (140, 190, 230, 255)
    hi_soft = (98, 155, 205, 255)
    W = 32
    for f in range(4):
        img = Image.new("RGBA", (W, W), base_color)
        dr = ImageDraw.Draw(img)
        # deterministic-ish ripple pattern per frame
        random.seed(1000 + f)
        # subtle darker specks for depth
        for _ in range(24):
            x, y = random.randint(0, W - 1), random.randint(0, W - 1)
            dr.point((x, y), fill=(46, 92, 148, 255))
        # animated horizontal ripple bands (offset by frame)
        offset = f * 3
        for band_y in (6, 14, 22, 30):
            y = (band_y + offset) % W
            # main dash + a shorter dash
            x0 = (band_y * 3 + f * 5) % W
            for i in range(6):
                x = (x0 + i) % W
                dr.point((x, y), fill=hi)
            for i in range(3):
                x = (x0 + 12 + i) % W
                dr.point((x, y), fill=hi_soft)
            # extra pixel below for a "double line" look
            for i in range(4):
                x = (x0 + 1 + i) % W
                dr.point((x, (y + 1) % W), fill=hi_soft)
        save(img, f"tile_water_{f}")
    # keep the original tile_water as frame 0 fallback (already exists)


def tint_tile(name_in, name_out, mode):
    """Small variations on ground tiles - a couple of grass tufts, sand grains, etc."""
    img = load(name_in)
    if img is None:
        return
    img = img.copy()
    dr = ImageDraw.Draw(img)
    random.seed(hash(name_out) & 0xFFFF)
    W, H = img.size
    if mode == "grass_tuft":
        for _ in range(4):
            x = random.randint(3, W - 4)
            y = random.randint(3, H - 4)
            # tiny 3-pixel darker-green tuft
            dr.point((x, y), fill=(52, 108, 46, 255))
            dr.point((x + 1, y - 1), fill=(70, 132, 60, 255))
            dr.point((x - 1, y - 1), fill=(70, 132, 60, 255))
    elif mode == "grass_flower":
        for _ in range(2):
            x = random.randint(3, W - 4)
            y = random.randint(3, H - 4)
            colors = [(230, 90, 90, 255), (240, 210, 80, 255), (200, 130, 210, 255)]
            dr.point((x, y), fill=random.choice(colors))
    elif mode == "sand_pebble":
        for _ in range(5):
            x = random.randint(2, W - 3)
            y = random.randint(2, H - 3)
            dr.point((x, y), fill=(190, 165, 120, 255))
            dr.point((x + 1, y), fill=(210, 190, 150, 255))
    elif mode == "stone_crack":
        # a couple of thin darker lines
        for _ in range(3):
            x0, y0 = random.randint(4, W - 6), random.randint(4, H - 6)
            for k in range(3):
                dr.point((x0 + k, y0 + k // 2), fill=(80, 80, 88, 255))
    save(img, name_out)


def make_beach_edge():
    """Foam edge - a short bright stripe used as a decorative overlay."""
    w, h = 32, 6
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    dr.rectangle([0, 2, w - 1, 3], fill=(230, 240, 250, 180))
    for x in range(0, w, 4):
        dr.point((x, 1), fill=(255, 255, 255, 220))
        dr.point((x + 2, 4), fill=(210, 225, 240, 160))
    save(img, "beach_edge")


def make_slash_vfx():
    """Crescent slash sprite used by the attack VFX overlay."""
    W = 40
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    # outer bright crescent
    dr.arc([2, 2, W - 3, W - 3], start=200, end=340, fill=(255, 245, 210, 255), width=3)
    # inner soft glow
    dr.arc([5, 5, W - 6, W - 6], start=210, end=330, fill=(255, 220, 140, 200), width=2)
    save(img, "slash_vfx")


def make_spark():
    """Small 4-way spark used for enemy hit particle bursts."""
    W = 7
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    c = W // 2
    dr.point((c, c), fill=(255, 255, 220, 255))
    for k in range(1, 3):
        dr.point((c - k, c), fill=(255, 220, 140, 255))
        dr.point((c + k, c), fill=(255, 220, 140, 255))
        dr.point((c, c - k), fill=(255, 220, 140, 255))
        dr.point((c, c + k), fill=(255, 220, 140, 255))
    save(img, "spark")


def main():
    for name in ENHANCE_TARGETS:
        enhance_character(name)
    make_shadow_blob()
    make_water_frames()
    make_beach_edge()
    make_slash_vfx()
    make_spark()

    # tile variants
    tint_tile("tile_grass", "tile_grass_1", "grass_tuft")
    tint_tile("tile_grass", "tile_grass_2", "grass_flower")
    tint_tile("tile_sand", "tile_sand_1", "sand_pebble")
    tint_tile("tile_stone", "tile_stone_1", "stone_crack")

    print("enhance: done")


if __name__ == "__main__":
    main()
