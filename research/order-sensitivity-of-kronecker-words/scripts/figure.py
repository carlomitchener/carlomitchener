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

# WITNESS

CELL = 22
PAD = 14
GAP = 30

def cells(c):
    return {(i, j) for i in range(2) for j in range(2) if (c >> (i + 2 * j)) & 1}

def product(a, b):
    return {(2 * p[0] + q[0], 2 * p[1] + q[1]) for p in cells(a) for q in cells(b)}

def block(out, x, y, n, filled):
    for i in range(n):
        for j in range(n):
            fx, fy = x + j * CELL, y + i * CELL
            if (i, j) in filled:
                out.append(rect(fx, fy, CELL, CELL, INK))
            else:
                out.append('<rect x="%d" y="%d" width="%d" height="%d" fill="none" stroke="%s" stroke-width="%.1f"/>' % (fx, fy, CELL, CELL, PALE, THIN))
    out.append('<rect x="%d" y="%d" width="%d" height="%d" fill="none" stroke="%s" stroke-width="%.1f"/>' % (x, y, n * CELL, n * CELL, MUTED, STROKE))

def row(out, y, a, b, label):
    block(out, PAD, y + CELL, 2, cells(a))
    out.append(text(PAD + 2 * CELL + 12, y + 2 * CELL + 6, "×", size=17, anchor="middle"))
    x = PAD + 2 * CELL + 24
    block(out, x, y + CELL, 2, cells(b))
    out.append(text(x + 2 * CELL + 12, y + 2 * CELL + 6, "=", size=17, anchor="middle"))
    g = x + 2 * CELL + 24
    block(out, g, y, 4, product(a, b))
    out.append(text(g + 4 * CELL + 14, y + 2 * CELL + 6, label, size=16))

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(here, "..", "figures", "witness.svg")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    width = 2 * PAD + 8 * CELL + 48 + 130
    height = 2 * PAD + 8 * CELL + GAP
    out = header(width, height)
    row(out, PAD, 3, 6, "four pieces")
    row(out, PAD + 4 * CELL + GAP, 6, 3, "two pieces")
    save(out, out_path)
    print("drew figures/witness.svg")

if __name__ == "__main__":
    main()
