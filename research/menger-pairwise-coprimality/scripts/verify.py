# MENGER

import cmath
from decimal import Decimal, getcontext
from fractions import Fraction
from itertools import product
from math import comb, factorial, gcd, log

getcontext().prec = 100

DESIGN = [v for v in product(range(3), repeat=3) if sum(d == 1 for d in v) <= 1]
CENSUS = [0, 60, 1434, 32268, 721524, 15141288]
MENGER = 0.251620868451255
FULL = 0.286747428434479
FULL_DECIMALS = "0.286747428434478734107892712789"
MENGER_DECIMALS = "0.251620868451255089179675855473"

def fibre(coords):
    best = 0
    for w in product(range(3), repeat=len(coords)):
        best = max(best, sum(1 for v in DESIGN if tuple(v[i] for i in coords) == w))
    return best

def points(level):
    pts = [(0, 0, 0)]
    for _ in range(level):
        pts = [(3 * x + a, 3 * y + b, 3 * z + c) for (x, y, z) in pts for (a, b, c) in DESIGN]
    return pts

def split(level):
    low = level // 2
    return points(low), points(level - low), 3 ** low

def census(level):
    lows, highs, shift = split(level)
    total = 0
    for hx, hy, hz in highs:
        bx, by, bz = hx * shift, hy * shift, hz * shift
        for lx, ly, lz in lows:
            x = bx + lx
            y = by + ly
            if gcd(x, y) != 1:
                continue
            z = bz + lz
            if gcd(x, z) == 1 and gcd(y, z) == 1:
                total += 1
    return total

def base_census(level):
    lows, highs, shift = split(level)
    total = 0
    for hx, hy, hz in highs:
        bx, by, bz = hx * shift, hy * shift, hz * shift
        for lx, ly, lz in lows:
            zeros = ((bx + lx) % 3 == 0) + ((by + ly) % 3 == 0) + ((bz + lz) % 3 == 0)
            if zeros <= 1:
                total += 1
    return total

def parity_census(level):
    lows, highs, shift = split(level)
    total = 0
    for hx, hy, hz in highs:
        bx, by, bz = hx * shift, hy * shift, hz * shift
        for lx, ly, lz in lows:
            odd = ((bx + lx) & 1) + ((by + ly) & 1) + ((bz + lz) & 1)
            if odd >= 2:
                total += 1
    return total

def parity_transfer(level):
    state = {(0, 0, 0): Fraction(1)}
    for _ in range(level):
        nxt = {}
        for s, w in state.items():
            for v in DESIGN:
                t = tuple((s[i] + (v[i] == 1)) % 2 for i in range(3))
                nxt[t] = nxt.get(t, Fraction(0)) + w * Fraction(1, 20)
        state = nxt
    return sum(w for s, w in state.items() if sum(s) >= 2)

def parity_closed(level):
    return Fraction(1, 2) - Fraction(3, 4) * Fraction(3, 5) ** level + Fraction(1, 4) * Fraction(-1, 5) ** level

def primes_to(limit):
    sieve = bytearray([1]) * (limit + 1)
    sieve[0:2] = b"\x00\x00"
    for i in range(2, int(limit ** 0.5) + 1):
        if sieve[i]:
            sieve[i * i::i] = bytearray(len(range(i * i, limit + 1, i)))
    return [i for i in range(2, limit + 1) if sieve[i]]

def euler(primes, skip):
    out = 1.0
    for p in primes:
        if p != skip:
            out *= 1.0 - 3.0 / p ** 2 + 2.0 / p ** 3
    return out

def bernoulli(kmax):
    out = [Fraction(0)] * (kmax + 1)
    out[0] = Fraction(1)
    for m in range(1, kmax + 1):
        out[m] = -sum(comb(m + 1, j) * out[j] for j in range(m)) / (m + 1)
    return out

BERNOULLI = bernoulli(32)

def decimalise(fr):
    return Decimal(fr.numerator) / Decimal(fr.denominator)

def zeta(n, cut=100, terms=15):
    total = sum(Decimal(1) / Decimal(j) ** n for j in range(1, cut))
    total += Decimal(cut) ** (1 - n) / Decimal(n - 1)
    total += Decimal(1) / (Decimal(2) * Decimal(cut) ** n)
    for k in range(1, terms + 1):
        rising = 1
        for i in range(2 * k - 1):
            rising *= n + i
        total += decimalise(BERNOULLI[2 * k] * Fraction(rising, factorial(2 * k))) * Decimal(cut) ** (1 - n - 2 * k)
    return total

ZETA = {}

def zeta_at(n):
    if n not in ZETA:
        ZETA[n] = zeta(n)
    return ZETA[n]

def mobius(limit):
    mu = [1] * (limit + 1)
    for p in primes_to(limit):
        for m in range(p, limit + 1, p):
            mu[m] = -mu[m]
        for m in range(p * p, limit + 1, p * p):
            mu[m] = 0
    return mu

def prime_zeta(n, top, mu):
    total = Decimal(0)
    k = 1
    while k * n <= top:
        if mu[k]:
            total += Decimal(mu[k]) / Decimal(k) * zeta_at(k * n).ln()
        k += 1
    return total

def constant(bound, nmax, top):
    small = primes_to(bound)
    mu = mobius(top)
    total = Decimal(0)
    for p in small:
        x = Decimal(1) / Decimal(p)
        total += ((1 - x) ** 2 * (1 + 2 * x)).ln()
    for n in range(2, nmax + 1):
        weight = Fraction(-2 + (-1) ** (n + 1) * 2 ** n, n)
        tail = prime_zeta(n, top, mu) - sum(Decimal(1) / Decimal(p) ** n for p in small)
        total += decimalise(weight) * tail
    return total.exp()

def multiplier(p, t):
    total = sum(cmath.exp(2j * cmath.pi * sum(t[i] * v[i] for i in range(3)) / p) for v in DESIGN)
    return abs(total) / 20.0

def order_of_three(p):
    k, r = 1, 3 % p
    while r != 1:
        r = (r * 3) % p
        k += 1
    return k

def contraction(p):
    d = order_of_three(p)
    best = 0.0
    for t in product(range(p), repeat=3):
        if not any(t):
            continue
        run = 1.0
        u = t
        for _ in range(d):
            run *= multiplier(p, u)
            u = tuple((3 * x) % p for x in u)
        best = max(best, run ** (1.0 / d))
    return best

def main():
    got = len(DESIGN)
    assert got == 20, f"design size: got {got}, want 20"
    got = sum(1 for v in DESIGN if sum(d == 0 for d in v) <= 1)
    assert got == 13, f"vectors with at most one zero: got {got}, want 13"
    print(f"design: {len(DESIGN)} vectors, {got} of them with at most one zero")
    for pair in [(0, 1), (0, 2), (1, 2)]:
        got = fibre(pair)
        assert got == 3, f"pair fibre {pair}: got {got}, want 3"
    for i in range(3):
        got = fibre((i,))
        assert got == 8, f"single fibre {i}: got {got}, want 8"
    alpha = log(20 / 3) / log(3)
    single = log(20 / 8) / log(3)
    assert alpha > 1.0, f"pair exponent: got {alpha}, want above 1"
    assert single < 1.0, f"single exponent: got {single}, want below 1"
    print(f"fibres: pair 3 giving exponent {alpha:.6f}, single 8 giving exponent {single:.6f}")

    for level in range(1, 7):
        got = census(level)
        want = CENSUS[level - 1]
        assert got == want, f"census level {level}: got {got}, want {want}"
        print(f"level {level}: {got} pairwise-coprime points of {20 ** level}, density {got / 20 ** level:.9f}")

    for level in range(1, 6):
        got = Fraction(base_census(level), 20 ** level)
        want = Fraction(13, 20)
        assert got == want, f"base factor at level {level}: got {got}, want {want}"
    print("base prime: no coordinate pair divisible by 3 for exactly 13/20 of every level up to 5")

    for level in range(5):
        got = Fraction(parity_census(level), 20 ** level)
        want = parity_closed(level)
        assert got == want, f"parity census level {level}: got {got}, want {want}"
    for level in range(41):
        got = parity_transfer(level)
        want = parity_closed(level)
        assert got == want, f"parity transfer level {level}: got {got}, want {want}"
    print(f"bias at two: closed form exact to level 40, level 5 value {float(parity_closed(5)):.6f}")

    high = constant(100, 60, 340)
    got = str(high)[:32]
    assert got == FULL_DECIMALS, f"full constant to thirty decimals: got {got}, want {FULL_DECIMALS}"
    sponge = high * Decimal(351) / Decimal(400)
    got = str(sponge)[:32]
    assert got == MENGER_DECIMALS, f"sponge constant to thirty decimals: got {got}, want {MENGER_DECIMALS}"
    again = constant(200, 45, 300)
    gap = abs(high - again)
    assert gap < Decimal(10) ** -60, f"two truncation settings: got gap {gap}, want below 1e-60"
    print(f"high precision: full {str(high)[:32]}, sponge {str(sponge)[:32]}, settings agree to {gap:.3e}")

    primes = primes_to(10 ** 6)
    got = euler(primes, None)
    assert abs(got - FULL) < 1e-6, f"truncated full product: got {got}, want {FULL} within 1e-6"
    got = 0.65 * euler(primes, 3)
    assert abs(got - MENGER) < 1e-6, f"truncated sponge product: got {got}, want {MENGER} within 1e-6"
    print(f"products to 1e6: full {euler(primes, None):.9f}, sponge {got:.9f}")

    local = Fraction(1) - 3 * Fraction(1, 9) + 2 * Fraction(1, 27)
    assert local == Fraction(20, 27), f"local factor at 3: got {local}, want 20/27"
    ratio = Fraction(13, 20) / local
    assert ratio == Fraction(351, 400), f"ratio: got {ratio}, want 351/400"
    loss = Fraction(1) - ratio
    assert loss == Fraction(49, 400), f"loss: got {loss}, want 49/400"
    print(f"exact rationals: 20/27, {ratio}, {loss} = {float(loss) * 100:.2f} percent")

    for p in [2, 5, 7, 11, 13, 17, 19]:
        got = contraction(p)
        assert got <= 0.6 + 1e-9, f"contraction at {p}: got {got}, want at most 3/5"
        if p == 2:
            assert abs(got - 0.6) < 1e-9, f"contraction at 2: got {got}, want 3/5"
        print(f"contraction at {p}: {got:.6f}")

    print("all green")

if __name__ == "__main__":
    main()
