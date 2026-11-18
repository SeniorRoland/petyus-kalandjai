"""A böngészőfül ikonja: pixel-art focilabda narancs képregény-csempén (32×32-es rács).
A labda mintája valódi geometria: középen egy ötszög, körülötte öt (a perem által levágott) ötszög és a varratok.
Kimenet: public/favicon.svg, public/favicon-32.png, public/apple-touch-icon.png
Használat: python tools/ikon/make_icon.py   (Pillow kell hozzá – a modell-pipeline requirements-ében benne van)"""
import os
from math import atan2, cos, hypot, pi, sin
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.abspath(os.path.join(HERE, '..', '..', 'public'))
N = 32
COL = {
    'O': '#151515',   # outline (comic black)
    'o': '#ff7a3d',   # tile (the game's accent orange)
    'y': '#ffd166',   # tile highlight
    'w': '#ffffff',   # ball
    'g': '#c9ced6',   # ball shade
    'k': '#151515',   # ball rim, patches, seams
}
BX, BY, R = 16.0, 16.5, 12.2          # the ball
PC, PO, DO = 3.7, 3.1, 10.6           # centre pentagon radius, outer pentagon radius, their distance from the centre

def pentagon(cx, cy, r, rot):
    return [(cx + r * cos(rot + i * 2 * pi / 5), cy + r * sin(rot + i * 2 * pi / 5)) for i in range(5)]

def inside(poly, x, y):
    c = False
    for i in range(len(poly)):
        (x1, y1), (x2, y2) = poly[i], poly[(i + 1) % len(poly)]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c

def seg_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L))
    return hypot(px - (ax + dx * t), py - (ay + dy * t))

def grid():
    up = -pi / 2
    centre = pentagon(BX, BY, PC, up)                       # point up
    outer = []
    for i in range(5):                                      # one opposite each edge of the centre pentagon
        a = up + pi / 5 + i * 2 * pi / 5
        outer.append(pentagon(BX + DO * cos(a), BY + DO * sin(a), PO, a + pi))   # pointing at the centre
    seams = [(centre[i], (BX + R * cos(up + i * 2 * pi / 5), BY + R * sin(up + i * 2 * pi / 5))) for i in range(5)]
    g = [['.'] * N for _ in range(N)]
    for y in range(N):
        for x in range(N):
            px, py = x + 0.5, y + 0.5
            # rounded tile, 2 px black outline, highlight in the top-left
            cx, cy = min(px, N - px), min(py, N - py)
            rr = 6.0
            if cx < rr and cy < rr and hypot(rr - cx, rr - cy) > rr:
                continue
            edge = cx < 2 or cy < 2 or (cx < rr and cy < rr and hypot(rr - cx, rr - cy) > rr - 2)
            if edge:
                g[y][x] = 'O'; continue
            g[y][x] = 'y' if px + py < 15 else 'o'
            d = hypot(px - BX, py - BY)
            if d > R:
                continue
            if d > R - 1.6:
                g[y][x] = 'k'; continue                          # rim
            c = 'g' if (px - BX) * 0.7 + (py - BY) > 6.5 else 'w'   # shade bottom-right
            if inside(centre, px, py) or any(inside(p, px, py) for p in outer):
                c = 'k'
            elif any(seg_dist(px, py, a[0], a[1], b[0], b[1]) < 0.5 for a, b in seams if hypot(px - BX, py - BY) < DO - 1.2):
                c = 'k'
            g[y][x] = c
    return g

def write_svg(g, path):
    rects = []
    for y, row in enumerate(g):
        x = 0
        while x < N:   # merge runs of the same colour on a row
            c = row[x]
            if c == '.':
                x += 1; continue
            w = 1
            while x + w < N and row[x + w] == c:
                w += 1
            rects.append(f'<rect x="{x}" y="{y}" width="{w}" height="1" fill="{COL[c]}"/>')
            x += w
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {N} {N}" shape-rendering="crispEdges">'
           + ''.join(rects) + '</svg>\n')
    open(path, 'w', encoding='utf-8').write(svg)

def to_image(g):
    img = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for y, row in enumerate(g):
        for x, c in enumerate(row):
            if c != '.':
                h = COL[c].lstrip('#'); img.putpixel((x, y), tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,))
    return img

def write_png(g, path, size, pad=0):
    img = to_image(g); inner = size - 2 * pad
    big = img.resize((inner, inner), Image.NEAREST if inner % N == 0 else Image.LANCZOS)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0) if pad == 0 else (255, 209, 102, 255))
    out.paste(big, (pad, pad), big)
    out.save(path)

if __name__ == '__main__':
    g = grid()
    write_svg(g, os.path.join(PUBLIC, 'favicon.svg'))
    write_png(g, os.path.join(PUBLIC, 'favicon-32.png'), 32)
    write_png(g, os.path.join(PUBLIC, 'apple-touch-icon.png'), 180, pad=10)   # iOS: no transparency, a little margin
    # web app (PWA) icons for manifest.webmanifest: plenty of margin, so they also work as „maskable” (round/squircle crops)
    write_png(g, os.path.join(PUBLIC, 'icon-192.png'), 192, pad=26)
    write_png(g, os.path.join(PUBLIC, 'icon-512.png'), 512, pad=70)
    for row in g:
        print(''.join(row))
    print('kész: public/favicon.svg, favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png')
