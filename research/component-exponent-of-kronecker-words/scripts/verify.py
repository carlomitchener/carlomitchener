import math
from fractions import Fraction

# ALPHABET

CODES = tuple(range(1, 16))
UNIT = (1, 2, 4, 8)
ROW = (3, 12)
COLUMN = (5, 10)
DIAGONAL = (6, 9)
GASKET = (7, 11, 13, 14)
FULL = 15
FREE = UNIT + DIAGONAL
DOMINO = ROW + COLUMN
HEAVY = GASKET + (FULL,)
PAIRS = tuple((a, b) for i, a in enumerate(CODES) for b in CODES[i + 1:])

def fill(code):
    return bin(code).count("1")

def word_fill(word):
    out = 1
    for c in word:
        out *= fill(c)
    return out

def klass(code):
    if code in UNIT:
        return "unit"
    if code in ROW:
        return "row domino"
    if code in COLUMN:
        return "column domino"
    if code in DIAGONAL:
        return "diagonal"
    if code in GASKET:
        return "gasket"
    return "full"

# GEOMETRY

def tile(code):
    return [(code & 1) | ((code >> 1 & 1) << 1), (code >> 2 & 1) | ((code >> 3 & 1) << 1)]

def grid(word):
    rows, wide = [1], 1
    for code in word:
        small = tile(code)
        out = []
        for upper in rows:
            for lower in small:
                value = 0
                for j in range(wide):
                    if (upper >> j) & 1:
                        value |= lower << (2 * j)
                out.append(value)
        rows, wide = out, wide * 2
    return rows, wide

def segments(row):
    out = []
    rest = row
    while rest:
        low = (rest & -rest).bit_length() - 1
        tail = rest >> low
        run = ((~tail) & (tail + 1)).bit_length() - 1
        out.append((low, low + run - 1))
        rest &= ~(((1 << run) - 1) << low)
    return out

def components(rows):
    parent = []

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    prev, prev_ids = [], []
    for row in rows:
        segs = segments(row)
        ids = []
        for _ in segs:
            ids.append(len(parent))
            parent.append(len(parent))
        for k, (low, high) in enumerate(segs):
            for m, (plow, phigh) in enumerate(prev):
                if plow <= high and low <= phigh:
                    ra, rb = find(prev_ids[m]), find(ids[k])
                    if ra != rb:
                        parent[rb] = ra
        prev, prev_ids = segs, ids
    return len({find(i) for i in range(len(parent))})

def drawn(word):
    return components(grid(word)[0])

def contacts(rows, wide):
    top, bottom = rows[0], rows[-1]
    h = sum(1 for r in rows if (r & 1) and (r >> (wide - 1)) & 1)
    v = sum(1 for j in range(wide) if (top >> j) & 1 and (bottom >> j) & 1)
    return h, v

# REGIMES

def regime(a, b):
    if a in FREE or b in FREE:
        return "cut"
    if a in DOMINO and b in DOMINO:
        if (a in ROW) == (b in ROW):
            return "one"
        return "crossed"
    if a in HEAVY and b in HEAVY:
        return "one"
    heavy = a if a in HEAVY else b
    return "block" if heavy == FULL else "runs"

def closed(a, b, word):
    kind = regime(a, b)
    if kind == "one":
        return 1
    if kind == "cut":
        spots = [i for i, c in enumerate(word) if c in FREE]
        return word_fill(word[: spots[-1] + 1]) if spots else 1
    if kind == "crossed":
        last = word[-1]
        run = 0
        while run < len(word) and word[len(word) - 1 - run] == last:
            run += 1
        return 1 << (len(word) - run)
    if kind == "block":
        n = sum(1 for c in word if c == FULL)
        run = 0
        while run < len(word) and word[len(word) - 1 - run] == FULL:
            run += 1
        return 1 << (n - run)
    heavy = a if a in GASKET else b
    light = b if a in GASKET else a
    spots = [i for i, c in enumerate(word) if c == light]
    if not spots:
        return 1
    stop = spots[-1]
    total = 1
    for i, c in enumerate(word[: stop + 1]):
        if c == heavy:
            total += word_fill(word[:i])
    return total

# WEIGHTS

def fill_weight(code):
    return {1: (0, 0), 2: (1, 0), 3: (0, 1), 4: (2, 0)}[fill(code)]

def phi_weight(code):
    return (1, 0) if code in DIAGONAL else (0, 0)

def rate_weight(a, b):
    kind = regime(a, b)
    if kind == "one":
        return (0, 0), (0, 0)
    if kind == "cut":
        return fill_weight(a), fill_weight(b)
    if kind == "crossed":
        return (1, 0), (1, 0)
    if kind == "block":
        return ((0, 0), (1, 0)) if a in DOMINO else ((1, 0), (0, 0))
    return (fill_weight(a), fill_weight(b))

def nats(weight):
    return weight[0] * math.log(2) + weight[1] * math.log(3)

# TRACK

def log2_int(n):
    shift = n.bit_length() - 53
    return math.log2(n >> shift) + shift if shift > 0 else math.log2(n)

LOG2_3 = math.log2(3)
LOG2_FILL = {1: 0.0, 2: 1.0, 3: LOG2_3, 4: 2.0}

def free_place(word):
    for i in range(len(word) - 1, -1, -1):
        if word[i] in FREE:
            return i + 1
    return 0

def gd_exact(word, gasket, wanted):
    out = {}
    fill_now, total, snap = 1, 1, 1
    for step, c in enumerate(word, start=1):
        if c == gasket:
            total += fill_now
            fill_now *= 3
        else:
            snap = total
            fill_now *= 2
        if step in wanted:
            out[step] = (snap, fill_now)
    return out

def rates(a, b, word):
    kind = regime(a, b)
    gasket = a if a in GASKET else b
    logfill, top, ratio = 0.0, 0.0, 1.0
    snap_top, snap_ratio = 0.0, 1.0
    cut_top = 0.0
    run, fulls, full_run = 0, 0, 0
    last = None
    out = []
    for step, c in enumerate(word, start=1):
        weight = LOG2_FILL[fill(c)]
        run = run + 1 if c == last else 1
        last = c
        if c == FULL:
            fulls += 1
            full_run += 1
        else:
            full_run = 0
        if kind == "runs":
            if c == gasket:
                ratio = 1.0 + ratio * (2.0 ** (top - logfill))
                top = logfill
            else:
                snap_top, snap_ratio = top, ratio
            out.append((snap_top + math.log2(snap_ratio)) / step)
        elif kind == "cut":
            if c in FREE:
                cut_top = logfill + weight
            out.append(cut_top / step)
        elif kind == "one":
            out.append(0.0)
        elif kind == "crossed":
            out.append((step - run) / step)
        else:
            out.append((fulls - full_run) / step)
        logfill += weight
    return out

# CHECKS

def die(message):
    raise SystemExit("verify.py: " + message)

def check(condition, message):
    if not condition:
        die(message)

def pair_word(a, b, mask, length):
    return [b if (mask >> i) & 1 else a for i in range(length)]

def check_contacts():
    seen = 0
    for length in range(1, 5):
        for mask in range(15 ** length):
            word, rest = [], mask
            for _ in range(length):
                word.append(CODES[rest % 15])
                rest //= 15
            rows, wide = grid(word)
            h, v = contacts(rows, wide)
            wanted_h, wanted_v = 1, 1
            for c in word:
                ch, cv = contacts(*grid([c]))
                wanted_h *= ch
                wanted_v *= cv
            check((h, v) == (wanted_h, wanted_v), f"contacts fail on {word}")
            seen += 1
    print(f"contacts multiply on all {seen} words of length at most 4 over the 15 codes")

def check_forms(reach):
    seen = 0
    for a, b in PAIRS:
        for length in range(1, reach + 1):
            for mask in range(1 << length):
                word = pair_word(a, b, mask, length)
                want = closed(a, b, word)
                got = drawn(word)
                check(got == want, f"{(a, b)} word {word}: drew {got}, form says {want}")
                seen += 1
    print(f"closed forms match drawn cells on all {seen} words of length at most {reach} over all {len(PAIRS)} pairs")

def check_forms_deep(pairs, reach):
    seen = 0
    for a, b in pairs:
        for length in range(1, reach + 1):
            for mask in range(1 << length):
                word = pair_word(a, b, mask, length)
                check(drawn(word) == closed(a, b, word), f"{(a, b)} deep word {word}")
                seen += 1
    print(f"closed forms match drawn cells on all {seen} words of length at most {reach} over {len(pairs)} named pairs")

def check_census():
    tally = {}
    for a, b in PAIRS:
        tally[regime(a, b)] = tally.get(regime(a, b), 0) + 1
    check(tally == {"cut": 69, "one": 12, "crossed": 4, "block": 4, "runs": 16}, f"regime census is {tally}")
    print("regime census: cut 69, one 12, crossed 4, block 4, runs 16, total 105")

def check_rates():
    for a, b in PAIRS:
        wa, wb = rate_weight(a, b)
        for share in (3, 5):
            length = 4000
            word = [a if (i * share) % 8 < 4 else b for i in range(length)]
            fa = sum(1 for c in word if c == a) / length
            got = rates(a, b, word)[-1] * math.log(2)
            want = fa * nats(wa) + (1 - fa) * nats(wb)
            check(abs(got - want) < 0.02, f"{(a, b)} rate {got} against {want}")
    print(f"the closed-form rate matches the weight table on all {len(PAIRS)} pairs at two frequencies, length 4000")

def check_ledger():
    saturating = short = exact = refuted = between = 0
    smooth = 0
    for a, b in PAIRS:
        wa, wb = rate_weight(a, b)
        if (wa, wb) == (fill_weight(a), fill_weight(b)):
            saturating += 1
        else:
            short += 1
        if (wa, wb) == (phi_weight(a), phi_weight(b)):
            exact += 1
        else:
            refuted += 1
        middle = (nats(wa) + nats(wb)) / 2
        low = (nats(phi_weight(a)) + nats(phi_weight(b))) / 2
        high = (nats(fill_weight(a)) + nats(fill_weight(b))) / 2
        if low + 1e-12 < middle < high - 1e-12:
            between += 1
            check(regime(a, b) == "block", f"{(a, b)} is strictly between and is not a domino against the full tile")
        if regime(a, b) != "runs":
            smooth += 1
    check((saturating, short) == (89, 16), f"saturation ledger is {(saturating, short)}")
    check((exact, refuted) == (27, 78), f"Phi ledger is {(exact, refuted)}")
    check(between == 4, f"{between} pairs strictly between")
    check(smooth == 89, f"{smooth} pairs outside the gasket-and-domino regime")
    print("ledger: 89 saturate and 16 fall short, Phi exact on 27 and refuted on 78, 4 strictly between")

def check_smooth(reach):
    biggest = 0
    for a, b in PAIRS:
        for length in range(1, reach + 1):
            for mask in range(1 << length):
                word = pair_word(a, b, mask, length)
                value = closed(a, b, word)
                if regime(a, b) == "runs":
                    if (a, b) == (3, 7) and length == 8:
                        biggest = max(biggest, value)
                    continue
                rest = value
                for prime in (2, 3):
                    while rest % prime == 0:
                        rest //= prime
                check(rest == 1, f"{(a, b)} word {word} has count {value}, not 3-smooth")
    check(biggest == 1094 and 1094 == 2 * 547, f"largest count at length 8 over (3,7) is {biggest}")
    print(f"every count on the 89 pairs outside the gasket-and-domino regime is 3-smooth to length {reach}; the largest count at length 8 over (3,7) is 1094 = 2 x 547")

# MORSE

def morse(length):
    return [bin(i).count("1") & 1 for i in range(length)]

def gasket_domino_track(word, gasket):
    fill_log, total_log, total_ratio = 0.0, 0.0, 1.0
    snap_log, snap_ratio = 0.0, 1.0
    out = []
    for c in word:
        if c == gasket:
            shift = total_log - fill_log
            total_ratio = 1.0 + total_ratio * (2.0 ** shift)
            total_log = fill_log
            fill_log += LOG2_3
        else:
            snap_log, snap_ratio = total_log, total_ratio
            fill_log += 1.0
        out.append((snap_log + math.log2(snap_ratio), fill_log))
    return out

def check_morse():
    reach = 1 << 14
    bits = morse(reach)
    certificate = math.log(108) + 0.5 * math.log(1.5)
    worst = 0.0
    printed = {}
    for swap in (0, 1):
        word = [7 if (bit ^ swap) == 0 else 3 for bit in bits]
        track = gasket_domino_track(word, 7)
        exact = gd_exact(word, 7, {4096, reach})
        for length in range(4, reach + 1):
            logcomp = track[length - 1][0] * math.log(2)
            worst = max(worst, abs(logcomp - (length / 2) * math.log(6)))
        printed[swap] = (track[4095][0] / 4096, track[reach - 1][0] / reach)
        for cut in (4096, reach):
            check(abs(track[cut - 1][0] - log2_int(exact[cut][0])) < 1e-6, "the float track parts from the exact count")
    check(worst < certificate, f"largest deviation {worst} against the certificate {certificate}")
    check(abs(worst - 4.273459) < 5e-7, f"largest deviation is {worst}")
    check(abs(certificate - 4.884864) < 5e-7, f"certificate constant is {certificate}")
    check(abs(printed[1][0] - 1.291967463826) < 5e-13 and abs(printed[1][1] - 1.292352803727) < 5e-13, f"reading one prints {printed[1]}")
    check(abs(printed[0][0] - 1.291291597694) < 5e-13 and abs(printed[0][1] - 1.292183837194) < 5e-13, f"reading two prints {printed[0]}")
    limit = math.log2(6) / 2
    check(abs(limit - 1.292481250360578) < 5e-16, "the limit in log 2 units")
    check(abs(math.log(6) / 2 - 0.895879734614027) < 5e-16, "the limit in nats")
    print(f"Thue-Morse: every length from 4 to 2^14 in both readings obeys the certificate, largest deviation {worst:.6f} against {certificate:.6f}")
    print(f"Thue-Morse prefix rates in log 2 units: {printed[1][0]:.12f} and {printed[1][1]:.12f} in one reading, {printed[0][0]:.12f} and {printed[0][1]:.12f} in the other, against (1/2) log_2 6 = {limit:.12f}")

def check_saturation():
    reach = 1 << 14
    bits = morse(reach)
    for swap, want_max in ((1, Fraction(43397, 186624)), (0, Fraction(151, 648))):
        word = [7 if (bit ^ swap) == 0 else 3 for bit in bits]
        track = gasket_domino_track(word, 7)
        ratios = [logc - logf for logc, logf in track]
        low = min(ratios)
        best = max(range(4, reach), key=lambda i: ratios[i])
        exact = gd_exact(word, 7, {best + 1, 4096})
        got = Fraction(*exact[best + 1])
        check(got == want_max, f"largest saturation at length >= 5 in reading {swap} is {got}")
        check(abs(2.0 ** low - (0.0113766545 if swap == 1 else 0.0113766545)) < 5e-10, f"minimum saturation {2.0 ** low}")
        check(2.0 ** low > 1 / 108, "the proved floor 1/108 is broken")
        if swap == 1:
            at = Fraction(*exact[4096])
            check(abs(float(at) - 0.2325367033) < 5e-11, f"saturation at length 4096 is {float(at)}")
    print("Thue-Morse saturation: minimum 0.0113766545 above the floor 1/108, exact maxima 43397/186624 and 151/648, and 0.2325367033 at length 4096")

# BOUNDARY

def check_boundary():
    squares = [6 if int(math.isqrt(i)) ** 2 == i else 3 for i in range(1, 1 << 12)]
    for n in range(2, 40):
        length = n * n
        check(free_place(squares[:length]) == length, "the squares word misses rate 1")
        edge = (n + 1) ** 2 - 1
        check(free_place(squares[:edge]) == n * n, "the squares word misses n/(n+2)")
        check(closed(3, 6, squares[:edge]) == 1 << (n * n), "the squares word parts from the closed form")
    powers = [6 if (i & (i - 1)) == 0 else 3 for i in range(1, 1 << 15)]
    seen = []
    for k in range(2, 14):
        length = (1 << (k + 1)) - 1
        seen.append(Fraction(free_place(powers[:length]), length))
    check(seen[0] == Fraction(4, 7) and seen[1] == Fraction(8, 15) and seen[-1] == Fraction(1 << 13, (1 << 14) - 1), f"powers-of-2 rates start {seen[:2]}")
    check(all(f > Fraction(1, 2) for f in seen), "the lower rate dips below one half")
    check(all(free_place(powers[: 1 << k]) == 1 << k for k in range(1, 14)), "the powers-of-2 word misses rate 1")
    print("boundary over (3,6): the squares word has rate 1 at every square and n/(n+2) just before the next, the powers-of-2 word reads 4/7, 8/15, ..., 8192/16383")
    reach = 1 << 15
    word = [7 if (i & (i - 1)) == 0 else 3 for i in range(1, reach + 1)]
    track = gasket_domino_track(word, 7)
    at = {length: track[length - 1][0] / length for length in (2048, 2049, 32768)}
    check(abs(at[2048] - 0.502367981) < 5e-10, f"L = 2048 reads {at[2048]}")
    check(abs(at[2049] - 1.002164269) < 5e-10, f"L = 2049 reads {at[2049]}")
    check(abs(at[32768] - 0.500219405) < 5e-10, f"L = 32768 reads {at[32768]}")
    block = [track[length - 1][0] / length for length in range(4097, 8193)]
    check(abs(block[0] - 1.00123) < 5e-6 and abs(block[-1] - 0.50073) < 5e-6, f"block runs {block[0]} to {block[-1]}")
    check(abs(max(block) - block[0]) < 1e-12 and abs(min(block) - block[-1]) < 1e-12, "the block is not monotone")
    print("boundary over (3,7): the powers-of-2 word reads 0.502367981 at 2048, 1.002164269 at 2049, 0.500219405 at 32768, and sweeps 1.00123 down to 0.50073 over one block")
    triple = [7, 3]
    while len(triple) < 4096:
        n = len(triple)
        triple = triple + [7] * n + [3] * n
    track = gasket_domino_track(triple[:4096], 7)
    band = [track[length - 1][0] / length for length in range(1024, 4097)]
    check(abs(min(band) - 0.4792) < 5e-5 and abs(max(band) - 1.4379) < 5e-5, f"tripling band is [{min(band)}, {max(band)}]")
    print(f"the tripling word keeps both letters at lower density 1/4 and its prefix rate still ranges over [{min(band):.4f}, {max(band):.4f}] on 1024 <= L <= 4096")

# COCYCLE

def check_cocycle():
    left, right = ((0, 1), (-2, 3)), ((2, 0), (4, 0))
    matrix = {3: left, 6: right}

    def apply(vector, m):
        return (vector[0] * m[0][0] + vector[1] * m[1][0], vector[0] * m[0][1] + vector[1] * m[1][1])

    seen = 0
    for length in range(1, 13):
        for mask in range(1 << length):
            word = pair_word(3, 6, mask, length)
            vector = (1, 0)
            for c in word:
                vector = apply(vector, matrix[c])
            check(vector[0] + vector[1] == closed(3, 6, word), f"the cocycle misses {word}")
            seen += 1
    power = ((1, 0), (0, 1))
    for step in range(1, 25):
        power = (
            (power[0][0] * left[0][0] + power[0][1] * left[1][0], power[0][0] * left[0][1] + power[0][1] * left[1][1]),
            (power[1][0] * left[0][0] + power[1][1] * left[1][0], power[1][0] * left[0][1] + power[1][1] * left[1][1]),
        )
        biggest = max(abs(power[0][0]), abs(power[0][1]), abs(power[1][0]), abs(power[1][1]))
        check(biggest == (1 << (step + 1)) - 1, f"the largest entry at step {step} is {biggest}")
        check(closed(3, 6, [3] * step) == 1, "the constant domino word is not connected")
    print(f"the two-by-two cocycle on (3,6) reproduces the count on all {seen} words to length 12, its largest entry is 2^(L+1) - 1, and the constant word stays at one component")

def check_byproduct():
    for k in range(1, 9):
        word = [7, 3] * k
        want = (6 ** k + 4) // 5
        check(closed(7, 3, word) == want, f"(7,3)^{k} is not (6^k + 4)/5")
        if k <= 4:
            check(drawn(word) == want, f"(7,3)^{k} drawn")
    print("the stationary control comp((7,3)^k) = (6^k + 4)/5 reads 2, 8, 44, 260, 1556, 9332 to k = 8, drawn to k = 4")

def main():
    check_contacts()
    check_census()
    check_forms(7)
    check_forms_deep(((3, 7), (5, 7), (3, 15), (3, 6), (3, 5), (7, 15), (1, 3), (6, 9)), 8)
    check_rates()
    check_ledger()
    check_smooth(8)
    check_morse()
    check_saturation()
    check_boundary()
    check_cocycle()
    check_byproduct()
    print("all checks green")

if __name__ == "__main__":
    main()
