m = [
    "11111",
    "10101",
    "10101",
    "10101",
    "10101",
]

r = [
    "11111",
    "10000",
    "10000",
    "10000",
    "10000",
]

l = [
    "10000",
    "10000",
    "10000",
    "10000",
    "11111",
]

y = [
    "10001",
    "10001",
    "11111",
    "00001",
    "11111",
]

p = [
    "11111",
    "10001",
    "11111",
    "10000",
    "10000",
]

o = [
    "11111",
    "10001",
    "10001",
    "10001",
    "11111",
]

d = [
    "00001",
    "00001",
    "11111",
    "10001",
    "11111",
]

mrlyprod = [m, r, l, y, p, r, o, d]
letter_names = ["m", "r", "l", "y", "p", "r", "o", "d"]

def count_fills_per_letter():
    letter_counts = []
    for i, letter in enumerate(mrlyprod):
        count = sum(row.count("1") for row in letter)
        letter_counts.append((letter_names[i], count))
    return letter_counts

def count_total_fills():
    return sum(sum(row.count("1") for row in letter) for letter in mrlyprod)

if __name__ == "__main__":

    letter_counts = count_fills_per_letter()

    for letter_name, count in letter_counts:
        print(f"Letter {letter_name}: {count:2d} fills")

    total = count_total_fills()
    print(f"Total fills: {total} fills")
