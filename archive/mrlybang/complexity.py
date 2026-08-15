import itertools
from itertools import product
from fractions import Fraction
from .bang import anf_coefficients

# COMPLEXITY MEASURES - THE STANDARD BOOLEAN-FUNCTION TOOLKIT, FROM SCRATCH

def _value(filled):
    f = filled
    def ev(x):
        return 1 if x in f else 0
    return ev

def _flip(corner, axis):
    return tuple(corner[j] ^ (1 if j == axis else 0) for j in range(len(corner)))

# SENSITIVITY

def sensitivity_at(filled, cells, x):
    fx = 1 if x in filled else 0
    count = 0
    for axis in range(len(x)):
        y = _flip(x, axis)
        fy = 1 if y in filled else 0
        if fy != fx:
            count += 1
    return count

def sensitivity(filled, cells):
    return max((sensitivity_at(filled, cells, x) for x in cells), default=0)

# BLOCK SENSITIVITY

def _flip_block(corner, block):
    s = set(block)
    return tuple(corner[j] ^ (1 if j in s else 0) for j in range(len(corner)))

def _sensitive_blocks(filled, cells, x):
    D = len(x)
    fx = 1 if x in filled else 0
    blocks = []
    for r in range(1, D + 1):
        for block in itertools.combinations(range(D), r):
            y = _flip_block(x, block)
            fy = 1 if y in filled else 0
            if fy != fx:
                blocks.append(frozenset(block))
    return blocks

def _minimal_blocks(blocks):
    out = []
    for b in blocks:
        if not any(other < b for other in blocks):
            out.append(b)
    return out

def _max_disjoint(blocks):
    blocks = sorted(set(blocks), key=lambda b: (len(b), tuple(sorted(b))))
    best = 0
    def search(i, used, count):
        nonlocal best
        if count + (len(blocks) - i) <= best:
            return
        if i == len(blocks):
            best = max(best, count)
            return
        b = blocks[i]
        if used.isdisjoint(b):
            search(i + 1, used | b, count + 1)
        search(i + 1, used, count)
    search(0, frozenset(), 0)
    return best

def block_sensitivity_at(filled, cells, x):
    blocks = _minimal_blocks(_sensitive_blocks(filled, cells, x))
    return _max_disjoint(blocks)

def block_sensitivity(filled, cells):
    return max((block_sensitivity_at(filled, cells, x) for x in cells), default=0)

# CERTIFICATE COMPLEXITY

def _is_certificate(filled, cells, x, S):
    fx = 1 if x in filled else 0
    Sset = set(S)
    for y in cells:
        if all(y[j] == x[j] for j in Sset):
            fy = 1 if y in filled else 0
            if fy != fx:
                return False
    return True

def certificate_at(filled, cells, x):
    D = len(x)
    for r in range(D + 1):
        for S in itertools.combinations(range(D), r):
            if _is_certificate(filled, cells, x, S):
                return r
    return D

def certificate_complexity(filled, cells):
    return max((certificate_at(filled, cells, x) for x in cells), default=0)

def certificate_complexity_1(filled, cells):
    vals = [certificate_at(filled, cells, x) for x in cells if x in filled]
    return max(vals, default=0)

def certificate_complexity_0(filled, cells):
    vals = [certificate_at(filled, cells, x) for x in cells if x not in filled]
    return max(vals, default=0)

# DECISION-TREE DEPTH

def _restrict(filled_sub, axis, value):
    return frozenset(c for c in filled_sub if c[axis] == value)

def _all_sub(cells_sub, axis, value):
    return [c for c in cells_sub if c[axis] == value]

def _constant_value(filled_count, total_count):
    if filled_count == 0:
        return 0
    if filled_count == total_count:
        return 1
    return None

def decision_tree_depth(filled, cells):
    D = len(cells[0]) if cells else 0
    full = frozenset(cells)
    memo = {}
    def depth(sub_cells, free_axes):
        key = (sub_cells, free_axes)
        if key in memo:
            return memo[key]
        lit = sum(1 for c in sub_cells if c in filled)
        if lit == 0 or lit == len(sub_cells):
            memo[key] = 0
            return 0
        best = None
        for axis in free_axes:
            rest = tuple(a for a in free_axes if a != axis)
            c0 = tuple(c for c in sub_cells if c[axis] == 0)
            c1 = tuple(c for c in sub_cells if c[axis] == 1)
            d = 1 + max(depth(c0, rest), depth(c1, rest))
            if best is None or d < best:
                best = d
        memo[key] = best
        return best
    return depth(tuple(cells), tuple(range(D)))

# REAL (FOURIER) POLYNOMIAL DEGREE

def real_anf_coefficients(filled, cells):
    D = len(cells[0])
    coeff = {c: (1 if c in filled else 0) for c in cells}
    for axis in range(D):
        for c in cells:
            if c[axis] == 1:
                lower = tuple(c[j] if j != axis else 0 for j in range(D))
                coeff[c] = coeff[c] - coeff[lower]
    return coeff

def real_degree(filled, cells):
    coeff = real_anf_coefficients(filled, cells)
    degs = [sum(c) for c in cells if coeff[c] != 0]
    return max(degs, default=-1)

# DNF AND CNF SIZE

def _pattern_cells(pattern, cells):
    out = []
    for c in cells:
        if all(p == -1 or p == c[j] for j, p in enumerate(pattern)):
            out.append(c)
    return frozenset(out)

def _prime_implicants(filled, cells):
    D = len(cells[0])
    onset = frozenset(c for c in cells if c in filled)
    current = {tuple(c) for c in onset}
    primes = []
    while current:
        used = set()
        nxt = set()
        for a in current:
            for b in current:
                if a >= b:
                    continue
                diff = [j for j in range(D) if a[j] != b[j]]
                if len(diff) == 1:
                    j = diff[0]
                    if a[j] == -1 or b[j] == -1:
                        continue
                    merged = tuple(-1 if k == j else a[k] for k in range(D))
                    nxt.add(merged)
                    used.add(a)
                    used.add(b)
        for a in current:
            if a not in used:
                primes.append(a)
        current = nxt
    out = []
    seen = set()
    for pat in primes:
        if pat in seen:
            continue
        seen.add(pat)
        out.append((pat, _pattern_cells(pat, cells)))
    return out, onset

def _min_cover(onset, prime_covers):
    onset = frozenset(onset)
    if not onset:
        return 0
    covers = [c & onset for c in prime_covers if c & onset]
    best = [len(onset) + 1]
    def search(remaining, used):
        if not remaining:
            best[0] = min(best[0], used)
            return
        if used + 1 >= best[0]:
            return
        target = next(iter(remaining))
        options = [c for c in covers if target in c]
        options.sort(key=lambda c: len(c & remaining), reverse=True)
        for c in options:
            search(remaining - c, used + 1)
    search(onset, 0)
    return best[0]

def dnf_size(filled, cells):
    primes, onset = _prime_implicants(filled, cells)
    if not onset:
        return 0
    return _min_cover(onset, [cov for _, cov in primes])

def cnf_size(filled, cells):
    full = frozenset(cells)
    complement = full - frozenset(filled)
    return dnf_size(complement, cells)

# THE FILL-POLYNOMIAL FINGERPRINT

def _fill_at_odd_base(filled, cells, k):
    D = len(cells[0])
    E = k
    O = k - 1
    total = 0
    for c in filled:
        pc = sum(c)
        total += (E ** (D - pc)) * (O ** pc)
    return total

def _fit_polynomial(points):
    n = len(points)
    xs = [Fraction(x) for x, _ in points]
    ys = [Fraction(y) for _, y in points]
    coeffs = [Fraction(0)] * n
    for i in range(n):
        Li = [Fraction(0)] * n
        Li[0] = Fraction(1)
        denom = Fraction(1)
        for j in range(n):
            if j == i:
                continue
            denom *= (xs[i] - xs[j])
            new = [Fraction(0)] * n
            for d in range(n - 1):
                new[d + 1] += Li[d]
            for d in range(n):
                new[d] += -xs[j] * Li[d]
            Li = new
        scale = ys[i] / denom
        for d in range(n):
            coeffs[d] += scale * Li[d]
    return coeffs

def fill_fingerprint(filled, cells):
    D = len(cells[0])
    points = [(k, _fill_at_odd_base(filled, cells, k)) for k in range(1, D + 2)]
    coeffs = _fit_polynomial(points)
    leading_first = list(reversed(coeffs))
    cleaned = []
    for a in leading_first:
        cleaned.append(int(a) if a.denominator == 1 else a)
    return cleaned

def measures(filled, cells):
    return {
        "popcount": len(filled),
        "sensitivity": sensitivity(filled, cells),
        "block_sensitivity": block_sensitivity(filled, cells),
        "certificate": certificate_complexity(filled, cells),
        "certificate_1": certificate_complexity_1(filled, cells),
        "certificate_0": certificate_complexity_0(filled, cells),
        "decision_tree_depth": decision_tree_depth(filled, cells),
        "real_degree": real_degree(filled, cells),
        "dnf_size": dnf_size(filled, cells),
        "cnf_size": cnf_size(filled, cells),
        "fill_fingerprint": fill_fingerprint(filled, cells),
    }
