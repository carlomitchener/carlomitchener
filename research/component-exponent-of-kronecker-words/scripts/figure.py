import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import verify as V

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

CELL = 20
PLATE = 17
SAT = CONCEPT["bound"]
SHORT = CONCEPT["window"]
EXACT = CONCEPT["control"]
REFUTED = CONCEPT["carpet"]

def cells(word):
    rows, wide = V.grid(word)
    return [(i, j) for i, row in enumerate(rows) for j in range(wide) if (row >> j) & 1], wide

def board(parts, x, y, word):
    filled, wide = cells(word)
    have = set(filled)
    for i in range(wide):
        for j in range(wide):
            px, py = x + j * CELL, y + i * CELL
            if (i, j) in have:
                parts.append(rect(px, py, CELL, CELL, INK))
            else:
                parts.append('<rect x="%.1f" y="%.1f" width="%d" height="%d" fill="none" stroke="%s" stroke-width="%.1f"/>' % (px, py, CELL, CELL, PALE, THIN))
    parts.append('<rect x="%.1f" y="%.1f" width="%d" height="%d" fill="none" stroke="%s" stroke-width="%.1f"/>' % (x, y, wide * CELL, wide * CELL, MUTED, STROKE))
    return wide * CELL

def witness(parts, x, y, left, right):
    top = y + CELL
    width = board(parts, x, top, [left])
    parts.append(text(x + width + 11, top + CELL + 5, "\u00d7", size=15, anchor="middle"))
    step = x + width + 22
    board(parts, step, top, [right])
    parts.append(text(step + width + 11, top + CELL + 5, "=", size=15, anchor="middle"))
    end = step + width + 22
    span = board(parts, end, y, [left, right])
    pieces = V.drawn([left, right])
    parts.append(text(end + span + 12, y + 2 * CELL + 5, "%d %s" % (pieces, "piece" if pieces == 1 else "pieces"), size=12))
    return pieces

def verdicts():
    sat, phi = {}, {}
    for a, b in V.PAIRS:
        wa, wb = V.rate_weight(a, b)
        sat[(a, b)] = (wa, wb) == (V.fill_weight(a), V.fill_weight(b))
        phi[(a, b)] = (wa, wb) == (V.phi_weight(a), V.phi_weight(b))
    return sat, phi

def ledger(parts, x, y):
    sat, phi = verdicts()
    codes = V.CODES
    for i, a in enumerate(codes):
        parts.append(text(x - 6, y + i * PLATE + PLATE - 5, str(a), size=8, fill=MUTED, anchor="end"))
        parts.append(text(x + i * PLATE + PLATE / 2, y - 6, str(a), size=8, fill=MUTED, anchor="middle"))
    for i, a in enumerate(codes):
        for j, b in enumerate(codes):
            px, py = x + j * PLATE, y + i * PLATE
            if a == b:
                parts.append(rect(px, py, PLATE - 1, PLATE - 1, PALE, 0.55))
                continue
            key = (min(a, b), max(a, b))
            if j > i:
                parts.append(rect(px, py, PLATE - 1, PLATE - 1, EXACT if phi[key] else REFUTED))
            else:
                parts.append(rect(px, py, PLATE - 1, PLATE - 1, SAT if sat[key] else SHORT))
    return sum(1 for v in sat.values() if v), sum(1 for v in phi.values() if v)

def key(parts, x, y, swatch, label):
    parts.append(rect(x, y, 11, 11, swatch))
    parts.append(text(x + 17, y + 9, label, size=10, fill=MUTED))

def main():
    width, height = 620, 600
    parts = header(width, height)
    parts.append(text(MARGIN, 26, "One multiset, two orders", size=12, weight="bold"))
    first = witness(parts, MARGIN, 40, 3, 6)
    second = witness(parts, MARGIN, 40 + 5 * CELL, 6, 3)
    parts.append(text(MARGIN, 40 + 9 * CELL + 22, "Four black cells either way; %d pieces above, %d below." % (first, second), size=10, fill=MUTED))
    base = 40 + 10 * CELL + 42
    parts.append(text(MARGIN, base - 22, "All 105 two-letter alphabets", size=12, weight="bold"))
    saturating, exact = ledger(parts, MARGIN + 16, base)
    legend = base + 15 * PLATE + 26
    key(parts, MARGIN, legend, SAT, "lower left: exponent meets the fill ceiling (%d)" % saturating)
    key(parts, MARGIN, legend + 18, SHORT, "lower left: falls short (%d)" % (105 - saturating))
    key(parts, MARGIN + 300, legend, EXACT, "upper right: the constant-word rule holds (%d)" % exact)
    key(parts, MARGIN + 300, legend + 18, REFUTED, "upper right: the constant-word rule is refuted (%d)" % (105 - exact))
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "figures")
    os.makedirs(out, exist_ok=True)
    save(parts, os.path.join(out, "ledger.svg"))
    plates(os.path.join(out, "plates.tex"))
    print("drew figures/ledger.svg and figures/plates.tex")

# TIKZ

def tikz_board(lines, x, y, word, unit):
    filled, wide = cells(word)
    have = set(filled)
    for i in range(wide):
        for j in range(wide):
            px, py = x + j * unit, y + (wide - 1 - i) * unit
            shade = "black!84" if (i, j) in have else "white"
            lines.append("\\fill[%s] (%.2f,%.2f) rectangle ++(%.2f,%.2f);" % (shade, px, py, unit, unit))
    lines.append("\\draw[black!22,line width=0.2pt,step=%.2f] (%.2f,%.2f) grid ++(%.2f,%.2f);" % (unit, x, y, wide * unit, wide * unit))
    lines.append("\\draw[black!55,line width=0.4pt] (%.2f,%.2f) rectangle ++(%.2f,%.2f);" % (x, y, wide * unit, wide * unit))
    return wide * unit

def tikz_witness(lines, x, y, left, right, unit):
    top = y + unit
    width = tikz_board(lines, x, top, [left], unit)
    lines.append("\\node at (%.2f,%.2f) {$\\otimes$};" % (x + width + 0.45, top + unit))
    step = x + width + 0.9
    tikz_board(lines, step, top, [right], unit)
    lines.append("\\node at (%.2f,%.2f) {$=$};" % (step + width + 0.45, top + unit))
    end = step + width + 0.9
    span = tikz_board(lines, end, y, [left, right], unit)
    pieces = V.drawn([left, right])
    lines.append("\\node[anchor=west,font=\\small] at (%.2f,%.2f) {%d %s};" % (end + span + 0.22, y + 2 * unit, pieces, "piece" if pieces == 1 else "pieces"))
    return end + span + 1.55

def plates(path):
    unit = 0.30
    lines = ["\\newcommand{\\witnessplate}{%", "\\begin{tikzpicture}[x=1cm,y=1cm]"]
    span = tikz_witness(lines, 0.0, 0.0, 3, 6, unit)
    tikz_witness(lines, span + 0.55, 0.0, 6, 3, unit)
    lines += ["\\end{tikzpicture}}", "", "\\newcommand{\\ledgerplate}{%", "\\begin{tikzpicture}[x=1cm,y=1cm]"]
    sat, phi = verdicts()
    step = 0.34
    for i, a in enumerate(V.CODES):
        top = (len(V.CODES) - 1 - i) * step
        lines.append("\\node[anchor=east,font=\\tiny,text=black!55] at (%.2f,%.2f) {%d};" % (-0.06, top + step / 2, a))
        lines.append("\\node[anchor=south,font=\\tiny,text=black!55] at (%.2f,%.2f) {%d};" % (i * step + step / 2, len(V.CODES) * step + 0.02, a))
        for j, b in enumerate(V.CODES):
            px, py = j * step, top
            if a == b:
                shade = "black!12"
            elif j > i:
                shade = "black!35" if phi[(min(a, b), max(a, b))] else "blue!58!black"
            else:
                shade = "orange!85!black" if sat[(min(a, b), max(a, b))] else "red!72!black"
            lines.append("\\fill[%s] (%.3f,%.3f) rectangle ++(%.3f,%.3f);" % (shade, px, py, step - 0.03, step - 0.03))
    lines += ["\\end{tikzpicture}}", ""]
    with open(path, "w") as handle:
        handle.write("\n".join(lines) + "\n")

if __name__ == "__main__":
    main()
