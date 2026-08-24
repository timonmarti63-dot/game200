"""Aggressively remove ALL near-white pixels from the shop-related sprites."""
from PIL import Image
import os

SPRITES = [
    'shopkeeper_potion', 'shopkeeper_smith',
    'potion_medium', 'potion_large', 'armor_iron', 'armor_plate',
    'coin_silver', 'coin_gold',
    'dock', 'elevation_wall',
    'house_apothecary', 'house_smith', 'house_cottage_a', 'house_cottage_b',
    'well', 'arena_gatehouse',
]

root = '/home/user/workspace/game200/public/sprites'
for name in SPRITES:
    p = os.path.join(root, name + '.png')
    if not os.path.exists(p):
        print("MISS", p); continue
    im = Image.open(p).convert('RGBA')
    data = im.load()
    w, h = im.size
    cleaned = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = data[x, y]
            if r >= 220 and g >= 220 and b >= 220:
                data[x, y] = (0, 0, 0, 0)
                cleaned += 1
    im.save(p, optimize=True)
    print(f"{name}: nuked {cleaned}")
