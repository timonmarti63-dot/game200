"""
Hand-authored pixel art generator for "Krone & Kettenhemd".
Draws each sprite with PIL primitives at a small native resolution (crisp,
hard-edged pixels — no anti-aliasing), layers in simple 3-tone shading,
then runs an automatic dark outline pass. Output is cropped to content
with a 1px transparent margin and saved to public/sprites/.
"""
import math
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "sprites")
PREVIEW = os.path.join(ROOT, "tools", "_preview")
os.makedirs(OUT, exist_ok=True)
os.makedirs(PREVIEW, exist_ok=True)

OUTLINE = (26, 18, 14, 255)


def canvas(w, h):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def d(img):
    return ImageDraw.Draw(img)


def outline(img, color=OUTLINE):
    w, h = img.size
    src = img.load()
    out = img.copy()
    outpx = out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3] != 0:
                continue
            hit = False
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3] > 100:
                    hit = True
                    break
            if hit:
                outpx[x, y] = color
    return out


def crop_pad(img, pad=1):
    bbox = img.getbbox()
    if not bbox:
        return img
    x0, y0, x1, y1 = bbox
    x0 -= pad
    y0 -= pad
    x1 += pad
    y1 += pad
    w, h = img.size
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(w, x1), min(h, y1)
    return img.crop((x0, y0, x1, y1))


def paste(base, top, pos=(0, 0)):
    base.alpha_composite(top, pos)


def px(img, x, y, color):
    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((int(x), int(y)), color)


def rect(img, x0, y0, x1, y1, color):
    d(img).rectangle([x0, y0, x1, y1], fill=color)


def ellipse(img, x0, y0, x1, y1, color):
    d(img).ellipse([x0, y0, x1, y1], fill=color)


def polygon(img, pts, color):
    d(img).polygon(pts, fill=color)


def shade_bottom(img, x0, y0, x1, y1, color, frac=0.45):
    h = y1 - y0 + 1
    cut = y0 + int(h * (1 - frac))
    rect(img, x0, cut, x1, y1, color)


def shade_right(img, x0, y0, x1, y1, color, frac=0.4):
    w = x1 - x0 + 1
    cut = x0 + int(w * (1 - frac))
    rect(img, cut, y0, x1, y1, color)


def highlight_dot(img, x, y, color, w=2, h=2):
    rect(img, x, y, x + w - 1, y + h - 1, color)


def specular(img, x0, y0, x1, y1, width=2, color=(255, 255, 255, 210)):
    """A short bright diagonal streak across a rounded metal/armor surface -
    the "polished figurine" glossy-highlight look, layered on top of the
    flatter 3-tone shading."""
    d(img).line([(x0, y0), (x1, y1)], fill=color, width=width)


def save(img, name, scale=1):
    img = crop_pad(outline(img), pad=1)
    if scale != 1:
        img = img.resize((img.width * scale, img.height * scale), Image.NEAREST)
    img.save(os.path.join(OUT, f"{name}.png"))
    return img


# ---------------------------------------------------------------------------
# palette
# ---------------------------------------------------------------------------
# Bumped saturation/contrast across the board vs. the original muted-medieval
# set - richer, cleaner-reading colour blocks (closer to a Pokemon-overworld
# "storybook" register) while keeping the outline+3-tone shading recipe that
# lets it still read as detailed pixel art rather than flat cartoon fills.
SKIN = (255, 205, 148, 255)
SKIN_SH = (230, 164, 104, 255)
SKIN_HI = (255, 226, 190, 255)
TUNIC = (214, 48, 42, 255)
TUNIC_SH = (156, 24, 26, 255)
TUNIC_HI = (240, 92, 68, 255)
BELT = (120, 72, 34, 255)
STEEL = (206, 216, 232, 255)
STEEL_SH = (140, 152, 176, 255)
STEEL_HI = (244, 248, 255, 255)
ARMOR = (150, 162, 184, 255)
ARMOR_SH = (94, 106, 130, 255)
ARMOR_HI = (196, 206, 224, 255)
WOOD = (156, 98, 44, 255)
WOOD_SH = (108, 64, 26, 255)
WOOD_HI = (198, 138, 72, 255)
LEATHER = (104, 64, 32, 255)

# Eisenklamm (mine/fortress island) palette
IRON = (94, 102, 118, 255)
IRON_SH = (58, 64, 78, 255)
IRON_HI = (150, 160, 182, 255)
IRON_DARK = (52, 56, 68, 255)
IRON_DARK_SH = (32, 35, 44, 255)
GOBLIN_SKIN = (132, 172, 88, 255)
GOBLIN_SKIN_SH = (90, 124, 56, 255)
FUSE_BLACK = (34, 32, 30, 255)
BRASS = (206, 168, 66, 255)
BRASS_SH = (150, 116, 40, 255)

# Shared ground/water/decoration palette - defined up top so both the tiles
# and the sailing-map island art (further down) draw from one source.
GRASS = (86, 184, 68, 255)
GRASS_SH = (58, 148, 48, 255)
GRASS_HI = (128, 214, 96, 255)
SAND = (244, 218, 148, 255)
SAND_SH = (216, 186, 120, 255)
SAND_HI = (255, 238, 190, 255)
WATER = (46, 138, 214, 255)
WATER_SH = (28, 96, 168, 255)
WATER_HI = (120, 200, 244, 255)
FOAM = (232, 248, 255, 255)


# ---------------------------------------------------------------------------
# PLAYER
# ---------------------------------------------------------------------------
def make_player():
    img = canvas(32, 39)
    cx = 16
    # shadow
    ellipse(img, cx - 9, 33, cx + 9, 37, (10, 10, 10, 80))
    # flowing cape (behind body, wider + longer than before)
    polygon(img, [(cx - 9, 12), (cx - 14, 31), (cx - 8, 34), (cx - 4, 27), (cx - 6, 14)], (150, 30, 26, 255))
    polygon(img, [(cx - 9, 12), (cx - 14, 31), (cx - 10, 32), (cx - 7, 14)], TUNIC_SH)
    d(img).line([(cx - 11, 18), (cx - 9, 26)], fill=TUNIC_HI, width=1)  # cape fold highlight
    # legs / boots
    rect(img, cx - 6, 25, cx - 2, 33, LEATHER)
    rect(img, cx + 2, 25, cx + 6, 33, LEATHER)
    rect(img, cx - 6, 30, cx - 2, 33, (58, 38, 20, 255))
    rect(img, cx + 2, 30, cx + 6, 33, (58, 38, 20, 255))
    rect(img, cx - 6, 32, cx - 2, 33, (30, 20, 12, 255))
    rect(img, cx + 2, 32, cx + 6, 33, (30, 20, 12, 255))
    # tunic body
    rect(img, cx - 8, 14, cx + 8, 27, TUNIC)
    shade_right(img, cx - 8, 14, cx + 8, 27, TUNIC_SH, 0.35)
    rect(img, cx - 8, 14, cx + 8, 16, TUNIC_HI)
    d(img).line([(cx - 5, 17), (cx - 5, 24)], fill=TUNIC_SH, width=1)  # fabric fold
    d(img).line([(cx + 5, 17), (cx + 5, 24)], fill=TUNIC_SH, width=1)
    # small crest/emblem on the chest
    polygon(img, [(cx - 2, 18), (cx + 2, 18), (cx + 2, 22), (cx, 24), (cx - 2, 22)], (232, 196, 70, 255))
    rect(img, cx - 1, 19, cx, 21, TUNIC)
    # belt
    rect(img, cx - 8, 22, cx + 8, 24, BELT)
    rect(img, cx - 2, 22, cx + 1, 24, (216, 184, 70, 255))
    # arms
    rect(img, cx - 12, 15, cx - 9, 23, SKIN)
    rect(img, cx + 9, 15, cx + 12, 23, SKIN)
    rect(img, cx - 12, 19, cx - 9, 23, SKIN_SH)
    rect(img, cx + 9, 19, cx + 12, 23, SKIN_SH)
    # neck + head (bumped up ~15% for a friendlier, slightly chibi read)
    rect(img, cx - 3, 9, cx + 3, 13, SKIN)
    ellipse(img, cx - 9, -3, cx + 9, 14, SKIN)
    shade_bottom(img, cx - 9, -3, cx + 9, 14, SKIN_SH, 0.26)
    highlight_dot(img, cx - 6, 0, SKIN_HI, 3, 2)
    # helmet with a small plume
    polygon(img, [(cx - 1, -11), (cx + 3, -13), (cx + 2, -7), (cx - 1, -7)], TUNIC)
    polygon(img, [(cx - 10, 2), (cx + 10, 2), (cx + 8, -5), (cx - 8, -5)], STEEL)
    rect(img, cx - 10, 1, cx + 10, 6, STEEL)
    rect(img, cx - 10, 5, cx + 10, 7, STEEL_SH)
    rect(img, cx - 10, -5, cx + 10, -3, STEEL_HI)
    highlight_dot(img, cx - 6, -3, (255, 255, 255, 200), 3, 1)  # helmet shine
    rect(img, cx - 1, 2, cx + 1, 10, STEEL_SH)  # nose guard
    ellipse(img, cx - 11, 3, cx - 8, 9, ARMOR)  # ear guards
    ellipse(img, cx + 8, 3, cx + 11, 9, ARMOR)
    # eyes + brows + blush
    rect(img, cx - 5, 4, cx - 3, 5, (60, 40, 26, 255))
    rect(img, cx + 3, 4, cx + 5, 5, (60, 40, 26, 255))
    rect(img, cx - 5, 6, cx - 3, 7, (40, 26, 18, 255))
    rect(img, cx + 3, 6, cx + 5, 7, (40, 26, 18, 255))
    highlight_dot(img, cx - 4, 6, (255, 255, 255, 200), 1, 1)
    highlight_dot(img, cx + 4, 6, (255, 255, 255, 200), 1, 1)
    highlight_dot(img, cx - 7, 9, (232, 140, 120, 150), 2, 1)
    highlight_dot(img, cx + 5, 9, (232, 140, 120, 150), 2, 1)
    return img


def make_sword():
    img = canvas(10, 26)
    rect(img, 3, 0, 6, 16, STEEL)
    rect(img, 5, 0, 6, 16, STEEL_SH)
    polygon(img, [(4, 0), (4.5, -2), (5, 0)], STEEL_HI)
    rect(img, 0, 14, 9, 17, STEEL_SH)
    rect(img, 3, 17, 6, 23, LEATHER)
    rect(img, 3, 21, 6, 23, WOOD_SH)
    ellipse(img, 2, 22, 7, 25, (198, 170, 70, 255))
    return img


# ---------------------------------------------------------------------------
# HALBERDIER
# ---------------------------------------------------------------------------
def make_halberdier():
    img = canvas(30, 36)
    cx = 15
    ellipse(img, cx - 9, 31, cx + 9, 35, (10, 10, 10, 80))
    # legs
    rect(img, cx - 7, 24, cx - 2, 31, ARMOR_SH)
    rect(img, cx + 2, 24, cx + 7, 31, ARMOR_SH)
    rect(img, cx - 7, 28, cx - 2, 31, (30, 30, 32, 255))
    rect(img, cx + 2, 28, cx + 7, 31, (30, 30, 32, 255))
    # torso armor
    rect(img, cx - 9, 13, cx + 9, 25, ARMOR)
    shade_right(img, cx - 9, 13, cx + 9, 25, ARMOR_SH, 0.35)
    rect(img, cx - 9, 13, cx + 9, 15, ARMOR_HI)
    specular(img, cx - 4, 15, cx - 2, 22, width=2)
    # rivets
    for rx in (cx - 6, cx - 1, cx + 4):
        highlight_dot(img, rx, 19, ARMOR_SH, 1, 1)
    # belt
    rect(img, cx - 9, 21, cx + 9, 23, (60, 46, 30, 255))
    # pauldrons
    ellipse(img, cx - 13, 11, cx - 6, 18, ARMOR)
    ellipse(img, cx + 6, 11, cx + 13, 18, ARMOR)
    shade_bottom(img, cx - 13, 11, cx - 6, 18, ARMOR_SH, 0.4)
    shade_bottom(img, cx + 6, 11, cx + 13, 18, ARMOR_SH, 0.4)
    highlight_dot(img, cx - 11, 12, (255, 255, 255, 170), 2, 1)
    highlight_dot(img, cx + 8, 12, (255, 255, 255, 170), 2, 1)
    # arms/gauntlets
    rect(img, cx - 12, 15, cx - 9, 21, SKIN_SH)
    rect(img, cx + 9, 15, cx + 12, 21, SKIN_SH)
    # neck + helm
    rect(img, cx - 3, 9, cx + 3, 13, ARMOR_SH)
    ellipse(img, cx - 8, 0, cx + 8, 13, STEEL)
    shade_bottom(img, cx - 8, 0, cx + 8, 13, STEEL_SH, 0.3)
    rect(img, cx - 8, -2, cx + 8, 2, STEEL_HI)
    highlight_dot(img, cx - 5, -1, (255, 255, 255, 200), 3, 1)
    rect(img, cx - 8, 5, cx + 8, 7, (35, 35, 38, 255))  # visor slit
    highlight_dot(img, cx - 5, 5, (210, 60, 40, 255), 2, 2)
    highlight_dot(img, cx + 3, 5, (210, 60, 40, 255), 2, 2)
    rect(img, cx - 2, -5, cx + 2, -1, STEEL_SH)  # spike
    return img


def make_halberd():
    img = canvas(14, 40)
    rect(img, 6, 5, 8, 34, WOOD)
    rect(img, 7, 5, 8, 34, WOOD_SH)
    polygon(img, [(0, 8), (13, 0), (13, 10), (7, 6)], STEEL)
    polygon(img, [(13, 0), (13, 10), (10, 8)], STEEL_SH)
    rect(img, 5, 0, 9, 6, STEEL_HI)
    rect(img, 6, 33, 8, 37, LEATHER)
    return img


# ---------------------------------------------------------------------------
# EISENKLAMM ROSTER: Elite-Ritter, Minen-Kobold, Sprengfallen-Ingenieur
# ---------------------------------------------------------------------------
def make_elite_knight():
    img = canvas(34, 40)
    cx = 17
    ellipse(img, cx - 10, 35, cx + 10, 39, (10, 10, 10, 90))
    # legs - broad, armored
    rect(img, cx - 8, 27, cx - 2, 35, IRON_SH)
    rect(img, cx + 2, 27, cx + 8, 35, IRON_SH)
    rect(img, cx - 8, 31, cx - 2, 35, IRON_DARK)
    rect(img, cx + 2, 31, cx + 8, 35, IRON_DARK)
    # torso armor - big and blocky
    rect(img, cx - 11, 14, cx + 11, 28, IRON)
    shade_right(img, cx - 11, 14, cx + 11, 28, IRON_SH, 0.35)
    rect(img, cx - 11, 14, cx + 11, 16, IRON_HI)
    specular(img, cx + 2, 16, cx + 4, 23, width=2)
    for rx in (cx - 7, cx - 1, cx + 5):
        highlight_dot(img, rx, 21, IRON_SH, 1, 1)
    rect(img, cx - 11, 24, cx + 11, 26, IRON_DARK)
    # tower shield held in front
    rect(img, cx - 16, 14, cx - 11, 30, IRON_DARK)
    shade_right(img, cx - 16, 14, cx - 11, 30, IRON_DARK_SH, 0.4)
    rect(img, cx - 16, 14, cx - 11, 16, IRON_HI)
    highlight_dot(img, cx - 15, 18, (255, 255, 255, 160), 2, 4)
    polygon(img, [(cx - 14, 8), (cx - 13, 12), (cx - 15, 12)], BRASS)
    # pauldrons - oversized, spiked
    ellipse(img, cx - 16, 10, cx - 6, 18, IRON)
    ellipse(img, cx + 6, 10, cx + 16, 18, IRON)
    shade_bottom(img, cx - 16, 10, cx - 6, 18, IRON_SH, 0.4)
    shade_bottom(img, cx + 6, 10, cx + 16, 18, IRON_SH, 0.4)
    polygon(img, [(cx + 10, 9), (cx + 13, 4), (cx + 15, 10)], IRON_SH)
    # arm (sword side)
    rect(img, cx + 10, 16, cx + 14, 23, IRON_SH)
    # neck + great helm
    rect(img, cx - 3, 10, cx + 3, 14, IRON_DARK)
    ellipse(img, cx - 9, 0, cx + 9, 14, IRON_DARK)
    shade_bottom(img, cx - 9, 0, cx + 9, 14, IRON_DARK_SH, 0.3)
    rect(img, cx - 9, -3, cx + 9, 1, IRON_HI)
    rect(img, cx - 9, 5, cx + 9, 8, (18, 18, 20, 255))  # visor slit
    highlight_dot(img, cx - 5, 6, (210, 60, 40, 255), 2, 2)
    highlight_dot(img, cx + 3, 6, (210, 60, 40, 255), 2, 2)
    rect(img, cx - 2, -6, cx + 2, -2, BRASS)  # crest spike
    return img


def make_tower_shield():
    img = canvas(14, 22)
    rect(img, 1, 1, 12, 20, IRON_DARK)
    shade_right(img, 1, 1, 12, 20, IRON_DARK_SH, 0.4)
    rect(img, 1, 1, 12, 4, IRON_HI)
    d(img).line([(6, 1), (6, 20)], fill=IRON, width=1)
    highlight_dot(img, 5, 9, BRASS, 3, 3)
    return img


def make_pickaxe():
    img = canvas(30, 34)
    rect(img, 13, 4, 16, 30, WOOD)
    rect(img, 14, 4, 16, 30, WOOD_SH)
    polygon(img, [(0, 6), (14, 2), (16, 8), (4, 14)], IRON)
    polygon(img, [(30, 6), (16, 2), (14, 8), (26, 14)], IRON)
    shade_bottom(img, 0, 2, 30, 14, IRON_SH, 0.35)
    rect(img, 12, 28, 17, 33, LEATHER)
    return img


def make_mine_goblin():
    img = canvas(22, 24)
    cx = 11
    ellipse(img, cx - 7, 20, cx + 7, 24, (10, 10, 10, 80))
    # hunched legs
    rect(img, cx - 5, 16, cx - 1, 21, GOBLIN_SKIN_SH)
    rect(img, cx + 1, 16, cx + 5, 21, GOBLIN_SKIN_SH)
    # body - hunched, small
    ellipse(img, cx - 8, 6, cx + 8, 19, GOBLIN_SKIN)
    shade_bottom(img, cx - 8, 6, cx + 8, 19, GOBLIN_SKIN_SH, 0.4)
    rect(img, cx - 6, 12, cx + 6, 16, (74, 58, 34, 255))  # rag vest
    # arms
    rect(img, cx - 10, 9, cx - 7, 15, GOBLIN_SKIN_SH)
    rect(img, cx + 7, 9, cx + 10, 15, GOBLIN_SKIN_SH)
    # head + mining helmet
    ellipse(img, cx - 6, -2, cx + 6, 9, GOBLIN_SKIN)
    shade_bottom(img, cx - 6, -2, cx + 6, 9, GOBLIN_SKIN_SH, 0.3)
    ellipse(img, cx - 7, -7, cx + 7, 1, (94, 88, 40, 255))
    shade_right(img, cx - 7, -7, cx + 7, 1, (66, 62, 28, 255), 0.4)
    ellipse(img, cx - 2, -6, cx + 2, -3, (250, 226, 90, 255))  # headlamp
    # big ears + angry eyes + tusk
    polygon(img, [(cx - 6, 1), (cx - 10, -2), (cx - 6, 4)], GOBLIN_SKIN)
    polygon(img, [(cx + 6, 1), (cx + 10, -2), (cx + 6, 4)], GOBLIN_SKIN)
    rect(img, cx - 4, 2, cx - 2, 3, (30, 20, 10, 255))
    rect(img, cx + 2, 2, cx + 4, 3, (30, 20, 10, 255))
    rect(img, cx - 1, 5, cx + 1, 7, (240, 236, 224, 255))
    return img


def make_sapper():
    img = canvas(28, 34)
    cx = 14
    ellipse(img, cx - 9, 29, cx + 9, 33, (10, 10, 10, 80))
    # legs
    rect(img, cx - 6, 22, cx - 2, 29, (74, 58, 34, 255))
    rect(img, cx + 2, 22, cx + 6, 29, (74, 58, 34, 255))
    # tunic
    rect(img, cx - 8, 11, cx + 8, 23, LEATHER)
    shade_right(img, cx - 8, 11, cx + 8, 23, (66, 42, 20, 255), 0.35)
    rect(img, cx - 8, 11, cx + 8, 13, (118, 78, 40, 255))
    # bomb satchel
    ellipse(img, cx - 2, 15, cx + 10, 25, (74, 58, 34, 255))
    ellipse(img, cx + 1, 17, cx + 7, 23, (40, 40, 44, 255))
    highlight_dot(img, cx + 3, 19, (232, 100, 60, 200), 2, 2)
    # arms
    rect(img, cx - 11, 13, cx - 8, 19, SKIN)
    rect(img, cx + 8, 13, cx + 11, 19, SKIN)
    # neck + head + leather cap w/ goggles
    rect(img, cx - 3, 8, cx + 3, 11, SKIN)
    ellipse(img, cx - 7, -2, cx + 7, 10, SKIN)
    shade_bottom(img, cx - 7, -2, cx + 7, 10, SKIN_SH, 0.28)
    ellipse(img, cx - 8, -6, cx + 8, 3, (78, 58, 32, 255))
    ellipse(img, cx - 6, 1, cx - 1, 6, (196, 202, 212, 255))
    ellipse(img, cx + 1, 1, cx + 6, 6, (196, 202, 212, 255))
    highlight_dot(img, cx - 4, 3, (60, 120, 160, 220), 2, 2)
    highlight_dot(img, cx + 3, 3, (60, 120, 160, 220), 2, 2)
    d(img).line([(cx - 1, 3), (cx + 1, 3)], fill=(60, 44, 24, 255), width=1)
    return img


def make_bomb():
    img = canvas(18, 22)
    cx = 9
    ellipse(img, cx - 7, 8, cx + 7, 21, (34, 34, 38, 255))
    shade_bottom(img, cx - 7, 8, cx + 7, 21, (18, 18, 20, 255), 0.4)
    highlight_dot(img, cx - 3, 12, (90, 90, 96, 220), 2, 2)
    d(img).line([(cx, 8), (cx + 3, 2), (cx + 1, -1)], fill=FUSE_BLACK, width=1)
    highlight_dot(img, cx + 1, -2, (250, 190, 60, 255), 2, 2)
    return img


# ---------------------------------------------------------------------------
# GOOSE / CHICKEN
# ---------------------------------------------------------------------------
def make_fowl(body_color, body_sh, comb=False, scale=1.0):
    s = scale
    img = canvas(int(30 * s) + 4, int(26 * s) + 4)
    cx = int(14 * s)
    cy = int(16 * s)
    ellipse(img, cx - 12 * s, cy - 8 * s, cx + 8 * s, cy + 8 * s, body_color)
    shade_bottom(img, cx - 12 * s, cy - 8 * s, cx + 8 * s, cy + 8 * s, body_sh, 0.35)
    # wing
    ellipse(img, cx - 8 * s, cy - 3 * s, cx + 1 * s, cy + 6 * s, body_sh)
    # neck/head
    ellipse(img, cx + 2 * s, cy - 14 * s, cx + 14 * s, cy - 2 * s, body_color)
    ellipse(img, cx + 6 * s, cy - 16 * s, cx + 16 * s, cy - 6 * s, (255, 255, 255, 255) if body_color[0] > 200 else body_color)
    # comb
    if comb:
        polygon(img, [(cx + 9 * s, cy - 17 * s), (cx + 11 * s, cy - 20 * s), (cx + 12 * s, cy - 16 * s)], (196, 40, 30, 255))
    # beak
    polygon(img, [(cx + 15 * s, cy - 11 * s), (cx + 20 * s, cy - 9 * s), (cx + 15 * s, cy - 7 * s)], (232, 140, 40, 255))
    # eye + eyebrow (angry)
    highlight_dot(img, cx + 11 * s, cy - 12 * s, (30, 20, 15, 255), 2, 2)
    rect(img, cx + 9 * s, cy - 15 * s, cx + 13 * s, cy - 14 * s, (30, 20, 15, 255))
    # feet
    rect(img, cx - 5 * s, cy + 7 * s, cx - 2 * s, cy + 10 * s, (232, 140, 40, 255))
    rect(img, cx + 2 * s, cy + 7 * s, cx + 5 * s, cy + 10 * s, (232, 140, 40, 255))
    return img


# ---------------------------------------------------------------------------
# ITEMS
# ---------------------------------------------------------------------------
def make_barrel():
    img = canvas(24, 28)
    rect(img, 3, 4, 20, 23, WOOD)
    shade_right(img, 3, 4, 20, 23, WOOD_SH, 0.35)
    for gx in (6, 9, 12, 15, 18):
        rect(img, gx, 4, gx, 23, WOOD_SH)
    for gy in (7, 12, 17):
        rect(img, 3, gy, 20, gy + 1, (74, 46, 20, 255))
    ellipse(img, 3, 2, 20, 7, WOOD_HI)
    ellipse(img, 3, 20, 20, 25, WOOD_SH)
    return img


def make_melon():
    img = canvas(22, 22)
    ellipse(img, 1, 1, 20, 20, (64, 150, 68, 255))
    shade_bottom(img, 1, 1, 20, 20, (40, 106, 46, 255), 0.4)
    for dx in (-6, -1, 4, 9):
        d(img).line([(11 + dx, 1), (11 + dx - 2, 20)], fill=(28, 88, 38, 255), width=2)
    mask = canvas(22, 22)
    ellipse(mask, 1, 1, 20, 20, (255, 255, 255, 255))
    out = canvas(22, 22)
    for y in range(22):
        for x in range(22):
            if mask.getpixel((x, y))[3] > 0:
                out.putpixel((x, y), img.getpixel((x, y)))
    highlight_dot(out, 5, 5, (160, 226, 140, 210), 3, 3)
    return out


def make_grail():
    img = canvas(20, 28)
    cx = 10
    rect(img, cx - 2, 14, cx + 2, 21, (196, 160, 40, 255))
    ellipse(img, cx - 6, 20, cx + 6, 25, (162, 128, 24, 255))
    ellipse(img, cx - 6, 22, cx + 6, 25, (140, 108, 18, 255))
    polygon(img, [(cx - 8, 3), (cx + 8, 3), (cx + 6, 15), (cx - 6, 15)], (232, 190, 60, 255))
    shade_right(img, cx - 8, 3, cx + 8, 15, (196, 150, 30, 255), 0.4)
    ellipse(img, cx - 8, 0, cx + 8, 6, (244, 210, 90, 255))
    ellipse(img, cx - 8, 0, cx + 8, 6, (0, 0, 0, 0))
    d(img).ellipse([cx - 8, 0, cx + 8, 6], outline=(196, 150, 30, 255))
    highlight_dot(img, cx - 5, 5, (255, 255, 255, 180), 2, 3)
    # coffee steam wisp
    d(img).line([(cx - 3, -1), (cx - 5, -4), (cx - 3, -7)], fill=(220, 220, 220, 160), width=1)
    d(img).line([(cx + 3, -1), (cx + 1, -4), (cx + 3, -7)], fill=(220, 220, 220, 160), width=1)
    return img


def make_potion():
    img = canvas(16, 20)
    cx = 8
    rect(img, cx - 2, 1, cx + 2, 5, (150, 160, 170, 255))
    rect(img, cx - 3, 4, cx + 3, 6, (110, 60, 30, 255))
    polygon(img, [(cx - 5, 7), (cx + 5, 7), (cx + 6, 12), (cx + 4, 18), (cx - 4, 18), (cx - 6, 12)], (232, 240, 246, 220))
    polygon(img, [(cx - 4, 9), (cx + 4, 9), (cx + 5, 12), (cx + 3, 17), (cx - 3, 17), (cx - 5, 12)], (214, 40, 56, 255))
    shade_bottom(img, cx - 5, 9, cx + 5, 17, (168, 24, 40, 255), 0.4)
    highlight_dot(img, cx - 3, 10, (255, 170, 180, 200), 2, 3)
    highlight_dot(img, cx - 2, 3, (255, 255, 255, 160), 1, 2)
    return img


def make_warhammer():
    img = canvas(16, 40)
    rect(img, 6, 8, 9, 34, WOOD)
    rect(img, 7, 8, 9, 34, WOOD_SH)
    rect(img, 1, 0, 14, 10, (108, 112, 120, 255))
    shade_bottom(img, 1, 0, 14, 10, (76, 80, 88, 255), 0.4)
    rect(img, 1, 0, 14, 2, (150, 154, 162, 255))
    for hx in (3, 7, 11):
        highlight_dot(img, hx, 4, (76, 80, 88, 255), 2, 2)
    rect(img, 6, 32, 9, 37, LEATHER)
    return img


def make_armor_leather():
    img = canvas(26, 26)
    cx = 13
    polygon(img, [(cx - 10, 4), (cx + 10, 4), (cx + 8, 22), (cx, 26), (cx - 8, 22)], LEATHER)
    shade_right(img, cx - 10, 4, cx + 10, 22, (66, 42, 20, 255), 0.35)
    rect(img, cx - 10, 4, cx + 10, 8, (118, 78, 40, 255))
    d(img).line([(cx - 6, 9), (cx - 6, 21)], fill=(66, 42, 20, 255), width=1)
    d(img).line([(cx + 6, 9), (cx + 6, 21)], fill=(66, 42, 20, 255), width=1)
    for ly in (10, 14, 18):
        highlight_dot(img, cx - 1, ly, (150, 108, 60, 255), 2, 1)
    polygon(img, [(cx - 13, 5), (cx - 9, 3), (cx - 9, 13), (cx - 13, 15)], LEATHER)
    polygon(img, [(cx + 13, 5), (cx + 9, 3), (cx + 9, 13), (cx + 13, 15)], LEATHER)
    return img


def make_grapple_hook():
    img = canvas(16, 30)
    cx = 8
    rect(img, cx - 1, 8, cx + 1, 24, WOOD)
    rect(img, cx, 8, cx + 1, 24, WOOD_SH)
    ellipse(img, cx - 4, 20, cx + 4, 27, (198, 170, 70, 255))
    shade_bottom(img, cx - 4, 20, cx + 4, 27, (150, 122, 30, 255), 0.4)
    ellipse(img, cx - 5, 0, cx + 5, 8, (232, 196, 70, 255))
    shade_bottom(img, cx - 5, 0, cx + 5, 8, (176, 144, 40, 255), 0.4)
    polygon(img, [(cx - 5, 4), (cx - 9, 10), (cx - 3, 9)], (196, 202, 212, 255))
    polygon(img, [(cx + 5, 4), (cx + 9, 10), (cx + 3, 9)], (196, 202, 212, 255))
    highlight_dot(img, cx - 2, 2, (255, 255, 255, 180), 2, 1)
    return img


def make_chest():
    img = canvas(32, 28)
    ellipse(img, 3, 23, 29, 27, (10, 10, 10, 70))
    rect(img, 3, 12, 29, 24, WOOD)
    shade_right(img, 3, 12, 29, 24, WOOD_SH, 0.35)
    for gx in (7, 25):
        rect(img, gx, 12, gx + 2, 24, (74, 46, 20, 255))
    polygon(img, [(2, 12), (30, 12), (28, 4), (4, 4)], WOOD_HI)
    shade_right(img, 2, 4, 30, 12, WOOD_SH, 0.4)
    rect(img, 2, 10, 30, 13, (74, 46, 20, 255))
    rect(img, 13, 10, 19, 17, (216, 176, 60, 255))
    rect(img, 14, 12, 18, 15, (150, 112, 24, 255))
    return img


# ---------------------------------------------------------------------------
# WORLD DECORATION (trees, bushes, rocks, flowers)
# ---------------------------------------------------------------------------
LEAF = (68, 148, 58, 255)
LEAF_SH = (44, 112, 40, 255)
LEAF_HI = (110, 192, 88, 255)


def make_tree():
    img = canvas(42, 52)
    cx = 21
    ellipse(img, cx - 9, 42, cx + 9, 48, (10, 10, 10, 70))
    rect(img, cx - 4, 30, cx + 4, 46, (94, 60, 30, 255))
    shade_right(img, cx - 4, 30, cx + 4, 46, (66, 42, 20, 255), 0.4)
    for lx, ly, lw, lh, c in (
        (cx - 19, 6, 26, 24, LEAF),
        (cx - 4, -2, 26, 26, LEAF),
        (cx - 12, 16, 28, 22, LEAF),
    ):
        ellipse(img, lx, ly, lx + lw, ly + lh, c)
    shade_bottom(img, cx - 19, 6, cx + 19, 38, LEAF_SH, 0.35)
    ellipse(img, cx - 14, 2, cx, 16, LEAF_HI)
    speckle(img, [(cx - 10, 20, 3, 3), (cx + 4, 24, 3, 3), (cx - 2, 12, 3, 3)], LEAF_SH)
    return img


def make_bush():
    img = canvas(28, 20)
    cx = 14
    ellipse(img, 2, 6, 26, 20, LEAF)
    shade_bottom(img, 2, 6, 26, 20, LEAF_SH, 0.4)
    ellipse(img, 4, 3, 16, 13, LEAF_HI)
    for bx, by in ((8, 12), (18, 10), (13, 15)):
        highlight_dot(img, bx, by, (206, 60, 54, 255), 2, 2)
    return img


def make_rock():
    img = canvas(24, 18)
    polygon(img, [(2, 17), (0, 9), (6, 2), (16, 0), (23, 6), (22, 15), (14, 18)], (150, 148, 146, 255))
    shade_right(img, 2, 2, 23, 18, (108, 106, 104, 255), 0.4)
    polygon(img, [(4, 4), (14, 1), (10, 9), (3, 9)], (184, 182, 180, 255))
    return img


def make_flowers():
    img = canvas(22, 16)
    speckle(img, [(2, 10, 4, 3), (14, 11, 4, 3), (8, 12, 4, 3)], (60, 138, 45, 255))
    for fx, fy, c in ((4, 6, (232, 90, 90, 255)), (12, 4, (240, 210, 70, 255)), (18, 9, (200, 120, 220, 255))):
        highlight_dot(img, fx, fy, c, 3, 3)
        highlight_dot(img, fx + 1, fy + 1, (255, 255, 255, 160), 1, 1)
    return img


def make_mushroom():
    img = canvas(14, 14)
    ellipse(img, 4, 9, 10, 14, (232, 224, 210, 255))
    ellipse(img, 1, 2, 13, 11, (214, 66, 56, 255))
    shade_bottom(img, 1, 2, 13, 11, (166, 40, 36, 255), 0.35)
    for sx, sy in ((3, 4), (8, 3), (10, 7), (5, 7)):
        highlight_dot(img, sx, sy, (250, 240, 226, 255), 2, 2)
    return img


def make_reeds():
    img = canvas(20, 30)
    for bx, lean, h in ((3, 2, 26), (8, -1, 30), (13, 3, 24), (17, -2, 27)):
        d(img).line([(bx, 30), (bx + lean, 30 - h)], fill=(74, 132, 58, 255), width=2)
        d(img).line([(bx, 30), (bx + lean // 2, 30 - h + 4)], fill=(96, 162, 74, 255), width=1)
    ellipse(img, 6, 2, 10, 10, (120, 84, 46, 255))  # cattail head
    shade_bottom(img, 6, 2, 10, 10, (92, 62, 32, 255), 0.4)
    return img


def make_driftwood():
    img = canvas(30, 12)
    polygon(img, [(1, 8), (24, 2), (29, 5), (6, 11)], (156, 132, 100, 255))
    shade_bottom(img, 1, 2, 29, 11, (112, 92, 68, 255), 0.4)
    for lx in (8, 16, 22):
        d(img).line([(lx, 4), (lx - 3, 9)], fill=(112, 92, 68, 255), width=1)
    return img


def make_seashell():
    img = canvas(12, 10)
    polygon(img, [(6, 0), (11, 8), (6, 10), (1, 8)], (250, 224, 196, 255))
    shade_bottom(img, 1, 0, 11, 10, (222, 182, 150, 255), 0.4)
    for lx in (4, 6, 8):
        d(img).line([(6, 1), (lx, 8)], fill=(222, 182, 150, 255), width=1)
    highlight_dot(img, 5, 2, (255, 245, 232, 220), 2, 2)
    return img


def make_tidepool():
    img = canvas(26, 16)
    ellipse(img, 0, 2, 26, 16, (150, 120, 90, 255))
    ellipse(img, 2, 4, 24, 14, WATER)
    ellipse(img, 4, 5, 20, 11, WATER_HI)
    highlight_dot(img, 8, 6, (255, 255, 255, 160), 2, 1)
    return img


def make_butterfly():
    img = canvas(14, 12)
    cx = 7
    d(img).line([(cx, 2), (cx, 10)], fill=(40, 30, 20, 255), width=1)
    ellipse(img, cx - 7, 0, cx - 1, 6, (232, 150, 60, 255))
    ellipse(img, cx + 1, 0, cx + 7, 6, (232, 150, 60, 255))
    ellipse(img, cx - 6, 5, cx - 1, 10, (214, 90, 130, 255))
    ellipse(img, cx + 1, 5, cx + 6, 10, (214, 90, 130, 255))
    highlight_dot(img, cx - 4, 2, (255, 224, 160, 220), 1, 1)
    highlight_dot(img, cx + 3, 2, (255, 224, 160, 220), 1, 1)
    return img


PINE = (48, 96, 66, 255)
PINE_SH = (32, 72, 48, 255)
PINE_HI = (78, 132, 92, 255)


def make_pine_tree():
    img = canvas(36, 56)
    cx = 18
    ellipse(img, cx - 8, 46, cx + 8, 51, (10, 10, 10, 70))
    rect(img, cx - 3, 38, cx + 3, 49, (74, 52, 30, 255))
    for i, (w, y0, y1) in enumerate(((16, 4, 20), (13, 14, 30), (10, 24, 40))):
        polygon(img, [(cx - w, y1), (cx, y0), (cx + w, y1)], PINE)
        polygon(img, [(cx, y0), (cx + w, y1), (cx, y1)], PINE_SH)
        polygon(img, [(cx - w, y1), (cx, y0), (cx - w + 4, y1)], PINE_HI)
    return img


def make_mine_entrance():
    img = canvas(56, 46)
    ellipse(img, 4, 38, 52, 44, (10, 10, 10, 70))
    polygon(img, [(6, 42), (10, 10), (46, 10), (50, 42)], (74, 74, 80, 255))
    shade_right(img, 6, 10, 50, 42, (50, 50, 56, 255), 0.4)
    ellipse(img, 16, 6, 40, 40, (16, 16, 18, 255))
    rect(img, 6, 6, 12, 42, WOOD)
    rect(img, 44, 6, 50, 42, WOOD)
    rect(img, 6, 6, 50, 12, WOOD_SH)
    shade_right(img, 6, 6, 12, 42, WOOD_SH, 0.4)
    shade_right(img, 44, 6, 50, 42, WOOD_SH, 0.4)
    return img


# ---------------------------------------------------------------------------
# BOSS: BARON RUDIBERT
# ---------------------------------------------------------------------------
def make_boss():
    img = canvas(48, 52)
    cx = 24
    ellipse(img, cx - 15, 45, cx + 15, 51, (10, 10, 10, 90))
    # legs
    rect(img, cx - 11, 34, cx - 4, 44, LEATHER)
    rect(img, cx + 4, 34, cx + 11, 44, LEATHER)
    rect(img, cx - 11, 40, cx - 4, 44, (58, 38, 20, 255))
    rect(img, cx + 4, 40, cx + 11, 44, (58, 38, 20, 255))
    # crate armor body
    rect(img, cx - 17, 16, cx + 17, 36, (168, 118, 56, 255))
    shade_right(img, cx - 17, 16, cx + 17, 36, (120, 82, 36, 255), 0.35)
    for gy in (20, 26, 32):
        rect(img, cx - 17, gy, cx + 17, gy + 1, (94, 62, 26, 255))
    rect(img, cx - 17, 16, cx + 17, 19, (196, 148, 78, 255))
    highlight_dot(img, cx - 13, 22, (232, 196, 130, 200), 4, 2)
    # turnip sticking out of the crate
    ellipse(img, cx - 4, 8, cx + 5, 18, (238, 232, 222, 255))
    shade_bottom(img, cx - 4, 8, cx + 5, 18, (200, 190, 170, 255), 0.35)
    highlight_dot(img, cx - 2, 10, (255, 255, 255, 210), 2, 3)
    rect(img, cx - 1, 4, cx + 2, 10, (94, 150, 60, 255))
    # arms
    rect(img, cx - 22, 20, cx - 17, 30, SKIN)
    rect(img, cx + 17, 20, cx + 22, 30, SKIN)
    shade_bottom(img, cx - 22, 20, cx - 17, 30, SKIN_SH, 0.4)
    shade_bottom(img, cx + 17, 20, cx + 22, 30, SKIN_SH, 0.4)
    # neck + big flustered head
    rect(img, cx - 4, 9, cx + 4, 15, SKIN)
    ellipse(img, cx - 13, -6, cx + 13, 15, SKIN)
    shade_bottom(img, cx - 13, -6, cx + 13, 15, SKIN_SH, 0.28)
    # cabbage leaf crown
    for lx, ly, lw, lh in ((-14, -12, 14, 12), (-3, -16, 16, 12), (10, -12, 14, 12)):
        ellipse(img, cx + lx, ly, cx + lx + lw, ly + lh, (94, 160, 60, 255))
    for lx, ly, lw, lh in ((-11, -8, 8, 6), (0, -12, 8, 6), (12, -8, 8, 6)):
        ellipse(img, cx + lx, ly, cx + lx + lw, ly + lh, (60, 118, 40, 255))
    # rosy cheeks + angry brows + eyes
    highlight_dot(img, cx - 10, 6, (222, 100, 80, 180), 4, 3)
    highlight_dot(img, cx + 6, 6, (222, 100, 80, 180), 4, 3)
    rect(img, cx - 7, 1, cx - 2, 2, (40, 26, 18, 255))
    rect(img, cx + 2, 1, cx + 7, 2, (40, 26, 18, 255))
    rect(img, cx - 6, 3, cx - 3, 5, (40, 26, 18, 255))
    rect(img, cx + 3, 3, cx + 6, 5, (40, 26, 18, 255))
    d(img).line([(cx - 4, 9), (cx + 4, 9)], fill=(150, 60, 40, 255), width=1)  # frowny mouth
    return img


# ---------------------------------------------------------------------------
# BOSS: EISENHERZOG GRENDAL
# ---------------------------------------------------------------------------
def make_boss_grendal():
    img = canvas(50, 56)
    cx = 25
    ellipse(img, cx - 16, 49, cx + 16, 55, (10, 10, 10, 90))
    # legs - massive iron greaves
    rect(img, cx - 12, 36, cx - 4, 47, IRON_DARK)
    rect(img, cx + 4, 36, cx + 12, 47, IRON_DARK)
    shade_right(img, cx - 12, 36, cx - 4, 47, IRON_DARK_SH, 0.4)
    shade_right(img, cx + 4, 36, cx + 12, 47, IRON_DARK_SH, 0.4)
    # torso - huge plate armor
    rect(img, cx - 18, 16, cx + 18, 39, IRON)
    shade_right(img, cx - 18, 16, cx + 18, 39, IRON_SH, 0.35)
    for gy in (21, 27, 33):
        rect(img, cx - 18, gy, cx + 18, gy + 1, IRON_DARK)
    rect(img, cx - 18, 16, cx + 18, 19, IRON_HI)
    specular(img, cx - 10, 19, cx - 7, 32, width=2)
    polygon(img, [(cx - 3, 16), (cx + 3, 16), (cx + 4, 23), (cx, 26), (cx - 4, 23)], BRASS)
    # spiked pauldrons
    ellipse(img, cx - 24, 12, cx - 6, 22, IRON)
    ellipse(img, cx + 6, 12, cx + 24, 22, IRON)
    shade_bottom(img, cx - 24, 12, cx - 6, 22, IRON_SH, 0.4)
    shade_bottom(img, cx + 6, 12, cx + 24, 22, IRON_SH, 0.4)
    highlight_dot(img, cx - 20, 14, (255, 255, 255, 170), 3, 2)
    highlight_dot(img, cx + 12, 14, (255, 255, 255, 170), 3, 2)
    for sx in (-20, -13, 13, 20):
        polygon(img, [(cx + sx - 3, 12), (cx + sx, 4), (cx + sx + 3, 12)], IRON_DARK)
    # arms
    rect(img, cx - 24, 22, cx - 18, 33, IRON_SH)
    rect(img, cx + 18, 22, cx + 24, 33, IRON_SH)
    # neck + huge helm
    rect(img, cx - 5, 10, cx + 5, 17, IRON_DARK)
    ellipse(img, cx - 14, -6, cx + 14, 17, IRON_DARK)
    shade_bottom(img, cx - 14, -6, cx + 14, 17, IRON_DARK_SH, 0.3)
    rect(img, cx - 14, -9, cx + 14, -4, IRON_HI)
    rect(img, cx - 14, 3, cx + 14, 7, (16, 16, 18, 255))  # visor slit
    highlight_dot(img, cx - 8, 4, (232, 90, 40, 255), 3, 3)
    highlight_dot(img, cx + 5, 4, (232, 90, 40, 255), 3, 3)
    # a duke's crown, worn straight over the great helm
    rect(img, cx - 12, -12, cx + 12, -8, BRASS)
    shade_bottom(img, cx - 12, -12, cx + 12, -8, BRASS_SH, 0.4)
    for px in (-9, -3, 3, 9):
        polygon(img, [(cx + px - 3, -12), (cx + px, -19), (cx + px + 3, -12)], BRASS)
    highlight_dot(img, cx - 6, -18, (255, 240, 200, 220), 2, 2)
    polygon(img, [(cx - 10, -10), (cx - 6, -15), (cx - 4, -9)], IRON_SH)
    polygon(img, [(cx + 10, -10), (cx + 6, -15), (cx + 4, -9)], IRON_SH)
    return img


def make_grendal_hammer():
    img = canvas(20, 48)
    rect(img, 8, 10, 12, 42, WOOD)
    rect(img, 9, 10, 12, 42, WOOD_SH)
    rect(img, 0, 0, 19, 13, IRON)
    shade_bottom(img, 0, 0, 19, 13, IRON_SH, 0.4)
    rect(img, 0, 0, 19, 3, IRON_HI)
    for hx in (3, 9, 15):
        highlight_dot(img, hx, 6, IRON_DARK, 2, 2)
    polygon(img, [(0, 2), (-4, 6), (0, 10)], IRON_DARK)
    polygon(img, [(19, 2), (23, 6), (19, 10)], IRON_DARK)
    rect(img, 8, 40, 12, 46, LEATHER)
    return img


def make_veggie():
    img = canvas(14, 16)
    ellipse(img, 1, 3, 12, 14, (196, 60, 48, 255))
    shade_bottom(img, 1, 3, 12, 14, (146, 36, 30, 255), 0.4)
    rect(img, 5, 0, 8, 4, (94, 150, 60, 255))
    highlight_dot(img, 3, 5, (230, 120, 100, 200), 2, 2)
    return img


# ---------------------------------------------------------------------------
# BOAT — "Die Fromme Ente" (The Pious Duck), so the figurehead is, in fact,
# a duck.
# ---------------------------------------------------------------------------
DUCK_BILL = (232, 160, 40, 255)


def make_boat():
    img = canvas(52, 68)
    cx = 26

    # hull, wider + more plank detail than before
    polygon(img, [(3, 42), (49, 42), (37, 62), (15, 62)], WOOD)
    polygon(img, [(cx, 42), (49, 42), (37, 62), (cx, 62)], WOOD_SH)
    for py in (46, 50, 54, 58):
        d(img).line([(6, py), (46, py)], fill=WOOD_SH, width=1)
    rect(img, 2, 34, 50, 43, WOOD_HI)
    rect(img, 2, 38, 50, 43, WOOD)
    for gx in range(6, 48, 6):
        d(img).line([(gx, 34), (gx, 42)], fill=WOOD_SH, width=1)
    # gunwale trim
    rect(img, 2, 33, 50, 35, (206, 150, 82, 255))

    # mast + boom
    rect(img, cx - 2, 3, cx + 2, 38, (108, 70, 30, 255))
    rect(img, cx, 3, cx + 2, 38, (74, 46, 20, 255))
    rect(img, cx - 16, 30, cx + 18, 33, WOOD_SH)

    # big sail with a crest emblem (echoes Ruediger's chest crest)
    polygon(img, [(cx + 2, 6), (cx + 2, 33), (cx + 24, 25)], (246, 240, 224, 255))
    polygon(img, [(cx + 2, 20), (cx + 2, 33), (cx + 24, 25)], (218, 208, 186, 255))
    for ly, lx in ((11, 14), (17, 18), (23, 21), (29, 17)):
        d(img).line([(cx + 2, ly), (cx + lx, ly + 2)], fill=(190, 180, 156, 255), width=1)
    polygon(img, [(cx + 9, 14), (cx + 13, 14), (cx + 13, 18), (cx + 11, 20), (cx + 9, 18)], (232, 196, 70, 255))
    rect(img, cx + 10, 15, cx + 12, 17, TUNIC)

    # rigging ropes from mast top to bow/stern
    d(img).line([(cx, 4), (6, 33)], fill=(176, 156, 120, 255), width=1)
    d(img).line([(cx, 4), (46, 40)], fill=(176, 156, 120, 255), width=1)

    # pennant flag at the masthead
    polygon(img, [(cx + 2, 1), (cx + 13, 4), (cx + 2, 7)], TUNIC)
    polygon(img, [(cx + 2, 1), (cx + 8, 3), (cx + 2, 5)], TUNIC_HI)

    # carved duck-head figurehead at the bow
    fx, fy = 26, 40
    ellipse(img, fx - 6, fy - 6, fx + 6, fy + 6, (250, 236, 130, 255))
    shade_bottom(img, fx - 6, fy - 6, fx + 6, fy + 6, (214, 196, 90, 255), 0.4)
    ellipse(img, fx - 3, fy - 10, fx + 5, fy - 3, (250, 236, 130, 255))
    polygon(img, [(fx + 3, fy - 8), (fx + 11, fy - 7), (fx + 3, fy - 5)], DUCK_BILL)
    highlight_dot(img, fx - 1, fy - 8, (40, 30, 15, 255), 1, 1)
    ellipse(img, fx - 8, fy + 4, fx + 8, fy + 10, WOOD_SH)  # neck taper into hull
    return img


# ---------------------------------------------------------------------------
# HOUSES
# ---------------------------------------------------------------------------
PLASTER = (224, 206, 168, 255)
PLASTER_SH = (196, 176, 136, 255)
TIMBER = (74, 48, 28, 255)
ROOF = (140, 46, 34, 255)
ROOF_SH = (100, 30, 22, 255)
ROOF_HI = (176, 70, 52, 255)
STONE = (150, 148, 146, 255)
STONE_SH = (112, 110, 108, 255)
THATCH = (198, 164, 84, 255)
THATCH_SH = (158, 128, 60, 255)
GLOW = (255, 214, 122, 255)


def gabled_roof(img, x0, y0, x1, y1, peak_y, color, color_sh, color_hi, overhang=4):
    cx = (x0 + x1) / 2
    polygon(img, [(x0 - overhang, y1), (cx, peak_y), (x1 + overhang, y1)], color)
    polygon(img, [(cx, peak_y), (x1 + overhang, y1), (cx, y1)], color_sh)
    polygon(img, [(x0 - overhang, y1), (cx, peak_y), (cx - 2, y1)], color_hi)
    rect(img, x0 - overhang, y1 - 2, x1 + overhang, y1, color_sh)


def door(img, x0, y0, x1, y1, color=(74, 48, 24, 255)):
    d(img).rounded_rectangle([x0, y0, x1, y1], radius=2, fill=color)
    highlight_dot(img, x1 - 2, (y0 + y1) // 2, (232, 196, 90, 255), 1, 1)


def window(img, x0, y0, x1, y1, frame=TIMBER):
    rect(img, x0, y0, x1, y1, GLOW)
    rect(img, x0, y0, x1, (y0 + y1) // 2, (255, 236, 176, 255))
    cx = (x0 + x1) // 2
    cy = (y0 + y1) // 2
    d(img).line([(cx, y0), (cx, y1)], fill=frame, width=1)
    d(img).line([(x0, cy), (x1, cy)], fill=frame, width=1)


def make_house_timber():
    img = canvas(64, 76)
    x0, y0, x1, y1 = 6, 34, 57, 68
    ellipse(img, 6, 66, 58, 72, (10, 10, 10, 70))
    rect(img, x0, y0, x1, y1, PLASTER)
    shade_right(img, x0, y0, x1, y1, PLASTER_SH, 0.3)
    # timber frame
    rect(img, x0, y0, x0 + 3, y1, TIMBER)
    rect(img, x1 - 3, y0, x1, y1, TIMBER)
    rect(img, x0, y1 - 3, x1, y1, TIMBER)
    rect(img, x0, y0, x1, y0 + 3, TIMBER)
    for tx in (18, 30, 42):
        rect(img, tx, y0, tx + 3, y1, TIMBER)
    d(img).line([(x0 + 3, y0 + 3), (18, y1 - 3)], fill=TIMBER, width=3)
    d(img).line([(42 + 3, y0 + 3), (x1 - 3, y1 - 3)], fill=TIMBER, width=3)
    # windows + door
    window(img, 12, 42, 20, 52)
    window(img, 44, 42, 52, 52)
    door(img, 26, 50, 38, 68)
    # roof
    gabled_roof(img, x0 - 2, 6, x1 + 2, y0 + 4, 2, ROOF, ROOF_SH, ROOF_HI, overhang=6)
    for ry in range(10, 34, 5):
        d(img).line([(8, ry), (56, ry)], fill=ROOF_SH, width=1)
    # chimney + smoke
    rect(img, 44, -2, 51, 14, STONE)
    shade_right(img, 44, -2, 51, 14, STONE_SH, 0.4)
    d(img).line([(47, -4), (44, -9), (48, -13)], fill=(224, 224, 224, 170), width=2)
    return img


def make_house_stone():
    img = canvas(52, 60)
    x0, y0, x1, y1 = 5, 28, 46, 54
    ellipse(img, 4, 52, 47, 58, (10, 10, 10, 70))
    rect(img, x0, y0, x1, y1, STONE)
    shade_right(img, x0, y0, x1, y1, STONE_SH, 0.35)
    for by in range(y0 + 4, y1, 5):
        off = 0 if ((by - y0) // 5) % 2 == 0 else 4
        for bx in range(x0 + off, x1, 8):
            d(img).line([(bx, by), (bx, min(by + 5, y1))], fill=STONE_SH, width=1)
        d(img).line([(x0, by), (x1, by)], fill=STONE_SH, width=1)
    window(img, 11, 34, 18, 42)
    door(img, 24, 40, 34, 54)
    # thatched roof
    cx = (x0 + x1) / 2
    polygon(img, [(x0 - 5, y0 + 2), (cx, 2), (x1 + 5, y0 + 2)], THATCH)
    polygon(img, [(cx, 2), (x1 + 5, y0 + 2), (cx, y0 + 2)], THATCH_SH)
    for ry in range(6, 28, 4):
        d(img).line([(x0 - 3, ry), (x1 + 3, ry)], fill=THATCH_SH, width=1)
    rect(img, x0 - 5, y0, x1 + 5, y0 + 3, THATCH_SH)
    return img


def make_house_inn():
    img = canvas(92, 88)
    x0, y0, x1, y1 = 8, 38, 83, 78
    ellipse(img, 8, 76, 84, 82, (10, 10, 10, 70))
    rect(img, x0, y0, x1, y1, PLASTER)
    shade_right(img, x0, y0, x1, y1, PLASTER_SH, 0.3)
    rect(img, x0, y0, x0 + 3, y1, TIMBER)
    rect(img, x1 - 3, y0, x1, y1, TIMBER)
    rect(img, x0, y1 - 3, x1, y1, TIMBER)
    rect(img, x0, y0, x1, y0 + 3, TIMBER)
    rect(img, x0, y0 + 20, x1, y0 + 23, TIMBER)  # floor divider (two storeys)
    for tx in range(20, int(x1) - 4, 16):
        rect(img, tx, y0, tx + 3, y1, TIMBER)
    # upper-floor overhang ledge
    rect(img, x0 - 4, y0 + 18, x1 + 4, y0 + 21, WOOD_SH)
    # windows (two rows) + big double door
    for wx in (18, 40, 62):
        window(img, wx, y0 + 5, wx + 8, y0 + 15)
    for wx in (16, 68):
        window(img, wx, y0 + 27, wx + 8, y0 + 37)
    door(img, 38, y0 + 30, 54, y1)
    # hanging tavern sign
    rect(img, x1 - 6, y0 - 14, x1 + 2, y0 - 2, WOOD_SH)
    d(img).line([(x1 - 6, y0 - 14), (x1 - 6, y0 - 2)], fill=TIMBER, width=2)
    ellipse(img, x1 - 4, y0 - 12, x1 + 14, y0 - 2, (232, 196, 70, 255))
    ellipse(img, x1 + 1, y0 - 9, x1 + 7, y0 - 3, ROOF)
    # roof
    gabled_roof(img, x0 - 3, 4, x1 + 3, y0 + 4, -2, ROOF, ROOF_SH, ROOF_HI, overhang=8)
    for ry in range(8, 34, 5):
        d(img).line([(10, ry), (81, ry)], fill=ROOF_SH, width=1)
    rect(img, 20, -6, 28, 12, STONE)
    shade_right(img, 20, -6, 28, 12, STONE_SH, 0.4)
    d(img).line([(23, -8), (20, -13), (24, -17)], fill=(224, 224, 224, 170), width=2)
    return img


# ---------------------------------------------------------------------------
# TILES (32x32, seamless-ish)
# ---------------------------------------------------------------------------
def tile_base(color):
    img = canvas(32, 32)
    rect(img, 0, 0, 31, 31, color)
    return img


def speckle(img, positions, color):
    for (x, y, w, h) in positions:
        rect(img, x, y, x + w - 1, y + h - 1, color)


def make_tile_grass():
    img = tile_base(GRASS)
    # small blade-tuft clumps instead of flat dot speckles, for a less
    # uniform, more "growing" look up close
    tufts = [(3, 6), (18, 4), (9, 15), (25, 12), (14, 23), (27, 25), (4, 21), (20, 28), (30, 18)]
    for tx, ty in tufts:
        d(img).line([(tx, ty), (tx - 1, ty - 3)], fill=GRASS_SH, width=1)
        d(img).line([(tx + 2, ty), (tx + 1, ty - 4)], fill=GRASS_SH, width=1)
        d(img).line([(tx + 1, ty), (tx + 1, ty - 2)], fill=GRASS_HI, width=1)
    speckle(img, [(11, 8, 2, 2), (26, 19, 2, 2), (6, 27, 2, 2), (16, 2, 2, 2)], GRASS_HI)
    speckle(img, [(1, 12, 1, 1), (22, 2, 1, 1), (30, 9, 1, 1)], GRASS_SH)
    return img.crop((0, 0, 32, 32))


def make_tile_path():
    img = tile_base((172, 130, 78, 255))
    speckle(img, [(4, 7, 2, 2), (17, 15, 2, 2), (10, 24, 2, 2), (24, 5, 2, 2),
                  (21, 22, 2, 2), (7, 18, 2, 2)], (136, 100, 56, 255))
    speckle(img, [(9, 12, 1, 1), (23, 10, 1, 1), (14, 27, 1, 1), (28, 20, 1, 1)],
            (206, 166, 104, 255))
    speckle(img, [(2, 2, 1, 1), (30, 30, 1, 1), (15, 8, 1, 1)], (98, 70, 38, 255))
    return img.crop((0, 0, 32, 32))


def make_tile_sand():
    img = tile_base(SAND)
    speckle(img, [(5, 8, 1, 1), (20, 5, 1, 1), (12, 18, 1, 1), (25, 22, 1, 1),
                  (3, 24, 1, 1), (17, 27, 1, 1), (28, 10, 1, 1), (9, 3, 1, 1)],
            SAND_SH)
    speckle(img, [(16, 12, 1, 1), (8, 27, 1, 1), (24, 16, 1, 1)], SAND_HI)
    # a couple of tiny shell/pebble flecks for beach texture
    highlight_dot(img, 21, 19, (255, 250, 240, 220), 2, 1)
    highlight_dot(img, 6, 14, (200, 172, 150, 255), 2, 2)
    return img.crop((0, 0, 32, 32))


def make_tile_water():
    img = tile_base(WATER)
    rect(img, 0, 4, 31, 5, WATER_HI)
    rect(img, 0, 16, 31, 17, WATER_HI)
    rect(img, 0, 27, 31, 28, WATER_SH)
    rect(img, 0, 10, 31, 10, WATER_SH)
    rect(img, 0, 22, 31, 22, WATER_SH)
    speckle(img, [(6, 12, 4, 1), (20, 24, 4, 1), (14, 2, 4, 1), (24, 8, 3, 1), (2, 19, 3, 1)],
            (170, 220, 250, 220))
    highlight_dot(img, 9, 5, (255, 255, 255, 160), 2, 1)
    highlight_dot(img, 27, 17, (255, 255, 255, 140), 2, 1)
    return img.crop((0, 0, 32, 32))


def make_tile_foam():
    # a transparent, tileable wave-crest strip laid along coastlines and
    # scrolled at runtime for a lapping-tide effect
    img = canvas(32, 16)
    d(img).line([(0, 6), (6, 3), (12, 7), (18, 3), (24, 7), (30, 3)], fill=FOAM, width=2)
    d(img).line([(0, 9), (6, 6), (12, 10), (18, 6), (24, 10), (30, 6)], fill=(255, 255, 255, 150), width=1)
    for bx, by in ((4, 11), (14, 12), (22, 10), (28, 12), (9, 13)):
        highlight_dot(img, bx, by, (255, 255, 255, 130), 2, 2)
    return img


def make_tile_wall():
    img = tile_base((118, 122, 130, 255))
    for by in (0, 11, 22):
        offset = 0 if (by // 11) % 2 == 0 else 8
        for bx in range(-8 + offset, 32, 16):
            rect(img, bx, by, bx + 14, by + 9, (134, 139, 148, 255))
            shade_right(img, bx, by, bx + 14, by + 9, (98, 102, 110, 255), 0.3)
            shade_bottom(img, bx, by, bx + 14, by + 9, (98, 102, 110, 255), 0.25)
    rect(img, 0, 0, 31, 31, (0, 0, 0, 0)) if False else None
    return img.crop((0, 0, 32, 32))


def make_tile_floor():
    img = tile_base((150, 112, 68, 255))
    for gx in (0, 10, 20, 30):
        rect(img, gx, 0, gx, 31, (120, 86, 48, 255))
    for gy in (0, 10, 20, 30):
        rect(img, 0, gy, 31, gy, (120, 86, 48, 255))
    speckle(img, [(3, 3, 3, 2), (14, 14, 3, 2), (23, 6, 3, 2)], (168, 128, 80, 255))
    return img.crop((0, 0, 32, 32))


def make_tile_stone():
    img = tile_base((104, 106, 112, 255))
    for by in (0, 11, 22):
        offset = 0 if (by // 11) % 2 == 0 else 8
        for bx in range(-8 + offset, 32, 16):
            rect(img, bx, by, bx + 14, by + 9, (116, 118, 126, 255))
            shade_right(img, bx, by, bx + 14, by + 9, (82, 84, 92, 255), 0.3)
            shade_bottom(img, bx, by, bx + 14, by + 9, (82, 84, 92, 255), 0.25)
    speckle(img, [(4, 4, 2, 2), (19, 17, 2, 2), (10, 26, 2, 2)], (128, 130, 138, 255))
    return img.crop((0, 0, 32, 32))


def make_tile_stone_path():
    img = tile_base((72, 74, 80, 255))
    speckle(img, [(4, 7, 2, 2), (17, 15, 2, 2), (10, 24, 2, 2), (24, 5, 2, 2),
                  (21, 22, 2, 2), (7, 18, 2, 2)], (54, 56, 62, 255))
    speckle(img, [(9, 12, 1, 1), (23, 10, 1, 1), (14, 27, 1, 1), (28, 20, 1, 1)],
            (94, 96, 104, 255))
    return img.crop((0, 0, 32, 32))


# ---------------------------------------------------------------------------
# SAILING-MAP ISLAND LANDMASSES (each visually distinct)
# ---------------------------------------------------------------------------
def jitter_polygon(points, cx, cy, amount, seed=0):
    """Push each vertex slightly in/out from the shape centroid using a cheap
    deterministic pseudo-noise (sin of an integer seed), for a hand-drawn,
    less-geometric coastline than raw straight polygon points."""
    out = []
    for i, (x, y) in enumerate(points):
        n = math.sin(i * 12.9898 + seed * 78.233) * 43758.5453
        wobble = (n - math.floor(n)) * 2 - 1  # deterministic pseudo-random in [-1, 1]
        dx, dy = x - cx, y - cy
        dist = math.hypot(dx, dy) or 1
        ux, uy = dx / dist, dy / dist
        out.append((x + ux * amount * wobble, y + uy * amount * wobble))
    return out


def outward_ring(points, cx, cy, base, variance, seed=0):
    """Like jitter_polygon, but always displaces outward (away from the
    shape centroid) by base +/- variance - guarantees a ring that traces
    just OUTSIDE the coastline instead of sometimes cutting back inside it."""
    out = []
    for i, (x, y) in enumerate(points):
        n = math.sin(i * 12.9898 + seed * 78.233) * 43758.5453
        wobble = n - math.floor(n)  # deterministic pseudo-random in [0, 1]
        dx, dy = x - cx, y - cy
        dist = math.hypot(dx, dy) or 1
        ux, uy = dx / dist, dy / dist
        push = base + variance * wobble
        out.append((x + ux * push, y + uy * push))
    return out


def foam_ring(img, points, color=FOAM, width=2):
    d(img).line(points + [points[0]], fill=(255, 255, 255, 100), width=width + 3, joint="curve")
    d(img).line(points + [points[0]], fill=color, width=width, joint="curve")


def make_island_rubenfeld():
    img = canvas(170, 130)
    cx, cy = 88, 65
    beach = jitter_polygon(
        [(20, 55), (35, 25), (75, 10), (120, 14), (152, 40), (160, 72),
         (140, 105), (95, 122), (50, 116), (18, 90)], cx, cy, 9, seed=1)
    grass = jitter_polygon(
        [(30, 55), (42, 32), (76, 20), (115, 23), (144, 42), (150, 70),
         (132, 97), (94, 111), (54, 105), (28, 84)], cx, cy, 7, seed=2)
    polygon(img, beach, SAND)
    polygon(img, grass, GRASS)
    foam_ring(img, outward_ring(beach, cx, cy, 3, 4, seed=3), width=2)
    speckle(img, [(50, 50, 5, 4), (90, 40, 5, 4), (70, 80, 5, 4), (110, 70, 5, 4),
                  (60, 95, 4, 3), (120, 50, 4, 3)], GRASS_SH)
    speckle(img, [(45, 70, 3, 3), (100, 90, 3, 3)], GRASS_HI)
    # tiny castle silhouette
    rect(img, 76, 42, 104, 62, (140, 148, 158, 255))
    rect(img, 76, 34, 84, 46, (120, 128, 138, 255))
    rect(img, 96, 30, 104, 46, (120, 128, 138, 255))
    rect(img, 86, 50, 94, 62, (60, 60, 66, 255))
    # path down to a little dock
    d(img).line([(88, 62), (80, 96)], fill=(178, 140, 84, 255), width=4)
    ellipse(img, 66, 92, 92, 104, (150, 108, 60, 255))
    return img


def make_island_eisenklamm():
    img = canvas(180, 150)
    cx, cy = 92, 76
    shore = jitter_polygon(
        [(15, 90), (30, 55), (55, 30), (95, 12), (135, 10), (165, 35),
         (172, 72), (155, 110), (120, 138), (75, 142), (35, 122)], cx, cy, 9, seed=4)
    rock = jitter_polygon(
        [(28, 85), (42, 55), (62, 35), (96, 20), (130, 18), (156, 38),
         (162, 70), (146, 102), (114, 126), (74, 130), (42, 112)], cx, cy, 7, seed=5)
    polygon(img, shore, (196, 190, 176, 255))
    polygon(img, rock, (128, 130, 134, 255))
    foam_ring(img, outward_ring(shore, cx, cy, 3, 4, seed=6), width=2)
    # jagged mountain peaks
    peaks = [(50, 100), (66, 42), (82, 78), (100, 24), (118, 76), (136, 46), (150, 96)]
    polygon(img, peaks, (98, 100, 106, 255))
    for i in range(len(peaks) - 1):
        if peaks[i][1] < 60:
            px, py = peaks[i]
            polygon(img, [(px - 8, py + 14), (px, py), (px + 8, py + 14)], (222, 226, 232, 255))
    speckle(img, [(60, 90, 4, 3), (100, 95, 4, 3), (130, 85, 4, 3), (44, 96, 3, 3)],
            (84, 86, 92, 255))
    d(img).line([(74, 132), (66, 44)], fill=(70, 72, 78, 200), width=2)  # crevice
    return img


def make_island_moewenhort():
    img = canvas(170, 130)
    cx, cy = 90, 66
    shore = jitter_polygon(
        [(12, 60), (22, 32), (52, 14), (90, 10), (122, 20), (150, 15),
         (162, 40), (155, 70), (168, 95), (140, 118), (100, 124),
         (60, 120), (30, 100)], cx, cy, 9, seed=7)
    sand = jitter_polygon(
        [(24, 58), (32, 36), (56, 22), (90, 19), (118, 27), (140, 24),
         (150, 42), (144, 66), (152, 88), (130, 106), (98, 112),
         (64, 108), (38, 90)], cx, cy, 7, seed=8)
    polygon(img, shore, (150, 148, 146, 255))
    polygon(img, sand, SAND)
    foam_ring(img, outward_ring(shore, cx, cy, 3, 4, seed=9), width=2)
    speckle(img, [(50, 50, 4, 3), (90, 40, 4, 3), (110, 80, 4, 3), (70, 90, 4, 3)],
            (196, 168, 108, 255))
    # rocky cliff outcrops
    for rx, ry, rw, rh in ((30, 45, 16, 22), (128, 55, 20, 26), (70, 84, 14, 18)):
        ellipse(img, rx, ry, rx + rw, ry + rh, (140, 138, 136, 255))
        shade_bottom(img, rx, ry, rx + rw, ry + rh, (104, 102, 100, 255), 0.4)
    # bay cutout with a couple of gulls
    ellipse(img, 96, 60, 128, 84, (94, 152, 206, 255))
    polygon(img, [(30, 30), (34, 26), (38, 30)], (40, 40, 40, 220))
    polygon(img, [(46, 22), (50, 18), (54, 22)], (40, 40, 40, 220))
    return img


def main():
    save(make_player(), "player")
    save(make_sword(), "sword")
    save(make_halberdier(), "halberdier")
    save(make_halberd(), "halberd")
    save(make_fowl((246, 244, 238, 255), (206, 202, 190, 255), comb=False, scale=0.62), "goose")
    save(make_fowl((216, 176, 120, 255), (176, 138, 86, 255), comb=True, scale=0.46), "chicken")
    save(make_barrel(), "barrel")
    save(make_melon(), "melon")
    save(make_grail(), "grail")
    save(make_boss(), "boss_rudibert")
    save(make_veggie(), "veggie")
    save(make_boat(), "boat")
    save(make_house_timber(), "house_timber")
    save(make_house_stone(), "house_stone")
    save(make_house_inn(), "house_inn")
    save(make_island_rubenfeld(), "island_rubenfeld")
    save(make_island_eisenklamm(), "island_eisenklamm")
    save(make_island_moewenhort(), "island_moewenhort")
    save(make_potion(), "potion")
    save(make_warhammer(), "warhammer")
    save(make_armor_leather(), "armor_leather")
    save(make_chest(), "chest")
    save(make_tree(), "tree")
    save(make_bush(), "bush")
    save(make_rock(), "rock")
    save(make_flowers(), "flowers")
    save(make_elite_knight(), "elite_knight")
    save(make_tower_shield(), "tower_shield")
    save(make_pickaxe(), "pickaxe")
    save(make_mine_goblin(), "mine_goblin")
    save(make_sapper(), "sapper")
    save(make_bomb(), "bomb")
    save(make_boss_grendal(), "boss_grendal")
    save(make_grendal_hammer(), "grendal_hammer")
    save(make_pine_tree(), "pine_tree")
    save(make_mine_entrance(), "mine_entrance")
    save(make_grapple_hook(), "grapple_hook")
    save(make_mushroom(), "mushroom")
    save(make_reeds(), "reeds")
    save(make_driftwood(), "driftwood")
    save(make_seashell(), "seashell")
    save(make_tidepool(), "tidepool")
    save(make_butterfly(), "butterfly")

    for name, fn in (
        ("tile_grass", make_tile_grass),
        ("tile_path", make_tile_path),
        ("tile_sand", make_tile_sand),
        ("tile_water", make_tile_water),
        ("tile_wall", make_tile_wall),
        ("tile_floor", make_tile_floor),
        ("tile_stone", make_tile_stone),
        ("tile_stone_path", make_tile_stone_path),
    ):
        img = fn()
        img.save(os.path.join(OUT, f"{name}.png"))
    make_tile_foam().save(os.path.join(OUT, "tile_foam.png"))

    # contact sheet for review
    names = ["player", "sword", "halberdier", "halberd", "goose", "chicken",
             "barrel", "melon", "grail", "boss_rudibert", "veggie", "boat",
             "house_timber", "house_stone", "house_inn",
             "island_rubenfeld", "island_eisenklamm", "island_moewenhort",
             "potion", "warhammer", "armor_leather", "chest",
             "tree", "bush", "rock", "flowers",
             "elite_knight", "tower_shield", "pickaxe", "mine_goblin", "sapper", "bomb",
             "boss_grendal", "grendal_hammer", "pine_tree", "mine_entrance", "grapple_hook",
             "mushroom", "reeds", "driftwood", "seashell", "tidepool", "butterfly",
             "tile_grass", "tile_path", "tile_sand", "tile_water", "tile_wall", "tile_floor",
             "tile_stone", "tile_stone_path", "tile_foam"]
    cell = 96
    cols = 6
    rows = math.ceil(len(names) / cols)
    sheet = Image.new("RGBA", (cols * cell, rows * cell), (40, 44, 52, 255))
    for i, n in enumerate(names):
        im = Image.open(os.path.join(OUT, f"{n}.png")).convert("RGBA")
        scale = min((cell - 8) / im.width, (cell - 8) / im.height)
        im2 = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.NEAREST)
        x = (i % cols) * cell + (cell - im2.width) // 2
        y = (i // cols) * cell + (cell - im2.height) // 2
        sheet.alpha_composite(im2, (x, y))
    sheet = sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST)
    sheet.save(os.path.join(PREVIEW, "sheet.png"))
    print("done")


if __name__ == "__main__":
    main()
