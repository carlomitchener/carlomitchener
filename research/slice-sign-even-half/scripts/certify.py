import sys
import time
from fractions import Fraction
from math import factorial, isqrt

# ROUNDING

PREC = 192

TOL = 1e-52

def _scale(x):
    return PREC - (abs(x.numerator).bit_length() - x.denominator.bit_length())

def down(x):
    if x == 0:
        return Fraction(0)
    e = _scale(x)
    if e >= 0:
        return Fraction((x.numerator << e) // x.denominator, 1 << e)
    return Fraction((x.numerator // (x.denominator << -e)) << -e)

def up(x):
    return -down(-x)

# INTERVALS

def num(x):
    f = Fraction(x)
    return (down(f), up(f))

ZERO = (Fraction(0), Fraction(0))

ONE = (Fraction(1), Fraction(1))

def lo(a):
    return a[0]

def hi(a):
    return a[1]

def iadd(a, b):
    return (down(a[0] + b[0]), up(a[1] + b[1]))

def isub(a, b):
    return (down(a[0] - b[1]), up(a[1] - b[0]))

def ineg(a):
    return (-a[1], -a[0])

def imul(a, b):
    c = (a[0] * b[0], a[0] * b[1], a[1] * b[0], a[1] * b[1])
    return (down(min(c)), up(max(c)))

def idiv(a, b):
    assert b[0] > 0 or b[1] < 0, "interval division straddles zero"
    c = (a[0] / b[0], a[0] / b[1], a[1] / b[0], a[1] / b[1])
    return (down(min(c)), up(max(c)))

def _rpow(x, n, rnd):
    r = Fraction(1)
    b = x
    while n:
        if n & 1:
            r = rnd(r * b)
        n >>= 1
        if n:
            b = rnd(b * b)
    return r

def ipow(a, n):
    assert a[0] >= 0, "interval power needs a nonnegative base"
    return (_rpow(a[0], n, down), _rpow(a[1], n, up))

def amax(a):
    return max(abs(a[0]), abs(a[1]))

def relwidth(a):
    m = amax(a)
    assert m > 0, "relative width of an interval containing only zero"
    return float((a[1] - a[0]) / m)

def below(a, b):
    return a[1] < b[0]

# SQUARE ROOTS

def isqrt_interval(m):
    r = isqrt(m << (2 * PREC))
    return (Fraction(r, 1 << PREC), Fraction(r + 1, 1 << PREC))

SQRT2 = isqrt_interval(2)

SQRT3 = isqrt_interval(3)

# PI BY MACHIN

def _arctan_reciprocal(n, terms):
    s = Fraction(0)
    p = Fraction(1, n)
    sq = Fraction(1, n * n)
    for k in range(terms):
        t = p / (2 * k + 1)
        s = s + t if k % 2 == 0 else s - t
        p *= sq
    e = p / (2 * terms + 1)
    return (down(s - e), up(s + e))

PI = isub(imul(num(16), _arctan_reciprocal(5, 80)),
          imul(num(4), _arctan_reciprocal(239, 32)))

PI2 = imul(PI, PI)

# LOGARITHM OF TWO

def _log_two():
    z = Fraction(1, 3)
    terms = 130
    s = Fraction(0)
    p = z
    sq = z * z
    for k in range(terms):
        s += p / (2 * k + 1)
        p *= sq
    e = p / ((2 * terms + 1) * (1 - sq))
    return (down(2 * (s)), up(2 * (s + e)))

LOG2 = _log_two()

# SERIES

def _cos_order(a):
    x = float(a)
    n = 1
    t = x * x / 2.0
    while t > TOL and n < 200:
        n += 1
        t = t * x * x / ((2 * n - 1) * (2 * n))
    return n + 2

def iversin(t):
    a = amax(t)
    n = _cos_order(a)
    assert a * a <= (2 * n + 3) * (2 * n + 4), "versine tail is not decreasing"
    tt = imul(t, t)
    p = ONE
    s = ZERO
    for k in range(1, n + 1):
        p = imul(p, tt)
        term = idiv(p, num(factorial(2 * k)))
        s = iadd(s, term) if k % 2 else isub(s, term)
    p = imul(p, tt)
    e = hi(idiv(p, num(factorial(2 * n + 2))))
    assert e >= 0, "versine tail bound went negative"
    return iadd(s, (-e, e))

def icos_grid(j, m):
    j %= m
    if 2 * j > m:
        j = m - j
    if j == 0:
        return ONE
    return isub(ONE, iversin(imul(PI, num(Fraction(2 * j, m)))))

def _geom_order(a):
    x = float(a)
    if x <= 0:
        return 1
    n = 1
    t = x
    while t > TOL and n < 400:
        n += 1
        t *= x
    return n + 2

def ilog1p(p):
    a = amax(p)
    assert a < Fraction(1, 2), "log1p outside the reduced window"
    if a == 0:
        return ZERO
    n = _geom_order(a)
    q = ONE
    s = ZERO
    for k in range(1, n + 1):
        q = imul(q, p)
        term = idiv(q, num(k))
        s = iadd(s, term) if k % 2 else isub(s, term)
    e = up(_rpow(a, n + 1, up) / ((n + 1) * (1 - a)))
    return iadd(s, (-e, e))

def ilog(x):
    assert x[0] > 0, "logarithm of a nonpositive interval"
    m = 0
    while x[0] < Fraction(2, 3):
        x = imul(x, num(2))
        m -= 1
    while x[1] > Fraction(4, 3):
        x = imul(x, num(Fraction(1, 2)))
        m += 1
    return iadd(ilog1p(isub(x, ONE)), imul(num(m), LOG2))

def _exp_order(a):
    x = float(a)
    n = 1
    t = x
    while t > TOL and n < 400:
        n += 1
        t = t * x / n
    return n + 4

def iexp(x):
    assert x[0] >= 0 and x[1] < 30, "exponential outside the certified window"
    n = _exp_order(amax(x))
    assert x[1] < n, "exponential tail is not geometric"
    p = ONE
    s = ONE
    for k in range(1, n + 1):
        p = idiv(imul(p, x), num(k))
        s = iadd(s, p)
    step = idiv(imul(p, x), num(n + 1))
    e = hi(idiv(step, isub(ONE, idiv(x, num(n + 2)))))
    assert e >= 0, "exponential tail bound went negative"
    return iadd(s, (Fraction(0), e))

# BASE THREE SPECTRUM

TAIL_LEVEL = 20

def _versin_grid_three(kind, i):
    return iversin(imul(PI, num(Fraction(kind, 3 ** i))))

ALPHA = {}

BETA = {}

for _i in range(2, TAIL_LEVEL + 1):
    ALPHA[_i] = imul(num(2), _versin_grid_three(1, _i))
    BETA[_i] = imul(num(2), _versin_grid_three(2, _i))

def ell(i):
    a = ilog1p(ineg(idiv(ALPHA[i], num(2))))
    b = ilog1p(ineg(idiv(BETA[i], num(2))))
    return isub(a, b)

VERS_TOP = iversin(imul(PI, num(Fraction(2, 9))))

LOG_GUARD = idiv(ONE, isub(ONE, VERS_TOP))

ELL_COEFF = imul(imul(num(2), PI2), LOG_GUARD)

def _tail_ell(n):
    assert n >= 1, "the ell tail bound needs level at least one"
    return (Fraction(0), hi(imul(ELL_COEFF, num(Fraction(1, 8 * 9 ** n)))))

def _log_r():
    s = ZERO
    for i in range(2, TAIL_LEVEL + 1):
        s = iadd(s, ell(i))
    return iadd(s, _tail_ell(TAIL_LEVEL))

LOGR = _log_r()

S_GUARD = idiv(ONE, isub(ONE, idiv(imul(num(2), VERS_TOP), num(40))))

S_COEFF = imul(PI2, iadd(ONE, imul(num(4), S_GUARD)))

def _tail_s(D, n):
    assert n >= 1, "the s tail bound needs level at least one"
    assert D >= 38, "the s tail guard assumes D at least 38"
    piece = idiv(S_COEFF, num(D - 2))
    return (Fraction(0), hi(imul(piece, num(Fraction(1, 8 * 9 ** n)))))

def s_of(D):
    s = ZERO
    for i in range(2, TAIL_LEVEL + 1):
        p = idiv(ALPHA[i], num(D - 2))
        q = idiv(BETA[i], num(D + 2))
        s = iadd(s, isub(ilog1p(p), ilog1p(ineg(q))))
    return iadd(s, _tail_s(D, TAIL_LEVEL))

def a_of(D):
    return ilog1p(num(Fraction(4, D - 2)))

def k_star(D):
    return idiv(iadd(imul(num(D - 1), LOGR), s_of(D)), a_of(D))

def k_one(D):
    top = hi(iadd(imul(num(D - 1), LOGR), s_of(D)))
    bot = lo(a_of(D))
    q = top / bot
    assert abs(q - round(q)) > Fraction(1, 10 ** 12), "K1 sits on an integer boundary at D=%d" % D
    return int(q) + 2

# THE ENVELOPE

C_PI = num(Fraction(7528157, 10 ** 7))

C_ZERO = num(Fraction(7052518, 10 ** 7))

C_TWO = num(Fraction(2266816, 10 ** 7))

C_SUB = num(Fraction(8900159, 10 ** 7))

def envelope(D, K):
    sigma = iexp(imul(num(2 * (K + 1)), ipow(C_SUB, D - 1)))
    head = imul(num(4 * (K - 1)), iadd(ipow(C_PI, D - 1), ipow(C_ZERO, D - 1)))
    body = iadd(head, imul(num(2), ipow(C_TWO, D - 1)))
    return imul(body, sigma)

def delta_of(D, K):
    t = imul(PI, num(Fraction(D - 2, 3 ** (K + 1))))
    return (Fraction(0), hi(idiv(imul(t, t), num(2))))

# CHECK THE FREQUENCY SEPARATION AT BASE FIVE

def g_five_small(i):
    a = iversin(imul(PI, num(Fraction(2, 5 ** i))))
    b = iversin(imul(PI, num(Fraction(4, 5 ** i))))
    return isub(num(4), imul(num(2), iadd(a, b)))

def g_five_grid(n, m):
    return imul(num(2), iadd(icos_grid(n, m), icos_grid(2 * n, m)))

def c_factor(j):
    a = imul(num(5), PI2)
    x = idiv(a, num(24 * 25 ** j))
    assert x[1] < 1, "the C_j product bound diverges at j=%d" % j
    return idiv(ONE, isub(ONE, x))

def check_sep5():
    g2 = g_five_small(2)
    g3 = g_five_small(3)
    assert lo(g2) >= Fraction(36897796, 10 ** 7), "ghat_2 fell below its stated bound"
    c2 = c_factor(2)
    c3 = c_factor(3)
    assert hi(c2) <= Fraction(10033008, 10 ** 7), "C_2 above its stated bound"
    assert hi(c3) <= Fraction(10001317, 10 ** 7), "C_3 above its stated bound"
    worst = ZERO
    count = 0
    for n in range(1, 25):
        if n % 5 == 0 or n % 25 in (1, 24):
            continue
        count += 1
        v = g_five_grid(n, 25)
        m = (amax(v), amax(v))
        if hi(m) > hi(worst):
            worst = m
    assert count == 18, "the level-two enumeration lost a residue"
    assert hi(worst) <= Fraction(28242670, 10 ** 7), "the level-two maximum moved"
    ratio = idiv(worst, g2)
    assert hi(ratio) <= Fraction(7654303, 10 ** 7), "the j=2 ratio moved"
    branch2 = imul(ratio, c2)
    assert hi(branch2) <= Fraction(7679580, 10 ** 7), "the j=2 branch moved"
    branches = [branch2]
    for j in (3, 4):
        top = iadd(ONE, idiv(imul(num(12), PI), num(5 ** j)))
        span = imul(PI, num(Fraction(2, 5 ** j)))
        bot = isub(num(4), imul(num(5), imul(span, span)))
        assert bot[0] > 0, "the g_5 quadratic bound went nonpositive at j=%d" % j
        b = imul(idiv(top, bot), c_factor(j))
        target = Fraction(3264722, 10 ** 7) if j == 3 else Fraction(2651481, 10 ** 7)
        assert hi(b) <= target, "the j=%d branch moved" % j
        branches.append(b)
    best = max(hi(b) for b in branches)
    assert best <= Fraction(7679580, 10 ** 7), "the separation maximum moved"
    assert best < Fraction(768, 1000), "the separation constant r = 0.768 is no longer valid"
    return "lem:sep5, three branches and 18 level-two residues", g2, g3

# CHECK THE EXIT AND SUBTREE CONSTANTS AT BASE THREE

def ghat3(i):
    return imul(num(2), icos_grid(1, 3 ** i))

def arm3(j):
    return imul(num(2), icos_grid(3 ** (j - 1) - 1, 2 * 3 ** j))

def check_exit3():
    exit_open = idiv(icos_grid(7, 54), icos_grid(2, 54))
    assert hi(exit_open) <= Fraction(7052518, 10 ** 7), "the 0-track exit constant moved"
    exit_half = idiv(icos_grid(8, 54), icos_grid(2, 54))
    assert hi(exit_half) <= Fraction(6137010, 10 ** 7), "the pi-track exit constant moved"
    stray = idiv(icos_grid(2, 9), icos_grid(1, 9))
    assert hi(stray) <= Fraction(2266816, 10 ** 7), "the n = 2, 7 mod 9 constant moved"
    prefix = ONE
    entries = {}
    for j in range(3, 7):
        i = j - 1
        prefix = imul(prefix, idiv(icos_grid(1, 2 * 3 ** i), icos_grid(1, 3 ** i)))
        entries[j] = imul(prefix, idiv(arm3(j), ghat3(j)))
    assert hi(entries[3]) <= Fraction(7528157, 10 ** 7), "the j=3 entry constant moved"
    assert hi(entries[4]) <= Fraction(66966, 10 ** 5), "the j=4 entry constant moved"
    tail_entry = imul(iexp(LOGR), idiv(arm3(5), ghat3(5)))
    assert hi(tail_entry) <= Fraction(6419, 10 ** 4), "the j>=5 entry constant moved"
    sub = idiv(SQRT3, ghat3(3))
    assert hi(sub) <= Fraction(8900159, 10 ** 7), "the subtree constant moved"
    return "lem:exit3 four constants and lem:subtree3"

# CHECK THE CROSSING TAILS

def check_cross3():
    worst_lt = Fraction(0)
    worst_st = Fraction(0)
    for K in range(1, 8):
        lt = imul(_tail_ell(K + 1), num(9 ** K))
        assert hi(lt) < Fraction(19, 10), "the LT tail exceeds 1.9 at K=%d" % K
        worst_lt = max(worst_lt, hi(lt))
        for D in (38, 400):
            st = imul(imul(_tail_s(D, K + 1), num(9 ** K)), num(D - 2))
            assert hi(st) < 7, "the ST tail exceeds 7 at K=%d D=%d" % (K, D)
            worst_st = max(worst_st, hi(st))
    return "lem:cross3 tails, LT <= %.4f and ST <= %.4f" % (float(worst_lt), float(worst_st))

# CHECK THE BASE FIVE CRITERION

def check_crit5(g2, g3):
    r = num(Fraction(768, 1000))
    rows = []
    for D in range(18, 33, 2):
        K = 2
        kappa = imul(idiv(num(D + 4), iadd(num(D), g2)),
                     ipow(idiv(num(D + 4), iadd(num(D), g3)), K - 1))
        left = imul(imul(num(2 * 5 ** K - 1), ipow(r, D - 1)), kappa)
        right = icos_grid(D - 2, 2 * 5 ** (K + 1))
        assert below(left, right), "the base-5 criterion fails at D=%d" % D
        assert 5 ** (K + 1) >= 4 * (D - 2), "the base-5 window condition fails at D=%d" % D
        rows.append((D, float(hi(left)), float(lo(right))))
    D = 16
    kappa = imul(idiv(num(D + 4), iadd(num(D), g2)), idiv(num(D + 4), iadd(num(D), g3)))
    left = imul(imul(num(2 * 5 ** 2 - 1), ipow(r, D - 1)), kappa)
    right = icos_grid(D - 2, 2 * 5 ** 3)
    assert lo(left) > hi(right), "the D=16 criterion no longer fails, so the case split moved"
    log5 = ilog(num(5))
    def log5_of(x):
        return idiv(ilog(num(x)), log5)
    b34 = imul(iadd(ONE, idiv(isub(num(4), g2), iadd(num(34), g2))),
               iexp(idiv(imul(isub(num(4), g3), isub(log5_of(4 * 34), ONE)),
                         iadd(num(34), g3))))
    assert hi(b34) <= Fraction(10089188, 10 ** 7), "B(34) moved"
    thresh = idiv(imul(SQRT2, num(Fraction(1, 2))), imul(num(8), b34))
    assert lo(thresh) >= Fraction(876069, 10 ** 7), "the D>=34 threshold moved"
    h34 = imul(num(34), ipow(r, 33))
    assert hi(h34) <= Fraction(56028, 10 ** 7), "h(34) moved"
    assert below(h34, thresh), "the D>=34 tail bound fails at D=34"
    slope = isub(idiv(iadd(num(34), g3), imul(num(34), ilog(num(5)))), isub(log5_of(136), ONE))
    assert hi(slope) < 0, "the B monotonicity slope is no longer negative at D=34"
    assert lo(idiv(ONE, ineg(ilog(r)))) >= Fraction(37883, 10 ** 4), "1/|ln r| moved"
    return "prop:crit5, eight rows at even D = 18..32 and the D >= 34 chain", rows

# CHECK THE MONOTONE DOMINATION BEYOND FOUR HUNDRED

def check_domination(k400):
    growth = Fraction(402 * 401, 400 * 399)
    assert growth <= Fraction(10104, 10 ** 4), "the K1 growth ratio moved"
    step = imul(imul(num(growth), ipow(C_PI, 2)), num(Fraction(1001, 1000)))
    assert hi(step) <= Fraction(573, 1000), "the envelope per-step ratio moved"
    margin_step = imul(num(Fraction(402, 404)), isub(ONE, num(Fraction(1, 3 ** 12))))
    assert lo(margin_step) >= Fraction(9950, 10 ** 4), "the margin per-step ratio moved"
    assert k400 >= 12, "the 3^-K1 bound assumed a deeper certificate at D=400"
    return "thm:base3 tail, growth 1.0104, envelope step 0.573, margin step 0.9950"

# THE STAR SCAN

def star_scan():
    worst_slack = None
    worst_slack_at = None
    worst_width = 0.0
    worst_width_at = None
    rows = {}
    k400 = None
    for D in range(38, 401, 2):
        K = k_one(D)
        assert K - 1 >= hi(k_star(D)), "K1 fails K1 >= K* + 1 at D=%d" % D
        E = envelope(D, K)
        margin = isub(num(Fraction(4, D + 2)), delta_of(D, K))
        assert below(E, margin), "(star) fails at D=%d" % D
        slack = idiv(margin, E)
        pair = isub(ONE, ipow(num(Fraction(D - 2, D + 2)), 2))
        assert below(imul(num(2), E), pair), "the transient window bound fails at D=%d" % D
        w = max(relwidth(E), relwidth(margin))
        assert w < 1e-40, "interval width is no longer negligible at D=%d" % D
        if D == 38:
            assert lo(slack) > Fraction(111, 100), "the D=38 slack fell below 1.11"
            assert w < float(lo(slack)) * 1e-40, "the D=38 width is not far below its slack"
        if worst_slack is None or lo(slack) < worst_slack:
            worst_slack = lo(slack)
            worst_slack_at = D
        if w > worst_width:
            worst_width = w
            worst_width_at = D
        rows[D] = (K, float(lo(slack)))
        if D == 400:
            k400 = K
    return worst_slack, worst_slack_at, worst_width, worst_width_at, rows, k400

# RUN

def run():
    results = []
    t = time.time()
    dom, g2, g3 = check_sep5()
    results.append(("certify_sep5", dom, time.time() - t))
    t = time.time()
    dom = check_exit3()
    results.append(("certify_exit3", dom, time.time() - t))
    t = time.time()
    dom = check_cross3()
    results.append(("certify_cross3", dom, time.time() - t))
    t = time.time()
    dom, rows5 = check_crit5(g2, g3)
    results.append(("certify_crit5", dom, time.time() - t))
    t = time.time()
    slack, slack_at, width, width_at, rows, k400 = star_scan()
    results.append(("certify_star", "182 inequalities, even D = 38..400", time.time() - t))
    t = time.time()
    dom = check_domination(k400)
    results.append(("certify_domination", dom, time.time() - t))
    summary = ("lem:sep5, lem:exit3, lem:subtree3, lem:cross3, prop:crit5, and the 182 "
               "inequalities of (star) at even D = 38..400; worst slack %.4f at D = %d, "
               "worst relative interval width %.1e" % (float(slack), slack_at, width))
    return summary, results, rows, rows5

# MAIN

def main():
    t0 = time.time()
    summary, results, rows, rows5 = run()
    for name, dom, secs in results:
        print("%s: PASS (%s, %.1f s)" % (name, dom, secs))
    print("total: %.1f s" % (time.time() - t0))
    print(summary)
    print("base 5 criterion, even D = 18..32")
    print("  D    left      right")
    for D, left, right in rows5:
        print("  %-4d %-9.4f %.4f" % (D, left, right))
    print("base 3 certificate depth and (star) slack, even D = 38..400")
    print("  D    K1     slack")
    for D in (38, 40, 42, 50, 100, 200, 300, 400):
        K, s = rows[D]
        print("  %-4d %-6d %.4g" % (D, K, s))

if __name__ == "__main__":
    main()
