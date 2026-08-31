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


def mass_edges(a, b):
    index = {0: 0}
    order = [0]
    edges = []
    i = 0
    while i < len(order):
        c = order[i]
        out = []
        for (dx, dy) in GASKET:
            v = c + b * dx - a * dy
            if v % 3 == 0:
                w = v // 3
                if w not in index:
                    index[w] = len(order)
                    order.append(w)
                out.append(index[w])
        edges.append(out)
        i += 1
    return edges


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


FIB = [0, 1, 1]
LUC = [2, 1]


def fibonacci(k):
    while len(FIB) <= k:
        FIB.append(FIB[-1] + FIB[-2])
    return FIB[k]


def lucas(k):
    while len(LUC) <= k:
        LUC.append(LUC[-1] + LUC[-2])
    return LUC[k]


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


def free_automaton(s, t):
    start = (0, 0, 0, 0)
    index = {start: 0}
    order = [start]
    edges = []
    i = 0
    while i < len(order):
        a1, a2, b1, b2 = order[i]
        out = []
        for dx in range(3):
            for dy in range(3):
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


def divides(d, f):
    f = list(f)
    while len(f) >= len(d):
        if f[0] % d[0] != 0:
            return False
        q = f[0] // d[0]
        for i in range(len(d)):
            f[i] -= q * d[i]
        if f[0] != 0:
            return False
        f.pop(0)
    return all(c == 0 for c in f)


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


def nonneg(x, y):
    if x >= 0 and y >= 0:
        return True
    if x < 0 and y < 0:
        return False
    if y >= 0:
        return 5 * y * y >= x * x
    return x * x >= 5 * y * y


def power_root5(a, b, j):
    p, q = 1, 0
    for _ in range(j):
        p, q = a * p + 5 * b * q, a * q + b * p
    return p, q


def shift_strings(n, j):
    total = 0
    for z in range(2 ** (n - j)):
        d = [(z >> i) & 1 for i in range(n - j)]
        if all(not (d[i] and d[i - j]) for i in range(j, len(d))):
            total += 1
    return total - 1


def census_recurrences():
    for (a, b, want, seeds) in [
            (3, 1, [1, -1, -1], [fibonacci(n + 1) for n in range(0, 3)]),
            (1, 12, [1, -1, 0, -1], [narayana(n) for n in range(0, 4)]),
            (7, 3, [1, -1, 0, 0, -1], [quartic(n) for n in range(0, 5)])]:
        edges = live(mass_edges(a, b))
        check("live carry states at (%d,%d)" % (a, b), len(edges), len(want) - 1)
        check("carry characteristic polynomial at (%d,%d)" % (a, b),
              charpoly(edges), want)
        k = len(want) - 1
        got = return_counts(edges, 2 * k + 12)
        off = 3 if (a, b) == (7, 3) else 0
        check("automaton seeds at (%d,%d)" % (a, b), got[off:off + k], seeds[:k])
        for m in range(k, len(got)):
            check("annihilator residual at (%d,%d), m=%d" % (a, b, m),
                  sum(want[i] * got[m - i] for i in range(k + 1)), 0)
    print("mass recurrences are Cayley-Hamilton on 2, 3 and 4 live carry states")


def census_shift():
    for k in range(2, 400):
        check("F(%d) <= 2 F(%d)" % (k, k - 1),
              fibonacci(k) <= 2 * fibonacci(k - 1), True)
    for n in range(1, 12):
        for j in range(1, n + 1):
            check("shift strings at n=%d, j=%d" % (n, j),
                  (mass(3 ** j, 1, n), shift_strings(n, j)),
                  (shift_product(j, n) - 1, shift_product(j, n) - 1))
    for n in range(1, 61):
        for j in range(1, n + 1):
            q, rem = divmod(n - j, j)
            check("block form at n=%d, j=%d" % (n, j), shift_product(j, n),
                  fibonacci(q + 3) ** rem * fibonacci(q + 2) ** (j - rem))
            p, r = power_root5(3, -1, j)
            m = shift_product(j, n) - 1
            check("per-j bound at n=%d, j=%d" % (n, j),
                  nonneg(p * lucas(n) + 5 * r * fibonacci(n) - 2 * m,
                         p * fibonacci(n) + r * lucas(n)), True)
    for n in range(1, 161):
        sh = 2 * sum((shift_product(j, n) - 1) ** 2 for j in range(1, n + 1))
        el, ef = lucas(2 * n), fibonacci(2 * n)
        check("family bound at n=%d" % n,
              nonneg(4 * el + 60 * ef - 22 * sh, 12 * el + 4 * ef), True)
        if n >= 100:
            check("family limit window below at n=%d" % n,
                  nonneg(2000000 * sh - 2198212 * el, -2198212 * ef), True)
            check("family limit window above at n=%d" % n,
                  nonneg(2198214 * el - 2000000 * sh, 2198214 * ef), True)
    print("shift family: M_n(3^j,1) < (3 - sqrt5)^j phi^n and sum of squares "
          "in (2.198212, 2.198214) phi^2n from n = 100")


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
    second, residual = [], []
    for n in range(1, 13):
        counts = census_gasket(n)
        z = sum(m * m for m in counts.values())
        second.append(z)
        residual.append(z - (3 ** n - 2 ** (n + 1) + 1)
                        - (3 ** n - 4 * 2 ** n + 2 * n + 3))
        check("shift-ray second moment at n=%d" % n,
              sum(m * m for r, m in counts.items() if is_shift_pair(*r)),
              2 * sum((shift_product(j, n) - 1) ** 2 for j in range(1, n + 1)))
    for n in range(1, 21):
        check("shift-multiplier closed form at n=%d" % n,
              2 * sum(3 ** (n - j) - 2 ** (n - j + 1) + 1 for j in range(1, n)),
              3 ** n - 4 * 2 ** n + 2 * n + 3)
    check("E(n) for n = 1..12", second,
          [0, 2, 16, 98, 396, 1522, 5248, 17118, 52212, 158042, 466960, 1374038])
    check("R(n) for n = 1..12", residual,
          [0, 0, 0, 20, 88, 432, 1624, 5512, 15896, 46064, 124928, 335704])
    check("occupied non-fibre rays at n=12", len(counts), 345318)
    check("non-fibre mass at n=12", sum(counts.values()), 523250)
    top = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:10]
    check("ten heaviest rays at n=12", top, [
        ((1, 3), 232), ((3, 1), 232), ((1, 9), 168), ((9, 1), 168),
        ((1, 27), 124), ((27, 1), 124), ((1, 81), 80), ((81, 1), 80),
        ((1, 243), 71), ((243, 1), 71)])
    check("mirror symmetry of ray masses at n=12",
          all(counts[(b, a)] == m for (a, b), m in counts.items()), True)
    print("gasket census to n = 12: 345318 occupied non-fibre rays carrying 523250 points, "
          "E(12) = 1374038, R(12) = 335704")


# PAIR CENSUS

def ray_masses(n):
    out = {}
    for (x, y) in points(GASKET, n):
        if x == 0 or y == 0:
            continue
        g = gcd(x, y)
        r = (x // g, y // g)
        if r in out:
            out[r].append(g)
        else:
            out[r] = [g]
    return out


def is_shift_pair(s, t):
    if min(s, t) != 1:
        return False
    u = max(s, t)
    while u % 3 == 0:
        u //= 3
    return u == 1


def census_pairs():
    n = 9
    pts = set(points(GASKET, n))
    by_ray = ray_masses(n)
    check("occupied non-fibre rays at n=9", len(by_ray), 12170)
    Z = sum(len(v) ** 2 for v in by_ray.values())
    T = 3 ** n - 2 ** (n + 1) + 1
    S = 3 ** n - 4 * 2 ** n + 2 * n + 3
    check("E(9), diagonal, 3-power family and residual at n=9",
          (Z, T, S, Z - T - S), (52212, 18660, 17656, 15896))
    check("shift-ray share of the second moment at n=9",
          sum(len(v) ** 2 for r, v in by_ray.items() if is_shift_pair(*r)), 11852)
    census, inside = {}, {}
    for ray, gs in by_ray.items():
        for g in gs:
            for h in gs:
                if g == h:
                    continue
                d = gcd(g, h)
                key = (g // d, h // d)
                census[key] = census.get(key, 0) + 1
                hit = 1 if (d * ray[0], d * ray[1]) in pts else 0
                inside[key] = inside.get(key, 0) + hit
    check("ordered off-diagonal collinear pairs at n=9",
          sum(census.values()), Z - T)
    check("shift-multiplier family at n=9",
          sum(v for k, v in census.items() if is_shift_pair(*k)), S)
    check("active ordered multiplier pairs at n=9", len(census), 2656)
    check("active unordered multiplier pairs at n=9", len(census) // 2, 1328)
    check("shift pairs among them",
          sorted(k for k in census if is_shift_pair(*k)),
          [(1, 3 ** j) for j in range(1, 8)] + [(3 ** j, 1) for j in range(1, 8)])
    check("largest multiplier at n=9", max(max(k) for k in census), 2460)
    short = [k for k in census if census[k] != inside[k]]
    check("ordered pairs whose witness leaves the gasket", len(short), 482)
    check("witnesses outside the gasket",
          sum(census[k] - inside[k] for k in short), 2540)
    check("every such pair has both multipliers above one",
          min(min(k) for k in short), 2)
    worst = max(census[k] - inside[k] for k in short)
    check("worst such pairs",
          (worst, sorted(k for k in short if census[k] - inside[k] == worst),
           inside[(41, 122)]),
          (50, [(41, 122), (122, 41), (122, 123), (123, 122)], 0))
    binary = set()
    for u in range(2 ** n):
        binary.add(sum(((u >> i) & 1) * 3 ** i for i in range(n)))
    for (s, t) in sorted(k for k in census if k[0] < k[1]):
        got = return_counts(live(automaton(s, t)), n)[n]
        fib = sum(1 for u in binary
                  if u > 0 and s * u in binary and t * u in binary)
        check("A(%d,%d) against brute force at n=9" % (s, t),
              got - 1 - 2 * fib, inside[(s, t)])
        if t > 52:
            continue
        got = return_counts(live(free_automaton(s, t)), n)[n]
        fib = sum(1 for u in range(1, 3 ** n // t + 1)
                  if s * u in binary and t * u in binary)
        check("B(%d,%d) against brute force at n=9" % (s, t),
              got - 1 - 2 * fib, census[(s, t)])
    small = [k for k in census if k[0] < k[1] and k[1] <= 52]
    check("unordered pairs of height at most 52 at n=9", len(small), 103)
    check("collinear pairs they carry", sum(census[k] for k in small), 11330)
    print("n = 9 pair census: 2656 active ordered multiplier pairs, 482 of them "
          "with a witness off the gasket")


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
    free = {p: live(free_automaton(*p)) for p in pairs}
    check("largest free live state set", max(len(free[p]) for p in pairs), 167)
    check("(1,16) free live states", len(free[(1, 16)]), 1)
    for p in pairs:
        if p[0] == 1:
            check("free and gasket-digit automata agree at %r" % (p,),
                  free[p], trimmed[p])
    fpolys = {p: charpoly(free[p]) for p in pairs}
    f3, f2, fmid = [], [], []
    for p in pairs:
        c = fpolys[p]
        if not no_root_above(c, 2):
            (f3 if evaluate(c, 3) == 0 and no_root_above(c, 3) else fmid).append(p)
        elif evaluate(c, 2) == 0:
            f2.append(p)
    check("free pairs of spectral radius 3", f3, at_three)
    check("free pairs in the open interval (2,3)", fmid, [])
    check("free pairs attaining exactly 2", f2, at_two)
    fstrict = [p for p in pairs if p not in f3 and p not in f2]
    flo, fhi = Fraction(18488475886, 10 ** 10), Fraction(18488475887, 10 ** 10)
    ftop = [p for p in fstrict if not no_root_above(fpolys[p], flo)]
    check("free pairs above 1.8488475886", ftop,
          [(4, 13), (4, 39), (12, 13), (13, 36)])
    for p in ftop:
        check("largest free radius below 2, window at %r" % (p,),
              in_window(fpolys[p], flo, fhi), True)
    check("free bisection at (4,13) lands inside the quoted window",
          (flo <= bisect(fpolys[(4, 13)], 52)[0],
           bisect(fpolys[(4, 13)], 52)[1] <= fhi), (True, True))
    theta = [1, -1, 0, -2]
    check("theta is the gasket-digit ceiling below 2", in_window(theta, top_lo, top_hi), True)
    fabove = [p for p in fstrict if not no_root_above(fpolys[p], top_hi)]
    fat = [p for p in fstrict if p not in fabove and not no_root_above(fpolys[p], top_lo)]
    check("free pairs strictly above theta and below 2", len(fabove), 19)
    check("free pairs whose radius is exactly theta", len(fat), 25)
    check("free pairs reaching or beating theta", len(fabove) + len(fat), 44)
    check("the 25 carry the theta factor and the 19 do not",
          (all(divides(theta, fpolys[p]) for p in fat),
           [p for p in fabove if divides(theta, fpolys[p])]), (True, []))
    for p in fat:
        check("radius exactly theta, window at %r" % (p,),
              in_window(fpolys[p], top_lo, top_hi), True)
    check("(4,13) free closed paths at n=60",
          return_counts(free[(4, 13)], 60)[60], 4583352807133551)
    check("(4,13) gasket-digit closed paths at n=60 are smaller",
          return_counts(trimmed[(4, 13)], 60)[60] < 4583352807133551, True)
    print("the free-digit automaton keeps the gap at three, two and the empty "
          "interval, but its largest radius below 2 is 1.8488475886 on four pairs")


# WITNESS WEIGHTS

def carry_automaton(s, t):
    index = {(0, 0): 0}
    order = [(0, 0)]
    edges = []
    i = 0
    while i < len(order):
        a, b = order[i]
        out = []
        for d in range(3):
            u = (s * d + a) % 3
            v = (t * d + b) % 3
            if u < 2 and v < 2:
                nxt = ((s * d + a) // 3, (t * d + b) // 3)
                if nxt not in index:
                    index[nxt] = len(order)
                    order.append(nxt)
                out.append((u, v, index[nxt]))
        edges.append(out)
        i += 1
    return edges


def carry_live(edges):
    back = [[] for _ in edges]
    for i, out in enumerate(edges):
        for (u, v, j) in out:
            back[j].append(i)
    seen = {0}
    stack = [0]
    while stack:
        x = stack.pop()
        for y in back[x]:
            if y not in seen:
                seen.add(y)
                stack.append(y)
    keep = sorted(seen)
    place = {v: i for i, v in enumerate(keep)}
    return [[(u, v, place[j]) for (u, v, j) in edges[x] if j in place] for x in keep]


def tensor_returns(s, t, n):
    e = carry_live(carry_automaton(s, t))
    k = len(e)
    S = [[j for (u, v, j) in e[i]] for i in range(k)]
    U = [[j for (u, v, j) in e[i] if u] for i in range(k)]
    V = [[j for (u, v, j) in e[i] if v] for i in range(k)]
    W = [[j for (u, v, j) in e[i] if u and v] for i in range(k)]
    X = [[0] * k for _ in range(k)]
    X[0][0] = 1
    out = [1]
    for _ in range(n):
        half = []
        for A in (S, U, V, W):
            Y = []
            for i in range(k):
                acc = [0] * k
                for p in A[i]:
                    xp = X[p]
                    for q in range(k):
                        if xp[q]:
                            acc[q] += xp[q]
                Y.append(acc)
            half.append(Y)
        Ys, Yu, Yv, Yw = half
        Z = [[0] * k for _ in range(k)]
        for j in range(k):
            for i in range(k):
                a = 0
                for q in S[j]:
                    a += Ys[i][q]
                for q in U[j]:
                    a -= Yu[i][q]
                for q in V[j]:
                    a -= Yv[i][q]
                for q in W[j]:
                    a += Yw[i][q]
                Z[i][j] = a
        X = Z
        out.append(X[0][0])
    return out


def witness_mass(z1, z2, n):
    e = carry_live(carry_automaton(z1, z2))
    k = len(e)
    adj = [[j for (u, v, j) in e[i] if not (u and v)] for i in range(k)]
    cur = [0] * k
    cur[0] = 1
    out = [1]
    for _ in range(n):
        nxt = [0] * k
        for i in range(k):
            c = cur[i]
            if c:
                for j in adj[i]:
                    nxt[j] += c
        cur = nxt
        out.append(cur[0])
    return [v - 1 for v in out]


def in_gasket(x, y, n):
    if x >= 3 ** n or y >= 3 ** n:
        return False
    while x or y:
        a, b = x % 3, y % 3
        if a > 1 or b > 1 or (a and b):
            return False
        x //= 3
        y //= 3
    return True


def box_count(s, t, n):
    w = (3 ** n - 1) // (2 * max(s, t))
    c = 0
    for z1 in range(1, w):
        for z2 in range(1, w - z1 + 1):
            if in_gasket(s * z1, s * z2, n) and in_gasket(t * z1, t * z2, n):
                c += 1
    return c


def fibre_count(s, t, n):
    binary = set(sum(((u >> i) & 1) * 3 ** i for i in range(n)) for u in range(2 ** n))
    return sum(1 for u in range(1, 3 ** n // t + 1) if s * u in binary and t * u in binary)


def no_adjacent(n):
    out = []
    for m in range(1, 3 ** (n - 1)):
        x, prev, ok = m, 0, True
        while x:
            d = x % 3
            if d > 1 or (d and prev):
                ok = False
                break
            prev, x = d, x // 3
        if ok:
            out.append(m)
    return out


def three_power_ratio(a, b):
    if a > b:
        a, b = b, a
    if b % a:
        return False
    q = b // a
    while q % 3 == 0:
        q //= 3
    return q == 1


def residual_layers(n):
    by = {}
    for (x, y) in points(GASKET, n):
        if x and y:
            g = gcd(x, y)
            by.setdefault((x // g, y // g), []).append(g)
    total = 0
    weight = {}
    pair = {}
    for r, gs in by.items():
        if len(gs) < 2:
            continue
        rs = r[0] + r[1]
        for a in gs:
            for b in gs:
                if a == b:
                    continue
                d = gcd(a, b)
                if is_shift_pair(a // d, b // d):
                    continue
                total += 1
                weight[d * rs] = weight.get(d * rs, 0) + 1
                k = (a // d, b // d)
                if k[0] > k[1]:
                    k = (k[1], k[0])
                pair[k] = pair.get(k, 0) + 1
    return total, weight, pair


def ceiling_families():
    bin3 = [sum(((u >> i) & 1) * 3 ** i for i in range(7)) for u in range(1, 128)]
    nad = []
    for m in range(1, 3 ** 7):
        x, prev, ok = m, 0, True
        while x:
            d = x % 3
            if d > 1 or (d and prev):
                ok = False
                break
            prev, x = d, x // 3
        if ok:
            nad.append(m)
    return [
        [(a, b) for a in bin3 for b in bin3 if a < b],
        [(a, b) for a in nad for b in nad if a < b],
        [(1, t) for t in range(2, 3000)],
        [(a, a + 1) for a in range(1, 1500)],
        [(a, 3 * a - 1) for a in range(1, 1200)],
        [(a, 3 * a + 1) for a in range(1, 1200)],
    ]


def second_moment(n):
    keys = []
    for (x, y) in points(GASKET, n):
        if x and y:
            g = gcd(x, y)
            keys.append((x // g) * 3 ** n + y // g)
    keys.sort()
    total = 0
    run = 1
    for i in range(1, len(keys)):
        if keys[i] == keys[i - 1]:
            run += 1
        else:
            total += run * run
            run = 1
    return total + run * run


# THE PROVED CEILING


def direction_automaton(a, b):
    index = {0: 0}
    order = [0]
    edges = []
    i = 0
    while i < len(order):
        c = order[i]
        out = []
        for eps in (0, b, -a):
            if (c + eps) % 3 == 0:
                nxt = (c + eps) // 3
                if nxt not in index:
                    index[nxt] = len(order)
                    order.append(nxt)
                out.append((eps, index[nxt]))
        edges.append(out)
        i += 1
    return order, edges


def direction_live(a, b):
    order, edges = direction_automaton(a, b)
    back = [[] for _ in edges]
    for i, out in enumerate(edges):
        for (eps, j) in out:
            back[j].append(i)
    seen = {0}
    stack = [0]
    while stack:
        x = stack.pop()
        for y in back[x]:
            if y not in seen:
                seen.add(y)
                stack.append(y)
    keep = sorted(seen)
    place = {v: i for i, v in enumerate(keep)}
    return ([order[x] for x in keep],
            [[(eps, place[j]) for (eps, j) in edges[x] if j in place]
             for x in keep])


def direction_mass(a, b, n):
    order, edges = direction_live(a, b)
    cur = [0] * len(edges)
    cur[0] = 1
    out = [1]
    for _ in range(n):
        nxt = [0] * len(edges)
        for i in range(len(edges)):
            if cur[i]:
                for (eps, j) in edges[i]:
                    nxt[j] += cur[i]
        cur = nxt
        out.append(cur[0])
    return [v - 1 for v in out]


def state_profile(order, edges, n):
    tab = [[1 if order[i] == 0 else 0 for i in range(len(edges))]]
    for _ in range(n):
        prev = tab[-1]
        tab.append([sum(prev[j] for (eps, j) in edges[i])
                    for i in range(len(edges))])
    return [max(r) for r in tab]


def valuation3(x):
    k = 0
    while x % 3 == 0:
        x //= 3
        k += 1
    return k


def shift_ray(a, b):
    lo, hi = min(a, b), max(a, b)
    if lo != 1:
        return False
    while hi % 3 == 0:
        hi //= 3
    return hi == 1


def certificate_holds(a, b, den, alpha, beta):
    order, edges = direction_live(a, b)
    if len(order) != len(alpha) or len(order) != len(beta):
        return False
    if alpha[0] != den or beta[0] != 0:
        return False
    for i in range(len(edges)):
        if alpha[i] < 0:
            return False
        if sum(alpha[j] for (eps, j) in edges[i]) > alpha[i] + beta[i]:
            return False
        if sum(beta[j] for (eps, j) in edges[i]) > alpha[i]:
            return False
    return True


def binary_multiples(w, n):
    cur = [0] * w
    cur[0] = 1
    for i in range(n):
        p = pow(3, i, w)
        nxt = list(cur)
        for r in range(w):
            if cur[r]:
                nxt[(r + p) % w] += cur[r]
        cur = nxt
    return cur[0] - 1


def qnorm(p, q, d):
    if d < 0:
        p, q, d = -p, -q, -d
    g = gcd(gcd(abs(p), abs(q)), d)
    if g > 1:
        p //= g
        q //= g
        d //= g
    return (p, q, d)


def qadd(x, y):
    return qnorm(x[0] * y[2] + y[0] * x[2],
                 x[1] * y[2] + y[1] * x[2], x[2] * y[2])


def qsub(x, y):
    return qnorm(x[0] * y[2] - y[0] * x[2],
                 x[1] * y[2] - y[1] * x[2], x[2] * y[2])


def qmul(x, y):
    return qnorm(x[0] * y[0] + x[1] * y[1],
                 x[0] * y[1] + x[1] * y[0] + x[1] * y[1], x[2] * y[2])


def qinv(x):
    p, q, d = x
    return qnorm(d * (p + q), -d * q, p * p + p * q - q * q)


def qsgn(x):
    p, q, d = x
    hi, lo = 2 * p + q, q
    if hi >= 0 and lo >= 0:
        return 0 if hi == 0 and lo == 0 else 1
    if hi <= 0 and lo <= 0:
        return 0 if hi == 0 and lo == 0 else -1
    s = hi * hi - 5 * lo * lo
    if hi > 0:
        return 1 if s > 0 else (0 if s == 0 else -1)
    return -1 if s > 0 else (0 if s == 0 else 1)


QZERO = (0, 0, 1)
QONE = (1, 0, 1)
QPHI = (0, 1, 1)
QINVPHI = (-1, 1, 1)
QINVPHI2 = (2, -1, 1)


def golden_potential(order, edges):
    n = len(order)
    if n == 1:
        return None
    m = n - 1
    rows = [[QZERO] * (m + 1) for _ in range(m)]
    for r in range(m):
        rows[r][r] = QPHI
        for (eps, j) in edges[r + 1]:
            if j == 0:
                rows[r][m] = qadd(rows[r][m], QONE)
            else:
                rows[r][j - 1] = qsub(rows[r][j - 1], QONE)
    for col in range(m):
        piv = None
        for r in range(col, m):
            if qsgn(rows[r][col]):
                piv = r
                break
        if piv is None:
            return "singular"
        rows[col], rows[piv] = rows[piv], rows[col]
        scale = qinv(rows[col][col])
        rows[col] = [qmul(v, scale) if qsgn(v) else QZERO for v in rows[col]]
        for r in range(m):
            if r != col and qsgn(rows[r][col]):
                f = rows[r][col]
                rows[r] = [qsub(rows[r][k], qmul(f, rows[col][k]))
                           if qsgn(rows[col][k]) else rows[r][k]
                           for k in range(m + 1)]
    return [QONE] + [rows[r][m] for r in range(m)]


def potential_value(u, edges):
    tot = QZERO
    for (eps, j) in edges[0]:
        if j:
            tot = qadd(tot, u[j])
    return tot


def potential_valid(u, edges):
    if u[0] != QONE or any(qsgn(v) <= 0 for v in u):
        return False
    for i in range(1, len(edges)):
        s = QZERO
        for (eps, j) in edges[i]:
            s = qadd(s, u[j])
        if qsgn(qsub(qmul(QPHI, u[i]), s)) < 0:
            return False
    return True


CERTIFICATES = {
    (1, 90): (18, [18, 0, 5, 6, 9, 2, 10, 4, 8],
              [0, 18, 4, -4, 5, 6, 8, 1, 2]),
    (4, 117): (40, [40, 0, 5, 14, 6, 13, 11, 27, 17, 1],
               [0, 40, 1, -1, 5, 14, 6, 13, 11, 4]),
    (9, 73): (381,
              [381, 0, 46, 49, 78, 17, 101, 23, 66, 163, 39, 83, 232, 32,
               62, 149],
              [0, 381, 32, -32, 46, 49, 62, 16, 17, 101, 23, 66, 149, 14,
               39, 83]),
    (9, 82): (18, [18, 0, 5, 6, 9, 2, 10, 4, 8],
              [0, 18, 4, -4, 5, 6, 8, 1, 2]),
    (9, 235): (2013,
               [2013, 0, 16, 66, 27, 55, 43, 121, 70, 176, 113, 297, 183,
                473, 296, 770, 479, 1243, 775, 11],
               [0, 2013, 11, -11, 16, 66, 27, 55, 43, 121, 70, 176, 113,
                297, 183, 473, 296, 770, 479, 5]),
    (10, 81): (18, [18, 0, 5, 6, 9, 2, 10, 4, 8],
               [0, 18, 4, -4, 5, 6, 8, 1, 2]),
    (13, 108): (40, [40, 0, 5, 14, 6, 13, 11, 27, 17, 1],
                [0, 40, 1, -1, 5, 14, 6, 13, 11, 4]),
    (27, 217): (2013,
                [2013, 0, 16, 66, 27, 55, 43, 121, 70, 176, 113, 297, 183,
                 473, 296, 770, 479, 1243, 775, 11],
                [0, 2013, 11, -11, 16, 66, 27, 55, 43, 121, 70, 176, 113,
                 297, 183, 473, 296, 770, 479, 5]),
    (27, 226): (34, [34, 0, 0, 1, 1, 0, 1, 1, 2, 1, 3, 5, 8, 13, 20, 1],
                [0, 34, 1, -1, 0, 1, 1, 0, 1, 1, 2, 3, 5, 8, 14, -1]),
}


def census_ceiling():
    tested = mismatch = 0
    for a in range(1, 40):
        for b in range(1, 40):
            if gcd(a, b) != 1:
                continue
            tested += 1
            if direction_mass(a, b, 20) != witness_mass(a, b, 20):
                mismatch += 1
    check("direction carry automaton against the gasket-digit automaton",
          (tested, mismatch), (947, 0))
    box = occupied = bounded = single = k1 = nodouble = 0
    twoplus = anomaly = states = fails = 0
    residue = certified = passing = 0
    best = QZERO
    attain = []
    over = []
    exceptions = []
    for z1 in range(1, 121):
        for z2 in range(z1, 241):
            if gcd(z1, z2) != 1:
                continue
            box += 1
            d = (z1 % 3 == 0) + (z2 % 3 == 0) + ((z1 + z2) % 3 == 0)
            if d > 1:
                twoplus += 1
            if z1 % 3 and z2 % 3:
                residue += 1
            order, edges = direction_live(z1, z2)
            if len(order) == 1:
                continue
            if d == 0:
                anomaly += 1
            occupied += 1
            states = max(states, len(order))
            if all(-z1 <= 2 * c <= z2 for c in order):
                bounded += 1
            degs = [len(o) for o in edges]
            classes = set(order[i] % 3 for i in range(len(order))
                          if degs[i] == 2)
            if max(degs) <= 2 and len(classes) <= 1:
                single += 1
            q = z1 if z1 % 3 == 0 else (z2 if z2 % 3 == 0 else z1 + z2)
            if valuation3(q) == 1:
                k1 += 1
            if not any(degs[i] == 2
                       and all(degs[j] == 2 for (eps, j) in edges[i])
                       for i in range(len(edges))):
                nodouble += 1
            else:
                exceptions.append((z1, z2))
            h = state_profile(order, edges, 20)
            if any(h[m] > h[m - 1] + h[m - 2] for m in range(2, 21)):
                fails += 1
            u = golden_potential(order, edges)
            if potential_valid(u, edges):
                certified += 1
            tot = potential_value(u, edges)
            if qsgn(qsub(QINVPHI2, tot)) >= 0:
                passing += 1
                if qsgn(qsub(tot, best)) > 0:
                    best, attain = tot, [(z1, z2)]
                elif tot == best:
                    attain.append((z1, z2))
            else:
                over.append((z1, z2, tot))
    check("carry states of a direction lie in [-a/2, b/2]",
          (box, occupied, states, bounded), (13158, 218, 37, 218))
    check("out-degree at most two, branch states in one class mod 3",
          single, 218)
    check("at most one of z1, z2, z1+z2 is divisible by three, and no "
          "occupied direction has none of them divisible",
          (twoplus, anomaly), (0, 0))
    check("three divides a coordinate of every occupied direction",
          (residue, box - residue), (6566, 6592))
    check("the golden potential certifies the box away from the shift rays",
          (certified, passing, [(z1, z2) for (z1, z2, tot) in over],
           sorted(set(tot for (z1, z2, tot) in over))),
          (218, 214, [(1, 3), (1, 9), (1, 27), (1, 81)], [QINVPHI]))
    check("the golden potential is largest on the supergolden directions",
          (best, attain), (QINVPHI2, [(1, 12), (3, 10), (4, 9)]))
    check("directions settled by the branch argument over the box",
          (k1, nodouble, exceptions),
          (107, 206, [(1, 9), (1, 27), (1, 81), (1, 90), (4, 117), (9, 73),
                      (9, 82), (9, 235), (10, 81), (13, 108), (27, 217),
                      (27, 226)]))
    good = sorted(k for k, v in CERTIFICATES.items()
                  if certificate_holds(k[0], k[1], v[0], v[1], v[2]))
    check("Fibonacci certificates for the nine non-shift exceptions",
          good, [(1, 90), (4, 117), (9, 73), (9, 82), (9, 235), (10, 81),
                 (13, 108), (27, 217), (27, 226)])
    identity = all(fibonacci(p + 2) * fibonacci(q + 2)
                   == fibonacci(p + q + 3) - fibonacci(p + 1) * fibonacci(q + 1)
                   for p in range(60) for q in range(60))
    cases = 0
    over = 0
    strict = 0
    for j in range(1, 14):
        for m in range(1, 46):
            cases += 1
            if shift_product(j, m) > fibonacci(m + 1):
                over += 1
            if j >= 2 and m >= 2 and shift_product(j, m) >= fibonacci(m + 1):
                strict += 1
    check("Fibonacci product identity and the shift-ray ceiling",
          (identity, cases, over, strict), (True, 585, 0, 0))
    tested = breaches = 0
    for z1 in range(1, 31):
        for z2 in range(z1, 61):
            if gcd(z1, z2) != 1:
                continue
            tested += 1
            if direction_mass(z1, z2, 12)[12] > binary_multiples(z1 + z2, 12):
                breaches += 1
    check("ray mass is at most the count of binary multiples of the weight",
          (tested, breaches), (829, 0))
    check("binary multiples of the weight outgrow the ceiling",
          ([binary_multiples(w, 24) for w in (4, 10, 28, 82)],
           fibonacci(25) - 1),
          ([4196351, 1683971, 613817, 228519], 75024))
    seen = set()
    multiplicity = 0
    for family in ceiling_families():
        for (a, b) in family:
            if gcd(a, b) != 1:
                continue
            multiplicity += 1
            seen.add((a, b))
    inside = set((a, b) for (a, b) in seen if a <= 120 and b <= 240)
    zero = case2 = case3 = enumonly = 0
    outside = outpass = 0
    outover = []
    for (a, b) in sorted(seen - inside):
        order, edges = direction_live(a, b)
        if len(order) == 1:
            zero += 1
            continue
        outside += 1
        u = golden_potential(order, edges)
        if potential_valid(u, edges) and \
                qsgn(qsub(QINVPHI2, potential_value(u, edges))) >= 0:
            outpass += 1
        else:
            outover.append((a, b, potential_value(u, edges)))
        degs = [len(o) for o in edges]
        if not any(degs[i] == 2
                   and all(degs[j] == 2 for (eps, j) in edges[i])
                   for i in range(len(edges))):
            case2 += 1
        elif shift_ray(a, b):
            case3 += 1
        else:
            enumonly += 1
    check("the six adversarial families overlap, and their union splits",
          (multiplicity, len(seen), len(inside), len(seen) - len(inside),
           zero, case2, case3, enumonly),
          (11369, 10862, 717, 10145, 9498, 608, 3, 36))
    check("the golden potential outside the box, shift rays excepted",
          (outside, outpass, outover),
          (647, 644, [(1, 243, QINVPHI), (1, 729, QINVPHI),
                      (1, 2187, QINVPHI)]))
    profile = state_profile(*direction_live(1, 9), 12)
    check("the state maximum breaks the Fibonacci recursion",
          (profile[:7], profile[4] > profile[3] + profile[2], fails),
          ([1, 1, 1, 2, 4, 6, 9], True, 8))
    print("golden ceiling: proved for every direction of the box")


def split_three(a, b):
    q, p = (a, b) if a % 3 == 0 else (b, a)
    k = 0
    q1 = q
    while q1 % 3 == 0:
        q1 //= 3
        k += 1
    return p, k, q1


def phi_power(e):
    r = QONE
    for _ in range(abs(e)):
        r = qmul(r, QPHI if e > 0 else QINVPHI)
    return r


def first_returns(edges, n):
    cur = [0] * len(edges)
    cur[0] = 1
    f = [0] * (n + 1)
    for m in range(1, n + 1):
        nxt = [0] * len(edges)
        for i in range(len(edges)):
            if cur[i]:
                for (eps, j) in edges[i]:
                    nxt[j] += cur[i]
        f[m] = nxt[0]
        nxt[0] = 0
        cur = nxt
    return f


def degree_potential(edges):
    return [QONE if len(o) == 2 else QINVPHI for o in edges]


def super_solution(edges, pi):
    for i in range(1, len(edges)):
        s = QZERO
        for (eps, j) in edges[i]:
            s = qadd(s, pi[j])
        if qsgn(qsub(qmul(QPHI, pi[i]), s)) < 0:
            return False
    return True


def swept_bound(edges, d):
    pi = degree_potential(edges)
    pi[0] = QONE
    for _ in range(d):
        nxt = [QONE] + [QZERO] * (len(edges) - 1)
        for i in range(1, len(edges)):
            s = QZERO
            for (eps, j) in edges[i]:
                s = qadd(s, pi[j])
            nxt[i] = qmul(QINVPHI, s)
        pi = nxt
    tot = QZERO
    for (eps, j) in edges[0]:
        if j:
            tot = qadd(tot, pi[j])
    return tot


def burst_floor(a, b, k, q1):
    sign = 1 if b % 3 == 0 else -1
    out = []
    for m in range(1, 3 ** k):
        if m % 3 != 1:
            continue
        x, ok = m, True
        while x:
            if x % 3 > 1:
                ok = False
                break
            x //= 3
        if ok:
            out.append(sign * q1 * m)
    return out


def census_degree():
    seen = set()
    for z1 in range(1, 121):
        for z2 in range(z1, 241):
            if gcd(z1, z2) == 1:
                seen.add((z1, z2))
    for family in ceiling_families():
        for (a, b) in family:
            if gcd(a, b) == 1:
                seen.add((a, b))
    triple = eligible = occupied = resbad = burst = 0
    burstbad = 0
    nodouble = valid = doublevalid = settled = 0
    depths = {}
    missed = []
    k1 = k1class = 0
    k1bad = []
    quantbad = []
    attain = []
    for (a, b) in sorted(seen):
        p, k, q1 = split_three(a, b)
        if a % 3 == 0 or b % 3 == 0:
            triple += 1
            if (q1 - p) % 3 == 0:
                eligible += 1
        order, edges = direction_live(a, b)
        if len(order) == 1:
            continue
        occupied += 1
        if (q1 - p) % 3:
            resbad += 1
        f = first_returns(edges, max(k, 2))
        if any(f[j] for j in range(2, k + 1)):
            burst += 1
        degs = [len(o) for o in edges]
        double = any(degs[i] == 2
                     and all(degs[j] == 2 for (eps, j) in edges[i])
                     for i in range(len(edges)))
        if not double:
            nodouble += 1
        if super_solution(edges, degree_potential(edges)):
            valid += 1
            if double:
                doublevalid += 1
            hit = None
            for d in range(25):
                if qsgn(qsub(QINVPHI2, swept_bound(edges, d))) >= 0:
                    hit = d
                    break
            if hit is None:
                missed.append((a, b))
            else:
                settled += 1
                depths[hit] = depths.get(hit, 0) + 1
        else:
            missed.append((a, b))
        u = golden_potential(order, edges)
        tot = potential_value(u, edges)
        place = {c: i for i, c in enumerate(order)}
        floor = burst_floor(a, b, k, q1)
        rung = QZERO
        for c in floor:
            if c in place:
                rung = qadd(rung, u[place[c]])
        if len(floor) != 2 ** (k - 1) or \
                qmul(phi_power(-(k - 1)), rung) != tot:
            burstbad += 1
        if 2 * p <= 3 ** k * q1:
            c = p if b % 3 == 0 else -p
            if c not in place or u[place[c]] != QINVPHI:
                burstbad += 1
        if k != 1:
            continue
        k1 += 1
        if q1 == p:
            continue
        t = valuation3(q1 - p)
        bound = qmul(QINVPHI, qsub(QONE, phi_power(-max(t, 2))))
        if qsgn(qsub(bound, tot)) < 0:
            quantbad.append((a, b, t))
        if tot == bound:
            attain.append((a, b))
        if t <= 2:
            k1class += 1
            if qsgn(qsub(QINVPHI2, tot)) < 0:
                k1bad.append((a, b, t))
    check("occupancy needs the residue match q1 = p mod 3",
          (len(seen), triple, eligible, occupied, resbad),
          (23303, 11691, 7103, 865, 0))
    check("no first return has length between two and v3(q)",
          (occupied, burst), (865, 0))
    check("the burst identity and the value at the near predecessor",
          (occupied, burstbad), (865, 0))
    check("the degree potential is a super-solution beyond the branch case",
          (nodouble, valid, doublevalid), (814, 851, 37))
    check("the swept degree potential settles all but sixteen directions",
          (settled, sorted(depths.items()),
           [z for z in missed if shift_ray(*z)],
           [z for z in missed if not shift_ray(*z)]),
          (849, [(1, 760), (3, 48), (4, 31), (5, 7), (6, 3)],
           [(1, 3 ** j) for j in range(1, 8)],
           [(1, 756), (1, 2196), (1, 2214), (1, 2268), (1, 2430),
            (13, 1080), (27, 730), (28, 729), (40, 1053)]))
    check("the golden partition bound at v3(q) = 1",
          (k1, k1class, k1bad, quantbad, attain),
          (360, 261, [], [], [(1, 12), (3, 10)]))
    short = []
    for a in range(1, 130):
        for b in range(1, 800):
            if gcd(a, b) != 1 or (a % 3 and b % 3):
                continue
            order, edges = direction_live(a, b)
            if len(order) == 1:
                continue
            f = first_returns(edges, 4)
            if f[2] or f[3]:
                short.append((min(a, b), max(a, b), f[2], f[3]))
    check("the first returns of length two and three are classified",
          sorted(set(short)),
          [(1, 3, 1, 0), (1, 9, 0, 1), (1, 12, 0, 1), (3, 10, 0, 1),
           (4, 9, 0, 1)])
    print("degree potential: the golden partition bound on an infinite class")


def census_witness():
    n = 9
    bad = 0
    tested = 0
    for s in range(1, 40):
        for t in range(s + 1, 40):
            if gcd(s, t) != 1:
                continue
            tested += 1
            if free_returns(free_automaton(s, t), n) != tensor_returns(s, t, n):
                bad += 1
    check("tensor square against B(s,t) return counts to n=9", (tested, bad), (473, 0))
    check("carry states against reachable B states",
          [(len(carry_live(carry_automaton(s, t))), len(free_automaton(s, t)))
           for (s, t) in ((365, 1094), (41, 122), (25, 52), (31, 40))],
          [(729, 26931), (81, 835), (38, 393), (35, 354)])
    bad = 0
    tested = 0
    for s in range(1, 30):
        for t in range(s + 1, 60):
            if gcd(s, t) != 1:
                continue
            tested += 1
            want = free_returns(free_automaton(s, t), n)[n] - 1 - 2 * fibre_count(s, t, n)
            if want != box_count(s, t, n):
                bad += 1
    check("box construction against B(s,t) at n=9", (tested, bad), (812, 0))
    got = []
    for (s, t) in ((365, 1094), (41, 122), (122, 123), (1, 2460), (2431, 2458)):
        for m in (9, 12):
            got.append((tensor_returns(s, t, m)[m] - 1 - 2 * fibre_count(s, t, m),
                        box_count(s, t, m)))
    check("box against tensor at large multipliers",
          ([x for x in got if x[0] != x[1]], [g[0] for g in got]),
          ([], [2, 180, 50, 172, 50, 172, 2, 12, 2, 8]))
    R, weight, pair = {}, {}, {}
    for m in range(4, 14):
        R[m], weight[m], pair[m] = residual_layers(m)
    check("R(n) for n=4..13", [R[m] for m in range(4, 14)],
          [20, 88, 432, 1624, 5512, 15896, 46064, 124928, 335704, 863848])
    scaled = bad = 0
    for m in range(5, 14):
        for w, c in weight[m].items():
            if w % 3 == 0:
                scaled += 1
                if weight[m - 1].get(w // 3, 0) != c:
                    bad += 1
    check("weight layers scale as R_3w(n) = R_w(n-1)", (scaled, bad), (1869, 0))
    check("no witness of weight below four",
          sorted(set(min(weight[m]) for m in range(4, 14))), [4])
    check("largest multiplier is floor(3^n/8) for n = 4..13",
          [max(k[1] for k in pair[m]) for m in range(4, 14)],
          [3 ** m // 8 for m in range(4, 14)])
    fours = []
    sets = []
    for m in range(4, 13):
        F = no_adjacent(m)
        sets.append(len(F))
        fours.append(2 * sum(1 for a in F for b in F if a != b
                             and gcd(a, b) == 1 and not three_power_ratio(a, b)))
    check("R_4(n) from the no-adjacent-ones set, n=4..12",
          (fours, [weight[m].get(4, 0) for m in range(4, 13)]),
          ([12, 36, 108, 336, 988, 2596, 6672, 17480, 45720],
           [12, 36, 108, 336, 988, 2596, 6672, 17480, 45720]))
    check("size of the no-adjacent-ones set is Fibonacci",
          sets, [fibonacci(m + 1) - 1 for m in range(4, 13)])
    check("weight-four orbit at n=13", sum(fours) + weight[13].get(4, 0), 194096)
    tops = []
    for m in range(6, 14):
        thr = (3 ** m - 1) // 10
        big = [v for k, v in pair[m].items() if k[1] > thr]
        tops.append((len(big), sorted(set(big))))
    check("pairs above (3^n-1)/10 each contribute exactly four",
          tops, [(18, [4]), (57, [4]), (163, [4]), (402, [4]), (1019, [4]),
                 (2702, [4]), (7060, [4]), (18607, [4])])
    N = 40
    ref = [fibonacci(m + 1) - 1 for m in range(N + 1)]
    check("heaviest ray mass is Fibonacci", witness_mass(1, 3, N), ref)
    tested = breaches = 0
    ties = []
    for z1 in range(1, 121):
        for z2 in range(z1, 241):
            if gcd(z1, z2) != 1:
                continue
            tested += 1
            m = witness_mass(z1, z2, N)
            for j in range(1, N + 1):
                if m[j] > ref[j]:
                    breaches += 1
            if m[N] == ref[N]:
                ties.append((z1, z2))
    check("golden ceiling on ray mass over the box, n <= 40",
          (tested, breaches, ties), (13158, 0, [(1, 3)]))
    N = 45
    ref = [fibonacci(m + 1) - 1 for m in range(N + 1)]
    sizes = []
    breaches = 0
    for family in ceiling_families():
        seen = 0
        for (a, b) in family:
            if gcd(a, b) != 1:
                continue
            seen += 1
            m = witness_mass(a, b, N)
            for j in range(1, N + 1):
                if m[j] > ref[j]:
                    breaches += 1
        sizes.append(seen)
    check("golden ceiling on six adversarial families, n <= 45",
          (sizes, sum(sizes), breaches),
          ([4221, 253, 2998, 1499, 1199, 1199], 11369, 0))
    moments = []
    for m in (13, 14):
        E = second_moment(m)
        D = 3 ** m - 2 ** (m + 1) + 1
        S = 3 ** m - 4 * 2 ** m + 2 * m + 3
        moments.append((E, E - D - S))
    check("second moment and residual at n = 13 and 14",
          moments, [(4003372, 863848), (11679626, 2211960)])
    print("witness weights: weight four is Fibonacci and the ceiling holds")


def free_returns(edges, n):
    count = [0] * len(edges)
    count[0] = 1
    out = []
    for _ in range(n + 1):
        out.append(count[0])
        nxt = [0] * len(edges)
        for i, outs in enumerate(edges):
            for e in outs:
                nxt[e] += count[i]
        count = nxt
    return out


def main():
    census_designs()
    census_cross()
    census_diagonality()
    census_masses()
    census_recurrences()
    census_shift()
    census_rays()
    census_pairs()
    census_spectrum()
    census_witness()
    census_ceiling()
    census_degree()
    print("all green")


if __name__ == "__main__":
    main()
