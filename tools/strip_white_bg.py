"""Remove near-white pixels from PNGs (top-level pass on new sprites)."""
from PIL import Image
import sys, os

SPRITES = [
    'dock', 'elevation_wall', 'shopkeeper_potion', 'shopkeeper_smith',
    'coin_silver', 'coin_gold', 'tile_floor_wood',
    'house_apothecary', 'house_smith', 'house_cottage_a', 'house_cottage_b',
    'well', 'arena_gatehouse',
    'potion_medium', 'potion_large', 'armor_iron', 'armor_plate',
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
    # Flood-fill from every edge pixel to find contiguous white background
    from collections import deque
    seen = set()
    def is_bg(x, y):
        r, g, b, a = data[x, y]
        return a > 0 and r > 232 and g > 232 and b > 232
    q = deque()
    for x in range(w):
        for y_ in (0, h-1):
            if is_bg(x, y_) and (x, y_) not in seen:
                q.append((x, y_)); seen.add((x, y_))
    for y in range(h):
        for x_ in (0, w-1):
            if is_bg(x_, y) and (x_, y) not in seen:
                q.append((x_, y)); seen.add((x_, y))
    while q:
        x, y = q.popleft()
        data[x, y] = (0, 0, 0, 0)
        cleaned += 1
        for dx, dy in ((-1,0),(1,0),(0,-1),(0,1)):
            nx, ny = x+dx, y+dy
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and is_bg(nx, ny):
                q.append((nx, ny)); seen.add((nx, ny))
    im.save(p)
    print(f"{name}: cleaned {cleaned} px")
