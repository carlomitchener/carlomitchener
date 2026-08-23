from itertools import product

# KRONECKER

CODES = tuple(range(1, 16))
LIB3 = (3, 5, 6, 7, 9, 10, 11, 12, 13, 14)
K2 = (3, 5, 6, 9, 10, 12)
K3 = (7, 11, 13, 14, 15)


def tile(c):
    return [((c >> i) & 1) | (((c >> (i + 2)) & 1) << 1) for i in range(2)]


def kron(A, wa, B, wb):
    out = []
    for ra in A:
        for rb in B:
            v = 0
            for j in range(wa):
                if (ra >> j) & 1:
                    v |= rb << (j * wb)
            out.append(v)
    return out


def grid(w):
    rows, wid = [1], 1
    for c in w:
        rows = kron(rows, wid, tile(c), 2)
        wid *= 2
    return rows, wid


def runs(row, n):
    out = []
    j = 0
    while j < n:
        if (row >> j) & 1:
            k = j
            while k < n and (row >> k) & 1:
                k += 1
            out.append((j, k))
            j = k
        else:
            j += 1
    return out


def label(rows, n, diag):
    parent = []
    segs = []

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    prev = []
    for i in range(n):
        cur = []
        for (a, b) in runs(rows[i], n):
            idx = len(parent)
            parent.append(idx)
            segs.append((i, a, b))
            for (pa, pb, pi) in prev:
                touch = (pa <= b and a <= pb) if diag else (pa < b and a < pb)
                if touch:
                    ra, rb = find(pi), find(idx)
                    if ra != rb:
                        parent[rb] = ra
            cur.append((a, b, idx))
        prev = cur
    return parent, segs, find


# OBSERVABLES

def components(rows, n, diag=False):
    parent, segs, find = label(rows, n, diag)
    return len({find(i) for i in range(len(parent))})


def enclosed(rows, n, diag):
    full = (1 << n) - 1
    parent, segs, find = label([full ^ r for r in rows], n, diag)
    open_roots = set()
    roots = set()
    for i, (r, a, b) in enumerate(segs):
        root = find(i)
        roots.add(root)
        if r == 0 or r == n - 1 or a == 0 or b == n:
            open_roots.add(root)
    return len(roots - open_roots)


def border_components(rows, n):
    parent, segs, find = label(rows, n, False)
    touching = set()
    for i, (r, a, b) in enumerate(segs):
        if r == 0 or r == n - 1 or a == 0 or b == n:
            touching.add(find(i))
    return len(touching)


def fill(rows):
    return sum(bin(r).count("1") for r in rows)


def perimeter(rows, n):
    h = sum(bin(r & (r >> 1)).count("1") for r in rows)
    v = sum(bin(rows[i] & rows[i + 1]).count("1") for i in range(n - 1))
    return 4 * fill(rows) - 2 * h - 2 * v


def interior(rows, n):
    band = ((1 << (n - 1)) - 2) if n >= 2 else 0
    total = 0
    for i in range(1, n - 1):
        m = rows[i] & (rows[i] >> 1) & (rows[i] << 1) & rows[i - 1] & rows[i + 1] & band
        total += bin(m).count("1")
    return total


def boundary(rows, n):
    return fill(rows) - interior(rows, n)


def maindiag(rows, n):
    return sum((rows[i] >> i) & 1 for i in range(n))


def antidiag(rows, n):
    return sum((rows[i] >> (n - 1 - i)) & 1 for i in range(n))


def antiprofile(rows, n):
    p = [0] * (2 * n - 1)
    for i in range(n):
        for j in range(n):
            if (rows[i] >> j) & 1:
                p[i + j] += 1
    return tuple(p)


def hcontact(rows, n):
    return sum(1 for i in range(n) if (rows[i] >> (n - 1)) & 1 and rows[i] & 1)


def vcontact(rows, n):
    return bin(rows[0] & rows[n - 1]).count("1")


NAMES = ("components", "boundary", "euler", "holes", "perimeter", "maindiag", "antidiag", "antiprofile", "fill")


def observe(w):
    rows, n = grid(w)
    c = components(rows, n)
    return (c, boundary(rows, n), c - enclosed(rows, n, True), enclosed(rows, n, False),
            perimeter(rows, n), maindiag(rows, n), antidiag(rows, n), antiprofile(rows, n), fill(rows))


def landscape(codes, L):
    vals = {w: observe(w) for w in product(codes, repeat=L)}
    groups = {}
    for w in vals:
        groups.setdefault(tuple(sorted(w)), []).append(w)
    multi = [v for v in groups.values() if len(v) >= 2]
    sens = {}
    for i, name in enumerate(NAMES):
        sens[name] = sum(1 for v in multi if len({vals[w][i] for w in v}) > 1)
    return vals, len(groups), len(multi), sens


def first_sensitive(vals, index):
    groups = {}
    for w in vals:
        groups.setdefault(tuple(sorted(w)), []).append(w)
    for key in sorted(groups):
        v = groups[key]
        if len(v) >= 2 and len({vals[w][index] for w in v}) > 1:
            return key
    return None


# COCYCLE

CLASSES = {
    (1, 2, 4, 8): ((1, 0, 0, 0), (2, 0, 0, 0), (2, 0, 0, 0), (4, 0, 0, 0)),
    (6, 9): ((2, 0, 0, 0), (4, 0, 0, 0), (4, 0, 0, 0), (8, 0, 0, 0)),
    (3, 12): ((0, 1, 0, 0), (-2, 3, 0, 0), (0, 2, 0, 0), (-4, 6, 0, 0)),
    (5, 10): ((0, 0, 1, 0), (0, 0, 2, 0), (-2, 0, 3, 0), (-4, 0, 6, 0)),
    (7, 11, 13, 14): ((-1, 1, 1, 0), (-4, 3, 2, 0), (-4, 2, 3, 0), (-8, 4, 4, 1)),
    (15,): ((0, 0, 0, 1), (0, 0, -2, 3), (0, -2, 0, 3), (4, -6, -6, 9)),
}
MAT = {}
for klass, m in CLASSES.items():
    for c in klass:
        MAT[c] = m


def matmul(A, B):
    return tuple(tuple(sum(A[i][t] * B[t][j] for t in range(4)) for j in range(4)) for i in range(4))


def represent(w):
    v = (1, 0, 0, 0)
    for c in w:
        M = MAT[c]
        v = tuple(sum(v[i] * M[i][j] for i in range(4)) for j in range(4))
    return sum(v)


PRIME = (1 << 31) - 1


def hankel_rank(table, prefixes, index):
    rows = [[table[u + v][index] % PRIME for v in prefixes] for u in prefixes]
    r, col, m, ncol = 0, 0, len(rows), len(prefixes)
    while col < ncol and r < m:
        piv = next((i for i in range(r, m) if rows[i][col]), None)
        if piv is None:
            col += 1
            continue
        rows[r], rows[piv] = rows[piv], rows[r]
        inv = pow(rows[r][col], PRIME - 2, PRIME)
        pr = [x * inv % PRIME for x in rows[r]]
        rows[r] = pr
        for i in range(r + 1, m):
            f = rows[i][col]
            if f:
                rows[i] = [(a - f * b) % PRIME for a, b in zip(rows[i], pr)]
        r += 1
        col += 1
    return r


# CHECKS

def check(name, got, want):
    assert got == want, f"{name}: got {got}, want {want}"
    print(f"{name}: {got}")


def main():
    check("comp(3,6)", observe((3, 6))[0], 4)
    check("comp(6,3)", observe((6, 3))[0], 2)

    sensitive_k2 = sorted(p for p in product(K2, repeat=2) if p[0] < p[1]
                          and observe(p)[0] != observe((p[1], p[0]))[0])
    check("least order-sensitive pair of two-cell designs", sensitive_k2[0], (3, 6))

    bad = 0
    for a in range(16):
        for b in range(16):
            ra, na = grid((a, b))
            rb, nb = grid((b, a))
            if boundary(ra, na) != boundary(rb, nb):
                bad += 1
    check("boundary-cell asymmetries over all 256 ordered code pairs", bad, 0)

    def three(c):
        return frozenset({(0, 0), (0, 1), (1, 0), (1, 1)} - {c})

    def cells(c):
        return {(i, j) for i in range(2) for j in range(2) if (c >> (i + 2 * j)) & 1}

    bad = 0
    for a in range(16):
        for b in range(16):
            fa, fb = cells(a), cells(b)
            formula = sum(1 for p in [(0, 0), (0, 1), (1, 0), (1, 1)]
                          if three(p) <= fa and three((1 - p[0], 1 - p[1])) <= fb)
            rows, n = grid((a, b))
            if formula != interior(rows, n):
                bad += 1
    check("interior-formula mismatches over all 256 ordered code pairs", bad, 0)

    bad = 0
    for w in product(CODES, repeat=3):
        rows, n = grid(w)
        prod = 1
        for c in w:
            prod *= sum(1 for d in range(2) if (c >> (d + 2 * d)) & 1)
        if maindiag(rows, n) != prod:
            bad += 1
    check("main-diagonal product-formula mismatches over all 3375 words of length 3", bad, 0)

    bad = 0
    for w in product(CODES, repeat=3):
        rows, n = grid(w)
        ph, pv = 1, 1
        for c in w:
            t = tile(c)
            ph *= hcontact(t, 2)
            pv *= vcontact(t, 2)
        if (hcontact(rows, n), vcontact(rows, n)) != (ph, pv):
            bad += 1
    check("contact-law mismatches over all 3375 words of length 3", bad, 0)

    adjacent, diagonal = (3, 5, 10, 12), (6, 9)
    bad = 0
    for a in adjacent:
        for d in diagonal:
            if (observe((a, d))[0], observe((d, a))[0]) != (4, 2):
                bad += 1
    check("adjacent-times-diagonal deviations from (4,2) over all 8 ordered pairs", bad, 0)

    bad = sum(1 for a in adjacent for b in adjacent if observe((a, b))[0] != observe((b, a))[0])
    check("adjacent-times-adjacent asymmetries over all 16 ordered pairs", bad, 0)
    bad = sum(1 for a in diagonal for b in diagonal if observe((a, b))[0] != 4)
    check("diagonal-times-diagonal deviations from 4 over all 4 ordered pairs", bad, 0)
    bad = sum(1 for a in K3 for b in K3 if observe((a, b))[0] != 1)
    check("k>=3 deviations from 1 over all 25 ordered pairs", bad, 0)

    bad = 0
    for c1 in CODES:
        for c2 in CODES:
            for L in (2, 3):
                block = grid((c1, c2))
                rows, n = block
                for _ in range(L - 1):
                    rows = kron(rows, n, block[0], block[1])
                    n *= block[1]
                if (rows, n) != grid((c1, c2) * L):
                    bad += 1
    check("block-reduction mismatches over 225 blocks at periods 2 and 3", bad, 0)

    v2, g2, m2, s2 = landscape(CODES, 2)
    check("length-2 multisets", (len(v2), g2, m2), (225, 120, 105))
    check("length-2 order-sensitive multisets", tuple(s2[k] for k in NAMES),
          (74, 0, 78, 10, 78, 0, 0, 99, 0))

    v3, g3, m3, s3 = landscape(LIB3, 3)
    check("length-3 multisets over the ten-code library", (len(v3), g3, m3), (1000, 220, 210))
    check("length-3 order-sensitive multisets", tuple(s3[k] for k in NAMES),
          (188, 36, 188, 100, 188, 0, 0, 204, 0))

    check("length-2 words with euler != components - holes",
          sum(1 for o in v2.values() if o[2] != o[0] - o[3]), 10)
    check("length-3 words with euler != components - holes",
          sum(1 for o in v3.values() if o[2] != o[0] - o[3]), 168)

    check("anti-diagonal profiles of (1,2) and (2,1)", (observe((1, 2))[7], observe((2, 1))[7]),
          ((0, 1, 0, 0, 0, 0, 0), (0, 0, 1, 0, 0, 0, 0)))
    check("lexicographically first anti-diagonal-profile witness", first_sensitive(v2, 7), (1, 2))
    check("perimeters of (1,3) and (3,1)", (observe((1, 3))[4], observe((3, 1))[4]), (6, 8))
    check("lexicographically first perimeter witness", first_sensitive(v2, 4), (1, 3))
    check("boundary cells of (1,3) and (3,1)", (observe((1, 3))[1], observe((3, 1))[1]), (2, 2))

    table = {(): (1, 1, 1, 0)}
    peak = {}
    for L in (1, 2, 3, 4):
        best = 0
        for w in product(CODES, repeat=L):
            rows, n = grid(w)
            c = components(rows, n)
            table[w] = (c, boundary(rows, n), c - enclosed(rows, n, True), enclosed(rows, n, False))
            best = max(best, c)
        peak[L] = best
    check("words of length at most 4", len(table), 54241)
    check("representation mismatches over all 54241 words of length at most 4",
          sum(1 for w, o in table.items() if represent(w) != o[0]), 0)
    check("largest component count at lengths 1 to 4", tuple(peak[L] for L in (1, 2, 3, 4)),
          (2, 8, 32, 128))

    for L in range(1, 7):
        rows, n = grid((15,) * (L - 1) + (6,))
        check(f"components of (15^{L - 1}, 6)", components(rows, n), 2 * 4 ** (L - 1))
    for L in range(1, 8):
        rows, n = grid((15,) * (L - 1) + (3,))
        check(f"border-meeting components of (15^{L - 1}, 3)", border_components(rows, n), 2 ** (L - 1))

    prefixes = [()] + [(a,) for a in CODES] + [(a, b) for a in CODES for b in CODES]
    check("Hankel ranks of the length-4 truncation",
          tuple(hankel_rank(table, prefixes, i) for i in (0, 2, 1, 3)), (4, 4, 8, 11))

    klass = list(CLASSES)
    pairs = [(i, j) for i in range(6) for j in range(i + 1, 6)]
    noncommuting = [(klass[i], klass[j]) for (i, j) in pairs
                    if matmul(CLASSES[klass[i]], CLASSES[klass[j]]) != matmul(CLASSES[klass[j]], CLASSES[klass[i]])]
    check("noncommuting class pairs out of 15", len(noncommuting), 14)
    commuting = [(klass[i], klass[j]) for (i, j) in pairs if (klass[i], klass[j]) not in noncommuting]
    check("commuting class pair", commuting, [((1, 2, 4, 8), (6, 9))])
    check("M(6,9) equals twice M(1,2,4,8)", CLASSES[(6, 9)],
          tuple(tuple(2 * x for x in row) for row in CLASSES[(1, 2, 4, 8)]))

    for (a, b, want) in ((3, 5, 2), (7, 15, 1)):
        check(f"M({a}) and M({b}) commute", matmul(MAT[a], MAT[b]) == matmul(MAT[b], MAT[a]), False)
        check(f"components of ({a},{b}) and of ({b},{a})",
              (observe((a, b))[0], observe((b, a))[0]), (want, want))

    print("all green")


if __name__ == "__main__":
    main()
