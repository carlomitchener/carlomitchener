#!/usr/bin/env python3
# CARPETS

import math
import os


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


def shade(r):
    t = r ** 0.45
    v = int(round(255 - 232 * t))
    return "rgb(%d,%d,%d)" % (v, v, v)


def carpet_svg(lo, hi, cell, pad):
    vals = list(range(lo, hi + 1, 2))
    k = len(vals)
    w = pad + k * cell + 10
    h = pad + k * cell + 10
    out = []
    out.append('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" '
               'viewBox="0 0 %d %d" font-family="Georgia, serif">' % (w, h, w, h))
    out.append('<rect width="%d" height="%d" fill="rgb(252,251,248)"/>' % (w, h))
    for a, m in enumerate(vals):
        for b, n in enumerate(vals):
            x = pad + a * cell
            y = pad + b * cell
            out.append('<rect x="%d" y="%d" width="%d" height="%d" fill="%s"/>'
                       % (x, y, cell, cell, shade(r_carpet(m, n))))
    out.append('<rect x="%d" y="%d" width="%d" height="%d" fill="none" '
               'stroke="rgb(120,118,112)" stroke-width="1"/>'
               % (pad, pad, k * cell, k * cell))
    for a, m in enumerate(vals):
        if not is_prime(m):
            continue
        x = pad + a * cell + cell / 2.0
        out.append('<text x="%.1f" y="%d" font-size="9" text-anchor="middle" '
                   'fill="rgb(40,40,40)">%d</text>' % (x, pad - 6, m))
        out.append('<text x="%d" y="%.1f" font-size="9" text-anchor="end" '
                   'fill="rgb(40,40,40)">%d</text>' % (pad - 6, x + 3.2, m))
    out.append('</svg>')
    return "\n".join(out)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "..", "figures")
    if not os.path.isdir(out):
        os.makedirs(out)
    svg = carpet_svg(3, 63, 16, 40)
    with open(os.path.join(out, "carpet.svg"), "w") as handle:
        handle.write(svg)
    print("wrote figures/carpet.svg")


if __name__ == "__main__":
    main()
