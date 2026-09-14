import cmath
import itertools
import math
import time

# RASTER

ORDERS = 13
TWO_PI = 2.0 * math.pi
KIND = {0: "corner", 1: "edge", 2: "corner", 3: "edge", 4: "centre", 5: "edge", 6: "corner", 7: "edge", 8: "corner"}

def maps(side):
    out = []
    for flip in range(2):
        for turn in range(4):
            m = []
            for f in range(side * side):
                r, c = divmod(f, side)
                if flip:
                    r, c = c, r
                for _ in range(turn):
                    r, c = c, side - 1 - r
                m.append(r * side + c)
            if m not in out:
                out.append(m)
    return out

def pair_table(side, group):
    cells = side * side
    index = [-1] * (cells * cells)
    reps = []
    count = 0
    for j in range(cells):
        for l in range(j, cells):
            if index[j * cells + l] != -1:
                continue
            for m in group:
                index[m[j] * cells + m[l]] = count
                index[m[l] * cells + m[j]] = count
            reps.append((j, l))
            count += 1
    return index, reps, count

def census(points, index, cells, count):
    out = [0] * count
    for a in range(len(points)):
        row = points[a] * cells
        for b in range(a, len(points)):
            out[index[row + points[b]]] += 1
    return out

def cells_of(bits, cells):
    return [j for j in range(cells) if bits >> j & 1]

def kronecker(bits):
    base = cells_of(bits, 9)
    return sorted(((p // 3) * 3 + s // 3) * 9 + ((p % 3) * 3 + s % 3) for p in base for s in base)

def canonical(bits, group):
    best = None
    for m in group:
        x = 0
        for j in range(9):
            if bits >> j & 1:
                x |= 1 << m[j]
        best = x if best is None or x < best else best
    return best

def cube_maps(side):
    axes = [(0, 1, 2), (0, 2, 1), (1, 0, 2), (1, 2, 0), (2, 0, 1), (2, 1, 0)]
    out = []
    for axis in axes:
        for signs in range(8):
            m = []
            for f in range(side ** 3):
                p = (f // (side * side), (f // side) % side, f % side)
                q = [p[axis[0]], p[axis[1]], p[axis[2]]]
                for k in range(3):
                    if signs >> k & 1:
                        q[k] = side - 1 - q[k]
                m.append((q[0] * side + q[1]) * side + q[2])
            if m not in out:
                out.append(m)
    return out

def class_count(cells, group):
    index = [-1] * (cells * cells)
    count = 0
    for j in range(cells):
        for l in range(j, cells):
            if index[j * cells + l] != -1:
                continue
            for m in group:
                index[m[j] * cells + m[l]] = count
                index[m[l] * cells + m[j]] = count
            count += 1
    return count

def burnside(cells, group):
    total = 0
    for m in group:
        seen = [False] * cells
        cycles = 0
        for j in range(cells):
            if seen[j]:
                continue
            cycles += 1
            x = j
            while not seen[x]:
                seen[x] = True
                x = m[x]
        total += 1 << cycles
    return total // len(group)

# HARMONICS

def boxes(side):
    out = []
    for f in range(side * side):
        r, c = divmod(f, side)
        out.append((c / side - 0.5, (c + 1) / side - 0.5, r / side - 0.5, (r + 1) / side - 0.5))
    return out

def support(shape):
    a1, a2, b1, b2 = shape
    near_x = 0.0 if a1 <= 0.0 <= a2 else min(abs(a1), abs(a2))
    near_y = 0.0 if b1 <= 0.0 <= b2 else min(abs(b1), abs(b2))
    far = max(math.hypot(x, y) for x in (a1, a2) for y in (b1, b2))
    return math.hypot(near_x, near_y), far

def breaks(side):
    edge = {abs(c / side - 0.5) for c in range(side + 1)} | {0.0}
    reach = math.sqrt(2) / 2
    return sorted({round(math.hypot(a, b), 12) for a in edge for b in edge if math.hypot(a, b) <= reach + 1e-12})

def arcs(shape, r):
    a1, a2, b1, b2 = shape
    cuts = []
    for a in (a1, a2):
        if abs(a) < r:
            t = math.acos(max(-1.0, min(1.0, a / r)))
            cuts += [t, TWO_PI - t]
    for b in (b1, b2):
        if abs(b) < r:
            s = math.asin(max(-1.0, min(1.0, b / r)))
            cuts += [s % TWO_PI, (math.pi - s) % TWO_PI]
    if not cuts:
        return [(0.0, TWO_PI)] if a1 <= r <= a2 and b1 <= 0.0 <= b2 else []
    cuts.sort()
    out = []
    for i, lo in enumerate(cuts):
        hi = cuts[i + 1] if i + 1 < len(cuts) else cuts[0] + TWO_PI
        if hi - lo < 1e-15:
            continue
        mid = 0.5 * (lo + hi)
        if a1 <= r * math.cos(mid) <= a2 and b1 <= r * math.sin(mid) <= b2:
            out.append((lo, hi))
    return out

def coefficients(shape, r):
    g = [0j] * ORDERS
    for lo, hi in arcs(shape, r):
        g[0] += hi - lo
        for m in range(1, ORDERS):
            g[m] += (cmath.exp(-1j * m * hi) - cmath.exp(-1j * m * lo)) / (-1j * m)
    return [v / TWO_PI for v in g]

def quadrature(step, reach):
    nodes = []
    k = 0
    while k * step <= reach:
        for u in ((0.0,) if k == 0 else (k * step, -k * step)):
            s = math.sinh(u) * math.pi / 2
            nodes.append((math.tanh(s), (math.pi / 2) * math.cosh(u) / math.cosh(s) ** 2 * step))
        k += 1
    return nodes

def gram(side, step, reach, pairs):
    shapes = boxes(side)
    reach_of = [support(shape) for shape in shapes]
    cut = breaks(side)
    nodes = quadrature(step, reach)
    out = [[0.0] * ORDERS for _ in pairs]
    for s in range(len(cut) - 1):
        lo, hi = cut[s], cut[s + 1]
        half, mid = 0.5 * (hi - lo), 0.5 * (hi + lo)
        for x, w in nodes:
            r = mid + half * x
            weight = half * w * TWO_PI * r
            live = {j for j in range(side * side) if reach_of[j][0] <= r <= reach_of[j][1]}
            table = {j: coefficients(shapes[j], r) for j in live}
            for i, (j, l) in enumerate(pairs):
                if j not in live or l not in live:
                    continue
                gj, gl = table[j], table[l]
                row = out[i]
                for m in range(ORDERS):
                    row[m] += weight * (gj[m] * gl[m].conjugate()).real
    return out, len(nodes), len(cut) - 1

def spectrum(counts, coefs, mult):
    P = [0.0] * ORDERS
    for c, n in enumerate(counts):
        if n:
            w = mult[c] * n
            row = coefs[c]
            for m in range(ORDERS):
                P[m] += w * row[m]
    return P

def rank(rows, tolerance):
    work = [row[:] for row in rows]
    width = len(work[0])
    got = 0
    pivots = []
    for col in range(width):
        best = max(range(got, len(work)), key=lambda i: abs(work[i][col]))
        if abs(work[best][col]) < tolerance:
            continue
        work[got], work[best] = work[best], work[got]
        pivots.append(abs(work[got][col]))
        for i in range(len(work)):
            if i == got:
                continue
            factor = work[i][col] / work[got][col]
            for t in range(col, width):
                work[i][t] -= factor * work[got][t]
        got += 1
    return got, pivots

# CHECKS

def say(label, value):
    print("  %-58s %s" % (label, value))

def main():
    clock = time.time()

    print("block 1: the raster group and its pair classes")
    group = maps(3)
    assert len(group) == 8, len(group)
    index, reps, classes = pair_table(3, group)
    assert classes == 11, classes
    kinds = ["%s-%s" % (KIND[j], KIND[l]) for j, l in reps]
    assert kinds.count("corner-centre") == 1, kinds
    sizes = [len({(min(m[j], m[l]), max(m[j], m[l])) for m in group}) for j, l in reps]
    assert sizes == [4, 8, 4, 4, 8, 2, 4, 4, 4, 2, 1], sizes
    assert sum(sizes) == 45, sizes
    big = maps(9)
    assert len(big) == 8, len(big)
    index2, reps2, classes2 = pair_table(9, big)
    assert classes2 == 461, classes2
    wide = maps(5)
    assert len(wide) == 8 and class_count(25, wide) == 55
    solid_group = cube_maps(3)
    assert len(solid_group) == 48, len(solid_group)
    assert class_count(27, solid_group) == 24
    huge = maps(25)
    wider = class_count(625, huge)
    assert len(huge) == 8 and wider == 24805, wider
    say("pair classes at level 1 and level 2", "%d and %d" % (classes, classes2))
    say("class sizes over the 45 unordered cell pairs", str(sizes))
    say("pair classes on the base-5 plane and the base-3 cube", "55 under 8 symmetries, 24 under 48")
    say("pair classes on the 25 x 25 base-5 level-2 raster", wider)

    print("block 2: the orbit count from the cycle index and from canonical forms")
    total = burnside(9, group)
    assert total == 102, total
    orbits = {}
    for bits in range(1, 512):
        orbits.setdefault(canonical(bits, group), []).append(bits)
    assert len(orbits) == total - 1 == 101, len(orbits)
    assert sum(len(v) for v in orbits.values()) == 511
    assert max(len(v) for v in orbits.values()) == 8
    say("Burnside average over the eight symmetries", "%d, so %d nonempty" % (total, total - 1))
    say("orbits by canonical form over all 511 codes", "%d, largest %d" % (len(orbits), max(len(v) for v in orbits.values())))

    print("block 3: the level-1 census takes 97 values on the 101 orbits")
    buckets = {}
    for code in orbits:
        buckets.setdefault(tuple(census(cells_of(code, 9), index, 9, classes)), []).append(code)
    assert len(buckets) == 97, len(buckets)
    tied = sorted(tuple(sorted(v)) for v in buckets.values() if len(v) > 1)
    assert tied == [(45, 105), (61, 121), (78, 102), (94, 118)], tied
    for a, b in tied:
        assert bin(a).count("1") == bin(b).count("1")
        assert canonical(a, group) != canonical(b, group)
    want = {(45, 105): [2, 2, 1, 0, 2, 0, 2, 0, 0, 1, 0], (61, 121): [2, 2, 1, 2, 2, 0, 2, 0, 2, 1, 1], (78, 102): [2, 2, 0, 0, 2, 1, 2, 1, 0, 0, 0], (94, 118): [2, 2, 0, 2, 2, 1, 2, 1, 2, 0, 1]}
    for (a, b), counts in want.items():
        assert census(cells_of(a, 9), index, 9, classes) == census(cells_of(b, 9), index, 9, classes) == counts, (a, b)
    assert (61, 121) == (45 | 16, 105 | 16) and (94, 118) == (78 | 16, 102 | 16)
    drawn = {45: [(0, 0), (2, 0), (0, 1), (2, 1)], 105: [(0, 0), (0, 1), (2, 1), (0, 2)]}
    for code, filled in drawn.items():
        assert sum(1 << (r * 3 + c) for c, r in filled) == code, code
    say("distinct level-1 pair censuses on the 101 orbits", len(buckets))
    say("homometric pairs, equal in all 11 class counts", str(tied))
    say("the census shared by 45 and 105", str(want[(45, 105)]))
    say("the second two pairs are the first two plus the centre cell", "61 = 45 + centre, 94 = 78 + centre")
    say("the column and row of each cell drawn in figure 1", "45 at %s, 105 at %s" % (drawn[45], drawn[105]))

    print("block 4: the level-2 census separates all four homometric pairs")
    for a, b in tied:
        first = census(kronecker(a), index2, 81, classes2)
        second = census(kronecker(b), index2, 81, classes2)
        moved = sum(1 for x, y in zip(first, second) if x != y)
        assert moved > 0, (a, b)
        say("%d against %d: level-2 class counts that differ" % (a, b), "%d of %d" % (moved, classes2))

    print("block 5: the level-1 Gram matrix is constant on the pair classes")
    every = [(j, k) for j in range(9) for k in range(9)]
    flat, nodes, segments = gram(3, 0.06, 3.4, every)
    Q = [[[flat[j * 9 + k][m] for k in range(9)] for j in range(9)] for m in range(ORDERS)]
    scale = max(abs(Q[m][j][k]) for m in range(ORDERS) for j in range(9) for k in range(9))
    spread = 0.0
    for m in range(ORDERS):
        seen = [[] for _ in range(classes)]
        for j in range(9):
            for k in range(9):
                seen[index[j * 9 + k]].append(Q[m][j][k])
        spread = max(spread, max(max(v) - min(v) for v in seen))
    assert spread < 1e-15, spread
    coarse, _, _ = gram(3, 0.03, 4.0, every)
    drift = max(abs(flat[i][m] - coarse[i][m]) for i in range(81) for m in range(ORDERS))
    assert drift < 1e-15, drift
    say("radial segments and quadrature nodes on each", "%d and %d" % (segments, nodes))
    say("worst spread of Q_m inside one pair class", "%.2e on scale %.3e" % (spread, scale))
    say("worst drift against a finer quadrature rule", "%.2e" % drift)

    print("block 6: the two exact relations that cost the census two directions")
    hole = max(abs(Q[m][0][4]) for m in range(ORDERS))
    assert hole == 0.0, hole
    similar = max(abs(sum(Q[m][j][k] for j in range(9) for k in range(9)) - 9 * Q[m][4][4]) for m in range(ORDERS))
    assert similar < 1e-15, similar
    ordered = [0] * classes
    for j in range(9):
        for k in range(9):
            ordered[index[j * 9 + k]] += 1
    assert ordered == [4, 16, 8, 8, 16, 4, 4, 8, 8, 4, 1], ordered
    assert sum(ordered) == 81
    byclass = max(abs(sum(ordered[c] * Q[m][reps[c][0]][reps[c][1]] for c in range(classes)) - 9 * Q[m][4][4]) for m in range(ORDERS))
    assert byclass < 1e-15, byclass
    say("Q_m at a corner against the centre, every order", "%.1e" % hole)
    say("ordered pairs in each class", str(ordered))
    say("worst |P_m(square) - 9 P_m(centre cell)|", "%.2e cell by cell, %.2e by class" % (similar, byclass))

    print("block 7: the thirteen orders reach rank 9, even 6, odd 3")
    C = [[Q[m][reps[c][0]][reps[c][1]] for c in range(classes)] for m in range(ORDERS)]
    for tolerance in (1e-9, 1e-11, 1e-13):
        got, pivots = rank(C, tolerance)
        assert got == 9, (tolerance, got)
    even, _ = rank([C[m] for m in range(0, ORDERS, 2)], 1e-11)
    odd, _ = rank([C[m] for m in range(1, ORDERS, 2)], 1e-11)
    assert (even, odd) == (6, 3), (even, odd)
    say("rank of the 13 orders against the 11 classes", "%d, stable from 1e-9 to 1e-13" % got)
    say("smallest pivot against the largest coefficient", "%.3e against %.3e" % (min(pivots), scale))
    say("even orders and odd orders", "%d and %d" % (even, odd))

    print("block 8: the half-turn involution caps the odd orders at 3")
    half = [8 - j for j in range(9)]
    assert half in group, half
    tau = [index[half[reps[c][0]] * 9 + reps[c][1]] for c in range(classes)]
    assert all(tau[tau[c]] == c for c in range(classes)), tau
    fixed = sum(1 for c in range(classes) if tau[c] == c)
    assert fixed == 5, fixed
    assert (classes - fixed) // 2 == 3
    for m in range(ORDERS):
        sign = 1 if m % 2 == 0 else -1
        worst = max(abs(C[m][tau[c]] - sign * C[m][c]) for c in range(classes))
        assert worst < 1e-15, (m, worst)
    say("classes fixed by half-turning one member", "%d of %d" % (fixed, classes))
    say("antisymmetric dimension, the cap on the odd orders", (classes - fixed) // 2)

    print("block 9: the census route and the cell route agree, and the homometric pairs share every P_m")
    mult = [1 if reps[c][0] == reps[c][1] else 2 for c in range(classes)]
    coefs = [[Q[m][reps[c][0]][reps[c][1]] for m in range(ORDERS)] for c in range(classes)]
    level1 = {}
    routes = 0.0
    for bits in range(1, 512):
        points = cells_of(bits, 9)
        direct = [sum(Q[m][j][k] for j in points for k in points) for m in range(ORDERS)]
        P = spectrum(census(points, index, 9, classes), coefs, mult)
        routes = max(routes, max(abs(x - y) for x, y in zip(direct, P)))
        level1[bits] = direct
    assert routes < 1e-15, routes
    say("worst gap between the two routes over all 511 codes", "%.2e" % routes)
    for a, b in tied:
        gap = max(abs(x - y) for x, y in zip(level1[a], level1[b]))
        size = max(abs(x) for x in level1[a])
        assert gap < 1e-15, (a, b, gap)
        say("%d against %d: worst |P_m| gap" % (a, b), "%.2e on scale %.3e" % (gap, size))
    spectra = {}
    for bits in range(1, 512):
        spectra.setdefault(tuple(round(x, 9) for x in level1[bits]), []).append(bits)
    assert len(spectra) == 97, len(spectra)
    say("distinct level-1 spectra over all 511 codes at 1e-9", len(spectra))

    print("block 10: the level-2 spectrum splits the 511 codes into 101")
    mult2 = [1 if reps2[c][0] == reps2[c][1] else 2 for c in range(classes2)]
    coefs2, nodes2, segments2 = gram(9, 0.06, 3.4, reps2)
    gens = (big[1], big[4])
    seen = {tuple(range(81))}
    edge = list(seen)
    while edge:
        cur = edge.pop()
        for g in gens:
            nxt = tuple(g[j] for j in cur)
            if nxt not in seen:
                seen.add(nxt)
                edge.append(nxt)
    assert len(seen) == 8 and all(list(g) in big for g in seen), len(seen)
    turned = 0.0
    for g in gens:
        check2, _, _ = gram(9, 0.06, 3.4, [(g[j], g[l]) for j, l in reps2])
        turned = max(turned, max(abs(coefs2[c][m] - check2[c][m]) for c in range(classes2) for m in range(ORDERS)))
    assert turned < 1e-15, turned
    scale2 = max(abs(coefs2[c][m]) for c in range(classes2) for m in range(ORDERS))
    finer2, _, _ = gram(9, 0.03, 4.0, reps2)
    drift2 = max(abs(coefs2[c][m] - finer2[c][m]) for c in range(classes2) for m in range(ORDERS))
    assert drift2 < 1e-15, drift2
    level2 = {}
    for bits in range(1, 512):
        level2[bits] = spectrum(census(kronecker(bits), index2, 81, classes2), coefs2, mult2)
    grouped = {}
    for bits in range(1, 512):
        grouped.setdefault(tuple(round(x, 9) for x in level2[bits]), []).append(bits)
    assert len(grouped) == 101, len(grouped)
    assert max(len(v) for v in grouped.values()) == 8
    for v in grouped.values():
        assert len({canonical(b, group) for b in v}) == 1, v
    closest = None
    for a, b in itertools.combinations(sorted(orbits), 2):
        gap = max(abs(x - y) for x, y in zip(level2[a], level2[b]))
        rel = gap / max(max(map(abs, level2[a])), max(map(abs, level2[b])))
        if closest is None or rel < closest[0]:
            closest = (rel, gap, a, b)
    assert closest[0] > 1e-3, closest
    say("radial segments and quadrature nodes at level 2", "%d and %d" % (segments2, nodes2))
    say("worst drift against a finer quadrature rule at level 2", "%.3e on scale %.3e" % (drift2, scale2))
    say("worst drift of Q_m under the two generators of the group", "%.2e" % turned)
    say("distinct level-2 spectra over all 511 codes", "%d, largest bucket %d" % (len(grouped), max(len(v) for v in grouped.values())))
    say("every bucket is one symmetry orbit", "yes, %d orbits" % len(orbits))
    say("closest two orbits, codes %d and %d" % (closest[2], closest[3]), "relative %.3e, absolute %.3e" % (closest[0], closest[1]))

    print("block 11: the truncation is a truncation")
    share = {}
    for bits in range(1, 512):
        energy = bin(bits).count("1") / 9.0
        share[bits] = (level1[bits][0] + 2 * sum(level1[bits][m] for m in range(1, ORDERS))) / energy
    solid = 511
    caught = share[solid]
    assert 0.977 < caught < 0.978, caught
    best = max(share.values())
    worst = min(share.values())
    top = sorted(b for b in share if share[b] > best - 1e-12)
    low = sorted(b for b in share if share[b] < worst + 1e-12)
    assert top == [16, 511], top
    assert low == [1, 4, 64, 256], low
    assert abs(best - caught) < 1e-12, (best, caught)
    say("share of the solid square's angular energy at m <= 12", "%.6f of 1" % caught)
    say("the largest share over all 511 codes and where", "%.6f at codes %s" % (best, top))
    say("the smallest share over all 511 codes and where", "%.6f at codes %s" % (worst, low))

    print("all green in %.1f seconds" % (time.time() - clock))

if __name__ == "__main__":
    main()
