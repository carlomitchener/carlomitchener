import os
from itertools import product

# DESIGN

def kind(v):
    if sum(d == 1 for d in v) > 1:
        return "gone"
    return "dark" if sum(d == 0 for d in v) <= 1 else "pale"

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "..", "figures", "design.svg")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    cell = 34
    pad = 14
    gap = 30
    grid = 3 * cell
    width = 3 * grid + 2 * gap + 2 * pad
    height = grid + 2 * pad + 26
    rows = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">']
    rows.append(f'<rect width="{width}" height="{height}" fill="white"/>')
    for c in range(3):
        ox = pad + c * (grid + gap)
        for a in range(3):
            for b in range(3):
                x = ox + a * cell
                y = pad + (2 - b) * cell
                style = kind((a, b, c))
                if style == "gone":
                    rows.append(f'<line x1="{x + 8}" y1="{y + 8}" x2="{x + cell - 8}" y2="{y + cell - 8}" stroke="#b0b0b0" stroke-width="2"/>')
                    rows.append(f'<line x1="{x + 8}" y1="{y + cell - 8}" x2="{x + cell - 8}" y2="{y + 8}" stroke="#b0b0b0" stroke-width="2"/>')
                else:
                    fill = "#1a1a1a" if style == "dark" else "#cfcfcf"
                    rows.append(f'<rect x="{x + 3}" y="{y + 3}" width="{cell - 6}" height="{cell - 6}" fill="{fill}"/>')
        rows.append(f'<rect x="{ox}" y="{pad}" width="{grid}" height="{grid}" fill="none" stroke="#8a8a8a" stroke-width="1"/>')
        rows.append(f'<text x="{ox + grid / 2}" y="{pad + grid + 20}" font-family="serif" font-size="15" fill="#1a1a1a" text-anchor="middle">c = {c}</text>')
    rows.append("</svg>")
    with open(out, "w") as handle:
        handle.write("\n".join(rows) + "\n")
    print("drew figures/design.svg")

if __name__ == "__main__":
    main()
