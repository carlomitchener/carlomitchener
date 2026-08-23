# SPONGE

import os

CELL = 34
PAD = 10
GAP = 26
LAYERS = [
    ("z = 1", {(2, 2)}),
    ("z = 2", {(2, 1), (1, 2), (2, 2), (3, 2), (2, 3)}),
    ("z = 3", {(2, 2)}),
]

KEEP = "#cfe0f5"
DROP = "#6b7280"
LINE = "#8fa3bb"
TEXT = "#7c8798"


def render():
    panel = 3 * CELL
    width = 2 * PAD + 3 * panel + 2 * GAP
    height = 2 * PAD + panel + 30
    out = ['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % (width, height, width, height)]
    for k, (label, removed) in enumerate(LAYERS):
        ox = PAD + k * (panel + GAP)
        oy = PAD
        for i in range(1, 4):
            for j in range(1, 4):
                x = ox + (i - 1) * CELL
                y = oy + (3 - j) * CELL
                colour = DROP if (i, j) in removed else KEEP
                out.append('<rect x="%d" y="%d" width="%d" height="%d" fill="%s" stroke="%s" stroke-width="1"/>' % (x, y, CELL, CELL, colour, LINE))
        out.append('<text x="%d" y="%d" font-family="Georgia, serif" font-size="13" fill="%s" text-anchor="middle">%s</text>' % (ox + panel // 2, oy + panel + 20, TEXT, label))
    out.append("</svg>")
    return "\n".join(out) + "\n"


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    target = os.path.join(here, os.pardir, "figures")
    os.makedirs(target, exist_ok=True)
    path = os.path.join(target, "sponge.svg")
    with open(path, "w") as handle:
        handle.write(render())
    print("wrote figures/sponge.svg")


if __name__ == "__main__":
    main()
