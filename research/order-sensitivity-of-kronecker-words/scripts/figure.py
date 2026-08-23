import os

# WITNESS

CELL = 22
PAD = 14
GAP = 30


def cells(c):
    return {(i, j) for i in range(2) for j in range(2) if (c >> (i + 2 * j)) & 1}


def product(a, b):
    return {(2 * p[0] + q[0], 2 * p[1] + q[1]) for p in cells(a) for q in cells(b)}


def block(out, x, y, n, filled):
    for i in range(n):
        for j in range(n):
            fx, fy = x + j * CELL, y + i * CELL
            if (i, j) in filled:
                out.append(f'<rect x="{fx}" y="{fy}" width="{CELL}" height="{CELL}" fill="#1a1a1a"/>')
            else:
                out.append(f'<rect x="{fx}" y="{fy}" width="{CELL}" height="{CELL}" fill="none" stroke="#c8c8c8" stroke-width="1"/>')
    out.append(f'<rect x="{x}" y="{y}" width="{n * CELL}" height="{n * CELL}" fill="none" stroke="#6e6e6e" stroke-width="1.4"/>')


def row(out, y, a, b, label):
    block(out, PAD, y + CELL, 2, cells(a))
    out.append(f'<text x="{PAD + 2 * CELL + 12}" y="{y + 2 * CELL + 6}" font-family="Georgia, serif" font-size="17" fill="#1a1a1a" text-anchor="middle">&#215;</text>')
    x = PAD + 2 * CELL + 24
    block(out, x, y + CELL, 2, cells(b))
    out.append(f'<text x="{x + 2 * CELL + 12}" y="{y + 2 * CELL + 6}" font-family="Georgia, serif" font-size="17" fill="#1a1a1a" text-anchor="middle">=</text>')
    g = x + 2 * CELL + 24
    block(out, g, y, 4, product(a, b))
    out.append(f'<text x="{g + 4 * CELL + 14}" y="{y + 2 * CELL + 6}" font-family="Georgia, serif" font-size="16" fill="#1a1a1a">{label}</text>')


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(here, "..", "figures", "witness.svg")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    width = 2 * PAD + 8 * CELL + 48 + 130
    height = 2 * PAD + 8 * CELL + GAP
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">']
    out.append(f'<rect width="{width}" height="{height}" fill="white"/>')
    row(out, PAD, 3, 6, "four pieces")
    row(out, PAD + 4 * CELL + GAP, 6, 3, "two pieces")
    out.append("</svg>")
    with open(out_path, "w") as handle:
        handle.write("\n".join(out) + "\n")
    print("drew figures/witness.svg")


if __name__ == "__main__":
    main()
