FLIP = str.maketrans("01", "10")

def binary_mrlygram(number: int):
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
    pretty_print(binary_mrlygram(13))
