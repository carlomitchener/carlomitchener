import cmath
import math
import sys
import time

# DESIGNS

def strings(q, F, L):
    out = [0]
    for _ in range(L):
        out = [v * q + d for v in out for d in F]
    return sorted(set(v for v in out if v > 0))

def indigits(n, q, F):
    if n == 0:
        return False
    while n:
        if n % q not in F:
            return False
        n //= q
    return True

def member(q, F, N):
    return [False] + [indigits(n, q, F) for n in range(1, N + 1)]

def report(name, got, want, tol):
    ok = abs(got - want) <= tol
    print("  %-56s %.3e <= %.1e  %s" % (name, abs(got - want), tol, "ok" if ok else "FAILED"))
    assert ok, "%s: got %r, wanted %r within %r" % (name, got, want, tol)

def exact(name, got, want):
    print("  %-56s %s  %s" % (name, want, "ok" if got == want else "FAILED"))
    assert got == want, "%s: got %r, wanted %r" % (name, got, want)

# INVERSE

def inverse(q, F, N):
    inside = member(q, F, N)
    assert inside[1], "1 must lie in the design"
    nu = [0] * (N + 1)
    nu[1] = 1
    for n in range(2, N + 1):
        total = 0
        d = 2
        while d * d <= n:
            if n % d == 0:
                if inside[d]:
                    total += nu[n // d]
                e = n // d
                if e != d and inside[e]:
                    total += nu[n // e]
            d += 1
        if inside[n]:
            total += nu[1]
        nu[n] = -total
    return nu, inside

def convolve(nu, inside, N):
    out = [0] * (N + 1)
    for a in range(1, N + 1):
        if not inside[a]:
            continue
        for b in range(1, N // a + 1):
            out[a * b] += nu[b]
    return out

def mobius(N):
    mu = [1] * (N + 1)
    prime = [True] * (N + 1)
    for p in range(2, N + 1):
        if not prime[p]:
            continue
        for m in range(p, N + 1, p):
            if m != p:
                prime[m] = False
            mu[m] = -mu[m]
        for m in range(p * p, N + 1, p * p):
            mu[m] = 0
    mu[0] = 0
    return mu

def semigroup(inside, N):
    reach = [False] * (N + 1)
    reach[1] = True
    for n in range(2, N + 1):
        d = 1
        while d * d <= n:
            if n % d == 0:
                if inside[d] and reach[n // d]:
                    reach[n] = True
                    break
                if inside[n // d] and reach[d]:
                    reach[n] = True
                    break
            d += 1
    return reach

def check_inverse():
    print("THE REPLACEMENT IDENTITY zeta_F N_F = 1")
    N = 3 ** 8
    nu, inside = inverse(3, [0, 1], N)
    conv = convolve(nu, inside, N)
    exact("base 3 {0,1}: (1_S * nu_F)(1) to n = 6561", conv[1], 1)
    exact("base 3 {0,1}: (1_S * nu_F)(n) = 0 for 2 <= n <= 6561", sum(abs(v) for v in conv[2:]), 0)
    reach = semigroup(inside, N)
    for n in (9, 27, 36):
        exact("base 3 {0,1}: %d in the semigroup, nu_F = 0" % n, (reach[n], nu[n]), (True, 0))
    for n in (16, 48, 52):
        exact("base 3 {0,1}: %d in the semigroup, outside S_F" % n, (reach[n], inside[n]), (True, False))
    for n in range(1, N + 1):
        assert nu[n] == 0 or reach[n], "nu_F supported outside the semigroup at n = %d" % n
    exact("base 3 {0,1}: support inside the semigroup, strictly", True, True)
    for q, L in ((2, 13), (3, 8)):
        M = q ** L
        nuf, _ = inverse(q, list(range(q)), M)
        mu = mobius(M)
        exact("base %d full digit set: nu_F = mu term for term to n = %d" % (q, M), nuf[1:] == mu[1:], True)
    return nu, inside

# THE WALL

def repunit(q, a):
    return (q ** a - 1) // (q - 1)

def witness(q, F):
    missing = sorted(set(range(q)) - set(F))
    inner = [c for c in missing if c >= 2]
    if inner:
        c = min(inner)
        return "repunit", repunit(q, c), repunit(q, c + 1)
    if q % 2:
        return "odd base", 2, (q * q + 1) // 2
    return "even base", q * q - 1, q * q + 1

def check_wall():
    print("THE WALL: the indicator is multiplicative only at the full digit set")
    tally = {"repunit": 0, "odd base": 0, "even base": 0}
    seen = blind = full = 0
    for q in range(2, 8):
        for code in range(1, 1 << q):
            F = [d for d in range(q) if code >> d & 1]
            seen += 1
            if 1 not in F:
                blind += 1
                continue
            if len(F) == q:
                full += 1
                continue
            kind, m, n = witness(q, F)
            assert math.gcd(m, n) == 1, "witness not coprime at q = %d, F = %s" % (q, F)
            fm = indigits(m, q, F)
            fn = indigits(n, q, F)
            fmn = indigits(m * n, q, F)
            assert fmn != (fm and fn), "witness failed at q = %d, F = %s, pair (%d, %d)" % (q, F, m, n)
            tally[kind] += 1
    exact("nonempty digit sets examined, 2 <= q <= 7", seen, 246)
    exact("sets with 1 outside F, killed at f(1)", blind, 120)
    exact("full digit sets, multiplicative", full, 6)
    exact("sets witnessed, by branch", tally, {"repunit": 114, "odd base": 3, "even base": 3})
    exact("base 3, F = {0,1}: the constructed pair", witness(3, [0, 1]), ("repunit", 4, 13))
    exact("base 2, F = {1}: the constructed pair", witness(2, [1]), ("even base", 3, 5))
    exact("base 12, F = {1}: the constructed pair", witness(12, [1]), ("repunit", 13, 157))

# THE POSITION PRODUCT

def position(q, F, L):
    Q = q ** L
    root = [cmath.exp(-2j * math.pi * j / Q) for j in range(Q)]
    grid = []
    for a in range(Q):
        z = complex(1)
        for i in range(L):
            w = 0j
            for d in F:
                w += root[(-d * (q ** i) * a) % Q]
            z *= w
        grid.append(z)
    live = set(strings(q, F, L))
    if 0 in F:
        live.add(0)
    worst = 0.0
    for n in range(Q):
        acc = 0j
        step = (n % Q)
        idx = 0
        for a in range(Q):
            acc += grid[a] * root[idx]
            idx += step
            if idx >= Q:
                idx -= Q
        acc /= Q
        want = 1.0 if n in live else 0.0
        worst = max(worst, abs(acc - want))
    return worst

def check_position():
    print("THE POSITION PRODUCT: int G_L(t) e(-nt) dt is the indicator of the level")
    report("base 3 {0,1}, L = 5, every n < 243", position(3, [0, 1], 5), 0.0, 1e-10)
    report("base 10 missing 9, L = 3, every n < 1000", position(10, list(range(9)), 3), 0.0, 1e-9)

# THE DESIGN ZETA

def design_zeta(q, F, s, J=260, cut=14.0):
    k = len(F)
    nonzero = [a for a in F if a > 0]
    gamma = [float(k)] + [float(sum(a ** l for a in F)) for l in range(1, J + 1)]
    depth = 1
    while q ** depth < 5000:
        depth += 1
    small = strings(q, F, depth)
    value = {}
    for j in range(J, -1, -1):
        w = s + j
        if w.real >= cut:
            value[j] = sum(complex(n) ** (-w) for n in small)
            continue
        acc = sum(complex(a) ** (-w) for a in nonzero)
        binom = complex(1)
        for l in range(1, J - j + 1):
            binom = binom * (-w - (l - 1)) / l
            acc += binom * q ** (-w - l) * gamma[l] * value[j + l]
        value[j] = acc / (1.0 - k * q ** (-w))
    return value[0]

def check_zeta():
    print("THE DESIGN ZETA: the peel evaluator, then the two boxed zeros")
    for q, F, L, s in ((3, [0, 1], 15, 2.0), (10, list(range(9)), 5, 2.0)):
        k = len(F)
        brute = sum(float(n) ** (-s) for n in strings(q, F, L))
        tail = k * (k * q ** (-s)) ** L / (1.0 - k * q ** (-s))
        got = design_zeta(q, F, complex(s, 0.0))
        report("base %d, k = %d: peel against the direct sum at s = 2" % (q, k), got.real, brute, tail)
    rho3 = complex(0.720790, 28.605680)
    rho10 = complex(1.001590, 2.739200)
    at3 = abs(design_zeta(3, [0, 1], rho3))
    off3 = abs(design_zeta(3, [0, 1], rho3 + 1j))
    at10 = abs(design_zeta(10, list(range(9)), rho10))
    off10 = abs(design_zeta(10, list(range(9)), rho10 + 1j))
    print("  base 3 {0,1}:      |zeta_F| = %.3e at the box centre, %.3e one unit up" % (at3, off3))
    print("  base 10 missing 9: |zeta_F| = %.3e at the box centre, %.3e one unit up" % (at10, off10))
    assert at3 < 1e-3 < off3, "base 3 box centre is not small against its control"
    assert at10 < 1e-3 < off10, "base 10 box centre is not small against its control"
    exact("both centres below 1e-3, both controls above", True, True)
    a = 2
    base, scaled = [0, 1], [0, 2]
    left = set(strings(3, scaled, 9))
    right = set(a * n for n in strings(3, base, 9))
    exact("base 3: S_{2F} = 2 S_F below 3^9", left == right, True)
    probe = complex(0.6, 3.1)
    report("base 3: zeta_{0,2}(s) = 2^(-s) zeta_{0,1}(s)", design_zeta(3, scaled, probe), complex(a) ** (-probe) * design_zeta(3, base, probe), 1e-11)

# THE LYNDON PRODUCT

def lyndon(k, L):
    total = 0
    for d in range(1, L + 1):
        if L % d == 0:
            total += moebius_int(d) * k ** (L // d)
    assert total % L == 0, "Lyndon count is not an integer at k = %d, L = %d" % (k, L)
    return total // L

def moebius_int(n):
    result, d = 1, 2
    while d * d <= n:
        if n % d == 0:
            n //= d
            if n % d == 0:
                return 0
            result = -result
        d += 1
    return -result if n > 1 else result

def check_lyndon():
    print("THE LYNDON PRODUCT: the free monoid on F factors over its Lyndon words")
    top = 16
    for k in (2, 3, 4, 9, 10):
        series = [1] + [0] * top
        for L in range(1, top + 1):
            c = lyndon(k, L)
            factor = [0] * (top + 1)
            for j in range(0, top // L + 1):
                factor[j * L] = math.comb(c + j - 1, j)
            fresh = [0] * (top + 1)
            for i in range(top + 1):
                if not series[i]:
                    continue
                for j in range(0, top + 1 - i, L):
                    fresh[i + j] += series[i] * factor[j]
            series = fresh
        want = [k ** i for i in range(top + 1)]
        exact("k = %2d: the Lyndon product is 1/(1 - k u) through u^%d" % (k, top), series, want)
    exact("c_2(L), L = 1..10, is A001037", [lyndon(2, L) for L in range(1, 11)], [2, 1, 2, 3, 6, 9, 18, 30, 56, 99])

# VERIFY

def main():
    clock = time.time()
    check_wall()
    check_inverse()
    check_position()
    check_lyndon()
    check_zeta()
    print("all checks green in %.1f seconds" % (time.time() - clock))

if __name__ == "__main__":
    main()
