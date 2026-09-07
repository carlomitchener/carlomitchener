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

Q = 21
DIGITS = (0, 10)
SAMPLES = 1800
TIKZ = 900

def hat(q, a0, t):
    d = math.sin(math.pi * q * t) / math.sin(math.pi * t)
    e = d * d - 2.0 * d * math.cos(math.pi * (2 * a0 - q + 1) * t) + 1.0
    return math.sqrt(e) / (q - 1) if e > 0.0 else 0.0

def cap(q, t):
    d = abs(math.sin(math.pi * q * t) / math.sin(math.pi * t))
    return min(1.0, (d + 1.0) / (q - 1))

def samples(n):
    return [0.5 * (j + 0.5) / n for j in range(n)]

def curves(n):
    ts = samples(n)
    rows = [("majorant", [cap(Q, t) for t in ts])]
    for a0 in DIGITS:
        rows.append((f"digit {a0}", [hat(Q, a0, t) for t in ts]))
    return ts, rows

def svg(path):
    width, height = 640, 280
    left, right, top, foot = MARGIN + 4, width - MARGIN - 96, MARGIN - 12, height - MARGIN
    parts = header(width, height)
    ts, rows = curves(SAMPLES)
    place = lambda t, v: (left + (right - left) * (t / 0.5), foot - (foot - top) * v)
    parts.append(line(left, foot, right, foot, PALE, THIN))
    parts.append(line(left, top, left, foot, PALE, THIN))
    parts.append(line(left, top, right, top, PALE, THIN))
    keys = (CONCEPT["bound"], CONCEPT["gasket"], CONCEPT["carpet"])
    for (_, values), color in zip(rows, keys):
        pts = " ".join("%.2f,%.2f" % place(t, v) for t, v in zip(ts, values))
        parts.append('<polyline points="%s" fill="none" stroke="%s" stroke-width="%.1f"/>' % (pts, color, STROKE))
    labels = ("majorant u_q", "|F| missing 0", "|F| missing 10")
    for i, (text_line, color) in enumerate(zip(labels, keys)):
        y = top + 18 + 18 * i
        parts.append(line(right + 12, y - 4, right + 30, y - 4, color, STROKE))
        parts.append(text(right + 36, y, text_line, size=10, fill=color))
    parts.append(text(left, foot + 16, "0", size=9, fill=MUTED))
    parts.append(text(right, foot + 16, "1/2", size=9, fill=MUTED, anchor="end"))
    parts.append(text(left - 6, top + 4, "1", size=9, fill=MUTED, anchor="end"))
    parts.append(text(left, top - 8, "base 21, one digit removed", size=11, weight="bold"))
    save(parts, path)

def tikz(path):
    ts, rows = curves(TIKZ)
    names = ("bound", "gasket", "carpet")
    body = ["\\begin{tikzpicture}[x=23cm,y=4.4cm]"]
    for key in names:
        body.append("\\definecolor{tone%s}{HTML}{%s}" % (key, CONCEPT[key][1:].upper()))
    body.append("\\draw[gray!45,line width=0.3pt] (0,0) rectangle (0.5,1);")
    for (_, values), key in zip(rows, names):
        pts = " ".join("(%.5f,%.5f)" % (t, v) for t, v in zip(ts, values))
        body.append("\\draw[tone%s,line width=0.4pt] plot coordinates {%s};" % (key, pts))
    body.append("\\node[anchor=north] at (0,0) {\\footnotesize $0$};")
    body.append("\\node[anchor=north] at (0.5,0) {\\footnotesize $\\tfrac12$};")
    body.append("\\node[anchor=east] at (0,1) {\\footnotesize $1$};")
    body.append("\\end{tikzpicture}")
    with open(path, "w") as handle:
        handle.write("\n".join(body) + "\n")

def main():
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "figures")
    os.makedirs(out, exist_ok=True)
    svg(os.path.join(out, "figure.svg"))
    tikz(os.path.join(out, "lemma.tex"))
    print("drew figures/figure.svg and figures/lemma.tex")

if __name__ == "__main__":
    main()
