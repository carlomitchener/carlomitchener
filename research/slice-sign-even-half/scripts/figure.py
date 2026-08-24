import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import verify

FONT = "Helvetica,Arial,sans-serif"
INK = "#1a1a1a"
MUTED = "#555"
PALE = "#c8ccd4"
ACCENT = "#1a3f8f"
GREYS = ["#4a6fa5", "#7d8fa8", "#a8aeb9"]

# SVG

def header(width, height):
    return [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">'
        % (width, height, width, height),
        '<rect width="%d" height="%d" fill="white"/>' % (width, height),
    ]

def text(x, y, s, size=11, fill=INK, anchor="start", weight=None):
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    w = ' font-weight="%s"' % weight if weight else ""
    return '<text x="%.1f" y="%.1f" font-family="%s" font-size="%d" fill="%s" text-anchor="%s"%s>%s</text>' % (
        x, y, FONT, size, fill, anchor, w, s)

def line(x1, y1, x2, y2, stroke=INK, width=1.2):
    return '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.1f"/>' % (
        x1, y1, x2, y2, stroke, width)

def path(points, stroke, width=1.8):
    d = " ".join(("M" if i == 0 else "L") + " %.1f %.1f" % p for i, p in enumerate(points))
    return '<path d="%s" fill="none" stroke="%s" stroke-width="%.1f" stroke-linejoin="round"/>' % (
        d, stroke, width)

def dot(x, y, fill, r=2.6):
    return '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"/>' % (x, y, r, fill)

def write(out, rows):
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as handle:
        handle.write("\n".join(rows) + "\n")

# DEPTH DATA

def depth_data(top=40):
    out = {}
    for q in (3, 5, 7, 9, 11):
        row = []
        for D in range(2, top + 1, 2):
            K, _x, _y = verify.certificate_depth(D, q, 4 * D + 8)
            assert K is not None, "no certificate at q=%d D=%d" % (q, D)
            row.append((D, K))
        out[q] = row
    return out

# DEPTH FIGURE

def step_points(row, X, Y):
    pts = []
    prev = None
    for D, K in row:
        if prev is not None and K != prev:
            pts.append((X(D), Y(prev)))
        pts.append((X(D), Y(K)))
        prev = K
    return pts

def draw_depth(out):
    data = depth_data()
    width = 760
    height = 340
    base = 276
    topm = 66
    aleft = 58
    aright = 402
    bleft = 486
    bright = 736
    dmin, dmax = 2, 40
    kmax = 90

    def XA(D):
        return aleft + (aright - aleft) * (D - dmin) / (dmax - dmin)

    def YA(K):
        return base - (base - topm) * K / kmax

    def XB(D):
        return bleft + (bright - bleft) * (D - dmin) / (dmax - dmin)

    def YB(K):
        return base - (base - topm) * K / 3.0

    rows = header(width, height)
    rows.append(text(aleft, 26, "How deep the contraction certificate has to look", 13, INK, weight="bold"))
    rows.append(text(aleft, 42, "least depth K with q b(K+1) < f b(K) at every carry, even D", 11, MUTED))
    for K in (0, 30, 60, 90):
        rows.append(line(aleft, YA(K), aright, YA(K), PALE, 0.8))
        rows.append(text(aleft - 8, YA(K) + 4, str(K), 11, MUTED, "end"))
    rows.append(line(aleft, base, aright, base, INK, 1.2))
    for D in range(8, dmax + 1, 8):
        rows.append(line(XA(D), base, XA(D), base + 4, INK, 1.0))
        rows.append(text(XA(D), base + 18, str(D), 11, MUTED, "middle"))
    rows.append(text(aleft, base + 36, "dimension D", 11, MUTED))
    rows.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s"/>'
                % (aleft, YA(2), aright - aleft, base - YA(2), PALE))
    rows.append(path(step_points(data[3], XA, YA), ACCENT, 2.2))
    for D, K in data[3]:
        rows.append(dot(XA(D), YA(K), ACCENT))
    dlast, klast = data[3][-1]
    rows.append(text(XA(dlast) - 6, YA(klast) + 4, "base 3", 12, ACCENT, "end", weight="bold"))
    rows.append(text(XA(dlast) - 6, YA(klast) + 19, "K = %d at D = %d" % (klast, dlast), 11, MUTED, "end"))
    rows.append(text(aright - 4, YA(2) - 8, "bases 5, 7, 9, 11", 11, MUTED, "end"))

    rows.append(text(bleft, 42, "the same strip, magnified", 11, MUTED))
    for K in (0, 1, 2, 3):
        rows.append(line(bleft, YB(K), bright, YB(K), PALE, 0.8))
        rows.append(text(bleft - 8, YB(K) + 4, str(K), 11, MUTED, "end"))
    rows.append(line(bleft, base, bright, base, INK, 1.2))
    for D in range(8, dmax + 1, 16):
        rows.append(line(XB(D), base, XB(D), base + 4, INK, 1.0))
        rows.append(text(XB(D), base + 18, str(D), 11, MUTED, "middle"))
    rows.append(text(bleft, base + 36, "dimension D", 11, MUTED))
    assert data[9] == data[11], "bases 9 and 11 no longer coincide"
    for i, q in enumerate((5, 7, 9)):
        rows.append(path(step_points(data[q], XB, YB), GREYS[i], 1.8))
    rows.append(text(XB(16) + 4, YB(2) - 8, "q = 5", 11, GREYS[0]))
    rows.append(text(XB(26) + 4, YB(2) + 17, "q = 7", 11, GREYS[1]))
    rows.append(text(XB(30) + 4, YB(1) - 8, "q = 9, 11", 11, GREYS[2]))
    rows.append("</svg>")
    write(out, rows)
    return data

# TENT FIGURE

def draw_tent(out, top=301):
    T = verify.trough_set(top)
    pts = []
    for D in range(3, top + 1, 2):
        rowsm, n = verify.m_even_rows_mod2(D)
        nul = n - verify.bit_rank(rowsm)
        assert nul == verify.tent(D, T), "tent law fails at D=%d" % D
        pts.append((D, nul))
    left = 58
    right = 26
    topm = 68
    base = 272
    width = 760
    height = 340
    ymax = max(v for _D, v in pts)
    span = width - left - right

    def X(D):
        return left + span * (D - 3) / (top - 3)

    def Y(v):
        return base - (base - topm) * v / ymax

    rows = header(width, height)
    rows.append(text(left, 26, "The Jacobsthal tent", 13, INK, weight="bold"))
    rows.append(text(left, 42, "dimension of the kernel of the even core mod 2, base 3, odd D", 11, MUTED))
    for v in (0, 10, 20, 30, 40):
        rows.append(line(left, Y(v), width - right, Y(v), PALE, 0.8))
        rows.append(text(left - 8, Y(v) + 4, str(v), 11, MUTED, "end"))
    rows.append(line(left, Y(1), width - right, Y(1), PALE, 1.4))
    rows.append(line(left, base, width - right, base, INK, 1.2))
    for t in T:
        if 3 <= t <= top:
            rows.append(line(X(t), base, X(t), base + 8, ACCENT, 1.2))
    for D in (3, 100, 200, 300):
        rows.append(text(X(D), base + 26, str(D), 11, MUTED, "middle"))
    rows.append(text(left, base + 46, "dimension D", 11, MUTED))
    rows.append(text(left + 92, base + 46,
                     "ticks below the axis: the floors 2J(k)+1 and 2J(k)+3, where the kernel drops to 1",
                     11, ACCENT))
    rows.append(path([(X(D), Y(v)) for D, v in pts], ACCENT, 1.8))
    peak = max(pts, key=lambda p: p[1])
    rows.append(dot(X(peak[0]), Y(peak[1]), ACCENT, 3.0))
    rows.append(text(X(peak[0]) - 10, Y(peak[1]) + 4, "D = %d, kernel %d" % peak, 11, ACCENT, "end"))
    rows.append("</svg>")
    write(out, rows)
    return pts

# MAIN

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    figs = os.path.join(here, "..", "figures")
    draw_depth(os.path.join(figs, "depth.svg"))
    print("drew figures/depth.svg")
    draw_tent(os.path.join(figs, "tent.svg"))
    print("drew figures/tent.svg")

if __name__ == "__main__":
    main()
