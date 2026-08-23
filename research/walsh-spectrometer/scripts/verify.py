# WALSH

from fractions import Fraction
from itertools import permutations

KRAW = [[1, 1, 1, 1], [3, 1, -1, -3], [3, -1, -1, 3], [1, -1, 1, -1]]

QUASI = {
    (0, 1): lambda n: (9 * n * n + 18 * n + 21) // 8,
    (0, 3): lambda n: (3 * n * n + 6 * n + 3) // 8,
    (1, 1): lambda n: (3 * n * n + 2 * n - 5) // 8,
    (1, 3): lambda n: (9 * n * n + 6 * n - 3) // 8,
    (2, 1): lambda n: (9 * n * n - 6 * n - 3) // 8,
    (2, 3): lambda n: (3 * n * n - 2 * n - 5) // 8,
    (3, 1): lambda n: (3 * n * n - 6 * n + 3) // 8,
    (3, 3): lambda n: (9 * n * n - 18 * n + 21) // 8,
}


def corners():
    return [(a, b, c) for a in (0, 1) for b in (0, 1) for c in (0, 1)]


def bit(p):
    return 4 * p[0] + 2 * p[1] + p[2]


def design(code):
    return frozenset(p for p in corners() if code >> bit(p) & 1)


def quasi(k, n):
    return QUASI[(k, n % 4)](n)


def brute_counts(n):
    got = {e: 0 for e in corners()}
    for x in range(4 * n):
        for y in range(4 * n):
            z = 6 * n - 2 - x - y
            if z < 0 or z >= 4 * n or z % 2:
                continue
            got[((x // 4) % 2, (y // 4) % 2, (z // 4) % 2)] += 1
    return got


def macro_counts(n):
    got = {e: 0 for e in corners()}
    top = 6 * n - 2
    for x in range(4 * n):
        lo = max(0, top - x - (4 * n - 1))
        hi = min(4 * n - 1, top - x)
        if lo > hi:
            continue
        ex = (x // 4) % 2
        for c in range(8):
            if (c - x) % 2:
                continue
            first = lo + (c - lo) % 8
            if first > hi:
                continue
            cnt = (hi - first) // 8 + 1
            z = top - x - first
            got[(ex, (first // 4) % 2, (z // 4) % 2)] += cnt
    return got


def solid_cut(n):
    top = 6 * n - 2
    out = set()
    for x in range(4 * n):
        for y in range(4 * n):
            for z in range(0, 4 * n, 2):
                if x + y + z == top:
                    out.add((x, y, z))
    return out


def plane_points(n):
    top = 6 * n - 2
    out = set()
    for x in range(4 * n):
        for y in range(4 * n):
            z = top - x - y
            if 0 <= z < 4 * n and z % 2 == 0:
                out.add((x, y, z))
    return out


def polymul(a, b, cap):
    r = [0] * (cap + 1)
    for i, ai in enumerate(a):
        if ai == 0 or i > cap:
            continue
        for j, bj in enumerate(b):
            if i + j > cap:
                break
            r[i + j] += ai * bj
    return r


def gf_extract(k, n):
    h = (n - 1) // 2
    cap = 3 * h + 1
    even = [0] * (cap + 1)
    for i in range(0, 2 * h + 1, 2):
        if i <= cap:
            even[i] = 1
    odd = [0] * (cap + 1)
    for i in range(1, 2 * h, 2):
        if i <= cap:
            odd[i] = 1
    p = [0] * (cap + 1)
    p[0] = 1
    if cap >= 1:
        p[1] = 6
    if cap >= 2:
        p[2] = 1
    for _ in range(3 - k):
        p = polymul(p, even, cap)
    for _ in range(k):
        p = polymul(p, odd, cap)
    return p[cap]


def box(m):
    if m >= 0 and m % 2 == 0:
        return (m + 2) * (m + 4) // 8
    return 0


def split_sum(k, n):
    h = (n - 1) // 2
    total = 0
    for a in (0, 1, 2):
        if (a - h - k - 1) % 2:
            continue
        rho = 6 if a == 1 else 1
        total += rho * (box(3 * h + 1 - k - a)
                        - (3 - k) * box(h - k - a - 1)
                        - k * box(h + 1 - k - a))
    return total


def spectrum(D):
    out = []
    for j in range(4):
        acc = 0
        for S in corners():
            if sum(S) != j:
                continue
            acc += sum((-1) ** sum(p[i] * S[i] for i in range(3)) for p in D)
        out.append(Fraction(acc, 8))
    return out


def spectrum_kraw(D):
    m = [0, 0, 0, 0]
    for p in D:
        m[sum(p)] += 1
    return [Fraction(sum(m[w] * KRAW[j][w] for w in range(4)), 8) for j in range(4)]


def ink_law(D, n):
    S = spectrum_kraw(D)
    s = -1 if n % 4 == 1 else 1
    return (S[0] - Fraction(1, 2) * S[3] * s
            + (Fraction(2, 3) * S[1] - Fraction(1, 3) * S[2] * s) / n
            + (Fraction(2, 3) * S[2]
               - (Fraction(1, 3) * S[1] + Fraction(1, 2) * S[3]) * s) / n ** 2)


def ink_exact(D, counts, n):
    return Fraction(sum(counts[p] for p in D), 6 * n * n)


def family_laws(n):
    s = -1 if n % 4 == 1 else 1
    carpet = (Fraction(1, 2) + Fraction(s, 8) + Fraction(1, 2 * n)
              - Fraction(s, 8 * n * n))
    tree = (Fraction(1, 4) + (Fraction(1, 3) - Fraction(s, 12)) / n
            + Fraction(1 - s, 6 * n * n))
    void = Fraction(1, 4) - Fraction(s, 4 * n) + Fraction(1, 2 * n * n)
    return {23: carpet, 232: 1 - carpet, 3: tree, 129: void}


def orbits():
    seen = {}
    reps = []
    for code in range(256):
        D = design(code)
        if D in seen:
            continue
        orbit = set()
        for perm in permutations(range(3)):
            for flip in corners():
                img = frozenset(
                    tuple(p[perm[i]] ^ flip[i] for i in range(3)) for p in D)
                orbit.add(img)
        for img in orbit:
            seen[img] = len(reps)
        reps.append((code, len(orbit)))
    return reps


def constituent(k, hpar, arg, raw=False):
    table = {(0, 0): (18, 18, 6), (0, 1): (6, 12, 6), (1, 0): (6, 4, 0),
             (1, 1): (18, 30, 12), (2, 0): (18, 6, 0), (2, 1): (6, 8, 2),
             (3, 0): (6, 0, 0), (3, 1): (18, 18, 6)}
    a, b, c = table[(k, hpar)]
    q = arg if raw else (arg - 1 - 2 * hpar) // 4
    return a * q * q + b * q + c


def main():
    small = list(range(1, 56, 2))
    for n in small:
        got = brute_counts(n)
        for e in corners():
            want = quasi(sum(e), n)
            assert got[e] == want, "counts n=%d eps=%s got %d want %d" % (
                n, e, got[e], want)
        total = sum(got.values())
        assert total == 6 * n * n, "slice size n=%d got %d want %d" % (
            n, total, 6 * n * n)
        for k in range(4):
            vals = {got[e] for e in corners() if sum(e) == k}
            assert len(vals) == 1, "weight split n=%d k=%d got %s" % (
                n, k, sorted(vals))
            g = gf_extract(k, n)
            assert g == quasi(k, n), "gf n=%d k=%d got %d want %d" % (
                n, k, g, quasi(k, n))
            f = split_sum(k, n)
            assert f == quasi(k, n), "finite sum n=%d k=%d got %d want %d" % (
                n, k, f, quasi(k, n))
        laws = family_laws(n)
        for code, want in laws.items():
            gotink = ink_law(design(code), n)
            assert gotink == want, "family n=%d code=%d got %s want %s" % (
                n, code, gotink, want)
        for code in range(256):
            D = design(code)
            gotink = ink_exact(D, got, n)
            want = ink_law(D, n)
            assert gotink == want, "ink n=%d code=%d got %s want %s" % (
                n, code, gotink, want)
        print("odd n = %d: eight counts, three routes, 256 inks all agree" % n)

    for n in (101, 555, 999, 9991):
        got = macro_counts(n)
        for e in corners():
            want = quasi(sum(e), n)
            assert got[e] == want, "cold n=%d eps=%s got %d want %d" % (
                n, e, got[e], want)
        total = sum(got.values())
        assert total == 6 * n * n, "cold size n=%d got %d want %d" % (
            n, total, 6 * n * n)
        for code in range(256):
            D = design(code)
            gotink = ink_exact(D, got, n)
            want = ink_law(D, n)
            assert gotink == want, "cold ink n=%d code=%d got %s want %s" % (
                n, code, gotink, want)
        print("cold n = %d: interval count matches, 256 inks exact" % n)

    for n in (1, 3, 5, 7, 9):
        cut = solid_cut(n)
        pts = plane_points(n)
        assert cut == pts, "solid cut n=%d got %d cells want %d" % (
            n, len(cut), len(pts))
        assert len(cut) == 6 * n * n, "solid cut size n=%d got %d want %d" % (
            n, len(cut), 6 * n * n)
    print("solid cut: n = 1, 3, 5, 7, 9 agree with the slice cell for cell")

    nine = tuple(quasi(k, 9) for k in range(4))
    assert nine == (114, 32, 84, 24), "n=9 got %s want (114, 32, 84, 24)" % (
        nine,)
    assert tuple(gf_extract(k, 9) for k in range(4)) == nine, \
        "n=9 gf got %s want %s" % (tuple(gf_extract(k, 9) for k in range(4)), nine)
    print("n = 9 anchor: got %s want (114, 32, 84, 24)" % (nine,))

    one = tuple(quasi(k, 1) for k in range(4))
    assert one == (6, 0, 0, 0), "n=1 got %s want (6, 0, 0, 0)" % (one,)
    print("n = 1 boundary: got %s want (6, 0, 0, 0)" % (one,))

    ladder = set()
    for code in range(256):
        D = design(code)
        a = spectrum(D)
        b = spectrum_kraw(D)
        assert a == b, "krawtchouk code=%d got %s want %s" % (code, b, a)
        blink = -a[3] / 2
        assert (blink == 0) == (a[3] == 0), "blink zero code=%d" % code
        ladder.add(abs(blink))
    want = {Fraction(0), Fraction(1, 16), Fraction(1, 8), Fraction(3, 16),
            Fraction(1, 4)}
    assert ladder == want, "ladder got %s want %s" % (
        sorted(ladder), sorted(want))
    print("blink ladder: got %s want the same five rungs" % (
        sorted(str(v) for v in ladder),))

    reps = orbits()
    assert len(reps) == 22, "classes got %d want 22" % len(reps)
    assert sum(size for _, size in reps) == 256, "orbit sizes got %d want 256" % \
        sum(size for _, size in reps)
    still = sum(1 for code, _ in reps if spectrum_kraw(design(code))[3] == 0)
    assert still == 9, "stationary classes got %d want 9" % still
    print("symmetry: got 22 classes covering 256 designs, 9 stationary")

    for q in range(0, 12):
        for k in range(4):
            assert constituent(k, 0, 4 * q + 1) == quasi(k, 4 * q + 1), \
                "constituent k=%d n=%d" % (k, 4 * q + 1)
            assert constituent(k, 1, 4 * q + 3) == quasi(k, 4 * q + 3), \
                "constituent k=%d n=%d" % (k, 4 * q + 3)
            left = constituent(k, 0, -q - 1, True)
            right = constituent(3 - k, 1, q, True)
            assert left == right, "reciprocity q=%d k=%d got %d want %d" % (
                q, k, left, right)
    print("reciprocity: q -> -q-1 sends constituent k to constituent 3-k")

    hexa = [18 * q * q + 18 * q + 6 for q in range(6)]
    assert hexa == [6, 42, 114, 222, 366, 546], "A164016 got %s" % hexa
    assert all(quasi(0, 4 * q + 1) == hexa[q] for q in range(6)), "A164016 k=0"
    assert all(quasi(3, 4 * q + 3) == hexa[q] for q in range(6)), "A164016 k=3"
    print("A164016: got %s want 6, 42, 114, 222, 366, 546" % hexa)

    print("all green")


if __name__ == "__main__":
    main()
