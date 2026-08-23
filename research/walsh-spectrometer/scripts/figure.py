# BLINK

import os

INK = "#1b3b6f"
PAPER = "#dde6f2"
EDGE = "#8fa6c4"
TEXT = "#12233d"


def corners():
    return [(a, b, c) for a in (0, 1) for b in (0, 1) for c in (0, 1)]


def design(code):
    return {p for p in corners() if code >> (4 * p[0] + 2 * p[1] + p[2]) & 1}


def cells(n, code):
    D = design(code)
    ink, paper = [], []
    for x in range(4 * n):
        for y in range(4 * n):
            z = 6 * n - 2 - x - y
            if z < 0 or z >= 4 * n or z % 2:
                continue
            e = ((x // 4) % 2, (y // 4) % 2, (z // 4) % 2)
            (ink if e in D else paper).append(((x - y) // 2, (x + y) // 2))
    return ink, paper


def panel(n, code, ox, oy, s):
    ink, paper = cells(n, code)
    us = [u for u, v in ink + paper]
    vs = [v for u, v in ink + paper]
    umin, vmax = min(us), max(vs)
    out = []
    for group, fill in ((paper, PAPER), (ink, INK)):
        for u, v in group:
            px = ox + (u - umin) * s
            py = oy + (vmax - v) * s
            out.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" '
                       'fill="%s"/>' % (px, py, s, s, fill))
    w = (max(us) - umin + 1) * s
    hgt = (vmax - min(vs) + 1) * s
    out.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="none" '
               'stroke="%s" stroke-width="0.6"/>' % (ox, oy, w, hgt, EDGE))
    return out, w, hgt


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    figs = os.path.join(here, os.pardir, "figures")
    if not os.path.isdir(figs):
        os.makedirs(figs)
    s = 7.0
    body = []
    left, w1, h1 = panel(5, 105, 40.0, 34.0 + 2.0 * s, s)
    right, w2, h2 = panel(7, 105, 40.0 + w1 + 74.0, 34.0, s)
    body += left + right
    labels = [(40.0 + w1 / 2, "n = 5", "ink 114 of 150 = 19/25"),
              (40.0 + w1 + 74.0 + w2 / 2, "n = 7", "ink 72 of 294 = 12/49")]
    for cx, top, bot in labels:
        body.append('<text x="%.1f" y="24" text-anchor="middle" '
                    'font-family="Georgia, serif" font-size="13" fill="%s">%s'
                    '</text>' % (cx, TEXT, top))
        body.append('<text x="%.1f" y="%.1f" text-anchor="middle" '
                    'font-family="Georgia, serif" font-size="11" fill="%s">%s'
                    '</text>' % (cx, 34.0 + max(h1, h2) + 20.0, TEXT, bot))
    body.append('<text x="%.1f" y="%.1f" text-anchor="middle" '
                'font-family="Georgia, serif" font-size="12" fill="%s">'
                'one design, two phases: the blink is exactly minus half the '
                'top Walsh coefficient</text>'
                % (40.0 + w1 + 37.0 + w2 / 2 - w1 / 2 + w1 / 2,
                   34.0 + max(h1, h2) + 42.0, TEXT))
    width = 40.0 + w1 + 74.0 + w2 + 40.0
    height = 34.0 + max(h1, h2) + 58.0
    svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="%.0f" height="%.0f" '
           'viewBox="0 0 %.0f %.0f">' % (width, height, width, height),
           '<rect width="%.0f" height="%.0f" fill="#ffffff"/>' % (width, height)]
    svg += body
    svg.append('</svg>')
    out = os.path.join(figs, "blink.svg")
    with open(out, "w") as fh:
        fh.write("\n".join(svg) + "\n")
    print("figures/blink.svg: %d by %d" % (width, height))


if __name__ == "__main__":
    main()
