#!/usr/bin/env python3
# CARPETS

import math
from fractions import Fraction


def sign(n, i, L):
    return 1 if ((n * i) // L) % 2 == 0 else -1


def integral(m, n):
    L = m * n // math.gcd(m, n)
    total = 0
    for i in range(L):
        total += sign(m, i, L) * sign(n, i, L)
    return Fraction(total, L)


def mean(m):
    total = 0
    for i in range(m):
        total += sign(m, i, m)
    return Fraction(total, m)


def master(m, n):
    g = math.gcd(m, n)
    if (m // g) % 2 == 1 and (n // g) % 2 == 1:
        return Fraction(g * g, m * n)
    return Fraction(0)


def cov_tree(m, n):
    d = math.gcd(m, n)
    return Fraction(d * d - 1, 4 * m * n)


def cov_carpet(m, n):
    d = math.gcd(m, n)
    return Fraction((d * d - 1) * (2 * (m - 1) * (n - 1) + d * d - 1), 16 * m * m * n * n)


def cov_net(m, n):
    d = math.gcd(m, n)
    return Fraction((d * d - 1) * (2 * (m + 1) * (n + 1) + d * d - 1), 16 * m * m * n * n)


def cov_void(m, n):
    d = math.gcd(m, n)
    return Fraction(d ** 4 - 1, 4 * m * m * n * n)


def assembled(m, n):
    A = integral(m, n)
    am = Fraction(1, m)
    an = Fraction(1, n)
    mu_m = (1 - am) / 2
    mu_n = (1 - an) / 2
    nu = (1 - am - an + A) / 4
    bar_m = (1 + am) / 2
    bar_n = (1 + an) / 2
    nub = (1 + am + an + A) / 4
    tree = nu - mu_m * mu_n
    carpet = nu * nu - (mu_m * mu_n) ** 2
    net = nub * nub - (bar_m * bar_n) ** 2
    void = (A * A - (am * an) ** 2) / 4
    return tree, carpet, net, void


def r_tree(m, n):
    d = math.gcd(m, n)
    return (d * d - 1) / math.sqrt((m * m - 1) * (n * n - 1))


def r_carpet(m, n):
    d = math.gcd(m, n)
    top = (d * d - 1) * (2 * (m - 1) * (n - 1) + d * d - 1)
    bot = (m - 1) * (n - 1) * math.sqrt((3 * m - 1) * (m + 1) * (3 * n - 1) * (n + 1))
    return top / bot


def r_net(m, n):
    d = math.gcd(m, n)
    top = (d * d - 1) * (2 * (m + 1) * (n + 1) + d * d - 1)
    bot = (m + 1) * (n + 1) * math.sqrt((3 * m + 1) * (m - 1) * (3 * n + 1) * (n - 1))
    return top / bot


def r_void(m, n):
    d = math.gcd(m, n)
    return (d ** 4 - 1) / math.sqrt((m ** 4 - 1) * (n ** 4 - 1))


def brute_carpet(m, n):
    L = m * n // math.gcd(m, n)
    chi_m = [(1 - sign(m, i, L)) // 2 for i in range(L)]
    chi_n = [(1 - sign(n, i, L)) // 2 for i in range(L)]
    both = 0
    sm = 0
    sn = 0
    for i in range(L):
        for j in range(L):
            a = chi_m[i] * chi_m[j]
            b = chi_n[i] * chi_n[j]
            both += a * b
            sm += a
            sn += b
    cells = Fraction(1, L * L)
    return both * cells - (sm * cells) * (sn * cells)


def brute_net(m, n):
    L = m * n // math.gcd(m, n)
    bar_m = [(1 + sign(m, i, L)) // 2 for i in range(L)]
    bar_n = [(1 + sign(n, i, L)) // 2 for i in range(L)]
    both = 0
    sm = 0
    sn = 0
    for i in range(L):
        for j in range(L):
            a = bar_m[i] * bar_m[j]
            b = bar_n[i] * bar_n[j]
            both += a * b
            sm += a
            sn += b
    cells = Fraction(1, L * L)
    return both * cells - (sm * cells) * (sn * cells)


def brute_void(m, n):
    L = m * n // math.gcd(m, n)
    both = 0
    sm = 0
    sn = 0
    for i in range(L):
        for j in range(L):
            a = (1 + sign(m, i, L) * sign(m, j, L)) // 2
            b = (1 + sign(n, i, L) * sign(n, j, L)) // 2
            both += a * b
            sm += a
            sn += b
    cells = Fraction(1, L * L)
    return both * cells - (sm * cells) * (sn * cells)


def tri(x):
    r = x % 2
    return 1 - 2 * min(r, 2 - r)


def tri_scaled(k, b):
    r = k % (2 * b)
    return b - 2 * min(r, 2 * b - r)


def saw(x):
    r = x % 1
    return r - Fraction(1, 2)


def franel(m, n):
    L = m * n // math.gcd(m, n)
    h = Fraction(1, L)
    total = Fraction(0)
    for i in range(L):
        b = h * i + h / 2
        total += h * saw(m * b) * saw(n * b) + Fraction(m * n) * h ** 3 / 12
    return total


def ray(a, b):
    if b % 2 == 0:
        return Fraction(0)
    return Fraction((-1) ** a, b * b)


def is_prime(n):
    if n < 2:
        return False
    k = 2
    while k * k <= n:
        if n % k == 0:
            return False
        k += 1
    return True


def mobius_upto(N):
    mu = [1] * (N + 1)
    primes = []
    small = [0] * (N + 1)
    for i in range(2, N + 1):
        if small[i] == 0:
            primes.append(i)
            small[i] = i
            mu[i] = -1
        for p in primes:
            if p > small[i] or i * p > N:
                break
            small[i * p] = p
            mu[i * p] = 0 if p == small[i] else -mu[i]
    return mu


def fourier(dim):
    keys = list(range(dim))
    single = []
    pair = []
    triple = 0
    const = 0
    patterns = []
    for mask in range(2 ** dim):
        sigma = [1 - 2 * ((mask >> t) & 1) for t in keys]
        odd = sum(1 for x in sigma if x == -1)
        patterns.append((sigma, 1 if odd <= 1 else 0))
    N = float(2 ** dim)
    for sigma, f in patterns:
        const += f
    const /= N
    for t in keys:
        c = sum(f * sigma[t] for sigma, f in patterns) / N
        single.append(c)
    for t in keys:
        for u in keys:
            if u > t:
                c = sum(f * sigma[t] * sigma[u] for sigma, f in patterns) / N
                pair.append(c)
    if dim == 3:
        triple = sum(f * sigma[0] * sigma[1] * sigma[2] for sigma, f in patterns) / N
    return const, single, pair, triple



def sine_moment(n, a):
    total = 0.0
    for k in range(n):
        cell = math.cos(math.pi * a * k / n) - math.cos(math.pi * a * (k + 1) / n)
        if k % 2 == 1:
            total += cell
    return total / (math.pi * a)


def spectrum_direct(S, a, b):
    total = 0.0
    for n in S:
        total += sine_moment(n, a) * sine_moment(n, b)
    return total / len(S)


def spectrum_formula(S, a, b):
    L = len(S)
    g = 0
    s1a = sum(n for n in S if a % n == 0)
    s1b = sum(n for n in S if b % n == 0)
    gg = math.gcd(a, b)
    s2 = sum(n * n for n in S if gg % n == 0)
    return (1.0 - s1a / L - s1b / L + s2 / L) / (math.pi ** 2 * a * b)


def zeta_em(s, N=20000):
    total = 0.0
    for n in range(1, N + 1):
        total += n ** (-s)
    total += N ** (1 - s) / (s - 1) - 0.5 * N ** (-s) + s * N ** (-s - 1) / 12
    return total


def lam(s):
    return (1 - 2.0 ** (-s)) * zeta_em(s)

def main():
    bad = []
    for m in range(1, 41):
        for n in range(m, 41):
            if integral(m, n) != master(m, n):
                bad.append((m, n))
    assert bad == [], "refined master law: got mismatches %s, want []" % bad[:4]
    naive = 0
    for m in range(1, 41):
        for n in range(m, 41):
            g = math.gcd(m, n)
            if integral(m, n) != Fraction(g * g, m * n):
                naive += 1
    assert naive == 532, "naive law failures to 40: got %d, want 532" % naive
    assert integral(1, 2) == 0, "integral(1,2): got %s, want 0" % integral(1, 2)
    assert integral(2, 6) == Fraction(1, 3), "integral(2,6): got %s, want 1/3" % integral(2, 6)
    print("master law, all pairs 1..40: 0 mismatches, 532 naive failures")

    odds = list(range(1, 100, 2))
    misses = 0
    for a in range(len(odds)):
        for b in range(a, len(odds)):
            m, n = odds[a], odds[b]
            g = math.gcd(m, n)
            if integral(m, n) != Fraction(g * g, m * n):
                misses += 1
    assert misses == 0, "odd master law to 99: got %d mismatches, want 0" % misses
    for m in odds:
        assert mean(m) == Fraction(1, m), "mean s(%du): got %s, want 1/%d" % (m, mean(m), m)
    print("master law, all odd pairs 1..99: 0 mismatches; mean 1/m on all odd m to 99")

    for m, n, want in [(3, 9, Fraction(20, 729)), (5, 15, Fraction(68, 1875)),
                       (9, 15, Fraction(116, 18225)), (7, 21, Fraction(96, 2401)),
                       (3, 5, Fraction(0)), (5, 7, Fraction(0))]:
        got = brute_carpet(m, n)
        assert got == want, "carpet cov(%d,%d): got %s, want %s" % (m, n, got, want)
        assert got == cov_carpet(m, n), "carpet closed form(%d,%d): got %s, want %s" % (
            m, n, cov_carpet(m, n), got)
        gn = brute_net(m, n)
        assert gn == cov_net(m, n), "net cov(%d,%d): got %s, want %s" % (m, n, gn, cov_net(m, n))
        gv = brute_void(m, n)
        assert gv == cov_void(m, n), "void cov(%d,%d): got %s, want %s" % (m, n, gv, cov_void(m, n))
    for m, n in [(3, 9), (5, 15), (9, 15), (7, 21)]:
        direct = float(cov_net(m, n)) / math.sqrt(float(cov_net(m, m)) * float(cov_net(n, n)))
        assert abs(direct - r_net(m, n)) < 1e-12, "net r(%d,%d): got %.12f, want %.12f" % (
            m, n, r_net(m, n), direct)
    print("two-dimensional cell counts on (3,9),(5,15),(9,15),(7,21),(3,5),(5,7): carpet, net and void exact")

    zeros = 0
    for a in range(1, 20):
        for b in range(a, 20):
            m, n = 2 * a + 1, 2 * b + 1
            tree, carpet, net, void = assembled(m, n)
            for got, want, name in [(tree, cov_tree(m, n), "tree"), (carpet, cov_carpet(m, n), "carpet"),
                                    (net, cov_net(m, n), "net"), (void, cov_void(m, n), "void")]:
                assert got == want, "%s cov(%d,%d): got %s, want %s" % (name, m, n, got, want)
            coprime = math.gcd(m, n) == 1
            vanish = (tree == 0 and carpet == 0 and net == 0 and void == 0)
            positive = (tree > 0 and carpet > 0 and net > 0 and void > 0)
            assert vanish == coprime, "common zero set at (%d,%d): got %s, want %s" % (
                m, n, vanish, coprime)
            assert vanish or positive, "strict positivity at (%d,%d): got %s, want positive" % (
                m, n, (tree, carpet, net, void))
            if vanish:
                zeros += 1
    assert zeros == 139, "coprime pairs among odd 3..39: got %d, want 139" % zeros
    print("four families, odd pairs 3..39: closed forms exact, all vanish exactly on the 139 coprime pairs")

    primes = 0
    composites = 0
    worst = None
    for n in range(3, 200, 2):
        score = 0.0
        for m in range(3, n, 2):
            score = max(score, r_carpet(m, n))
        if is_prime(n):
            primes += 1
            assert score == 0.0, "prime %d: got score %r, want 0.0" % (n, score)
        else:
            composites += 1
            assert score > 0.0, "composite %d: got score %r, want positive" % (n, score)
            if worst is None or score < worst[1]:
                worst = (n, score)
    assert primes == 45, "primes in odd 3..199: got %d, want 45" % primes
    assert composites == 54, "composites in odd 3..199: got %d, want 54" % composites
    assert worst[0] == 169, "narrowest composite: got %d, want 169" % worst[0]
    assert abs(worst[1] - 0.0517383422) < 1e-9, "carpet gap at 169: got %.10f, want 0.0517383422" % worst[1]
    tree_score = max(r_tree(m, 169) for m in range(3, 169, 2))
    void_score = max(r_void(m, 169) for m in range(3, 169, 2))
    assert abs(tree_score - 0.0766964989) < 1e-9, "tree score at 169: got %.10f, want 0.0766964989" % tree_score
    assert abs(void_score - 0.0059170562) < 1e-9, "void score at 169: got %.10f, want 0.0059170562" % void_score
    assert r_tree(3, 9) > r_net(3, 9) > r_carpet(3, 9) > r_void(3, 9), (
        "family ordering at (3,9): got %r, want decreasing" % (
            (r_tree(3, 9), r_net(3, 9), r_carpet(3, 9), r_void(3, 9)),))
    for got, want, name in [(r_tree(3, 9), 0.316227766, "tree"), (r_net(3, 9), 0.262950294, "net"),
                            (r_carpet(3, 9), 0.219264505, "carpet"), (r_void(3, 9), 0.110431526, "void")]:
        assert abs(got - want) < 1e-9, "%s r(3,9): got %.9f, want %.9f" % (name, got, want)
    print("detector, odd 3..199: 45 primes at exactly 0, 54 composites positive, narrowest 0.0517383 at 169")

    layers = list(range(1, 56, 2))

    for n in range(1, 10, 2):
        for p in range(1, 9):
            for q in range(1, 9):
                if math.gcd(p, q) != 1:
                    continue
                got = integral(n * p, n * q)
                want = Fraction(1, p * q) if p % 2 == 1 and q % 2 == 1 else Fraction(0)
                assert got == want, "origin ray slope %d/%d at layer %d: got %s, want %s" % (
                    q, p, n, got, want)
    print("origin rays: slope q/p carries exactly 1/(pq) when p,q odd and exactly 0 otherwise")

    for b in [1, 3, 5, 7, 9]:
        got = sum(tri(Fraction(n, b)) for n in layers) / len(layers)
        limit = ray(1, b) if b > 1 else Fraction(1)
        if b == 9:
            assert got > 0 > limit, "b=9 ray at 28 layers: got %s, want a sign disagreeing with %s" % (
                got, limit)
            assert got == Fraction(1, 63), "b=9 ray at 28 layers: got %s, want 1/63" % got
        if b == 7:
            assert got == limit, "b=7 ray at 28 layers: got %s, want %s" % (got, limit)
        if b == 5:
            assert abs(float(got / limit) - 1.4285714) < 1e-6, (
                "b=5 ray at 28 layers: got %.7f of the limit, want 1.4285714" % float(got / limit))
    got2 = sum(tri(Fraction(n, 2)) for n in layers) / len(layers)
    assert got2 == 0, "b=2 ray at 28 layers: got %s, want 0" % got2
    got6 = sum(tri(Fraction(n, 6)) for n in layers) / len(layers)
    assert got6 == Fraction(-1, 42), "b=6 ray at 28 layers: got %s, want -1/42" % got6
    wide = list(range(1, 2222, 2))
    got6w = sum(tri(Fraction(n, 6)) for n in wide) / len(wide)
    assert abs(float(got6w)) < 1e-3, "b=6 ray at 1111 layers: got %s, want under 1e-3" % got6w
    print("slope-one rays at 28 layers: b=7 exact at -1/49, b=9 at +1/63 against a limit -1/81, "
          "b=5 at 10/7 of its limit, b=6 at -1/42 against a limit 0")

    for L, want in [(28, 0.21014), (101, 0.24516), (501, 0.26400)]:
        stack = list(range(1, 2 * L, 2))
        acc = Fraction(0)
        for m in stack:
            for n in stack:
                acc += cov_carpet(m, n)
        got = float(acc / L)
        print("stack variance at %d layers: L*Var = %.5f" % (L, got))
        assert abs(got - want) < 5e-6, "L*Var at %d layers: got %.5f, want %.5f" % (L, got, want)

    for m in range(1, 17):
        for n in range(m, 17):
            g = math.gcd(m, n)
            got = franel(m, n)
            want = Fraction(g * g, 12 * m * n)
            assert got == want, "Franel integral (%d,%d): got %s, want %s" % (m, n, got, want)
    assert franel(3, 9) == Fraction(1, 36), "Franel (3,9): got %s, want 1/36" % franel(3, 9)
    print("classical sawtooth sibling, all pairs 1..16: integral is exactly gcd^2/(12mn)")

    T = 0.0
    top = 1001
    for k in range(1, top + 1, 2):
        for l in range(1, top + 1, 2):
            T += 1.0 / (k * k * l * l * max(k, l))
    assert abs(T - 1.1122336970) < 1e-6, "T truncated at 1001: got %.10f, want 1.1122336970" % T
    print("gcd-sum constant T truncated at 1001: %.9f" % T)

    mu = mobius_upto(200)
    seen = set()
    checked = 0
    for b in range(2, 201, 2):
        odd_scales = range(1, 2 * b, 2)
        for a in range(1, b):
            if math.gcd(a, b) != 1:
                continue
            stacked = Fraction(sum(tri_scaled(n * a, b) for n in odd_scales), b * b)
            assert stacked == 0, "triangle-wave stack at %d/%d over %d layers: got %s, want 0" % (
                a, b, b, stacked)
            assert stacked == ray(a, b), "ray law at %d/%d: got %s, want %s" % (a, b, ray(a, b), stacked)
            checked += 1
        seen.add(mu[b])
    assert checked == 4081, "reduced fractions with even denominator to 200: got %d, want 4081" % checked
    assert seen == {-1, 0, 1}, "Moebius values on even denominators: got %s, want {-1,0,1}" % sorted(seen)
    print("all 4081 even denominators to 200 carry stacked ray strength exactly 0 "
          "while their Moebius values range over -1, 0, 1")

    const2, single2, pair2, _ = fourier(2)
    const3, single3, pair3, triple3 = fourier(3)
    assert const2 == 0.75 and single2 == [0.25, 0.25], "plane rule constants: got %r, want 0.75 and 0.25s" % (
        (const2, single2),)
    assert pair2 == [-0.25], "plane rule pair term: got %r, want [-0.25]" % pair2
    assert const3 == 0.5 and single3 == [0.25, 0.25, 0.25], "space rule constants: got %r, want 0.5 and 0.25s" % (
        (const3, single3),)
    assert pair3 == [0.0, 0.0, 0.0], "space rule pair terms: got %r, want zeros" % pair3
    assert triple3 == -0.25, "space rule triple term: got %r, want -0.25" % triple3
    print("fill rule harmonics: the plane carries a pair term -1/4, the space carries none")

    S = [1, 3, 5, 7, 9]
    for a in range(1, 16):
        for b in range(1, 16):
            got = spectrum_direct(S, a, b)
            if a % 2 == 0 or b % 2 == 0:
                assert abs(got) < 1e-12, "spectrum: even index (%d,%d) got %r want 0" % (a, b, got)
            else:
                want = spectrum_formula(S, a, b)
                assert abs(got - want) < 1e-12 * max(1.0, abs(want)), \
                    "spectrum (%d,%d): got %r want %r" % (a, b, got, want)
    got = spectrum_direct(S, 45, 45)
    want = spectrum_formula(S, 45, 45)
    assert abs(got - want) < 1e-14, "spectrum (45,45): got %r want %r" % (got, want)
    print("stack spectrum at L=5: cell-exact integrals match the divisor-sum formula, "
          "all pairs to 15 and (45,45); even indices exactly dark")

    for L in (2, 3, 4, 5, 6, 8):
        S = list(range(1, 2 * L, 2))
        axis = Fraction(0)
        inter = Fraction(0)
        var = Fraction(0)
        for m in S:
            for n in S:
                d = math.gcd(m, n)
                axis += Fraction(2 * (m - 1) * (n - 1) * (d * d - 1), 16 * m * m * n * n)
                inter += Fraction((d * d - 1) ** 2, 16 * m * m * n * n)
                var += Fraction((d * d - 1) * (2 * (m - 1) * (n - 1) + d * d - 1), 16 * m * m * n * n)
        assert (axis + inter) * L * L == var * L * L and axis + inter == var, \
            "parseval split at L=%d: %r + %r != %r" % (L, axis, inter, var)
    print("variance splits exactly into axis and interior spectral blocks, L = 2..8")

    A = 1501
    sig2 = [0] * (A + 1)
    for d in range(1, A + 1, 2):
        for mult in range(d, A + 1, 2 * d):
            sig2[mult] += d * d
    for w, use_sq, tol in ((3.0, False, 2e-3), (3.5, True, 2e-3)):
        brute = 0.0
        for a in range(1, A + 1, 2):
            for b in range(1, A + 1, 2):
                g = math.gcd(a, b)
                v = sig2[g]
                if use_sq:
                    v *= sig2[g]
                brute += v / float(a * b) ** w
        if not use_sq:
            closed = lam(w) ** 2 * lam(2 * w - 2)
        else:
            closed = lam(w) ** 2 * lam(2 * w - 2) ** 2 * lam(2 * w - 4) / lam(4 * w - 4)
        assert abs(brute / closed - 1) < tol, \
            "zeta quotient w=%r sq=%r: %r vs %r" % (w, use_sq, brute, closed)
    print("zeta quotients: sigma_2 and sigma_2^2 gcd sums match the lambda products at w = 3, 3.5")

    s = 3.0
    w = 2.0
    brute = 0.0
    for a in range(1, A + 1, 2):
        for b in range(1, A + 1, 2):
            g = math.gcd(a, b)
            sd = 0.0
            d = 1
            while d * d <= g:
                if g % d == 0:
                    sd += d ** (2 - s)
                    if d * d != g:
                        sd += (g // d) ** (2 - s)
                d += 2
            brute += sd / float(a * b) ** w
    closed = lam(w) ** 2 * lam(2 * w + s - 2)
    assert abs(brute / closed - 1) < 2e-3, "weighted stack: %r vs %r" % (brute, closed)
    print("weighted stack at s=3: sigma_{-1} gcd sum matches lambda(w)^2 lambda(2w+1)")

    print("all green")


if __name__ == "__main__":
    main()
