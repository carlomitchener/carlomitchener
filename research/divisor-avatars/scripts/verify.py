# AVATARS

import itertools
import math
from decimal import Decimal, getcontext
from fractions import Fraction

getcontext().prec = 40

GAMMA = Decimal("0.5772156649015328606065120900824024310422")


def die(what, got, want):
    raise AssertionError("%s: got %r, want %r" % (what, got, want))


def check(what, got, want):
    if got != want:
        die(what, got, want)


def factor(m):
    f = {}
    d = 2
    while d * d <= m:
        while m % d == 0:
            f[d] = f.get(d, 0) + 1
            m //= d
        d += 1
    if m > 1:
        f[m] = f.get(m, 0) + 1
    return f


def esym(b):
    poly = [1]
    for v in b:
        new = [0] * (len(poly) + 1)
        for i, c in enumerate(poly):
            new[i] += c
            new[i + 1] += c * v
        poly = new
    return poly


def corners(D):
    return list(itertools.product((0, 1), repeat=D))


def cell_counts(D, n):
    s = 2 * n + 1
    counts = {c: 0 for c in corners(D)}
    for cell in itertools.product(range(1, s + 1), repeat=D):
        counts[tuple(1 if v % 2 == 0 else 0 for v in cell)] += 1
    return counts


def signature(F, D):
    f = [0] * (D + 1)
    for c in F:
        f[sum(c)] += 1
    return tuple(f)


def sig_fill(f, D, n):
    return sum(f[w] * (n + 1) ** (D - w) * n ** w for w in range(D + 1))


def divisor_power(x, n):
    return math.prod(a * n + 1 for a in factor(x).values())


def partitions(m, top=None):
    if top is None:
        top = m
    if m == 0:
        return 1
    return sum(partitions(m - k, k) for k in range(1, min(m, top) + 1))


def multisets(D, total):
    if D == 0:
        yield ()
        return
    for v in range(total + 1):
        for rest in multisets(D - 1, total - v):
            yield (v,) + rest


def interpolate(pts):
    k = len(pts)
    coeffs = [Fraction(0)] * k
    for i in range(k):
        xi, yi = pts[i]
        num = [Fraction(1)]
        den = Fraction(1)
        for j in range(k):
            if i == j:
                continue
            xj = pts[j][0]
            den *= xi - xj
            new = [Fraction(0)] * (len(num) + 1)
            for t, c in enumerate(num):
                new[t + 1] += c
                new[t] += c * (-xj)
            num = new
        scale = Fraction(yi) / den
        for t, c in enumerate(num):
            coeffs[t] += c * scale
    while len(coeffs) > 1 and coeffs[-1] == 0:
        coeffs.pop()
    return coeffs


def slopes(coeffs):
    if len(coeffs) == 1:
        return [] if coeffs[0] == 1 else None
    if coeffs[0] != 1:
        return None
    lead = coeffs[-1]
    if lead.denominator != 1 or lead <= 0:
        return None
    lead = int(lead)
    deg = len(coeffs) - 1
    divs = [d for d in range(1, lead + 1) if lead % d == 0]
    for combo in itertools.combinations_with_replacement(divs, deg):
        if math.prod(combo) != lead:
            continue
        poly = [Fraction(1)]
        for a in combo:
            new = [Fraction(0)] * (len(poly) + 1)
            for t, c in enumerate(poly):
                new[t] += c
                new[t + 1] += c * a
            poly = new
        if poly == coeffs:
            return sorted(combo, reverse=True)
    return None


PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23]


def minimal_avatar(sl):
    return math.prod(PRIMES[i] ** a for i, a in enumerate(sl))


def observables(F, n):
    s = 2 * n + 1
    odd = [i for i in range(1, s + 1) if i % 2 == 1]
    even = [i for i in range(1, s + 1) if i % 2 == 0]
    cells = set()
    for c in F:
        axes = [even if c[k] else odd for k in range(3)]
        for cell in itertools.product(*axes):
            cells.add(cell)
    fill = len(cells)
    verts = set()
    edges = set()
    faces = {}
    for (x, y, z) in cells:
        for dx in (0, 1):
            for dy in (0, 1):
                for dz in (0, 1):
                    verts.add((x - dx, y - dy, z - dz))
        for a in (0, 1):
            for b in (0, 1):
                edges.add((0, x - 1, y - a, z - b))
                edges.add((1, x - a, y - 1, z - b))
                edges.add((2, x - a, y - b, z - 1))
        for key in ((0, x, y, z), (0, x - 1, y, z), (1, x, y, z), (1, x, y - 1, z), (2, x, y, z), (2, x, y, z - 1)):
            faces[key] = faces.get(key, 0) + 1
    parent = {c: c for c in cells}

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    for (x, y, z) in cells:
        for nb in ((x + 1, y, z), (x, y + 1, z), (x, y, z + 1)):
            if nb in cells:
                ra, rb = find((x, y, z)), find(nb)
                if ra != rb:
                    parent[ra] = rb
    comps = len({find(c) for c in cells}) if cells else 0
    graph_edges = sum(1 for v in faces.values() if v == 2)
    return {
        "fill": fill,
        "voids": s ** 3 - fill,
        "surface": sum(1 for v in faces.values() if v == 1),
        "vertices": len(verts),
        "edges": len(edges),
        "faces": len(faces),
        "euler": len(verts) - len(edges) + len(faces) - fill,
        "components": comps,
        "cycle_rank": graph_edges - fill + comps,
    }


def orbit_reps():
    cs = corners(3)
    index = {c: i for i, c in enumerate(cs)}
    maps = []
    for perm in itertools.permutations(range(3)):
        for flip in itertools.product((0, 1), repeat=3):
            maps.append([index[tuple(cs[i][perm[k]] ^ flip[k] for k in range(3))] for i in range(8)])
    seen = set()
    reps = []
    for code in range(256):
        if code in seen:
            continue
        orbit = set()
        for m in maps:
            v = 0
            for i in range(8):
                if code >> i & 1:
                    v |= 1 << m[i]
            orbit.add(v)
        seen |= orbit
        reps.append((code, len(orbit)))
    return reps


def code_design(code):
    cs = corners(3)
    return [cs[i] for i in range(8) if code >> i & 1]


def check_fill_law():
    D = 3
    cs = corners(D)
    for n in range(7):
        counts = cell_counts(D, n)
        check("cell parity total at n=%d" % n, sum(counts.values()), (2 * n + 1) ** D)
        for mask in range(256):
            F = [cs[i] for i in range(8) if mask >> i & 1]
            f = signature(F, D)
            got = sum(counts[c] for c in F)
            want = sig_fill(f, D, n)
            if got != want:
                die("fill law mask=%d n=%d" % (mask, n), got, want)
        print("fill law: all 256 designs literal at side %d" % (2 * n + 1))


def fill_tables():
    tables = {}
    for D in (1, 2, 3):
        cs = corners(D)
        counts = [cell_counts(D, n) for n in range(7)]
        table = {}
        for mask in range(1 << (1 << D)):
            F = [cs[i] for i in range(1 << D) if mask >> i & 1]
            key = tuple(sum(counts[n][c] for c in F) for n in range(7))
            table.setdefault(key, []).append(mask)
        tables[D] = table
    return tables


def check_criterion(tables):
    agreed = 0
    for x in range(2, 3001):
        fac = factor(x)
        D = len(fac)
        a = sorted(fac.values(), reverse=True)
        b = [v - 1 for v in a]
        e = esym(b)
        caps = [math.comb(D, w) for w in range(D + 1)]
        realizable = all(0 <= e[w] <= caps[w] for w in range(D + 1))
        inequality = sum(a) <= 2 * D
        check("criterion agreement at x=%d" % x, realizable, inequality)
        if D <= 3:
            key = tuple(divisor_power(x, n) for n in range(7))
            found = len(tables[D].get(key, []))
            want = math.prod(math.comb(caps[w], e[w]) for w in range(D + 1)) if realizable else 0
            check("design count at x=%d" % x, found, want)
        agreed += 1
    print("criterion: %d integers 2..3000, realizability and Omega<=2omega agree everywhere" % agreed)


def check_counterexamples(tables):
    for x, D in ((8, 1), (72, 2)):
        key = tuple(divisor_power(x, n) for n in range(7))
        check("no avatar for x=%d" % x, tables[D].get(key, []), [])
    check("distinct fill polynomials in dimension 2", len(tables[2]), 12)
    print("counterexamples: d(8^n) absent in dimension 1, d(72^n) absent among the 12 fills of dimension 2")


def check_census():
    want = [1, 2, 4, 7, 12, 19, 30, 45, 67]
    for D in range(9):
        sigs = {tuple(esym(sorted(b, reverse=True))) for b in multisets(D, D)}
        got = len(sigs)
        target = sum(partitions(m) for m in range(D + 1))
        check("census at D=%d" % D, got, target)
        check("census value at D=%d" % D, got, want[D])
        print("census: D=%d qualifying polynomials %d" % (D, got))


def check_sponge():
    F = [c for c in corners(3) if sum(c) <= 1]
    for n in range(11):
        s = 2 * n + 1
        removed = 0
        kept = 0
        for cell in itertools.product(range(1, s + 1), repeat=3):
            if sum(1 for v in cell if v % 2 == 0) >= 2:
                removed += 1
            else:
                kept += 1
        check("void at n=%d" % n, removed, n * n * (4 * n + 3))
        check("fill at n=%d" % n, kept, divisor_power(240, n))
        check("complement at n=%d" % n, removed + kept, s ** 3)
    check("signature of the Menger design", signature(F, 3), (1, 3, 0, 0))
    check("a(1) is the centre and six face centres", 1 * 1 * (4 * 1 + 3), 7)
    fac = factor(240)
    check("240 sits on the boundary", (sum(fac.values()), 2 * len(fac)), (6, 6))
    fac = factor(480)
    check("480 is past the boundary", sum(fac.values()) > 2 * len(fac), True)
    print("sponge: fill d(240^n) and void n^2(4n+3) literal for n=0..10, 240 on the boundary, 480 past it")


def check_robin():
    ladders = {30: {2: 1, 3: 1, 5: 1}, 60: {2: 2, 3: 1, 5: 1}, 120: {2: 3, 3: 1, 5: 1},
               180: {2: 2, 3: 2, 5: 1}, 240: {2: 4, 3: 1, 5: 1}, 360: {2: 3, 3: 2, 5: 1},
               900: {2: 2, 3: 2, 5: 2}}
    eg = GAMMA.exp()
    check("e^gamma to twelve places", eg.quantize(Decimal("1.000000000000")), Decimal("1.781072417990"))
    threshold = (Decimal(15) / (4 * eg)).exp().exp()
    check("threshold below 5040", threshold < 5040, True)
    check("threshold to two places", threshold.quantize(Decimal("1.00")), Decimal("3681.17"))
    total = 0
    above = 0
    seen = set()
    seen_above = set()
    best = None
    for x, fac in ladders.items():
        for n in range(1, 21):
            total += 1
            N = x ** n
            seen.add(N)
            s = math.prod((p ** (e * n + 1) - 1) // (p - 1) for p, e in fac.items())
            check("abundancy below 15/4 at x=%d n=%d" % (x, n), Decimal(s) / Decimal(N) < Decimal(15) / 4, True)
            if N <= 5040:
                continue
            above += 1
            seen_above.add(N)
            ratio = Decimal(s) / (Decimal(N) * Decimal(N).ln().ln())
            check("Robin at N=%d" % N, ratio < eg, True)
            if best is None or ratio > best[0]:
                best = (ratio, N)
    check("powers in the domain", total, 140)
    check("distinct integers in the domain", len(seen), 130)
    check("powers above 5040", above, 131)
    check("distinct integers above 5040", len(seen_above), 122)
    check("argmax of the Robin ratio", best[1], 14400)
    check("max Robin ratio", best[0].quantize(Decimal("1.000000000000")), Decimal("1.573259905933"))
    print("robin: 140 powers, 131 above 5040, all satisfy Robin, max %s at N=14400" % best[0].quantize(Decimal("1.000000000000")))


def check_ca():
    ca = [2, 6, 12, 60, 120, 360, 2520, 5040, 55440, 720720, 1441440, 4324320, 21621600]
    verdicts = []
    for m in ca:
        fac = factor(m)
        verdicts.append(sum(fac.values()) <= 2 * len(fac))
    check("first twelve colossally abundant numbers are avatars", verdicts[:12], [True] * 12)
    check("the thirteenth is not", verdicts[12], False)
    fac = factor(21621600)
    check("factorisation of 21621600", fac, {2: 5, 3: 3, 5: 2, 7: 1, 11: 1, 13: 1})
    check("Omega and omega of 21621600", (sum(fac.values()), len(fac)), (13, 6))
    print("colossally abundant: first 12 of A004490 are avatars, 21621600 has Omega=13 > 12=2omega")


def check_scan():
    reps = orbit_reps()
    check("orbit count", len(reps), 22)
    check("orbit sizes sum to 256", sum(r[1] for r in reps), 256)
    names = ["fill", "voids", "surface", "vertices", "edges", "faces", "euler", "components", "cycle_rank"]
    nonfill = []
    constants = []
    fills = []
    late = []
    for code, _ in reps:
        F = code_design(code)
        vals = [observables(F, n) for n in range(11)]
        for obs in names:
            seq = [v[obs] for v in vals]
            coeffs = interpolate([(n, seq[n]) for n in range(11)])
            if len(coeffs) > 4:
                tail = interpolate([(n, seq[n]) for n in range(1, 5)])
                if not all(sum(c * n ** t for t, c in enumerate(tail)) == seq[n] for n in range(1, 11)):
                    die("law shape code=%d obs=%s" % (code, obs), len(coeffs) - 1, "degree at most 3")
                check("late law is zero at n=0 code=%d obs=%s" % (code, obs), seq[0], 0)
                late.append((code, obs))
            sl = slopes(coeffs)
            if sl is None:
                continue
            if sl == []:
                constants.append((code, obs))
            elif obs == "fill":
                fills.append((code, minimal_avatar(sl)))
            else:
                nonfill.append((code, obs, minimal_avatar(sl)))
        print("scan: code %d done" % code)
    check("late-starting laws", sorted(late), [(30, "components"), (30, "cycle_rank"), (126, "components"), (126, "cycle_rank")])
    check("non-fill divisor avatars", nonfill, [
        (0, "voids", 900), (1, "euler", 30), (1, "components", 30),
        (3, "euler", 6), (3, "components", 6), (7, "components", 2),
        (15, "euler", 2), (15, "components", 2)])
    check("constant identities", sorted(constants), sorted([
        (23, "components"), (27, "components"), (31, "components"), (61, "components"),
        (63, "components"), (111, "components"), (127, "components"), (255, "euler"), (255, "components")]))
    check("fill avatars", fills, [(1, 30), (3, 60), (7, 120), (15, 180), (23, 240), (27, 180), (63, 360), (255, 900)])
    print("scan: 22 representatives, 9 observables, n=0..10, exactly 8 non-fill rows and 9 constants")


def main():
    check_fill_law()
    tables = fill_tables()
    check_criterion(tables)
    check_counterexamples(tables)
    check_census()
    check_sponge()
    check_robin()
    check_ca()
    check_scan()
    print("all green")


if __name__ == "__main__":
    main()
