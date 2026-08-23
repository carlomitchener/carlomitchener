import os
from math import gcd

# RAYS

GASKET = ((0, 0), (1, 0), (0, 1))
SWAP01 = ((0, 1), (1, 0), (2, 2))


def points(design, level):
    pts = [(0, 0)]
    for i in range(level):
        p = 3 ** i
        pts = [(x + dx * p, y + dy * p) for (x, y) in pts for (dx, dy) in design]
    return pts


def panel(x0, y0, side, span):
    def place(x, y):
        return (x0 + side * x / span, y0 + side - side * y / span)
    return place


def svg():
    w, h, side = 760, 400, 300
    pad = 34
    out = []
    out.append('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d" font-family="Georgia, serif">' % (w, h, w, h))
    out.append('<rect width="%d" height="%d" fill="#fbfaf7"/>' % (w, h))

    span = 3 ** 4
    place = panel(pad, pad + 12, side, span)
    ray = [(3 * k, k) for k in range(1, span // 3 + 1)]
    rayset = set(ray)
    out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#c8462f" stroke-width="1.4" opacity="0.75"/>'
               % (place(0, 0) + place(span, span / 3)))
    for (x, y) in points(GASKET, 4):
        cx, cy = place(x, y)
        hit = (x, y) in rayset
        out.append('<rect x="%.2f" y="%.2f" width="3.2" height="3.2" fill="%s"/>'
                   % (cx - 1.6, cy - 1.6, "#c8462f" if hit else "#4a4a48"))
    for (x, y) in ray:
        if (x, y) in set(points(GASKET, 4)):
            cx, cy = place(x, y)
            out.append('<circle cx="%.2f" cy="%.2f" r="4.6" fill="none" stroke="#c8462f" stroke-width="1.4"/>' % (cx, cy))
    out.append('<text x="%.1f" y="%.1f" font-size="15" fill="#2b2b29">the gasket, level 4</text>' % (pad, pad + 2))
    out.append('<text x="%.1f" y="%.1f" font-size="13" fill="#7a4034">the ray (3,1) carries 4 points</text>'
               % (pad, pad + side + 32))

    x1 = w - pad - side
    span2 = 3 ** 3
    place2 = panel(x1, pad + 12, side, span2)
    pts = sorted(points(SWAP01, 3))
    for (x, y) in pts:
        g = gcd(x, y)
        px, py = x / g, y / g
        scale = span2 / max(px, py)
        out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#2f5fa8" stroke-width="0.7" opacity="0.35"/>'
                   % (place2(0, 0) + place2(px * scale, py * scale)))
    for (x, y) in pts:
        cx, cy = place2(x, y)
        out.append('<circle cx="%.2f" cy="%.2f" r="3.1" fill="#2f5fa8"/>' % (cx, cy))
    out.append('<text x="%.1f" y="%.1f" font-size="15" fill="#2b2b29">a diagonal design, level 3</text>' % (x1, pad + 2))
    out.append('<text x="%.1f" y="%.1f" font-size="13" fill="#2f5fa8">27 points, 27 rays, no two shared</text>'
               % (x1, pad + side + 32))
    out.append('</svg>')
    return "\n".join(out)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "..", "figures")
    if not os.path.isdir(out):
        os.makedirs(out)
    target = os.path.join(out, "rays.svg")
    with open(target, "w") as f:
        f.write(svg())
    print("wrote figures/rays.svg")


if __name__ == "__main__":
    main()
