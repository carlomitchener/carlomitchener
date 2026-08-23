import math
import os

# GASKET

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, os.pardir, "figures")

F = [(0, 0), (1, 0), (0, 1)]
LEVEL = 5
PAD = 18
CELL = 17
R = 4.0

def points(n):
    pts = [(0, 0)]
    for _ in range(n):
        pts = [(2 * x + f[0], 2 * y + f[1]) for (x, y) in pts for f in F]
    return pts

def svg():
    side = 2 ** LEVEL
    span = (side - 1) * CELL
    w = span + 2 * PAD
    rows = []
    rows.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">' % (w, w, w, w))
    rows.append('<rect x="0" y="0" width="%d" height="%d" fill="none"/>' % (w, w))
    vis = 0
    for (x, y) in points(LEVEL):
        cx = PAD + x * CELL
        cy = PAD + span - y * CELL
        if math.gcd(x, y) == 1:
            vis += 1
            rows.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#111111"/>' % (cx, cy, R))
        else:
            rows.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke="#8a8a8a" stroke-width="1.3"/>' % (cx, cy, R))
    rows.append('</svg>')
    return "\n".join(rows), vis

def main():
    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    text, vis = svg()
    path = os.path.join(OUT, "gasket.svg")
    with open(path, "w") as handle:
        handle.write(text + "\n")
    print("gasket.svg: level %d, %d points, %d visible" % (LEVEL, 3 ** LEVEL, vis))

if __name__ == "__main__":
    main()
