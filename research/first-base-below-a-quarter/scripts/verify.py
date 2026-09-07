import math
import time
from array import array
from operator import mul

# TRANSFORM

def factors(q, a0, ts):
    inv = 1.0 / (q - 1)
    c = 2 * a0 - q + 1
    sin = math.sin
    cos = math.cos
    sqrt = math.sqrt
    pi = math.pi
    out = []
    for t in ts:
        d = sin(pi * q * t) / sin(pi * t)
        e = d * d - 2.0 * d * cos(pi * c * t) + 1.0
        out.append(sqrt(e) * inv if e > 0.0 else 0.0)
    return out

def direct(q, a0, t):
    re = 0.0
    im = 0.0
    for a in range(q):
        if a != a0:
            re += math.cos(2.0 * math.pi * a * t)
            im += math.sin(2.0 * math.pi * a * t)
    return math.hypot(re, im) / (q - 1)

def closed_form(pts=1500):
    worst = 0.0
    for q, a0 in ((7, 0), (10, 5), (21, 0), (21, 10), (34, 16)):
        ts = [(j + 0.37) / pts for j in range(pts)]
        for t, v in zip(ts, factors(q, a0, ts)):
            worst = max(worst, abs(v - direct(q, a0, t)))
    assert worst < 1e-11, f"closed form off by {worst}"
    print(f"closed form against the character sum, five sets, {pts} arguments each: worst gap {worst:.2e}")

def one_digit_sum():
    for q in range(3, 40):
        for a0 in range((q + 1) // 2):
            ts = [a / q for a in range(1, q)]
            total = 1.0 + sum(factors(q, a0, ts))
            assert abs(total - 2.0) < 1e-9, f"one-digit sum {total} at base {q} digit {a0}"
    print("one-digit grid sum equals 2 exactly, every base 3 to 39 and every distinct digit")

def domination(pts=4000):
    slack = 0.0
    for q in (3, 10, 21, 34, 126, 200):
        ts = [(j + 0.5) / pts for j in range(pts)]
        cap = [min(1.0, (abs(math.sin(math.pi * q * t) / math.sin(math.pi * t)) + 1.0) / (q - 1)) for t in ts]
        for a0 in range((q + 1) // 2):
            for v, u in zip(factors(q, a0, ts), cap):
                assert v <= u + 1e-12, f"domination fails at base {q} digit {a0}"
                slack = max(slack, u - v)
    print(f"domination holds on 6 bases, every distinct digit, {pts} arguments: widest slack {slack:.4f}")

# WINDOW MACHINE

def weights(q, a0, nd, m, guard=1e-12):
    W = q ** nd
    c = 2 * a0 - q + 1
    inv = 1.0 / (q - 1)
    lip = 2.0 * math.pi * (q * (q - 1) // 2 - a0) * inv
    slack = lip / (2.0 * W * m) + guard
    hi = array("d", bytes(8 * W))
    lo = array("d", bytes(8 * W))
    step = 1.0 / (W * m)
    sin = math.sin
    cos = math.cos
    sqrt = math.sqrt
    pi = math.pi
    for w in range((W + 1) // 2):
        top = 0.0
        bot = 2.0
        base = w * m
        for r in range(m):
            t = (base + r + 0.5) * step
            d = sin(pi * q * t) / sin(pi * t)
            e = d * d - 2.0 * d * cos(pi * c * t) + 1.0
            v = sqrt(e) * inv if e > 0.0 else 0.0
            if v > top:
                top = v
            if v < bot:
                bot = v
        u = top + slack
        u = u if u < 1.0 else 1.0
        b = bot - slack
        b = b if b > 0.0 else 0.0
        hi[w] = u
        lo[w] = b
        hi[W - 1 - w] = u
        lo[W - 1 - w] = b
    return hi, lo, slack

def iterate(G, q, nd, seed, steps):
    S = q ** (nd - 1)
    P = q ** (nd - 2)
    y = list(seed) if seed else [1.0] * S
    lam = 0.0
    for _ in range(steps):
        z = [sum(map(mul, G[v * q:v * q + q], y[(v % P) * q:(v % P) * q + q])) for v in range(S)]
        top = max(z)
        if top <= 0.0:
            return 0.0, y
        y = [x / top for x in z]
        lam = top
    return lam, y

def lift(y, q):
    return [y[v // q] for v in range(len(y) * q)]

def cw_up(G, y, q, nd):
    S = q ** (nd - 1)
    P = q ** (nd - 2)
    best = 0.0
    for v in range(S):
        b = (v % P) * q
        r = sum(map(mul, G[v * q:v * q + q], y[b:b + q])) / y[v]
        if r > best:
            best = r
    return best

def cw_low(G, y, q, nd):
    S = q ** (nd - 1)
    P = q ** (nd - 2)
    best = 0.0
    for tau in (0.0, 1e-13, 1e-9, 1e-5, 1e-3):
        low = float("inf")
        seen = 0
        for v in range(S):
            if y[v] <= tau:
                continue
            b = (v % P) * q
            acc = 0.0
            for c in range(q):
                if y[b + c] > tau:
                    acc += G[v * q + c] * y[b + c]
            r = acc / y[v]
            if r < low:
                low = r
            seen += 1
        if seen and low > best:
            best = low
    return best

def climb(q, a0, nd, m, side):
    start = min(nd, 3)
    pair = weights(q, a0, start, m)
    G = pair[0] if side else pair[1]
    _, y = iterate(G, q, start, None, 300)
    for level in range(start + 1, nd + 1):
        pair = weights(q, a0, level, m)
        G = pair[0] if side else pair[1]
        _, y = iterate(G, q, level, lift(y, q), 30)
    return G, y

def upper(q, a0, nd, m):
    G, y = climb(q, a0, nd, m, True)
    return math.log(cw_up(G, y, q, nd)) / math.log(q)

def lower(q, a0, nd, m):
    G, y = climb(q, a0, nd, m, False)
    mu = cw_low(G, y, q, nd)
    return None if mu <= 0.0 else math.log(mu) / math.log(q)

# THE LADDER

def below_the_floor():
    t0 = time.time()
    lanes = 0
    worst = (1.0, None)
    used = {}
    for q in range(3, 21):
        for a0 in range((q + 1) // 2):
            got = None
            for nd in (2, 3, 4):
                e = lower(q, a0, nd, 8)
                if e is not None and e > 0.2502:
                    got = (e, nd)
                    break
            assert got, f"no lower bound above a quarter at base {q} digit {a0}"
            used[got[1]] = used.get(got[1], 0) + 1
            lanes += 1
            if got[0] < worst[0]:
                worst = (got[0], (q, a0, got[1]))
    q, a0, nd = worst[1]
    print(f"every one of the {lanes} distinct sets of every base 3 to 20 certifies alpha_1 > 1/4")
    print(f"  windows used: {used}; tightest base {q} digit {a0} at {nd} window digits, alpha_1 > {math.floor(worst[0] * 1e7) / 1e7:.7f}")
    print(f"  {time.time() - t0:.1f}s")

def the_first_base():
    t0 = time.time()
    four = (lower(21, 0, 4, 8), upper(21, 0, 4, 8))
    assert four[0] < 0.25 < four[1], "four window digits should not decide base 21"
    five = upper(21, 0, 5, 2)
    assert five < 0.25, f"base 21 digit 0 reads {five} at five window digits"
    print(f"base 21 missing 0: four window digits give [{math.floor(four[0] * 1e7) / 1e7:.7f}, {math.ceil(four[1] * 1e7) / 1e7:.7f}], undecided")
    print(f"  five window digits give alpha_1 < {math.ceil(five * 1e7) / 1e7:.7f}, clearing 1/4 by {0.25 - five:.2e}")
    print(f"  {time.time() - t0:.1f}s")

WITNESS = ((21, 9), (22, 10), (23, 7), (24, 11), (25, 11), (26, 8), (27, 12), (28, 13), (29, 9), (30, 14), (31, 14), (32, 10), (33, 15))

def the_family_floor():
    t0 = time.time()
    print("every base 21 to 33 carries an excluded digit with alpha_1 > 1/4, one witness each")
    for q, a0 in WITNESS:
        nd = 4 if q == 33 else 3
        e = lower(q, a0, nd, 8)
        assert e is not None and e > 0.25, f"the witness digit {a0} of base {q} reads {e}"
        print(f"  base {q} missing {a0}: alpha_1 > {math.floor(e * 1e7) / 1e7:.7f} at {nd} window digits")
    tall = (0.0, None)
    for a0 in range(17):
        e = upper(34, a0, 3, 8)
        nd = 3
        if e >= 0.25:
            e = upper(34, a0, 4, 2)
            nd = 4
        assert e < 0.25, f"base 34 digit {a0} reads {e}"
        print(f"  base 34 missing {a0}: alpha_1 < {math.ceil(e * 1e7) / 1e7:.7f} at {nd} window digits")
        if e > tall[0]:
            tall = (e, (a0, nd))
    a0, nd = tall[1]
    print(f"all 17 distinct sets of base 34 certify alpha_1 < 1/4, the largest bound at digit {a0} and {nd} window digits, alpha_1 < {math.ceil(tall[0] * 1e7) / 1e7:.7f}")
    print(f"  {time.time() - t0:.1f}s")

def the_calibration():
    t0 = time.time()
    lo = lower(10, 5, 5, 8)
    hi = upper(10, 5, 5, 8)
    assert lo is not None and hi < 27.0 / 77.0, f"base 10 missing 5 reads [{lo}, {hi}]"
    print(f"base 10 missing 5 at five window digits: alpha_1 in [{math.floor(lo * 1e7) / 1e7:.7f}, {math.ceil(hi * 1e7) / 1e7:.7f}], under 27/77 = {27 / 77:.7f}")
    print(f"  {time.time() - t0:.1f}s")

# THE LEBESGUE CONSTANT

GAMMA = 0.5772156649015328606
C1 = 2.0 / math.pi
C0 = 0.98

def lebesgue(M):
    n = (M + 1) // 2
    total = 2.0 * sum(1.0 / math.sin((2 * j + 1) * math.pi / (2 * M)) for j in range(n))
    return total - (M % 2)

def lebesgue_scan(offsets=97):
    top = 0.0
    for M in list(range(2, 200)) + [256, 400, 1000, 2048, 4096]:
        best = 0.0
        for k in range(1, offsets + 1):
            th = k / (2.0 * offsets)
            s = abs(math.sin(math.pi * th))
            acc = 0.0
            for j in range(M):
                d = (j + th) / M
                d = min(d, 1.0 - d) if d <= 1.0 else d
                acc += 1.0 / math.sin(math.pi * min(d, 1.0 - d))
            best = max(best, s * acc)
        exact = lebesgue(M)
        assert best <= exact + 1e-9, f"the half offset is not the maximum at M = {M}"
        cap = M * (C1 * math.log(M) + GAMMA * C1 + C1 * math.log(8.0 / math.pi)) + 2.0 / math.pi
        assert exact <= cap, f"Lebesgue bound fails at M = {M}"
        if M >= 100:
            top = max(top, (exact / M - C1 * math.log(M)))
    assert top < C0, f"the uniform constant {top} does not sit under {C0}"
    print(f"Lebesgue constant: the half offset maximises at every M scanned, and L_M/M - (2/pi) log M <= {top:.7f} < {C0} for M >= 100")

# THE THRESHOLD

def margin(q, c0=C0):
    w = q ** 0.25 * (1.0 - 1.0 / q)
    return (w - 1.0) ** 3 - C1 * math.log(q) * w - c0 * (w - 1.0)

def root(q, c0=C0):
    lo, hi = 1.0 + 1e-15, 64.0
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        if (mid - 1.0) ** 3 - C1 * math.log(q) * mid - c0 * (mid - 1.0) < 0.0:
            lo = mid
        else:
            hi = mid
    return hi

def threshold():
    assert margin(125) < 0.0, "the certificate should fail at 125"
    thin = (1.0, None)
    for q in range(126, 3000):
        m = margin(q)
        assert m > 0.0, f"the certificate fails at {q}"
        if m < thin[0]:
            thin = (m, q)
    for q in (211, 500, 3000, 10 ** 6, 10 ** 12):
        cap = 1.0 + math.sqrt(2.0 * C1 * math.log(q) + C0)
        assert cap < q ** 0.25 * (1.0 - 1.0 / q), f"the closed-form cap fails at {q}"
    print(f"threshold: the certificate fails at 125 and holds on [126, 3000), tightest margin {thin[0]:.3e} at q = {thin[1]}")
    for q in (126, 200, 1000, 10 ** 6):
        e = math.log(root(q) * q / (q - 1.0)) / math.log(q)
        assert e < 0.25 or q < 126, "the exponent bound should clear a quarter"
        print(f"  q = {q}: alpha_1 < {math.ceil(e * 1e6) / 1e6:.6f}")
    assert abs(GAMMA * C1 + C1 * math.log(8.0 / math.pi) - 0.9625228) < 1e-7

# VERIFY

def main():
    t0 = time.time()
    closed_form()
    one_digit_sum()
    domination()
    lebesgue_scan()
    threshold()
    below_the_floor()
    the_first_base()
    the_family_floor()
    the_calibration()
    print(f"first-base-below-a-quarter: every check green in {time.time() - t0:.1f}s")

if __name__ == "__main__":
    main()
