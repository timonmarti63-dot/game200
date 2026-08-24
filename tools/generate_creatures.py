"""
Creature/trainer sprites for "Orden der Wildnis" - reuses the primitive
drawing helpers (canvas/rect/ellipse/polygon/outline/shading) from
generate_pixel_art.py so the new roster matches the established hand-drawn,
3-tone-shaded, auto-outlined pixel-art style. Output goes to
public/sprites/creatures/ and public/sprites/trainers/.
"""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generate_pixel_art import (  # noqa: E402
    canvas, d, outline, crop_pad, paste, px, rect, ellipse, polygon,
    shade_bottom, shade_right, highlight_dot, specular, ROOT, PREVIEW,
)

OUT_CREATURES = os.path.join(ROOT, "public", "sprites", "creatures")
OUT_TRAINERS = os.path.join(ROOT, "public", "sprites", "trainers")
os.makedirs(OUT_CREATURES, exist_ok=True)
os.makedirs(OUT_TRAINERS, exist_ok=True)


def save_to(img, out_dir, name, scale=2):
    img = crop_pad(outline(img), pad=1)
    if scale != 1:
        img = img.resize((img.width * scale, img.height * scale), Image.NEAREST)
    img.save(os.path.join(out_dir, f"{name}.png"))
    return img


def eyes(img, x0, y1, gap, color=(24, 18, 16, 255), w=2, h=2):
    rect(img, x0, y1, x0 + w - 1, y1 + h - 1, color)
    rect(img, x0 + gap, y1, x0 + gap + w - 1, y1 + h - 1, color)


# ---------------------------------------------------------------------------
# palettes per species (base, shadow, highlight)
# ---------------------------------------------------------------------------
WALD1 = ((92, 168, 64, 255), (60, 128, 44, 255), (140, 206, 100, 255))
WALD2 = ((66, 138, 50, 255), (42, 100, 34, 255), (108, 176, 78, 255))
BARK = ((120, 84, 48, 255), (84, 58, 32, 255), (156, 116, 70, 255))
FEUER1 = ((232, 108, 52, 255), (190, 70, 30, 255), (250, 156, 92, 255))
FEUER2 = ((214, 70, 44, 255), (168, 42, 26, 255), (240, 108, 66, 255))
STAHLC = ((176, 186, 202, 255), (120, 130, 150, 255), (222, 230, 240, 255))
FLUT1 = ((72, 150, 214, 255), (42, 106, 168, 255), (128, 202, 244, 255))
FLUT2 = ((54, 118, 186, 255), (32, 82, 140, 255), (108, 176, 224, 255))
STURMC = ((150, 178, 214, 255), (108, 136, 176, 255), (200, 222, 246, 255))
NORMAL1 = ((196, 158, 108, 255), (150, 112, 70, 255), (226, 194, 150, 255))
SCHATTEN1 = ((104, 82, 132, 255), (70, 52, 96, 255), (150, 124, 182, 255))
ERDE1 = ((176, 138, 78, 255), (132, 98, 52, 255), (212, 176, 118, 255))
GOLDC = ((226, 190, 96, 255), (180, 142, 56, 255), (250, 224, 150, 255))


def blob(img, cx, cy, rw, rh, pal, shade_frac=0.4):
    base, sh, hi = pal
    ellipse(img, cx - rw, cy - rh, cx + rw, cy + rh, base)
    shade_bottom(img, cx - rw, cy - rh, cx + rw, cy + rh, sh, frac=shade_frac)
    highlight_dot(img, cx - rw // 2, cy - rh // 2, hi, w=3, h=2)


# ---------------------------------------------------------------------------
# Wald starter line
# ---------------------------------------------------------------------------
def make_wurzling():
    img = canvas(28, 26)
    blob(img, 14, 17, 9, 8, WALD1)
    # leaf tuft
    polygon(img, [(8, 9), (14, 2), (11, 11)], WALD2[0])
    polygon(img, [(14, 9), (20, 2), (17, 11)], WALD2[0])
    eyes(img, 10, 16, 6)
    return img


def make_dornwicht():
    img = canvas(34, 32)
    blob(img, 17, 21, 12, 10, WALD1, shade_frac=0.45)
    for tx in (6, 12, 22, 28):
        polygon(img, [(tx, 14), (tx + 3, 4), (tx + 6, 14)], WALD2[0])
    eyes(img, 12, 19, 8, color=(214, 40, 30, 255))
    return img


def make_eichenwart():
    img = canvas(40, 44)
    # trunk body
    rect(img, 14, 16, 25, 38, BARK[0])
    shade_right(img, 14, 16, 25, 38, BARK[1])
    # canopy head
    ellipse(img, 8, 2, 31, 20, WALD1[0])
    shade_bottom(img, 8, 2, 31, 20, WALD1[1], frac=0.4)
    polygon(img, [(2, 26), (14, 20), (10, 34)], BARK[0])
    polygon(img, [(37, 26), (25, 20), (29, 34)], BARK[0])
    highlight_dot(img, 12, 6, WALD1[2], w=4, h=3)
    eyes(img, 15, 12, 8, color=GOLDC[0])
    return img


# ---------------------------------------------------------------------------
# Feuer starter line
# ---------------------------------------------------------------------------
def make_flackling():
    img = canvas(30, 24)
    ellipse(img, 4, 8, 22, 22, FEUER1[0])
    shade_bottom(img, 4, 8, 22, 22, FEUER1[1], frac=0.4)
    polygon(img, [(20, 12), (29, 6), (29, 18), (20, 16)], FEUER2[0])
    eyes(img, 9, 13, 6)
    highlight_dot(img, 8, 10, FEUER1[2], w=3, h=2)
    return img


def make_glutgeist():
    img = canvas(30, 34)
    polygon(img, [(15, 2), (26, 20), (21, 32), (9, 32), (4, 20)], FEUER1[0])
    shade_bottom(img, 4, 14, 26, 32, FEUER1[1], frac=0.5)
    polygon(img, [(12, 4), (15, 12), (18, 4)], FEUER2[2])
    eyes(img, 10, 18, 8, color=(255, 240, 200, 255))
    return img


def make_feuerdrake():
    img = canvas(44, 40)
    ellipse(img, 8, 10, 34, 34, FEUER1[0])
    shade_bottom(img, 8, 10, 34, 34, FEUER1[1], frac=0.42)
    polygon(img, [(4, 16), (0, 4), (14, 12)], STAHLC[0])
    polygon(img, [(38, 16), (44, 4), (30, 12)], STAHLC[0])
    rect(img, 14, 8, 20, 12, STAHLC[0])
    shade_right(img, 14, 8, 20, 12, STAHLC[1])
    eyes(img, 15, 18, 9, color=(255, 230, 120, 255))
    specular(img, 12, 14, 20, 10, width=2, color=(255, 255, 255, 180))
    return img


# ---------------------------------------------------------------------------
# Flut starter line
# ---------------------------------------------------------------------------
def make_tropfling():
    img = canvas(26, 28)
    polygon(img, [(13, 2), (23, 16), (18, 26), (8, 26), (3, 16)], FLUT1[0])
    shade_bottom(img, 3, 14, 23, 26, FLUT1[1], frac=0.45)
    highlight_dot(img, 9, 8, FLUT1[2], w=3, h=3)
    eyes(img, 9, 17, 6)
    return img


def make_flussgeist():
    img = canvas(32, 32)
    blob(img, 16, 19, 13, 11, FLUT1, shade_frac=0.45)
    polygon(img, [(3, 14), (10, 8), (8, 20)], FLUT2[0])
    polygon(img, [(29, 14), (22, 8), (24, 20)], FLUT2[0])
    eyes(img, 11, 16, 9)
    return img


def make_sturmwal():
    img = canvas(46, 34)
    ellipse(img, 4, 10, 38, 30, FLUT1[0])
    shade_bottom(img, 4, 10, 38, 30, FLUT1[1], frac=0.42)
    polygon(img, [(30, 6), (44, 0), (38, 14)], STURMC[0])
    polygon(img, [(4, 16), (0, 24), (10, 22)], FLUT2[0])
    eyes(img, 12, 16, 9, color=(230, 250, 255, 255))
    specular(img, 10, 12, 22, 8, width=2, color=(255, 255, 255, 170))
    return img


# ---------------------------------------------------------------------------
# Zone 1 wild: Wiesenmark
# ---------------------------------------------------------------------------
def make_wieselratz():
    img = canvas(30, 20)
    ellipse(img, 4, 6, 22, 18, NORMAL1[0])
    shade_bottom(img, 4, 6, 22, 18, NORMAL1[1], frac=0.4)
    polygon(img, [(20, 10), (30, 4), (26, 14)], NORMAL1[0])
    rect(img, 2, 3, 6, 6, NORMAL1[0])
    eyes(img, 9, 9, 6)
    return img


def make_mottling():
    img = canvas(30, 24)
    polygon(img, [(15, 2), (2, 12), (15, 14), (28, 12)], STURMC[0])
    shade_bottom(img, 2, 10, 28, 14, STURMC[1], frac=0.5)
    ellipse(img, 11, 10, 19, 22, SCHATTEN1[0])
    eyes(img, 13, 14, 4)
    return img


# ---------------------------------------------------------------------------
# Zone 2 wild: Nebelwald
# ---------------------------------------------------------------------------
def make_moosschleicher():
    img = canvas(34, 22)
    ellipse(img, 2, 6, 28, 22, WALD2[0])
    shade_bottom(img, 2, 6, 28, 22, WALD2[1], frac=0.42)
    for tx in (6, 14, 22):
        ellipse(img, tx, 2, tx + 6, 10, SCHATTEN1[0])
    eyes(img, 18, 12, 6, color=(220, 180, 255, 255))
    return img


def make_nebelhusch():
    img = canvas(26, 30)
    polygon(img, [(13, 2), (24, 16), (20, 28), (16, 22), (10, 28), (6, 20), (2, 16)], SCHATTEN1[0])
    shade_bottom(img, 2, 14, 24, 28, SCHATTEN1[1], frac=0.5)
    eyes(img, 9, 14, 7, color=(240, 220, 255, 255))
    return img


# ---------------------------------------------------------------------------
# Zone 3 wild: Eisenklamm
# ---------------------------------------------------------------------------
def make_klippenkrabbe():
    img = canvas(38, 24)
    ellipse(img, 8, 6, 30, 22, ERDE1[0])
    shade_bottom(img, 8, 6, 30, 22, ERDE1[1], frac=0.42)
    polygon(img, [(0, 10), (8, 8), (6, 18), (0, 18)], FLUT1[0])
    polygon(img, [(38, 10), (30, 8), (32, 18), (38, 18)], FLUT1[0])
    eyes(img, 14, 11, 8)
    return img


def make_ambosskaefer():
    img = canvas(32, 24)
    ellipse(img, 4, 6, 28, 22, STAHLC[0])
    shade_bottom(img, 4, 6, 28, 22, STAHLC[1], frac=0.42)
    rect(img, 14, 2, 18, 8, STAHLC[1])
    rect(img, 2, 12, 6, 20, STAHLC[1])
    rect(img, 26, 12, 30, 20, STAHLC[1])
    eyes(img, 11, 11, 8, color=(214, 60, 40, 255))
    specular(img, 8, 10, 18, 6, width=2, color=(255, 255, 255, 170))
    return img


# ---------------------------------------------------------------------------
# Zone-boss signature creatures
# ---------------------------------------------------------------------------
def make_bertrams_widder():
    img = canvas(36, 30)
    ellipse(img, 4, 10, 30, 30, NORMAL1[0])
    shade_bottom(img, 4, 10, 30, 30, NORMAL1[1], frac=0.42)
    polygon(img, [(4, 8), (0, 0), (10, 6)], ERDE1[0])
    polygon(img, [(32, 8), (36, 0), (26, 6)], ERDE1[0])
    eyes(img, 12, 15, 9, color=(60, 40, 20, 255))
    return img


def make_sylvanas_gefaehrte():
    img = canvas(36, 38)
    ellipse(img, 6, 12, 30, 36, SCHATTEN1[0])
    shade_bottom(img, 6, 12, 30, 36, SCHATTEN1[1], frac=0.42)
    polygon(img, [(8, 12), (2, 0), (12, 10)], WALD2[0])
    polygon(img, [(28, 12), (34, 0), (24, 10)], WALD2[0])
    eyes(img, 13, 18, 9, color=(150, 255, 190, 255))
    highlight_dot(img, 12, 16, SCHATTEN1[2], w=3, h=2)
    return img


def make_grendals_koloss():
    img = canvas(44, 46)
    rect(img, 8, 14, 36, 44, STAHLC[0])
    shade_right(img, 8, 14, 36, 44, STAHLC[1])
    ellipse(img, 10, 0, 34, 20, ERDE1[0])
    shade_bottom(img, 10, 0, 34, 20, ERDE1[1], frac=0.4)
    rect(img, 4, 20, 10, 34, STAHLC[0])
    rect(img, 34, 20, 40, 34, STAHLC[0])
    ellipse(img, 19, 24, 25, 30, GOLDC[0])
    eyes(img, 16, 8, 10, color=(255, 220, 120, 255))
    specular(img, 12, 18, 24, 14, width=2, color=(255, 255, 255, 170))
    return img


CREATURES = {
    "wurzling": make_wurzling, "dornwicht": make_dornwicht, "eichenwart": make_eichenwart,
    "flackling": make_flackling, "glutgeist": make_glutgeist, "feuerdrake": make_feuerdrake,
    "tropfling": make_tropfling, "flussgeist": make_flussgeist, "sturmwal": make_sturmwal,
    "wieselratz": make_wieselratz, "mottling": make_mottling,
    "moosschleicher": make_moosschleicher, "nebelhusch": make_nebelhusch,
    "klippenkrabbe": make_klippenkrabbe, "ambosskaefer": make_ambosskaefer,
    "bertrams_widder": make_bertrams_widder, "sylvanas_gefaehrte": make_sylvanas_gefaehrte,
    "grendals_koloss": make_grendals_koloss,
}


# ---------------------------------------------------------------------------
# Trainers (biped humanoid silhouette, recoloured per NPC)
# ---------------------------------------------------------------------------
def trainer_body(img, robe, robe_sh, skin=(255, 210, 160, 255)):
    ellipse(img, 8, 2, 22, 16, skin)  # head
    rect(img, 6, 14, 24, 40, robe[0])
    shade_right(img, 6, 14, 24, 40, robe[1])
    rect(img, 2, 16, 6, 32, robe[0])
    rect(img, 24, 16, 28, 32, robe[0])
    eyes(img, 12, 8, 6, color=(40, 28, 20, 255))


def make_trainer_bertram():
    img = canvas(30, 42)
    trainer_body(img, (NORMAL1[0], NORMAL1[1]), (ERDE1[0], ERDE1[1]))
    polygon(img, [(6, 4), (15, -4 + 4), (24, 4)], ERDE1[0])
    return img


def make_trainer_sylvana():
    img = canvas(30, 44)
    trainer_body(img, (SCHATTEN1[0], SCHATTEN1[1]), None, skin=(240, 220, 195, 255))
    polygon(img, [(4, 14), (15, -2), (26, 14)], WALD2[0])
    return img


TRAINERS = {
    "trainer_bertram": make_trainer_bertram,
    "trainer_sylvana": make_trainer_sylvana,
}


def main():
    for name, fn in CREATURES.items():
        save_to(fn(), OUT_CREATURES, name)
    for name, fn in TRAINERS.items():
        save_to(fn(), OUT_TRAINERS, name)
    # Grendal already exists as a fully-realised boss sprite from the old
    # roster - reuse it directly rather than redrawing a weaker version.
    import shutil
    old_grendal = os.path.join(ROOT, "public", "sprites", "boss_grendal.png")
    if os.path.exists(old_grendal):
        shutil.copyfile(old_grendal, os.path.join(OUT_TRAINERS, "trainer_grendal.png"))

    # contact sheet for review
    names = [f"creatures/{n}" for n in CREATURES] + [f"trainers/{n}" for n in TRAINERS] + ["trainers/trainer_grendal"]
    cell = 96
    cols = 6
    import math
    rows = math.ceil(len(names) / cols)
    sheet = Image.new("RGBA", (cols * cell, rows * cell), (40, 44, 52, 255))
    base_dir = os.path.join(ROOT, "public", "sprites")
    for i, n in enumerate(names):
        im = Image.open(os.path.join(base_dir, f"{n}.png")).convert("RGBA")
        scale = min((cell - 8) / im.width, (cell - 8) / im.height)
        im2 = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.NEAREST)
        x = (i % cols) * cell + (cell - im2.width) // 2
        y = (i // cols) * cell + (cell - im2.height) // 2
        sheet.alpha_composite(im2, (x, y))
    sheet.save(os.path.join(PREVIEW, "creatures_sheet.png"))
    print("done:", len(names), "sprites")


if __name__ == "__main__":
    main()
