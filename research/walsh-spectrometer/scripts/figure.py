import os

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

# BLINK

DARK = CONCEPT["sponge"]
LIGHT = PALETTE["indigo-light"]

def corners():
    return [(a, b, c) for a in (0, 1) for b in (0, 1) for c in (0, 1)]

def design(code):
    return {p for p in corners() if code >> (4 * p[0] + 2 * p[1] + p[2]) & 1}

def cells(n, code):
    D = design(code)
    ink, paper = [], []
    for x in range(4 * n):
        for y in range(4 * n):
            z = 6 * n - 2 - x - y
            if z < 0 or z >= 4 * n or z % 2:
                continue
            e = ((x // 4) % 2, (y // 4) % 2, (z // 4) % 2)
            (ink if e in D else paper).append(((x - y) // 2, (x + y) // 2))
    return ink, paper

def panel(n, code, ox, oy, s):
    ink, paper = cells(n, code)
    us = [u for u, v in ink + paper]
    vs = [v for u, v in ink + paper]
    umin, vmax = min(us), max(vs)
    out = []
    for group, fill in ((paper, LIGHT), (ink, DARK)):
        for u, v in group:
            out.append(rect(ox + (u - umin) * s, oy + (vmax - v) * s, s, s, fill))
    w = (max(us) - umin + 1) * s
    hgt = (vmax - min(vs) + 1) * s
    out.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="none" stroke="%s" stroke-width="%.1f"/>' % (ox, oy, w, hgt, MUTED, THIN))
    return out, w, hgt

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    figs = os.path.join(here, os.pardir, "figures")
    os.makedirs(figs, exist_ok=True)
    s = 7.0
    left, w1, h1 = panel(5, 105, 40.0, 34.0 + 2.0 * s, s)
    right, w2, h2 = panel(7, 105, 40.0 + w1 + 74.0, 34.0, s)
    body = left + right
    labels = [(40.0 + w1 / 2, "n = 5", "ink 114 of 150 = 19/25"), (40.0 + w1 + 74.0 + w2 / 2, "n = 7", "ink 72 of 294 = 12/49")]
    for cx, top, bot in labels:
        body.append(text(cx, 24, top, size=13, anchor="middle"))
        body.append(text(cx, 34.0 + max(h1, h2) + 20.0, bot, size=11, anchor="middle"))
    body.append(text(40.0 + w1 + 37.0 + w2 / 2, 34.0 + max(h1, h2) + 42.0, "one design, two phases: the blink is exactly minus half the top Walsh coefficient", size=12, anchor="middle"))
    width = 40.0 + w1 + 74.0 + w2 + 40.0
    height = 34.0 + max(h1, h2) + 58.0
    save(header(width, height) + body, os.path.join(figs, "blink.svg"))
    print("figures/blink.svg: %d by %d" % (width, height))

if __name__ == "__main__":
    main()
