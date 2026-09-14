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

PAIRS = [(45, 105), (61, 121), (78, 102), (94, 118)]

def maps():
    out = []
    for flip in range(2):
        for turn in range(4):
            m = []
            for f in range(9):
                r, c = divmod(f, 3)
                if flip:
                    r, c = c, r
                for _ in range(turn):
                    r, c = c, 2 - r
                m.append(r * 3 + c)
            if m not in out:
                out.append(m)
    return out

def pair_table(side, group):
    cells = side * side
    index = [-1] * (cells * cells)
    count = 0
    for j in range(cells):
        for l in range(j, cells):
            if index[j * cells + l] != -1:
                continue
            for m in group:
                index[m[j] * cells + m[l]] = count
                index[m[l] * cells + m[j]] = count
            count += 1
    return index, count

def big_maps():
    out = []
    for flip in range(2):
        for turn in range(4):
            m = []
            for f in range(81):
                r, c = divmod(f, 9)
                if flip:
                    r, c = c, r
                for _ in range(turn):
                    r, c = c, 8 - r
                m.append(r * 9 + c)
            if m not in out:
                out.append(m)
    return out

def census(points, index, cells, count):
    out = [0] * count
    for a in range(len(points)):
        row = points[a] * cells
        for b in range(a, len(points)):
            out[index[row + points[b]]] += 1
    return out

def kronecker(bits):
    base = [j for j in range(9) if bits >> j & 1]
    return sorted(((p // 3) * 3 + s // 3) * 9 + ((p % 3) * 3 + s % 3) for p in base for s in base)

def grid(x, y, unit, bits):
    parts = []
    for f in range(9):
        r, c = divmod(f, 3)
        fill = CONCEPT["carpet"] if bits >> f & 1 else PAPER
        parts.append(rect(x + c * unit, y + r * unit, unit, unit, fill))
    for k in range(4):
        parts.append(line(x, y + k * unit, x + 3 * unit, y + k * unit, PALE, THIN))
        parts.append(line(x + k * unit, y, x + k * unit, y + 3 * unit, PALE, THIN))
    return parts

def main():
    group = maps()
    index, classes = pair_table(3, group)
    assert classes == 11, classes
    index2, classes2 = pair_table(9, big_maps())
    assert classes2 == 461, classes2
    unit = 16
    width, height = 560, 322
    row = 62
    top = 46
    parts = header(width, height)
    parts.append(text(MARGIN, 26, "Four pairs of designs with the same pair census, and what level 2 sees", size=11, weight="bold"))
    for i, (a, b) in enumerate(PAIRS):
        y = top + i * row
        first = census([j for j in range(9) if a >> j & 1], index, 9, classes)
        second = census([j for j in range(9) if b >> j & 1], index, 9, classes)
        assert first == second, (a, b)
        parts += grid(MARGIN, y, unit, a)
        parts.append(text(MARGIN + 3 * unit + 10, y + 2 * unit - 3, "=", size=14, fill=MUTED))
        parts += grid(MARGIN + 3 * unit + 26, y, unit, b)
        base = MARGIN + 6 * unit + 46
        tall = 3 * unit
        top_count = max(first) or 1
        for c, n in enumerate(first):
            w = 9
            h = tall * n / top_count
            parts.append(rect(base + c * (w + 3), y + tall - h, w, h, CONCEPT["bound"] if n else PALE))
        moved = sum(1 for x, z in zip(census(kronecker(a), index2, 81, classes2), census(kronecker(b), index2, 81, classes2)) if x != z)
        parts.append(line(base - 4, y + tall + 1, base + 11 * 12 - 3, y + tall + 1, PALE, THIN))
        parts.append(line(base + 140, y, base + 140, y + tall + 1, PALE, THIN))
        parts.append(rect(base + 150, y + tall - tall * moved / classes2, 9, tall * moved / classes2, CONCEPT["prime"]))
        parts.append(line(base + 146, y + tall + 1, base + 163, y + tall + 1, PALE, THIN))
        parts.append(text(base + 170, y + tall - 1, "%d of the 461 level-2 counts differ" % moved, size=9, fill=INK))
        parts.append(text(MARGIN, y + tall + 12, "codes %d and %d, fill %d" % (a, b, bin(a).count("1")), size=9, fill=MUTED))
    parts.append(text(MARGIN, height - 12, "left: the two designs. middle: their 11 shared level-1 class counts. right: the level-2 counts that part them.", size=9, fill=MUTED))
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "figures")
    os.makedirs(out, exist_ok=True)
    save(parts, os.path.join(out, "homometric.svg"))
    print("drew figures/homometric.svg, 4 pairs checked against the 11 and 461 class tables")

if __name__ == "__main__":
    main()
