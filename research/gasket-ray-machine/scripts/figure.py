import os
from math import gcd

# STYLE

FONT = "Helvetica,Arial,sans-serif"
# PALETTE
INK = "#000000"
MUTED = "#8e8e93"
PALE = "#bababf"
PAPER = "#ffffff"
CONCEPT = {
    "gasket": "#00cad8",
    "carpet": "#008cff",
    "sponge": "#6768fa",
    "prime": "#ff325a",
    "bound": "#ff8f2c",
    "window": "#ff3d40",
    "control": "#8e8e93",
}
PALETTE = {
    "black": "#000000",
    "white": "#ffffff",
    "red": "#ff3d40",
    "red-light": "#ff9d95",
    "red-dark": "#a80016",
    "orange": "#ff8f2c",
    "orange-light": "#ffc093",
    "orange-dark": "#a25400",
    "yellow": "#ffd100",
    "yellow-light": "#ffe591",
    "yellow-dark": "#9e8100",
    "green": "#32cc58",
    "green-light": "#5eee79",
    "green-dark": "#007f2c",
    "mint": "#00d1bb",
    "mint-light": "#48efd8",
    "mint-dark": "#008173",
    "teal": "#00cad8",
    "teal-light": "#48e9f7",
    "teal-dark": "#007c85",
    "cyan": "#1ec9f3",
    "cyan-light": "#86e2ff",
    "cyan-dark": "#007c98",
    "blue": "#008cff",
    "blue-light": "#84bdff",
    "blue-dark": "#00559f",
    "indigo": "#6768fa",
    "indigo-light": "#9ea9ff",
    "indigo-dark": "#3c2abc",
    "purple": "#d332e9",
    "purple-light": "#f08aff",
    "purple-dark": "#870097",
    "pink": "#ff325a",
    "pink-light": "#ff9a9f",
    "pink-dark": "#a50030",
    "brown": "#b18462",
    "brown-light": "#dfaf8c",
    "brown-dark": "#754c2b",
    "gray": "#8e8e93",
    "gray-light": "#bababf",
    "gray-dark": "#56565a",
}
# PALETTE END
STROKE = 1.2
THIN = 0.6
MARGIN = 36

def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def header(width, height):
    return ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">' % (width, height, width, height), '<rect width="%d" height="%d" fill="%s"/>' % (width, height, PAPER)]

def text(x, y, s, size=11, fill=INK, anchor="start", weight=None):
    w = ' font-weight="%s"' % weight if weight else ""
    return '<text x="%.1f" y="%.1f" font-family="%s" font-size="%d" fill="%s" text-anchor="%s"%s>%s</text>' % (x, y, FONT, size, fill, anchor, w, esc(s))

def line(x1, y1, x2, y2, stroke=INK, width=STROKE):
    return '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.1f"/>' % (x1, y1, x2, y2, stroke, width)

def rect(x, y, w, h, fill, opacity=1.0):
    return '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" opacity="%.2f"/>' % (x, y, w, h, fill, opacity)

def circle(x, y, r, fill):
    return '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"/>' % (x, y, r, fill)

def save(parts, path):
    with open(path, "w") as handle:
        handle.write("\n".join(parts + ["</svg>"]) + "\n")

# STYLE END

# RAYS

GASKET = ((0, 0), (1, 0), (0, 1))
SWAP01 = ((0, 1), (1, 0), (2, 2))
RAY = CONCEPT["prime"]
DESIGN = CONCEPT["carpet"]

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
    out = header(w, h)
    span = 3 ** 4
    place = panel(pad, pad + 12, side, span)
    ray = [(3 * k, k) for k in range(1, span // 3 + 1)]
    rayset = set(ray)
    gasket = points(GASKET, 4)
    gasketset = set(gasket)
    out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="1.4" opacity="0.75"/>' % (place(0, 0) + place(span, span / 3) + (RAY,)))
    for (x, y) in gasket:
        cx, cy = place(x, y)
        out.append(rect(cx - 1.6, cy - 1.6, 3.2, 3.2, RAY if (x, y) in rayset else CONCEPT["gasket"]))
    for (x, y) in ray:
        if (x, y) in gasketset:
            cx, cy = place(x, y)
            out.append('<circle cx="%.2f" cy="%.2f" r="4.6" fill="none" stroke="%s" stroke-width="1.4"/>' % (cx, cy, RAY))
    out.append(text(pad, pad + 2, "the gasket, level 4", size=15))
    out.append(text(pad, pad + side + 32, "the ray (3,1) carries 4 points", size=13, fill=RAY))
    x1 = w - pad - side
    span2 = 3 ** 3
    place2 = panel(x1, pad + 12, side, span2)
    pts = sorted(points(SWAP01, 3))
    for (x, y) in pts:
        g = gcd(x, y)
        px, py = x / g, y / g
        scale = span2 / max(px, py)
        out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="0.7" opacity="0.35"/>' % (place2(0, 0) + place2(px * scale, py * scale) + (DESIGN,)))
    for (x, y) in pts:
        cx, cy = place2(x, y)
        out.append(circle(cx, cy, 3.1, DESIGN))
    out.append(text(x1, pad + 2, "a diagonal design, level 3", size=15))
    out.append(text(x1, pad + side + 32, "27 points, 27 rays, no two shared", size=13, fill=DESIGN))
    return out

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "..", "figures")
    os.makedirs(out, exist_ok=True)
    save(svg(), os.path.join(out, "rays.svg"))
    print("wrote figures/rays.svg")

if __name__ == "__main__":
    main()
