import sys
from fractions import Fraction
from math import factorial, gcd
from collections import Counter

sys.set_int_max_str_digits(1000000)

# ANALYTIC COUNTING - THE UNIVERSE WITHOUT ENUMERATION

def _mobius(n):
    x = n
    mu = 1
    p = 2
    while p * p <= x:
        if x % p == 0:
            x //= p
            if x % p == 0:
                return 0
            mu = -mu
        p += 1
    if x > 1:
        mu = -mu
    return mu

def _divisors(n):
    return [d for d in range(1, n + 1) if n % d == 0]

def _pos_block_cycles(length):
    out = Counter()
    for period in _divisors(length):
        strings = sum(_mobius(period // d) * 2 ** d for d in _divisors(period))
        out[period] += strings // period
    return out

def _neg_block_cycles(length):
    def step(x):
        bits = [(x >> i) & 1 for i in range(length)]
        new = [bits[(i - 1) % length] for i in range(length)]
        new[0] ^= 1
        return sum(new[i] << i for i in range(length))
    seen = [False] * (2 ** length)
    out = Counter()
    for start in range(2 ** length):
        if seen[start]:
            continue
        run = 0
        j = start
        while not seen[j]:
            seen[j] = True
            j = step(j)
            run += 1
        out[run] += 1
    return out

def _combine(c1, c2):
    out = Counter()
    for l1, n1 in c1.items():
        for l2, n2 in c2.items():
            g = gcd(l1, l2)
            out[l1 * l2 // g] += n1 * n2 * g
    return out

def _class_cycles(pos, neg):
    blocks = [_pos_block_cycles(L) for L in pos] + [_neg_block_cycles(L) for L in neg]
    if not blocks:
        return 1
    acc = blocks[0]
    for b in blocks[1:]:
        acc = _combine(acc, b)
    return sum(acc.values())

def _partitions(n, m=None):
    if m is None:
        m = n
    if n == 0:
        yield ()
        return
    for k in range(min(n, m), 0, -1):
        for rest in _partitions(n - k, k):
            yield (k,) + rest

def _bipartitions(dimension):
    for s in range(dimension + 1):
        for pos in (_partitions(s) if s > 0 else [()]):
            for neg in (_partitions(dimension - s) if (dimension - s) > 0 else [()]):
                yield pos, neg

def _class_size(pos, neg, dimension):
    centralizer = 1
    for part in (pos, neg):
        for length, mult in Counter(part).items():
            centralizer *= factorial(mult) * ((2 * length) ** mult)
    return (2 ** dimension * factorial(dimension)) // centralizer

def total_designs(dimension):
    return 2 ** (2 ** dimension)

def distinct_designs(dimension):
    total = Fraction(0)
    order = 2 ** dimension * factorial(dimension)
    checked = 0
    for pos, neg in _bipartitions(dimension):
        size = _class_size(pos, neg, dimension)
        checked += size
        total += size * (2 ** _class_cycles(pos, neg))
    if checked != order:
        raise ValueError("class sizes do not sum to the group order.")
    if total.denominator != 1:
        raise ValueError("Burnside average is not an integer.")
    return int(total // order)

def sequence(max_dimension):
    return [distinct_designs(d) for d in range(1, max_dimension + 1)]
