import time
from decimal import Decimal, getcontext
from fractions import Fraction
from itertools import permutations, product
from math import comb, factorial, gcd, prod

# POLYNOMIALS

def pmul(a, b):
    out = [0] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        if x:
            for j, y in enumerate(b):
                if y:
                    out[i + j] += x * y
    return out

def ppow(a, e):
    r = [1]
    for _ in range(e):
        r = pmul(r, a)
    return r

def padd(a, b):
    out = [0] * max(len(a), len(b))
    for i, x in enumerate(a):
        out[i] += x
    for i, x in enumerate(b):
        out[i] += x
    return trim(out)

def pscale(a, s):
    return trim([s * x for x in a])

def trim(a):
    while len(a) > 1 and a[-1] == 0:
        a.pop()
    return a

def peval(a, x):
    v = 0
    for c in reversed(a):
        v = v * x + c
    return v

def psub(a, b):
    return padd(a, pscale(b, -1))

def compose_affine(a, u, v):
    out = [0]
    for c in reversed(a):
        out = padd(pmul(out, [v, u]), [c])
    return out

# DESIGNS

def corners(D):
    return list(product((0, 1), repeat=D))

def code(F, D):
    return sum(1 << sum(c[j] << j for j in range(D)) for c in F)

def signature(F, D):
    sig = [0] * (D + 1)
    for c in F:
        sig[sum(c)] += 1
    return tuple(sig)

def designs(D):
    cs = corners(D)
    for mask in range(1 << len(cs)):
        yield [c for i, c in enumerate(cs) if mask >> i & 1]

def signatures(D):
    ranges = [range(comb(D, w) + 1) for w in range(D + 1)]
    return [tuple(s) for s in product(*ranges)]

def fillpoly(sig):
    D = len(sig) - 1
    out = [0]
    for w, f in enumerate(sig):
        if f:
            out = padd(out, pscale(pmul(ppow([0, 1], D - w), ppow([-1, 1], w)), f))
    return out

def grid_fill(F, D, k):
    n = 2 * k - 1
    want = set(F)
    total = 0
    for cell in product(range(n), repeat=D):
        if tuple(x & 1 for x in cell) in want:
            total += 1
    return total

# CLASSICAL FAMILIES

def polygonal(m, k):
    return ((m - 2) * k * k - (m - 4) * k) // 2

def centered(m, k):
    return m * k * (k - 1) // 2 + 1

def centered_hex(m):
    return 3 * m * m - 3 * m + 1

def is_prime(v):
    if v < 2:
        return False
    d = 2
    while d * d <= v:
        if v % d == 0:
            return False
        d += 1
    return True

# RECORDS

RECORDS = {
    "A000290": (0, [0, 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121]),
    "A000384": (0, [0, 1, 6, 15, 28, 45, 66, 91, 120, 153, 190, 231]),
    "A000567": (0, [0, 1, 8, 21, 40, 65, 96, 133, 176, 225, 280, 341]),
    "A001844": (0, [1, 5, 13, 25, 41, 61, 85, 113, 145, 181, 221, 265]),
    "A003215": (0, [1, 7, 19, 37, 61, 91, 127, 169, 217, 271, 331, 397]),
    "A016754": (0, [1, 9, 25, 49, 81, 121, 169, 225, 289, 361, 441, 529]),
    "A000578": (0, [0, 1, 8, 27, 64, 125, 216, 343, 512, 729, 1000, 1331]),
    "A103532": (0, [1, 20, 81, 208, 425, 756, 1225, 1856, 2673, 3700, 4961, 6480]),
    "A395241": (0, [0, 7, 44, 135, 304, 575, 972, 1519, 2240, 3159, 4300, 5687]),
    "A005898": (0, [1, 9, 35, 91, 189, 341, 559, 855, 1241, 1729, 2331, 3059]),
    "A016755": (0, [1, 27, 125, 343, 729, 1331, 2197, 3375, 4913, 6859, 9261, 12167]),
    "A001018": (0, [1, 8, 64, 512, 4096, 32768, 262144, 2097152, 16777216]),
    "A016185": (0, [0, 1, 17, 217, 2465, 26281, 269297, 2685817, 26269505]),
    "A381517": (0, [4, 16, 80, 496, 3536, 26992, 212048, 1684720, 13442768]),
    "A009964": (0, [1, 20, 400, 8000, 160000, 3200000, 64000000, 1280000000]),
    "A332705": (0, [6, 72, 1056, 18048, 336384, 6531072, 129048576, 2568388608]),
    "A000616": (-1, [1, 2, 3, 6, 22, 402, 1228158, 400507806843728]),
    "A129824": (0, [2, 4, 12, 64, 700, 17424, 1053696, 160579584, 62856336636]),
    "A396934": (0, [0, 2, 4, 12, 34, 122, 362, 1130, 3406, 10506, 31550, 95260]),
    "A398348": (1, [2, 22, 111618, 6005363762644688,
                    7089215977519836239803174210135872]),
    "A154105": (0, [7, 37, 91, 169, 271, 397, 547, 721, 919, 1141, 1387, 1657]),
    "A299916": (0, [1, 6, 42, 306, 2250, 16578, 122202, 900882, 6641514, 48963042]),
    "A056040": (0, [1, 1, 2, 6, 6, 30, 20, 140, 70, 630, 252, 2772, 924, 12012, 3432,
                    51480, 12870]),
}

def record(name, index):
    offset, data = RECORDS[name]
    slot = index - offset
    assert 0 <= slot < len(data), "%s index %d outside the stored terms" % (name, index)
    return data[slot]

# THE SIX ROWS OF THE PLANE

PLANE = [
    (1, (1, 0, 0), "A000290", 0, ("polygonal", 4)),
    (3, (1, 1, 0), "A000384", 0, ("polygonal", 6)),
    (7, (1, 2, 0), "A000567", 0, ("polygonal", 8)),
    (9, (1, 0, 1), "A001844", -1, ("centered", 4)),
    (11, (1, 1, 1), "A003215", -1, ("centered", 6)),
    (15, (1, 2, 1), "A016754", -1, ("centered", 8)),
]

SOLID = [
    (1, (1, 0, 0, 0), "A000578", 0),
    (23, (1, 3, 0, 0), "A103532", -1),
    (232, (0, 0, 3, 1), "A395241", -1),
    (129, (1, 0, 0, 1), "A005898", -1),
    (255, (1, 3, 3, 1), "A016755", -1),
]

# CHECKS

def check_fill_law():
    for D in (1, 2, 3):
        for F in designs(D):
            sig = signature(F, D)
            poly = fillpoly(sig)
            assert len(poly) - 1 <= D, (D, sig)
            if F:
                assert poly[D] == len(F), (D, sig, poly)
            else:
                assert poly == [0], (D, sig)
            for k in range(1, 8):
                want = grid_fill(F, D, k)
                got = peval(poly, k)
                closed = sum(k ** (D - sum(c)) * (k - 1) ** sum(c) for c in F)
                assert want == got == closed, (D, code(F, D), k, want, got, closed)
    return "D = 1,2,3, all 4/16/256 designs, k = 1..7"

def check_endpoints():
    for D in range(1, 5):
        for sig in signatures(D):
            poly = fillpoly(sig)
            assert peval(poly, 1) == sig[0], (D, sig)
            assert peval(poly, 0) == (-1) ** D * sig[D], (D, sig)
            rev = fillpoly(tuple(reversed(sig)))
            mirror = compose_affine(poly, -1, 1)
            assert mirror == pscale(rev, (-1) ** D), (D, sig)
            diff = poly
            for _ in range(D):
                diff = psub(compose_affine(diff, 1, 1), diff)
            assert diff == [factorial(D) * sum(sig)] or (sum(sig) == 0 and diff == [0]), (D, sig)
    return "D = 1..4, every weight signature"

def check_plane():
    seen = {}
    for F in designs(2):
        seen.setdefault(signature(F, 2), []).append(code(F, 2))
    assert len(seen) == 12, len(seen)
    for sig, codes in seen.items():
        poly = fillpoly(sig)
        p = sum(sig)
        f0, f1, f2 = sig
        for k in range(0, 31):
            got = peval(poly, k)
            if f0 == 1 and f2 == 0:
                assert got == polygonal(2 * p + 2, k), (sig, k)
            elif f0 == 1 and f2 == 1:
                assert got == centered(2 * p, k), (sig, k)
            elif f2 == 1:
                assert got == polygonal(2 * p + 2, 1 - k), (sig, k)
                assert got == peval(fillpoly(tuple(reversed(sig))), 1 - k), (sig, k)
            else:
                assert got == f1 * k * (k - 1), (sig, k)
                assert got == 2 * f1 * ((k - 1) * k // 2), (sig, k)
            assert got - peval(poly, k - 1) == 2 * p * (k - 1) + f0 - f2, (sig, k)
    for c, sig, name, shift, family in PLANE:
        F = [x for x in corners(2) if (c >> (x[0] + 2 * x[1])) & 1]
        assert signature(F, 2) == sig, (c, signature(F, 2))
        poly = fillpoly(sig)
        kind, m = family
        for k in range(2, 10):
            got = peval(poly, k)
            assert got == grid_fill(F, 2, k), (c, k)
            assert got == record(name, k + shift), (c, name, k, got)
            if kind == "polygonal":
                assert got == polygonal(m, k) and m == 2 * sum(sig) + 2, (c, k)
            else:
                assert got == centered(m, k) and m == 2 * sum(sig), (c, k)
    return "all 12 plane signatures at k = 0..30, the six records at k = 2..9"

def check_solid():
    for c, sig, name, shift in SOLID:
        F = [x for x in corners(3) if (c >> (x[0] + 2 * x[1] + 4 * x[2])) & 1]
        assert signature(F, 3) == sig, (c, signature(F, 3))
        poly = fillpoly(sig)
        for k in range(2, 10):
            got = peval(poly, k)
            assert got == grid_fill(F, 3, k), (c, k)
            assert got == record(name, k + shift), (c, name, k, got, record(name, k + shift))
    solid = fillpoly((1, 3, 3, 1))
    sponge = fillpoly((1, 3, 0, 0))
    void = fillpoly((0, 0, 3, 1))
    assert padd(sponge, void) == solid, (sponge, void, solid)
    return "D = 3 records at k = 2..9, complement identity as polynomials"

def check_census():
    for D in range(1, 5):
        polys = set()
        for F in designs(D):
            polys.add(tuple(fillpoly(signature(F, D))))
        closed = prod(1 + comb(D, w) for w in range(D + 1))
        assert len(polys) == closed == record("A129824", D), (D, len(polys), closed)
    for D in range(0, 9):
        assert prod(1 + comb(D, w) for w in range(D + 1)) == record("A129824", D), D
    return "distinct fill polynomials enumerated at D = 1..4, closed form to D = 8"

def burnside_cube(D):
    cs = corners(D)
    index = {c: i for i, c in enumerate(cs)}
    total = 0
    for perm in permutations(range(D)):
        for t in range(1 << D):
            img = [index[tuple(c[perm[i]] ^ (t >> i & 1) for i in range(D))] for c in cs]
            total += 1 << cycles(img)
    return total // ((1 << D) * factorial(D))

def cycles(img):
    seen = [False] * len(img)
    count = 0
    for s in range(len(img)):
        if not seen[s]:
            count += 1
            j = s
            while not seen[j]:
                seen[j] = True
                j = img[j]
    return count

def orbit_count(D):
    cs = corners(D)
    index = {c: i for i, c in enumerate(cs)}
    maps = []
    for perm in permutations(range(D)):
        for t in range(1 << D):
            maps.append([index[tuple(c[perm[i]] ^ (t >> i & 1) for i in range(D))] for c in cs])
    reps = set()
    for mask in range(1 << len(cs)):
        best = mask
        for img in maps:
            moved = 0
            for i in range(len(cs)):
                if mask >> i & 1:
                    moved |= 1 << img[i]
            best = min(best, moved)
        reps.add(best)
    return len(reps)

def check_shapes():
    for D in range(1, 7):
        got = burnside_cube(D)
        assert got == record("A000616", D), (D, got, record("A000616", D))
    for D in (1, 2, 3):
        assert orbit_count(D) == record("A000616", D), D
    seq = [prod(1 + comb(D, w) for w in range(D + 1)) for D in range(0, 7)]
    shapes = [record("A000616", D) for D in range(0, 7)]
    for D in range(1, 5):
        assert seq[D] > shapes[D], (D, seq[D], shapes[D])
    for D in (5, 6):
        assert seq[D] < shapes[D], (D, seq[D], shapes[D])
    assert shapes[6] // seq[6] > 380000000, shapes[6] // seq[6]
    return "Burnside D = 1..6, orbit walk D = 1..3, crossover at D = 5"

def burnside_torus3(n):
    cells = [(x, y, z) for x in range(n) for y in range(n) for z in range(n)]
    index = {c: i for i, c in enumerate(cells)}
    line = [(s, b) for s in (1, -1) for b in range(n)]
    total = 0
    for perm in permutations(range(3)):
        for m in product(line, repeat=3):
            img = []
            for c in cells:
                p = (c[perm[0]], c[perm[1]], c[perm[2]])
                img.append(index[tuple((m[i][0] * p[i] + m[i][1]) % n for i in range(3))])
            total += 1 << cycles(img)
    return total // (48 * n ** 3)

def check_torus():
    for n in range(1, 6):
        got = burnside_torus3(n)
        assert got == record("A398348", n), (n, got)
    assert burnside_torus3(3) == 111618
    return "A398348 recomputed at n = 1..5, group order 48 n^3"

def tile(F, D, q):
    keep = set(F)
    return [c for c in product(range(q), repeat=D) if tuple(x & 1 for x in c) in keep]

def fractal(F, D, q, L):
    cells = {tuple([0] * D)}
    base = tile(F, D, q)
    for _ in range(L):
        cells = {tuple(c[i] * q + b[i] for i in range(D)) for c in cells for b in base}
    return cells

def surface(cells, D):
    total = 0
    for c in cells:
        for i in range(D):
            for step in (-1, 1):
                nb = list(c)
                nb[i] += step
                if tuple(nb) not in cells:
                    total += 1
    return total

def check_level():
    carpet2 = [c for c in corners(2) if sum(c) <= 1]
    carpet3 = [c for c in corners(3) if sum(c) <= 1]
    void2 = [c for c in corners(2) if sum(c) in (0, 2)]
    solid3 = corners(3)
    for L in range(1, 5):
        cells = fractal(carpet2, 2, 3, L)
        assert len(cells) == 8 ** L == record("A001018", L), L
        assert 9 ** L - len(cells) == record("A016185", L), L
        assert surface(cells, 2) == record("A381517", L), (L, surface(cells, 2))
        assert surface(cells, 2) == (4 * 8 ** L + 16 * 3 ** L) // 5, L
    for L in range(1, 4):
        cells = fractal(carpet3, 3, 3, L)
        assert len(cells) == 20 ** L == record("A009964", L), L
        assert surface(cells, 3) == record("A332705", L), (L, surface(cells, 3))
        assert surface(cells, 3) == 2 * 20 ** L + 4 * 8 ** L, L
    for L in range(1, 4):
        assert len(fractal(void2, 2, 3, L)) == 5 ** L, L
        assert len(fractal(solid3, 3, 3, L)) == 27 ** L, L
        assert surface(fractal(solid3, 3, 3, L), 3) == 6 * 9 ** L, L
    for L in range(3, 5):
        assert record("A381517", L) == 11 * record("A381517", L - 1) - 24 * record("A381517", L - 2), L
    for L in range(3, 8):
        assert record("A332705", L) == 28 * record("A332705", L - 1) - 160 * record("A332705", L - 2), L
    return "carpet to L = 4, sponge to L = 3, cells and surface counted face by face"

def check_gasket():
    for n in range(0, 12):
        total = 0
        for i in range(1 << n):
            free = ((1 << n) - 1) ^ i
            j = free
            while True:
                if gcd(i, j) == 1:
                    total += 1
                if j == 0:
                    break
                j = (j - 1) & free
        assert total == record("A396934", n), (n, total)
        pairs = 0
        for i in range(1 << n):
            free = ((1 << n) - 1) ^ i
            pairs += 1 << bin(free).count("1")
        assert pairs == 3 ** n, n
    return "A396934 counted pair by pair at n = 0..11, support 3^n"

def check_mesh():
    tree = []
    for k in range(1, 21):
        R = 2 * k - 1
        pts = 0
        for x in range(-R, R + 1):
            for y in range(-R, R + 1):
                z = -x - y
                if abs(z) <= R and abs(x) <= R and abs(y) <= R:
                    pts += 1
        assert pts == 12 * k * k - 6 * k + 1, (k, pts)
        assert pts == centered_hex(2 * k), k
        assert pts == 3 * R * R + 3 * R + 1, k
        assert pts % 3 == 1, k
        if k <= 12:
            assert pts == record("A154105", k - 1), k
        if is_prime(pts):
            tree.append(pts)
    assert tree == [7, 37, 271, 397, 547, 919, 1657, 1951, 2269, 4219], tree
    for m in range(1, 60):
        assert centered_hex(m) == m ** 3 - (m - 1) ** 3, m
    return "hexagon lattice points at k = 1..20, ten prime vertex counts"

def check_pigeonhole():
    for a in range(1, 40):
        p = [0, 1 - a, a]
        c = [1, -a, a]
        assert peval(p, 0) == 0 and peval(p, 1) == 1, a
        assert peval(c, 0) == 1 and peval(c, 1) == 1, a
        for k in range(0, 20):
            assert peval(p, k) == polygonal(2 * a + 2, k), (a, k)
            assert peval(c, k) == centered(2 * a, k), (a, k)
    for a in range(1, 12):
        for b in range(-30, 31):
            for c0 in range(-3, 4):
                q = [c0, b, a]
                if peval(q, 0) == 0 and peval(q, 1) == 1:
                    assert q == [0, 1 - a, a], q
                if peval(q, 0) == 1 and peval(q, 1) == 1:
                    assert q == [1, -a, a], q
    return "the two normalisations pin a quadratic outright, leading coefficient 1..11"

def slab_data(F, D, q):
    T = tile(F, D, q)
    seen = set(T)
    c = len(T)
    ls, Ws = [], []
    for a in range(D):
        ls.append(sum(1 for t in T if t[a] == 0))
        assert ls[a] == sum(1 for t in T if t[a] == q - 1), (F, a)
        Ws.append(sum(1 for t in T if tuple(t[i] + (i == a) for i in range(D)) in seen))
    return c, ls, Ws

def occupancy(F, D, q, L):
    keep = set(F)
    side = q ** L
    grid = bytearray(side ** D)
    for cell in product(range(side), repeat=D):
        ok = True
        for j in range(L):
            if tuple((x // q ** j) % q & 1 for x in cell) not in keep:
                ok = False
                break
        if ok:
            idx = 0
            for x in cell:
                idx = idx * side + x
            grid[idx] = 1
    return grid, side

def faces(grid, side, D):
    strides = [side ** (D - 1 - i) for i in range(D)]
    total = 0
    for idx in range(len(grid)):
        if not grid[idx]:
            continue
        rest = idx
        coord = []
        for stride in strides:
            coord.append(rest // stride)
            rest %= stride
        for i in range(D):
            for step in (-1, 1):
                v = coord[i] + step
                if v < 0 or v >= side or not grid[idx + step * strides[i]]:
                    total += 1
    return total

def check_surface():
    split = 0
    witness = None
    for D, top in ((2, 4), (3, 3)):
        for mask in range(1, 1 << (1 << D)):
            cs = corners(D)
            F = [c for i, c in enumerate(cs) if mask >> i & 1]
            c, ls, Ws = slab_data(F, D, 3)
            for a in range(D):
                assert ls[a] < c, (D, mask, ls, c)
            sur = []
            for L in range(top + 1):
                grid, side = occupancy(F, D, 3, L)
                sur.append(faces(grid, side, D))
            assert sur[0] == 2 * D, (D, mask, sur)
            for L in range(top):
                want = c * sur[L] - 2 * sum(Ws[a] * ls[a] ** L for a in range(D))
                assert sur[L + 1] == want, (D, mask, L, sur, want)
            coef = {}
            for a in range(D):
                if Ws[a]:
                    coef[ls[a]] = coef.get(ls[a], 0) + Fraction(2 * Ws[a], c - ls[a])
            lead = Fraction(2 * D) - sum(coef.values())
            for L in range(top + 1):
                got = lead * c ** L + sum(b * v ** L for v, b in coef.items())
                assert got == sur[L], (D, mask, L, got, sur[L])
            if D == 3 and len(coef) > 1:
                split += 1
            if D == 2 and mask == 11:
                witness = (c, ls, Ws, sur)
    assert split == 141, split
    c, ls, Ws, sur = witness
    assert (c, ls, Ws) == (7, [3, 2], [2, 4]), witness
    grid, side = occupancy([x for x in corners(2) if (11 >> (x[0] + 2 * x[1])) & 1], 2, 3, 5)
    sur = sur + [faces(grid, side, 2)]
    assert sur == [4, 16, 84, 520, 3468, 23824], sur
    for L in range(3, 6):
        assert sur[L] == 12 * sur[L - 1] - 41 * sur[L - 2] + 42 * sur[L - 3], L
    det = sur[1] * sur[1] - sur[0] * sur[2]
    assert det != 0, det
    alpha = Fraction(sur[3] * sur[1] - sur[2] * sur[2], det)
    beta = Fraction(sur[2] * sur[0] - sur[1] * sur[1], det)
    assert alpha * sur[3] + beta * sur[2] != sur[4], (alpha, beta)
    return "all 15 plane and 255 solid designs, faces counted literally to L = 4 and L = 3"

def menger_analog(D):
    return [v for v in product(range(3), repeat=D) if sum(1 for x in v if x == 1) <= 1]

def digit_weights(D):
    weights = {}
    for v in menger_analog(D):
        weights[sum(v)] = weights.get(sum(v), 0) + 1
    return weights

def ladder(D, L):
    weights = digit_weights(D)
    state = {0: 1}
    for _ in range(L):
        nxt = {}
        for c, count in state.items():
            for s, w in weights.items():
                m = s - D
                if (c + m) % 3 == 0:
                    key = (c + m) // 3
                    nxt[key] = nxt.get(key, 0) + count * w
        state = nxt
    return state.get(0, 0)

def check_ladder():
    for L in range(0, 9):
        assert ladder(3, L) == record("A299916", L), (L, ladder(3, L))
    for L in range(2, 9):
        assert ladder(3, L) == 9 * ladder(3, L - 1) - 12 * ladder(3, L - 2), L
    four = [ladder(4, L) for L in range(0, 9)]
    assert four[:7] == [1, 6, 132, 1848, 29040, 441408, 6772128], four
    for L in range(2, 9):
        assert four[L] == 11 * four[L - 1] + 66 * four[L - 2], L
    assert four[2] * four[2] - four[1] * four[3] != 0
    for D in range(2, 11):
        cells = [v for v in menger_analog(D) if sum(v) == D]
        closed = comb(D, D // 2) if D % 2 == 0 else comb(D, (D - 1) // 2) * (D + 1) // 2
        assert len(cells) == closed == ladder(D, 1), (D, len(cells), closed)
    tree = [2, 6, 6, 30, 20, 140, 70, 630, 252]
    assert [ladder(D, 1) for D in range(2, 11)] == tree
    for D in range(1, 17):
        swing = factorial(D) // factorial(D // 2) ** 2
        assert swing == record("A056040", D), (D, swing)
        if D >= 2:
            closed = comb(D, D // 2) if D % 2 == 0 else comb(D, (D - 1) // 2) * (D + 1) // 2
            assert closed == swing, (D, closed, swing)
    assert 121 + 4 * 66 == 385
    getcontext().prec = 40
    root = (Decimal(11) + Decimal(385).sqrt()) / 2
    assert abs(root * root - 11 * root - 66) < Decimal("1e-30"), root
    assert str(root)[:11] == "15.31070843", root
    exponent = root.ln() / Decimal(3).ln()
    assert str(exponent)[:12] == "2.4836355003", exponent
    return "carry ladder at D = 3,4 to L = 8, level-one slice at D = 2..10 and A056040 to 16"

# TABLES

def show(poly):
    parts = []
    for e in range(len(poly) - 1, -1, -1):
        c = poly[e]
        if not c:
            continue
        term = "k^%d" % e if e > 1 else ("k" if e == 1 else "")
        head = "" if abs(c) == 1 and e else str(abs(c))
        parts.append(("- " if c < 0 else "+ ") + head + term)
    if not parts:
        return "0"
    body = " ".join(parts)
    return body[2:] if body.startswith("+ ") else "-" + body[2:]

def tables():
    print("")
    print("the twelve fill sequences of the plane")
    print("  %-9s %-10s %-16s %s" % ("signature", "codes", "fill at n = 2k-1", "family"))
    rows = {}
    for F in designs(2):
        rows.setdefault(signature(F, 2), []).append(code(F, 2))
    for sig in sorted(rows):
        f0, f1, f2 = sig
        p = sum(sig)
        if p == 0:
            family = "empty"
        elif f0 == 1 and f2 == 0:
            family = "polygonal m = %d" % (2 * p + 2)
        elif f0 == 1 and f2 == 1:
            family = "centered m = %d" % (2 * p)
        elif sig == tuple(reversed(sig)):
            family = "self-mirror"
        else:
            family = "mirror of %s" % "".join(map(str, reversed(sig)))
        codes = ",".join(str(c) for c in sorted(rows[sig]))
        print("  %-9s %-10s %-16s %s" % ("".join(map(str, sig)), codes, show(fillpoly(sig)), family))
    print("")
    print("the two censuses")
    print("  %-3s %-22s %-12s %s" % ("D", "designs", "sequences", "shapes"))
    for D in range(0, 7):
        seq = prod(1 + comb(D, w) for w in range(D + 1))
        print("  %-3d %-22d %-12d %d" % (D, 1 << (1 << D), seq, record("A000616", D)))
    print("")
    print("the records this census reads")
    for name, shift, sig, D in [("A000290", 0, (1, 0, 0), 2), ("A000384", 0, (1, 1, 0), 2),
                                ("A000567", 0, (1, 2, 0), 2), ("A001844", -1, (1, 0, 1), 2),
                                ("A003215", -1, (1, 1, 1), 2), ("A016754", -1, (1, 2, 1), 2),
                                ("A000578", 0, (1, 0, 0, 0), 3), ("A103532", -1, (1, 3, 0, 0), 3),
                                ("A395241", -1, (0, 0, 3, 1), 3), ("A005898", -1, (1, 0, 0, 1), 3),
                                ("A016755", -1, (1, 3, 3, 1), 3)]:
        terms = [peval(fillpoly(sig), k) for k in range(2, 8)]
        print("  %-8s shift %-3d %-24s %s" % (name, shift, show(fillpoly(sig)),
                                              ", ".join(map(str, terms))))

# DOOR

def main():
    t0 = time.time()
    checks = [
        ("fill law", check_fill_law),
        ("endpoint, mirror and difference laws", check_endpoints),
        ("the plane", check_plane),
        ("the solid", check_solid),
        ("sequence census", check_census),
        ("shape census", check_shapes),
        ("toroidal census", check_torus),
        ("level axis", check_level),
        ("the surface law in general", check_surface),
        ("gasket coprimality", check_gasket),
        ("slice mesh", check_mesh),
        ("the diagonal ladder", check_ladder),
        ("classical pigeonhole", check_pigeonhole),
    ]
    for name, fn in checks:
        t = time.time()
        domain = fn()
        print("%-38s PASS  %-58s %5.1f s" % (name, domain, time.time() - t))
    print("total %.1f s" % (time.time() - t0))
    tables()
    print("")
    print("all green")

if __name__ == "__main__":
    main()
