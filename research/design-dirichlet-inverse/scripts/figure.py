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

# DATA

Q = 3
K = 2
ALPHA = math.log(K) / math.log(Q)
PERIOD = 2.0 * math.pi / math.log(Q)
RHO = (0.720790, 28.605680)
BOX = (0.72074, 0.72084, 28.60563, 28.60573)
BAND = (22.01, 24.01)
BAND_RIGHT = 3.02
CONTROL_ABSCISSA = 1.0
CONTROL_LINE = 0.5
CONTROL_ORDINATES = [14.1347251417, 21.0220396388, 25.0108575801, 30.4248761259, 32.9350615877, 37.5861781588]
TOP = 40.0
LEFT_PAD = 0.60
RIGHT_PAD = 0.90

def poles(top):
    return [j * PERIOD for j in range(int(top / PERIOD) + 1)]

# DRAW

def panel(parts, x0, y0, w, h, abscissa, marks, bands, comb, box):
    lo, hi = abscissa - LEFT_PAD, abscissa + RIGHT_PAD
    def px(re):
        return x0 + w * (min(max(re, lo), hi) - lo) / (hi - lo)
    def py(im):
        return y0 + h - h * im / TOP
    parts.append(rect(px(abscissa), y0, x0 + w - px(abscissa), h, PALE, 0.45))
    for band in bands:
        parts.append(rect(px(abscissa), py(band[1]), x0 + w - px(abscissa), py(band[0]) - py(band[1]), CONCEPT["window"], 0.30))
    parts.append(line(px(abscissa), y0, px(abscissa), y0 + h, CONCEPT["carpet"], STROKE))
    for im in comb:
        parts.append(circle(px(abscissa), py(im), 2.6, CONCEPT["carpet"]))
    if box is not None:
        r0, r1, i0, i1 = box
        side = 11.0
        cx, cy = px(0.5 * (r0 + r1)), py(0.5 * (i0 + i1))
        parts.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="none" stroke="%s" stroke-width="%.1f"/>' % (cx - side / 2, cy - side / 2, side, side, CONCEPT["window"], THIN))
    for re, im, ink in marks:
        parts.append(circle(px(re), py(im), 4.2, ink))
    parts.append(line(x0, y0 + h, x0 + w, y0 + h, PALE, THIN))
    return px, py

def svg(out):
    width, height = 520, 470
    parts = header(width, height)
    w = 190
    h = height - 2 * MARGIN - 46
    y0 = MARGIN + 20
    left = MARGIN + 24
    right = left + w + 62
    comb = poles(TOP)
    panel(parts, left, y0, w, h, ALPHA, [(RHO[0], RHO[1], CONCEPT["window"])], [BAND], comb, BOX)
    panel(parts, right, y0, w, h, CONTROL_ABSCISSA, [(CONTROL_LINE, g, CONCEPT["control"]) for g in CONTROL_ORDINATES], [], [0.0], None)
    parts.append(text(left, MARGIN + 10, "base 3, digits {0,1}", size=10, weight="bold"))
    parts.append(text(right, MARGIN + 10, "base 2, every digit", size=10, weight="bold"))
    parts.append(text(left, y0 + h + 16, "abscissa 0.630930, 2 zeros to the right", size=9, fill=MUTED))
    parts.append(text(right, y0 + h + 16, "abscissa 1, none to the right", size=9, fill=MUTED))
    parts.append(text(left, y0 + h + 30, "poles on the abscissa, period 5.719202", size=9, fill=MUTED))
    parts.append(text(right, y0 + h + 30, "6 zeros on Re s = 1/2, all to the left", size=9, fill=MUTED))
    parts.append(text(MARGIN, y0 - 6, "Im s = %g" % TOP, size=8, fill=MUTED, anchor="start"))
    parts.append(text(MARGIN, y0 + h + 3, "Im s = 0", size=8, fill=MUTED, anchor="start"))
    save(parts, out)

# TIKZ

def tikz(out):
    xs, ys = 2.55, 0.168
    gap = 0.75
    lines = []
    lines.append("\\begin{tikzpicture}[x=1cm,y=1cm]")
    lines.append("\\definecolor{lane}{HTML}{4059AD}")
    lines.append("\\definecolor{hit}{HTML}{C23B22}")
    lines.append("\\definecolor{ctl}{HTML}{9AA3AD}")
    lines.append("\\definecolor{pale}{HTML}{D5D9E0}")
    span = (LEFT_PAD + RIGHT_PAD) * xs
    for idx, (abscissa, marks, bands, comb, box, title, note) in enumerate([
        (ALPHA, [RHO], [BAND], poles(TOP), BOX, "base $3$, digits $\\{0,1\\}$", "$\\alpha = 0.630930$"),
        (CONTROL_ABSCISSA, [(CONTROL_LINE, g) for g in CONTROL_ORDINATES], [], [0.0], None, "base $2$, every digit", "$\\alpha = 1$"),
    ]):
        ox = idx * (span + gap)
        lo = abscissa - LEFT_PAD
        def px(re):
            return ox + (min(max(re, lo), abscissa + RIGHT_PAD) - lo) * xs
        def py(im):
            return im * ys
        lines.append("\\fill[pale,opacity=0.45] (%.3f,%.3f) rectangle (%.3f,%.3f);" % (px(abscissa), 0.0, ox + span, py(TOP)))
        for band in bands:
            lines.append("\\fill[hit,opacity=0.25] (%.3f,%.3f) rectangle (%.3f,%.3f);" % (px(abscissa), py(band[0]), ox + span, py(band[1])))
        lines.append("\\draw[lane,thick] (%.3f,%.3f) -- (%.3f,%.3f);" % (px(abscissa), -0.12, px(abscissa), py(TOP) + 0.12))
        for im in comb:
            lines.append("\\fill[lane] (%.3f,%.3f) circle (0.045);" % (px(abscissa), py(im)))
        if box is not None:
            r0, r1, i0, i1 = box
            cx, cy = px(0.5 * (r0 + r1)), py(0.5 * (i0 + i1))
            lines.append("\\draw[hit,thin] (%.3f,%.3f) rectangle (%.3f,%.3f);" % (cx - 0.13, cy - 0.13, cx + 0.13, cy + 0.13))
        ink = "hit" if idx == 0 else "ctl"
        for re, im in marks:
            lines.append("\\fill[%s] (%.3f,%.3f) circle (0.075);" % (ink, px(re), py(im)))
        lines.append("\\draw[black!45] (%.3f,%.3f) -- (%.3f,%.3f);" % (ox, 0.0, ox + span, 0.0))
        lines.append("\\node[anchor=south west,font=\\scriptsize] at (%.3f,%.3f) {%s};" % (ox, py(TOP) + 0.30, title))
        lines.append("\\node[anchor=north west,font=\\scriptsize] at (%.3f,%.3f) {%s};" % (ox, -0.22, note))
    for im in (0, 10, 20, 30, 40):
        lines.append("\\node[anchor=east,font=\\scriptsize] at (%.3f,%.3f) {$%d$};" % (-0.12, im * ys, im))
    lines.append("\\node[anchor=east,font=\\scriptsize,rotate=90] at (%.3f,%.3f) {$\\operatorname{Im} s$};" % (-0.62, 0.5 * py(TOP)))
    lines.append("\\end{tikzpicture}")
    with open(out, "w") as handle:
        handle.write("\n".join(lines) + "\n")

def main():
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "figures")
    os.makedirs(out, exist_ok=True)
    assert len(poles(TOP)) == 7, "pole comb below Im 40 should hold 7 points"
    assert ALPHA < RHO[0] < ALPHA + BAND_RIGHT, "the certified zero must sit right of the abscissa"
    assert BOX[0] < RHO[0] < BOX[1] and BOX[2] < RHO[1] < BOX[3], "the certified zero must sit inside its box"
    assert len(CONTROL_ORDINATES) == 6, "six ordinates of zeta below Im 40"
    svg(os.path.join(out, "figure.svg"))
    tikz(os.path.join(out, "zeros.tex"))
    print("drew figures/figure.svg and figures/zeros.tex")

if __name__ == "__main__":
    main()
