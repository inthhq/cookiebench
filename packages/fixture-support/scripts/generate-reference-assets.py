"""Generate CookieBench's original courtyard illustration and article catalog.

Standard-library only. Fixed geometry and seed make the checked-in bytes repeatable.
The image is a rendered scene; there is no padding or artificial request delay.
"""
import hashlib
import json
import pathlib
import random
import struct
import zlib

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'assets'
WIDTH, HEIGHT = 1200, 640
randomizer = random.Random(20260927)
pixels = bytearray(WIDTH * HEIGHT * 3)
for y in range(HEIGHT):
    for x in range(WIDTH):
        color = (215, 228, 220) if y < 380 else (175, 185, 162)
        if x < 355 and y > 95:
            color = (173, 118, 93)
            if y % 28 < 2 or (x + (14 if (y // 28) % 2 else 0)) % 56 < 2:
                color = (196, 156, 126)
        if x > 835 and y > 35:
            color = (189, 151, 116)
            if y % 32 < 2 or (x + (16 if (y // 32) % 2 else 0)) % 64 < 2:
                color = (204, 175, 143)
        if y > 285 and abs(x - 600) < (y - 285) * 0.62 + 25:
            color = (221, 216, 195)
        for tx, ty, radius in [(295, 250, 130), (855, 270, 148), (715, 327, 75)]:
            if abs(x - tx) < 10 and ty < y < 515:
                color = (102, 90, 68)
            if (x - tx) ** 2 + (y - ty) ** 2 < radius ** 2:
                color = (65, 97, 67)
        for wx in [45, 160, 275, 875, 1010, 1130]:
            for wy in [165, 270]:
                if wx < x < wx + 45 and wy < y < wy + 64:
                    color = (71, 87, 81)
        if 410 < x < 515 and 470 < y < 488 or 715 < x < 820 and 475 < y < 493:
            color = (118, 86, 59)
        # Fine paper grain belongs to the illustration and avoids flat-color banding.
        grain = randomizer.randrange(-4, 5)
        offset = (y * WIDTH + x) * 3
        pixels[offset:offset + 3] = bytes(max(0, min(255, value + grain)) for value in color)

def chunk(name, data):
    return struct.pack('>I', len(data)) + name + data + struct.pack('>I', zlib.crc32(name + data))

rows = b''.join(b'\x00' + pixels[y * WIDTH * 3:(y + 1) * WIDTH * 3] for y in range(HEIGHT))
image = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', WIDTH, HEIGHT, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(rows, 9)) + chunk(b'IEND', b'')
(ROOT / 'courtyard.png').write_bytes(image)
places = ['Courtyard', 'Market', 'Library', 'River walk', 'Pocket park', 'Station square']
articles = [dict(id=f'story-{index:03}', title=f'{places[index % len(places)]}: field note {index + 1}', topic=['Architecture', 'Walking', 'Community'][index % 3], minutes=3 + index % 9, description='A short route through shared spaces, with observations about seating, shade, access, and the people who use them.') for index in range(120)]
(ROOT / 'reading-list.json').write_text(json.dumps(articles, separators=(',', ':')) + '\n')
manifest = {'revision': 'article-workload-v1', 'image': {'file': 'courtyard.png', 'width': WIDTH, 'height': HEIGHT, 'author': 'CookieBench contributors', 'license': 'CC0-1.0', 'source': 'scripts/generate-reference-assets.py', 'seed': 20260927}, 'assets': {}}
for name in ['courtyard.png', 'reading-list.json', 'reading-list.js']:
    file = ROOT / name
    if file.exists():
        data = file.read_bytes()
        manifest['assets'][name] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
(ROOT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
