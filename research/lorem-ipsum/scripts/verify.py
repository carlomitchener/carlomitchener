# LOREM

def survives(x, y):
    while x or y:
        if x % 3 == 1 and y % 3 == 1:
            return False
        x //= 3
        y //= 3
    return True

def count(level):
    side = 3 ** level
    return sum(survives(x, y) for x in range(side) for y in range(side))

def main():
    for level in range(7):
        got = count(level)
        want = 8 ** level
        assert got == want, f"level {level}: counted {got}, expected {want}"
        print(f"level {level}: {got} = 8^{level}, as promised")
    print("all green")

if __name__ == "__main__":
    main()
