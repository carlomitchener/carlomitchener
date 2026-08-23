from fractions import Fraction
from itertools import combinations
from math import gcd

# GASKET

GASKET = ((0, 0), (1, 0), (0, 1))
GASKET_SET = set(GASKET)
CELLS = [(a, b) for a in range(3) for b in range(3)]
PERMS = [(0, 1, 2), (0, 2, 1), (1, 0, 2), (1, 2, 0), (2, 0, 1), (2, 1, 0)]


def die(name, got, want):
    raise AssertionError("%s: got %r, want %r" % (name, got, want))


def check(name, got, want):
    if got != want:
        die(name, got, want)


def points(design, level):
    pts = [(0, 0)]
    for i in range(level):
        p = 3 ** i
        pts = [(x + dx * p, y + dy * p) for (x, y) in pts for (dx, dy) in design]
    return pts


def rays(pts):
    out = set()
    for (x, y) in pts:
        if x == 0 and y == 0:
            continue
        g = gcd(x, y)
        out.add((x // g, y // g))
    return out


def diagonal_to(design, level):
    seen = set()
    for L in range(1, level + 1):
        pts = points(design, L)
        n = sum(1 for p in pts if p != (0, 0))
        seen = rays(pts)
        if len(seen) != n:
            return False, 0
    return True, sum(1 for (x, y) in seen if x == 0 or y == 0)


def code(design):
    return sum(2 ** (3 * a + b) for (a, b) in design)


def graph(phi):
    return tuple((j, phi[j]) for j in range(3))


def cross_coefficient(phi, d0, u, v):
    return (phi[d0] * (u - v) - d0 * (phi[u] - phi[v])) % 3


def mass(a, b, n):
    cur = {0: 1}
    for _ in range(n):
        nxt = {}
        for c, k in cur.items():
            for (dx, dy) in GASKET:
                v = c + b * dx - a * dy
                if v % 3 == 0:
                    w = v // 3
                    nxt[w] = nxt.get(w, 0) + k
        cur = nxt
    return cur.get(0, 0) - 1


def mass_brute(a, b, n):
    total = 0
    for (x, y) in points(GASKET, n):
        if (x, y) != (0, 0) and x * b == y * a:
            total += 1
    return total


def mass_split(a, b, n):
    half = n // 2
    table = {}
    for (x, y) in points(GASKET, half):
        v = b * x - a * y
        table[v] = table.get(v, 0) + 1
    p = 3 ** half
    total = 0
    for (x, y) in points(GASKET, n - half):
        total += table.get(-p * (b * x - a * y), 0)
    return total - 1


def fibonacci(k):
    f = [0, 1, 1]
    while len(f) <= k:
        f.append(f[-1] + f[-2])
    return f[k]


def shift_product(j, n):
    if n <= j:
        return 1
    total = 1
    for r in range(j):
        m = len(range(r, n - j, j))
        total *= fibonacci(m + 2)
    return total


def narayana(n):
    a = [1, 1, 1]
    while len(a) <= n:
        a.append(a[-1] + a[-3])
    return a[n]


def quartic(n):
    c = [1, 2, 3, 4]
    while len(c) <= n:
        c.append(c[-1] + c[-4])
    return c[n]


def automaton(s, t):
    start = (0, 0, 0, 0)
    index = {start: 0}
    order = [start]
    edges = []
    i = 0
    while i < len(order):
        a1, a2, b1, b2 = order[i]
        out = []
        for (dx, dy) in GASKET:
            u = ((s * dx + a1) % 3, (s * dy + a2) % 3)
            v = ((t * dx + b1) % 3, (t * dy + b2) % 3)
            if u in GASKET_SET and v in GASKET_SET:
                nxt = ((s * dx + a1) // 3, (s * dy + a2) // 3,
                       (t * dx + b1) // 3, (t * dy + b2) // 3)
                if nxt not in index:
                    index[nxt] = len(order)
                    order.append(nxt)
                out.append(index[nxt])
        edges.append(out)
        i += 1
    return edges


def live(edges):
    back = [[] for _ in edges]
    for i, outs in enumerate(edges):
        for e in outs:
            back[e].append(i)
    seen = {0}
    stack = [0]
    while stack:
        v = stack.pop()
        for u in back[v]:
            if u not in seen:
                seen.add(u)
                stack.append(u)
    keep = sorted(seen)
    place = {v: i for i, v in enumerate(keep)}
    return [[place[e] for e in edges[v] if e in place] for v in keep]


def pair_brute(s, t, n):
    pts = set(points(GASKET, n))
    return sum(1 for (x, y) in pts
               if (s * x, s * y) in pts and (t * x, t * y) in pts)


def return_counts(edges, m):
    count = [0] * len(edges)
    count[0] = 1
    out = []
    for _ in range(m + 1):
        out.append(count[0])
        nxt = [0] * len(edges)
        for i, outs in enumerate(edges):
            for e in outs:
                nxt[e] += count[i]
        count = nxt
    return out


def charpoly(edges):
    n = len(edges)
    m = [[1 if i == j else 0 for j in range(n)] for i in range(n)]
    coeffs = [1]
    for k in range(1, n + 1):
        am = [[0] * n for _ in range(n)]
        for i, outs in enumerate(edges):
            row = am[i]
            for e in outs:
                src = m[e]
                for j in range(n):
                    row[j] += src[j]
        trace = sum(am[i][i] for i in range(n))
        if trace % k != 0:
            die("Faddeev-LeVerrier integrality", trace % k, 0)
        ck = -(trace // k)
        coeffs.append(ck)
        for i in range(n):
            am[i][i] += ck
        m = am
    return coeffs


def shift_coefficients(coeffs, r):
    p = list(coeffs)
    out = []
    for _ in range(len(coeffs)):
        acc = 0
        nb = []
        for a in p:
            acc = acc * r + a
            nb.append(acc)
        out.append(nb[-1])
        p = nb[:-1]
    return out


def evaluate(coeffs, x):
    acc = 0
    for a in coeffs:
        acc = acc * x + a
    return acc


def no_root_above(coeffs, r):
    return all(v >= 0 for v in shift_coefficients(coeffs, r))


def bisect(coeffs, steps):
    lo, hi = Fraction(0), Fraction(4)
    for _ in range(steps):
        mid = (lo + hi) / 2
        if no_root_above(coeffs, mid):
            hi = mid
        else:
            lo = mid
    return lo, hi


def in_window(coeffs, lo, hi):
    return evaluate(coeffs, lo) < 0 and no_root_above(coeffs, hi)


def word_counts(edges, m):
    count = [0] * len(edges)
    count[0] = 1
    out = []
    for _ in range(m + 1):
        out.append(sum(count))
        nxt = [0] * len(edges)
        for i, outs in enumerate(edges):
            for e in outs:
                nxt[e] += count[i]
        count = nxt
    return out


# CENSUS OF DESIGNS

def census_designs():
    survivors = []
    for design in combinations(CELLS, 3):
        ok, fibres = diagonal_to(design, 6)
        if ok:
            survivors.append((design, fibres))
    check("no-two-collinear subsets to level 6", len(survivors), 10)
    perms = [(d, f) for (d, f) in survivors
             if len(set(a for a, b in d)) == 3 and len(set(b for a, b in d)) == 3]
    check("permutation designs among survivors", len(perms), 4)
    check("survivors with exactly two fibre rays",
          sorted(d for (d, f) in survivors if f == 2), sorted(d for (d, f) in perms))
    want_codes = sorted([98, 140, 266, 84])
    check("codes of the four diagonal designs",
          sorted(code(d) for (d, f) in perms), want_codes)
    check("code 148 is not a permutation design",
          sorted(c for c in CELLS if 148 >> (3 * c[0] + c[1]) & 1),
          [(0, 2), (1, 1), (2, 1)])
    good = sorted(graph(p) for p in PERMS if p[0] != 0)
    check("diagonal designs are exactly the phi(0) nonzero graphs",
          sorted(tuple(sorted(d)) for (d, f) in perms),
          sorted(tuple(sorted(g)) for g in good))
    extra = sorted(d for (d, f) in survivors if f != 2)
    check("the six non-permutation survivors", extra, [
        ((0, 1), (1, 1), (2, 1)),
        ((0, 2), (1, 2), (2, 2)),
        ((1, 0), (1, 1), (1, 2)),
        ((1, 1), (1, 2), (2, 1)),
        ((1, 2), (2, 1), (2, 2)),
        ((2, 0), (2, 1), (2, 2)),
    ])
    print("84 subsets to level 6: 10 with no two points collinear, 4 of them permutation designs")


def census_cross():
    for phi in PERMS:
        got = set()
        for d0 in range(3):
            for u in range(3):
                for v in range(3):
                    if u != v:
                        got.add(cross_coefficient(phi, d0, u, v) != 0)
                        check("affine collapse of the cross coefficient",
                              cross_coefficient(phi, d0, u, v), (phi[0] * (u - v)) % 3)
        check("18 cross cases for phi=%r" % (phi,), got, {phi[0] != 0})
    print("cross coefficient: nonzero in all 18 cases exactly when phi(0) is nonzero")


def census_diagonality():
    for phi in PERMS:
        if phi[0] == 0:
            continue
        design = graph(phi)
        for n in range(1, 9):
            pts = points(design, n)
            check("Z(n) for phi=%r at n=%d" % (phi, n),
                  len(rays(pts)) - 2, 3 ** n - 2)
        check("Z at n=0 for phi=%r" % (phi,), len(rays(points(design, 0))), 0)
    identity = points(graph((0, 1, 2)), 1)
    check("identity witness at level 1", sorted(identity), [(0, 0), (1, 1), (2, 2)])
    check("identity determinant", 1 * 2 - 1 * 2, 0)
    doubling = points(graph((0, 2, 1)), 2)
    check("doubling witnesses at level 2", ((1, 2) in doubling, (3, 6) in doubling), (True, True))
    check("doubling determinant", 1 * 6 - 2 * 3, 0)
    print("Z_F(n) = 3^n - 2 for all four diagonal designs, n = 1..8; both phi(0) = 0 designs collapse")


# RAY MASSES

def census_masses():
    got = [mass(3, 1, n) for n in range(1, 31)]
    check("M(3,1) to n=30", got, [fibonacci(n + 1) - 1 for n in range(1, 31)])
    got = [mass(1, 12, n) for n in range(1, 31)]
    check("M(1,12) to n=30", got, [narayana(n) - 1 for n in range(1, 31)])
    got = [mass(7, 3, n) for n in range(3, 31)]
    check("M(7,3) to n=30", got, [quartic(n - 3) - 1 for n in range(3, 31)])
    for j in range(1, 14):
        got = [mass(3 ** j, 1, n) for n in range(1, 31)]
        check("M(3^%d,1) to n=30" % j, got,
              [shift_product(j, n) - 1 for n in range(1, 31)])
    for (a, b) in [(3, 1), (1, 12), (7, 3), (9, 1), (27, 1), (12, 13)]:
        for n in range(1, 11):
            check("automaton against brute force at (%d,%d), n=%d" % (a, b, n),
                  mass(a, b, n), mass_brute(a, b, n))
        for n in range(1, 15):
            check("automaton against split enumeration at (%d,%d), n=%d" % (a, b, n),
                  mass(a, b, n), mass_split(a, b, n))
    squares = [(n, mass(7, 3, n)) for n in range(1, 31)
               if mass(7, 3, n) > 0 and int(round(mass(7, 3, n) ** 0.5)) ** 2 == mass(7, 3, n)]
    check("perfect-square masses on (7,3) to n=30", squares,
          [(4, 1), (7, 4), (9, 9), (12, 25), (14, 49)])
    check("rational roots of x^4 - x^3 - 1",
          [r for r in (1, -1) if r ** 4 - r ** 3 - 1 == 0], [])
    check("integer quadratic factorisations of x^4 - x^3 - 1",
          [(a, b, c, d) for b, d in ((1, -1), (-1, 1))
           for a in range(-9, 10) for c in range(-9, 10)
           if a + c == -1 and b + d + a * c == 0 and a * d + b * c == 0], [])
    print("mass laws on (3,1), (1,12), (7,3) and the thirteen shift rays: exact to n = 30")


def census_gasket(n):
    pts = points(GASKET, n)
    check("gasket size at n=%d" % n, len(pts), 3 ** n)
    counts = {}
    for (x, y) in pts:
        if x == 0 or y == 0:
            continue
        g = gcd(x, y)
        r = (x // g, y // g)
        counts[r] = counts.get(r, 0) + 1
    total = sum(counts.values())
    check("non-fibre mass at n=%d" % n, total, 3 ** n - 2 ** (n + 1) + 1)
    return counts


def census_rays():
    for n in range(1, 12):
        census_gasket(n)
    counts = census_gasket(12)
    check("occupied non-fibre rays at n=12", len(counts), 345318)
    check("non-fibre mass at n=12", sum(counts.values()), 523250)
    top = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:10]
    check("ten heaviest rays at n=12", top, [
        ((1, 3), 232), ((3, 1), 232), ((1, 9), 168), ((9, 1), 168),
        ((1, 27), 124), ((27, 1), 124), ((1, 81), 80), ((81, 1), 80),
        ((1, 243), 71), ((243, 1), 71)])
    check("mirror symmetry of ray masses at n=12",
          all(counts[(b, a)] == m for (a, b), m in counts.items()), True)
    print("gasket census to n = 12: 345318 occupied non-fibre rays carrying 523250 points")


# SPECTRAL GAP

def census_spectrum():
    pairs = [(s, t) for s in range(1, 53) for t in range(s + 1, 53) if gcd(s, t) == 1]
    check("coprime unordered pairs with max at most 52", len(pairs), 829)
    reachable = {p: automaton(*p) for p in pairs}
    trimmed = {p: live(reachable[p]) for p in pairs}
    check("largest reachable state set", max(len(reachable[p]) for p in pairs), 45)
    check("largest live state set", max(len(trimmed[p]) for p in pairs), 33)
    check("(1,16) reachable states", len(reachable[(1, 16)]), 11)
    check("(1,16) live states", len(trimmed[(1, 16)]), 1)
    plastic = bisect(charpoly(reachable[(1, 16)]), 52)
    check("(1,16) reachable radius is the plastic number",
          (Fraction(13247179572, 10 ** 10) < plastic[0],
           plastic[1] < Fraction(13247179573, 10 ** 10)), (True, True))
    polys = {p: charpoly(trimmed[p]) for p in pairs}
    at_three, at_two, between, below = [], [], [], []
    for p in pairs:
        c = polys[p]
        if not no_root_above(c, 2):
            if evaluate(c, 3) == 0 and no_root_above(c, 3):
                at_three.append(p)
            else:
                between.append(p)
        elif evaluate(c, 2) == 0:
            at_two.append(p)
        else:
            below.append(p)
    check("pairs of spectral radius 3", at_three, [(1, 3), (1, 9), (1, 27)])
    check("pairs in the open interval (2,3)", between, [])
    check("non-shift pairs attaining exactly 2", len(at_two), 20)
    check("the twenty attainers", at_two, [
        (1, 4), (1, 7), (1, 10), (1, 12), (1, 21), (1, 28), (1, 30), (1, 36),
        (3, 4), (3, 7), (3, 10), (3, 28), (4, 9), (4, 27), (7, 9), (7, 27),
        (9, 10), (9, 28), (10, 27), (27, 28)])
    top_lo, top_hi = Fraction(16956207695598, 10 ** 13), Fraction(16956207695599, 10 ** 13)
    next_lo, next_hi = Fraction(16769719158912, 10 ** 13), Fraction(16769719158913, 10 ** 13)
    ties = [p for p in below if not no_root_above(polys[p], Fraction(42, 25))]
    check("pairs with radius above 42/25", len(ties), 25)
    check("the simplest attainer", ties[0], (1, 13))
    check("(12,13) is among them", (12, 13) in ties, True)
    for p in ties:
        check("largest radius below 2, window at %r" % (p,),
              in_window(polys[p], top_lo, top_hi), True)
    second = [p for p in below if p not in ties
              and not no_root_above(polys[p], Fraction(167, 100))]
    check("pairs with radius above 167/100 and below the largest", second,
          [(1, 31), (3, 31), (9, 31), (27, 31)])
    for p in second:
        check("next radius down, window at %r" % (p,),
              in_window(polys[p], next_lo, next_hi), True)
    lo, hi = bisect(polys[(1, 13)], 52)
    check("exact bisection lands inside the quoted window",
          (top_lo <= lo, hi <= top_hi), (True, True))
    for p in [(2, 9), (1, 18)]:
        check("live automaton at %r" % (p,), (trimmed[p], polys[p]), ([[0]], [1, -1]))
    check("(1,4) characteristic polynomial", polys[(1, 4)], [1, -1, -2, 0])
    check("(1,4) live states", len(trimmed[(1, 4)]), 3)
    counts = word_counts(trimmed[(1, 4)], 15)
    check("(1,4) admissible word counts to m=15", counts,
          [(2 ** (m + 2) - (-1) ** m) // 3 for m in range(16)])
    for m in range(2, 16):
        check("(1,4) recurrence residual at m=%d" % m,
              counts[m] - counts[m - 1] - 2 * counts[m - 2], 0)
    returns = return_counts(trimmed[(1, 4)], 15)
    check("(1,4) return counts to m=15", returns,
          [(2 ** (m + 1) + (-1) ** m) // 3 for m in range(16)])
    for (s, t) in [(1, 4), (1, 16), (3, 7), (12, 13)]:
        got = return_counts(trimmed[(s, t)], 8)
        check("return counts against brute force at (%d,%d)" % (s, t), got,
              [pair_brute(s, t, n) for n in range(9)])
    print("829 coprime pairs with max at most 52: radius 3 on three pairs, exactly 2 on twenty, nothing in between")


def main():
    census_designs()
    census_cross()
    census_diagonality()
    census_masses()
    census_rays()
    census_spectrum()
    print("all green")


if __name__ == "__main__":
    main()
