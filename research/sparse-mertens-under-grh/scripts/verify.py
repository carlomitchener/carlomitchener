import cmath
import math
from decimal import Decimal, getcontext
from fractions import Fraction

# CONSTANTS

GAMMA = 0.5772156649015328606065120900824024310421
GUARD = 1e-12
RELGUARD = 1e-9
DPREC = 60
DGAMMA = Decimal("0.57721566490153286060651209008240243104215933593992")
DPI = Decimal("3.14159265358979323846264338327950288419716939937511")

getcontext().prec = DPREC

def same(got, want, what):
    assert got == want, "%s: got %r want %r" % (what, got, want)

def atmost(got, want, what):
    assert got <= want, "%s: got %.12g want at most %.12g" % (what, got, want)

def atleast(got, want, what):
    assert got >= want, "%s: got %.12g want at least %.12g" % (what, got, want)

def near(got, want, tol, what):
    assert abs(got - want) <= tol, "%s: got %.12g want %.12g" % (what, got, want)

def below(got, want, what):
    assert got < want, "%s: got %.12g want below %.12g" % (what, got, want)

def sci(mantissa, exponent):
    whole, frac = mantissa.split(".")
    return int(whole + frac) * 10 ** (exponent - len(frac))

# THE FORMULAS

def harmonic(n):
    return math.log(n) + GAMMA + 1.0 / (2 * n)

def phi(q):
    n = -((-(q - 2)) // 2)
    return (4 / math.pi) * q + (2 * q / math.pi) * harmonic(n) + (1 - 2 / math.pi) * (q - 2) + 0.727

def proved(q, m=1):
    return math.sqrt(m) + phi(q) / q

def alpha(q, m=1):
    return math.log(q - m) / math.log(q)

def cost(q, m=1):
    return math.log(proved(q, m)) / math.log(q)

def saving(q, m=1):
    a = alpha(q, m)
    return (a - 0.75 - cost(q, m)) / a

def gap(q, m=1, b=0.75):
    return (q - m) * q ** (-b) - proved(q, m)

def savingfree(q, m=1):
    return math.log1p(gap(q, m) / proved(q, m)) / (alpha(q, m) * math.log(q))

def down(x, d):
    return math.floor(x * 10 ** d + GUARD) / 10 ** d

def up(x, d):
    return math.ceil(x * 10 ** d - GUARD) / 10 ** d

def row(q, m=1):
    return ("%.6f" % down(alpha(q, m), 6), "%.5f" % up(cost(q, m), 5), "%.5f" % down(saving(q, m), 5))

# THE FORMULAS IN DECIMAL

def dphi(q):
    q = Decimal(q)
    n = -((-(int(q) - 2)) // 2)
    hn = Decimal(n).ln() + DGAMMA + 1 / (2 * Decimal(n))
    return (4 / DPI) * q + (2 * q / DPI) * hn + (1 - 2 / DPI) * (q - 2) + Decimal("0.727")

def dproved(q, m=1):
    return Decimal(m).sqrt() + dphi(q) / Decimal(q)

def dgap(q, b, m=1):
    q = Decimal(q)
    b = Decimal(b.numerator) / Decimal(b.denominator)
    return (q - m) * (-b * q.ln()).exp() - dproved(int(q), m)

def dmono(q, b):
    q = Decimal(q)
    b = Decimal(b.numerator) / Decimal(b.denominator)
    return (1 - b) * (q - 2) * (-b * (q + 1).ln()).exp()

def bisect(test, lo, hi):
    while lo < hi:
        mid = (lo + hi) // 2
        if test(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo

def floorbase(b):
    return bisect(lambda q: dmono(q, b) >= Decimal("1.291"), 40, 10 ** 90)

def wallbase(b, start):
    return bisect(lambda q: dgap(q, b) > 0, start, 10 ** 90)

# THE LADDER EXPONENTS

def bh(a):
    if a < Fraction(11, 20):
        return a + Fraction(1, 4)
    if a < Fraction(3, 5):
        return Fraction(4, 5)
    return (a + 1) / 2

def zhang(a):
    return (8 * a - 7 * a * a) / (4 - 2 * a)

def bexp(a):
    v = bh(a)
    if a <= Fraction(4, 7):
        v = min(v, zhang(a))
    return v

RUNGS = [
    (Fraction(1, 2), Fraction(3, 4), "both", 3690, 723),
    (Fraction(13, 25), Fraction(1417, 1850), "Zhang", 8578, 1486),
    (Fraction(11, 20), Fraction(913, 1160), "Zhang", 33547, 4754),
    (Fraction(4, 7), Fraction(4, 5), "both", 92317, 11221),
    (Fraction(3, 5), Fraction(4, 5), "BH", 92317, 11221),
    (Fraction(2, 3), Fraction(5, 6), "BH", 3107080, 216023),
    (Fraction(3, 4), Fraction(7, 8), "BH", 6939524168, 129458304),
    (Fraction(4, 5), Fraction(9, 10), "BH", None, 128606353005),
    (Fraction(9, 10), Fraction(19, 20), "BH", None, None),
    (Fraction(19, 20), Fraction(39, 40), "BH", None, None),
]

CAPPED = {
    Fraction(4, 5): (sci("3.09358", 13), None),
    Fraction(9, 10): (sci("3.23663", 34), sci("1.73431", 28)),
    Fraction(19, 20): (sci("9.24614", 83), sci("3.30712", 68)),
}

# THE TABLE

TABLE = [
    (1000, "0.999855", "0.28087", "-0.03102", False),
    (2000, "0.999934", "0.26335", "-0.01342", False),
    (3000, "0.999958", "0.25430", "-0.00434", False),
    (3689, "0.999966", "0.24997", "-0.00001", False),
    (3690, "0.999967", "0.24997", "0.00000", True),
    (5000, "0.999976", "0.24393", "0.00605", True),
    (10 ** 4, "0.999989", "0.23141", "0.01858", True),
    (10 ** 5, "0.999999", "0.19906", "0.05094", True),
    (10 ** 6, "0.999999", "0.17589", "0.07411", True),
    (10 ** 9, "0.999999", "0.13305", "0.11695", True),
]

MULTI = [
    (10 ** 4, 6, "0.999934", "0.24865", "0.00129"),
    (10 ** 5, 78, "0.999932", "0.24972", "0.00022"),
    (10 ** 6, 451, "0.999967", "0.24994", "0.00003"),
]

BUDGET = [
    (Fraction(1, 2), 1971),
    (Fraction(13, 25), 1002),
    (Fraction(11, 20), 365),
    (Fraction(4, 7), 176),
    (Fraction(3, 5), 176),
    (Fraction(2, 3), 8),
]

def check_table():
    for q, a, c, d, closes in TABLE:
        same(row(q), (a, c, d), "table row q = %d" % q)
        same(gap(q) > 0, closes, "table gap sign q = %d" % q)
    for q in range(3, 20000):
        same(0.75 + cost(q) < alpha(q), gap(q) > 0, "test equivalence q = %d" % q)

def check_wall():
    for q in range(3, 3690):
        below(gap(q), 0.0, "gap below the wall q = %d" % q)
    atleast(gap(3690), 3.752213034e-4, "gap at the wall")
    atmost(gap(3689), -1.533059397e-4, "gap under the wall")
    near(gap(3690), 3.752213034e-4, RELGUARD * 3.752213034e-4, "gap 3690 digits")
    near(gap(3689), -1.533059397e-4, RELGUARD * 1.533059397e-4, "gap 3689 digits")
    atleast(savingfree(3690), 5.863425182e-6, "delta at the wall")
    atmost(savingfree(3689), -2.395807653e-6, "delta under the wall")
    near(savingfree(3690), 5.863425182e-6, RELGUARD * 5.863425182e-6, "delta 3690 digits")
    near(savingfree(3689), -2.395807653e-6, RELGUARD * 2.395807653e-6, "delta 3689 digits")
    near(savingfree(3690), saving(3690), 1e-12, "the two forms of delta agree")
    steps = [gap(q + 1) - gap(q) for q in range(3690, 100000)]
    same(len(steps), 96310, "step count of the sweep")
    same(sum(1 for s in steps if s <= 0), 0, "steps that fail to rise")
    atleast(min(steps), 3.172e-5, "smallest step of the sweep")
    same(3690 + steps.index(min(steps)), 99998, "where the smallest step sits")

def widest(q, b=0.75):
    m = 1
    while gap(q, m, b) > 0:
        m += 1
    return m - 1

def check_multi():
    for q, m, a, c, d in MULTI:
        same(widest(q), m, "widest digit set at q = %d" % q)
        same(row(q, m), (a, c, d), "multi row q = %d" % q)
    for a, m in BUDGET:
        same(widest(10 ** 7, float(bexp(a))), m, "ladder budget at a = %s" % a)

def check_exponents():
    for (a, b, source, _, _) in RUNGS:
        same(bexp(a), b, "b(a) at a = %s" % a)
        if source == "both":
            same(bh(a), zhang(a), "the tables agree at a = %s" % a)
        elif source == "Zhang":
            assert zhang(a) < bh(a), "Zhang is not smaller at a = %s" % a
    for den in range(1, 201):
        for num in range(1, den):
            a = Fraction(num, den)
            if not (Fraction(1, 2) < a <= Fraction(4, 7)):
                continue
            z = zhang(a)
            same(z - (a + Fraction(1, 4)), -5 * (a - Fraction(1, 2)) * (a - Fraction(2, 5)) / (4 - 2 * a), "first factorisation")
            same(z - Fraction(4, 5), -7 * (a - Fraction(4, 7)) * (a - Fraction(4, 5)) / (4 - 2 * a), "second factorisation")
            same(z - Fraction(3, 4), -7 * (a - Fraction(1, 2)) * (a - Fraction(6, 7)) / (4 - 2 * a), "third factorisation")
            assert z > Fraction(3, 4), "Zhang below three quarters at a = %s" % a
            if a < Fraction(11, 20):
                assert z < a + Fraction(1, 4), "Zhang not smaller at a = %s" % a
            elif a < Fraction(4, 7):
                assert z < Fraction(4, 5), "Zhang not smaller at a = %s" % a
    for den in range(1, 21):
        for num in range(1, den):
            a = Fraction(num, den)
            if Fraction(1, 2) <= a < 1:
                assert bexp(a) >= Fraction(3, 4), "b(a) below three quarters at a = %s" % a

def check_ladder():
    for (a, b, _, wall, floor) in RUNGS:
        got = floorbase(b)
        if floor is not None:
            same(got, floor, "Q(b) at a = %s" % a)
            assert dmono(floor, b) >= Decimal("1.291"), "mono at Q, a = %s" % a
            assert dmono(floor - 1, b) < Decimal("1.291"), "mono at Q - 1, a = %s" % a
        else:
            atmost(got, CAPPED[a][1], "Q(b) upper bound at a = %s" % a)
        for q in range(3, 3690):
            below(gap(q, 1, float(b)), 0.0, "no rung closes at q = %d, a = %s" % (q, a))
        if wall is not None:
            assert dgap(wall, b) > 0, "gap at the wall, a = %s" % a
            assert dgap(wall - 1, b) < 0, "gap under the wall, a = %s" % a
            same(wallbase(b, got), wall, "q_0(a) by bisection at a = %s" % a)
            if wall <= 10 ** 5:
                scan = next(q for q in range(3, wall + 1) if gap(q, 1, float(b)) > 0)
                same(scan, wall, "q_0(a) by exhaustive scan at a = %s" % a)
        else:
            assert dgap(CAPPED[a][0], b) > 0, "printed upper bound is not a wall at a = %s" % a
    logs = [math.ceil(100 * math.log10(w if w is not None else CAPPED[a][0])) / 100 for (a, _, _, w, _) in RUNGS]
    same(["%.2f" % v for v in logs], ["3.57", "3.94", "4.53", "4.97", "4.97", "6.50", "9.85", "13.50", "34.52", "83.97"], "the log10 trend")

# THE GENERAL FLOOR

def lowproved(q):
    return 1 + 4 / math.pi + (2 / math.pi) * (math.log((q - 2) / 2) + GAMMA) + (1 - 2 / math.pi) * (q - 2) / q

def major(q, b):
    return q ** (1 - b) - lowproved(q)

def check_floor():
    near(1.291 - (2 / math.pi) * math.log(1.291 * 4) - 2.544 * 0.25, -0.39014598, 1e-8, "the bracket at u = 1/4")
    atmost(4 * (1.291 - (2 / math.pi) * math.log(1.291 * 4) - 2.544 * 0.25), -1.56, "four times the bracket")
    atmost(2 * 723 ** -0.75, 0.015, "the minimality slack")
    kappa = 1 + 4 / math.pi + (2 / math.pi) * (GAMMA - math.log(1448 / 721)) + (1 - 2 / math.pi) * 721 / 723
    atleast(kappa, 0.015 + 2.544, "the assembled constant")
    same(floorbase(Fraction(1417, 1850)), 1486, "Q at the Zhang rung")
    grid = [Fraction(750 + 5 * i, 1000) for i in range(46)]
    for b in grid:
        q = floorbase(b)
        atleast(q, 723, "Q(b) below the base floor at b = %s" % b)
        atmost(float(dgap(q, b)), -1.56, "gap at Q(b) for b = %s" % b)
        if q >= 3690:
            atmost(float(major(q, float(b))) - float(dgap(q, b)), 0.004, "majorant slack at b = %s" % b)
            atmost(major(3690, float(b)), -0.95, "majorant at 3690 for b = %s" % b)
            assert b >= Fraction(1417, 1850), "a low b with a high floor at b = %s" % b
        else:
            atmost(q, 3689, "empty range expected at b = %s" % b)

# THE ELEMENTARY INEQUALITIES

def check_elementary():
    for i in range(20001):
        v = i / 20000
        atmost(math.sin(math.pi * v), 4 * v * (1 - v) + 1e-15, "sine against the parabola at v = %.6f" % v)
    for i in range(1, 20001):
        x = math.pi / 2 * i / 20000
        atmost(1 / math.sin(x), 1 / x + 1 - 2 / math.pi + 1e-12, "cosecant bound at x = %.6f" % x)

def gridsum(q, t, kernel):
    total = 0.0
    for r in range(q):
        u = (t + r) / q
        d = abs(u - round(u))
        if d < 1e-15:
            total += q
        else:
            total += abs(math.sin(math.pi * q * d)) / math.sin(math.pi * d) if kernel else 0.0
    return total

def check_kernel():
    for q in [3, 5, 7, 10, 37, 100, 257, 1000]:
        worst = max(gridsum(q, i / 2000.0, True) for i in range(2001))
        atmost(worst, phi(q), "the kernel bound at q = %d" % q)
        atmost(worst / phi(q), 0.92, "slack of the kernel bound at q = %d" % q)

def symbolsum(q, digits, t, power):
    total = 0.0
    for r in range(q):
        u = (t + r) / q
        value = abs(sum(cmath.exp(2j * math.pi * d * u) for d in digits))
        total += value ** power
    return total

def check_floor_identity():
    for q in range(3, 10):
        for mask in range(1, 1 << q):
            digits = [d for d in range(q) if mask >> d & 1]
            k = len(digits)
            for i in range(20):
                t = i / 20.0
                near(symbolsum(q, digits, t, 2), q * k, 1e-8 * q * k, "the l2 identity at q = %d" % q)
                atleast(symbolsum(q, digits, t, 1), q - 1e-9, "the l1 floor at q = %d" % q)

def check_shape():
    q = 10 ** 12
    near(cost(q), (math.log(math.log(q)) + math.log(2 / math.pi)) / math.log(q), 0.01, "the asymptotic shape")
    atleast(saving(10 ** 9), 0.11695, "the saving at a large base")

# DOOR

def main():
    check_table()
    check_wall()
    check_multi()
    check_exponents()
    check_ladder()
    check_floor()
    check_elementary()
    check_kernel()
    check_floor_identity()
    check_shape()
    print("sparse-mertens-under-grh: every printed number recomputed and asserted")

if __name__ == "__main__":
    main()
