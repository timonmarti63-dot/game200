"""Render a contact sheet of all processed sprites for visual QA."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SPR = ROOT / "public" / "sprites"
OUT = ROOT / "sprites_contact_sheet.png"

COLS = 8
CELL_W = 180
CELL_H = 180
PAD = 6
BG = (32, 40, 52)
GRID = (72, 84, 100)
LABEL = (232, 236, 244)

files = sorted(SPR.glob("*.png"))
rows = (len(files) + COLS - 1) // COLS
W = COLS * CELL_W
H = rows * CELL_H + 40
img = Image.new("RGBA", (W, H), BG + (255,))
draw = ImageDraw.Draw(img)
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 12)
except Exception:
    font = ImageFont.load_default()

for i, f in enumerate(files):
    r, c = divmod(i, COLS)
    x = c * CELL_W
    y = r * CELL_H
    draw.rectangle([x, y, x + CELL_W, y + CELL_H], outline=GRID, width=1)
    sp = Image.open(f).convert("RGBA")
    # scale up for visibility while keeping pixel art crisp
    scale = min((CELL_W - PAD * 2) / sp.width, (CELL_H - 30) / sp.height)
    scale = max(2, int(scale))  # min 2x for readability
    new = sp.resize((sp.width * scale, sp.height * scale), Image.NEAREST)
    ox = x + (CELL_W - new.width) // 2
    oy = y + (CELL_H - 24 - new.height) // 2
    img.alpha_composite(new, (ox, oy))
    draw.text((x + 6, y + CELL_H - 20), f.stem, fill=LABEL, font=font)

img.save(OUT, optimize=True)
print(f"Wrote {OUT}")
