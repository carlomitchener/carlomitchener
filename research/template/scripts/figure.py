import os

# STYLE

FONT = "Helvetica,Arial,sans-serif"
# PALETTE
PALETTE = {
    "black": "#000000",
    "white": "#ffffff",
    "red": "#ff3d40",
    "orange": "#ff8f2c",
    "yellow": "#ffd100",
    "green": "#32cc58",
    "mint": "#00d1bb",
    "teal": "#00cad8",
    "cyan": "#1ec9f3",
    "blue": "#008cff",
    "indigo": "#6768fa",
    "purple": "#d332e9",
    "pink": "#ff325a",
    "brown": "#b18462",
    "gray": "#8e8e93",
}
# PALETTE END
INK = PALETTE["black"]
MUTED = PALETTE["gray"]
PALE = "#c6c6c9"
PAPER = PALETTE["white"]
CONCEPT = {"gasket": PALETTE["teal"], "carpet": PALETTE["blue"], "sponge": PALETTE["indigo"], "prime": PALETTE["pink"], "bound": PALETTE["orange"], "window": PALETTE["red"], "control": PALETTE["gray"]}
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

def main():
    width, height = 480, 200
    parts = header(width, height)
    keys = sorted(CONCEPT)
    step = (width - 2 * MARGIN) / len(keys)
    for i, key in enumerate(keys):
        x = MARGIN + i * step
        parts.append(rect(x, MARGIN, step - 8, 40, CONCEPT[key]))
        parts.append(text(x, MARGIN + 56, key, size=9, fill=MUTED))
    parts.append(text(MARGIN, height - MARGIN, "{{TITLE}}", size=12, weight="bold"))
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "figures")
    os.makedirs(out, exist_ok=True)
    save(parts, os.path.join(out, "figure.svg"))
    print("drew figures/figure.svg")

if __name__ == "__main__":
    main()
