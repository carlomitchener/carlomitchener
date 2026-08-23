import math
from fractions import Fraction
from itertools import permutations, product

# COPRIME

DESIGNS = [
    ("or-triangle", 2, 2, [(1, 0), (0, 1), (1, 1)], 11,
     [3, 6, 22, 58, 200, 576, 1798, 5174, 15944, 47744, 143808]),
    ("gasket", 2, 2, [(0, 0), (1, 0), (0, 1)], 11,
     [2, 4, 12, 34, 122, 362, 1130, 3406, 10506, 31550, 95260]),
    ("carpet", 3, 2, [(0, 0), (0, 1), (0, 2), (1, 0), (1, 2), (2, 0), (2, 1), (2, 2)], 5,
     [4, 32, 274, 2320, 19178]),
    ("vicsek-plus", 3, 2, [(1, 0), (0, 1), (1, 1), (2, 1), (1, 2)], 7,
     [5, 16, 90, 418, 2178, 10560, 54120]),
    ("q4-rows", 4, 2, [(0, 0), (0, 1), (0, 2), (0, 3), (1, 0), (1, 1), (1, 2), (1, 3)], 5,
     [5, 37, 302, 2340, 19100]),
    ("q4-border", 4, 2, [(0, 0), (0, 1), (0, 3), (1, 0), (1, 3), (3, 0), (3, 2), (3, 3)], 5,
     [4, 33, 318, 2690, 22675]),
    ("q5-binary-3d", 5, 3, [(0, 0, 1), (0, 1, 0), (0, 1, 1), (1, 0, 0), (1, 0, 1), (1, 1, 0), (1, 1, 1)], 6,
     [7, 42, 294, 2088, 14412, 101346]),
    ("q5-axes-3d", 5, 3, [(0, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1), (2, 0, 0), (0, 2, 0), (0, 0, 2)], 6,
     [3, 21, 189, 1467, 10911, 79425]),
    ("q6-first", 6, 2, [(0, 0), (0, 1), (1, 0), (1, 1), (2, 3), (3, 2), (4, 5), (5, 4)], 5,
     [7, 43, 403, 3105, 25881]),
    ("q6-second", 6, 2, [(0, 0), (0, 3), (1, 1), (1, 2), (2, 0), (2, 1), (4, 0), (5, 5)], 6,
     [3, 25, 230, 1789, 14918, 118380]),
]

SPONGE = [v for v in product(range(3), repeat=3) if sum(1 for c in v if c == 1) <= 1]

def die(what, got, want):
    raise AssertionError("%s: got %r, want %r" % (what, got, want))

def check(what, got, want):
    if got != want:
        die(what, got, want)

def close(what, got, want, tol):
    if abs(got - want) > tol:
        die("%s (tol %g)" % (what, tol), got, want)

def zeta3():
    n = 100000
    total = sum(1.0 / j ** 3 for j in range(1, n + 1))
    return total + 1.0 / (2 * n ** 2) - 1.0 / (2 * n ** 3) + 1.0 / (4 * n ** 4)

def primes_of(m):
    out = []
    d = 2
    while d * d <= m:
        if m % d == 0:
            out.append(d)
            while m % d == 0:
                m //= d
        d += 1
    if m > 1:
        out.append(m)
    return out

def bracket(q, F):
    k = len(F)
    ps = primes_of(q)
    total = Fraction(0)
    for mask in range(1 << len(ps)):
        e = 1
        sign = 1
        for i, p in enumerate(ps):
            if mask >> i & 1:
                e *= p
                sign = -sign
        ke = sum(1 for v in F if all(c % e == 0 for c in v))
        total += sign * Fraction(ke, k)
    return total

def predicted(q, D, F, z):
    val = float(bracket(q, F)) / z
    for p in primes_of(q):
        val /= 1.0 - p ** (-D)
    return val

def gcd_of(x):
    g = 0
    for c in x:
        g = math.gcd(g, c)
    return g

def level(q, F, D, n):
    pts = [tuple([0] * D)]
    for _ in range(n):
        pts = [tuple(q * a + b for a, b in zip(x, f)) for x in pts for f in F]
    return pts

def walk(q, F, D, n):
    pts = [tuple([0] * D)]
    for _ in range(n):
        pts = [tuple(q * a + b for a, b in zip(x, f)) for x in pts for f in F]
        yield pts

# CONSTANTS

def constants(z2, z3):
    named = [
        ("gasket", 2, 2, [(0, 0), (1, 0), (0, 1)], Fraction(2, 3), 16.0 / (3 * math.pi ** 2)),
        ("or-triangle", 2, 2, [(1, 0), (0, 1), (1, 1)], Fraction(1), 8.0 / math.pi ** 2),
        ("carpet", 3, 2, [(0, 0), (0, 1), (0, 2), (1, 0), (1, 2), (2, 0), (2, 1), (2, 2)],
         Fraction(7, 8), 189.0 / (32 * math.pi ** 2)),
        ("vicsek-plus", 3, 2, [(1, 0), (0, 1), (1, 1), (2, 1), (1, 2)],
         Fraction(1), 27.0 / (4 * math.pi ** 2)),
        ("q6-second", 6, 2, [(0, 0), (0, 3), (1, 1), (1, 2), (2, 0), (2, 1), (4, 0), (5, 5)],
         Fraction(1, 2), 9.0 / (2 * math.pi ** 2)),
        ("q4-rows", 4, 2, DESIGNS[4][3], Fraction(3, 4), 6.0 / math.pi ** 2),
        ("q4-border", 4, 2, DESIGNS[5][3], Fraction(7, 8), 7.0 / math.pi ** 2),
        ("q5-binary-3d", 5, 3, DESIGNS[6][3], Fraction(1), (125.0 / 124.0) / z3),
        ("q5-axes-3d", 5, 3, DESIGNS[7][3], Fraction(6, 7), (375.0 / 434.0) / z3),
        ("q6-first", 6, 2, DESIGNS[8][3], Fraction(7, 8), 63.0 / (8 * math.pi ** 2)),
    ]
    for name, q, D, F, wantB, wantD in named:
        check("bracket %s" % name, bracket(q, F), wantB)
        close("delta %s" % name, predicted(q, D, F, z2 if D == 2 else z3), wantD, 1e-12)
        print("constant %s: B = %s, delta = %.12f" % (name, wantB, wantD))
    check("bracket sponge", bracket(3, SPONGE), Fraction(19, 20))
    sponge = (513.0 / 520.0) / z3
    close("delta sponge", predicted(3, 3, SPONGE, z3), sponge, 1e-12)
    print("constant sponge: B = 19/20, delta = %.12f" % sponge)
    print("brackets at composite bases separate equal k: 3/4 vs 7/8 at q = 4, 7/8 vs 1/2 at q = 6")

# ENUMERATION

def enumeration(z2, z3):
    rows = 0
    points = 0
    for name, q, D, F, N, want in DESIGNS:
        k = len(F)
        B = bracket(q, F)
        check("%s lattice index" % name, lattice_index(F), 1)
        got = []
        for n, pts in enumerate(walk(q, F, D, N), start=1):
            points += len(pts)
            a = 0
            coprime_to_q = 0
            for x in pts:
                g = gcd_of(x)
                if g == 1:
                    a += 1
                if math.gcd(g, q) == 1:
                    coprime_to_q += 1
            check("%s A(%d)" % (name, n), a, want[n - 1])
            check("%s base identity at n = %d" % (name, n), Fraction(coprime_to_q), B * k ** n)
            got.append(a)
            rows += 1
        d = predicted(q, D, F, z2 if D == 2 else z3)
        print("%-13s q=%d D=%d k=%2d B=%-4s A(%d)=%d  err %+.6f"
              % (name, q, D, k, B, N, got[-1], got[-1] / float(k ** N) - d))
    check("level rows", rows, 67)
    print("enumerated %d level rows, %d points, no sampling" % (rows, points))
    print("all ten designs have lattice index 1, so all ten are spanning")

# FACTOR

def factor():
    q, D = 6, 2
    F = DESIGNS[9][3]
    k = len(F)
    check("k_2", sum(1 for v in F if all(c % 2 == 0 for c in v)), 3)
    check("k_3", sum(1 for v in F if all(c % 3 == 0 for c in v)), 2)
    check("k_6", sum(1 for v in F if all(c % 6 == 0 for c in v)), 1)
    check("bracket", bracket(q, F), Fraction(1, 2))
    for n, pts in enumerate(walk(q, F, D, 6), start=1):
        got = sum(1 for x in pts if math.gcd(gcd_of(x), 6) == 1)
        check("gcd coprime to 6 at n = %d" % n, got, k ** n // 2)
        if n >= 3:
            naive = 0.46875 * k ** n
            if abs(got - naive) < 1:
                die("naive product at n = %d" % n, naive, "a value differing from %d" % got)
            print("n=%d  |S_n|=%-7d coprime to 6 = %-7d naive = %.0f" % (n, k ** n, got, naive))
    print("the bracket 1/2 is not (1-3/8)(1-2/8) = 0.46875")

# SHARPNESS

def sharpness(z2):
    dust = [(0, 0), (0, 2), (2, 0), (2, 2)]
    for n, pts in enumerate(walk(3, dust, 2, 8), start=1):
        check("cantor dust A(%d)" % n, sum(1 for x in pts if gcd_of(x) == 1), 0)
    check("dust bracket", bracket(3, dust), Fraction(3, 4))
    close("dust predicted delta", predicted(3, 2, dust, z2), 81.0 / (16 * math.pi ** 2), 1e-12)
    check("dust lattice index", lattice_index(dust), 4)
    print("cantor dust {0,2}^2 at base 3: A(n) = 0 for 1 <= n <= 8, k = 4 > 3, predicted 0.512938")
    sheared = [(0, 0), (0, 1), (1, 0), (1, 1)]
    check("sheared bracket", bracket(3, sheared), Fraction(3, 4))
    want = 81.0 / (16 * math.pi ** 2)
    close("sheared delta", predicted(3, 2, sheared, z2), want, 1e-12)
    for n, pts in enumerate(walk(3, dust, 2, 8), start=1):
        got = sum(1 for x in pts if gcd_of(x) == 2)
        base = sum(1 for x in level(3, sheared, 2, n) if gcd_of(x) == 1)
        check("shear bijection at n = %d" % n, got, base)
    print("sheared design {0,1}^2: gcd = 2 density -> 81/(16 pi^2) = %.12f" % want)

# BOX

def box():
    trials = [("gasket", 2, 2, DESIGNS[1][3]), ("carpet", 3, 2, DESIGNS[2][3]),
              ("q6-second", 6, 2, DESIGNS[9][3])]
    tested = 0
    for name, q, D, F in trials:
        k = len(F)
        alpha = math.log(k) / math.log(q)
        for n, pts in enumerate(walk(q, F, D, 6), start=1):
            tally = {}
            for x in pts:
                g = gcd_of(x)
                if g:
                    tally[g] = tally.get(g, 0) + 1
            for m in range(2, 61):
                got = sum(c for g, c in tally.items() if g % m == 0)
                bound = (q + 1) ** D * k ** n * m ** (-alpha)
                if got > bound:
                    die("box bound %s n=%d m=%d" % (name, n, m), got, "at most %.4f" % bound)
                tested += 1
    print("box bound holds in %d exact cases, m <= 60, n <= 6" % tested)

# CENSUS

CUBE = list(product([0, 1], repeat=4))
CIDX = {v: i for i, v in enumerate(CUBE)}

def generators():
    out = []
    for a in range(3):
        p = list(range(4))
        p[a], p[a + 1] = p[a + 1], p[a]
        out.append(tuple(CIDX[tuple(v[p[j]] for j in range(4))] for v in CUBE))
    out.append(tuple(CIDX[(v[0] ^ 1, v[1], v[2], v[3])] for v in CUBE))
    return out

def burnside(dim):
    verts = list(product([0, 1], repeat=dim))
    idx = {v: i for i, v in enumerate(verts)}
    order = 0
    total = 0
    for perm in permutations(range(dim)):
        for flip in product([0, 1], repeat=dim):
            order += 1
            img = [idx[tuple(v[perm[j]] ^ flip[j] for j in range(dim))] for v in verts]
            seen = [False] * len(verts)
            cycles = 0
            for i in range(len(verts)):
                if not seen[i]:
                    cycles += 1
                    j = i
                    while not seen[j]:
                        seen[j] = True
                        j = img[j]
            total += 2 ** cycles
    return order, total // order

def lattice_index(F):
    v0 = F[0]
    rows = [[a - b for a, b in zip(v, v0)] for v in F[1:]]
    dim = len(v0)
    r = 0
    for c in range(dim):
        pivot = None
        for i in range(r, len(rows)):
            if rows[i][c]:
                pivot = i
                break
        if pivot is None:
            return 0
        rows[r], rows[pivot] = rows[pivot], rows[r]
        for i in range(r + 1, len(rows)):
            while rows[i][c]:
                f = rows[r][c] // rows[i][c]
                rows[r] = [a - f * b for a, b in zip(rows[r], rows[i])]
                rows[r], rows[i] = rows[i], rows[r]
        r += 1
    det = 1
    for c in range(dim):
        det *= rows[c][c]
    return abs(det)

def census():
    for dim, want in [(0, 2), (1, 3), (2, 6), (3, 22)]:
        order, got = burnside(dim)
        check("orbits at D = %d" % dim, got, want)
    parent = list(range(65536))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    gens = generators()
    for mask in range(65536):
        a = find(mask)
        for g in gens:
            image = 0
            for i in range(16):
                if mask >> i & 1:
                    image |= 1 << g[i]
            b = find(image)
            if a != b:
                lo, hi = (a, b) if a < b else (b, a)
                parent[hi] = lo
                a = lo
    reps = sorted({find(mask) for mask in range(65536)})
    check("orbits at D = 4", len(reps), 402)
    k_ge_2 = k_gt_2 = spanning = 0
    signatures = {}
    for mask in reps:
        F = [CUBE[i] for i in range(16) if mask >> i & 1]
        k = len(F)
        if k >= 2:
            k_ge_2 += 1
        if k > 2:
            k_gt_2 += 1
            if lattice_index(F) == 1:
                spanning += 1
        if k < 2:
            continue
        pts = [(0, 0, 0, 0)]
        sig = []
        for _ in range(4):
            pts = [(2 * x[0] + f[0], 2 * x[1] + f[1], 2 * x[2] + f[2], 2 * x[3] + f[3])
                   for x in pts for f in F]
            sig.append(sum(1 for x in pts if gcd_of(x) == 1))
        signatures.setdefault(tuple(sig), []).append(mask)
    check("representatives with k >= 2", k_ge_2, 400)
    check("representatives with k > 2", k_gt_2, 396)
    check("spanning with k > 2", spanning, 336)
    check("orbits outside the sufficient condition", 402 - spanning, 66)
    check("distinct signatures", len(signatures), 189)
    check("collision groups", sum(1 for v in signatures.values() if len(v) > 1), 87)
    print("D = 4 base 2: 402 orbits, 400 with k >= 2, 396 with k > 2, 336 spanning and k > 2")
    print("400 eligible representatives realize 189 distinct (A(1),A(2),A(3),A(4)), 87 repeated")
    print("orbit counts for D = 0..4: 2, 3, 6, 22, 402")

def main():
    z2 = math.pi ** 2 / 6.0
    z3 = zeta3()
    close("zeta(3)", z3, 1.2020569031595942854, 1e-11)
    constants(z2, z3)
    enumeration(z2, z3)
    factor()
    sharpness(z2)
    box()
    census()
    print("all green")

if __name__ == "__main__":
    main()
