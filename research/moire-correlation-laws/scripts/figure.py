import math
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

# CARPETS

def r_carpet(m, n):
    d = math.gcd(m, n)
    top = (d * d - 1) * (2 * (m - 1) * (n - 1) + d * d - 1)
    bot = (m - 1) * (n - 1) * math.sqrt((3 * m - 1) * (m + 1) * (3 * n - 1) * (n + 1))
    return top / bot

def is_prime(n):
    if n < 2:
        return False
    k = 2
    while k * k <= n:
        if n % k == 0:
            return False
        k += 1
    return True

def carpet_svg(lo, hi, cell, pad):
    vals = list(range(lo, hi + 1, 2))
    k = len(vals)
    w = pad + k * cell + 10
    h = pad + k * cell + 10
    out = header(w, h)
    for a, m in enumerate(vals):
        for b, n in enumerate(vals):
            out.append(rect(pad + a * cell, pad + b * cell, cell, cell, CONCEPT["carpet"], r_carpet(m, n) ** 0.45))
    out.append('<rect x="%d" y="%d" width="%d" height="%d" fill="none" stroke="%s" stroke-width="%.1f"/>' % (pad, pad, k * cell, k * cell, MUTED, STROKE))
    for a, m in enumerate(vals):
        if not is_prime(m):
            continue
        x = pad + a * cell + cell / 2.0
        out.append(text(x, pad - 6, str(m), size=9, anchor="middle"))
        out.append(text(pad - 6, x + 3.2, str(m), size=9, anchor="end"))
    return out

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "..", "figures")
    os.makedirs(out, exist_ok=True)
    save(carpet_svg(3, 63, 16, 40), os.path.join(out, "carpet.svg"))
    print("wrote figures/carpet.svg")

if __name__ == "__main__":
    main()
