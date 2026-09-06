import math
import os

# STYLE

FONT = "Helvetica,Arial,sans-serif"
INK = "#1a1a1a"
MUTED = "#5b6470"
PALE = "#d5d9e0"
PAPER = "#ffffff"
CONCEPT = {
    "gasket": "#0e7c7b",
    "carpet": "#4059ad",
    "sponge": "#6b4fa0",
    "prime": "#8f2d56",
    "bound": "#d9820f",
    "window": "#c23b22",
    "control": "#9aa3ad",
}
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

MASS = CONCEPT["control"]
COST = CONCEPT["bound"]
CROSSING = CONCEPT["window"]

GAMMA = 0.5772156649015328606065120900824024310421
WALL = 3690
LO, HI = 2.0, 9.0
FLOOR, CEIL = 0.86, 1.14

def harmonic(n):
    return math.log(n) + GAMMA + 1.0 / (2 * n)

def proved(q):
    n = -((-(q - 2)) // 2)
    phi = (4 / math.pi) * q + (2 * q / math.pi) * harmonic(n) + (1 - 2 / math.pi) * (q - 2) + 0.727
    return 1.0 + phi / q

def mass(q):
    return math.log(q - 1) / math.log(q)

def cost(q):
    return 0.75 + math.log(proved(q)) / math.log(q)

def samples(f, steps=112):
    out = []
    for i in range(steps + 1):
        x = LO + (HI - LO) * i / steps
        out.append((x, f(int(round(10 ** x)))))
    return out

def main():
    width, height = 640, 300
    left, right = MARGIN + 28, width - MARGIN
    top, bottom = MARGIN - 6, height - MARGIN - 8
    parts = header(width, height)

    def at(x, y):
        return (left + (right - left) * (x - LO) / (HI - LO), bottom - (bottom - top) * (y - FLOOR) / (CEIL - FLOOR))

    curve_mass = samples(mass)
    curve_cost = samples(cost)
    wall = math.log10(WALL)
    band = [at(*p) for p in curve_cost if p[0] >= wall]
    band = [at(wall, mass(WALL))] + band + [at(HI, mass(int(10 ** HI)))]
    band += [at(*p) for p in reversed([p for p in curve_mass if p[0] >= wall])]
    parts.append('<polygon points="%s" fill="%s" opacity="0.14"/>' % (" ".join("%.1f,%.1f" % p for p in band), COST))

    parts.append(line(left, bottom, right, bottom, PALE, THIN))
    parts.append(line(left, top, left, bottom, PALE, THIN))
    for e in range(2, 10):
        x, y = at(e, FLOOR)
        parts.append(line(x, y, x, y + 4, PALE, THIN))
        parts.append(text(x, y + 16, "1e%d" % e, size=9, fill=MUTED, anchor="middle"))
    for v in (0.90, 1.00, 1.10):
        x, y = at(LO, v)
        parts.append(line(x - 4, y, x, y, PALE, THIN))
        parts.append(text(x - 8, y + 3, "%.2f" % v, size=9, fill=MUTED, anchor="end"))

    xw, _ = at(wall, FLOOR)
    parts.append(line(xw, top, xw, bottom, CROSSING, THIN))
    parts.append(text(xw + 5, top + 10, "q = 3690", size=9, fill=CROSSING))

    for series, colour in ((curve_mass, MASS), (curve_cost, COST)):
        pts = " ".join("%.1f,%.1f" % at(*p) for p in series)
        parts.append('<polyline points="%s" fill="none" stroke="%s" stroke-width="%.1f"/>' % (pts, colour, STROKE))

    parts.append(circle(*at(wall, mass(WALL)), 3.0, INK))
    parts.append(text(at(6.3, 1.030)[0], at(6.3, 1.030)[1], "mass exponent", size=10, fill=MASS))
    parts.append(text(at(6.3, 0.895)[0], at(6.3, 0.895)[1], "cost exponent", size=10, fill=COST))

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "figures")
    os.makedirs(out, exist_ok=True)
    save(parts, os.path.join(out, "figure.svg"))
    print("drew figures/figure.svg")

if __name__ == "__main__":
    main()
