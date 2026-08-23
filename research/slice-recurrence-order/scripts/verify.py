from fractions import Fraction
from itertools import product
from math import comb, log, cos, pi

# SLICE

def choose(n, k):
    if k < 0 or k > n or n < 0:
        return 0
    return comb(n, k)

def polymul(a, b):
    out = [0] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        if x:
            for j, y in enumerate(b):
                if y:
                    out[i + j] += x * y
    return out

def digit_poly(D):
    p = [1]
    for _ in range(D - 1):
        p = polymul(p, [1, 0, 1])
    return polymul(p, [1, D, 1])

def brute_poly(D):
    out = [0] * (2 * D + 1)
    for v in product((0, 1, 2), repeat=D):
        if sum(1 for x in v if x == 1) <= 1:
            out[sum(v)] += 1
    return out

def bcoef(D, s):
    if s < 0 or s > 2 * D:
        return 0
    if s % 2 == 0:
        return choose(D - 1, s // 2) + choose(D - 1, (s - 2) // 2)
    return D * choose(D - 1, (s - 1) // 2)

def transfer(D):
    P = digit_poly(D)
    size = 2 * D + 1
    M = [[0] * size for _ in range(size)]
    for c in range(-D, D + 1):
        for s in range(0, 2 * D + 1):
            if (c + D - s) % 3 == 0:
                nc = (c + D - s) // 3
                if abs(nc) <= D:
                    M[nc + D][c + D] += P[s]
    return M

def m_even(D):
    n = (D + 1) // 2
    M = [[0] * n for _ in range(n)]
    for i in range(n):
        M[i][0] = bcoef(D, D - 3 * i)
        for j in range(1, n):
            M[i][j] = bcoef(D, D + j - 3 * i) + bcoef(D, D - j - 3 * i)
    return M

def matmul(A, B):
    n, m, p = len(A), len(B), len(B[0])
    C = [[0] * p for _ in range(n)]
    for i in range(n):
        Ai = A[i]
        Ci = C[i]
        for k in range(m):
            a = Ai[k]
            if a:
                Bk = B[k]
                for j in range(p):
                    if Bk[j]:
                        Ci[j] += a * Bk[j]
    return C

def matpow(A, L):
    n = len(A)
    R = [[1 if i == j else 0 for j in range(n)] for i in range(n)]
    for _ in range(L):
        R = matmul(R, A)
    return R

def ladder(D, top):
    M = m_even(D)
    R = [[1 if i == j else 0 for j in range(len(M))] for i in range(len(M))]
    out = [1]
    for _ in range(top):
        R = matmul(R, M)
        out.append(R[0][0])
    return out

def ladder_auto(D, top):
    M = transfer(D)
    R = [[1 if i == j else 0 for j in range(len(M))] for i in range(len(M))]
    out = [1]
    for _ in range(top):
        R = matmul(R, M)
        out.append(R[D][D])
    return out

def substitution(D, L):
    P = digit_poly(D)
    out = [1]
    for j in range(L):
        step = 3 ** j
        new = [0] * (len(out) + 2 * D * step)
        for i, x in enumerate(out):
            if x:
                for s, y in enumerate(P):
                    if y:
                        new[i + s * step] += x * y
        out = new
    return out

def reachable(D):
    M = transfer(D)
    seen = {0}
    frontier = [0]
    while frontier:
        c = frontier.pop()
        for nc in range(-D, D + 1):
            if M[nc + D][c + D] and nc not in seen:
                seen.add(nc)
                frontier.append(nc)
    return sorted(seen)

def det(rows):
    A = [[Fraction(x) for x in row] for row in rows]
    n = len(A)
    d = Fraction(1)
    for i in range(n):
        piv = None
        for r in range(i, n):
            if A[r][i]:
                piv = r
                break
        if piv is None:
            return Fraction(0)
        if piv != i:
            A[i], A[piv] = A[piv], A[i]
            d = -d
        d *= A[i][i]
        inv = Fraction(1) / A[i][i]
        for r in range(i + 1, n):
            f = A[r][i] * inv
            if f:
                for c in range(i, n):
                    A[r][c] -= f * A[i][c]
    return d

def hankel(D):
    n = (D + 1) // 2
    a = ladder(D, 2 * n)
    return det([[a[i + j + 1] for j in range(n)] for i in range(n)])

def charpoly(A):
    n = len(A)
    I = [[Fraction(1 if i == j else 0) for j in range(n)] for i in range(n)]
    F = [[Fraction(x) for x in row] for row in A]
    M = I
    coeffs = [Fraction(1)]
    for k in range(1, n + 1):
        AM = matmul(F, M)
        c = -Fraction(sum(AM[i][i] for i in range(n)), k)
        coeffs.append(c)
        M = [[AM[i][j] + (c if i == j else 0) for j in range(n)] for i in range(n)]
    return [int(x) for x in coeffs]

def roots(coeffs):
    n = len(coeffs) - 1
    z = [complex(0.4, 0.9) ** k for k in range(n)]
    for _ in range(500):
        moved = 0.0
        for i in range(n):
            num = 0j
            for c in coeffs:
                num = num * z[i] + c
            den = 1 + 0j
            for j in range(n):
                if j != i:
                    den *= z[i] - z[j]
            step = num / den
            z[i] -= step
            moved = max(moved, abs(step))
        if moved < 1e-14:
            break
    return z

def gap_ratio(D):
    n = (D + 1) // 2
    if n < 2:
        return None
    fill = 2 ** (D - 1) * (D + 2)
    s = Fraction(fill, 3)
    cp = charpoly(m_even(D))
    scaled = [float(Fraction(cp[k]) / s ** k) for k in range(len(cp))]
    z = sorted((abs(r) for r in roots(scaled)), reverse=True)
    return z[0] / z[1]


# SIGN LAW

def core_transfer(D):
    r = (D - 1) // 2
    states = list(range(-r, r + 1))
    return [[bcoef(D, c + D - 3 * cp) for c in states] for cp in states], r

def sheaf(D, top):
    M, r = core_transfer(D)
    n = 2 * r + 1
    v = [1 if i == r else 0 for i in range(n)]
    out = [1]
    for _ in range(top):
        v = [sum(M[i][j] * v[j] for j in range(n)) for i in range(n)]
        out.append(sum(v))
    return out

def sheaf_from_product(D, L):
    coeffs = substitution(D, L)
    NL = D * (3 ** L - 1) // 2
    step = 3 ** L
    return sum(x for T, x in enumerate(coeffs) if (T - NL) % step == 0)

def phi_circle(D, psi):
    c2 = 2.0 * cos(psi)
    return c2 ** (D - 1) * (D + c2)

def sheaf_dft(D, L):
    Q = 3 ** L
    tot = 0.0
    for m in range(Q):
        p = 1.0
        for j in range(L):
            p *= phi_circle(D, 2 * pi * ((m * 3 ** j) % Q) / Q)
        tot += p
    return tot / Q

def main():
    for D in range(2, 9):
        got = digit_poly(D)
        want = brute_poly(D)
        assert got == want, f"D={D}: digit polynomial got {got} want {want}"
        closed = [bcoef(D, s) for s in range(2 * D + 1)]
        assert closed == want, f"D={D}: entry form got {closed} want {want}"
        print(f"D={D}: P(t) factorisation and entry form match enumeration of 3^{D} tuples")

    for D in range(2, 8):
        auto = ladder_auto(D, 4)
        even = ladder(D, 4)
        subs = [substitution(D, L)[D * (3 ** L - 1) // 2] for L in range(0, 5)]
        assert auto == subs, f"D={D}: automaton got {auto} want {subs}"
        assert even == subs, f"D={D}: even block got {even} want {subs}"
        print(f"D={D}: three generators agree, a(0..4) = {subs}")

    for D in range(2, 25):
        r = (D - 1) // 2
        got = reachable(D)
        want = list(range(-r, r + 1))
        assert got == want, f"D={D}: reachable carries got {got} want {want}"
    print("D=2..24: reachable carries are exactly {|c| <= floor((D-1)/2)}")

    for D in range(2, 25):
        n = (D + 1) // 2
        h = hankel(D)
        assert h != 0, f"D={D}: Hankel determinant got 0 want nonzero"
        if D <= 6:
            print(f"D={D}: order {n}, Hankel determinant {h}")
    print("D=2..24: Hankel determinant nonzero, so the order is exactly ceil(D/2)")

    for D in range(2, 25):
        M = m_even(D)
        got = sum(M[i][i] for i in range(len(M)))
        want = 3 * 2 ** (D - 2) - 1 if D % 2 == 0 else 3 * D * 2 ** (D - 3)
        assert got == want, f"D={D}: trace got {got} want {want}"
    print("D=2..24: trace is 3*2^(D-2)-1 at even D and 3*D*2^(D-3) at odd D")

    for D in range(2, 13):
        P = digit_poly(D)
        fill = sum(P)
        assert fill == 2 ** (D - 1) * (D + 2), f"D={D}: fill got {fill} want {2 ** (D - 1) * (D + 2)}"
        eps = Fraction((D - 1) * (-1) ** (D - 1), 3)
        got = [sum(P[s] for s in range(len(P)) if s % 3 == j) for j in range(3)]
        want = [Fraction(fill, 3) + (2 * eps if j == D % 3 else -eps) for j in range(3)]
        assert got == want, f"D={D}: class sums got {got} want {want}"
    print("D=2..12: fill = 2^(D-1)(D+2) and the three class sums are fill/3+2eps, fill/3-eps, fill/3-eps")

    for D in range(3, 8):
        n = (D + 1) // 2
        r = (D - 1) // 2
        cp = charpoly(m_even(D))
        for m in range(1, r + 1):
            b = [substitution(D, L)[D * (3 ** L - 1) // 2 + m] for L in range(1, 2 * n + 4)]
            for start in range(len(b) - n):
                got = sum(cp[k] * b[start + n - k] for k in range(n + 1))
                assert got == 0, f"D={D}, m={m}, L={start}: off-centre residual got {got} want 0"
        print(f"D={D}: off-centre censuses at offsets 1..{r} obey the central recurrence")

    cp4 = charpoly(m_even(4))
    b4 = [substitution(4, L)[4 * (3 ** L - 1) // 2 + 2] for L in range(1, 9)]
    stray = [sum(cp4[k] * b4[start + 2 - k] for k in range(3)) for start in range(6)]
    assert all(x != 0 for x in stray), f"D=4, m=2: residuals got {stray} want all nonzero"
    print(f"D=4: offset 2 sits on the stalling carry D/2 and breaks the recurrence, residuals {stray}")

    anchor = m_even(3)
    assert anchor == [[6, 6], [1, 3]], f"D=3: even block got {anchor} want [[6, 6], [1, 3]]"
    cp3 = charpoly(anchor)
    assert cp3 == [1, -9, 12], f"D=3: characteristic polynomial got {cp3} want [1, -9, 12]"
    a3 = ladder(3, 6)
    want3 = [1, 6, 42, 306, 2250, 16578, 122202]
    assert a3 == want3, f"D=3: ladder got {a3} want {want3}"
    rho3 = (9 + 33 ** 0.5) / 2
    dim3 = log(rho3) / log(3)
    assert abs(dim3 - 1.818410) < 1e-6, f"D=3: slice dimension got {dim3} want 1.818410"
    print(f"D=3: [[6,6],[1,3]], x^2-9x+12, ladder {want3}, dim {dim3:.6f}")

    a2 = ladder(2, 8)
    assert a2 == [2 ** L for L in range(9)], f"D=2: ladder got {a2} want powers of two"
    cp4 = charpoly(m_even(4))
    assert cp4 == [1, -11, -66], f"D=4: characteristic polynomial got {cp4} want [1, -11, -66]"
    a4 = ladder(4, 6)
    want4 = [1, 6, 132, 1848, 29040, 441408, 6772128]
    assert a4 == want4, f"D=4: ladder got {a4} want {want4}"
    a5 = ladder(5, 4)
    want5 = [1, 30, 1000, 35700, 1321600]
    assert a5 == want5, f"D=5: ladder got {a5} want {want5}"
    a6 = ladder(6, 4)
    want6 = [1, 20, 4030, 242300, 24642700]
    assert a6 == want6, f"D=6: ladder got {a6} want {want6}"
    print(f"D=4: ladder {want4}; D=5: {want5}; D=6: {want6}")

    prev = None
    for D in range(4, 21):
        got = gap_ratio(D)
        assert got > 1.0, f"D={D}: spectral ratio got {got} want above 1"
        if prev is not None and D >= 6:
            assert got < prev, f"D={D}: spectral ratio got {got} want below {prev}"
        if D >= 6:
            free = (D + 2) / (D - 2)
            assert abs(got - free) < 0.05, f"D={D}: spectral ratio got {got} want near {free}"
        prev = got
        print(f"D={D}: rho/|lambda_2| = {got:.6f}")

    for D in range(2, 21):
        fill = 2 ** (D - 1) * (D + 2)
        cp = charpoly(m_even(D))
        s = Fraction(fill, 3)
        scaled = [float(Fraction(cp[k]) / s ** k) for k in range(len(cp))]
        rho = max(abs(r) for r in roots(scaled))
        got = 1 if rho > 1.0 else -1
        want = (-1) ** (D + 1)
        assert got == want, f"D={D}: sign of rho - fill/3 got {got} want {want}"
    print("D=2..20: sign(rho - fill/3) alternates as (-1)^(D+1)")

    for D in range(2, 31):
        fill = Fraction(2 ** (D - 1) * (D + 2), 3)
        cp = charpoly(m_even(D))
        val = Fraction(0)
        for c in cp:
            val = val * fill + c
        got = 1 if val > 0 else -1
        want = (-1) ** D
        assert got == want, f"D={D}: sign of chi(fill/3) got {got} want {want}"
    print("D=2..30: exact rational sign of chi(fill/3) alternates as (-1)^D")

    for D in range(2, 8):
        b = sheaf(D, 5)
        for L in range(1, 5):
            got = sheaf_from_product(D, L)
            assert got == b[L], f"D={D} L={L}: class sum {got} want {b[L]}"
        for L in range(1, 6):
            approx = sheaf_dft(D, L)
            assert abs(approx - b[L]) < 1e-6 * max(1.0, b[L]), f"D={D} L={L}: dft {approx} want {b[L]}"
    print("D=2..7: sheaf census = coefficient class sums = trigonometric product formula")

    for D in range(2, 8):
        fill = 2 ** (D - 1) * (D + 2)
        b = sheaf(D, 5)
        for k in range(1, 6):
            W = 3 ** (k - 1) * (3 * b[k] - fill * b[k - 1])
            U = [u for u in range(1, 3 ** k) if u % 3]
            direct = 0.0
            for u in U:
                p = 1.0
                for j in range(k):
                    p *= phi_circle(D, 2 * pi * ((u * 3 ** j) % 3 ** k) / 3 ** k)
                direct += p
            assert abs(direct - W) < 1e-6 * max(1.0, abs(W)), f"D={D} k={k}: W {W} vs unit sum {direct}"
        par = phi_circle(D, 2 * pi / 3)
        assert abs(par - (-1) ** (D - 1) * (D - 1)) < 1e-9, f"D={D}: parity factor {par}"
    print("D=2..7: step identity W_k matches unit sums, parity factor (-1)^(D-1)(D-1)")

    for D in range(3, 26, 2):
        fill = 2 ** (D - 1) * (D + 2)
        b = sheaf(D, 8)
        for k in range(1, 9):
            W = 3 ** (k - 1) * (3 * b[k] - fill * b[k - 1])
            assert W > 0, f"D={D} k={k}: W_k = {W} want positive"
        assert 3 ** 8 * b[8] >= fill ** 8, f"D={D}: sheaf census below (fill/3)^8"
    print("odd D=3..25: every W_k > 0 for k<=8 and b(8) >= (fill/3)^8, the theorem's mechanism")

    for D in range(6, 25, 2):
        fill = 2 ** (D - 1) * (D + 2)
        b = sheaf(D, 2)
        W2 = 3 * (3 * b[2] - fill * b[1])
        assert W2 > 0, f"D={D}: W_2 = {W2} want positive, i.e. V_2 < 0"
    print("even D=6..24: W_2 > 0 so V_2 < 0, the even-side obstruction")

    for D in range(2, 81):
        fill = 2 ** (D - 1) * (D + 2)
        Me = m_even(D)
        n = len(Me)
        J = [[fill * (i == j) - 3 * Me[i][j] for j in range(n)] for i in range(n)]
        dj = det(J)
        assert dj.denominator == 1 and dj != 0, f"D={D}: det J = {dj} want nonzero integer"
        dji = int(dj)
        assert (dji - fill ** n) % 3 == 0, f"D={D}: det J != fill^n mod 3"
        if D % 3 != 1:
            assert dji % 3 != 0, f"D={D}: det J divisible by 3 with D != 1 mod 3"
    print("D=2..80: det(fill I - 3 M_even) is a nonzero integer, == fill^n mod 3")

    D = 61
    fill = 2 ** (D - 1) * (D + 2)
    cp = charpoly(m_even(D))
    def chi_at(x):
        v = Fraction(0)
        for c in cp:
            v = v * x + c
        return v
    lo, hi = Fraction(fill, 3), Fraction(fill, 3) + 1
    assert chi_at(lo) < 0 and chi_at(hi) > 0, "D=61: bracketing of rho failed"
    for _ in range(100):
        mid = (lo + hi) / 2
        if chi_at(mid) < 0:
            lo = mid
        else:
            hi = mid
    gap61 = float(lo - Fraction(fill, 3))
    pred = 2 * (D - 1) / 3
    k = 2
    while 3 ** k < 10 ** 13:
        c2 = 2 * cos(2 * pi / 3 ** k)
        pred *= (c2 / 2) ** (D - 1) * (D + c2) / (D + 2)
        k += 1
    assert abs(gap61 / pred - 1) < 1e-8, f"D=61: gap {gap61} vs tower product {pred}"
    print("D=61: exact-bisected rho - fill/3 matches the tower product within 1e-8")

    for D in range(2, 21):
        fill = 2 ** (D - 1) * (D + 2)
        M, r = core_transfer(D)
        n = 2 * r + 1
        v = [1.0] * n
        for _ in range(300):
            w = [sum(M[i][j] * v[j] for j in range(n)) for i in range(n)]
            top = max(w)
            v = [x / top for x in w]
        w = [sum(M[i][j] * v[j] for j in range(n)) for i in range(n)]
        rho = sum(w) / sum(v)
        eps = (D - 1) * (-1) ** (D - 1) / 3.0
        p = sum(v[i] for i in range(n) if (i - r) % 3 == 0) / sum(v)
        lhs = rho - fill / 3.0
        rhs = eps * (3 * p - 1)
        assert abs(lhs - rhs) < 1e-6 * max(1.0, abs(eps) * 3), \
            "D=%d: mass identity lhs %r rhs %r" % (D, lhs, rhs)
        assert abs(lhs) <= 2 * (D - 1) / 3.0 + 1e-9, "D=%d: pinning violated: %r" % (D, lhs)
        lo = fill / 3.0 - (2 if D % 2 == 0 else 1) * (D - 1) / 3.0 - 1e-9
        hi = fill / 3.0 + (1 if D % 2 == 0 else 2) * (D - 1) / 3.0 + 1e-9
        assert lo <= rho <= hi, "D=%d: parity-refined pinning violated: %r" % (D, rho)
    print("D=2..20: mass identity 3 rho = fill + (-1)^(D-1)(D-1)(3p-1) and both pinning brackets")

    print("all green")

if __name__ == "__main__":
    main()
