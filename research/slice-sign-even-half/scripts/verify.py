import sys
import time
from fractions import Fraction
from itertools import product
from math import comb

# POLYNOMIALS

def polymul(a, b):
    out = [0] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        if x:
            for j, y in enumerate(b):
                if y:
                    out[i + j] += x * y
    return out

def polypow(a, e):
    r = [1]
    for _ in range(e):
        r = polymul(r, a)
    return r

def middle(q):
    assert q % 2 == 1 and q >= 3, "base must be odd and at least 3"
    return (q - 1) // 2

def alpha_poly(q):
    m = middle(q)
    return [0 if d == m else 1 for d in range(q)]

def digit_poly(D, q):
    m = middle(q)
    A = alpha_poly(q)
    second = A[:]
    second[m] += D
    return polymul(polypow(A, D - 1), second)

def digit_poly_base3_binomial(D):
    base = [0] * (2 * D - 1)
    for k in range(D):
        base[2 * k] = comb(D - 1, k)
    return polymul(base, [1, D, 1])

def fill_value(D, q):
    return (q - 1) ** (D - 1) * (q - 1 + D)

def brute_poly(D, q):
    m = middle(q)
    out = [0] * ((q - 1) * D + 1)
    for v in product(range(q), repeat=D):
        if sum(1 for x in v if x == m) <= 1:
            out[sum(v)] += 1
    return out

# CARRY MATRIX

def half_width(D):
    return (D - 1) // 2

def coefficient(P, x):
    return P[x] if 0 <= x < len(P) else 0

def assert_window_closed(D, q):
    P = digit_poly(D, q)
    shift = middle(q) * D
    H = half_width(D)
    for c in range(-H, H + 1):
        for s, val in enumerate(P):
            if not val:
                continue
            if (c + shift - s) % q:
                continue
            cp = (c + shift - s) // q
            assert abs(cp) <= H, "carry window escapes at D=%d q=%d" % (D, q)

def m_full(D, q):
    P = digit_poly(D, q)
    shift = middle(q) * D
    H = half_width(D)
    st = list(range(-H, H + 1))
    return [[coefficient(P, c + shift - q * cp) for c in st] for cp in st]

def m_even(D, q):
    P = digit_poly(D, q)
    shift = middle(q) * D
    H = half_width(D)
    n = H + 1
    N = [[0] * n for _ in range(n)]
    for cp in range(n):
        for c in range(n):
            v = coefficient(P, c + shift - q * cp)
            if c:
                v += coefficient(P, -c + shift - q * cp)
            N[cp][c] = v
    return N

def m_odd(D, q):
    P = digit_poly(D, q)
    shift = middle(q) * D
    H = half_width(D)
    return [[coefficient(P, c + shift - q * cp) - coefficient(P, -c + shift - q * cp)
             for c in range(1, H + 1)] for cp in range(1, H + 1)]

# CENSUS BY CARRY TRANSFER

def census(D, q, top):
    P = digit_poly(D, q)
    shift = middle(q) * D
    H = half_width(D)
    n = 2 * H + 1
    step = []
    for cp in range(-H, H + 1):
        row = []
        for c in range(-H, H + 1):
            v = coefficient(P, c + shift - q * cp)
            if v:
                row.append((c + H, v))
        step.append(row)
    u = [0] * n
    u[H] = 1
    bs = [1]
    m0s = [1]
    for _ in range(top):
        v = [0] * n
        for i in range(n):
            s = 0
            for j, w in step[i]:
                if u[j]:
                    s += w * u[j]
            v[i] = s
        u = v
        bs.append(sum(u))
        m0s.append(sum(u[c + H] for c in range(-H, H + 1) if c % q == 0))
    return bs, m0s

# EXACT DETERMINANT

def bareiss_det(A):
    n = len(A)
    if n == 0:
        return 1
    M = [row[:] for row in A]
    sign = 1
    prev = 1
    for k in range(n - 1):
        if M[k][k] == 0:
            p = None
            for r in range(k + 1, n):
                if M[r][k] != 0:
                    p = r
                    break
            if p is None:
                return 0
            M[k], M[p] = M[p], M[k]
            sign = -sign
        for i in range(k + 1, n):
            for j in range(k + 1, n):
                M[i][j] = (M[i][j] * M[k][k] - M[i][k] * M[k][j]) // prev
        prev = M[k][k]
    return sign * M[n - 1][n - 1]

def fraction_det(A):
    n = len(A)
    if n == 0:
        return Fraction(1)
    M = [[Fraction(x) for x in row] for row in A]
    det = Fraction(1)
    for k in range(n):
        p = None
        for r in range(k, n):
            if M[r][k] != 0:
                p = r
                break
        if p is None:
            return Fraction(0)
        if p != k:
            M[k], M[p] = M[p], M[k]
            det = -det
        det *= M[k][k]
        inv = 1 / M[k][k]
        for j in range(k, n):
            M[k][j] *= inv
        for i in range(k + 1, n):
            f = M[i][k]
            if f:
                for j in range(k, n):
                    M[i][j] -= f * M[k][j]
    return det

# COLLATZ-WIELANDT CERTIFICATES

def transpose_action(D, q):
    P = digit_poly(D, q)
    shift = middle(q) * D
    H = half_width(D)
    n = 2 * H + 1
    rows = []
    for c in range(-H, H + 1):
        row = []
        for cp in range(-H, H + 1):
            v = coefficient(P, c + shift - q * cp)
            if v:
                row.append((cp + H, v))
        rows.append(row)
    return rows, n

def certificate_depth(D, q, kmax):
    rows, n = transpose_action(D, q)
    f = fill_value(D, q)
    x = [1] * n
    for K in range(kmax + 1):
        y = [sum(w * x[j] for j, w in row) for row in rows]
        assert all(v > 0 for v in y), "beta vector not positive at D=%d q=%d" % (D, q)
        if all(q * y[i] < f * x[i] for i in range(n)):
            return K, x, y
        x = y
    return None, None, None

# GF(2) LINEAR ALGEBRA ON BITMASKS

def bit_rank(rows):
    piv = []
    rk = 0
    for v in rows:
        for p in piv:
            hb = p.bit_length() - 1
            if (v >> hb) & 1:
                v ^= p
        if v:
            piv.append(v)
            piv.sort(key=lambda t: -t.bit_length())
            rk += 1
    return rk

def echelon(rows):
    B = []
    for v in rows:
        for p in B:
            hb = p.bit_length() - 1
            if (v >> hb) & 1:
                v ^= p
        if v:
            B.append(v)
            B.sort(key=lambda t: -t.bit_length())
    return B

def reduce_by(v, B):
    for p in B:
        hb = p.bit_length() - 1
        if (v >> hb) & 1:
            v ^= p
    return v

def nullspace(rows, ncols):
    M = [r for r in rows if r]
    piv = {}
    for c in range(ncols):
        bit = 1 << c
        pr = None
        for r in M:
            if r & bit:
                pr = r
                break
        if pr is None:
            continue
        M = [r for r in M if r is not pr]
        M = [(r ^ pr) if (r & bit) else r for r in M]
        for c2 in list(piv):
            if piv[c2] & bit:
                piv[c2] ^= pr
        piv[c] = pr
    out = []
    for f in [c for c in range(ncols) if c not in piv]:
        v = 1 << f
        for c2, pr in piv.items():
            if (pr >> f) & 1:
                v |= 1 << c2
        out.append(v)
    return out

# MOD-2 EVEN CORE BY LUCAS

def m_even_rows_mod2(D):
    assert D % 2 == 1, "the Lucas model is stated for odd D"
    mask = 2 * D - 3

    def pc(x):
        a = 1 if 0 <= x <= mask and (x & ~mask) == 0 else 0
        b = 1 if 0 <= x - 3 <= mask and ((x - 3) & ~mask) == 0 else 0
        return a ^ b

    n = (D - 1) // 2 + 1
    rows = []
    for cp in range(n):
        v = 0
        for c in range(n):
            bit = pc(c + D - 3 * cp)
            if c:
                bit ^= pc(-c + D - 3 * cp)
            if bit:
                v |= 1 << c
        rows.append(v)
    return rows, n

# JACOBSTHAL AND THE TENT

def jacobsthal(k):
    return (2 ** k - (-1) ** k) // 3

def trough_set(top):
    T = set()
    k = 0
    while True:
        j = jacobsthal(k)
        T.add(2 * j + 1)
        T.add(2 * j + 3)
        if 2 * j + 1 > 2 * top + 8:
            break
        k += 1
    return sorted(T)

def tent(D, T):
    return min(abs(D - t) // 2 + 1 for t in T)

# THE LAYER-2 CLOSED FORM

def law_e(R):
    b = 0
    while (1 << b) < 3 * R - 1:
        b += 1
    g = abs(2 * R - (1 << (b - 1)) - 1)
    e = 1
    while jacobsthal(e) < (g + 1) // 2:
        e += 1
    k = b - 1 - e
    assert k >= 1, "Law E slot with k < 1 at R=%d" % R
    return b, g, e, k

def window_top(R, b):
    A = 1 << b
    i0 = max(2, 4 * R - A)
    hi = (6 * R + 2 - A) // 3
    hi_even = hi - (hi % 2)
    assert (hi_even - i0) % 2 == 0, "window parity at R=%d" % R
    return (hi_even - i0) // 2

def layer2_closed_form(D):
    R = (D - 1) // 2
    b, g, e, k = law_e(R)
    K = window_top(R, b)
    N = jacobsthal(k)
    t = (N - 1) // 2
    deficit = 2 * jacobsthal(e - 1) if k % 2 == 0 else 0
    C = K - deficit
    B = t * (1 << e)
    w = C - B
    ce = 2 * jacobsthal(e - 2) - 1 if e >= 3 else 1
    return K + 1, min(w + 1, ce + 1 - w)

# THE MOD-4 LIFT

def even_core_mod4(D):
    P = digit_poly_base3_binomial(D)
    n = (D - 1) // 2 + 1
    rows = []
    for cp in range(n):
        lo = 0
        hi = 0
        for c in range(n):
            v = coefficient(P, c + D - 3 * cp)
            if c:
                v += coefficient(P, -c + D - 3 * cp)
            v %= 4
            if v & 1:
                lo |= 1 << c
            if v & 2:
                hi |= 1 << c
        rows.append((lo, hi))
    return rows, n

def layers_12(D):
    rows, n = even_core_mod4(D)
    mod2 = [lo for lo, _ in rows]
    V1 = nullspace(mod2, n)
    cols = [0] * n
    for cp, r in enumerate(mod2):
        rr = r
        while rr:
            c = (rr & -rr).bit_length() - 1
            cols[c] |= 1 << cp
            rr &= rr - 1
    image = echelon(cols)
    obstruction = []
    for v in V1:
        o = 0
        for cp in range(n):
            lo, hi = rows[cp]
            s = (bin(lo & v).count("1") + 2 * bin(hi & v).count("1")) % 4
            assert s % 2 == 0, "kernel vector not annihilated mod 2 at D=%d" % D
            if s == 2:
                o |= 1 << cp
        obstruction.append(reduce_by(o, image))
    L = len(V1)
    orows = []
    for cp in range(n):
        r = 0
        for j in range(L):
            if (obstruction[j] >> cp) & 1:
                r |= 1 << j
        if r:
            orows.append(r)
    combos = nullspace(orows, L)
    V2 = []
    for cb in combos:
        v = 0
        for j in range(L):
            if (cb >> j) & 1:
                v ^= V1[j]
        if v:
            V2.append(v)
    return L, len(echelon(V2))

# CHECK POLYNOMIALS

def polyphase(P):
    parts = [[], [], []]
    for i, x in enumerate(P):
        parts[i % 3].append(x)
    return parts

def extraction_image(P, X):
    prod = polymul(P, X)
    top = (len(prod) - 2) // 3 + 1
    return [coefficient(prod, 3 * j + 1) for j in range(max(top, 0))]

def check_polynomials():
    for q in (3, 5):
        for D in range(2, 9):
            P = digit_poly(D, q)
            B = brute_poly(D, q)
            while len(B) < len(P):
                B.append(0)
            assert P == B[:len(P)] and all(x == 0 for x in B[len(P):]), \
                "digit polynomial disagrees with brute force at q=%d D=%d" % (q, D)
            assert sum(P) == fill_value(D, q), "fill wrong at q=%d D=%d" % (q, D)
            if q == 3:
                assert P == digit_poly_base3_binomial(D), \
                    "base-3 factorization wrong at D=%d" % D
    seed = 12345
    for D in range(3, 14, 2):
        R = (D - 1) // 2
        P = digit_poly(D, 3)
        A = m_full(D, 3)
        for c in range(-R, R + 1):
            X = [0] * (2 * R + 1)
            X[R - c] = 1
            img = extraction_image(P, X)
            for cp in range(-R, R + 1):
                assert A[cp + R][c + R] == img[R - cp], \
                    "extraction form fails at D=%d c=%d c'=%d" % (D, c, cp)
        P0, P1, P2 = polyphase(P)
        for _ in range(6):
            X = []
            for _ in range(2 * R + 1):
                seed = (seed * 1103515245 + 12345) % (1 << 31)
                X.append(seed % 7 - 3)
            X0, X1, X2 = polyphase(X)
            lhs = extraction_image(P, X)
            parts = (polymul(P1, X0), polymul(P0, X1), [0] + polymul(P2, X2))
            width = max(len(lhs), max(len(p) for p in parts))
            rhs = [0] * width
            for part in parts:
                for j, x in enumerate(part):
                    rhs[j] += x
            lhs = lhs + [0] * (width - len(lhs))
            assert lhs == rhs, "polyphase form fails at D=%d" % D
    return "bases 3 and 5, D = 2..8; extraction and polyphase forms, odd D = 3..13"

# CHECK REDUCTION

def check_reduction():
    kmax = 6
    for q in (3, 5, 7):
        for D in range(2, 13):
            assert_window_closed(D, q)
            bs, m0s = census(D, q, kmax)
            f = fill_value(D, q)
            sgn = (-1) ** (D - 1)
            for k in range(1, kmax + 1):
                W = q ** (k - 1) * (q * bs[k] - f * bs[k - 1])
                pred = sgn * (D - 1) * q ** (k - 1) * (q * m0s[k - 1] - bs[k - 1])
                assert W == pred, "step identity fails at q=%d D=%d k=%d" % (q, D, k)
    return "bases 3, 5, 7, D = 2..12, k = 1..6"

# CHECK FOLD

def check_fold():
    for q in (3, 5):
        for D in range(2, 26):
            full = bareiss_det(m_full(D, q))
            even = bareiss_det(m_even(D, q))
            odd = bareiss_det(m_odd(D, q))
            assert full == even * odd, "fold fails at q=%d D=%d" % (q, D)
            if D <= 9:
                assert Fraction(full) == fraction_det(m_full(D, q)), \
                    "Bareiss disagrees with fractions at q=%d D=%d" % (q, D)
    return "bases 3 and 5, D = 2..25, both parities"

# CHECK EVEN CERTIFICATES

def check_even_certificates():
    depths = {}
    plan = [
        (5, list(range(2, 41, 2)) + [64, 66, 314, 316]),
        (3, list(range(2, 37, 2))),
        (7, list(range(2, 27, 2)) + [172, 174]),
        (9, list(range(2, 43, 2))),
        (11, list(range(2, 61, 2))),
    ]
    for q, dims in plan:
        for D in dims:
            K, x, y = certificate_depth(D, q, 4 * D + 8)
            assert K is not None, "no certificate found at q=%d D=%d" % (q, D)
            f = fill_value(D, q)
            assert all(q * y[i] < f * x[i] for i in range(len(x))), \
                "certificate does not close at q=%d D=%d" % (q, D)
            depths[(q, D)] = K
    assert depths[(3, 30)] == 50, "base-3 depth at D=30 changed"
    assert depths[(3, 36)] == 72, "base-3 depth at D=36 changed"
    for q in (5, 7, 9, 11):
        assert depths[(q, 2)] == 0, "depth at D=2 changed at q=%d" % q
        assert depths[(q, 4)] == 1, "the K=0 death is not at D=4 at q=%d" % q
    for D in range(4, 15, 2):
        assert depths[(5, D)] == 1, "base-5 staircase moved at D=%d" % D
    for D in list(range(16, 41, 2)) + [64]:
        assert depths[(5, D)] == 2, "base-5 staircase moved at D=%d" % D
    assert depths[(5, 66)] == 3 and depths[(5, 314)] == 3 and depths[(5, 316)] == 4, \
        "a base-5 death dimension moved"
    for D in range(4, 25, 2):
        assert depths[(7, D)] == 1, "base-7 staircase moved at D=%d" % D
    assert depths[(7, 26)] == 2 and depths[(7, 172)] == 2 and depths[(7, 174)] == 3, \
        "a base-7 death dimension moved"
    for D in range(4, 41, 2):
        assert depths[(9, D)] == 1, "base-9 staircase moved at D=%d" % D
    assert depths[(9, 42)] == 2, "the base-9 K=1 death is not at D=42"
    for D in range(4, 59, 2):
        assert depths[(11, D)] == 1, "base-11 staircase moved at D=%d" % D
    assert depths[(11, 60)] == 2, "the base-11 K=1 death is not at D=60"
    dom = ("base 5 even D <= 40 plus 64, 66, 314, 316; base 3 even D <= 36; "
           "base 7 even D <= 26 plus 172, 174; base 9 even D <= 42; base 11 even D <= 60")
    return dom, depths

# CHECK NO TRANSIENT

def check_notransient():
    for q in (7, 9, 11):
        for D in range(2, 25, 2):
            assert_window_closed(D, q)
            bs, m0s = census(D, q, 12)
            for L in range(13):
                assert q * m0s[L] - bs[L] > 0, \
                    "V dips at q=%d D=%d L=%d" % (q, D, L)
    return "bases 7, 9, 11, even D <= 24, L <= 12, window closure included"

# CHECK TRANSIENT

def check_transient(depths):
    table = {}
    for D in range(6, 37, 2):
        top = 4 * D + 8
        bs, m0s = census(D, 3, top)
        V = [3 * m0s[L] - bs[L] for L in range(top + 1)]
        neg = [L for L in range(top + 1) if V[L] < 0]
        assert neg, "no transient at D=%d" % D
        star = max(neg)
        assert star + 5 <= top and all(V[L] > 0 for L in range(star + 1, top + 1)), \
            "transient not exhausted at D=%d" % D
        K = depths[(3, D)]
        assert K in (star + 1, star + 2), \
            "certificate depth off the transient at D=%d: K=%d Lstar=%d" % (D, K, star)
        table[D] = (star, K)
    return "base 3, even D = 6..36", table

# LEMMA M FINITE WINDOWS

def valuation_1t(mask):
    v = 0
    while mask and bin(mask).count("1") % 2 == 0:
        n = mask.bit_length()
        x = mask
        s = 1
        while s < n:
            x ^= x << s
            s <<= 1
        mask = x & ((1 << n) - 1)
        v += 1
    return v

def brute_V(r, d):
    allowed = [e for e in range(d + 1) if e % 3 != r]
    best = -1
    for bits in range(1, 1 << len(allowed)):
        mask = 0
        b = bits
        i = 0
        while b:
            if b & 1:
                mask |= 1 << allowed[i]
            b >>= 1
            i += 1
        v = valuation_1t(mask)
        if v > best:
            best = v
    return best

def mu_formula(r, d):
    best = -1
    b = 0
    while (1 << b) <= d:
        s0 = (r + (1 << b)) % 3
        if (1 << b) + s0 <= d:
            h = (d - s0 - (1 << b)) // 3 + (1 << b)
            if h > best:
                best = h
        b += 1
    return best

# CHECK TENT

def check_tent(deep):
    top = 583 if deep else 301
    T = trough_set(top)
    peaks = {3} | {(1 << (2 * j)) + 1 for j in range(1, 12)}
    for D in range(3, top + 1, 2):
        rows, n = m_even_rows_mod2(D)
        nullity = n - bit_rank(rows)
        pred = tent(D, T)
        assert nullity == pred, \
            "tent law fails at D=%d: nullity=%d tent=%d" % (D, nullity, pred)
        cap = -(-n // 3)
        assert pred <= cap, "tent above the cap at D=%d" % D
        assert (pred == cap) == (D in peaks), "cap equality misplaced at D=%d" % D
    for r in range(3):
        for d in range(2, 13):
            assert brute_V(r, d) == mu_formula(r, d), \
                "valuation window fails at r=%d d=%d" % (r, d)
    return "base 3, odd D = 3..%d, plus the valuation windows r = 0,1,2, d = 2..12" % top

# CHECK LAYER 2

def check_layer2(deep):
    top = 401 if deep else 151
    for D in range(5, top + 1, 2):
        L1, L2 = layers_12(D)
        p1, p2 = layer2_closed_form(D)
        assert L1 == p1, "layer-1 window count fails at D=%d: %d vs %d" % (D, L1, p1)
        assert L2 == p2, "layer-2 closed form fails at D=%d: %d vs %d" % (D, L2, p2)
        assert L2 >= 1, "empty layer 2 at D=%d" % D
    return "base 3, odd D = 5..%d" % top

# CHECK STRICTNESS

def v2_det(A, prec):
    mod = 1 << prec
    n = len(A)
    M = [[x % mod for x in row] for row in A]
    total = 0
    for k in range(n):
        best = None
        bv = prec
        for r in range(k, n):
            x = M[r][k]
            if x:
                v = (x & -x).bit_length() - 1
                if v < bv:
                    best = r
                    bv = v
        assert best is not None, "pivot vanished mod 2^%d" % prec
        M[k], M[best] = M[best], M[k]
        total += bv
        inv = pow(M[k][k] >> bv, -1, mod)
        for r in range(k + 1, n):
            x = M[r][k]
            if x:
                f = ((x >> bv) * inv) % mod
                for j in range(k, n):
                    M[r][j] = (M[r][j] - f * M[k][j]) % mod
    assert total + 128 < prec, "valuation too close to the working precision"
    return total

def check_strictness():
    prec = 1024
    E = m_even(7, 3)
    f = fill_value(7, 3)
    pencil = [[f * (i == j) - 3 * E[i][j] for j in range(4)] for i in range(4)]
    delta7 = bareiss_det(pencil)
    assert delta7 == -148506048, "the D=7 pencil determinant changed"
    assert (delta7 & -delta7).bit_length() - 1 == 6, "v2 of the D=7 pencil changed"
    assert delta7 == -(1 << 6) * 2320407, "the odd part of the D=7 pencil changed"
    assert v2_det(E, prec) == 7, "v2 at D=7 changed"
    for D in range(13, 152, 6):
        val = v2_det(m_even(D, 3), prec)
        assert val < D - 1, "base-3 strictness fails at D=%d: v2=%d" % (D, val)
        assert val <= (D + 1) // 2, "v2 above n at D=%d" % D
    for D in range(6, 157, 5):
        threshold = 2 * (D - 1) + (((D + 4) & -(D + 4)).bit_length() - 1)
        val = v2_det(m_even(D, 5), prec)
        assert val < threshold, "base-5 strictness fails at D=%d: v2=%d" % (D, val)
    return "base 3 class members D = 13..151 plus D = 7 direct, base 5 class members D = 6..156", delta7

# MAIN

def main():
    deep = "--deep" in sys.argv
    results = []
    t0 = time.time()

    t = time.time()
    dom = check_polynomials()
    results.append(("check_polynomials", dom, time.time() - t))

    t = time.time()
    dom = check_reduction()
    results.append(("check_reduction", dom, time.time() - t))

    t = time.time()
    dom = check_fold()
    results.append(("check_fold", dom, time.time() - t))

    t = time.time()
    dom, depths = check_even_certificates()
    results.append(("check_even_certificates", dom, time.time() - t))

    t = time.time()
    dom, table = check_transient(depths)
    results.append(("check_transient", dom, time.time() - t))

    t = time.time()
    dom = check_notransient()
    results.append(("check_notransient", dom, time.time() - t))

    t = time.time()
    dom = check_tent(deep)
    results.append(("check_tent", dom, time.time() - t))

    t = time.time()
    dom = check_layer2(deep)
    results.append(("check_layer2", dom, time.time() - t))

    t = time.time()
    dom, delta7 = check_strictness()
    results.append(("check_strictness", dom, time.time() - t))

    for name, dom, secs in results:
        print("%s: PASS (%s, %.1f s)" % (name, dom, secs))
    print("total: %.1f s" % (time.time() - t0))
    print("base 3 transient and certificate depth, even D = 6..36")
    print("  D   L*  K_min")
    for D in sorted(table):
        star, K = table[D]
        print("  %-3d %-3d %-3d" % (D, star, K))

if __name__ == "__main__":
    main()
