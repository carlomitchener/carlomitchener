FLIP = str.maketrans("01", "10")
HEIGHT = 3 ** 0.5 / 2  # rows are this tall, so the triangles come out equilateral

# BINARY

def mrlygram(number: int):
    a = "0"
    b = "101"
    c = "11111"
    d = "0011100"
    rows = number
    bottom = []
    cursor = 0
    for index in range(rows):
        cursor = cursor % 8 + 1
        match cursor:
            case 1 | 8:
                center = a
                alternate = d
            case 2 | 7:
                center = b
                alternate = c
            case 3 | 6:
                center = c
                alternate = b
            case 4 | 5:
                center = d
                alternate = a
        binary = center
        target = 4 * number - 1 - (2 * index)
        while len(binary) < target:
            binary = alternate + binary + alternate
            binary = center + binary + center
        while len(binary) != target:
            binary = binary[1:-1]
        bottom.append(binary)
    top = bottom.copy()
    top.reverse()
    binary = top + bottom
    if number % 4 == 1:
        binary = [row.translate(FLIP) for row in binary]
    return binary

# COORDINATES

def coordinates(binary):
    width = max(len(row) for row in binary)
    cells = []
    for y, row in enumerate(binary):
        padded = row
        while len(padded) < width:
            padded = "-" + padded + "-"
        for x, cell in enumerate(padded):
            kind = {"1": "fill", "0": "void", "-": "grid"}[cell]
            cells.append({"type": kind, "x": x + 1, "y": y + 1})
    return cells

# POINTS

def points(cells):
    triangles = []
    north = True
    for cell in cells:
        left = (cell["x"] - 1) / 2
        y = cell["y"]
        if north:
            triangle = [(left, y), (left + 0.5, y - 1), (left + 1, y)]
        else:
            triangle = [(left, y - 1), (left + 0.5, y), (left + 1, y - 1)]
        triangles.append({"type": cell["type"], "points": triangle})
        north = not north
    return triangles

# SVG

def svg(triangles, scale=50):
    width = max(x for t in triangles for x, y in t["points"]) * scale
    height = max(y for t in triangles for x, y in t["points"]) * HEIGHT * scale
    shapes = []
    for triangle in triangles:
        if triangle["type"] == "grid":
            continue
        corners = " ".join("%g,%g" % (x * scale, y * HEIGHT * scale) for x, y in triangle["points"])
        color = "black" if triangle["type"] == "fill" else "white"
        shapes.append('<polygon points="%s" fill="%s"/>' % (corners, color))
    header = '<svg xmlns="http://www.w3.org/2000/svg" width="%g" height="%g">' % (width, height)
    return "\n".join([header] + shapes + ["</svg>"])

# PRINT

def pretty_print(binary):
    target = 0
    for row in binary:
        if len(row) > target:
            target = len(row)
    print("-" * target)
    for row in binary:
        count = len(row)
        while len(row) < target:
            row = "-" + row
            row = row + "-"
        print(f"{row} ({count})")
    print("-" * target)

if __name__ == "__main__":
    import sys
    number = int(sys.argv[1]) if len(sys.argv) > 1 else 7
    if number < 1 or number % 2 == 0:
        sys.exit("odd numbers only")
    binary = mrlygram(number)
    pretty_print(binary)
    name = f"mrlygram-{number}.svg"
    with open(name, "w") as f:
        f.write(svg(points(coordinates(binary))) + "\n")
    print(f"wrote {name}")
