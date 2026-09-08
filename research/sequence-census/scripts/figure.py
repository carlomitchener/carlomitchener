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

# DRAW

POLYGONAL = CONCEPT["carpet"]
CENTERED = CONCEPT["sponge"]

PANELS = [
    (1, [(0, 0)], "k^2", "square", "A000290", POLYGONAL),
    (3, [(0, 0), (1, 0)], "2k^2 - k", "hexagonal", "A000384", POLYGONAL),
    (7, [(0, 0), (1, 0), (0, 1)], "3k^2 - 2k", "octagonal", "A000567", POLYGONAL),
    (9, [(0, 0), (1, 1)], "2k^2 - 2k + 1", "centered square", "A001844", CENTERED),
    (11, [(0, 0), (1, 0), (1, 1)], "3k^2 - 3k + 1", "centered hexagonal", "A003215", CENTERED),
    (15, [(0, 0), (1, 0), (0, 1), (1, 1)], "4k^2 - 4k + 1", "centered octagonal", "A016754", CENTERED),
]

def panel(parts, x, y, spec, side, unit):
    number, rule, poly, family, entry, colour = spec
    keep = set(rule)
    for i in range(side):
        for j in range(side):
            cx = x + i * unit
            cy = y + (side - 1 - j) * unit
            if (i & 1, j & 1) in keep:
                shell = max(i, j) >= side - 2
                parts.append(rect(cx, cy, unit - 1, unit - 1, colour, 0.42 if shell else 1.0))
            else:
                parts.append(rect(cx, cy, unit - 1, unit - 1, PALE, 0.55))
    base = y + side * unit
    parts.append(text(x, base + 15, "code %d" % number, size=10, fill=MUTED))
    parts.append(text(x, base + 31, poly, size=12, weight="bold"))
    parts.append(text(x, base + 46, "%s, %s" % (family, entry), size=10, fill=MUTED))

def main():
    side, unit = 5, 20
    slot, lift = 232, 172
    width, height = 2 * MARGIN + 2 * slot + side * unit, 130 + 2 * lift
    parts = header(width, height)
    parts.append(text(MARGIN, 40, "Six designs of the plane, and the classical family each one counts", size=14, weight="bold"))
    parts.append(text(MARGIN, 58, "filled cells at side n = 2k - 1 = 5; the pale ring is the shell the step from k = 2 adds", size=11, fill=MUTED))
    for index, spec in enumerate(PANELS):
        x = MARGIN + (index % 3) * slot
        y = 78 + (index // 3) * lift
        panel(parts, x, y, spec, side, unit)
    foot = height - MARGIN + 6
    parts.append(rect(MARGIN, foot - 10, 11, 11, POLYGONAL))
    parts.append(text(MARGIN + 17, foot, "both coordinates odd: dropped, polygonal", size=11, fill=INK))
    parts.append(rect(MARGIN + 268, foot - 10, 11, 11, CENTERED))
    parts.append(text(MARGIN + 285, foot, "kept, centered polygonal", size=11, fill=INK))
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "figures")
    os.makedirs(out, exist_ok=True)
    save(parts, os.path.join(out, "families.svg"))
    print("drew figures/families.svg")

if __name__ == "__main__":
    main()
