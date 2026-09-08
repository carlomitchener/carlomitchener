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

# PINCER

W = 900
H = 250
X0 = 60
X1 = 840
Y = 96
LOW = 0.4475978
HIGH = 0.640212
WINDOW = CONCEPT["window"]

def px(t):
    return X0 + (X1 - X0) * t

def build():
    p = header(W, H)
    p.append(rect(px(0), Y - 5, px(LOW) - px(0), 10, PALE))
    p.append(rect(px(HIGH), Y - 5, px(1) - px(HIGH), 10, PALE))
    p.append(rect(px(LOW), Y - 5, px(HIGH) - px(LOW), 10, WINDOW))
    p.append(line(px(0), Y, px(1) + 18, Y, INK, 1.5))
    for t, lab in ((0.0, "0"), (1.0, "1")):
        p.append(line(px(t), Y - 14, px(t), Y + 14, INK, 1.5))
        p.append(text(px(t), Y - 22, lab, 15, anchor="middle"))
    for t in (LOW, HIGH):
        p.append(line(px(t), Y - 20, px(t), Y + 20, INK, 2))
    p.append(text(px(0.22), Y - 22, "closed", 15, MUTED, "middle"))
    p.append(text(px(0.82), Y - 22, "closed", 15, MUTED, "middle"))
    p.append(text(px((LOW + HIGH) / 2), Y - 22, "open window", 15, WINDOW, "middle", weight="bold"))
    p.append(text(px(LOW) - 6, Y + 42, "0.4475978", 15, anchor="end"))
    p.append(text(px(LOW) - 6, Y + 60, "moment ladder", 12, MUTED, "end"))
    p.append(text(px(HIGH), Y + 42, "0.640212", 15, anchor="middle"))
    p.append(text(px(HIGH), Y + 60, "burst certificate", 12, MUTED, "middle"))
    for t, lab, dy, anchor in (
        (0.447931, "0.447931  ladder cap, only 0.00034 above the edge", 96, "start"),
        (0.5, "1/2  per-ray wall", 118, "start"),
        (0.605303, "0.605303  supergolden target", 140, "end"),
    ):
        p.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="1" stroke-dasharray="4 4"/>' % (px(t), Y + 12, px(t), Y + dy - 12, PALE))
        off = 6 if anchor == "start" else -6
        p.append(text(px(t) + off, Y + dy, lab, 12, MUTED, anchor))
    p.append(text(px(0.5), 30, "Lemma G, the gasket case: the prime exponent beta = log_3 p / n", 16, anchor="middle", weight="bold"))
    return p

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "..", "figures")
    os.makedirs(out, exist_ok=True)
    save(build(), os.path.join(out, "pincer.svg"))
    print("wrote figures/pincer.svg")

if __name__ == "__main__":
    main()
