import os

# CARPET

def survives(x, y):
    while x or y:
        if x % 3 == 1 and y % 3 == 1:
            return False
        x //= 3
        y //= 3
    return True

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "..", "figures", "carpet.svg")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    cell = 20
    pad = 10
    side = 9 * cell + 2 * pad
    rows = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {side} {side}" width="{side}" height="{side}">']
    rows.append(f'<rect width="{side}" height="{side}" fill="white"/>')
    for x in range(9):
        for y in range(9):
            if survives(x, y):
                rows.append(f'<rect x="{pad + x * cell + 1}" y="{pad + (8 - y) * cell + 1}" width="{cell - 2}" height="{cell - 2}" fill="#1a1a1a"/>')
    rows.append("</svg>")
    with open(out, "w") as handle:
        handle.write("\n".join(rows) + "\n")
    print("drew figures/carpet.svg")

if __name__ == "__main__":
    main()
